import { z } from "zod";

const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const raidAdminSchema=z.object({
  slug:z.string().trim().min(2).max(80).regex(
    slugPattern,
    "Slug must contain lowercase letters, numbers and hyphens only",
  ),
  name:z.string().trim().min(2).max(100),
  partySize:z.number().int().min(1).max(12),
  supportedStages:z.array(
    z.number().int().min(1).max(99),
  ).min(1).max(20),
  defaultStage:z.number().int().min(1).max(99),
  practiceSupported:z.boolean(),
  active:z.boolean(),
  sortOrder:z.number().int().min(0).max(9999),
}).superRefine((v,ctx)=>{
  if(!v.supportedStages.includes(v.defaultStage)) {
    ctx.addIssue({
      code:"custom",
      path:["defaultStage"],
      message:"Default stage must be one of the supported stages",
    });
  }
});

export const encounterAdminSchema=z.object({
  code:z.string().trim().min(1).max(40),
  name:z.string().trim().min(1).max(100),
  sortOrder:z.number().int().min(0).max(9999),
});
