import pg from 'pg';
const { Client } = pg;
const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
  const raid = await db.query(`INSERT INTO raids(slug,name) VALUES('doom-aporia','Doom Aporia') ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name RETURNING id`);
  const raidId = raid.rows[0].id;
  for (const [code, name, order] of [
    ['21-1','Doom Aporia 21-1',1],
    ['21-2','Doom Aporia 21-2',2],
    ['21-3','Doom Aporia 21-3',3],
    ['21-4','Doom Aporia 21-4',4],
    ['21-5','Doom Aporia 21-5',5]
  ]) {
    await db.query('INSERT INTO encounters(raid_id,code,name,sort_order) VALUES($1,$2,$3,$4) ON CONFLICT(raid_id,code) DO UPDATE SET name=EXCLUDED.name, sort_order=EXCLUDED.sort_order', [raidId,code,name,order]);
  }
  const classes = [
    ['shakti','Shakti','SH','PHYSICAL','DPS'],
    ['code-sariel','Code Sariel','CS','MAGICAL','DPS'],
    ['radiant-soul','Radiant Soul','RaS','MAGICAL','SUPPORT']
  ];
  for (const c of classes) {
    await db.query('INSERT INTO classes(slug,name,abbreviation,damage_type,role) VALUES($1,$2,$3,$4,$5) ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name, abbreviation=EXCLUDED.abbreviation, damage_type=EXCLUDED.damage_type, role=EXCLUDED.role', c);
  }
  console.log('Seed complete');
} finally { await db.end(); }
