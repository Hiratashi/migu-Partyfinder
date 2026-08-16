-- Fix Elwiki MediaWiki file redirect path.
UPDATE classes
SET icon_path = REPLACE(
  icon_path,
  'https://elwiki.net/wiki/Special:Redirect/file/',
  'https://elwiki.net/w/Special:Redirect/file/'
)
WHERE icon_path LIKE 'https://elwiki.net/wiki/Special:Redirect/file/%';
