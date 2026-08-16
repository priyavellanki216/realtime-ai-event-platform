import { describe, expect, it } from "vitest";
import { EventStreamEngine, PIPELINE_STAGES, SEVERITIES } from "./eventEngine";

describe("event stream engine", () => {
  it("produces telemetry and detects injected anomalies with the supported severities", () => {
    const engine = new EventStreamEngine();
    engine.updateConfig({ eventRate: 8, anomalyProbability: 1 });
    engine.tick();
    const snapshot = engine.snapshot();

    expect(snapshot.metrics.eventsProcessed).toBe(8);
    expect(snapshot.recentAnomalies.length).toBeGreaterThan(0);
    expect(snapshot.recentAnomalies.every(item => SEVERITIES.includes(item.severity))).toBe(true);
  });

  it("keeps the processing stages in the required operational order", () => {
    const engine = new EventStreamEngine();
    const snapshot = engine.snapshot();
    expect(snapshot.pipeline.map(item => item.stage)).toEqual([...PIPELINE_STAGES]);
  });

  it("creates, edits, and removes alert rules", () => {
    const engine = new EventStreamEngine();
    const created = engine.createRule({
      name: "Test power rule",
      source: "Any source",
      field: "power",
      operator: ">",
      value: 200,
      severity: "warning",
      enabled: true,
    });
    const updated = engine.updateRule(created.id, { enabled: false, value: 210 });

    expect(updated.enabled).toBe(false);
    expect(updated.value).toBe(210);
    expect(engine.deleteRule(created.id)).toBe(true);
  });
});
