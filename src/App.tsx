import { lazy, Suspense, useState } from "react"
import Dashboard from "./components/Dashboard"
import IncidentWorkspace from "./components/IncidentWorkspace"
import JudgeLanding from "./components/JudgeLanding"
import Shell, { type Page } from "./components/Shell"
import { ArrowRight, Database, Search, Server, Siren } from "lucide-react"
import { Badge, Button, Card, PageTitle, SectionTitle } from "./components/ui"
import { incidents, memory } from "./data"

const Learning = lazy(() => import("./components/Learning"))

function DirectoryPage({ page, onNavigate }: { page: Exclude<Page, "dashboard" | "incident" | "learning">; onNavigate: (page: Page) => void }) {
  const config = {
    incidents: ["Incidents", "Investigate, resolve, and learn from production incidents."],
    copilot: ["AI Incident Copilot", "Investigate incidents using current evidence and operational memory."],
    memory: ["Operational Memory", "Everything RecallOps has learned from previous incidents."],
    services: ["Services", "Health, incidents, and accumulated knowledge by service."],
  }[page]
  return <div className="page">
    <div className="page-heading"><div><PageTitle>{config[0]}</PageTitle><p>{config[1]}</p></div><Button variant="primary" onClick={() => onNavigate("incident")}><Siren size={16} /> {page === "incidents" ? "Create incident" : "Open active investigation"}</Button></div>
    <Card className="directory-toolbar"><Button variant="secondary"><Search size={15} /> Search</Button><Button variant="secondary">Severity</Button><Button variant="secondary">Status</Button><Button variant="secondary">Service</Button></Card>
    {page === "memory" ? <div className="memory-directory"><Card className="memory-record"><div><Badge tone="info">{memory.similarity}% match to current</Badge><code>{memory.id}</code></div><SectionTitle>{memory.title}</SectionTitle><p><strong>Root cause:</strong> {memory.rootCause}</p><p><strong>Resolution:</strong> {memory.resolution}</p><div><Badge tone="success">Resolved · Retained</Badge><span>Verified by Maya Chen · Jan 14</span></div><Button variant="secondary" onClick={() => onNavigate("incident")}>Use in investigation <ArrowRight size={15} /></Button></Card></div> :
    page === "services" ? <div className="services-grid">{[["payment-api", "2", "34", "28m"], ["checkout-edge", "1", "19", "34m"], ["events-worker", "1", "12", "41m"]].map(([name, active, count, mttr]) => <Card className="service-card" key={name}><div><Server size={19} /><Badge tone="success">Operational</Badge></div><SectionTitle>{name}</SectionTitle><div className="service-metrics"><span><small>ACTIVE</small><strong>{active}</strong></span><span><small>INCIDENTS</small><strong>{count}</strong></span><span><small>AVG. RESOLUTION</small><strong>{mttr}</strong></span></div><Button variant="secondary" onClick={() => onNavigate("incidents")}>View incidents</Button></Card>)}</div> :
    page === "copilot" ? <Card className="copilot-intro"><Database size={28} /><SectionTitle>Investigation, not conversation.</SectionTitle><p>Select an active incident to combine current telemetry, recalled outcomes, and transparent recommendations in a structured investigation console.</p><Button variant="primary" onClick={() => onNavigate("incident")}>Investigate INC-017 <ArrowRight size={15} /></Button></Card> :
    <Card className="table-card incidents-full"><div className="table-head incident-row"><span>INCIDENT</span><span>SERVICE</span><span>STATUS</span><span>DURATION</span><span>IMPACT</span><span>MEMORY MATCH</span></div>{incidents.map((incident, index) => <Button variant="ghost" className="incident-row table-row" key={incident.id} onClick={() => onNavigate("incident")}><div className="incident-name"><i className={`severity-dot severity-${incident.severity.toLowerCase()}`} /><div><strong>{incident.title}</strong><small>{incident.id} · {incident.severity}</small></div></div><code>{incident.service}</code><Badge tone="warning">{incident.status}</Badge><span>{incident.duration}</span><span>{incident.affected} users</span><Badge tone={index === 0 ? "info" : "neutral"}>{index === 0 ? "91% · 3 memories" : "No close match"}</Badge></Button>)}</Card>}
  </div>
}

export default function App() {
  const [page, setPage] = useState<Page>("dashboard")
  const [judgeLanding, setJudgeLanding] = useState(true)
  if (judgeLanding) return <JudgeLanding onLaunch={() => setJudgeLanding(false)} />
  return <Shell page={page} onNavigate={setPage}>
    {page === "dashboard" && <Dashboard onNavigate={setPage} />}
    {page === "incident" && <IncidentWorkspace onNavigate={setPage} />}
    {page === "learning" && <Suspense fallback={<div className="page"><Card><SectionTitle>Synthesizing historical incidents...</SectionTitle></Card></div>}><Learning onNavigate={setPage} /></Suspense>}
    {!["dashboard", "incident", "learning"].includes(page) && <DirectoryPage page={page as Exclude<Page, "dashboard" | "incident" | "learning">} onNavigate={setPage} />}
  </Shell>
}
