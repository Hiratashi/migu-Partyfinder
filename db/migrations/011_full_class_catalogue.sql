-- Complete Elsword final-class catalogue (60 classes) + class grouping metadata.
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS base_character varchar(40) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS path_number smallint NOT NULL DEFAULT 0;

ALTER TABLE classes
  DROP CONSTRAINT IF EXISTS classes_path_number_check;

ALTER TABLE classes
  ADD CONSTRAINT classes_path_number_check
  CHECK (path_number BETWEEN 0 AND 4);

INSERT INTO classes(
  slug,name,abbreviation,damage_type,role,icon_path,active,sort_order,
  base_character,path_number
)
VALUES
('knight-emperor','Knight Emperor','KE','PHYSICAL','DPS','https://img.koggames.com/ES/new/elsword/knight-emperor.png',true,11,'Elsword',1),
('rune-master','Rune Master','RM','MAGICAL','DPS','https://img.koggames.com/ES/new/elsword/rune-master.png',true,12,'Elsword',2),
('immortal','Immortal','IM','PHYSICAL','DPS','https://img.koggames.com/ES/new/elsword/immortal.png',true,13,'Elsword',3),
('genesis','Genesis','GS','MAGICAL','DPS','https://img.koggames.com/ES/new/elsword/genesis.png',true,14,'Elsword',4),
('aether-sage','Aether Sage','AeS','MAGICAL','DPS','https://img.koggames.com/ES/new/aisha/aether-sage.png',true,21,'Aisha',1),
('oz-sorcerer','Oz Sorcerer','OzS','MAGICAL','DPS','https://img.koggames.com/ES/new/aisha/oz-sorcerer.png',true,22,'Aisha',2),
('metamorphy','Metamorphy','MtM','PHYSICAL','DPS','https://img.koggames.com/ES/new/aisha/metamorphy.png',true,23,'Aisha',3),
('lord-azoth','Lord Azoth','LA','PHYSICAL','FLEX','https://img.koggames.com/ES/new/aisha/lord-azoth.png',true,24,'Aisha',4),
('anemos','Anemos','AN','PHYSICAL','DPS','https://img.koggames.com/ES/new/rena/anemos.png',true,31,'Rena',1),
('daybreaker','Daybreaker','DaB','MAGICAL','DPS','https://img.koggames.com/ES/new/rena/daybreaker.png',true,32,'Rena',2),
('twilight','Twilight','TW','PHYSICAL','DPS','https://img.koggames.com/ES/new/rena/twilight.png',true,33,'Rena',3),
('prophetess','Prophetess','PR','MAGICAL','FLEX','https://img.koggames.com/ES/new/rena/prophetess.png',true,34,'Rena',4),
('furious-blade','Furious Blade','FB','PHYSICAL','DPS','https://img.koggames.com/ES/new/raven/furious-blade.png',true,41,'Raven',1),
('rage-hearts','Rage Hearts','RH','MAGICAL','DPS','https://img.koggames.com/ES/new/raven/rage-hearts.png',true,42,'Raven',2),
('nova-imperator','Nova Imperator','NI','MAGICAL','DPS','https://img.koggames.com/ES/new/raven/nova-imperator.png',true,43,'Raven',3),
('revenant','Revenant','RV','PHYSICAL','FLEX','https://img.koggames.com/ES/new/raven/revenant.png',true,44,'Raven',4),
('code-ultimate','Code: Ultimate','CU','MAGICAL','DPS','https://img.koggames.com/ES/new/eve/code-ultimate.png',true,51,'Eve',1),
('code-esencia','Code: Esencia','CE','PHYSICAL','FLEX','https://img.koggames.com/ES/new/eve/code-esencia.png',true,52,'Eve',2),
('code-sariel','Code: Sariel','CS','MAGICAL','DPS','https://img.koggames.com/ES/new/eve/code-sariel.png',true,53,'Eve',3),
('code-antithese','Code: Antithese','CA','PHYSICAL','DPS','https://img.koggames.com/ES/new/eve/code-antithese.png',true,54,'Eve',4),
('comet-crusader','Comet Crusader','CC','PHYSICAL','FLEX','https://img.koggames.com/ES/new/chung/comet-crusader.png',true,61,'Chung',1),
('fatal-phantom','Fatal Phantom','FP','MAGICAL','DPS','https://img.koggames.com/ES/new/chung/fatal-phantom.png',true,62,'Chung',2),
('centurion','Centurion','CeT','MAGICAL','DPS','https://img.koggames.com/ES/new/chung/centurion.png',true,63,'Chung',3),
('dius-aer','Dius Aer','DA','PHYSICAL','SUPPORT','https://img.koggames.com/ES/new/chung/dius-aer.png',true,64,'Chung',4),
('apsara','Apsara','APS','PHYSICAL','FLEX','https://img.koggames.com/ES/new/ara/apsara.png',true,71,'Ara',1),
('devi','Devi','DV','MAGICAL','DPS','https://img.koggames.com/ES/new/ara/devi.png',true,72,'Ara',2),
('shakti','Shakti','SH','PHYSICAL','DPS','https://img.koggames.com/ES/new/ara/shakti.png',true,73,'Ara',3),
('surya','Surya','SU','MAGICAL','SUPPORT','https://img.koggames.com/ES/new/ara/surya.png',true,74,'Ara',4),
('empire-sword','Empire Sword','ES','PHYSICAL','DPS','https://img.koggames.com/ES/new/elesis/empire-sword.png',true,81,'Elesis',1),
('flame-lord','Flame Lord','FL','MAGICAL','DPS','https://img.koggames.com/ES/new/elesis/flame-lord.png',true,82,'Elesis',2),
('bloody-queen','Bloody Queen','BQ','PHYSICAL','DPS','https://img.koggames.com/ES/new/elesis/bloody-queen.png',true,83,'Elesis',3),
('adrestia','Adrestia','AD','MAGICAL','FLEX','https://img.koggames.com/ES/new/elesis/adrestia.png',true,84,'Elesis',4),
('doom-bringer','Doom Bringer','DB','PHYSICAL','DPS','https://img.koggames.com/ES/new/add/doom-bringer.png',true,91,'Add',1),
('dominator','Dominator','Dom','MAGICAL','DPS','https://img.koggames.com/ES/new/add/dominator.png',true,92,'Add',2),
('mad-paradox','Mad Paradox','MP','MAGICAL','DPS','https://img.koggames.com/ES/new/add/mad-paradox.png',true,93,'Add',3),
('overmind','Overmind','OM','PHYSICAL','SUPPORT','https://img.koggames.com/ES/new/add/overmind.png',true,94,'Add',4),
('catastrophe','Catastrophe','CaT','PHYSICAL','DPS','https://img.koggames.com/ES/new/luciel/catastrophe.png',true,101,'LuCiel',1),
('innocent','Innocent','IN','MAGICAL','FLEX','https://img.koggames.com/ES/new/luciel/innocent.png',true,102,'LuCiel',2),
('diangelion','Diangelion','DIA','PHYSICAL','DPS','https://img.koggames.com/ES/new/luciel/diangelion.png',true,103,'LuCiel',3),
('demersio','Demersio','DEM','MAGICAL','SUPPORT','https://img.koggames.com/ES/new/luciel/demersio.png',true,104,'LuCiel',4),
('tempest-burster','Tempest Burster','TB','PHYSICAL','DPS','https://img.koggames.com/ES/new/rose/tempest-burster.png',true,111,'Rose',1),
('black-massacre','Black Massacre','BM','PHYSICAL','DPS','https://img.koggames.com/ES/new/rose/black-massacre.png',true,112,'Rose',2),
('minerva','Minerva','MN','MAGICAL','DPS','https://img.koggames.com/ES/new/rose/minerva.png',true,113,'Rose',3),
('prime-operator','Prime Operator','PO','MAGICAL','FLEX','https://img.koggames.com/ES/new/rose/prime-operator.png',true,114,'Rose',4),
('richter','Richter','RT','PHYSICAL','DPS','https://img.koggames.com/ES/new/ain/richter.png',true,121,'Ain',1),
('bluhen','Bluhen','BL','MAGICAL','SUPPORT','https://img.koggames.com/ES/new/ain/bluhen.png',true,122,'Ain',2),
('herrscher','Herrscher','HR','MAGICAL','DPS','https://img.koggames.com/ES/new/ain/herrscher.png',true,123,'Ain',3),
('opferung','Opferung','OP','PHYSICAL','FLEX','https://img.koggames.com/ES/new/ain/opferung.png',true,124,'Ain',4),
('eternity-winner','Eternity Winner','EW','PHYSICAL','DPS','https://img.koggames.com/ES/new/laby/eternity-winner.png',true,131,'Laby',1),
('radiant-soul','Radiant Soul','RaS','MAGICAL','SUPPORT','https://img.koggames.com/ES/new/laby/radiant-soul.png',true,132,'Laby',2),
('nisha-labyrinth','Nisha Labyrinth','NL','PHYSICAL','DPS','https://img.koggames.com/ES/new/laby/nisha-labyrinth.png',true,133,'Laby',3),
('twins-picaro','Twins Picaro','TP','MAGICAL','DPS','https://img.koggames.com/ES/new/laby/twins-picaro.png',true,134,'Laby',4),
('liberator','Liberator','LB','PHYSICAL','DPS','https://img.koggames.com/ES/new/noah/liberator.png',true,141,'Noah',1),
('celestia','Celestia','CL','MAGICAL','FLEX','https://img.koggames.com/ES/new/noah/celestia.png',true,142,'Noah',2),
('nyx-pieta','Nyx Pieta','NP','PHYSICAL','SUPPORT','https://img.koggames.com/ES/new/noah/nyx-pieta.png',true,143,'Noah',3),
('morpheus','Morpheus','MO','MAGICAL','DPS','https://img.koggames.com/ES/new/noah/morpheus.png',true,144,'Noah',4),
('gembliss','Gembliss','GB','PHYSICAL','DPS','https://img.koggames.com/ES/new/lithia/gembliss.png',true,151,'Lithia',1),
('avarice','Avarice','AV','PHYSICAL','SUPPORT','https://img.koggames.com/ES/new/lithia/avarice.png',true,152,'Lithia',2),
('achlys','Achlys','AC','MAGICAL','DPS','https://img.koggames.com/ES/new/lithia/achlys.png',true,153,'Lithia',3),
('mischief','Mischief','MC','MAGICAL','DPS','https://img.koggames.com/ES/new/lithia/mischief.png',true,154,'Lithia',4)
ON CONFLICT(slug)
DO UPDATE SET
  name=EXCLUDED.name,
  abbreviation=EXCLUDED.abbreviation,
  damage_type=EXCLUDED.damage_type,
  role=EXCLUDED.role,
  icon_path=EXCLUDED.icon_path,
  active=EXCLUDED.active,
  sort_order=EXCLUDED.sort_order,
  base_character=EXCLUDED.base_character,
  path_number=EXCLUDED.path_number;
