# Roadmap

## v0.1.0 - Foundation (current)

- [x] CLI: `opk scan [path]`
- [x] Text output
- [x] JSON output (`--json`)
- [x] Exit codes (0 = clean, 1 = findings, 2 = error)
- [x] Rule: OPK-001 - Hardcoded AI credentials
- [x] Rule: OPK-002 - AI prompt artifacts
- [x] Rule: OPK-003 - Placeholder implementation code
- [x] Tests for all rules
- [x] GitHub Actions CI

## v0.2.0 - Core expansion

- [x] Rule: OPK-004 - Wildcard/unpinned dependency versions
- [x] Rule: OPK-005 - Risky CI/CD workflow changes
- [x] Rule: OPK-006 - Hallucinated dependencies (npm registry check)
- [x] Rule: OPK-007 - Large generated files
- [x] Configuration file (`opk.config.json`) for rule enable/disable
- [ ] Improved text output formatting
- [ ] npm package published

## v0.3.0 - Polish

- [ ] Python ecosystem support (`requirements.txt`, `pyproject.toml`)
- [ ] Severity filtering (`--min-severity`)
- [ ] File/path exclusion patterns
- [ ] Performance optimization for large repositories
- [ ] More comprehensive test fixtures

## Future (not committed)

- SARIF output
- GitHub Action on marketplace
- Pre-commit hook integration
- Additional ecosystem support (Go, Rust, Java)

## Explicitly deferred

These are intentionally not planned:

- Web UI or dashboard
- Plugin system
- IDE extensions
- Hosted service or user accounts
- Telemetry or analytics
- Enterprise-exclusive features
- Configuration DSL
