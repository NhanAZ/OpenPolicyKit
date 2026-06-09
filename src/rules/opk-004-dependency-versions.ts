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
  sectionName: DependencySection,
  relativePath: string,
): RuleFinding {
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    severity: rule.severity,
    message: `Dependency "${dependencyName}" in ${sectionName} is not pinned to an exact version`,
    filePath: relativePath,
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

const rule: Rule = {
  id: 'OPK-004',
  name: 'Unpinned Dependency Versions',
  category: 'supply-chain',
  severity: 'warning',
  description: 'Detects npm dependency versions that use wildcards, ranges, tags, or partial versions.',
  remediation: 'Pin registry dependencies to exact semantic versions for reproducible installs.',

  async check(context: ScanContext): Promise<RuleFinding[]> {
    const findings: RuleFinding[] = [];

    for (const relativePath of context.files) {
      if (path.basename(relativePath) !== 'package.json') {
        continue;
      }

      const manifest = readManifest(path.join(context.rootDir, relativePath));
      if (manifest) {
        findings.push(...checkManifest(manifest, relativePath));
      }
    }

    return findings;
  },
};

export default rule;
