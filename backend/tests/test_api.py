import os
from pathlib import Path

TEST_DB = Path(__file__).parent / "test_recallops.db"
if TEST_DB.exists():
    TEST_DB.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ["RECALLOPS_DEMO_MODE"] = "true"
os.environ["HINDSIGHT_MODE"] = "local"
os.environ["GROQ_API_KEY"] = ""

from fastapi.testclient import TestClient

from backend.app.main import app, get_llm_service, get_memory_service
from backend.app.schemas import MemoryRecallResponse
from backend.app.services.llm import LLMService
from backend.app.services.memory import MemoryService


def test_end_to_end_demo():
    with TestClient(app) as client:
        incidents = client.get("/api/incidents")
        assert incidents.status_code == 200
        current = next(item for item in incidents.json() if item["incident_key"] == "INC-017")

        retrieved = client.get(f"/api/incidents/{current['id']}")
        assert retrieved.status_code == 200
        assert retrieved.json()["service"] == "payment-api"

        analysis = client.post(f"/api/incidents/{current['id']}/analyze")
        assert analysis.status_code == 200
        body = analysis.json()
        assert body["relevant_memories"][0]["incident_key"] == "INC-001"
        assert body["relevant_memories"][0]["similarity"] == 0.91
        assert "does not confirm" in body["uncertainty"]

        recall = client.post("/api/memory/recall", json={"incident_id": current["id"]})
        assert recall.status_code == 200
        assert len(recall.json()["memories"]) >= 2

        resolved = client.post(
            f"/api/incidents/{current['id']}/resolve",
            json={
                "root_cause": "Connection leak in the v3 checkout client exhausted the database pool.",
                "resolution": "Patched connection cleanup and raised safe pool headroom.",
                "outcome": "Timeout rate returned to baseline and utilization stabilized.",
                "lessons": "Alert on connection churn before pool saturation.",
                "engineer_feedback": "The recalled memory led us to the right subsystem quickly.",
                "retain": True,
            },
        )
        assert resolved.status_code == 200
        assert resolved.json()["memory_retained"] is True

        feedback = client.post(
            f"/api/incidents/{current['id']}/feedback",
            json={"engineer": "Maya Chen", "rating": 5, "helpful": True, "comments": "Useful evidence separation."},
        )
        assert feedback.status_code == 201

        learning = client.post("/api/learning/reflect")
        assert learning.status_code == 200
        assert learning.json()["source_incidents"] >= 6
        assert "6 related incidents" in learning.json()["recurring_pattern"]


def test_create_incident_and_no_relevant_memory():
    with TestClient(app) as client:
        created = client.post("/api/incidents", json={
            "title": "Image CDN certificate warning",
            "description": "Certificate chain warning from edge image hosts.",
            "severity": "medium",
            "service": "image-cdn",
            "error": "certificate chain incomplete",
            "symptoms": "TLS warning on image requests",
            "affected_users": 4,
        })
        assert created.status_code == 201
        incident = created.json()
        recall = client.post("/api/memory/recall", json={"incident_id": incident["id"]})
        assert recall.status_code == 200
        assert recall.json()["memories"] == []


def test_incomplete_incident_is_rejected():
    with TestClient(app) as client:
        response = client.post("/api/incidents", json={"title": "x"})
        assert response.status_code == 422


def test_demo_reset_is_idempotent_and_preserves_unrelated_incidents():
    with TestClient(app) as client:
        created = client.post("/api/incidents", json={
            "title": "Unrelated customer incident",
            "description": "This record must survive a demo reset.",
            "severity": "low",
            "service": "customer-service",
            "affected_users": 1,
        })
        assert created.status_code == 201
        unrelated_key = created.json()["incident_key"]
        assert client.post("/api/demo/reset").status_code == 200
        assert client.post("/api/demo/reset").status_code == 200
        incidents = client.get("/api/incidents").json()
        keys = [item["incident_key"] for item in incidents]
        assert unrelated_key in keys
        assert keys.count("INC-001") == 1
        assert keys.count("INC-017") == 1
        current = next(item for item in incidents if item["incident_key"] == "INC-017")
        assert current["status"] == "investigating"
        assert current["memory_retained"] is False


class UnavailableMemory(MemoryService):
    async def recall(self, db, incident, raw_context, limit):
        return MemoryRecallResponse(
            memories=[],
            source="none",
            status="unavailable",
            message="Historical memory is temporarily unavailable. You can continue using current incident evidence.",
        )


def test_hindsight_unavailable_continues_with_current_evidence():
    original = get_memory_service()
    app.dependency_overrides[get_memory_service] = lambda: UnavailableMemory(original.settings)
    try:
        with TestClient(app) as client:
            current = next(item for item in client.get("/api/incidents").json() if item["incident_key"] == "INC-017")
            response = client.post(f"/api/incidents/{current['id']}/analyze")
            assert response.status_code == 200
            assert response.json()["memory_status"] == "unavailable"
            assert response.json()["current_evidence"]
    finally:
        app.dependency_overrides.clear()


class AlwaysFallbackLLM(LLMService):
    pass


def test_llm_unavailable_returns_safe_fallback():
    service = get_llm_service()
    service.settings.groq_api_key = ""
    app.dependency_overrides[get_llm_service] = lambda: AlwaysFallbackLLM(service.settings)
    try:
        with TestClient(app) as client:
            current = next(item for item in client.get("/api/incidents").json() if item["incident_key"] == "INC-017")
            response = client.post(f"/api/incidents/{current['id']}/analyze")
            assert response.status_code == 200
            assert response.json()["llm_status"] == "fallback"
            assert "does not confirm" in response.json()["uncertainty"]
    finally:
        app.dependency_overrides.clear()
