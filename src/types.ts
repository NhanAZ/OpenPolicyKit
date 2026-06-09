export type Severity = 'error' | 'warning' | 'info';

export interface RuleFinding {
  ruleId: string;
  ruleName: string;
  severity: Severity;
  message: string;
  filePath: string;
  line?: number;
  category: string;
  remediation: string;
}

export interface ScanContext {
  /** Absolute path to the root directory being scanned */
  rootDir: string;
  /** List of file paths relative to rootDir */
  files: string[];
  /** Optional file cache accessor to improve I/O performance */
  getFileContent?: (relativePath: string) => Promise<string | undefined>;
}

export interface Rule {
  id: string;
  name: string;
  category: string;
  severity: Severity;
  description: string;
  remediation: string;
  check(context: ScanContext): Promise<RuleFinding[]>;
}

export interface ScanResult {
  findings: RuleFinding[];
  scannedFiles: number;
  rulesRun: number;
  durationMs: number;
}
