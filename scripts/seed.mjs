import pg from 'pg';
const { Client } = pg;

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

async function upsertRaid(config) {
  const raid = await db.query(`
    INSERT INTO raids(
      slug,
      name,
      party_size,
      supported_stages,
      default_stage,
      practice_supported,
      active,
      sort_order
    )
    VALUES($1,$2,$3,$4::smallint[],$5,$6,$7,$8)
    ON CONFLICT(slug)
    DO UPDATE SET
      name=EXCLUDED.name,
      party_size=EXCLUDED.party_size,
      supported_stages=EXCLUDED.supported_stages,
      default_stage=EXCLUDED.default_stage,
      practice_supported=EXCLUDED.practice_supported,
      active=EXCLUDED.active,
      sort_order=EXCLUDED.sort_order
    RETURNING id
  `,[
    config.slug,
    config.name,
    config.partySize,
    config.stages,
    config.defaultStage,
    config.practiceSupported,
    config.active,
    config.sortOrder,
  ]);

  const raidId=raid.rows[0].id;

  for(const [code,name,order] of config.encounters) {
    await db.query(`
      INSERT INTO encounters(raid_id,code,name,sort_order)
      VALUES($1,$2,$3,$4)
      ON CONFLICT(raid_id,code)
      DO UPDATE SET
        name=EXCLUDED.name,
        sort_order=EXCLUDED.sort_order
    `,[raidId,code,name,order]);
  }
}

try {
  await upsertRaid({
    slug:'serpentium',
    name:'Serpentium Raid',
    partySize:6,
    stages:[2,3],
    defaultStage:3,
    practiceSupported:true,
    active:true,
    sortOrder:10,
    encounters:[
      ['20-4','Serpentium Tower',1],
      ['20-5','Concert Hall',2],
    ],
  });

  await upsertRaid({
    slug:'doom-aporia',
    name:'Doom Aporia',
    partySize:6,
    stages:[1,2,3],
    defaultStage:3,
    practiceSupported:true,
    active:true,
    sortOrder:20,
    encounters:[
      ['21-1','Doom Aporia 21-1',1],
      ['21-2','Doom Aporia 21-2',2],
      ['21-3','Doom Aporia 21-3',3],
      ['21-4','Doom Aporia 21-4',4],
      ['21-5','Doom Aporia 21-5',5],
    ],
  });

  const classes=[
    ['shakti','Shakti','SH','PHYSICAL','DPS'],
    ['code-sariel','Code Sariel','CS','MAGICAL','DPS'],
    ['radiant-soul','Radiant Soul','RaS','MAGICAL','SUPPORT'],
  ];

  for(const c of classes) {
    await db.query(`
      INSERT INTO classes(
        slug,name,abbreviation,damage_type,role
      )
      VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(slug)
      DO UPDATE SET
        name=EXCLUDED.name,
        abbreviation=EXCLUDED.abbreviation,
        damage_type=EXCLUDED.damage_type,
        role=EXCLUDED.role
    `,c);
  }

  console.log('Seed complete');
} finally {
  await db.end();
}
