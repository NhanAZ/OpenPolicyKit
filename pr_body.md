## What changed
Refactored the default text reporter (`src/reporters/text.ts`) to group findings by file and use ANSI colors for improved readability.

## Why
The previous output format printed each finding on a new line with the file path at the end, which became difficult to read when there were multiple findings. By grouping findings under their respective file paths (similar to ESLint and modern CLI tools), the output is much cleaner and easier to parse visually. ANSI colors help quickly distinguish between errors, warnings, and informational messages.

## Testing
```
has-ai-comment.ts
  1  warning  AI prompt artifact: "As an AI assistant"  OPK-002

has-generated-note.py
  1  warning  AI prompt artifact: "This code was generated"  OPK-002

✖ 2 warnings in 13.0s
```
(All 37 unit tests pass)

## Risks
If a terminal does not support ANSI escape codes, the output will contain raw escape characters. This is mitigated by checking `process.env.NO_COLOR` and `process.env.TERM === 'dumb'`, which disables colored output in such environments.

## Follow-up
Publish the `v0.2.0` release to npm.
