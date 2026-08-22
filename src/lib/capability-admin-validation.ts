import { z } from "zod";

const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const capabilityAdminSchema=z.object({
  slug:z.string().trim().min(2).max(80).regex(
    slugPattern,
    "Slug must contain lowercase letters, numbers and hyphens only",
  ),
  name:z.string().trim().min(2).max(100),
  description:z.string().trim().max(300).default(""),
  category:z.enum(["DAMAGE","GEAR","UTILITY","OTHER"]),
  raidId:z.string().uuid().nullable(),
  active:z.boolean(),
  sortOrder:z.number().int().min(0).max(9999),
});
