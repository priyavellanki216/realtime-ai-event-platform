import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Activity, AlertTriangle, ArrowUpRight, Bot, Box, Check, ChevronLeft, ChevronRight, CircleGauge, Clock3, Database, GitBranch, Layers3, Pause, Play, Plus, Radio, RefreshCw, Save, ServerCog, SlidersHorizontal, Trash2, Waypoints, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState, formatNumber, formatTime, Histogram, MetricCard, Panel, SectionHeading, SeverityBadge, timeAgo, type Severity } from "@/components/platform-ui";

const REFRESH_INTERVAL = 1000;

function useSnapshot() {
  return trpc.platform.snapshot.useQuery(undefined, { refetchInterval: REFRESH_INTERVAL, refetchOnWindowFocus: false });
}

function LoadingPanel() {
  return <div className="loading-page"><div className="pulse-orb" /><p>Establishing live stream connection…</p></div>;
}

function SimulationControls({ config }: { config: { eventRate: number; anomalyProbability: number } }) {
  const utils = trpc.useUtils();
  const mutation = trpc.platform.configureSimulation.useMutation({ onSuccess: () => utils.platform.snapshot.invalidate() });
  const [rate, setRate] = useState(config.eventRate);
  const [probability, setProbability] = useState(Math.round(config.anomalyProbability * 100));

  useEffect(() => { setRate(config.eventRate); setProbability(Math.round(config.anomalyProbability * 100)); }, [config.eventRate, config.anomalyProbability]);
  const update = (nextRate: number, nextProbability: number) => mutation.mutate({ eventRate: nextRate, anomalyProbability: nextProbability / 100 });

  return <Panel className="sim-controls" title="Stream controls" subtitle="Synthetic source configuration">
    <div className="control-row"><div><span>Event rate</span><strong>{rate} <small>events / sec</small></strong></div><input aria-label="Event rate" type="range" min="0" max="100" step="1" value={rate} onChange={event => { const next = Number(event.target.value); setRate(next); update(next, probability); }} /></div>
    <div className="control-row"><div><span>Anomaly injection</span><strong>{probability}<small>%</small></strong></div><input aria-label="Anomaly injection probability" type="range" min="0" max="100" step="1" value={probability} onChange={event => { const next = Number(event.target.value); setProbability(next); update(rate, next); }} /></div>
    <p className="control-note"><Radio size={13} /> {mutation.isPending ? "Applying stream parameters…" : "Configuration is applied to the live generator."}</p>
  </Panel>;
}

