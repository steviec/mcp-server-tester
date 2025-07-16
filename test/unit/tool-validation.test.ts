/**
 * Unit tests for tool call validation logic
 */

import { describe, test, expect } from 'vitest';
import { EvalTestRunner } from '../../src/testing/evals/runner.js';

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
});
