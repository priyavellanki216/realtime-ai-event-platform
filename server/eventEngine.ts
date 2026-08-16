export const SEVERITIES = ["critical", "warning", "info"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const PIPELINE_STAGES = ["Ingest", "Enrich", "Detect", "Route", "Sink"] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export type AlertOperator = ">" | ">=" | "<" | "<=";

export type TelemetryEvent = {
  id: string;
  source: string;
  type: "industrial.telemetry";
  payload: {
    temperature: number;
    pressure: number;
    vibration: number;
    power: number;
  };
  status: "processed" | "anomaly" | "queued";
  severity?: Severity;
  timestamp: number;
};

export type AnomalyRecord = {
  id: string;
  eventId: string;
  severity: Severity;
  source: string;
  sensor: string;
  detectedValue: number;
  threshold: number;
  timestamp: number;
  score: number;
  message: string;
};

export type AlertRule = {
  id: string;
  name: string;
  source: string;
  field: "temperature" | "pressure" | "vibration" | "power";
  operator: AlertOperator;
  value: number;
  severity: Severity;
  enabled: boolean;
  lastTriggeredAt: number | null;
};

type PipelineState = Record<
  PipelineStage,
  { paused: boolean; baseLatency: number; errorRate: number }
>;

const sources = ["Plant A / Press 07", "Plant A / Forge 02", "Plant B / Turbine 11", "Plant C / Mixer 04"];

const fieldUnits = {
  temperature: "°C",
  pressure: "bar",
  vibration: "mm/s",
  power: "kW",
} as const;

const defaultRules: AlertRule[] = [
  { id: "rule-temp-critical", name: "Critical temperature", source: "Any source", field: "temperature", operator: ">", value: 104, severity: "critical", enabled: true, lastTriggeredAt: null },
  { id: "rule-temp-warning", name: "Elevated temperature", source: "Any source", field: "temperature", operator: ">", value: 88, severity: "warning", enabled: true, lastTriggeredAt: null },
  { id: "rule-vibration", name: "Vibration envelope", source: "Any source", field: "vibration", operator: ">", value: 11.5, severity: "critical", enabled: true, lastTriggeredAt: null },
  { id: "rule-pressure", name: "Pressure floor", source: "Any source", field: "pressure", operator: "<", value: 4.2, severity: "info", enabled: true, lastTriggeredAt: null },
  { id: "rule-power", name: "Power draw advisory", source: "Any source", field: "power", operator: ">", value: 186, severity: "warning", enabled: true, lastTriggeredAt: null },
];

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function matchesRule(value: number, operator: AlertOperator, threshold: number) {
  if (operator === ">") return value > threshold;
  if (operator === ">=") return value >= threshold;
  if (operator === "<") return value < threshold;
  return value <= threshold;
}

function maxSeverity(records: AnomalyRecord[]): Severity {
  if (records.some(record => record.severity === "critical")) return "critical";
  if (records.some(record => record.severity === "warning")) return "warning";
  return "info";
}

export class EventStreamEngine {
  private timer: NodeJS.Timeout | undefined;
  private events: TelemetryEvent[] = [];
  private anomalies: AnomalyRecord[] = [];
  private rules = defaultRules.map(rule => ({ ...rule }));
  private config = { eventRate: 32, anomalyProbability: 0.14 };
  private metrics = {
    eventsProcessed: 0,
    anomaliesDetected: 0,
    eventsFailed: 0,
    latency: 37,
  };
  private throughputHistory = Array.from({ length: 20 }, (_, index) => ({
    label: index - 19,
    eventsPerSecond: 0,
    anomalyRate: 0,
    latency: 37,
  }));
  private pipeline: PipelineState = {
    Ingest: { paused: false, baseLatency: 8, errorRate: 0.02 },
    Enrich: { paused: false, baseLatency: 15, errorRate: 0.04 },
    Detect: { paused: false, baseLatency: 26, errorRate: 0.06 },
    Route: { paused: false, baseLatency: 11, errorRate: 0.01 },
    Sink: { paused: false, baseLatency: 17, errorRate: 0.03 },
  };
  private models = [
    { id: "model-2026-04", version: "iforest-2.4.1", accuracy: 0.964, lastTrained: Date.now() - 1000 * 60 * 42, active: true, stage: "production" as const },
    { id: "model-2026-03", version: "iforest-2.4.0", accuracy: 0.951, lastTrained: Date.now() - 1000 * 60 * 60 * 28, active: true, stage: "staged" as const },
    { id: "model-2026-02", version: "iforest-2.3.7", accuracy: 0.934, lastTrained: Date.now() - 1000 * 60 * 60 * 24 * 8, active: false, stage: "retired" as const },
  ];

  start() {
    if (this.timer) return;
    this.seed();
    this.timer = setInterval(() => this.tick(), 1000);
  }

  private seed() {
    if (this.events.length > 0) return;
    for (let index = 0; index < 24; index += 1) this.createEvent(Date.now() - (24 - index) * 1000);
    this.recordMetrics(24);
  }

  tick() {
    const count = Math.max(0, Math.round(this.config.eventRate));
    for (let index = 0; index < count; index += 1) this.createEvent(Date.now());
    this.recordMetrics(count);
  }

  private createEvent(timestamp: number) {
    const source = sources[Math.floor(Math.random() * sources.length)];
    const payload = {
      temperature: Number(randomBetween(63, 82).toFixed(1)),
      pressure: Number(randomBetween(5.3, 6.8).toFixed(2)),
      vibration: Number(randomBetween(2.4, 7.2).toFixed(1)),
      power: Number(randomBetween(102, 158).toFixed(1)),
    };

    if (Math.random() < this.config.anomalyProbability) {
      const injected = ["temperature", "pressure", "vibration", "power"] as const;
      const field = injected[Math.floor(Math.random() * injected.length)];
      if (field === "temperature") payload.temperature = Number(randomBetween(91, 119).toFixed(1));
      if (field === "pressure") payload.pressure = Number(randomBetween(2.7, 4.0).toFixed(2));
      if (field === "vibration") payload.vibration = Number(randomBetween(11.8, 18).toFixed(1));
      if (field === "power") payload.power = Number(randomBetween(187, 245).toFixed(1));
    }

    const event: TelemetryEvent = {
      id: `evt_${timestamp.toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      source,
      type: "industrial.telemetry",
      payload,
      status: this.anyStagePaused() ? "queued" : "processed",
      timestamp,
    };

    const detections = this.evaluate(event);
    if (detections.length) {
      event.status = "anomaly";
      event.severity = maxSeverity(detections);
      this.anomalies.unshift(...detections);
      this.metrics.anomaliesDetected += detections.length;
    }

    this.events.unshift(event);
    this.events = this.events.slice(0, 500);
    this.anomalies = this.anomalies.slice(0, 150);
    this.metrics.eventsProcessed += 1;
  }

  private evaluate(event: TelemetryEvent) {
    const detections: AnomalyRecord[] = [];
    for (const rule of this.rules) {
      if (!rule.enabled || (rule.source !== "Any source" && rule.source !== event.source)) continue;
      const value = event.payload[rule.field];
      if (!matchesRule(value, rule.operator, rule.value)) continue;
      rule.lastTriggeredAt = event.timestamp;
      detections.push({
        id: `an_${event.id}_${rule.id}`,
        eventId: event.id,
        severity: rule.severity,
        source: event.source,
        sensor: rule.field,
        detectedValue: value,
        threshold: rule.value,
        timestamp: event.timestamp,
        score: Number(Math.min(0.998, 0.64 + Math.abs(value - rule.value) / Math.max(1, rule.value)).toFixed(3)),
        message: `${rule.name}: ${value}${fieldUnits[rule.field]} crossed ${rule.operator} ${rule.value}${fieldUnits[rule.field]}.`,
      });
    }
    return detections;
  }

  private recordMetrics(eventsThisTick: number) {
    const stageLatency = PIPELINE_STAGES.reduce((sum, stage) => sum + this.pipeline[stage].baseLatency, 0);
    this.metrics.latency = Number((stageLatency + randomBetween(-4, 7)).toFixed(1));
    const anomaliesThisTick = this.events.slice(0, eventsThisTick).filter(event => event.status === "anomaly").length;
    this.throughputHistory = [...this.throughputHistory.slice(1), {
      label: Date.now(),
      eventsPerSecond: eventsThisTick,
      anomalyRate: eventsThisTick ? Number(((anomaliesThisTick / eventsThisTick) * 100).toFixed(1)) : 0,
      latency: this.metrics.latency,
    }];
  }

  private anyStagePaused() {
    return PIPELINE_STAGES.some(stage => this.pipeline[stage].paused);
  }

  updateConfig(config: Partial<typeof this.config>) {
    if (typeof config.eventRate === "number") this.config.eventRate = Math.max(0, Math.min(200, config.eventRate));
    if (typeof config.anomalyProbability === "number") this.config.anomalyProbability = Math.max(0, Math.min(1, config.anomalyProbability));
    return this.config;
  }

  toggleStage(stage: PipelineStage) {
    this.pipeline[stage].paused = !this.pipeline[stage].paused;
    return this.pipeline[stage];
  }

  listEvents(input: { page: number; pageSize: number; source?: string; severity?: Severity }) {
    const filtered = this.events.filter(event =>
      (!input.source || input.source === "all" || event.source === input.source) &&
      (!input.severity || event.severity === input.severity),
    );
    const start = (input.page - 1) * input.pageSize;
    return { items: filtered.slice(start, start + input.pageSize), total: filtered.length };
  }

  getEvent(id: string) {
    return this.events.find(event => event.id === id) ?? null;
  }

  getAnomaly(id: string) {
    return this.anomalies.find(anomaly => anomaly.id === id) ?? null;
  }

  createRule(rule: Omit<AlertRule, "id" | "lastTriggeredAt">) {
    const created: AlertRule = { ...rule, id: `rule_${Date.now().toString(36)}`, lastTriggeredAt: null };
    this.rules.unshift(created);
    return created;
  }

  updateRule(id: string, patch: Partial<Omit<AlertRule, "id">>) {
    const rule = this.rules.find(item => item.id === id);
    if (!rule) throw new Error("Alert rule not found");
    Object.assign(rule, patch);
    return rule;
  }

  deleteRule(id: string) {
    const before = this.rules.length;
    this.rules = this.rules.filter(rule => rule.id !== id);
    return before !== this.rules.length;
  }

  updateModel(id: string, patch: { active?: boolean; promote?: boolean }) {
    const model = this.models.find(item => item.id === id);
    if (!model) throw new Error("Model not found");
    if (typeof patch.active === "boolean") model.active = patch.active;
    if (patch.promote) {
      this.models = this.models.map(item => ({ ...item, stage: item.id === id ? "production" : item.stage === "production" ? "staged" : item.stage }));
    }
    return this.models.find(item => item.id === id)!;
  }

  snapshot() {
    const latest = this.throughputHistory[this.throughputHistory.length - 1];
    const errorRate = Number((PIPELINE_STAGES.reduce((total, stage) => total + this.pipeline[stage].errorRate, 0) / PIPELINE_STAGES.length).toFixed(2));
    return {
      config: this.config,
      sources,
      metrics: {
        ...this.metrics,
        eventsPerSecond: latest.eventsPerSecond,
        anomalyRate: latest.anomalyRate,
        failureRate: errorRate,
        consumerLag: this.anyStagePaused() ? Math.round(this.config.eventRate * 3.2) : Math.round(randomBetween(1, 11)),
        health: this.anyStagePaused() ? "degraded" : "healthy",
      },
      history: this.throughputHistory,
      recentAnomalies: this.anomalies.slice(0, 12),
      pipeline: PIPELINE_STAGES.map(stage => ({
        stage,
        paused: this.pipeline[stage].paused,
        latency: Number((this.pipeline[stage].baseLatency + randomBetween(-2.5, 4)).toFixed(1)),
        errorRate: this.pipeline[stage].errorRate,
        histogram: Array.from({ length: 14 }, () => Math.round(randomBetween(12, 96))),
      })),
      topology: {
        edges: [
          { id: "producer-telemetry", label: `${latest.eventsPerSecond} msg/s` },
          { id: "telemetry-detectors", label: `${Math.max(0, latest.eventsPerSecond - Math.round(latest.eventsPerSecond * 0.08))} msg/s` },
          { id: "detectors-anomalies", label: `${Math.round(latest.eventsPerSecond * (latest.anomalyRate / 100))} msg/s` },
          { id: "detectors-sink", label: `${latest.eventsPerSecond} writes/s` },
        ],
      },
      models: this.models,
      alertRules: this.rules,
    };
  }
}

export const eventEngine = new EventStreamEngine();