export function OverviewPage() {
  const { data, isLoading } = useSnapshot();
  const [selectedAnomaly, setSelectedAnomaly] = useState<any>(null);
  if (isLoading || !data) return <LoadingPanel />;
  const history = data.history;
  const healthLabel = data.metrics.health === "healthy" ? "Nominal" : "Degraded";
  return <div className="page-stack">
    <SectionHeading eyebrow="Live operations" title="Stream command center" description="A real-time operating view of telemetry throughput, anomaly pressure, and pipeline health." action={<div className="live-chip"><span /> Live stream <b>{data.metrics.eventsPerSecond} evt/s</b></div>} />
    <div className="metric-grid">
      <MetricCard label="Processing throughput" value={formatNumber(data.metrics.eventsPerSecond)} unit="evt/s" trend="live" tone="mint" points={history.map(item => item.eventsPerSecond)} footer={`${formatNumber(data.metrics.eventsProcessed)} total events processed`} />
      <MetricCard label="Anomaly rate" value={data.metrics.anomalyRate.toFixed(1)} unit="%" trend={data.metrics.anomaliesDetected ? `${data.metrics.anomaliesDetected} identified` : "steady"} tone="violet" points={history.map(item => item.anomalyRate)} footer="Rule and model evaluation stream" />
      <MetricCard label="End-to-end latency" value={data.metrics.latency.toFixed(1)} unit="ms" trend="P95 protected" tone="blue" points={history.map(item => item.latency)} footer="Across five processing stages" />
      <MetricCard label="System health" value={healthLabel} trend={`${data.metrics.consumerLag} lag`} tone="amber" points={history.map(item => item.eventsPerSecond)} footer={`${data.metrics.failureRate.toFixed(2)}% transient processing error rate`} />
    </div>
    <div className="overview-grid">
      <Panel className="throughput-panel" title="Throughput and anomaly pressure" subtitle="Rolling 20-second observation window" action={<span className="panel-live"><i /> updated every second</span>}>
        <div className="chart-summary"><div><span>Current rate</span><strong>{data.metrics.eventsPerSecond} <small>evt/s</small></strong></div><div><span>Peak latency</span><strong>{Math.max(...history.map(item => item.latency)).toFixed(1)} <small>ms</small></strong></div></div>
        <div className="bar-chart">{history.map((item, index) => <div key={index} className="chart-column"><span className="anomaly-bar" style={{ height: `${Math.max(3, item.anomalyRate * 4)}%` }} /><span className="throughput-bar" style={{ height: `${Math.max(12, Math.min(100, item.eventsPerSecond))}%` }} /></div>)}</div>
        <div className="chart-axis"><span>20 sec ago</span><span>now</span></div>
      </Panel>
      <SimulationControls config={data.config} />
    </div>
    <div className="overview-grid bottom-overview">
      <Panel className="anomaly-panel" title="Detected anomalies" subtitle="Newest rule and model detections" action={<a href="/anomalies" className="text-action">View all <ArrowUpRight size={14} /></a>}>
        <div className="anomaly-list">{data.recentAnomalies.length ? data.recentAnomalies.slice(0, 6).map(item => <button className="anomaly-row" key={item.id} onClick={() => setSelectedAnomaly(item)}><SeverityBadge severity={item.severity as Severity} /><div className="anomaly-copy"><strong>{item.sensor}</strong><span>{item.source}</span></div><div className="anomaly-value"><strong>{item.detectedValue}</strong><span>limit {item.threshold}</span></div><time>{timeAgo(item.timestamp)}</time></button>) : <EmptyState title="No anomalies yet" description="Increase the injection control to test the detection flow." />}</div>
      </Panel>
      <Panel className="operating-card" title="Operational posture" subtitle="System safeguards and dependencies">
        <div className="posture-item"><div className="posture-icon mint"><Check /></div><div><strong>Consumer group balanced</strong><span>3 partition assignments healthy</span></div><span className="posture-value">Stable</span></div>
        <div className="posture-item"><div className="posture-icon blue"><Database /></div><div><strong>Event persistence</strong><span>Idempotency checks enabled</span></div><span className="posture-value">Online</span></div>
        <div className="posture-item"><div className="posture-icon violet"><Bot /></div><div><strong>Detection model</strong><span>{data.models.find(model => model.stage === "production")?.version ?? "No production model"}</span></div><span className="posture-value">Active</span></div>
      </Panel>
    </div>
    <Dialog open={Boolean(selectedAnomaly)} onOpenChange={open => { if (!open) setSelectedAnomaly(null); }}>
      <DialogContent className="dark-dialog"><DialogHeader><DialogTitle>Anomaly detail</DialogTitle><DialogDescription>Detection context captured from the live event stream.</DialogDescription></DialogHeader>{selectedAnomaly && <div className="detail-grid"><div><span>Severity</span><SeverityBadge severity={selectedAnomaly.severity} /></div><div><span>Source</span><strong>{selectedAnomaly.source}</strong></div><div><span>Sensor</span><strong>{selectedAnomaly.sensor}</strong></div><div><span>Observed value</span><strong>{selectedAnomaly.detectedValue}</strong></div><div><span>Rule threshold</span><strong>{selectedAnomaly.threshold}</strong></div><div><span>Confidence score</span><strong>{(selectedAnomaly.score * 100).toFixed(1)}%</strong></div><div className="detail-wide"><span>Interpretation</span><p>{selectedAnomaly.message}</p></div></div>}</DialogContent>
    </Dialog>
  </div>;
}

