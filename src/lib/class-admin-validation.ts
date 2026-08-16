import { z } from "zod";

const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const classAdminSchema=z.object({
  slug:z.string().trim().min(2).max(80).regex(
    slugPattern,
    "Slug must contain lowercase letters, numbers and hyphens only",
  ),
  name:z.string().trim().min(2).max(100),
  abbreviation:z.string().trim().min(1).max(12),
  damageType:z.enum(["PHYSICAL","MAGICAL","HYBRID","NONE"]),
  role:z.enum(["DPS","SUPPORT","FLEX"]),
  iconPath:z.string().trim().max(250).optional().default(""),
  active:z.boolean(),
  sortOrder:z.number().int().min(0).max(9999),
});
