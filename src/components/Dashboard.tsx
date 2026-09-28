import { Activity, AlertTriangle, ArrowRight, BrainCircuit, CheckCircle2, Clock3, Flame, Play, RotateCcw, Siren, TrendingUp, Users } from "lucide-react"
import { motion } from "framer-motion"
import { useState } from "react"
import { incidents, memory } from "../data"
import { resetDemo } from "../services/api"
import { Badge, Button, Card, Eyebrow, PageTitle, SectionTitle } from "./ui"
import type { Page } from "./Shell"

export default function Dashboard({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [demoStatus, setDemoStatus] = useState<"idle" | "resetting">("idle")
  const [demoMessage, setDemoMessage] = useState<string | null>(null)

  const prepareDemo = async (launch: boolean) => {
    setDemoStatus("resetting")
    setDemoMessage(null)
    try {
      const result = await resetDemo()
      setDemoMessage(result.message)
      if (launch) onNavigate("incident")
    } catch (error) {
      setDemoMessage(error instanceof Error ? error.message : "Demo data could not be prepared. Try again.")
    } finally {
      setDemoStatus("idle")
    }
  }

  const kpis = [
    { label: "Active incidents", value: "12", detail: "+3 today", icon: Siren, tone: "critical" },
    { label: "Critical incidents", value: "3", detail: "Requires attention", icon: Flame, tone: "warning" },
    { label: "Memories recalled", value: "148", detail: "This week", icon: BrainCircuit, tone: "info" },
    { label: "Resolution rate", value: "94.2%", detail: "+8.4% vs last month", icon: TrendingUp, tone: "success" },
  ]
  return (
    <div className="page">
      <div className="page-heading">
        <div><PageTitle>Good morning, Engineer.</PageTitle><p>Here’s what’s happening across your services.</p></div>
        <div className="heading-actions"><Button variant="ghost" disabled={demoStatus === "resetting"} onClick={() => prepareDemo(false)}><RotateCcw size={15} /> Reset demo data</Button><Button variant="primary" disabled={demoStatus === "resetting"} onClick={() => prepareDemo(true)}><Play size={16} /> {demoStatus === "resetting" ? "Preparing..." : "Launch Demo"}</Button></div>
      </div>
      {demoMessage && <Card className={`integration-notice ${demoMessage.includes("could not") || demoMessage.includes("cannot") ? "integration-error" : ""}`}><AlertTriangle size={18} /><div><strong>Demo environment</strong><p>{demoMessage}</p></div></Card>}

      <div className="kpi-grid">
        {kpis.map((item, index) => <motion.div key={item.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .05 }}>
          <Card className={`kpi kpi-${item.tone}`}>
            <div className="kpi-top"><span>{item.label}</span><item.icon size={18} /></div><strong>{item.value}</strong><small>{item.detail}</small>
          </Card>
        </motion.div>)}
      </div>

      <div className="dashboard-grid">
        <section className="incidents-section">
          <div className="section-header"><div><SectionTitle>Active Incidents</SectionTitle><p>Prioritized by severity and impact</p></div><Button variant="ghost" onClick={() => onNavigate("incidents")}>View all <ArrowRight size={15} /></Button></div>
          <Card className="table-card">
            <div className="table-head incident-row"><span>INCIDENT</span><span>SERVICE</span><span>STATUS</span><span>DURATION</span><span>IMPACT</span><span>OWNER</span></div>
            {incidents.map((incident) => <Button variant="ghost" className="incident-row table-row" key={incident.id} onClick={() => onNavigate("incident")}>
              <div className="incident-name"><i className={`severity-dot severity-${incident.severity.toLowerCase()}`} /><div><strong>{incident.title}</strong><small>{incident.id} · {incident.severity}</small></div></div>
              <code>{incident.service}</code><Badge tone={incident.status === "Investigating" ? "warning" : incident.status === "Monitoring" ? "success" : "info"}>{incident.status}</Badge>
              <span><Clock3 size={14} /> {incident.duration}</span><span><Users size={14} /> {incident.affected}</span><span>{incident.owner}</span>
            </Button>)}
          </Card>
        </section>

        <motion.aside initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="memory-card">
            <div className="memory-glow" />
            <div className="memory-header"><div className="memory-icon"><BrainCircuit size={20} /></div><div><Eyebrow tone="info">MEMORY WORKING</Eyebrow><strong>Relevant experience found</strong></div><Badge tone="info">{memory.similarity}% match</Badge></div>
            <p>RecallOps connected the current Payment API incident to a resolved historical pattern.</p>
            <div className="memory-incident"><div><code>{memory.id}</code><strong>{memory.title}</strong></div><div className="match-bar"><i /></div></div>
            <div className="memory-detail"><small>PREVIOUS ROOT CAUSE</small><p>{memory.rootCause}</p></div>
            <div className="memory-detail"><small>RESOLUTION THAT WORKED</small><p>{memory.resolution}</p></div>
            <Button variant="primary" onClick={() => onNavigate("memory")}>View INC-001 memory <ArrowRight size={16} /></Button>
          </Card>
        </motion.aside>
      </div>

      <div className="bottom-grid">
        <Card>
          <div className="section-header"><div><SectionTitle>Recent Activity</SectionTitle><p>Live updates across your response team</p></div><span className="live-label"><i /> LIVE</span></div>
          <div className="activity-list">
            {[
              ["08:42", "AI recalled Incident #001", "Payment API · Memory similarity 91%", BrainCircuit, "info"],
              ["08:40", "Engineer started investigation", "Maya Chen · INC-017", Activity, "warning"],
              ["08:37", "Incident #017 created", "Payment API · Critical severity", Siren, "critical"],
              ["08:12", "Incident #016 resolved", "Checkout Edge · Resolution retained", CheckCircle2, "success"],
            ].map(([time, title, subtitle, Icon, tone]) => <div className="activity-item" key={String(time)}><code>{String(time)}</code><div className={`activity-icon activity-${tone}`}><Icon size={15} /></div><div><strong>{String(title)}</strong><span>{String(subtitle)}</span></div></div>)}
          </div>
        </Card>
        <Card className="loop-card">
          <Eyebrow>OPERATIONAL MEMORY LOOP</Eyebrow><SectionTitle>Every incident makes the next response faster.</SectionTitle>
          <div className="memory-loop">{["Incident", "Recall", "Investigate", "Resolve", "Retain", "Reflect"].map((step, i) => <div key={step} className={i < 3 ? "loop-active" : ""}><span>{String(i + 1).padStart(2, "0")}</span><strong>{step}</strong>{i < 5 && <ArrowRight size={14} />}</div>)}</div>
          <p>Memory is built from confirmed outcomes and engineer feedback — not conversation history.</p>
        </Card>
      </div>
    </div>
  )
}
