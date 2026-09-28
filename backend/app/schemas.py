from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class IncidentCreate(BaseModel):
    title: str = Field(min_length=3, max_length=240)
    description: str = Field(min_length=3)
    severity: Literal["critical", "high", "medium", "low"]
    service: str = Field(min_length=2, max_length=120)
    error: str | None = None
    symptoms: str | None = None
    recent_changes: str | None = None
    affected_users: int = Field(default=0, ge=0)
    incident_key: str | None = None


class EventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    event_type: str
    message: str
    evidence: dict[str, Any] | None
    created_at: datetime


class IncidentRead(BaseModel):
    id: int
    incident_key: str
    title: str
    description: str
    severity: str
    status: str
    service: str
    error: str | None
    symptoms: str | None
    recent_changes: str | None
    affected_users: int
    root_cause: str | None
    resolution: str | None
    outcome: str | None
    lessons: str | None
    memory_retained: bool
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None
    events: list[EventRead] = []


class MemoryMatch(BaseModel):
    incident_key: str
    title: str
    service: str
    similarity: float = Field(ge=0, le=1)
    root_cause: str | None
    resolution: str | None
    outcome: str | None
    lessons: str | None
    matched_on: list[str]


class MemoryRecallRequest(BaseModel):
    incident_id: int | None = None
    query: str | None = None
    service: str | None = None
    error: str | None = None
    symptoms: str | None = None
    limit: int = Field(default=3, ge=1, le=10)


class MemoryRecallResponse(BaseModel):
    memories: list[MemoryMatch]
    source: Literal["hindsight", "database", "none"]
    status: Literal["available", "degraded", "unavailable"]
    message: str | None = None


class EvidenceItem(BaseModel):
    label: str
    value: str


class InvestigationPath(BaseModel):
    title: str
    confidence: Literal["high", "medium", "low"]
    reason: str
    evidence_source: Literal["current", "historical", "current + historical"]


class AnalysisResponse(BaseModel):
    incident_summary: str
    relevant_memories: list[MemoryMatch]
    investigation_paths: list[InvestigationPath]
    current_evidence: list[EvidenceItem]
    historical_evidence: list[EvidenceItem]
    recommended_next_steps: list[str]
    confidence: str
    uncertainty: str
    memory_status: str
    memory_message: str | None = None
    llm_status: Literal["available", "fallback", "unavailable"]
    llm_message: str | None = None


class ResolveRequest(BaseModel):
    root_cause: str = Field(min_length=3)
    resolution: str = Field(min_length=3)
    outcome: str = Field(min_length=3)
    lessons: str | None = None
    engineer_feedback: str | None = None
    retain: bool = True


class ResolveResponse(BaseModel):
    incident: IncidentRead
    memory_retained: bool
    memory_status: str
    message: str


class FeedbackCreate(BaseModel):
    engineer: str = Field(min_length=2)
    rating: int | None = Field(default=None, ge=1, le=5)
    helpful: bool | None = None
    comments: str | None = None


class FeedbackRead(BaseModel):
    id: int
    incident_id: int
    engineer: str
    rating: int | None
    helpful: bool | None
    comments: str | None
    created_at: datetime


class RootCauseMetric(BaseModel):
    name: str
    value: int


class ServiceMetric(BaseModel):
    name: str
    incidents: int


class ResolutionTrend(BaseModel):
    month: str
    withMemory: float
    withoutMemory: float


class LearningResponse(BaseModel):
    recurring_root_causes: list[RootCauseMetric]
    incidents_by_service: list[ServiceMetric]
    resolution_trends: list[ResolutionTrend]
    memory_usage: dict[str, int | float]
    recurring_pattern: str | None
    related_incidents: list[str]
    synthesized_lessons: list[str]
    source_incidents: int
    generated_at: datetime
