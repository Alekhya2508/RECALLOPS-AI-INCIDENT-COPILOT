from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from .config import get_settings
from .database import Base, engine, get_db
from .models import Feedback, Incident, IncidentEvent, Service, utcnow
from .schemas import (
    AnalysisResponse,
    FeedbackCreate,
    FeedbackRead,
    IncidentCreate,
    IncidentRead,
    LearningResponse,
    MemoryRecallRequest,
    MemoryRecallResponse,
    ResolveRequest,
    ResolveResponse,
)
from .seed import seed_demo
from .serializers import incident_to_read
from .services.learning import reflect
from .services.llm import LLMService, get_llm_service
from .services.memory import MemoryService, get_memory_service


@asynccontextmanager
async def lifespan(_: FastAPI):
    app.state.database_error = None
    try:
        Base.metadata.create_all(bind=engine)
        if get_settings().recallops_demo_mode:
            with Session(engine) as session:
                seed_demo(session)
    except SQLAlchemyError:
        app.state.database_error = "RecallOps cannot connect to its database. Check the database service and try again."
    yield


app = FastAPI(title="RecallOps API", version="2.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(SQLAlchemyError)
async def database_error(_: Request, __: SQLAlchemyError):
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": "RecallOps cannot connect to its database. Check the database service and try again."},
    )


def get_incident_or_404(db: Session, incident_id: int) -> Incident:
    incident = db.scalar(
        select(Incident)
        .options(selectinload(Incident.service), selectinload(Incident.events))
        .where(Incident.id == incident_id)
    )
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")
    return incident


@app.get("/api/health")
def health(request: Request) -> dict[str, str | None]:
    return {
        "status": "degraded" if request.app.state.database_error else "ok",
        "database": "unavailable" if request.app.state.database_error else "available",
        "message": request.app.state.database_error,
    }


@app.post("/api/demo/reset")
def reset_demo(db: Session = Depends(get_db)) -> dict[str, str | int]:
    if not get_settings().recallops_demo_mode:
        raise HTTPException(status_code=403, detail="Demo reset is disabled in this environment.")
    seed_demo(db, reset=True)
    return {
        "status": "ready",
        "message": "Demo data restored. INC-001 is retained and INC-017 is ready for investigation.",
        "incidents_restored": 6,
    }


@app.post("/api/incidents", response_model=IncidentRead, status_code=201)
def create_incident(payload: IncidentCreate, db: Session = Depends(get_db)):
    service = db.scalar(select(Service).where(Service.name == payload.service))
    if not service:
        service = Service(name=payload.service, display_name=payload.service.replace("-", " ").title())
        db.add(service)
        db.flush()
    if payload.incident_key and db.scalar(select(Incident).where(Incident.incident_key == payload.incident_key)):
        raise HTTPException(status_code=409, detail="An incident with this identifier already exists.")
    if payload.incident_key:
        key = payload.incident_key
    else:
        existing_keys = set(db.scalars(select(Incident.incident_key)).all())
        next_number = max(
            (int(item.removeprefix("INC-")) for item in existing_keys if item.removeprefix("INC-").isdigit()),
            default=0,
        ) + 1
        key = f"INC-{next_number:03d}"
    incident = Incident(
        incident_key=key,
        title=payload.title,
        description=payload.description,
        severity=payload.severity,
        service=service,
        error=payload.error,
        symptoms=payload.symptoms,
        recent_changes=payload.recent_changes,
        affected_users=payload.affected_users,
    )
    incident.events.append(IncidentEvent(event_type="created", message="Incident created", evidence={"severity": payload.severity}))
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident_to_read(incident)


@app.get("/api/incidents", response_model=list[IncidentRead])
def list_incidents(db: Session = Depends(get_db)):
    incidents = db.scalars(
        select(Incident)
        .options(selectinload(Incident.service), selectinload(Incident.events))
        .order_by(Incident.created_at.desc())
    ).all()
    return [incident_to_read(incident) for incident in incidents]


@app.get("/api/incidents/{incident_id}", response_model=IncidentRead)
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    return incident_to_read(get_incident_or_404(db, incident_id))


@app.post("/api/memory/recall", response_model=MemoryRecallResponse)
async def recall_memory(
    payload: MemoryRecallRequest,
    db: Session = Depends(get_db),
    memory_service: MemoryService = Depends(get_memory_service),
):
    incident = get_incident_or_404(db, payload.incident_id) if payload.incident_id else None
    if not incident and not payload.query:
        raise HTTPException(status_code=422, detail="Provide an incident_id or query for memory recall.")
    raw = {"title": payload.query, "description": payload.query, "service": payload.service, "error": payload.error, "symptoms": payload.symptoms}
    return await memory_service.recall(db, incident, raw, payload.limit)


@app.post("/api/incidents/{incident_id}/analyze", response_model=AnalysisResponse)
async def analyze_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    memory_service: MemoryService = Depends(get_memory_service),
    llm_service: LLMService = Depends(get_llm_service),
):
    incident = get_incident_or_404(db, incident_id)
    recalled = await memory_service.recall(db, incident, None, 3)
    incident.memory_recall_count += 1
    incident.events.append(IncidentEvent(
        event_type="analysis",
        message=f"AI investigation recalled {len(recalled.memories)} relevant memories",
        evidence={"memory_ids": [memory.incident_key for memory in recalled.memories], "memory_status": recalled.status},
    ))
    db.commit()
    return await llm_service.analyze(incident, recalled.memories, recalled.status, recalled.message)


@app.post("/api/incidents/{incident_id}/resolve", response_model=ResolveResponse)
async def resolve_incident(
    incident_id: int,
    payload: ResolveRequest,
    db: Session = Depends(get_db),
    memory_service: MemoryService = Depends(get_memory_service),
):
    incident = get_incident_or_404(db, incident_id)
    incident.status = "resolved"
    incident.root_cause = payload.root_cause
    incident.resolution = payload.resolution
    incident.outcome = payload.outcome
    incident.lessons = payload.lessons
    incident.resolved_at = utcnow()
    incident.events.append(IncidentEvent(event_type="resolved", message="Incident resolved", evidence={"outcome": payload.outcome}))
    if payload.engineer_feedback:
        incident.feedback.append(Feedback(engineer="Maya Chen", helpful=True, comments=payload.engineer_feedback))
    db.commit()
    memory_status = "not_requested"
    retained = False
    memory_message = "Incident resolved. The experience was not retained."
    if payload.retain:
        retained, memory_status, error = await memory_service.retain(db, incident)
        memory_message = error or "This incident can now help investigate future incidents."
    return ResolveResponse(
        incident=incident_to_read(get_incident_or_404(db, incident_id)),
        memory_retained=retained,
        memory_status=memory_status,
        message=memory_message,
    )


@app.post("/api/incidents/{incident_id}/feedback", response_model=FeedbackRead, status_code=201)
def add_feedback(incident_id: int, payload: FeedbackCreate, db: Session = Depends(get_db)):
    incident = get_incident_or_404(db, incident_id)
    feedback = Feedback(incident=incident, **payload.model_dump())
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return FeedbackRead.model_validate(feedback, from_attributes=True)


@app.post("/api/learning/reflect", response_model=LearningResponse)
def learning_reflect(db: Session = Depends(get_db)):
    return reflect(db)
