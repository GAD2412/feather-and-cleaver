import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const GATE_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
} as const;

function exportEntry(): void {
  mkdirSync(outputDir, { recursive: true });
  cpSync(join(projectRoot, 'game'), join(outputDir, 'game'), { recursive: true });

  const targetShotsDir = join(outputDir, 'screenshots');
  mkdirSync(targetShotsDir, { recursive: true });
  const sourceShotsDir = join(projectRoot, 'screenshots');
  if (existsSync(sourceShotsDir)) {
    cpSync(sourceShotsDir, targetShotsDir, { recursive: true });
  }

  const dossierBytes = buildDossier(outputDir, GATE_CAPS);
  writeFileSync(join(outputDir, 'dossier.json'), dossierBytes);
}

exportEntry();
