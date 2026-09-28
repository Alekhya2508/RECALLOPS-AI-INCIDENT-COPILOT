import { AlertTriangle, ArrowRight, BrainCircuit, Check, CheckCircle2, ChevronRight, Clock3, Database, GitCompare, Play, Server, ShieldAlert, Sparkles, Users, X } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useState } from "react"
import { memory } from "../data"
import { analyzeDemoIncident, resolveDemoIncident, type AnalysisResult } from "../services/api"
import { Badge, Button, Card, Eyebrow, SectionTitle } from "./ui"
import type { Page } from "./Shell"

const analysisSteps = ["Reading current incident", "Searching operational memory", "Historical experience found", "Comparing evidence", "Generating investigation paths"]

export default function IncidentWorkspace({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [analysis, setAnalysis] = useState<"idle" | "running" | "complete">("idle")
  const [step, setStep] = useState(0)
  const [resolveOpen, setResolveOpen] = useState(false)
  const [retained, setRetained] = useState(false)
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    if (analysis !== "running") return
    if (step >= analysisSteps.length) {
      if (!analysisData && !analysisError) return
      const done = window.setTimeout(() => setAnalysis("complete"), 450)
      return () => window.clearTimeout(done)
    }
    const timer = window.setTimeout(() => setStep((value) => value + 1), 650)
    return () => window.clearTimeout(timer)
  }, [analysis, analysisData, analysisError, step])

  const runAnalysis = async () => {
    setStep(0)
    setAnalysisError(null)
    setAnalysis("running")
    try {
      setAnalysisData(await analyzeDemoIncident())
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "AI investigation is temporarily unavailable.")
    }
  }

  const retainResolution = async () => {
    setResolving(true)
    setResolveError(null)
    try {
      const result = await resolveDemoIncident()
      if (!result.memory_retained) throw new Error(result.message)
      setRetained(true)
    } catch (error) {
      setResolveError(error instanceof Error ? error.message : "The incident could not be retained. Try again.")
    } finally {
      setResolving(false)
    }
  }

  const recalledMemory = analysisData?.relevant_memories[0]
  const memoryCount = analysisData?.relevant_memories.length ?? 3
  const currentEvidence = analysisData?.current_evidence ?? [["Connection utilization", "98%"], ["Timeout rate", "14.2%"], ["Deployment", "23 min ago"], ["Error family", "connection timeout"]].map(([label, value]) => ({ label, value }))
  const historicalEvidence = analysisData?.historical_evidence ?? [["Incident", "INC-001"], ["Connection utilization", "96%"], ["Service + error", "same family"], ["Confirmed cause", "connection leak"]].map(([label, value]) => ({ label, value }))
  const paths = analysisData?.investigation_paths ?? [
    { title: "Check database connection utilization", confidence: "high" as const, reason: "Current utilization matches the previous incident pattern.", evidence_source: "current + historical" as const },
    { title: "Inspect connection lifecycle and pool config", confidence: "medium" as const, reason: "INC-001 involved a confirmed connection leak.", evidence_source: "current + historical" as const },
    { title: "Review recent deployment changes", confidence: "medium" as const, reason: "A deployment 23 minutes ago may have altered connection handling.", evidence_source: "current" as const },
  ]

  return (
    <div className="workspace">
      <div className="incident-top">
        <Button variant="ghost" className="back-btn" onClick={() => onNavigate("dashboard")}>Overview <ChevronRight size={14} /> Active incident</Button>
        <div className="incident-title-row">
          <div><div className="incident-labels"><Badge tone="critical">SEV 1 · CRITICAL</Badge><code>INC-017</code></div><div className="incident-title">Payment API database timeout</div><div className="incident-meta"><span><Server size={14} /> payment-api</span><span><Clock3 size={14} /> Started 08:37</span><span><Users size={14} /> 12,400 affected</span><Badge tone="warning">Investigating</Badge></div></div>
          <div className="heading-actions"><Button variant="secondary" onClick={() => setResolveOpen(true)}><CheckCircle2 size={16} /> Resolve incident</Button><Button variant="primary" onClick={runAnalysis} disabled={analysis === "running"}><Sparkles size={16} /> {analysis === "running" ? "Investigating..." : "Run AI investigation"}</Button></div>
        </div>
      </div>

      <div className="workspace-grid">
        <aside className="workspace-left">
          <Card><Eyebrow>CURRENT INCIDENT</Eyebrow><p className="summary-copy">Payment API requests are experiencing database connection timeouts. Connection utilization has increased sharply over the last 15 minutes.</p>
            <div className="signal-grid"><div><small>TIMEOUT RATE</small><strong className="critical-text">14.2%</strong><span>↑ 11.8%</span></div><div><small>POOL USAGE</small><strong className="warning-text">98%</strong><span>↑ 36%</span></div></div>
          </Card>
          <Card><SectionTitle>Incident timeline</SectionTitle><div className="timeline">
            {[["08:43", "Historical memory recalled", "91% match to INC-001"], ["08:42", "AI investigation started", "Current evidence indexed"], ["08:41", "Connection utilization reached 98%", "Critical threshold crossed"], ["08:39", "Database timeout rate increased", "14.2% of requests"], ["08:37", "Incident created", "Alert promoted to SEV 1"]].map(([time, title, detail], index) => <div className="timeline-item" key={time}><i className={index === 0 ? "active" : ""} /><code>{time}</code><div><strong>{title}</strong><span>{detail}</span></div></div>)}
          </div></Card>
          <Card className="safety-card"><ShieldAlert size={17} /><div><strong>Engineer in control</strong><p>RecallOps recommends investigation actions. It never changes production systems automatically.</p></div></Card>
        </aside>

        <section className="investigation-console">
          <div className="console-header"><div><div className="console-icon"><BrainCircuit size={20} /></div><div><Eyebrow tone="info">AI INVESTIGATION CONSOLE</Eyebrow><strong>Evidence-based response</strong></div></div><Badge tone={analysis === "complete" ? "success" : analysis === "running" ? "info" : "neutral"}>{analysis === "complete" ? "Analysis ready" : analysis === "running" ? "Analyzing" : "Ready"}</Badge></div>
          <AnimatePresence mode="wait">
            {analysis === "running" ? <motion.div className="analysis-progress" key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="scan-line" /><Eyebrow tone="info">ANALYZING INCIDENT</Eyebrow><SectionTitle>Building an evidence-backed investigation</SectionTitle>
              <div className="steps" aria-live="polite">{analysisSteps.map((item, index) => <div className={index < step ? "done" : index === step ? "active" : ""} key={item}><span>{index < step ? <Check size={14} /> : index === step ? <i /> : null}</span><strong>Step {index + 1} · {item}</strong>{index === 1 && index < step && <Badge tone="info">{memoryCount} found</Badge>}</div>)}</div>
              <p>RecallOps is comparing current telemetry with confirmed historical outcomes.</p>
            </motion.div> : <motion.div key="analysis" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              {analysis === "idle" && <div className="analysis-callout"><Sparkles size={18} /><div><strong>Investigation ready</strong><p>Run analysis to refresh these paths against live incident evidence and operational memory.</p></div><Button variant="primary" onClick={runAnalysis}>Run now</Button></div>}
              {analysisError && <Card className="integration-notice integration-error"><AlertTriangle size={18} /><div><strong>Backend investigation unavailable</strong><p>{analysisError} The current-evidence view remains available.</p></div><Button variant="secondary" onClick={runAnalysis}>Retry</Button></Card>}
              {analysisData?.memory_message && <Card className="integration-notice"><AlertTriangle size={18} /><div><strong>Memory running in degraded mode</strong><p>{analysisData.memory_message}</p></div></Card>}
              {analysisData?.llm_message && <Card className="integration-notice"><Sparkles size={18} /><div><strong>Safe fallback investigation</strong><p>{analysisData.llm_message}</p></div></Card>}
              <div className="evidence-columns">
                <Card className="evidence-current"><Eyebrow tone="warning">CURRENT EVIDENCE</Eyebrow><SectionTitle>What is happening now</SectionTitle>{currentEvidence.map(({ label, value }) => <div className="evidence-row" key={label}><span>{label}</span><code>{value}</code></div>)}</Card>
                <Card className="evidence-history"><Eyebrow tone="info">HISTORICAL EVIDENCE</Eyebrow><SectionTitle>What happened before</SectionTitle>{historicalEvidence.length ? historicalEvidence.map(({ label, value }) => <div className="evidence-row" key={label}><span>{label}</span><code>{value}</code></div>) : <p className="empty-evidence">No relevant historical memory found. This investigation uses current evidence only.</p>}</Card>
              </div>
              <div className="path-section"><div className="section-header"><div><Eyebrow tone="info">AI RECOMMENDATION</Eyebrow><SectionTitle>Recommended investigation paths</SectionTitle><p>Prioritized by current and historical evidence</p></div><Badge tone="warning">Evidence, not proof</Badge></div>
                {paths.map((path, index) => <Card className="investigation-path" key={path.title}><span className="path-number">{String(index + 1).padStart(2, "0")}</span><div><strong>{path.title}</strong><p>{path.reason}</p><div><Badge tone={path.confidence === "high" ? "success" : "warning"}>{path.confidence} confidence</Badge><span>Uses {path.evidence_source} evidence</span></div></div><Button variant="secondary" onClick={() => setAnalysis("complete")}>Investigate <ArrowRight size={15} /></Button></Card>)}
              </div>
              <Card className="uncertainty"><AlertTriangle size={18} /><div><strong>AI confidence & uncertainty</strong><p>{analysisData?.uncertainty ?? "Historical similarity suggests connection-pool exhaustion may be relevant, but this does not confirm the root cause. Validate against current telemetry before acting."}</p></div></Card>
            </motion.div>}
          </AnimatePresence>
        </section>

        <aside className="memory-panel">
          <div className="memory-panel-title"><div><Database size={17} /><strong>Operational Memory</strong></div><span>{memoryCount} matches</span></div>
          {analysisData && analysisData.relevant_memories.length === 0 ? <Card className="no-memory"><Database size={20} /><SectionTitle>No relevant historical memory found.</SectionTitle><p>RecallOps will continue the investigation using current incident evidence only.</p></Card> :
          <Card className="recalled-memory"><div className="recall-top"><Eyebrow tone="info">TOP MEMORY MATCH</Eyebrow><div className="similarity-ring">{Math.round((recalledMemory?.similarity ?? .91) * 100)}<small>%</small></div></div><code>{recalledMemory?.incident_key ?? memory.id}</code><SectionTitle>{recalledMemory?.title ?? memory.title}</SectionTitle>
            <p className="memory-context-line">RecallOps uses previous incident experience as context for future investigations.</p>
            <div className="similarity-meaning"><strong>Strong historical similarity</strong><span>Evidence for investigation, not confirmation of the current root cause.</span></div>
            <div className="why-box"><strong>Why this memory?</strong>{(recalledMemory?.matched_on ?? ["Same service", "Same error family", "Similar symptoms", "Similar DB behavior", "Similar timeline pattern"]).map((item) => <span key={item}><Check size={13} />{item}</span>)}</div>
            <div className="recommendation-influence"><GitCompare size={14} /><span><strong>Influenced AI recommendations</strong>Connection utilization and lifecycle checks were prioritized using this outcome.</span></div>
            <div className="memory-fact"><small>PREVIOUS ROOT CAUSE · HISTORICAL</small><p>{recalledMemory?.root_cause ?? memory.rootCause}</p></div><div className="memory-fact"><small>PREVIOUS RESOLUTION · HISTORICAL</small><p>{recalledMemory?.resolution ?? memory.resolution}</p></div>
            <Button variant="secondary" onClick={() => onNavigate("memory")}>Inspect full memory <ArrowRight size={14} /></Button>
          </Card>}
          {(analysisData?.relevant_memories.slice(1) ?? []).map((item) => <div className="other-match" key={item.incident_key}><span>{item.incident_key}</span><strong>{item.title}</strong><Badge tone="neutral">{Math.round(item.similarity * 100)}%</Badge></div>)}
          {!analysisData && <><div className="other-match"><span>INC-007</span><strong>DB pool saturation</strong><Badge tone="neutral">74%</Badge></div><div className="other-match"><span>INC-011</span><strong>Checkout timeouts</strong><Badge tone="neutral">68%</Badge></div></>}
        </aside>
      </div>

      <AnimatePresence>{resolveOpen && <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="resolve-dialog" role="dialog" aria-modal="true" aria-label="Resolve and retain incident" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="dialog-head"><div><Eyebrow tone={retained ? "success" : "neutral"}>{retained ? "MEMORY RETAINED" : "INCIDENT RESOLVED → RETENTION"}</Eyebrow><SectionTitle>{retained ? "This experience is now operational memory." : "Would you like RecallOps to retain this experience?"}</SectionTitle></div><Button variant="ghost" onClick={() => setResolveOpen(false)}><X size={18} /></Button></div>
          {retained ? <div className="retained-success"><div><CheckCircle2 size={34} /></div><p>This experience can now help investigate future incidents. Learning patterns have been refreshed.</p><div className="retained-flow"><span>INC-017</span><ArrowRight size={15} /><span>Memory</span><ArrowRight size={15} /><span>Future investigations</span></div><Button variant="primary" onClick={() => onNavigate("learning")}>View learning pattern <ArrowRight size={15} /></Button></div> :
          <><p>Confirm what happened before retaining this experience. Engineer-verified outcomes become trusted historical evidence.</p><div className="retain-summary"><div><small>ROOT CAUSE</small><strong>Connection leak in the v3 checkout client exhausted the database pool.</strong></div><div><small>RESOLUTION</small><strong>Patched connection cleanup and raised pool headroom from 15% to 30%.</strong></div><div><small>OUTCOME</small><strong>Timeout rate returned to baseline; pool utilization stabilized at 61%.</strong></div><div><small>LESSON</small><strong>Alert on connection churn before pool saturation.</strong></div></div>{resolveError && <div className="dialog-error"><AlertTriangle size={15} />{resolveError}</div>}<div className="dialog-actions"><Button variant="secondary" onClick={() => setResolveOpen(false)}>Continue investigating</Button><Button variant="primary" disabled={resolving} onClick={retainResolution}><Database size={16} /> {resolving ? "Retaining..." : "Retain to memory"}</Button></div></>}
        </motion.div>
      </motion.div>}</AnimatePresence>
    </div>
  )
}
