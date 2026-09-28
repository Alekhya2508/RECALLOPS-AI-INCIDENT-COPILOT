from .models import Incident
from .schemas import EventRead, IncidentRead


def incident_to_read(incident: Incident) -> IncidentRead:
    return IncidentRead(
        id=incident.id,
        incident_key=incident.incident_key,
        title=incident.title,
        description=incident.description,
        severity=incident.severity,
        status=incident.status,
        service=incident.service.name,
        error=incident.error,
        symptoms=incident.symptoms,
        recent_changes=incident.recent_changes,
        affected_users=incident.affected_users,
        root_cause=incident.root_cause,
        resolution=incident.resolution,
        outcome=incident.outcome,
        lessons=incident.lessons,
        memory_retained=incident.memory_retained,
        created_at=incident.created_at,
        updated_at=incident.updated_at,
        resolved_at=incident.resolved_at,
        events=[EventRead.model_validate(event) for event in sorted(incident.events, key=lambda item: item.created_at.timestamp())],
    )
