---
description: Create streamlined GitHub issues focused on business requirements (PRD-style)
---

# Task

Create a concise, business-focused GitHub issue that serves as a Product Requirements Document (PRD).

## Context

- Repository structure: !`find . -name "*.md" -o -name "CONTRIBUTING*" -o -name "ISSUE_TEMPLATE*" | head -10`
- Existing issues for reference: !`gh issue list --limit 5`

## Your task

1. **Gather requirements**:
   - Ask user for problem statement and business need
   - Clarify expected user outcomes and success criteria
   - Identify dependencies and constraints
   - Wait for user response before proceeding

2. **Research project conventions**:
   - Examine repository for existing patterns and standards
   - Look for naming conventions and submission requirements
   - Keep research brief - focus on structure over implementation

3. **Draft streamlined issue** using template: @.claude/commands2/ISSUE_TEMPLATE.md:
   - **Problem Statement**: Clear user need or business problem
   - **Success Criteria**: Functional outcomes (not technical implementation)
   - **Scope**: Boundaries and what's included/excluded
   - **Dependencies**: Blockers and prerequisite work
   - **Notes**: Any additional context needed

4. **Keep it concise**:
   - Focus on WHAT and WHY, not HOW
   - No code examples or technical architecture
   - No detailed acceptance criteria or implementation steps
   - Target 50-100 lines total (vs 300+ in current issues)

5. **Get approval and create**:
   - Show draft for user review
   - Use !`gh issue create` with approved content
   - Add "ready-for-planning" label to indicate technical planning needed

## Important Notes

- This issue serves as the PRD - technical planning happens separately when work begins
- Implementation details will be generated just-in-time via `/plan-implementation` command
- Keep focused on business value and user outcomes
