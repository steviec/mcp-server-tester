---
description: Create a well-structured GitHub issue for feature requests, bug reports, or improvements
---

# Task

Create a comprehensive GitHub issue.

## Context

- Repository structure: !`find . -name "*.md" -o -name "CONTRIBUTING*" -o -name "ISSUE_TEMPLATE*" | head -10`
- Existing issues for reference: !`gh issue list --limit 5`

## Your task

1. **Ask the user for additional details**:
   - Request clarification on requirements, expected behavior, or reproduction steps
   - Wait for user response before proceeding

2. **Research project conventions**:
   - Examine repository structure, existing issues, and documentation
   - Look for issue templates, contributing guidelines, or project-specific requirements
   - Note coding style, naming conventions, and submission requirements

3. **Draft the GitHub issue**:
   - Create clear title and detailed description
   - Include acceptance criteria and relevant context
   - Use appropriate Markdown formatting for readability
   - Add labels (`bug` or `enhancement`) based on issue type

4. **Get user approval**:
   - Present the complete issue content for review
   - Wait for user confirmation before creating

5. **Create the issue**:
   - Use !`gh issue create` with the approved content
   - Assign appropriate labels and metadata
