import * as fs from 'fs';
import * as path from 'path';
import { Rule, RuleFinding, ScanContext } from '../types';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist']);
const SKIP_EXTENSIONS = new Set(['.exe', '.dll', '.so', '.dylib', '.bin', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4', '.avi', '.mov', '.zip', '.tar', '.gz', '.7z', '.rar', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']);
const MAX_FILE_SIZE = 1_000_000;

interface KeyPattern {
  regex: RegExp;
  label: string;
}

const KEY_PATTERNS: KeyPattern[] = [
  { regex: /sk-proj-[a-zA-Z0-9_-]{20,}/, label: 'Possible hardcoded OpenAI project API key' },
  { regex: /sk-ant-[a-zA-Z0-9_-]{20,}/, label: 'Possible hardcoded Anthropic API key' },
  { regex: /Bearer\s+sk-/, label: 'Possible hardcoded Bearer token with OpenAI key' },
  { regex: /sk-[a-zA-Z0-9]{20,}/, label: 'Possible hardcoded OpenAI API key' },
];

const CREDENTIAL_VAR_NAMES = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'COHERE_API_KEY',
  'AI21_API_KEY',
  'HUGGINGFACE_API_KEY',
  'REPLICATE_API_TOKEN',
  'MISTRAL_API_KEY',
  'GROQ_API_KEY',
];

function buildCredentialVarRegex(): RegExp {
  const names = CREDENTIAL_VAR_NAMES.join('|');
  return new RegExp(`(?:${names})\\s*=\\s*["'\`]([^"'\`]+)["'\`]`);
}

const CREDENTIAL_VAR_REGEX = buildCredentialVarRegex();

function shouldSkipFile(relativePath: string): boolean {
  const parts = relativePath.split(path.sep);
  for (const part of parts) {
    if (SKIP_DIRS.has(part)) {
      return true;
    }
  }

  const ext = path.extname(relativePath).toLowerCase();
  if (SKIP_EXTENSIONS.has(ext)) {
    return true;
  }

  const baseName = path.basename(relativePath).toLowerCase();
  if (baseName === '.env' || baseName === '.env.example' || baseName === '.env.local' || baseName === '.env.development' || baseName === '.env.production' || baseName === '.env.test') {
    return true;
  }
  if (baseName.startsWith('.env.') || baseName === '.env') {
    return true;
  }

  return false;
}

function isBinaryContent(buffer: Buffer): boolean {
  const checkLength = Math.min(buffer.length, 8000);
  for (let i = 0; i < checkLength; i++) {
    const byte = buffer[i];
    if (byte === 0) {
      return true;
    }
  }
  return false;
}

const rule: Rule = {
  id: 'OPK-001',
  name: 'Hardcoded AI Credentials',
  category: 'security',
  severity: 'error',
  description: 'Detects hardcoded AI service API keys and credentials in source files.',
  remediation: 'Remove hardcoded credentials and use environment variables or a secrets manager instead.',

  async check(context: ScanContext): Promise<RuleFinding[]> {
    const findings: RuleFinding[] = [];

    for (const relativePath of context.files) {
      if (shouldSkipFile(relativePath)) {
        continue;
      }

      const absolutePath = path.join(context.rootDir, relativePath);

      let stat: fs.Stats;
      try {
        stat = fs.statSync(absolutePath);
      } catch {
        continue;
      }

      if (stat.size > MAX_FILE_SIZE || stat.size === 0) {
        continue;
      }

      let buffer: Buffer;
      try {
        buffer = fs.readFileSync(absolutePath);
      } catch {
        continue;
      }

      if (isBinaryContent(buffer)) {
        continue;
      }

      const content = buffer.toString('utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;

        for (const pattern of KEY_PATTERNS) {
          if (pattern.regex.test(line)) {
            findings.push({
              ruleId: rule.id,
              ruleName: rule.name,
              severity: rule.severity,
              message: pattern.label,
              filePath: relativePath,
              line: lineNumber,
              category: rule.category,
              remediation: rule.remediation,
            });
            break;
          }
        }

        const varMatch = CREDENTIAL_VAR_REGEX.exec(line);
        if (varMatch) {
          const value = varMatch[1];
          if (!value.startsWith('process.env') && !value.startsWith('${') && value.trim().length > 0) {
            const matchedVarName = CREDENTIAL_VAR_NAMES.find((name) => line.includes(name));
            const label = matchedVarName
              ? `Possible hardcoded credential in ${matchedVarName}`
              : 'Possible hardcoded AI service credential';

            const alreadyReported = findings.some(
              (f) => f.filePath === relativePath && f.line === lineNumber,
            );
            if (!alreadyReported) {
              findings.push({
                ruleId: rule.id,
                ruleName: rule.name,
                severity: rule.severity,
                message: label,
                filePath: relativePath,
                line: lineNumber,
                category: rule.category,
                remediation: rule.remediation,
              });
            }
          }
        }
      }
    }

    return findings;
  },
};

export default rule;
