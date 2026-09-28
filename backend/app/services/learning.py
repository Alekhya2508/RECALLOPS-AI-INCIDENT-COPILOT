from collections import Counter, defaultdict
from datetime import datetime, timezone
from statistics import median

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..models import Incident
from ..schemas import LearningResponse, ResolutionTrend, RootCauseMetric, ServiceMetric


def _root_cause_bucket(root_cause: str | None) -> str:
    text = (root_cause or "").lower()
    if "connection" in text or "pool" in text:
        return "Connection leaks"
    if "config" in text:
        return "Configuration"
    if "deploy" in text or "regression" in text:
        return "Deploy regressions"
    if "capacity" in text or "saturation" in text:
        return "Capacity"
    return "Other"


def reflect(db: Session) -> LearningResponse:
    incidents = db.scalars(select(Incident).options(selectinload(Incident.service))).all()
    resolved = [item for item in incidents if item.resolved_at and item.root_cause]
    causes = Counter(_root_cause_bucket(item.root_cause) for item in resolved)
    services = Counter(item.service.name for item in incidents)
    monthly: dict[str, dict[str, list[float]]] = defaultdict(lambda: {"with": [], "without": []})
    for item in resolved:
        duration = max(1, (item.resolved_at - item.created_at).total_seconds() / 60)
        key = item.created_at.strftime("%b")
        monthly[key]["with" if item.memory_recall_count else "without"].append(duration)
    trends = [
        ResolutionTrend(
            month=month,
            withMemory=round(median(groups["with"]), 1) if groups["with"] else 0,
            withoutMemory=round(median(groups["without"]), 1) if groups["without"] else 0,
        )
        for month, groups in monthly.items()
    ]
    connection_incidents = [item for item in resolved if _root_cause_bucket(item.root_cause) == "Connection leaks"]
    lessons = Counter(item.lessons for item in resolved if item.lessons)
    retained = sum(1 for item in incidents if item.memory_retained)
    recalled = sum(1 for item in incidents if item.memory_recall_count)
    return LearningResponse(
        recurring_root_causes=[RootCauseMetric(name=name, value=value) for name, value in causes.most_common()],
        incidents_by_service=[ServiceMetric(name=name, incidents=value) for name, value in services.most_common()],
        resolution_trends=trends,
        memory_usage={
            "retained_incidents": retained,
            "incidents_with_recall": recalled,
            "total_recalls": sum(item.memory_recall_count for item in incidents),
            "recall_rate": round((recalled / len(incidents) * 100), 1) if incidents else 0,
        },
        recurring_pattern=(
            f"{len(connection_incidents)} related incidents show a recurring connection/database pattern."
            if connection_incidents else None
        ),
        related_incidents=[item.incident_key for item in connection_incidents],
        synthesized_lessons=[lesson for lesson, _ in lessons.most_common(3)] or ["More confirmed outcomes are needed before lessons can be synthesized."],
        source_incidents=len(resolved),
        generated_at=datetime.now(timezone.utc),
    )
