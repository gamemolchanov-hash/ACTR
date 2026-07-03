/**
 * messages-pull.mjs — sync messages/*.json from Tolgee project 34.
 *
 * Usage:
 *   TOLGEE_API_KEY=<key> node scripts/messages-pull.mjs
 *
 * Prerequisites:
 *   - TOLGEE_API_KEY env var (loco.devloc.su → project 34 → API keys → Personal Access Token)
 *   - loco.devloc.su must be reachable (VPN/tunnel if needed)
 *
 * Design (D-04/D-05):
 *   - Tolgee project 34 is the source of truth for ACTR UI translations.
 *   - This script pulls EN base + TR translations and writes static JSON files.
 *   - Production build reads committed static JSON — NO runtime Tolgee dependency.
 *   - Run this script when adding/changing translation keys, then commit the
 *     updated messages/*.json files.
 *
 * @tolgee/cli is intentionally NOT used here (flagged SUS in 04-RESEARCH.md —
 * version 2.20.0 published within 30 days of research date). This node+REST
 * approach has zero additional dependencies.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const MESSAGES_DIR = resolve(PROJECT_ROOT, 'messages');
const TOLGEE_BASE = process.env.TOLGEE_API_BASE_URL || 'https://loco.devloc.su';
const PROJECT_ID = 34;
// [local file basename, Tolgee language tag] — project 34 uses regional tags
// (en-GB base + tr-TR), while next-intl routing works with short codes.
const LANGUAGES = [
  ['en', 'en-GB'],
  ['tr', 'tr-TR'],
];

const apiKey = process.env.TOLGEE_API_KEY;
if (!apiKey) {
  console.error('Error: TOLGEE_API_KEY environment variable is required.');
  console.error('  Generate it at: https://loco.devloc.su → Project 34 → API keys');
  process.exit(1);
}

async function fetchTranslations(languageTag) {
  // Tolgee v2 export API — exports keys as flat JSON for the given language.
  // Format=FLAT_JSON is compatible with next-intl flat-key catalogs.
  // zip=false keeps a single-language export as raw JSON (otherwise Tolgee
  // wraps even one language into a ZIP archive).
  const url = `${TOLGEE_BASE}/v2/projects/${PROJECT_ID}/export?format=JSON&languages=${languageTag}&structureDelimiter=&zip=false`;
  const res = await fetch(url, {
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Tolgee API responded ${res.status} for lang=${languageTag}: ${await res.text()}`);
  }

  // The export returns a ZIP with one file per language; for single-language
  // exports via REST we receive raw JSON. Parse and extract.
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/zip') || contentType.includes('octet-stream')) {
    // Multi-language export returns ZIP — use single-language request instead
    throw new Error(
      `Received ZIP instead of JSON for lang=${languageTag}. ` +
      'Tolgee may require a single-language export request. Check the API documentation.'
    );
  }

  return res.json();
}

async function main() {
  mkdirSync(MESSAGES_DIR, { recursive: true });

  let successCount = 0;
  for (const [lang, tag] of LANGUAGES) {
    try {
      console.log(`Pulling ${lang} (${tag}) from Tolgee project ${PROJECT_ID}...`);
      const messages = await fetchTranslations(tag);
      const outPath = resolve(MESSAGES_DIR, `${lang}.json`);
      writeFileSync(outPath, JSON.stringify(messages, null, 2) + '\n', 'utf-8');
      console.log(`  Wrote ${Object.keys(messages).length} keys to ${outPath}`);
      successCount++;
    } catch (err) {
      console.error(`  Failed to pull ${lang}: ${err.message}`);
    }
  }

  if (successCount === 0) {
    process.exit(1);
  }

  console.log(`\nDone. Commit messages/*.json to use updated translations in production.`);
  console.log('Note: the production build reads committed static JSON (no runtime Tolgee).');
}

main().catch((err) => {
  console.error('messages-pull failed:', err.message);
  process.exit(1);
});
