import { cn } from "@/lib/utils";
import { Activity, AlertTriangle, BellRing, Box, ChevronRight, CircleDotDashed, CircleGauge, Database, GitFork, Menu, Radio, ShieldCheck, Waypoints, X } from "lucide-react";
import { ReactNode, useState } from "react";
import { useLocation } from "wouter";

const menuItems = [
  { icon: CircleGauge, label: "Command center", path: "/" },
  { icon: AlertTriangle, label: "Anomaly log", path: "/anomalies" },
  { icon: GitFork, label: "Kafka topology", path: "/topology" },
  { icon: Waypoints, label: "Processing pipeline", path: "/pipeline" },
  { icon: Box, label: "Model registry", path: "/models" },
  { icon: Radio, label: "Event explorer", path: "/events" },
  { icon: BellRing, label: "Alert rules", path: "/alerts" },
];

function LabelIcon() { return <div className="brand-mark"><span /><span /><span /></div>; }

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeItem = menuItems.find(item => item.path === location) ?? menuItems[0];
  const navigate = (path: string) => { setLocation(path); setMobileOpen(false); };
  return <div className="app-shell">
    <aside className={cn("app-sidebar", { "mobile-open": mobileOpen })}>
      <div className="sidebar-top"><button className="brand" onClick={() => navigate("/")}><LabelIcon /><span><strong>Axial</strong><small>Event observability</small></span></button><button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18} /></button></div>
      <div className="workspace-label"><span>OPERATIONS WORKSPACE</span><ChevronRight size={13} /></div>
      <nav className="sidebar-nav">{menuItems.map(item => <button key={item.path} className={cn("nav-item", { active: location === item.path })} onClick={() => navigate(item.path)}><item.icon size={17} /><span>{item.label}</span>{location === item.path && <i />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="connection-card"><div className="connection-icon"><Database size={16} /></div><div><span>Data plane</span><strong><i /> Connected</strong></div></div><div className="sidebar-user"><div className="user-avatar">OP</div><div><strong>Operations</strong><span>production workspace</span></div><ShieldCheck size={16} /></div></div>
    </aside>
    <div className="shell-content"><header className="app-header"><div className="header-left"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><div className="breadcrumb"><span>Operations</span><ChevronRight size={14} /><strong>{activeItem.label}</strong></div></div><div className="header-right"><div className="header-health"><span /><span>System online</span></div><div className="header-time"><Activity size={15} /> Live telemetry</div></div></header><main className="app-main">{children}</main></div>
    {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
  </div>;
}
