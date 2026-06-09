# AGENTS.md - OpenPolicyKit Development Protocol

This file contains rules and conventions for all contributors,
including AI coding agents. **Read this file completely before
making any changes to this repository.**

## Project identity

OpenPolicyKit is an open-source, local-first, zero-infrastructure
CLI scanner that detects risks introduced by AI coding agents in
repositories. It catches patterns that generic linters miss.

**Positioning**: OpenPolicyKit is not a replacement for ESLint,
Semgrep, or SonarQube. It complements them by catching risks
specific to AI-assisted development - hallucinated dependencies,
prompt artifacts, placeholder code, unsafe generated patterns,
and unreviewable AI-generated diffs.

## Core principles

- Local-first. No required backend, API, or account.
- No telemetry, tracking, or phone-home behavior.
- Works locally and in GitHub Actions.
- Small useful features over large unfinished systems.
- Human-quality code over AI-generated volume.
- Stars, donations, and adoption come from real usefulness - not fake activity.

## Technology stack

- Runtime: Node.js (LTS)
- Language: TypeScript (strict mode)
- Package manager: npm
- Test framework: Node.js built-in test runner (`node --test`)
- Build: tsc
- CLI entry point: `bin/opk`
- No frontend framework. No database. No external services.

## Directory structure

```
src/
  cli/          # CLI entry point and argument parsing
  scanner/      # Core scanning engine
  rules/        # Individual rule implementations
  reporters/    # Output formatters (text, JSON)
  utils/        # Shared utilities
tests/
  rules/        # One test file per rule
  scanner/      # Scanner integration tests
  fixtures/     # Test fixture files
docs/           # Documentation
examples/       # Usage examples
bin/            # CLI executable
```

Do not create directories that are not listed here unless justified
in a PR description and approved by the project owner.

## Rule conventions

- Each rule is a single file in `src/rules/`.
- Rule ID format: `OPK-NNN` (e.g., `OPK-001`). Three-digit, zero-padded.
- Rule IDs are permanent. Never reuse or renumber a rule ID.
- Every rule exports: `id`, `name`, `category`, `severity`,
  `description`, `remediation`, and a `check()` function.
- Every rule has a corresponding test file in `tests/rules/`.
- Rules must not print, log, or expose secret values. Report only:
  file path, line number (if available), rule ID, severity, and message.

### Current rule themes (MVP)

These are the approved rule themes for the initial release. Do not
add rules outside these themes without an approved issue or roadmap item.

1. Hardcoded AI service credentials (OpenAI, Anthropic, Cohere, etc.)
2. AI prompt artifacts left in source files
3. Placeholder implementation text (TODO stubs, empty bodies, "fill this in")
4. Wildcard or unpinned dependency versions
5. Risky changes to CI/CD workflow files or protected paths
6. Hallucinated or suspicious dependencies (packages that don't exist on registries)
7. Large generated files without clear purpose

## Code style

- Use TypeScript strict mode.
- Prefer Node.js built-in modules over external dependencies.
- No `any` types unless absolutely necessary, with a comment explaining why.
- Functions should be small and focused.
- Use descriptive variable names. No single-letter variables except
  in trivial loops (`i`, `j`).
- No commented-out code in committed files.
- No `console.log` for debugging in committed code. Use the project's
  logging utility if one exists.
- Prefer `const` over `let`. Never use `var`.
- Use early returns to reduce nesting.
- Maximum function length: aim for < 40 lines. Extract helpers if longer.

## Adding dependencies

- Minimize external dependencies. Every dependency is a liability.
- Before adding a dependency, check if Node.js built-ins can do the job.
- Every new dependency must be justified in the PR description.
- Pin exact versions in package.json. No `^`, no `~`, no `*`.
- Dev dependencies are more acceptable than runtime dependencies.
- Do not add a dependency that is only used in one place if the
  functionality can be implemented in < 50 lines.

## Git workflow

- Never push directly to the default branch.
- Branch names: `agent/<short-description>` or `fix/<issue-number>-<short-description>`.
- Conventional commits: `feat:`, `fix:`, `test:`, `docs:`, `ci:`, `refactor:`, `chore:`.
- Scope in parentheses when applicable: `feat(rule):`, `fix(scanner):`, `test(cli):`.
- Keep PRs small: aim for < 300 lines changed, < 10 files.
- One logical change per PR.
- Do not bundle formatting changes with feature changes.

## Testing

- Every rule must have tests.
- Tests must include both positive cases (should detect) and
  negative cases (should not detect).
- Use fixture files in `tests/fixtures/` for test inputs.
- Run tests with: `npm test`
- Run linting with: `npm run lint` (if configured)
- All tests must pass before opening a PR.
- Do not skip tests. Do not weaken assertions to make tests pass.
- Test names should describe the expected behavior, not the implementation.

## CLI contract

Once established, these are stable interfaces. Do not break them
without a versioned migration plan approved in an issue.

- `opk scan [path]` - scan a directory (default: current directory)
- `opk scan --json` - output findings as JSON
- Exit code 0: no findings
- Exit code 1: findings detected
- Exit code 2: scanner error
- Text output format: `severity  rule-id  message  file:line`
- JSON output: array of finding objects with a stable, documented schema

## What not to build (until explicitly approved in ROADMAP.md)

- Web UI or dashboard
- Plugin or extension system
- Configuration DSL or complex config format
- IDE extensions or editor integrations
- Hosted service, user accounts, or billing
- Enterprise-exclusive features
- SARIF output (until JSON/text output is solid)
- External rule registry or rule marketplace
- Telemetry, analytics, or usage tracking
- Auto-fix capabilities (detection first)

## What not to do

- Do not add unused files, exports, abstractions, or scaffolding.
- Do not add placeholder features or empty implementations.
- Do not add code without tests.
- Do not add documentation longer than the feature it documents.
- Do not rename or restructure files without functional reason.
- Do not break existing CLI commands, rule IDs, or output formats.
- Do not reformat code outside the scope of your current task.
- Do not introduce new terminology unless it is used consistently
  in both code and documentation.
- Do not add a rule that substantially duplicates an existing rule.

## Public output standards

All commits, PRs, issues, docs, comments, changelogs, and generated
reports must use professional, neutral maintainer language.

Do not include AI-agent branding, model names, or assistant signatures.
Do not include phrases like "generated by AI", "made by Claude",
"made by ChatGPT", "autonomous AI commit", "bot-generated code",
or any variation of these.

Do not fabricate human authorship. Do not fake reviewers, users,
companies, test results, or testimonials. Do not hide known limitations.

The project looks human-quality because it IS reviewed, tested,
purposeful, and coherent - not because anyone lied about how it was made.

## Security

- Never commit secrets, API keys, tokens, or credentials.
- Never print or log secret values in scanner output.
- Treat scanner output as potentially sensitive (it references file paths
  and may quote code snippets).
- Report security vulnerabilities privately via the process described
  in SECURITY.md (if it exists).
