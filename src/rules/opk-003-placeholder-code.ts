import * as fs from 'fs';
import * as path from 'path';
import { Rule, RuleFinding, ScanContext } from '../types';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist']);
const MAX_FILE_SIZE = 1_000_000;

interface PlaceholderPattern {
  regex: RegExp;
  label: string;
}

const PLACEHOLDER_PATTERNS: PlaceholderPattern[] = [
  { regex: /TODO:\s*implement/i, label: 'Placeholder: TODO implement' },
  { regex: /TODO:\s*fill/i, label: 'Placeholder: TODO fill' },
  { regex: /TODO:\s*add\b/i, label: 'Placeholder: TODO add' },
  { regex: /TODO:\s*complete/i, label: 'Placeholder: TODO complete' },
  { regex: /FIXME:\s*implement/i, label: 'Placeholder: FIXME implement' },
  { regex: /FIXME:\s*fill/i, label: 'Placeholder: FIXME fill' },
  { regex: /HACK:/i, label: 'Placeholder: HACK marker' },
  { regex: /\/\/\s*implement this/i, label: 'Placeholder: "implement this" comment' },
  { regex: /\/\/\s*fill this in/i, label: 'Placeholder: "fill this in" comment' },
  { regex: /\/\/\s*add implementation/i, label: 'Placeholder: "add implementation" comment' },
  { regex: /\/\/\s*complete this/i, label: 'Placeholder: "complete this" comment' },
  { regex: /\/\/\s*placeholder/i, label: 'Placeholder: "placeholder" comment' },
  { regex: /\/\/\s*stub\b/i, label: 'Placeholder: "stub" comment' },
  { regex: /throw\s+new\s+Error\(\s*['"`]Not implemented['"`]\s*\)/i, label: 'Placeholder: throws "Not implemented" error' },
  { regex: /pass\s+#\s*TODO/i, label: 'Placeholder: Python pass with TODO' },
  { regex: /raise\s+NotImplementedError/i, label: 'Placeholder: Python NotImplementedError' },
  { regex: /console\.log\(\s*['"`]TODO['"`]\s*\)/i, label: 'Placeholder: console.log TODO' },
  { regex: /\/\/\s*\.\.\.\s*rest of implementation/i, label: 'Placeholder: "rest of implementation" comment' },
  { regex: /\/\/\s*\.\.\.\s*more code here/i, label: 'Placeholder: "more code here" comment' },
  { regex: /\/\/\s*\.\.\.\s*etc\./i, label: 'Placeholder: "etc." comment' },
];

const SKIP_EXTENSIONS = new Set(['.exe', '.dll', '.so', '.dylib', '.bin', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4', '.avi', '.mov', '.zip', '.tar', '.gz', '.7z', '.rar', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']);

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

  return false;
}

function isBinaryContent(buffer: Buffer): boolean {
  const checkLength = Math.min(buffer.length, 8000);
  for (let i = 0; i < checkLength; i++) {
    if (buffer[i] === 0) {
      return true;
    }
  }
  return false;
}

function isSpecificTodo(line: string): boolean {
  const todoMatch = /TODO\s*\(/.exec(line);
  if (todoMatch) {
    return true;
  }
  return false;
}

const rule: Rule = {
  id: 'OPK-003',
  name: 'Placeholder Implementation',
  category: 'code-quality',
  severity: 'warning',
  description: 'Detects placeholder implementation text such as TODO stubs, empty function bodies, and not-implemented errors.',
  remediation: 'Replace placeholder code with a complete implementation or remove the placeholder.',

  async check(context: ScanContext): Promise<RuleFinding[]> {
    const findings: RuleFinding[] = [];

    for (const relativePath of context.files) {
      if (shouldSkipFile(relativePath)) {
        continue;
      }

      const absolutePath = path.join(context.rootDir, relativePath);

      let content: string | undefined;
      if (context.getFileContent) {
        content = await context.getFileContent(relativePath);
        if (content === undefined) continue;
      } else {
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

        content = buffer.toString('utf-8');
      }

      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;

        if (isSpecificTodo(line)) {
          continue;
        }

        for (const pattern of PLACEHOLDER_PATTERNS) {
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
      }
    }

    return findings;
  },
};

export default rule;
