-- Only run this after deleting/cancelling any parties or availability
-- profiles that reference the temporary Abyss test raid.

DELETE FROM raids
WHERE slug='abyss-test';
