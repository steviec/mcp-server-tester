# Commit Message Prompt Testing

## Prompt V1 (Current - TOO VERBOSE):

"Generate commit message based on changes: Use conventional commit format with detailed bullet points"

## Prompt V2 (Concise):

"Generate a concise commit message. Format: `<type>: <description>`. Keep description under 50 chars. Add 1-2 sentence body only if needed to explain WHY, never WHAT."

## Prompt V3 (Business-focused):

"Write a commit message focusing on user/business impact, not implementation details. Format: `<type>: <description>`. Avoid mentioning files, methods, or technical specifics."

## Prompt V4 (Minimal):

"Generate commit message: `<type>: <description>`. Description should be concise and focus on the purpose/benefit, not implementation. Single line preferred."

## Test with recent changes:

**Changes:** Added `stage_fixed: true` to lefthook.yml format and lint commands

**V1 Result:** (too verbose - current behavior)
**V2 Result:** `feat: auto-fix formatting and linting in pre-commit`
**V3 Result:** `feat: implement auto-fixing pre-commit hooks`  
**V4 Result:** `feat: auto-fix pre-commit formatting and linting`
