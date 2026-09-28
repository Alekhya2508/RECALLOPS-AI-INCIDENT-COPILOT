import { AlertTriangle, ArrowRight, BrainCircuit, GitBranch, TrendingDown } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useEffect, useState } from "react"
import { resolutionData, rootCauseData } from "../data"
import { reflectOnLearning, type LearningResult } from "../services/api"
import { Badge, Button, Card, Eyebrow, PageTitle, SectionTitle } from "./ui"
import type { Page } from "./Shell"

export default function Learning({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [learning, setLearning] = useState<LearningResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    reflectOnLearning().then(setLearning).catch((reason) => {
      setError(reason instanceof Error ? reason.message : "Operational learning is temporarily unavailable.")
    })
  }, [])

  const causes = learning?.recurring_root_causes.length ? learning.recurring_root_causes : rootCauseData
  const trends = learning?.resolution_trends.length ? learning.resolution_trends : resolutionData
  const pattern = learning?.recurring_pattern ?? "Database connection exhaustion has appeared in 6 Payment API incidents."
  const related = learning?.related_incidents.length ? learning.related_incidents : ["INC-001", "INC-007", "INC-011", "INC-017", "INC-024", "INC-031"]
  const lesson = learning?.synthesized_lessons[0] ?? "Inspect connection lifecycle before scaling pool capacity."
  return <div className="page">
    <div className="page-heading"><div><PageTitle>Operational Learning</PageTitle><p>Patterns emerging across your incident history.</p></div><Badge tone="info">Reflect stage · {learning?.memory_usage.retained_incidents ?? 84} memories</Badge></div>
    {error && <Card className="integration-notice integration-error"><AlertTriangle size={18} /><div><strong>Live learning data unavailable</strong><p>{error} Showing the last known demo snapshot.</p></div><Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button></Card>}
    <Card className="pattern-hero"><div className="pattern-icon"><GitBranch size={22} /></div><div className="pattern-main"><Eyebrow tone="warning">RECURRING PATTERN DETECTED</Eyebrow><strong className="pattern-service">Payment API</strong><SectionTitle>{pattern}</SectionTitle><p>Historical outcomes repeatedly point to connection lifecycle management and pool configuration as contributing areas. Treat this as a pattern to investigate, not a confirmed universal cause.</p><div className="incident-chips">{related.map((id) => <span key={id}>#{id.replace("INC-", "")}</span>)}</div></div><Button variant="secondary" onClick={() => onNavigate("incident")}>Open latest incident <ArrowRight size={15} /></Button></Card>
    <div className="learning-summary">
      <Card><small>AFFECTED SERVICES</small><strong>{learning?.incidents_by_service.length ?? 2}</strong><span>{learning?.incidents_by_service[0]?.name ?? "payment-api"} leads incident history</span></Card>
      <Card><small>STORED INCIDENTS</small><strong>{learning?.incidents_by_service.reduce((sum, item) => sum + item.incidents, 0) ?? 6}</strong><span>Actual database records</span></Card>
      <Card><small>RETAINED MEMORIES</small><strong>{learning?.memory_usage.retained_incidents ?? 6}</strong><span>Engineer-confirmed outcomes</span></Card>
      <Card><small>MEMORY RECALLS</small><strong>{learning?.memory_usage.total_recalls ?? 1}</strong><span>Used during investigations</span></Card>
    </div>
    <div className="charts-grid">
      <Card className="chart-card"><div className="section-header"><div><SectionTitle>Recurring root causes</SectionTitle><p>Engineer-confirmed causes · Last 90 days</p></div><Badge tone="neutral">{learning?.source_incidents ?? 42} incidents</Badge></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={causes} layout="vertical" margin={{ left: 10, right: 15 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={120} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 6 }} /><Bar dataKey="value" fill="var(--accent)" radius={[0, 3, 3, 0]} barSize={18} isAnimationActive={false} /></BarChart></ResponsiveContainer></div></Card>
      <Card className="chart-card"><div className="section-header"><div><SectionTitle>Memory effectiveness</SectionTitle><p>Median resolution time · Minutes</p></div><div className="metric-good"><TrendingDown size={16} /> {learning ? `${learning.memory_usage.recall_rate}% recall rate` : "43% faster"}</div></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={trends} margin={{ left: -20, right: 12 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="month" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 6 }} /><Line dataKey="withoutMemory" stroke="var(--muted)" strokeWidth={2} dot={false} isAnimationActive={false} /><Line dataKey="withMemory" stroke="var(--success)" strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div><div className="chart-legend"><span><i className="legend-memory" />With relevant memory</span><span><i />Without relevant memory</span></div></Card>
    </div>
    <div className="learning-grid">
      <Card className="team-lesson"><div className="lesson-icon"><BrainCircuit size={20} /></div><div><Eyebrow tone="info">SYNTHESIZED TEAM LESSON</Eyebrow><SectionTitle>{lesson}</SectionTitle><p>Across the recorded Payment API incidents, lasting resolutions paired capacity changes with connection cleanup or lifecycle fixes. Increasing capacity alone correlated with recurrence.</p><div><Badge tone="neutral">Based on {related.length} related Payment API incidents</Badge><Badge tone="info">Historical evidence</Badge></div></div></Card>
      <Card className="guardrail"><AlertTriangle size={18} /><div><strong>Learning guardrail</strong><p>Patterns reflect recorded incident history and may not generalize. Engineers should validate each recommendation against current evidence.</p></div></Card>
    </div>
  </div>
}
