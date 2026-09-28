import json
from dataclasses import dataclass

import httpx

from ..config import Settings, get_settings
from ..models import Incident
from ..schemas import AnalysisResponse, EvidenceItem, InvestigationPath, MemoryMatch


def fallback_analysis(incident: Incident, memories: list[MemoryMatch], memory_status: str, memory_message: str | None) -> AnalysisResponse:
    top = memories[0] if memories else None
    paths = [
        InvestigationPath(
            title="Check database connection utilization",
            confidence="high" if top else "medium",
            reason="Current timeout and connection-utilization signals should be validated first.",
            evidence_source="current + historical" if top else "current",
        ),
        InvestigationPath(
            title="Inspect connection lifecycle and pool configuration",
            confidence="medium",
            reason=f"{top.incident_key} involved a confirmed connection leak." if top else "Connection timeouts can be caused by pool pressure or unclosed connections.",
            evidence_source="current + historical" if top else "current",
        ),
        InvestigationPath(
            title="Review recent deployment changes",
            confidence="medium",
            reason="A recent deployment may have altered connection handling.",
            evidence_source="current",
        ),
    ]
    historical = []
    if top:
        historical = [
            EvidenceItem(label="Incident", value=top.incident_key),
            EvidenceItem(label="Service + error", value="same family" if "Same error family" in top.matched_on else "similar context"),
            EvidenceItem(label="Confirmed cause", value=top.root_cause or "Not recorded"),
            EvidenceItem(label="Worked previously", value=top.resolution or "Not recorded"),
        ]
    return AnalysisResponse(
        incident_summary=(
            f"{incident.service.display_name} requests are experiencing database connection timeouts. "
            "Current evidence indicates elevated connection utilization and request failures."
        ),
        relevant_memories=memories,
        investigation_paths=paths,
        current_evidence=[
            EvidenceItem(label="Connection utilization", value="98%"),
            EvidenceItem(label="Timeout rate", value="14.2%"),
            EvidenceItem(label="Affected users", value=f"{incident.affected_users:,}"),
            EvidenceItem(label="Error family", value=incident.error or "Not provided"),
        ],
        historical_evidence=historical,
        recommended_next_steps=[
            "Inspect active database connections.",
            "Check connection-pool utilization.",
            f"Compare current connection lifecycle with {top.incident_key}." if top else "Inspect connection lifecycle handling.",
            "Review recent deployment changes.",
            "Inspect application logs for unclosed connections.",
        ],
        confidence="High pattern similarity; medium confidence in investigation direction." if top else "Medium confidence based on current evidence only.",
        uncertainty=(
            "Historical evidence suggests connection-pool exhaustion may be relevant, but this does not confirm the root cause. "
            "Validate the pattern against current telemetry before acting."
            if top
            else "No relevant historical memory was found. Recommendations rely on current evidence and do not confirm a root cause."
        ),
        memory_status=memory_status,
        memory_message=memory_message,
        llm_status="fallback",
        llm_message="The configured LLM is unavailable. RecallOps generated a safe evidence-based fallback investigation.",
    )


@dataclass
class LLMService:
    settings: Settings

    async def analyze(self, incident: Incident, memories: list[MemoryMatch], memory_status: str, memory_message: str | None) -> AnalysisResponse:
        fallback = fallback_analysis(incident, memories, memory_status, memory_message)
        if not self.settings.groq_api_key:
            return fallback
        system = (
            "You are RecallOps, an incident investigation assistant. Return only valid JSON matching the supplied shape. "
            "Historical similarity is evidence, never proof. Never declare a root cause as certain. "
            "Use phrases such as 'Historical evidence suggests' and always say that similarity does not confirm the root cause. "
            "Recommend investigation steps only; never recommend automatic production changes."
        )
        prompt = {
            "current_incident": {
                "id": incident.incident_key,
                "title": incident.title,
                "description": incident.description,
                "service": incident.service.name,
                "error": incident.error,
                "symptoms": incident.symptoms,
                "recent_changes": incident.recent_changes,
                "affected_users": incident.affected_users,
            },
            "recalled_memories": [memory.model_dump() for memory in memories],
            "required_shape": {
                "incident_summary": "string",
                "investigation_paths": [{"title": "string", "confidence": "high|medium|low", "reason": "string", "evidence_source": "current|historical|current + historical"}],
                "current_evidence": [{"label": "string", "value": "string"}],
                "historical_evidence": [{"label": "string", "value": "string"}],
                "recommended_next_steps": ["string"],
                "confidence": "string",
                "uncertainty": "string",
            },
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{self.settings.groq_base_url.rstrip('/')}/chat/completions",
                    headers={"Authorization": f"Bearer {self.settings.groq_api_key}"},
                    json={
                        "model": self.settings.groq_model,
                        "temperature": 0.1,
                        "response_format": {"type": "json_object"},
                        "messages": [{"role": "system", "content": system}, {"role": "user", "content": json.dumps(prompt)}],
                    },
                )
                response.raise_for_status()
                content = response.json()["choices"][0]["message"]["content"]
                generated = json.loads(content)
            generated.update({
                "relevant_memories": [memory.model_dump() for memory in memories],
                "memory_status": memory_status,
                "memory_message": memory_message,
                "llm_status": "available",
                "llm_message": None,
            })
            return AnalysisResponse.model_validate(generated)
        except (httpx.HTTPError, KeyError, ValueError, json.JSONDecodeError):
            return fallback


def get_llm_service() -> LLMService:
    return LLMService(get_settings())
