-- Replace full-body KOG artwork with compact Elwiki Master-class icons.
UPDATE classes
SET icon_path = CASE slug
  WHEN 'knight-emperor' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Knight_Emperor_%28Master%29.png'
  WHEN 'rune-master' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Rune_Master_%28Master%29.png'
  WHEN 'immortal' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Immortal_%28Master%29.png'
  WHEN 'genesis' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Genesis_%28Master%29.png'
  WHEN 'aether-sage' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Aether_Sage_%28Master%29.png'
  WHEN 'oz-sorcerer' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Oz_Sorcerer_%28Master%29.png'
  WHEN 'metamorphy' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Metamorphy_%28Master%29.png'
  WHEN 'lord-azoth' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Lord_Azoth_%28Master%29.png'
  WHEN 'anemos' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Anemos_%28Master%29.png'
  WHEN 'daybreaker' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Daybreaker_%28Master%29.png'
  WHEN 'twilight' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Twilight_%28Master%29.png'
  WHEN 'prophetess' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Prophetess_%28Master%29.png'
  WHEN 'furious-blade' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Furious_Blade_%28Master%29.png'
  WHEN 'rage-hearts' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Rage_Hearts_%28Master%29.png'
  WHEN 'nova-imperator' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Nova_Imperator_%28Master%29.png'
  WHEN 'revenant' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Revenant_%28Master%29.png'
  WHEN 'code-ultimate' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Code_Ultimate_%28Master%29.png'
  WHEN 'code-esencia' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Code_Esencia_%28Master%29.png'
  WHEN 'code-sariel' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Code_Sariel_%28Master%29.png'
  WHEN 'code-antithese' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Code_Antithese_%28Master%29.png'
  WHEN 'comet-crusader' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Comet_Crusader_%28Master%29.png'
  WHEN 'fatal-phantom' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Fatal_Phantom_%28Master%29.png'
  WHEN 'centurion' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Centurion_%28Master%29.png'
  WHEN 'dius-aer' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Dius_Aer_%28Master%29.png'
  WHEN 'apsara' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Apsara_%28Master%29.png'
  WHEN 'devi' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Devi_%28Master%29.png'
  WHEN 'shakti' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Shakti_%28Master%29.png'
  WHEN 'surya' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Surya_%28Master%29.png'
  WHEN 'empire-sword' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Empire_Sword_%28Master%29.png'
  WHEN 'flame-lord' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Flame_Lord_%28Master%29.png'
  WHEN 'bloody-queen' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Bloody_Queen_%28Master%29.png'
  WHEN 'adrestia' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Adrestia_%28Master%29.png'
  WHEN 'doom-bringer' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Doom_Bringer_%28Master%29.png'
  WHEN 'dominator' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Dominator_%28Master%29.png'
  WHEN 'mad-paradox' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Mad_Paradox_%28Master%29.png'
  WHEN 'overmind' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Overmind_%28Master%29.png'
  WHEN 'catastrophe' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Catastrophe_%28Master%29.png'
  WHEN 'innocent' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Innocent_%28Master%29.png'
  WHEN 'diangelion' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Diangelion_%28Master%29.png'
  WHEN 'demersio' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Demersio_%28Master%29.png'
  WHEN 'tempest-burster' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Tempest_Burster_%28Master%29.png'
  WHEN 'black-massacre' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Black_Massacre_%28Master%29.png'
  WHEN 'minerva' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Minerva_%28Master%29.png'
  WHEN 'prime-operator' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Prime_Operator_%28Master%29.png'
  WHEN 'richter' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Richter_%28Master%29.png'
  WHEN 'bluhen' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Bluhen_%28Master%29.png'
  WHEN 'herrscher' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Herrscher_%28Master%29.png'
  WHEN 'opferung' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Opferung_%28Master%29.png'
  WHEN 'eternity-winner' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Eternity_Winner_%28Master%29.png'
  WHEN 'radiant-soul' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Radiant_Soul_%28Master%29.png'
  WHEN 'nisha-labyrinth' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Nisha_Labyrinth_%28Master%29.png'
  WHEN 'twins-picaro' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Twins_Picaro_%28Master%29.png'
  WHEN 'liberator' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Liberator_%28Master%29.png'
  WHEN 'celestia' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Celestia_%28Master%29.png'
  WHEN 'nyx-pieta' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Nyx_Pieta_%28Master%29.png'
  WHEN 'morpheus' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Morpheus_%28Master%29.png'
  WHEN 'gembliss' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Gembliss_%28Master%29.png'
  WHEN 'avarice' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Avarice_%28Master%29.png'
  WHEN 'achlys' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Achlys_%28Master%29.png'
  WHEN 'mischief' THEN 'https://elwiki.net/wiki/Special:Redirect/file/Icon_-_Mischief_%28Master%29.png'
  ELSE icon_path
END
WHERE slug IN (
  'knight-emperor',
  'rune-master',
  'immortal',
  'genesis',
  'aether-sage',
  'oz-sorcerer',
  'metamorphy',
  'lord-azoth',
  'anemos',
  'daybreaker',
  'twilight',
  'prophetess',
  'furious-blade',
  'rage-hearts',
  'nova-imperator',
  'revenant',
  'code-ultimate',
  'code-esencia',
  'code-sariel',
  'code-antithese',
  'comet-crusader',
  'fatal-phantom',
  'centurion',
  'dius-aer',
  'apsara',
  'devi',
  'shakti',
  'surya',
  'empire-sword',
  'flame-lord',
  'bloody-queen',
  'adrestia',
  'doom-bringer',
  'dominator',
  'mad-paradox',
  'overmind',
  'catastrophe',
  'innocent',
  'diangelion',
  'demersio',
  'tempest-burster',
  'black-massacre',
  'minerva',
  'prime-operator',
  'richter',
  'bluhen',
  'herrscher',
  'opferung',
  'eternity-winner',
  'radiant-soul',
  'nisha-labyrinth',
  'twins-picaro',
  'liberator',
  'celestia',
  'nyx-pieta',
  'morpheus',
  'gembliss',
  'avarice',
  'achlys',
  'mischief'
);
