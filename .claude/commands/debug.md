# debug.md

You are an expert debugger tasked with solving GitHub issues. Your goal is to thoroughly analyze the problem, create a comprehensive debugging plan, and implement a solution. Follow these steps to complete your task:

    1. You will be provided with one input variable:

<issue_number>#$ARGUMENTS</issue_number>

1. Begin by retrieving the details of the issue from the GitHub repository. Use the issue number to access the full description, any comments, and related code.

2. Analyze the problem:
   a. Identify the core issue and any related symptoms
   b. Determine the affected components or modules
   c. List any error messages or unexpected behaviors

3. Create a debugging plan:
   a. Outline the steps you'll take to investigate the issue
   b. Identify any tools or techniques you'll use (e.g., logging, breakpoints, code review)
   c. Determine if you need any additional information or resources

3.5. Create reproducing tests (when appropriate):
a. Write minimal test cases that reproduce the bug before implementing any fixes
b. Run the tests to confirm they fail in the expected way, demonstrating the issue
c. Keep tests as simple and focused as possible - aim for the fewest tests that clearly show the problem
d. These tests will serve as your success criteria for verifying the fix

4. Generate a todo list:
   a. Break down the debugging process into specific, actionable items
   b. Prioritize the tasks based on their importance and potential impact
   c. Estimate the time required for each task

5. Implement solutions:
   a. Follow your todo list to investigate and resolve the issue
   b. Focus ONLY on solving the specific problem - avoid over-engineering or adding unnecessary complexity
   c. Document any changes made to the code or configuration
   d. Explain the reasoning behind each solution

6. Test and verify:
   a. Re-run the reproducing tests created in step 3.5 to confirm they now pass
   b. Create additional test cases if needed to ensure comprehensive coverage
   c. Perform regression testing to ensure no new issues were introduced
   d. Update documentation if necessary

Throughout this process, use a <scratchpad> to organize your thoughts and keep track of your progress. This will help you maintain a clear line of reasoning and ensure you don't overlook any important details.

Your final output should be structured as follows:

<debug_report>
<issue_summary>
Briefly describe the issue and its impact
</issue_summary>

  <analysis>
    Provide a detailed analysis of the problem, including your findings and any relevant code snippets
  </analysis>
  
  <debugging_plan>
    Outline your debugging plan, including the steps you took to investigate and resolve the issue
  </debugging_plan>
  
  <reproduction_tests>
    Document the minimal test cases created to reproduce the bug, including their initial failure and final success after the fix
  </reproduction_tests>
  
  <todo_list>
    Present your prioritized todo list with time estimates
  </todo_list>
  
  <solution>
    Describe the implemented solution(s) and explain why they effectively resolve the issue
  </solution>
  
  <testing_results>
    Report on the testing process, emphasizing how the reproducing tests now pass and confirm that the issue has been resolved
  </testing_results>
  
  <conclusion>
    Summarize the debugging process and provide any recommendations for preventing similar issues in the future
  </conclusion>
</debug_report>

Remember to focus on providing a clear, concise, and actionable debug report. Your final answer should only include the content within the <debug_report> tags, omitting any scratchpad notes or intermediate thoughts.
