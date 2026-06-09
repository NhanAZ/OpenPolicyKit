import * as fs from 'fs';
import * as path from 'path';
import { Rule, RuleFinding, ScanContext } from '../types';

const MAX_FILE_SIZE = 1_000_000;
const DEPENDENCY_SECTIONS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const;
const EXACT_VERSION = /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
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
];

type JsonObject = Record<string, unknown>;

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

function unwrapVersionSpec(versionSpec: string): string {
  if (versionSpec.startsWith('workspace:')) {
    return versionSpec.slice('workspace:'.length);
  }

  const aliasMatch = /^npm:(?:@[^/]+\/)?[^@]+@(.+)$/.exec(versionSpec);
  return aliasMatch ? aliasMatch[1] : versionSpec;
}

function isPinnedVersion(versionSpec: string): boolean {
  const trimmedSpec = versionSpec.trim();
  if (isNonRegistrySpec(trimmedSpec)) {
    return true;
  }

  return EXACT_VERSION.test(unwrapVersionSpec(trimmedSpec));
}

function createFinding(
  dependencyName: string,
  sectionName: string,
  relativePath: string,
  line?: number
): RuleFinding {
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    severity: rule.severity,
    message: `Dependency "${dependencyName}" in ${sectionName} is not pinned to an exact version`,
    filePath: relativePath,
    line,
    category: rule.category,
    remediation: rule.remediation,
  };
}

function checkManifest(manifest: JsonObject, relativePath: string): RuleFinding[] {
  const findings: RuleFinding[] = [];

  for (const sectionName of DEPENDENCY_SECTIONS) {
    const dependencies = manifest[sectionName];
    if (!isJsonObject(dependencies)) {
      continue;
    }

    for (const [dependencyName, versionSpec] of Object.entries(dependencies)) {
      if (typeof versionSpec === 'string' && !isPinnedVersion(versionSpec)) {
        findings.push(createFinding(dependencyName, sectionName, relativePath));
      }
    }
  }

  return findings;
}

function checkRequirementsTxt(absolutePath: string, relativePath: string): RuleFinding[] {
  const findings: RuleFinding[] = [];
  try {
    const stat = fs.statSync(absolutePath);
    if (stat.size === 0 || stat.size > MAX_FILE_SIZE) {
      return findings;
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    const lines = content.split(/\r?\n/);

    let lineNum = 0;
    for (const rawLine of lines) {
      lineNum++;
      const line = rawLine.trim();

      if (!line || line.startsWith('#') || line.startsWith('-')) {
        continue;
      }

      if (line.includes('@') || line.includes('://')) {
        continue;
      }

      if (!line.includes('==')) {
        const dependencyName = line.split(/[<>=~!;]/)[0].trim();
        findings.push(createFinding(dependencyName, 'requirements.txt', relativePath, lineNum));
      }
    }
  } catch {
    // Ignore read errors
  }
  return findings;
}

function checkPyprojectToml(absolutePath: string, relativePath: string): RuleFinding[] {
  const findings: RuleFinding[] = [];
  try {
    const stat = fs.statSync(absolutePath);
    if (stat.size === 0 || stat.size > MAX_FILE_SIZE) {
      return findings;
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    const lines = content.split(/\r?\n/);

    let inDependenciesArray = false;
    let inPoetryDependencies = false;
    let lineNum = 0;

    for (const rawLine of lines) {
      lineNum++;
      const line = rawLine.trim();

      if (!line || line.startsWith('#')) {
        continue;
      }

      if (line.startsWith('[')) {
        inPoetryDependencies = line.includes('tool.poetry.dependencies') || line.includes('tool.poetry.dev-dependencies');
        inDependenciesArray = false; // Reset
        continue;
      }

      if (line.startsWith('dependencies =') || line.startsWith('requires =')) {
        inDependenciesArray = true;
      }

      if (inPoetryDependencies) {
        const poetryMatch = /^([A-Za-z0-9_.-]+)\s*=\s*(["'].+["']|{.+})/.exec(line);
        if (poetryMatch) {
          const dep = poetryMatch[1];
          const val = poetryMatch[2];
          if (!val.includes('==') && !val.includes('git') && !val.includes('path')) {
            if (val.match(/["'][\^~<>\*]/) || val === '"*"') {
               findings.push(createFinding(dep, 'pyproject.toml', relativePath, lineNum));
            }
          }
        }
      } else if (inDependenciesArray) {
        const pep621Match = /["']([A-Za-z0-9_.-]+)(.*?)["']/.exec(line);
        if (pep621Match) {
           const dep = pep621Match[1];
           const spec = pep621Match[2];
           if (spec && !spec.includes('==') && !spec.includes('@')) {
              findings.push(createFinding(dep, 'pyproject.toml', relativePath, lineNum));
           } else if (!spec && (line.includes(`"${dep}"`) || line.includes(`'${dep}'`))) {
              findings.push(createFinding(dep, 'pyproject.toml', relativePath, lineNum));
           }
        }
      }

      if (inDependenciesArray && line.includes(']')) {
        inDependenciesArray = false;
      }
    }
  } catch {
    // Ignore read errors
  }
  return findings;
}

const rule: Rule = {
  id: 'OPK-004',
  name: 'Unpinned Dependency Versions',
  category: 'supply-chain',
  severity: 'warning',
  description: 'Detects dependency versions that use wildcards, ranges, tags, or partial versions.',
  remediation: 'Pin dependencies to exact versions for reproducible installs.',

  async check(context: ScanContext): Promise<RuleFinding[]> {
    const findings: RuleFinding[] = [];

    for (const relativePath of context.files) {
      const baseName = path.basename(relativePath);
      const absPath = path.join(context.rootDir, relativePath);

      if (baseName === 'package.json') {
        const manifest = readManifest(absPath);
        if (manifest) {
          findings.push(...checkManifest(manifest, relativePath));
        }
      } else if (baseName === 'requirements.txt' || baseName.endsWith('.txt') && baseName.includes('requirements')) {
        findings.push(...checkRequirementsTxt(absPath, relativePath));
      } else if (baseName === 'pyproject.toml') {
        findings.push(...checkPyprojectToml(absPath, relativePath));
      }
    }

    return findings;
  },
};

export default rule;