export function AnomaliesPage() {
  const { data, isLoading } = useSnapshot();
  const [severity, setSeverity] = useState<"all" | Severity>("all");
  const [selected, setSelected] = useState<any>(null);
  if (isLoading || !data) return <LoadingPanel />;
  const anomalies = severity === "all" ? data.recentAnomalies : data.recentAnomalies.filter(item => item.severity === severity);
  return <div className="page-stack"><SectionHeading eyebrow="Detection intelligence" title="Anomaly log" description="Investigate every alert raised by live rule evaluation and anomaly scoring." action={<div className="filter-tabs">{(["all", "critical", "warning", "info"] as const).map(level => <button className={cn({ active: severity === level })} key={level} onClick={() => setSeverity(level)}>{level}</button>)}</div>} /><Panel title="Detection feed" subtitle={`${anomalies.length} recent records in this live session`}><div className="anomaly-feed">{anomalies.map(item => <button key={item.id} className="feed-row" onClick={() => setSelected(item)}><SeverityBadge severity={item.severity as Severity} /><div><strong>{item.sensor} threshold breach</strong><span>{item.source} · event {item.eventId.slice(-8)}</span></div><div className="feed-measure"><strong>{item.detectedValue}</strong><span>threshold {item.threshold}</span></div><div className="feed-score"><strong>{(item.score * 100).toFixed(1)}%</strong><span>confidence</span></div><time>{formatTime(item.timestamp)}</time><ChevronRight size={16} /></button>)}{!anomalies.length && <EmptyState title="No matching anomaly records" description="Adjust the filter or increase anomaly injection." />}</div></Panel><Dialog open={Boolean(selected)} onOpenChange={open => !open && setSelected(null)}><DialogContent className="dark-dialog"><DialogHeader><DialogTitle>Detection record</DialogTitle><DialogDescription>Rule-based event evaluation result.</DialogDescription></DialogHeader>{selected && <div className="detail-grid"><div><span>Source</span><strong>{selected.source}</strong></div><div><span>Severity</span><SeverityBadge severity={selected.severity} /></div><div><span>Sensor</span><strong>{selected.sensor}</strong></div><div><span>Observed</span><strong>{selected.detectedValue}</strong></div><div><span>Threshold</span><strong>{selected.threshold}</strong></div><div><span>Timestamp</span><strong>{formatTime(selected.timestamp)}</strong></div><div className="detail-wide"><span>Message</span><p>{selected.message}</p></div></div>}</DialogContent></Dialog></div>;
}

export function TopologyPage() {
  const { data, isLoading } = useSnapshot();
  if (isLoading || !data) return <LoadingPanel />;
  const edge = (id: string) => data.topology.edges.find(item => item.id === id)?.label ?? "0 msg/s";
  return <div className="page-stack"><SectionHeading eyebrow="Kafka architecture" title="Topology map" description="Producer, topics, consumer group, and persistence relationships with live edge throughput." action={<div className="live-chip"><span /> Consumer group balanced</div>} /><Panel className="topology-panel" title="Industrial telemetry pipeline" subtitle="Partition-aware flow from field signals to durable event records"><div className="topology-canvas"><svg className="topology-lines" viewBox="0 0 1000 560" preserveAspectRatio="none"><path d="M162 280 C245 280, 255 142, 342 142"/><path d="M162 280 C245 280, 255 412, 342 412"/><path d="M485 142 C564 142, 579 180, 650 180"/><path d="M485 412 C564 412, 579 350, 650 350"/><path d="M795 180 C860 180, 870 210, 925 210"/><path d="M795 350 C860 350, 870 330, 925 330"/></svg><div className="topology-node producer-node"><Radio /><strong>Telemetry producer</strong><span>synthetic industrial sources</span><b>{edge("producer-telemetry")}</b></div><div className="edge-label edge-label-one">{edge("producer-telemetry")}</div><div className="topology-node topic-node telemetry-topic"><Layers3 /><strong>industrial.telemetry</strong><span>3 partitions</span><b>retention 7d</b></div><div className="topology-node topic-node anomalies-topic"><AlertTriangle /><strong>industrial.anomalies</strong><span>3 partitions</span><b>{edge("detectors-anomalies")}</b></div><div className="topology-node consumer-node"><GitBranch /><strong>anomaly-detectors</strong><span>consumer group · 3 workers</span><b>{edge("telemetry-detectors")}</b></div><div className="topology-node sink-node"><Database /><strong>Operational store</strong><span>events · anomalies · rules</span><b>{edge("detectors-sink")}</b></div><div className="topology-node dead-letter"><X /><strong>industrial.dead-letter</strong><span>1 partition · retry exhausted</span><b>0 msg/s</b></div></div></Panel><div className="stats-inline-grid"><Panel><span className="label">Topic partitions</span><strong className="inline-stat">7</strong><span>Across telemetry, anomaly, and DLQ topics</span></Panel><Panel><span className="label">Consumer lag</span><strong className="inline-stat">{data.metrics.consumerLag}</strong><span>{data.metrics.health === "healthy" ? "Within the operating target" : "Pause detected; draining is deferred"}</span></Panel><Panel><span className="label">Processing strategy</span><strong className="inline-stat text-stat">At-least-once</strong><span>Idempotent event handling protects persistence</span></Panel></div></div>;
}

