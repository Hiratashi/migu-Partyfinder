import type { PoolClient } from "pg";
import { query } from "@/lib/db";

type AuditMetadata=Record<string,unknown>;

export async function writeAudit(
  {
    userId,
    action,
    entityType,
    entityId,
    metadata={},
  }:{
    userId?:string|null;
    action:string;
    entityType?:string|null;
    entityId?:string|null;
    metadata?:AuditMetadata;
  },
  client?:PoolClient,
) {
  const sql=`
    INSERT INTO audit_log(
      user_id,
      action,
      entity_type,
      entity_id,
      metadata
    )
    VALUES($1,$2,$3,$4,$5::jsonb)
  `;

  const values=[
    userId??null,
    action,
    entityType??null,
    entityId??null,
    JSON.stringify(metadata),
  ];

  if(client) {
    await client.query(sql,values);
    return;
  }

  await query(sql,values);
}
