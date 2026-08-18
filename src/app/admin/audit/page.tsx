import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { query } from "@/lib/db";
import AdminSectionToolbar from "@/components/admin/AdminSectionToolbar";
import AuditFilters from "@/components/admin/AuditFilters";

const PAGE_SIZE=50;

type AuditRow={
  id:string;
  user_id:string|null;
  action:string;
  entity_type:string|null;
  entity_id:string|null;
  metadata:unknown;
  created_at:Date;
  username:string|null;
  display_name:string|null;
};

type FilterOption={
  value:string;
};

type Category=
  |"party"
  |"user"
  |"configuration"
  |"access"
  |"system"
  |"other";

function categoryFor(action:string):Category {
  if(
    action.startsWith("PARTY_")||
    action.startsWith("INVITE_")
  )return "party";

  if(
    action.startsWith("ADMIN_USER_")||
    action.startsWith("CHARACTER_")
  )return "user";

  if(
    action.startsWith("ADMIN_RAID_")||
    action.startsWith("ADMIN_CLASS_")||
    action.startsWith("RAID_")||
    action.startsWith("CLASS_")
  )return "configuration";

  if(
    action.includes("GUILD_LEAVE")||
    action.includes("ACCESS")||
    action.includes("LOGIN")||
    action.includes("SESSION")
  )return "access";

  if(
    action.startsWith("SYSTEM_")||
    action.startsWith("AUTO_")
  )return "system";

  return "other";
}

const categoryLabels:Record<Category,string>={
  party:"Party",
  user:"User / Admin",
  configuration:"Raids / Classes",
  access:"Guild / Access",
  system:"System / Automatic",
  other:"Other",
};

function actionLabel(action:string) {
  return action
    .replace(/^ADMIN_/,"")
    .replaceAll("_"," ")
    .toLowerCase()
    .replace(/\b\w/g,c=>c.toUpperCase());
}

function timeText(value:Date) {
  return new Intl.DateTimeFormat("en-GB",{
    dateStyle:"medium",
    timeStyle:"medium",
    timeZone:"UTC",
  }).format(new Date(value))+" UTC";
}

function metadataObject(value:unknown):Record<string,unknown>|null {
  if(
    value&&
    typeof value==="object"&&
    !Array.isArray(value)
  ) {
    return value as Record<string,unknown>;
  }

  return null;
}

function humanKey(value:string) {
  return value
    .replaceAll("_"," ")
    .replace(/\b\w/g,c=>c.toUpperCase());
}

