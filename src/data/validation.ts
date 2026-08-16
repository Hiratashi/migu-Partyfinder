import { z } from "zod";

export const partySchema = z.object({
  title: z.string().trim().max(80).optional().default(""),
  encounters: z.array(z.string().uuid()).min(1).max(20),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().nullable().optional(),
  difficultyStage: z.number().int().min(1).max(3),
  isPractice: z.boolean(),
  practiceEncounterIds: z.array(z.string().uuid()).max(20).default([]),
  needPhysical: z.number().int().min(0).max(12),
  needMagical: z.number().int().min(0).max(12),
  needSupport: z.number().int().min(0).max(12)
}).superRefine((v, ctx) => {
  if (v.endTime && new Date(v.endTime) <= new Date(v.startTime)) ctx.addIssue({ code: "custom", message: "End time must be after start time", path: ["endTime"] });
  if (v.isPractice && v.practiceEncounterIds.length === 0) ctx.addIssue({ code: "custom", message: "Choose at least one fight to practice", path: ["practiceEncounterIds"] });
  if (v.practiceEncounterIds.some(id => !v.encounters.includes(id))) ctx.addIssue({ code: "custom", message: "Practice fights must be part of the selected run", path: ["practiceEncounterIds"] });
});

const weeklySlotSchema = z.object({
  day: z.number().int().min(0).max(6),
  minute: z.number().int().min(0).max(1410).refine(v => v % 30 === 0, "Time slots must use 30-minute increments")
});

export const weeklyAvailabilitySchema = z.object({
  encounters: z.array(z.string().uuid()).min(1).max(20),
  characterIds: z.array(z.string().uuid()).min(1).max(30),
  stages: z.array(z.number().int().min(1).max(3)).min(1).max(3).transform(v => [...new Set(v)].sort()),
  practiceOk: z.boolean(),
  timezone: z.string().trim().min(1).max(100),
  slots: z.array(weeklySlotSchema).max(336),
  notes: z.string().trim().max(250).optional().default("")
});

export const characterSchema = z.object({ classId: z.string().uuid(), characterName: z.string().trim().min(2).max(32) });
