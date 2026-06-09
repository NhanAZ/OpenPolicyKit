import * as fs from 'fs';
import * as path from 'path';
import { ScanContext, ScanResult } from '../types';
import { rules } from '../rules';

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'coverage',
  '__pycache__',
  '.next',
  '.nuxt',
]);

const SKIP_FILES = new Set([
  '.DS_Store',
  'Thumbs.db',
]);

async function discoverFiles(rootDir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string): Promise<void> {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) {
          continue;
        }
        await walk(fullPath);
      } else if (entry.isFile()) {
        if (SKIP_FILES.has(entry.name)) {
          continue;
        }
        const relativePath = path.relative(rootDir, fullPath);
        files.push(relativePath);
      }
    }
  }

  await walk(rootDir);
  return files;
}

export async function scan(rootDir: string): Promise<ScanResult> {
  const startTime = Date.now();
  const absoluteRoot = path.resolve(rootDir);

  const files = await discoverFiles(absoluteRoot);

  const context: ScanContext = {
    rootDir: absoluteRoot,
    files,
  };

  const allFindings: ScanResult['findings'] = [];
  let rulesRun = 0;

  for (const rule of rules) {
    try {
      const findings = await rule.check(context);
      allFindings.push(...findings);
      rulesRun++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`Warning: Rule ${rule.id} failed: ${message}\n`);
      rulesRun++;
    }
  }

  const durationMs = Date.now() - startTime;

  return {
    findings: allFindings,
    scannedFiles: files.length,
    rulesRun,
    durationMs,
  };
}