export function PipelinePage() {
  const { data, isLoading } = useSnapshot();
  const utils = trpc.useUtils();
  const toggle = trpc.platform.toggleStage.useMutation({ onSuccess: () => utils.platform.snapshot.invalidate() });
  if (isLoading || !data) return <LoadingPanel />;
  return <div className="page-stack"><SectionHeading eyebrow="Runtime orchestration" title="Processing pipeline" description="Inspect latency, failure signals, and operational control for every processing stage." /><div className="pipeline-stack">{data.pipeline.map((item, index) => <Panel key={item.stage} className={cn("stage-panel", { paused: item.paused })}><div className="stage-order">0{index + 1}</div><div className="stage-main"><div className="stage-title"><CircleGauge /><div><h2>{item.stage}</h2><p>{item.paused ? "Worker suspended; events remain queued" : "Workers processing continuously"}</p></div></div><div className="stage-metrics"><div><span>Latency</span><strong>{item.latency}<small>ms</small></strong></div><div><span>Error rate</span><strong>{item.errorRate.toFixed(2)}<small>%</small></strong></div></div></div><Histogram values={item.histogram} /><Button variant="outline" className="stage-toggle" onClick={() => toggle.mutate({ stage: item.stage })}>{item.paused ? <><Play size={14} /> Resume</> : <><Pause size={14} /> Pause</>}</Button></Panel>)}</div><Panel className="pipeline-footnote"><div className="footnote-icon"><ServerCog /></div><div><strong>Commit acknowledgement policy</strong><p>Offsets are committed after validation, anomaly evaluation, and persistence succeed. The view reflects live work-stage state from the in-process simulation engine.</p></div></Panel></div>;
}

export function ModelsPage() {
  const { data, isLoading } = useSnapshot();
  const utils = trpc.useUtils();
  const updateModel = trpc.platform.models.useMutation({ onSuccess: () => utils.platform.snapshot.invalidate() });
  if (isLoading || !data) return <LoadingPanel />;
  return <div className="page-stack"><SectionHeading eyebrow="Machine learning operations" title="Model registry" description="Manage deployed anomaly detectors, validation quality, and production promotion." action={<Button className="primary-button"><Plus size={15} /> Register model</Button>} /><Panel title="Deployed model inventory" subtitle="Isolation forest generations available to the detection stage"><div className="model-table"><div className="table-head"><span>Model version</span><span>Accuracy</span><span>Last trained</span><span>Lifecycle</span><span>Enabled</span><span /></div>{data.models.map(model => <div className="table-row" key={model.id}><div className="model-name"><div className="model-icon"><Bot size={16} /></div><div><strong>{model.version}</strong><span>Isolation Forest · 5 feature inputs</span></div></div><div className="accuracy"><strong>{(model.accuracy * 100).toFixed(1)}%</strong><span>validation score</span></div><div><strong>{timeAgo(model.lastTrained)}</strong></div><div><span className={cn("lifecycle-pill", `lifecycle-${model.stage}`)}>{model.stage}</span></div><div><Switch checked={model.active} onCheckedChange={checked => updateModel.mutate({ id: model.id, active: checked })} /></div><div className="model-actions">{model.stage !== "production" && <Button variant="outline" size="sm" onClick={() => updateModel.mutate({ id: model.id, promote: true })}>Promote</Button>}</div></div>)}</div></Panel><div className="stats-inline-grid"><Panel><span className="label">Feature vector</span><strong className="inline-stat text-stat">5 signals</strong><span>Temperature, pressure, vibration, humidity, power</span></Panel><Panel><span className="label">Active production model</span><strong className="inline-stat text-stat">{data.models.find(model => model.stage === "production")?.version}</strong><span>Rule evaluation remains active independently</span></Panel><Panel><span className="label">Model evaluation</span><strong className="inline-stat">Continuous</strong><span>Anomaly score retained for every match</span></Panel></div></div>;
}

