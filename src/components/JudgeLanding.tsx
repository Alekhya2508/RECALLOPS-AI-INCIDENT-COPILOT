import { Activity, AlertTriangle, ArrowDown, BrainCircuit, CheckCircle2, Database, GraduationCap, Search, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { resetDemo } from "../services/api"
import { Button, Card, Eyebrow, PageTitle } from "./ui"

export default function JudgeLanding({ onLaunch }: { onLaunch: () => void }) {
  const [status, setStatus] = useState<"idle" | "preparing">("idle")
  const [error, setError] = useState<string | null>(null)

  const launch = async () => {
    setStatus("preparing")
    setError(null)
    try {
      await resetDemo()
      onLaunch()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The demo environment could not be prepared.")
    } finally {
      setStatus("idle")
    }
  }

  const stages = [
    ["INCIDENT", Activity],
    ["RECALL", Search],
    ["AI INVESTIGATION", BrainCircuit],
    ["RESOLVE", CheckCircle2],
    ["RETAIN", Database],
    ["LEARN", GraduationCap],
  ] as const

  return <main className="judge-landing">
    <div className="judge-grid" aria-hidden="true" />
    <div className="judge-brand"><div className="brand-mark"><Activity size={19} /></div><div><strong>RECALL<span>OPS</span></strong><small>AI INCIDENT COPILOT</small></div></div>
    <section className="judge-content">
      <div className="judge-copy">
        <Eyebrow tone="info">START RECALL OPS DEMO</Eyebrow>
        <PageTitle>Operational memory for faster incident investigation.</PageTitle>
        <p>RecallOps remembers how previous incidents were solved and uses that experience to guide the next investigation.</p>
        <div className="judge-assurances"><span><ShieldCheck size={14} /> Deterministic demo data</span><span><Database size={14} /> No production access required</span></div>
        <Button variant="primary" onClick={launch} disabled={status === "preparing"}>{status === "preparing" ? "Preparing demo..." : "Launch Demo"} <ArrowDown size={16} /></Button>
        {error && <Card className="judge-error"><AlertTriangle size={17} /><div><strong>Demo preparation failed</strong><p>{error}</p></div><Button variant="secondary" onClick={launch}>Retry</Button></Card>}
      </div>
      <Card className="judge-loop">
        <Eyebrow>THE OPERATIONAL MEMORY LOOP</Eyebrow>
        {stages.map(([label, Icon], index) => <div className={index === 1 || index === 2 || index === 4 ? "judge-stage active" : "judge-stage"} key={label}><span><Icon size={16} /></span><strong>{label}</strong>{index < stages.length - 1 && <ArrowDown size={13} />}</div>)}
      </Card>
    </section>
    <footer className="judge-footer"><span>RECALL</span><i /><span>RETAIN</span><i /><span>REFLECT</span></footer>
  </main>
}
