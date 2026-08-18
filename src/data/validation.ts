import { z } from "zod";

export const partySchema = z.object({
  title: z.string().trim().max(80).optional().default(""),
  encounters: z.array(z.string().uuid()).min(1).max(30),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().nullable().optional(),
  difficultyStage: z.number().int().min(1).max(99),
  isPractice: z.boolean(),
  practiceEncounterIds: z.array(z.string().uuid()).max(30).default([]),
  needPhysical: z.number().int().min(0).max(12),
  needMagical: z.number().int().min(0).max(12),
  needSupport: z.number().int().min(0).max(12),
  compositionRestricted: z.boolean().default(true),
}).superRefine((v,ctx)=>{
  const start=new Date(v.startTime);
  if(start.getTime()<=Date.now()-5_000) {
    ctx.addIssue({
      code:"custom",
      message:"Party start time must be in the future",
      path:["startTime"],
    });
  }
  if(v.endTime&&new Date(v.endTime)<=start) {
    ctx.addIssue({
      code:"custom",
      message:"End time must be after start time",
      path:["endTime"],
    });
  }
  if(v.isPractice&&v.practiceEncounterIds.length===0) {
    ctx.addIssue({
      code:"custom",
      message:"Choose at least one fight to practice",
      path:["practiceEncounterIds"],
    });
  }
  if(v.practiceEncounterIds.some(id=>!v.encounters.includes(id))) {
    ctx.addIssue({
      code:"custom",
      message:"Practice fights must be part of the selected run",
      path:["practiceEncounterIds"],
    });
  }
});

export const createPartySchema = partySchema.and(z.object({
  raidSlug:z.string().trim().min(1).max(80),
}));

const weeklySlotSchema=z.object({
  day:z.number().int().min(0).max(6),
  minute:z.number().int().min(0).max(1410)
    .refine(v=>v%30===0,"Time slots must use 30-minute increments"),
});


export const globalAvailabilitySchema=z.object({
  timezone:z.string().trim().min(1).max(100),
  slots:z.array(weeklySlotSchema).max(336),
});

export const raidPreferenceSchema=z.object({
  raidSlug:z.string().trim().min(1).max(80),
  enabled:z.boolean(),
  encounters:z.array(z.string().uuid()).max(30),
  characterIds:z.array(z.string().uuid()).max(30),
  stages:z.array(z.number().int().min(1).max(99)).max(20)
    .transform(v=>[...new Set(v)].sort((a,b)=>a-b)),
  practiceOk:z.boolean(),
  notes:z.string().trim().max(250).optional().default(""),
}).superRefine((v,ctx)=>{
  if(!v.enabled)return;

  if(v.encounters.length===0) {
    ctx.addIssue({
      code:"custom",
      message:"Select at least one fight.",
      path:["encounters"],
    });
  }

  if(v.characterIds.length===0) {
    ctx.addIssue({
      code:"custom",
      message:"Select at least one character.",
      path:["characterIds"],
    });
  }

  if(v.stages.length===0) {
    ctx.addIssue({
      code:"custom",
      message:"Select at least one stage.",
      path:["stages"],
    });
  }
});
export const characterSchema=z.object({
  classId:z.string().uuid(),
  characterName:z.string().trim().min(2).max(32),
});