export function EventsPage() {
  const { data: snapshot, isLoading: snapshotLoading } = useSnapshot();
  const [page, setPage] = useState(1);
  const [source, setSource] = useState("all");
  const [severity, setSeverity] = useState("all");
  const eventsQuery = trpc.platform.events.useQuery({ page, pageSize: 9, source: source === "all" ? undefined : source, severity: severity === "all" ? undefined : severity as Severity }, { refetchInterval: REFRESH_INTERVAL });
  const [selected, setSelected] = useState<any>(null);
  useEffect(() => setPage(1), [source, severity]);
  if (snapshotLoading || !snapshot || !eventsQuery.data) return <LoadingPanel />;
  const pageCount = Math.max(1, Math.ceil(eventsQuery.data.total / 9));
  return <div className="page-stack"><SectionHeading eyebrow="Traceable runtime data" title="Event explorer" description="Search raw telemetry records flowing through the processing pipeline." action={<div className="event-filter-row"><Select value={source} onValueChange={setSource}><SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger><SelectContent><SelectItem value="all">All sources</SelectItem>{snapshot.sources.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><Select value={severity} onValueChange={setSeverity}><SelectTrigger><SelectValue placeholder="Severity" /></SelectTrigger><SelectContent><SelectItem value="all">All states</SelectItem><SelectItem value="critical">Critical</SelectItem><SelectItem value="warning">Warning</SelectItem><SelectItem value="info">Info</SelectItem></SelectContent></Select></div>} /><Panel className="events-table-panel"><div className="events-table"><div className="event-table-head"><span>Event ID</span><span>Source</span><span>Payload preview</span><span>Processing status</span><span>Timestamp</span><span /></div>{eventsQuery.data.items.map(event => <button className="event-table-row" key={event.id} onClick={() => setSelected(event)}><code>{event.id.slice(-12)}</code><span>{event.source}</span><span className="payload-preview">temp {event.payload.temperature}° · pressure {event.payload.pressure} · vib {event.payload.vibration}</span><span>{event.severity ? <SeverityBadge severity={event.severity as Severity} /> : <span className={cn("status-chip", `status-${event.status}`)}>{event.status}</span>}</span><time>{formatTime(event.timestamp)}</time><ChevronRight size={16} /></button>)}{!eventsQuery.data.items.length && <EmptyState title="No matching events" description="Change the active filters to recover the event stream." />}</div><div className="pagination"><span>{eventsQuery.data.total} events matched</span><div><Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(current => current - 1)}><ChevronLeft size={15} /></Button><span>Page {page} / {pageCount}</span><Button variant="outline" size="icon" disabled={page >= pageCount} onClick={() => setPage(current => current + 1)}><ChevronRight size={15} /></Button></div></div></Panel><Dialog open={Boolean(selected)} onOpenChange={open => !open && setSelected(null)}><DialogContent className="dark-dialog"><DialogHeader><DialogTitle>Raw event record</DialogTitle><DialogDescription>Validated industrial telemetry presented in JSON-compatible fields.</DialogDescription></DialogHeader>{selected && <div className="event-detail"><div><span>Event identifier</span><code>{selected.id}</code></div><div><span>Source</span><strong>{selected.source}</strong></div><div><span>Stream topic</span><strong>{selected.type}</strong></div><div><span>Processing status</span><strong>{selected.status}</strong></div><pre>{JSON.stringify(selected.payload, null, 2)}</pre></div>}</DialogContent></Dialog></div>;
}

type RuleDraft = { name: string; source: string; field: "temperature" | "pressure" | "vibration" | "power"; operator: ">" | ">=" | "<" | "<="; value: string; severity: Severity; enabled: boolean };
const blankDraft: RuleDraft = { name: "", source: "Any source", field: "temperature", operator: ">", value: "90", severity: "warning", enabled: true };

