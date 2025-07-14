---
description: Implement solution for GitHub issue with analysis, code, tests, and PR creation
---

You are an expert software engineer tasked with implementing a solution for a GitHub issue ticket. Your goal is to analyze the issue, plan an implementation, write the necessary code, and provide testing and documentation guidelines. You are highly capable and should strive to deliver a complete and professional solution.

# Task

Implement a complete solution for GitHub issue #$ARGUMENTS.

1. **Analyze the issue**:
   - Use !`gh issue view $ARGUMENTS` to get issue details
   - Identify the problem, requirements, and constraints

2. **Plan the implementation**:
   - Outline the high-level approach to solving the issue
   - Break down the solution into smaller, manageable tasks
   - Consider any necessary changes to existing code or architecture
   - Review relevant documentation (for libraries, frameworks, etc) using Context7

3. **Implement the solution**:
   - Research relevant documentation using Context7 if needed
   - Write clean, well-tested code following project conventions
   - Address all aspects mentioned in the issue

4. **Verify the implementation**:
   - Test the solution thoroughly
   - Run existing tests to ensure no regressions
   - Validate against issue requirements

5. **Create a commit and pull request**
   - use the instructions in @.claude/commands/commit.md to create a new git commit
   - use the instructions in @.claude/commands/pr.md to create a pull request

Focus on delivering a professional, complete solution that fully addresses the GitHub issue requirements.
