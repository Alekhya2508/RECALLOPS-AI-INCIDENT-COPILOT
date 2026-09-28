from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Incident, IncidentEvent, MemoryRecord, Service, utcnow


DEMO_INCIDENT_KEYS = {"INC-001", "INC-007", "INC-011", "INC-017", "INC-024", "INC-031"}


def seed_demo(db: Session, reset: bool = False) -> None:
    demo_incidents = db.scalars(select(Incident).where(Incident.incident_key.in_(DEMO_INCIDENT_KEYS))).all()
    if demo_incidents and not reset:
        return
    if reset:
        for incident in demo_incidents:
            db.delete(incident)
        db.commit()

    payment = db.scalar(select(Service).where(Service.name == "payment-api"))
    if not payment:
        payment = Service(name="payment-api", display_name="Payment API")
        db.add(payment)
    db.flush()
    base = utcnow() - timedelta(days=70)
    history = [
        ("INC-001", "Payment API database timeout", "Connection-pool exhaustion caused by a connection leak.", "Fixed connection leak and adjusted pool capacity.", "Connection utilization returned to 61%.", "Inspect connection lifecycle before scaling pool capacity."),
        ("INC-007", "Database pool saturation", "Connection leak in the legacy payment client.", "Patched connection cleanup and added pool telemetry.", "Timeouts returned to baseline.", "Alert on connection churn before pool saturation."),
        ("INC-011", "Checkout database timeouts", "Connection lifecycle regression after a client upgrade.", "Rolled forward with explicit connection cleanup.", "Checkout success recovered.", "Test connection cleanup during client upgrades."),
        ("INC-024", "Payment worker pool exhaustion", "Unclosed database connections exhausted pool capacity.", "Closed leaked connections and adjusted pool headroom.", "Worker throughput recovered.", "Inspect connection lifecycle before scaling pool capacity."),
        ("INC-031", "Payment API connection saturation", "Connection leak combined with insufficient pool headroom.", "Fixed connection lifecycle and increased safe headroom.", "API latency returned to normal.", "Alert on connection churn before pool saturation."),
    ]
    for index, (key, title, cause, resolution, outcome, lesson) in enumerate(history):
        created = base + timedelta(days=index * 12)
        incident = Incident(
            incident_key=key,
            title=title,
            description="Payment requests experienced database connection timeouts and sharply elevated pool utilization.",
            severity="critical" if index == 0 else "high",
            status="resolved",
            service=payment,
            error="database connection timeout: pool exhausted",
            symptoms="connection utilization above 95%, elevated timeout rate, payment request failures",
            affected_users=2400 + index * 330,
            root_cause=cause,
            resolution=resolution,
            outcome=outcome,
            lessons=lesson,
            memory_retained=True,
            created_at=created,
            updated_at=created + timedelta(minutes=48 - index * 4),
            resolved_at=created + timedelta(minutes=48 - index * 4),
            retained_at=created + timedelta(minutes=52 - index * 4),
        )
        db.add(incident)
        db.flush()
        db.add(MemoryRecord(
            incident=incident,
            content=f"{key}: {title}. Root cause: {cause} Resolution: {resolution} Outcome: {outcome} Lesson: {lesson}",
            facts={"incident_key": key, "service": payment.name, "root_cause": cause, "resolution": resolution, "outcome": outcome, "lessons": lesson},
            relationships={"service": payment.name},
        ))
    current = Incident(
        incident_key="INC-017",
        title="Payment API database timeout",
        description="Payment API requests are experiencing database connection timeouts. Connection utilization increased sharply over 15 minutes.",
        severity="critical",
        status="investigating",
        service=payment,
        error="database connection timeout: failed to acquire connection from pool",
        symptoms="connection utilization 98%, timeout rate 14.2%, payment request failures",
        recent_changes="Payment client v3 deployed 23 minutes before the alert.",
        affected_users=12400,
        created_at=utcnow() - timedelta(minutes=17),
    )
    db.add(current)
    db.flush()
    for minutes, event_type, message, evidence in [
        (0, "created", "Incident created", {"severity": "critical"}),
        (2, "signal", "Database timeout rate increased", {"timeout_rate": "14.2%"}),
        (4, "signal", "Connection utilization reached 98%", {"pool_utilization": "98%"}),
    ]:
        db.add(IncidentEvent(incident=current, event_type=event_type, message=message, evidence=evidence, created_at=current.created_at + timedelta(minutes=minutes)))
    db.commit()
