## What changed
Added OPK-006 rule to detect dependencies in package.json that do not exist on the public npm registry.

## Why
AI coding agents often hallucinate dependencies that sound plausible but don't actually exist. This rule catches these before they break the build or introduce confusion.

## Testing
```
> openpolicykit@0.1.0 build
> tsc

> openpolicykit@0.1.0 lint
> tsc --noEmit

> openpolicykit@0.1.0 test
> node --test dist/tests/**/*.test.js

▶ OPK-006: Hallucinated Dependencies
  ✔ should flag packages that return 404 from npm registry (9.7743ms)
  ✔ should ignore packages on network errors (fail open) (5.2281ms)
  ✔ should have correct rule metadata (0.3458ms)
✔ OPK-006: Hallucinated Dependencies (18.9964ms)
ℹ tests 29
ℹ suites 5
ℹ pass 29
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 259.7831
```

## Risks
If the npm registry is down, or if the scanner is run in an offline environment, the rule is designed to "fail open" (assume packages exist) to avoid false positives. It might produce false positives for private packages published to a custom registry if they do not exist on the public npm registry.

## Follow-up
Implement configuration file support (`opk.config.json`) to allow users to disable specific rules or configure private registries.
