# Commit Message Examples

## Good Examples with Subsections

### Multiple Related Features

```
feat: enhance eval testing capabilities

- Remove json-schema scorer (doesn't serve realistic use case)
- Add auto-fixing pre-commit hooks
- Improve commit message guidelines
```

### Different Areas of Impact

```
fix: resolve authentication and validation issues

- Fix token validation logic
- Update error handling for expired sessions
- Improve user feedback for auth failures
```

### Single Focused Change

```
feat: implement auto-fixing pre-commit hooks

Pre-commit hooks now automatically fix and re-stage formatting and linting issues.
```

## Bad Examples (Too Technical)

```
feat: implement auto-fixing pre-commit hooks

- Add stage_fixed: true to format and lint commands in lefthook.yml
- Update runJsonSchemaScorer method in EvalTestRunner class
- Modify test-config.json schema validation
```

## Guidelines

- Use bullets when there are 2+ distinct logical subsections
- Each bullet should describe a user-facing change or benefit
- Avoid implementation details (file names, method names, etc.)
- Focus on WHAT the user gets, not HOW it's implemented
