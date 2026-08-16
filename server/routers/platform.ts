import { z } from "zod";
import { eventEngine, PIPELINE_STAGES, SEVERITIES } from "../eventEngine";
import { publicProcedure, router } from "../_core/trpc";

const severitySchema = z.enum(SEVERITIES);
const stageSchema = z.enum(PIPELINE_STAGES);
const sourceSchema = z.string().min(1).max(80);
const alertRuleSchema = z.object({
  name: z.string().min(2).max(80),
  source: sourceSchema,
  field: z.enum(["temperature", "pressure", "vibration", "power"]),
  operator: z.enum([">", ">=", "<", "<="]),
  value: z.number().finite(),
  severity: severitySchema,
  enabled: z.boolean(),
});

export const platformRouter = router({
  snapshot: publicProcedure.query(() => {
    eventEngine.start();
    return eventEngine.snapshot();
  }),
  configureSimulation: publicProcedure
    .input(z.object({ eventRate: z.number().min(0).max(200).optional(), anomalyProbability: z.number().min(0).max(1).optional() }))
    .mutation(({ input }) => eventEngine.updateConfig(input)),
  events: publicProcedure
    .input(z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(5).max(50).default(10), source: z.string().optional(), severity: severitySchema.optional() }))
    .query(({ input }) => {
      eventEngine.start();
      return eventEngine.listEvents(input);
    }),
  event: publicProcedure.input(z.object({ id: z.string().min(1) })).query(({ input }) => eventEngine.getEvent(input.id)),
  anomaly: publicProcedure.input(z.object({ id: z.string().min(1) })).query(({ input }) => eventEngine.getAnomaly(input.id)),
  toggleStage: publicProcedure.input(z.object({ stage: stageSchema })).mutation(({ input }) => eventEngine.toggleStage(input.stage)),
  models: publicProcedure.input(z.object({ id: z.string().min(1), active: z.boolean().optional(), promote: z.boolean().optional() })).mutation(({ input }) => eventEngine.updateModel(input.id, input)),
  createAlertRule: publicProcedure.input(alertRuleSchema).mutation(({ input }) => eventEngine.createRule(input)),
  updateAlertRule: publicProcedure.input(z.object({ id: z.string().min(1), patch: alertRuleSchema.partial() })).mutation(({ input }) => eventEngine.updateRule(input.id, input.patch)),
  deleteAlertRule: publicProcedure.input(z.object({ id: z.string().min(1) })).mutation(({ input }) => ({ success: eventEngine.deleteRule(input.id) })),
});
