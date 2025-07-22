/**
 * Unit tests for tool call validation logic
 */

import { describe, test, expect } from 'vitest';
import { EvalTestRunner } from '../../src/commands/evals/runner.js';

describe('Tool Call Validation', () => {
  test('should allow required tools even when not explicitly in allowed list', () => {
    // Create a minimal runner instance to test the validation method
    const runner = new EvalTestRunner(
      {
        models: ['claude-3-haiku-20240307'],
        timeout: 30000,
        max_steps: 3,
        tests: [],
      },
      {
        serverCommand: 'node',
        serverArgs: 'test.js',
      }
    );

    // Access the private validateToolCalls method for testing
    const validateToolCalls = (runner as any).validateToolCalls.bind(runner);

    // Test case: tool is required but not in allowed list
    const actualToolCalls = [{ toolName: 'query_docs', args: {} }];

    const expectedToolCalls = {
      required: ['query_docs'],
      allowed: ['other_tool'], // query_docs is NOT in allowed list
    };

    const errors = validateToolCalls(actualToolCalls, expectedToolCalls);

    // This should NOT produce an error because query_docs is required
    // But currently it WILL produce an error, causing this test to fail
    expect(errors).toEqual([]);
  });

  test('should still validate non-required tools against allowed list', () => {
    const runner = new EvalTestRunner(
      {
        models: ['claude-3-haiku-20240307'],
        timeout: 30000,
        max_steps: 3,
        tests: [],
      },
      {
        serverCommand: 'node',
        serverArgs: 'test.js',
      }
    );

    const validateToolCalls = (runner as any).validateToolCalls.bind(runner);

    // Test case: tool is NOT required and NOT in allowed list
    const actualToolCalls = [{ toolName: 'unauthorized_tool', args: {} }];

    const expectedToolCalls = {
      required: ['other_tool'],
      allowed: ['query_docs'], // unauthorized_tool is NOT allowed
    };

    const errors = validateToolCalls(actualToolCalls, expectedToolCalls);

    // This SHOULD produce an error
    expect(
      errors.some(error =>
        error.includes("Tool 'unauthorized_tool' was called but not in allowed list")
      )
    ).toBe(true);
  });

  test('should handle case with only required tools (no allowed list)', () => {
    const runner = new EvalTestRunner(
      {
        models: ['claude-3-haiku-20240307'],
        timeout: 30000,
        max_steps: 3,
        tests: [],
      },
      {
        serverCommand: 'node',
        serverArgs: 'test.js',
      }
    );

    const validateToolCalls = (runner as any).validateToolCalls.bind(runner);

    const actualToolCalls = [{ toolName: 'required_tool', args: {} }];

    const expectedToolCalls = {
      required: ['required_tool'],
      // No allowed list specified
    };

    const errors = validateToolCalls(actualToolCalls, expectedToolCalls);

    // Should not produce any errors
    expect(errors).toEqual([]);
  });

  test('should fail test when required tool call returns error', () => {
    const runner = new EvalTestRunner(
      {
        models: ['claude-3-haiku-20240307'],
        timeout: 30000,
        max_steps: 3,
        tests: [],
      },
      {
        serverCommand: 'node',
        serverArgs: 'test.js',
      }
    );

    // Test the validateToolCallSuccess method
    const validateToolCallSuccess = (runner as any).validateToolCallSuccess.bind(runner);

    // Mock tool calls and results with error
    const toolCalls = [
      {
        toolCallId: '1',
        toolName: 'run_flow_files',
        args: {},
      },
    ];

    const toolResults = [
      {
        toolCallId: '1',
        toolName: 'run_flow_files',
        args: {},
        result: {
          isError: true,
          content: [{ type: 'text', text: 'Files not found: /path/to/file.yaml' }],
        },
      },
    ];

    const requiredTools = ['run_flow_files'];

    const errors = validateToolCallSuccess(toolCalls, toolResults, requiredTools);

    // Should produce an error because the required tool failed
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('run_flow_files');
    expect(errors[0]).toContain('failed');
  });

  test('should pass when required tool call succeeds', () => {
    const runner = new EvalTestRunner(
      {
        models: ['claude-3-haiku-20240307'],
        timeout: 30000,
        max_steps: 3,
        tests: [],
      },
      {
        serverCommand: 'node',
        serverArgs: 'test.js',
      }
    );

    // Test the validateToolCallSuccess method
    const validateToolCallSuccess = (runner as any).validateToolCallSuccess.bind(runner);

    // Mock tool calls and results with success
    const toolCalls = [
      {
        toolCallId: '1',
        toolName: 'run_flow_files',
        args: {},
      },
    ];

    const toolResults = [
      {
        toolCallId: '1',
        toolName: 'run_flow_files',
        args: {},
        result: {
          isError: false,
          content: [{ type: 'text', text: 'Flow executed successfully' }],
        },
      },
    ];

    const requiredTools = ['run_flow_files'];

    const errors = validateToolCallSuccess(toolCalls, toolResults, requiredTools);

    // Should not produce any errors
    expect(errors).toEqual([]);
  });
});
