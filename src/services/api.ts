export type MemoryMatch = {
  incident_key: string
  title: string
  service: string
  similarity: number
  root_cause: string | null
  resolution: string | null
  outcome: string | null
  lessons: string | null
  matched_on: string[]
}

export type EvidenceItem = { label: string; value: string }

export type InvestigationPath = {
  title: string
  confidence: "high" | "medium" | "low"
  reason: string
  evidence_source: "current" | "historical" | "current + historical"
}

export type AnalysisResult = {
  incident_summary: string
  relevant_memories: MemoryMatch[]
  investigation_paths: InvestigationPath[]
  current_evidence: EvidenceItem[]
  historical_evidence: EvidenceItem[]
  recommended_next_steps: string[]
  confidence: string
  uncertainty: string
  memory_status: "available" | "degraded" | "unavailable"
  memory_message: string | null
  llm_status: "available" | "fallback" | "unavailable"
  llm_message: string | null
}

export type IncidentRecord = {
  id: number
  incident_key: string
  title: string
  description: string
  severity: string
  status: string
  service: string
  error: string | null
  symptoms: string | null
  affected_users: number
  root_cause: string | null
  resolution: string | null
  outcome: string | null
  lessons: string | null
  memory_retained: boolean
}

export type LearningResult = {
  recurring_root_causes: Array<{ name: string; value: number }>
  incidents_by_service: Array<{ name: string; incidents: number }>
  resolution_trends: Array<{ month: string; withMemory: number; withoutMemory: number }>
  memory_usage: { retained_incidents: number; incidents_with_recall: number; total_recalls: number; recall_rate: number }
  recurring_pattern: string | null
  related_incidents: string[]
  synthesized_lessons: string[]
  source_incidents: number
}

class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
  }
}

const baseUrl = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "")

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options?.headers },
    })
  } catch {
    throw new ApiError("RecallOps cannot reach the backend. Check the API service and try again.")
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const detail = typeof payload?.detail === "string"
      ? payload.detail
      : response.status >= 500
        ? "RecallOps cannot reach the backend. Check the API service and try again."
        : "The request could not be completed."
    throw new ApiError(detail, response.status)
  }
  return response.json() as Promise<T>
}

async function findIncident(key: string): Promise<IncidentRecord> {
  const incidents = await request<IncidentRecord[]>("/incidents")
  const incident = incidents.find((item) => item.incident_key === key)
  if (!incident) throw new ApiError(`${key} is not available in the demo database.`)
  return incident
}

export async function analyzeDemoIncident(): Promise<AnalysisResult> {
  const incident = await findIncident("INC-017")
  return request<AnalysisResult>(`/incidents/${incident.id}/analyze`, { method: "POST" })
}

export async function resolveDemoIncident(): Promise<{ memory_retained: boolean; memory_status: string; message: string }> {
  const incident = await findIncident("INC-017")
  return request(`/incidents/${incident.id}/resolve`, {
    method: "POST",
    body: JSON.stringify({
      root_cause: "Connection leak in the v3 checkout client exhausted the database pool.",
      resolution: "Patched connection cleanup and raised pool headroom from 15% to 30%.",
      outcome: "Timeout rate returned to baseline; pool utilization stabilized at 61%.",
      lessons: "Alert on connection churn before pool saturation.",
      engineer_feedback: "The recalled memory focused the investigation on connection lifecycle behavior.",
      retain: true,
    }),
  })
}

export function reflectOnLearning(): Promise<LearningResult> {
  return request<LearningResult>("/learning/reflect", { method: "POST" })
}

export function resetDemo(): Promise<{ status: string; message: string; incidents_restored: number }> {
  return request("/demo/reset", { method: "POST" })
}
