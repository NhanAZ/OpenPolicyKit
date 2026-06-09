import * as path from 'path';
import { scan } from '../scanner';
import { formatText } from '../reporters/text';
import { formatJson } from '../reporters/json';

function getVersion(): string {
  const packageJsonPath = path.resolve(__dirname, '..', '..', '..', 'package.json');
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require(packageJsonPath) as { version: string };
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}

function printHelp(): void {
  const version = getVersion();
  const help = `OpenPolicyKit v${version}

Scan your repository for risks introduced by AI coding agents.

Usage:
  opk scan [path]     Scan a directory (default: current directory)
  opk --version       Show version
  opk --help          Show this help

Scan options:
  --json              Output findings as JSON
  --min-severity <level>  Filter by minimum severity (info, warning, error)

Examples:
  opk scan
  opk scan ./src
  opk scan --json
  opk scan ./src --min-severity error`;

  process.stdout.write(help + '\n');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    if (args.length > 0 && args[0] === 'scan' && !args.includes('--help') && !args.includes('-h')) {
      // Fall through to scan
    } else {
      printHelp();
      process.exit(0);
    }
  }

  if (args.includes('--version') || args.includes('-v')) {
    process.stdout.write(getVersion() + '\n');
    process.exit(0);
  }

  const command = args[0];

  if (command === 'scan') {
    const useJson = args.includes('--json');
    const showHelp = args.includes('--help') || args.includes('-h');

    if (showHelp) {
      printHelp();
      process.exit(0);
    }

    let scanPath = process.cwd();
    let minSeverity: 'info' | 'warning' | 'error' = 'info';

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--min-severity') {
        if (i + 1 < args.length) {
          const val = args[i + 1];
          if (val === 'info' || val === 'warning' || val === 'error') {
            minSeverity = val;
            i++; // skip value
            continue;
          } else {
            process.stderr.write(`Error: Invalid --min-severity value: ${val}. Expected info, warning, or error.\n`);
            process.exit(2);
          }
        } else {
          process.stderr.write('Error: --min-severity requires a value (info, warning, or error).\n');
          process.exit(2);
        }
      } else if (arg !== '--json' && !arg.startsWith('-')) {
        scanPath = path.resolve(arg);
      }
    }

    const result = await scan(scanPath, minSeverity);

    if (useJson) {
      process.stdout.write(formatJson(result) + '\n');
    } else {
      process.stdout.write(formatText(result) + '\n');
    }

    if (result.findings.length > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } else {
    process.stderr.write(`Unknown command: ${command}\n`);
    process.stderr.write('Run "opk --help" for usage information.\n');
    process.exit(2);
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Error: ${message}\n`);
  process.exit(2);
});
