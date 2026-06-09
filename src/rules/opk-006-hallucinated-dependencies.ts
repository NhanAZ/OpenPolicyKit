import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { Rule, RuleFinding, ScanContext } from '../types';

const MAX_FILE_SIZE = 1_000_000;
const DEPENDENCY_SECTIONS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const;

const NON_REGISTRY_PREFIXES = [
  'file:',
  'link:',
  'git:',
  'git+',
  'http:',
  'https:',
  'ssh:',
  'github:',
  'gitlab:',
  'bitbucket:',
  'workspace:',
];

type JsonObject = Record<string, unknown>;
type DependencySection = (typeof DEPENDENCY_SECTIONS)[number];

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readManifest(absolutePath: string): JsonObject | undefined {
  try {
    const stat = fs.statSync(absolutePath);
    if (stat.size === 0 || stat.size > MAX_FILE_SIZE) {
      return undefined;
    }

    const parsed: unknown = JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
    return isJsonObject(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function isNonRegistrySpec(versionSpec: string): boolean {
  return NON_REGISTRY_PREFIXES.some((prefix) => versionSpec.startsWith(prefix));
}

// Exported for testing
export function checkPackageExists(packageName: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Only check registry for unscoped or scoped packages
    const encodedName = packageName.startsWith('@') 
      ? `@${encodeURIComponent(packageName.slice(1))}` 
      : encodeURIComponent(packageName);

    const req = https.request(
      `https://registry.npmjs.org/${encodedName}`,
      { method: 'HEAD', timeout: 3000 },
      (res) => {
        // If it's a 404, we consider it hallucinated
        if (res.statusCode === 404) {
          resolve(false);
        } else {
          // 200 OK, or 401/403/5xx etc -> assume exists to avoid false positives
          resolve(true);
        }
      }
    );

    req.on('error', () => {
      // If network fails (offline, dns error, etc.), assume it exists
      resolve(true);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(true);
    });

    req.end();
  });
}

function createFinding(
  dependencyName: string,
  sectionName: DependencySection,
  relativePath: string,
): RuleFinding {
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    severity: rule.severity,
    message: `Package "${dependencyName}" in ${sectionName} does not exist on the npm registry. It may be hallucinated.`,
    filePath: relativePath,
    category: rule.category,
    remediation: rule.remediation,
  };
}

const rule: Rule = {
  id: 'OPK-006',
  name: 'Hallucinated Dependencies',
  category: 'security',
  severity: 'error',
  description: 'Detects npm packages that do not exist on the public npm registry.',
  remediation: 'Remove the dependency or verify its spelling. If it is a private package, ensure it is configured properly.',

  async check(context: ScanContext): Promise<RuleFinding[]> {
    const findings: RuleFinding[] = [];
    const packagesToCheck = new Map<string, Array<{ section: DependencySection; relativePath: string }>>();

    for (const relativePath of context.files) {
      if (path.basename(relativePath) !== 'package.json') {
        continue;
      }

      const manifest = readManifest(path.join(context.rootDir, relativePath));
      if (!manifest) {
        continue;
      }

      for (const sectionName of DEPENDENCY_SECTIONS) {
        const dependencies = manifest[sectionName];
        if (!isJsonObject(dependencies)) {
          continue;
        }

        for (const [dependencyName, versionSpec] of Object.entries(dependencies)) {
          if (typeof versionSpec === 'string' && !isNonRegistrySpec(versionSpec)) {
            let entries = packagesToCheck.get(dependencyName);
            if (!entries) {
              entries = [];
              packagesToCheck.set(dependencyName, entries);
            }
            entries.push({ section: sectionName, relativePath });
          }
        }
      }
    }

    // Verify all collected packages concurrently (with a small map to avoid duplication)
    // For a real-world scenario we might want to batch/limit concurrency, but since it's 
    // a lightweight HEAD request, Promise.all is usually fine for a typical package.json.
    const results = await Promise.all(
      Array.from(packagesToCheck.keys()).map(async (pkgName) => {
        const exists = await checkPackageExists(pkgName);
        return { pkgName, exists };
      })
    );

    for (const result of results) {
      if (!result.exists) {
        const entries = packagesToCheck.get(result.pkgName) || [];
        for (const entry of entries) {
          findings.push(createFinding(result.pkgName, entry.section, entry.relativePath));
        }
      }
    }

    return findings;
  },
};

export default rule;
