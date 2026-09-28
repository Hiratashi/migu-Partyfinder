// Run manually when the bundled CoboDex artwork needs refreshing. Never run at app startup.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const entries = JSON.parse(await fs.readFile(new URL('./class-icon-sources.json', import.meta.url), 'utf8'));
const destination = path.resolve('public/class-icons');
const pending = [];

for (const entry of entries) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug)) throw new Error(`Invalid slug: ${entry.slug}`);
  const page = new URL(entry.page);
  if (page.origin !== 'https://cobodex.eu' || !page.pathname.startsWith('/en/character/')) {
    throw new Error(`Unexpected class page: ${entry.page}`);
  }
  const source = new URL(entry.source);
  if (source.origin !== page.origin || !/^\/character_face\/-?\d+\.webp$/.test(source.pathname)) {
    throw new Error(`Unexpected image source: ${entry.source}`);
  }
  const imageResponse = await fetch(source, { signal: AbortSignal.timeout(15000) });
  if (!imageResponse.ok) throw new Error(`${entry.slug}: image returned ${imageResponse.status}`);
  const bytes = Buffer.from(await imageResponse.arrayBuffer());
  const metadata = await sharp(bytes).metadata();
  if (metadata.format !== 'webp' || !metadata.width || !metadata.height || metadata.width < 32 || metadata.height < 32 || bytes.length > 2_000_000) {
    throw new Error(`${entry.slug}: invalid or oversized WebP image`);
  }
  pending.push({ slug: entry.slug, bytes });
  console.log(`Fetched ${entry.slug}`);
}

// Fetch and validate the whole catalogue before replacing any bundled file.
await fs.mkdir(destination, { recursive: true });
for (const entry of pending) {
  const target = path.join(destination, `${entry.slug}.webp`);
  const temporary = `${target}.tmp`;
  await fs.writeFile(temporary, entry.bytes);
  await fs.rename(temporary, target);
}
console.log(`Updated ${pending.length} class icons. Review and commit the changed images.`);
