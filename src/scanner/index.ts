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

interface OpkConfig {
  rules?: Record<string, boolean>;
  exclude?: string[];
}

function loadConfig(rootDir: string): OpkConfig | null {
  const configPath = path.join(rootDir, 'opk.config.json');
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function discoverFiles(rootDir: string, excludePatterns: string[] = []): Promise<string[]> {
  const files: string[] = [];
  const excludeRegexes = excludePatterns.map((pattern) => new RegExp(pattern));

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
      let relativePath = path.relative(rootDir, fullPath);
      // Normalize slashes for consistent regex matching across platforms
      relativePath = relativePath.replace(/\\/g, '/');

      if (excludeRegexes.some((r) => r.test(relativePath))) {
        continue;
      }

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) {
          continue;
        }
        await walk(fullPath);
      } else if (entry.isFile()) {
        if (SKIP_FILES.has(entry.name)) {
          continue;
        }
        files.push(relativePath);
      }
    }
  }

  await walk(rootDir);
  return files;
}

export async function scan(
  rootDir: string,
  minSeverity: 'info' | 'warning' | 'error' = 'info'
): Promise<ScanResult> {
  const startTime = Date.now();
  const absoluteRoot = path.resolve(rootDir);

  const config = loadConfig(absoluteRoot);
  const excludePatterns = config?.exclude || [];
  
  const files = await discoverFiles(absoluteRoot, excludePatterns);

  const context: ScanContext = {
    rootDir: absoluteRoot,
    files,
  };
  const disabledRules = new Set<string>();

  if (config?.rules) {
    for (const [ruleId, enabled] of Object.entries(config.rules)) {
      if (enabled === false) {
        disabledRules.add(ruleId);
      }
    }
  }

  const allFindings: ScanResult['findings'] = [];
  let rulesRun = 0;

  for (const rule of rules) {
    if (disabledRules.has(rule.id)) {
      continue;
    }

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

  const severityLevels = { info: 0, warning: 1, error: 2 };
  const minLevel = severityLevels[minSeverity] ?? 0;

  const filteredFindings = allFindings.filter((finding) => {
    const findingLevel = severityLevels[finding.severity] ?? 0;
    return findingLevel >= minLevel;
  });

  return {
    findings: filteredFindings,
    scannedFiles: files.length,
    rulesRun,
    durationMs,
  };
}