export function AlertsPage() {
  const { data, isLoading } = useSnapshot();
  const utils = trpc.useUtils();
  const create = trpc.platform.createAlertRule.useMutation({ onSuccess: () => utils.platform.snapshot.invalidate() });
  const update = trpc.platform.updateAlertRule.useMutation({ onSuccess: () => utils.platform.snapshot.invalidate() });
  const remove = trpc.platform.deleteAlertRule.useMutation({ onSuccess: () => utils.platform.snapshot.invalidate() });
  const [draft, setDraft] = useState<RuleDraft>(blankDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  if (isLoading || !data) return <LoadingPanel />;
  const submit = (event: FormEvent) => { event.preventDefault(); const payload = { ...draft, value: Number(draft.value) }; if (editingId) { update.mutate({ id: editingId, patch: payload }); } else { create.mutate(payload); } setEditingId(null); setDraft(blankDraft); };
  const startEdit = (rule: any) => { setEditingId(rule.id); setDraft({ name: rule.name, source: rule.source, field: rule.field, operator: rule.operator, value: String(rule.value), severity: rule.severity, enabled: rule.enabled }); };
  return <div className="page-stack"><SectionHeading eyebrow="Safety controls" title="Alert rules" description="Create and tune threshold evaluation logic used by the live detection stream." /><div className="alert-layout"><Panel className="rule-form-panel" title={editingId ? "Edit alert rule" : "Create alert rule"} subtitle="Rules are evaluated against every generated event"><form className="rule-form" onSubmit={submit}><div className="form-wide"><Label htmlFor="rule-name">Rule name</Label><Input id="rule-name" value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Motor heat advisory" required /></div><div><Label>Signal field</Label><Select value={draft.field} onValueChange={(field: RuleDraft["field"]) => setDraft({ ...draft, field })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="temperature">Temperature</SelectItem><SelectItem value="pressure">Pressure</SelectItem><SelectItem value="vibration">Vibration</SelectItem><SelectItem value="power">Power</SelectItem></SelectContent></Select></div><div><Label>Operator</Label><Select value={draft.operator} onValueChange={(operator: RuleDraft["operator"]) => setDraft({ ...draft, operator })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value=">">Greater than</SelectItem><SelectItem value=">=">Greater or equal</SelectItem><SelectItem value="<">Less than</SelectItem><SelectItem value="<=">Less or equal</SelectItem></SelectContent></Select></div><div><Label htmlFor="rule-value">Threshold</Label><Input id="rule-value" type="number" value={draft.value} onChange={event => setDraft({ ...draft, value: event.target.value })} required /></div><div><Label>Severity</Label><Select value={draft.severity} onValueChange={(severity: Severity) => setDraft({ ...draft, severity })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="critical">Critical</SelectItem><SelectItem value="warning">Warning</SelectItem><SelectItem value="info">Info</SelectItem></SelectContent></Select></div><div className="form-wide enabled-row"><div><strong>Rule enabled</strong><span>Begin evaluation immediately</span></div><Switch checked={draft.enabled} onCheckedChange={enabled => setDraft({ ...draft, enabled })} /></div><div className="form-actions">{editingId && <Button type="button" variant="outline" onClick={() => { setEditingId(null); setDraft(blankDraft); }}>Cancel</Button>}<Button type="submit" className="primary-button"><Save size={15} /> {editingId ? "Save changes" : "Create rule"}</Button></div></form></Panel><Panel className="rule-list-panel" title="Active rule set" subtitle={`${data.alertRules.filter(rule => rule.enabled).length} of ${data.alertRules.length} rules running`}><div className="rule-list">{data.alertRules.map(rule => <div className="rule-row" key={rule.id}><div className="rule-title"><SeverityBadge severity={rule.severity as Severity} /><div><strong>{rule.name}</strong><span>{rule.field} {rule.operator} {rule.value} · {rule.source}</span></div></div><div className="rule-trigger"><span>Last triggered</span><strong>{timeAgo(rule.lastTriggeredAt)}</strong></div><Switch checked={rule.enabled} onCheckedChange={enabled => update.mutate({ id: rule.id, patch: { enabled } })} /><Button variant="ghost" size="icon" onClick={() => startEdit(rule)} aria-label={`Edit ${rule.name}`}><SlidersHorizontal size={15} /></Button><Button variant="ghost" size="icon" className="delete-action" onClick={() => remove.mutate({ id: rule.id })} aria-label={`Delete ${rule.name}`}><Trash2 size={15} /></Button></div>)}</div></Panel></div></div>;
}
