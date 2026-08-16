import { z } from "zod";

export const partySchema = z.object({
  title: z.string().trim().max(80).optional().default(""),
  encounters: z.array(z.string().uuid()).min(1).max(5),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().nullable().optional(),
  difficultyStage: z.number().int().min(1).max(99),
  isPractice: z.boolean(),
  practiceEncounterId: z.string().uuid().nullable().optional(),
  needPhysical: z.number().int().min(0).max(8),
  needMagical: z.number().int().min(0).max(8),
  needSupport: z.number().int().min(0).max(8)
}).superRefine((v, ctx) => {
  if (v.endTime && new Date(v.endTime) <= new Date(v.startTime)) ctx.addIssue({ code: "custom", message: "End time must be after start time", path: ["endTime"] });
  if (v.isPractice && !v.practiceEncounterId) ctx.addIssue({ code: "custom", message: "Choose a practice encounter", path: ["practiceEncounterId"] });
  if (v.practiceEncounterId && !v.encounters.includes(v.practiceEncounterId)) ctx.addIssue({ code: "custom", message: "Practice encounter must be part of the run", path: ["practiceEncounterId"] });
});

export const availabilitySchema = z.object({
  encounters: z.array(z.string().uuid()).min(1).max(5),
  characterIds: z.array(z.string().uuid()).min(1).max(30),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  minDifficulty: z.number().int().min(1).max(99),
  maxDifficulty: z.number().int().min(1).max(99),
  practiceOk: z.boolean(),
  notes: z.string().trim().max(250).optional().default("")
}).superRefine((v, ctx) => {
  if (new Date(v.endTime) <= new Date(v.startTime)) ctx.addIssue({ code: "custom", message: "Availability end must be after start", path: ["endTime"] });
  if (v.maxDifficulty < v.minDifficulty) ctx.addIssue({ code: "custom", message: "Maximum difficulty must be at least the minimum", path: ["maxDifficulty"] });
});

export const characterSchema = z.object({ classId: z.string().uuid(), characterName: z.string().trim().min(2).max(32) });
