import {
  Activity, Bell, BookOpen, Bot, Boxes, ChevronsLeft, CircleGauge, Command,
  Database, GraduationCap, LayoutDashboard, Menu, Search, Settings, ShieldCheck, Siren, X,
} from "lucide-react"
import { useState, type ReactNode } from "react"
import { Button, IconButton, Input } from "./ui"

export type Page = "dashboard" | "incident" | "incidents" | "copilot" | "memory" | "learning" | "services"

const navigation = [
  { id: "dashboard" as Page, label: "Overview", icon: LayoutDashboard },
  { id: "incidents" as Page, label: "Incidents", icon: Siren, count: "12" },
  { id: "copilot" as Page, label: "Copilot", icon: Bot },
  { id: "memory" as Page, label: "Memory", icon: Database },
  { id: "learning" as Page, label: "Learning", icon: GraduationCap },
]

export default function Shell({ page, onNavigate, children }: { page: Page; onNavigate: (page: Page) => void; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState("")

  const go = (next: Page) => {
    onNavigate(next)
    setMobileOpen(false)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""} ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Activity size={19} /></div>
          {!collapsed && <div><strong>RECALL<span>OPS</span></strong><small>AI INCIDENT COPILOT</small></div>}
          <IconButton label="Close navigation" className="mobile-close" onClick={() => setMobileOpen(false)}><X size={18} /></IconButton>
        </div>
        <nav aria-label="Primary navigation">
          <div className="nav-label">WORKSPACE</div>
          {navigation.map(({ id, label, icon: Icon, count }) => (
            <Button key={id} variant="ghost" className={`nav-item ${page === id || (id === "incidents" && page === "incident") ? "active" : ""}`} onClick={() => go(id)}>
              <Icon size={18} /><span>{label}</span>{count && <em>{count}</em>}
            </Button>
          ))}
          <div className="nav-label nav-spacer">OPERATIONS</div>
          <Button variant="ghost" className="nav-item" onClick={() => go("incidents")}><CircleGauge size={18} /><span>Active Incidents</span><i className="live-dot" /></Button>
          <Button variant="ghost" className="nav-item" onClick={() => go("services")}><Boxes size={18} /><span>Services</span></Button>
          <Button variant="ghost" className="nav-item" onClick={() => go("dashboard")}><BookOpen size={18} /><span>Recent Activity</span></Button>
        </nav>
        <div className="sidebar-bottom">
          <div className="system-card"><ShieldCheck size={16} /><div><span>All systems operational</span><small>Memory index synced</small></div></div>
          <Button variant="ghost" className="nav-item" onClick={() => go("dashboard")}><Settings size={18} /><span>Settings</span></Button>
          <div className="profile"><div className="avatar">MC</div><div><strong>Maya Chen</strong><small>On-call engineer</small></div></div>
        </div>
        <IconButton label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="collapse-btn" onClick={() => setCollapsed(!collapsed)}><ChevronsLeft size={16} /></IconButton>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <IconButton label="Open navigation" className="mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={19} /></IconButton>
          <div className="breadcrumb"><span>RecallOps</span><b>/</b><strong>{page === "incident" ? "INC-017" : page}</strong></div>
          <Button variant="secondary" className="global-search" onClick={() => setSearchOpen(true)}><Search size={16} /><span>Search incidents, services, memories...</span><kbd>⌘ K</kbd></Button>
          <div className="top-actions"><div className="status-pill"><i /> Operational</div><IconButton label="Notifications"><Bell size={18} /><span className="notification-dot" /></IconButton><div className="avatar avatar-small">MC</div></div>
        </header>
        <main>{children}</main>
      </div>

      {searchOpen && <div className="dialog-backdrop" onMouseDown={() => setSearchOpen(false)}>
        <div className="command-palette" role="dialog" aria-modal="true" aria-label="Global search" onMouseDown={(event) => event.stopPropagation()}>
          <div className="command-input"><Search size={19} /><Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search incidents, services, memories..." /><kbd>ESC</kbd></div>
          <div className="command-results">
            <small>BEST MATCHES</small>
            <Button variant="ghost" onClick={() => { go("incident"); setSearchOpen(false) }}><Siren size={17} /><div><strong>INC-017 · Payment API database timeout</strong><span>Active incident · Critical</span></div><Command size={14} /></Button>
            <Button variant="ghost" onClick={() => { go("memory"); setSearchOpen(false) }}><Database size={17} /><div><strong>INC-001 · Connection-pool exhaustion</strong><span>Operational memory · 91% match</span></div></Button>
            <Button variant="ghost" onClick={() => { go("services"); setSearchOpen(false) }}><Boxes size={17} /><div><strong>payment-api</strong><span>Service · 2 active incidents</span></div></Button>
            {query && <p className="search-hint">Showing results for “{query}” across incidents, services, and memory.</p>}
          </div>
        </div>
      </div>}
    </div>
  )
}
