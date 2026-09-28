-- Use bundled class artwork for the catalogue. Keep administrator-specified URLs.
UPDATE classes
SET icon_path = '/class-icons/' || slug || '.webp'
WHERE slug IN (
  'knight-emperor', 'rune-master', 'immortal', 'genesis',
  'aether-sage', 'oz-sorcerer', 'metamorphy', 'lord-azoth',
  'anemos', 'daybreaker', 'twilight', 'prophetess',
  'furious-blade', 'rage-hearts', 'nova-imperator', 'revenant',
  'code-ultimate', 'code-esencia', 'code-sariel', 'code-antithese',
  'comet-crusader', 'fatal-phantom', 'centurion', 'dius-aer',
  'apsara', 'devi', 'shakti', 'surya',
  'empire-sword', 'flame-lord', 'bloody-queen', 'adrestia',
  'doom-bringer', 'dominator', 'mad-paradox', 'overmind',
  'catastrophe', 'innocent', 'diangelion', 'demersio',
  'tempest-burster', 'black-massacre', 'minerva', 'prime-operator',
  'richter', 'bluhen', 'herrscher', 'opferung',
  'eternity-winner', 'radiant-soul', 'nisha-labyrinth', 'twins-picaro',
  'liberator', 'celestia', 'nyx-pieta', 'morpheus',
  'gembliss', 'avarice', 'achlys', 'mischief'
)
AND (icon_path IS NULL OR icon_path LIKE 'https://elwiki.net/%');
