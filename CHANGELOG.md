# Changelog

All notable changes to OpenPolicyKit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-06-09

### Added
- Python ecosystem support (`requirements.txt`, `pyproject.toml`) for OPK-004.
- Severity filtering via the `--min-severity` CLI option.
- File/path exclusion support using regex patterns via `opk.config.json` (`exclude` field).
- Comprehensive end-to-end integration test suite for the CLI.

### Changed
- Performance optimization: File discovery and disk I/O are now batched/chunked and cached to prevent redundant reads when multiple rules scan the same large repositories.

## [0.2.0] - 2026-06-09

### Added
- Rule **OPK-004**: Wildcard/unpinned dependency versions.
- Rule **OPK-005**: Risky CI/CD workflow changes.
- Rule **OPK-006**: Hallucinated dependencies (validates packages against npm registry).
- Rule **OPK-007**: Large generated files.
- Local configuration support via `opk.config.json`. Rules can now be explicitly enabled or disabled using the `rules` object.

### Changed
- Improved CLI text output formatting for readability.

## [0.1.0] - 2026-06-09

### Added
- Initial core architecture for the OpenPolicyKit (OPK) scanner.
- Basic CLI functionality: `opk scan [path]` and `--json` flag.
- Built-in Exit Codes mapping to scanning results (0 = clean, 1 = findings, 2 = error).
- Rule **OPK-001**: Hardcoded AI credentials.
- Rule **OPK-002**: AI prompt artifacts.
- Rule **OPK-003**: Placeholder implementation code.
- Test scaffolding and GitHub Actions CI integrations.
