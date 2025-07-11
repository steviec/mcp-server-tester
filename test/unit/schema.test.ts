/**
 * Schema validation tests for mcp-tester configurations
 */

import { describe, test, expect } from 'vitest';
import { ConfigLoader } from '../../src/config/loader.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Schema Validation', () => {
  const fixturesDir = path.join(__dirname, '../fixtures');
  const invalidConfigsDir = path.join(fixturesDir, 'invalid-configs');

  describe('Test Configuration', () => {
    test('should load valid test config with tools section', () => {
      const validConfig = path.join(fixturesDir, 'valid-integration.yaml');

      expect(() => {
        const config = ConfigLoader.loadTestConfig(validConfig);
        expect(config).toHaveProperty('tools');
        expect(config.tools).toHaveProperty('tests');
        expect(config.tools?.tests).toBeInstanceOf(Array);
        expect(config.tools?.tests.length).toBeGreaterThan(0);
        expect(config.tools?.tests[0]).toHaveProperty('name');
        expect(config.tools?.tests[0]).toHaveProperty('calls');
      }).not.toThrow();
    });

    test('should load valid test config with evaluations section', () => {
      const validConfig = path.join(fixturesDir, 'valid-evaluation.yaml');

      expect(() => {
        const config = ConfigLoader.loadTestConfig(validConfig);
        expect(config).toHaveProperty('evaluations');
        expect(config.evaluations).toHaveProperty('tests');
        expect(config.evaluations?.tests).toBeInstanceOf(Array);
        expect(config.evaluations?.tests.length).toBeGreaterThan(0);
        expect(config.evaluations?.tests[0]).toHaveProperty('name');
        expect(config.evaluations?.tests[0]).toHaveProperty('prompt');
      }).not.toThrow();
    });

    test('should validate test structure', () => {
      const config = ConfigLoader.loadTestConfig(path.join(fixturesDir, 'valid-evaluation.yaml'));

      // Check that expected_tool_calls doesn't have prohibited field
      if (config.evaluations?.tests) {
        const testWithToolCalls = config.evaluations.tests.find(t => t.expected_tool_calls);
        if (testWithToolCalls?.expected_tool_calls) {
          expect(testWithToolCalls.expected_tool_calls).not.toHaveProperty('prohibited');
          expect(testWithToolCalls.expected_tool_calls).toHaveProperty('allowed');
        }
      }
    });

    test('should validate response scorer types', () => {
      const config = ConfigLoader.loadTestConfig(path.join(fixturesDir, 'valid-evaluation.yaml'));

      if (config.evaluations?.tests) {
        const testWithScorers = config.evaluations.tests.find(t => t.response_scorers);
        if (testWithScorers?.response_scorers) {
          for (const scorer of testWithScorers.response_scorers) {
            expect(['regex', 'json-schema', 'llm-judge']).toContain(scorer.type);
          }
        }
      }
    });
  });

  describe('Server Configuration', () => {
    test('should load valid server config', () => {
      const validConfig = path.join(fixturesDir, 'test-server-config.json');

      expect(() => {
        const config = ConfigLoader.loadServerConfig(validConfig, 'test-server');
        expect(config).toHaveProperty('command');
        expect(config).toHaveProperty('args');
        expect(config.command).toBe('node');
      }).not.toThrow();
    });

    test('should handle multi-server config', () => {
      const validConfig = path.join(fixturesDir, 'test-server-config.json');

      // Should fail when no server name specified and multiple servers exist
      expect(() => {
        ConfigLoader.loadServerConfig(validConfig);
      }).toThrow(/Multiple servers found/);
    });

    test('should reject invalid server config', () => {
      const invalidConfig = path.join(invalidConfigsDir, 'invalid-server-config.json');

      expect(() => {
        ConfigLoader.loadServerConfig(invalidConfig, 'invalid-server');
      }).toThrow(/must have required property 'command'/);
    });

    test('should reject non-existent server name', () => {
      const validConfig = path.join(fixturesDir, 'test-server-config.json');

      expect(() => {
        ConfigLoader.loadServerConfig(validConfig, 'non-existent');
      }).toThrow(/Server 'non-existent' not found/);
    });

    test('should provide available servers in error message', () => {
      const validConfig = path.join(fixturesDir, 'test-server-config.json');

      try {
        ConfigLoader.loadServerConfig(validConfig, 'non-existent');
        throw new Error('Should have thrown an error');
      } catch (error) {
        const errorMessage = (error as Error).message;
        expect(errorMessage).toContain('Available servers: test-server, other-server');
      }
    });
  });

  describe('File Handling', () => {
    test('should handle non-existent files gracefully', () => {
      expect(() => {
        ConfigLoader.loadTestConfig('non-existent.yaml');
      }).toThrow(/Configuration file not found/);
    });

    test('should handle invalid JSON gracefully', () => {
      // Create a temporary invalid JSON file
      const invalidJsonPath = path.join(invalidConfigsDir, 'invalid.json');

      expect(() => {
        ConfigLoader.loadServerConfig(invalidJsonPath);
      }).toThrow(/Invalid JSON/);
    });

    test('should handle both YAML and JSON extensions', () => {
      // Test that .yaml files work
      expect(() => {
        ConfigLoader.loadTestConfig(path.join(fixturesDir, 'valid-integration.yaml'));
      }).not.toThrow();

      // Test that .json files work for server config
      expect(() => {
        ConfigLoader.loadServerConfig(
          path.join(fixturesDir, 'test-server-config.json'),
          'test-server'
        );
      }).not.toThrow();
    });
  });

  describe('Schema Features', () => {
    test('should validate required fields are present', () => {
      const config = ConfigLoader.loadTestConfig(path.join(fixturesDir, 'valid-integration.yaml'));

      // Every test should have required fields
      if (config.tools?.tests) {
        for (const test of config.tools.tests) {
          expect(test).toHaveProperty('name');
          expect(test).toHaveProperty('calls');
          expect(test.name).toBeTruthy();
          expect(test.calls.length).toBeGreaterThan(0);

          for (const call of test.calls) {
            expect(call).toHaveProperty('tool');
            expect(call).toHaveProperty('params');
            expect(call).toHaveProperty('expect');
            expect(call.expect).toHaveProperty('success');
          }
        }
      }
    });

    test('should validate evaluation config structure', () => {
      const config = ConfigLoader.loadTestConfig(path.join(fixturesDir, 'valid-evaluation.yaml'));

      if (config.evaluations?.tests) {
        for (const test of config.evaluations.tests) {
          expect(typeof test.name).toBe('string');
          expect(typeof test.prompt).toBe('string');
          expect(test.name.length).toBeGreaterThan(0);
          expect(test.prompt.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
