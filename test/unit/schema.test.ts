/**
 * Schema validation tests for mcp-tester configurations
 */

import { describe, test, expect } from 'vitest';
import { ConfigLoader } from '../../src/shared/config/loader.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Schema Validation', () => {
  const fixturesDir = path.join(__dirname, '../fixtures');
  const invalidConfigsDir = path.join(fixturesDir, 'invalid-configs');

  describe('Tools Configuration', () => {
    test('should load valid tools config', () => {
      const validConfig = path.join(fixturesDir, 'valid-integration.yaml');

      expect(() => {
        const testConfig = ConfigLoader.loadTestConfig(validConfig);
        const config = testConfig.tools!;
        expect(config).toHaveProperty('tests');
        expect(config.tests).toBeInstanceOf(Array);
        expect(config.tests.length).toBeGreaterThan(0);
        expect(config.tests[0]).toHaveProperty('name');
        expect(config.tests[0]).toHaveProperty('calls');
      }).not.toThrow();
    });
  });

  describe('Evals Configuration', () => {
    test('should load valid evals config', () => {
      const validConfig = path.join(fixturesDir, 'valid-evaluation.yaml');

      expect(() => {
        const testConfig = ConfigLoader.loadTestConfig(validConfig);
        const config = testConfig.evals!;
        expect(config).toHaveProperty('tests');
        expect(config.tests).toBeInstanceOf(Array);
        expect(config.tests.length).toBeGreaterThan(0);
        expect(config.tests[0]).toHaveProperty('name');
        expect(config.tests[0]).toHaveProperty('prompt');
      }).not.toThrow();
    });

    test('should validate eval test structure', () => {
      const testConfig = ConfigLoader.loadTestConfig(
        path.join(fixturesDir, 'valid-evaluation.yaml')
      );
      const config = testConfig.evals!;

      // Check that expected_tool_calls doesn't have prohibited field
      if (config.tests) {
        const testWithToolCalls = config.tests.find(t => t.expected_tool_calls);
        if (testWithToolCalls?.expected_tool_calls) {
          expect(testWithToolCalls.expected_tool_calls).not.toHaveProperty('prohibited');
          expect(testWithToolCalls.expected_tool_calls).toHaveProperty('allowed');
        }
      }
    });

    test('should validate response scorer types', () => {
      const testConfig = ConfigLoader.loadTestConfig(
        path.join(fixturesDir, 'valid-evaluation.yaml')
      );
      const config = testConfig.evals!;

      if (config.tests) {
        const testWithScorers = config.tests.find(t => t.response_scorers);
        if (testWithScorers?.response_scorers) {
          for (const scorer of testWithScorers.response_scorers) {
            expect(['regex', 'llm-judge']).toContain(scorer.type);
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
      // Test that .yaml files work for test configs
      expect(() => {
        ConfigLoader.loadTestConfig(path.join(fixturesDir, 'valid-integration.yaml'));
      }).not.toThrow();

      expect(() => {
        ConfigLoader.loadTestConfig(path.join(fixturesDir, 'valid-evaluation.yaml'));
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
    test('should validate tools config required fields', () => {
      const testConfig = ConfigLoader.loadTestConfig(
        path.join(fixturesDir, 'valid-integration.yaml')
      );
      const config = testConfig.tools!;

      // Every test should have required fields
      if (config.tests) {
        for (const test of config.tests) {
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

    test('should validate evals config structure', () => {
      const testConfig = ConfigLoader.loadTestConfig(
        path.join(fixturesDir, 'valid-evaluation.yaml')
      );
      const config = testConfig.evals!;

      if (config.tests) {
        for (const test of config.tests) {
          expect(typeof test.name).toBe('string');
          expect(typeof test.prompt).toBe('string');
          expect(test.name.length).toBeGreaterThan(0);
          expect(test.prompt.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
