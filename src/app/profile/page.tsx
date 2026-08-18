import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import CharacterForm from "@/components/CharacterForm";
import CharacterManager from "@/components/CharacterManager";

type C={
  id:string;
  name:string;
  abbreviation:string;
  damage_type:string;
  role:string;
  icon_path:string|null;
  base_character:string;
  path_number:number;
};

type Ch={
  id:string;
  class_id:string;
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
    SELECT
      id,name,abbreviation,damage_type,role,icon_path,
      base_character,path_number
    FROM classes
    WHERE active=true
    ORDER BY sort_order,name
  `);

  const chars=await query<Ch>(`
    SELECT
      ch.id,
      ch.class_id,
      ch.character_name,
      c.name,
      c.abbreviation,
      c.damage_type,
      c.role,
      c.icon_path
    FROM characters ch
    JOIN classes c ON c.id=ch.class_id
    WHERE ch.user_id=$1
      AND ch.archived_at IS NULL
    ORDER BY ch.character_name
  `,[user.id]);

  return <main>
    <h1>Your characters</h1>
    <p className="muted">
      Add and manage the characters/classes you can bring to raids.
      Removed characters remain internally only when needed for party history.
    </p>

    <CharacterForm classes={classes.rows}/>

    <h2 className="section-title">Characters</h2>

    <div className="grid character-grid">
      {chars.rows.length===0&&
        <div className="card muted">
          You have not added any characters yet.
        </div>
      }

      {chars.rows.map(c=>
        <CharacterManager
          key={c.id}
          character={c}
          classes={classes.rows}
        />
      )}
    </div>
  </main>;
}
