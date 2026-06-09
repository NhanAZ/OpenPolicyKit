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

function validateRootDirectory(rootDir: string): void {
  let rootStats: fs.Stats;

  try {
    rootStats = fs.statSync(rootDir);
  } catch {
    throw new Error(`Scan path does not exist or cannot be accessed: ${rootDir}`);
  }

  if (!rootStats.isDirectory()) {
    throw new Error(`Scan path is not a directory: ${rootDir}`);
  }
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

  validateRootDirectory(absoluteRoot);

  const config = loadConfig(absoluteRoot);
  const excludePatterns = config?.exclude || [];
  
  const files = await discoverFiles(absoluteRoot, excludePatterns);
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

  const activeRules = rules.filter(r => !disabledRules.has(r.id));
  rulesRun = activeRules.length;

  const CHUNK_SIZE = 100;
  for (let i = 0; i < files.length; i += CHUNK_SIZE) {
    const chunk = files.slice(i, i + CHUNK_SIZE);
    const fileCache = new Map<string, string | null>();

    const getFileContent = async (relativePath: string): Promise<string | undefined> => {
      if (fileCache.has(relativePath)) {
        const cached = fileCache.get(relativePath);
        return cached === null ? undefined : cached;
      }
      try {
        const absolutePath = path.join(absoluteRoot, relativePath);
        const stat = await fs.promises.stat(absolutePath);
        if (stat.size === 0 || stat.size > 1_000_000) {
          fileCache.set(relativePath, null);
          return undefined;
        }
        const buffer = await fs.promises.readFile(absolutePath);
        
        // binary check
        let isBinary = false;
        const checkLength = Math.min(buffer.length, 8000);
        for (let j = 0; j < checkLength; j++) {
          if (buffer[j] === 0) {
            isBinary = true;
            break;
          }
        }

        if (isBinary) {
          fileCache.set(relativePath, null);
          return undefined;
        }

        const content = buffer.toString('utf8');
        fileCache.set(relativePath, content);
        return content;
      } catch {
        fileCache.set(relativePath, null);
        return undefined;
      }
    };

    const chunkContext: ScanContext = {
      rootDir: absoluteRoot,
      files: chunk,
      getFileContent,
    };

    for (const rule of activeRules) {
      try {
        const findings = await rule.check(chunkContext);
        allFindings.push(...findings);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(`Warning: Rule ${rule.id} failed: ${message}\n`);
      }
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