function humanValue(value:unknown) {
  if(value===null||value===undefined)return "-";
  if(typeof value==="boolean")return value?"Yes":"No";
  if(typeof value==="string")return value;
  if(typeof value==="number")return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function rawMetadata(value:unknown) {
  if(value===null||value===undefined)return "";
  try {
    return JSON.stringify(value,null,2);
  } catch {
    return String(value);
  }
}

function pageHref(
  params:{
    q:string;
    action:string;
    entity:string;
    category:string;
  },
  page:number,
) {
  const qs=new URLSearchParams();
  if(params.q)qs.set("q",params.q);
  if(params.category)qs.set("category",params.category);
  if(params.action)qs.set("action",params.action);
  if(params.entity)qs.set("entity",params.entity);
  if(page>1)qs.set("page",String(page));

  const suffix=qs.toString();
  return suffix?`/admin/audit?${suffix}`:"/admin/audit";
}

export default async function AdminAuditPage({
  searchParams,
}:{
  searchParams:Promise<{
    q?:string;
    category?:string;
    action?:string;
    entity?:string;
    page?:string;
  }>;
}) {
  await requireAdmin();

  const params=await searchParams;
  const q=(params.q??"").trim();
  const category=(params.category??"").trim();
  const action=(params.action??"").trim();
  const entity=(params.entity??"").trim();
  const parsedPage=Number.parseInt(params.page??"1",10);
  const page=Number.isFinite(parsedPage)&&parsedPage>0
    ? parsedPage
    : 1;
  const offset=(page-1)*PAGE_SIZE;

  const categorySql=`
    CASE
      WHEN a.action LIKE 'PARTY_%'
        OR a.action LIKE 'INVITE_%'
        THEN 'party'
      WHEN a.action LIKE 'ADMIN_USER_%'
        OR a.action LIKE 'CHARACTER_%'
        THEN 'user'
      WHEN a.action LIKE 'ADMIN_RAID_%'
        OR a.action LIKE 'ADMIN_CLASS_%'
        OR a.action LIKE 'RAID_%'
        OR a.action LIKE 'CLASS_%'
        THEN 'configuration'
      WHEN a.action LIKE '%GUILD_LEAVE%'
        OR a.action LIKE '%ACCESS%'
        OR a.action LIKE '%LOGIN%'
        OR a.action LIKE '%SESSION%'
        THEN 'access'
      WHEN a.action LIKE 'SYSTEM_%'
        OR a.action LIKE 'AUTO_%'
        THEN 'system'
      ELSE 'other'
    END
  `;

  const [rows,total,actions,entities]=await Promise.all([
    query<AuditRow>(`
      SELECT
        a.id,
        a.user_id,
        a.action,
        a.entity_type,
        a.entity_id::text entity_id,
        a.metadata,
        a.created_at,
        u.username,
        u.display_name
      FROM audit_log a
      LEFT JOIN users u ON u.id=a.user_id
      WHERE (
        $1='' OR
        a.action ILIKE '%'||$1||'%' OR
        COALESCE(a.entity_type,'') ILIKE '%'||$1||'%' OR
        COALESCE(a.entity_id::text,'') ILIKE '%'||$1||'%' OR
        COALESCE(u.username,'') ILIKE '%'||$1||'%' OR
        COALESCE(u.display_name,'') ILIKE '%'||$1||'%' OR
        COALESCE(a.metadata::text,'') ILIKE '%'||$1||'%'
      )
      AND ($2='' OR ${categorySql}=$2)
      AND ($3='' OR a.action=$3)
      AND ($4='' OR a.entity_type=$4)
      ORDER BY a.created_at DESC
      LIMIT $5 OFFSET $6
    `,[q,category,action,entity,PAGE_SIZE,offset]),

    query<{count:number}>(`
      SELECT COUNT(*)::int count
      FROM audit_log a
      LEFT JOIN users u ON u.id=a.user_id
      WHERE (
        $1='' OR
        a.action ILIKE '%'||$1||'%' OR
        COALESCE(a.entity_type,'') ILIKE '%'||$1||'%' OR
        COALESCE(a.entity_id::text,'') ILIKE '%'||$1||'%' OR
        COALESCE(u.username,'') ILIKE '%'||$1||'%' OR
        COALESCE(u.display_name,'') ILIKE '%'||$1||'%' OR
        COALESCE(a.metadata::text,'') ILIKE '%'||$1||'%'
      )
      AND ($2='' OR ${categorySql}=$2)
      AND ($3='' OR a.action=$3)
      AND ($4='' OR a.entity_type=$4)
    `,[q,category,action,entity]),

    query<FilterOption>(`
      SELECT DISTINCT action value
      FROM audit_log
      ORDER BY action
    `),

    query<FilterOption>(`
      SELECT DISTINCT entity_type value
      FROM audit_log
      WHERE entity_type IS NOT NULL
      ORDER BY entity_type
    `),
  ]);

  const count=total.rows[0]?.count??0;
  const pages=Math.max(1,Math.ceil(count/PAGE_SIZE));

  return <main className="admin-page admin-audit-page">
    <div>
      <div className="eyebrow">Administration</div>
      <h1>Audit log</h1>
      <p className="muted">
        Review actions recorded by Partyfinder.
      </p>
    </div>

    <AdminSectionToolbar current="audit"/>

    <AuditFilters
      q={q}
      category={category}
      action={action}
      entity={entity}
      categories={(Object.keys(categoryLabels) as Category[]).map(key=>({
        value:key,
        label:categoryLabels[key],
      }))}
      actions={actions.rows.map(item=>({
        value:item.value,
        label:actionLabel(item.value),
      }))}
      entities={entities.rows.map(item=>({
        value:item.value,
        label:item.value,
      }))}
    />

    <div className="admin-audit-summary">
      <span className="muted">
        {count} event{count===1?"":"s"}
      </span>
      <span className="muted">
        Page {Math.min(page,pages)} of {pages}
      </span>
    </div>

    <section className="card admin-audit-table-wrap">
      <div className="admin-audit-table admin-audit-table-readable" role="table">
        <div className="admin-audit-head" role="row">
          <span>When</span>
          <span>Actor</span>
          <span>Action</span>
          <span>Target</span>
          <span>Details</span>
        </div>

        {rows.rows.map(row=>{
          const details=metadataObject(row.metadata);
          const categoryName=categoryLabels[categoryFor(row.action)];

          return <div className="admin-audit-row" role="row" key={row.id}>
            <time>{timeText(row.created_at)}</time>

            <div>
              {row.user_id
                ? <Link href={`/admin/users/${row.user_id}`}>
                    {row.display_name??row.username??"Unknown user"}
                  </Link>
                : <span>System</span>
              }
              {row.username&&
                <small className="muted">@{row.username}</small>
              }
            </div>

            <div>
              <strong>{actionLabel(row.action)}</strong>
              <span className="admin-audit-category">
                {categoryName}
              </span>
            </div>

            <div>
              <strong>{row.entity_type??"-"}</strong>
              {row.entity_id&&(
                row.entity_type==="party"
                  ? <Link
                      className="admin-audit-entity-id"
                      href={`/parties/${row.entity_id}`}
                    >
                      Open party
                    </Link>
                  : null
              )}
            </div>

            <div className="admin-audit-details">
              {details&&Object.keys(details).length>0
                ? <dl className="admin-audit-detail-list">
                    {Object.entries(details).map(([key,value])=>
                      <div key={key}>
                        <dt>{humanKey(key)}</dt>
                        <dd>{humanValue(value)}</dd>
                      </div>
                    )}
                  </dl>
                : <span className="muted">No additional details</span>
              }

              <details className="admin-audit-technical">
                <summary>Technical details</summary>
                <div>
                  <span>Action code</span>
                  <code>{row.action}</code>
                </div>

                <div>
                  <span>Audit ID</span>
                  <code>{row.id}</code>
                </div>

                {row.entity_id&&
                  <div>
                    <span>Target ID</span>
                    <code>{row.entity_id}</code>
                  </div>
                }

                {rawMetadata(row.metadata)&&
                  <div>
                    <span>Raw metadata</span>
                    <pre>{rawMetadata(row.metadata)}</pre>
                  </div>
                }
              </details>
            </div>
          </div>;
        })}

        {rows.rows.length===0&&
          <div className="admin-audit-empty muted">
            No audit events match the current filter.
          </div>
        }
      </div>
    </section>

    {pages>1&&
      <nav className="admin-pagination" aria-label="Audit log pages">
        {page>1
          ? <Link
              className="btn"
              href={pageHref({q,category,action,entity},page-1)}
            >
              Previous
            </Link>
          : <span/>
        }

        <span className="muted">
          Page {Math.min(page,pages)} of {pages}
        </span>

        {page<pages
          ? <Link
              className="btn"
              href={pageHref({q,category,action,entity},page+1)}
            >
              Next
            </Link>
          : <span/>
        }
      </nav>
    }
  </main>;
}
