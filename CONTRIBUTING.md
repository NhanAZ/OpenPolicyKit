# Contributing to OpenPolicyKit

## Development setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Run tests: `npm test`
5. Run the scanner: `npm run scan`

## Adding a new rule

1. Create a new file in `src/rules/` following the naming convention: `opk-NNN-short-name.ts`
2. Implement the `Rule` interface from `src/types.ts`
3. Register the rule in `src/rules/index.ts`
4. Add test fixtures in `tests/fixtures/`
5. Add tests in `tests/rules/`
6. Update documentation if needed

## Code standards

- Read `AGENTS.md` before contributing
- TypeScript strict mode
- No external runtime dependencies without justification
- Every rule must have tests (positive and negative cases)
- Conventional commits: `feat:`, `fix:`, `test:`, `docs:`, `ci:`

## Pull requests

- One logical change per PR
- Keep changes small (< 300 lines, < 10 files)
- All tests must pass
- Include a clear description of what changed and why
