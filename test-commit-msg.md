# Test Commit Message Generation

## Bad Examples (current):

```
feat: implement auto-fixing pre-commit hooks

- Add stage_fixed: true to format and lint commands in lefthook.yml
- Pre-commit hooks now automatically fix formatting and linting issues
- Fixed files are automatically re-staged for commit
- Eliminates the need for manual fix-restage-retry cycles
- Typecheck and test remain as validation-only hooks
```

## Good Examples:

```
feat: implement auto-fixing pre-commit hooks

Pre-commit hooks now automatically fix and re-stage formatting and linting issues.
```

```
refactor: remove json-schema scorer from eval testing

JSON schema validation doesn't serve a realistic use case for LLM response evaluation.
```

## Guidelines:

- Single line description preferred
- If body needed, 1-2 sentences max
- Focus on business value/reasoning, not implementation
- Never list file names, method names, or technical details
- Explain WHY, not WHAT
