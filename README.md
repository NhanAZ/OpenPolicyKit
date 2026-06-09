# OpenPolicyKit

Scan your repository for risks introduced by AI coding agents that generic linters miss.

```
$ npx opk scan .

  ⚠ OPK-001  Possible hardcoded OpenAI API key              src/config.ts:42
  ⚠ OPK-002  AI prompt artifact: "As an AI assistant"        lib/utils.js:7
  ✖ OPK-003  Placeholder: TODO implement                     src/handler.ts:23

3 findings in 0.8s
```

## What it detects

| Rule | Name | What it catches |
|------|------|-----------------|
| OPK-001 | Hardcoded AI credentials | API keys for OpenAI, Anthropic, Cohere, and other AI services left in source |
| OPK-002 | AI prompt artifacts | Prompt fragments like "As an AI assistant" or "I'm a language model" in code |
| OPK-003 | Placeholder code | TODO stubs, empty function bodies, and "fill this in" placeholders |
| OPK-004 | Unpinned dependency versions | Wildcards, ranges, tags, and partial versions in npm dependency sections |
| OPK-005 | Risky CI/CD workflows | Privileged triggers, broad permissions, floating action refs, and pipe-to-shell installs |

## Quick start

```bash
# Run directly with npx (no install needed)
npx openpolicykit scan .

# Or install globally
npm install -g openpolicykit
opk scan .

# Scan a specific directory
opk scan src/
```

Requires Node.js 18 or later.

## CI usage

Add OpenPolicyKit to your GitHub Actions workflow:

```yaml
- name: Run OpenPolicyKit
  run: npx openpolicykit scan . --json > opk-report.json

- name: Check for findings
  run: |
    node -e "
      const report = require('./opk-report.json');
      if (report.summary.total > 0) {
        console.log(report.summary.total + ' finding(s) detected');
        process.exit(1);
      }
    "
```

## JSON output

Use `--json` for machine-readable output:

```bash
opk scan . --json
```

```json
{
  "findings": [
    {
      "ruleId": "OPK-001",
      "ruleName": "ai-credentials",
      "severity": "warning",
      "message": "Possible hardcoded OpenAI API key",
      "filePath": "src/config.ts",
      "line": 42,
      "category": "security",
      "remediation": "Use environment variables or a secrets manager instead of hardcoding API keys."
    }
  ],
  "summary": {
    "total": 1,
    "errors": 0,
    "warnings": 1,
    "infos": 0,
    "scannedFiles": 42,
    "rulesRun": 3,
    "durationMs": 800
  }
}
```

### Exit codes

| Code | Meaning |
|------|---------|
| 0 | No findings |
| 1 | Findings detected |
| 2 | Scanner error |

## Configuration

No configuration file is needed. OpenPolicyKit ships with sensible defaults and runs all rules out of the box.

Configuration file support is planned for a future release. See [ROADMAP.md](ROADMAP.md).

## What this is NOT

OpenPolicyKit is **not** a replacement for ESLint, Semgrep, or SonarQube.

It complements them by catching risks specific to AI-assisted development - hallucinated dependencies, prompt artifacts, placeholder code, unsafe generated patterns, and unreviewable diffs. Run it alongside your existing tools, not instead of them.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code standards, and how to add new rules.

## License

[MIT](LICENSE)
