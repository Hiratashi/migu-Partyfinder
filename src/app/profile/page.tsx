import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import CharacterForm from "@/components/CharacterForm";

type C={
  id:string;
  name:string;
  abbreviation:string;
  damage_type:string;
  role:string;
  icon_path:string|null;
};

type Ch={
  id:string;
  character_name:string;
  name:string;
  abbreviation:string;
  damage_type:string;
  role:string;
  icon_path:string|null;
};

export default async function Profile() {
  const user=await requireUser();

  const classes=await query<C>(`
    SELECT id,name,abbreviation,damage_type,role,icon_path
    FROM classes
    WHERE active=true
    ORDER BY sort_order,name
  `);

  const chars=await query<Ch>(`
    SELECT
      ch.id,
      ch.character_name,
      c.name,
      c.abbreviation,
      c.damage_type,
      c.role,
      c.icon_path
    FROM characters ch
    JOIN classes c ON c.id=ch.class_id
    WHERE ch.user_id=$1
    ORDER BY ch.character_name
  `,[user.id]);

  return <main>
    <h1>Your characters</h1>
    <p className="muted">
      Add the characters/classes you can bring to raids.
    </p>

    <CharacterForm classes={classes.rows}/>

    <h2 className="section-title">Characters</h2>
    <div className="grid">
      {chars.rows.map(c=>
        <div className="card row" key={c.id}>
          <div className="classicon">{c.abbreviation}</div>
          <div>
            <strong>{c.character_name}</strong>
            <div className="muted">
              {c.name} · {c.damage_type} · {c.role}
            </div>
          </div>
        </div>
      )}
    </div>
  </main>;
}
