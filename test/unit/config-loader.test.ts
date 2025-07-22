/**
 * Unit tests for ConfigLoader environment variable replacement
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { ConfigLoader } from '../../src/shared/config/loader.js';
import fs from 'fs';
import path from 'path';

describe('ConfigLoader Environment Variable Replacement', () => {
  let originalEnv: typeof process.env;
  let tempFiles: string[] = [];

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;

    // Clean up temp files
    tempFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
    tempFiles = [];
  });

  const createTempFile = (content: string, extension = '.yaml'): string => {
    const tempFile = path.resolve(process.cwd(), `test-temp-${Date.now()}${extension}`);
    fs.writeFileSync(tempFile, content);
    tempFiles.push(tempFile);
    return tempFile;
  };

  test('should replace environment variables in tools config', () => {
    // Set test environment variables
    process.env.TEST_MESSAGE = 'World';
    process.env.TEST_RESULT = 'Echo: Hello World!';

    const yamlContent = `
tools:
  expected_tool_list: ['echo']
  tests:
    - name: 'Environment variable test for \${TEST_MESSAGE}'
      tool: 'echo'
      params:
        message: 'Hello \${TEST_MESSAGE}!'
      expect:
        success: true
        result:
          contains: '\${TEST_RESULT}'
`;

    const tempFile = createTempFile(yamlContent);
    const testConfig = ConfigLoader.loadTestConfig(tempFile);
    const config = testConfig.tools!;

    expect(config.expected_tool_list).toEqual(['echo']);
    expect(config.tests).toHaveLength(1);
    expect(config.tests[0].name).toBe('Environment variable test for World');
    expect(config.tests[0].params.message).toBe('Hello World!');
    expect(config.tests[0].expect.result?.contains).toBe('Echo: Hello World!');
  });

  test('should replace environment variables in evals config', () => {
    // Set test environment variables
    process.env.TEST_MODEL = 'claude-3-haiku-20240307';
    process.env.TEST_PROMPT = 'What tools are available?';
    process.env.TEST_PATTERN = '(echo|add|tool)';

    const yamlContent = `
evals:
  models: ['\${TEST_MODEL}']
  timeout: 30000
  max_steps: 2
  tests:
    - name: 'Environment variable test for \${TEST_MODEL}'
      prompt: '\${TEST_PROMPT}'
      expected_tool_calls:
        allowed: []
      response_scorers:
        - type: 'regex'
          pattern: '\${TEST_PATTERN}'
`;

    const tempFile = createTempFile(yamlContent);
    const testConfig = ConfigLoader.loadTestConfig(tempFile);
    const config = testConfig.evals!;

    expect(config.models).toEqual(['claude-3-haiku-20240307']);
    expect(config.tests).toHaveLength(1);
    expect(config.tests[0].name).toBe('Environment variable test for claude-3-haiku-20240307');
    expect(config.tests[0].prompt).toBe('What tools are available?');
    expect(config.tests[0].response_scorers?.[0].pattern).toBe('(echo|add|tool)');
  });

  test('should handle multiple environment variables in single string', () => {
    process.env.TEST_USER = 'alice';
    process.env.TEST_ENV = 'production';

    const yamlContent = `
tools:
  tests:
    - name: 'User \${TEST_USER} in \${TEST_ENV}'
      tool: 'echo'
      params:
        message: 'Hello \${TEST_USER}, you are in \${TEST_ENV} environment'
      expect:
        success: true
`;

    const tempFile = createTempFile(yamlContent);
    const testConfig = ConfigLoader.loadTestConfig(tempFile);
    const config = testConfig.tools!;

    expect(config.tests[0].name).toBe('User alice in production');
    expect(config.tests[0].params.message).toBe('Hello alice, you are in production environment');
  });

  test('should handle empty environment variable values', () => {
    process.env.EMPTY_VAR = '';

    const yamlContent = `
tools:
  tests:
    - name: 'Test with empty var: "\${EMPTY_VAR}"'
      tool: 'echo'
      params:
        message: 'Value is: "\${EMPTY_VAR}"'
      expect:
        success: true
`;

    const tempFile = createTempFile(yamlContent);
    const testConfig = ConfigLoader.loadTestConfig(tempFile);
    const config = testConfig.tools!;

    expect(config.tests[0].name).toBe('Test with empty var: ""');
    expect(config.tests[0].params.message).toBe('Value is: ""');
  });

  test('should throw error for undefined environment variables', () => {
    // Ensure variable is not defined
    delete process.env.UNDEFINED_VAR;

    const yamlContent = `
tools:
  tests:
    - name: 'Test with \${UNDEFINED_VAR}'
      tool: 'echo'
      params:
        message: 'Value: \${UNDEFINED_VAR}'
      expect:
        success: true
`;

    const tempFile = createTempFile(yamlContent);

    expect(() => ConfigLoader.loadTestConfig(tempFile)).toThrow(
      "Environment variable 'UNDEFINED_VAR' is not defined but required for config substitution"
    );
  });
});
