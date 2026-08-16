import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("platform procedures", () => {
  it("returns a live platform snapshot with the required five-stage pipeline", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const snapshot = await caller.platform.snapshot();

    expect(snapshot.pipeline.map(item => item.stage)).toEqual([
      "Ingest", "Enrich", "Detect", "Route", "Sink",
    ]);
    expect(snapshot.config.eventRate).toBeGreaterThanOrEqual(0);
    expect(snapshot.config.anomalyProbability).toBeGreaterThanOrEqual(0);
  });

  it("rejects malformed alert-rule payloads before they reach the engine", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(caller.platform.createAlertRule({
      name: "Not valid",
      source: "Any source",
      field: "temperature",
      operator: ">",
      value: 100,
      severity: "invalid" as never,
      enabled: true,
    })).rejects.toThrow();
  });
});
