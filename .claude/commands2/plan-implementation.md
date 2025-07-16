---
description: Generate detailed technical implementation plan just before coding begins
---

# Task

Create a comprehensive technical implementation plan for a GitHub issue, designed to be executed right before coding begins.

## Context

- Current issue details: !`gh issue view $ISSUE_NUMBER`
- Current codebase structure: !`find src -name "*.ts" -type f | head -20`
- Project architecture: @.claude/context/architecture.md

## Your task

1. **Analyze issue requirements**:
   - Read the issue to understand business requirements and success criteria
   - Identify the scope and constraints specified
   - Note any dependencies mentioned

2. **Assess current codebase**:
   - Review existing architecture and patterns
   - Identify which files/modules will need changes
   - Check for existing similar implementations
   - Look for relevant tests and configuration

3. **Generate technical plan**:
   - Break down into specific implementation steps
   - List files that need to be created/modified
   - Identify required interfaces, types, classes
   - Plan testing strategy and test files needed
   - Note any architectural decisions or trade-offs

4. **Present plan for approval**:
   - Show complete implementation approach
   - Explain technical decisions and alternatives considered
   - Wait for user approval before proceeding

5. **Save approved plan**:
   - Create file: `.claude/plans/issue-{ISSUE_NUMBER}.md`
   - Include implementation steps, file changes, and testing approach
   - Reference this plan in commits and PR

## Plan Template Structure

```markdown
# Implementation Plan: Issue #{NUMBER}

## Summary

Brief technical summary of what will be built

## Architecture Decisions

- Key technical choices and rationale
- Alternatives considered

## Implementation Steps

1. Step-by-step implementation approach
2. Order of operations and dependencies
3. Validation points along the way

## Files to Change

### New Files

- `path/to/new/file.ts` - Purpose and key exports

### Modified Files

- `path/to/existing/file.ts` - Changes needed

## Testing Strategy

- Unit tests required
- Integration tests needed
- Manual testing steps

## Risks and Considerations

- Potential blockers or edge cases
- Performance implications
- Breaking changes
```

## Usage

Run this command when ready to start implementation work on an issue:

```bash
# Set issue number and run planning
export ISSUE_NUMBER=123
claude run plan-implementation
```

## Important Notes

- Only run this when ready to code - not during issue creation
- User must approve plan before any implementation begins
- Plan becomes the source of truth for implementation approach
- Reference plan in commits: "Implements step 2 of issue-123 plan"
