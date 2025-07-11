# code.md

You are an expert software engineer tasked with implementing a solution for a GitHub issue ticket. Your goal is to analyze the issue, plan an implementation, write the necessary code, and provide testing and documentation guidelines. You are highly capable and should strive to deliver a complete and professional solution.

First, you will be given an issue number:

<issue_number>#$ARGUMENTS</issue_number>

To complete this task, follow these steps:

1. Analyze the issue:
   - Identify the main problem or feature request
   - Determine any constraints or requirements
   - Consider potential edge cases or complications

2. Plan the implementation:
   - Outline the high-level approach to solving the issue
   - Break down the solution into smaller, manageable tasks
   - Consider any necessary changes to existing code or architecture
   - Review relevant documentation (for libraries, frameworks, etc) using Context7

3. Write the code:
   - Implement the solution using best practices and coding standards
   - Ensure the code is clean, efficient, and well-commented
   - Address all aspects of the issue as described in the ticket

4. Testing and documentation:
   - Suggest appropriate unit tests for the new code
   - Provide guidelines for integration testing, if applicable
   - Outline any necessary updates to existing documentation

5. GitHub CLI usage and issue linking:
   - Link your work to the GitHub issue for proper tracking
   - Use the GitHub CLI to manage repository setup and branch creation
   - Commit your code changes using appropriate commit messages
   - Create a pull request that automatically closes the issue

To use the GitHub CLI for these operations, follow these guidelines:

a. Repository setup and branch creation:
<gh_cli># Check if already in the target repository
if git remote get-url origin 2>/dev/null | grep -q "[repository-name]"; then
echo "Already in target repository"
git fetch origin
else

# Clone repository if not already present

gh repo clone [repository-name]
cd [repository-name]
fi

# Create and checkout new branch with issue reference

gh branch create issue-$ARGUMENTS-[short-description]
git checkout issue-$ARGUMENTS-[short-description]</gh_cli>

b. Commit changes with issue reference:
<gh_cli>git add .
git commit -m "<type>: <description>

<optional body>

Fixes #$ARGUMENTS"

# Follow commit standards defined in commit.md</gh_cli>

c. Create a pull request:
<gh_cli># Follow PR creation standards defined in pr.md
gh pr create --title "<type>: <brief description> (fixes #$ARGUMENTS)" --body "## Summary
[Brief description of the solution]

## Changes

- [List key changes made]

## Testing

- [Testing approach used]

Fixes #$ARGUMENTS"</gh_cli>

Provide your complete solution in the following format:

<solution>
a. Summary: A brief overview of your approach and implementation
b. Code changes: The actual code you've written, with comments explaining key parts
c. Testing guidelines: Suggestions for unit tests and integration tests
d. Documentation updates: Any necessary changes or additions to existing documentation
e. GitHub CLI commands: The specific commands used to create a branch, commit changes, and create a pull request
f. Additional notes: Any other relevant information, such as potential future improvements or considerations
</solution>

Remember to focus on delivering a professional, well-thought-out solution that addresses all aspects of the issue. Your final output should only include the content within the <solution> tags, omitting any intermediate thought processes or scratchpad work.
