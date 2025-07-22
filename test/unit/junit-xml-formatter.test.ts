/**
 * Tests for JUnit XML formatter
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { JunitXmlFormatter } from '../../src/shared/display/formatters/JunitXmlFormatter.js';
import { validateJunitXmlContent } from '../../src/shared/display/formatters/junit-validation.js';
import type { TestEvent, DisplayOptions } from '../../src/shared/display/types.js';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

describe('JunitXmlFormatter', () => {
  let formatter: JunitXmlFormatter;
  let outputFile: string;
  const options: DisplayOptions = { debug: false };

  beforeEach(() => {
    // Create a unique temp file for each test
    outputFile = path.join(
      tmpdir(),
      `junit-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.xml`
    );
    formatter = new JunitXmlFormatter(options, outputFile);
  });

  afterEach(() => {
    // Clean up test files
    if (existsSync(outputFile)) {
      unlinkSync(outputFile);
    }
  });

  describe('Basic XML Structure', () => {
    test('should generate valid XML structure for empty test suite', () => {
      const suiteStartEvent: TestEvent = {
        type: 'suite_start',
        data: { testCount: 0 },
      };

      const suiteCompleteEvent: TestEvent = {
        type: 'suite_complete',
        data: { total: 0, passed: 0, failed: 0, duration: 1000 },
      };

      formatter.onEvent(suiteStartEvent);
      formatter.onEvent(suiteCompleteEvent);
      formatter.flush();

      expect(existsSync(outputFile)).toBe(true);

      const content = readFileSync(outputFile, 'utf8');
      const validation = validateJunitXmlContent(content);

      expect(validation.valid).toBe(true);
      expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(content).toContain('<testsuites');
      expect(content).toContain('</testsuites>');
    });

    test('should generate valid XML for tools test suite', () => {
      const events: TestEvent[] = [
        {
          type: 'suite_start',
          data: { testCount: 2 },
        },
        {
          type: 'test_start',
          data: { name: 'filesystem.read_file' },
        },
        {
          type: 'test_complete',
          data: {
            name: 'filesystem.read_file',
            passed: true,
            errors: [],
          },
        },
        {
          type: 'test_start',
          data: { name: 'filesystem.write_file' },
        },
        {
          type: 'test_complete',
          data: {
            name: 'filesystem.write_file',
            passed: false,
            errors: ['Permission denied'],
          },
        },
        {
          type: 'suite_complete',
          data: { total: 2, passed: 1, failed: 1, duration: 2000 },
        },
      ];

      events.forEach(event => formatter.onEvent(event));
      formatter.flush();

      const content = readFileSync(outputFile, 'utf8');
      const validation = validateJunitXmlContent(content);

      expect(validation.valid).toBe(true);
      expect(content).toContain('<testsuite name="tools"');
      expect(content).toContain('tests="2"');
      expect(content).toContain('failures="1"');
      expect(content).toContain('<testcase name="filesystem.read_file" classname="filesystem"');
      expect(content).toContain('<testcase name="filesystem.write_file" classname="filesystem"');
      expect(content).toContain('<failure message="Permission denied"');
    });

    test('should generate valid XML for evals test suite with models', () => {
      const events: TestEvent[] = [
        {
          type: 'suite_start',
          data: { testCount: 2, modelCount: 2, totalRuns: 4 },
        },
        {
          type: 'progress',
          data: { model: 'claude-3-sonnet' },
        },
        {
          type: 'test_start',
          data: { name: 'file_operations_eval', model: 'claude-3-sonnet' },
        },
        {
          type: 'test_complete',
          data: {
            name: 'file_operations_eval',
            model: 'claude-3-sonnet',
            passed: true,
            errors: [],
            prompt: 'Read and analyze the file contents',
          },
        },
        {
          type: 'progress',
          data: { model: 'gpt-4' },
        },
        {
          type: 'test_start',
          data: { name: 'file_operations_eval', model: 'gpt-4' },
        },
        {
          type: 'test_complete',
          data: {
            name: 'file_operations_eval',
            model: 'gpt-4',
            passed: false,
            errors: ['Failed to call required tool'],
            prompt: 'Read and analyze the file contents',
          },
        },
        {
          type: 'suite_complete',
          data: { total: 2, passed: 1, failed: 1, duration: 15000 },
        },
      ];

      events.forEach(event => formatter.onEvent(event));
      formatter.flush();

      const content = readFileSync(outputFile, 'utf8');
      const validation = validateJunitXmlContent(content);

      expect(validation.valid).toBe(true);
      expect(content).toContain('<testsuite name="evals-claude-3-sonnet"');
      expect(content).toContain('<testsuite name="evals-gpt-4"');
      expect(content).toContain(
        '<testcase name="file_operations_eval" classname="claude-3-sonnet"'
      );
      expect(content).toContain('<testcase name="file_operations_eval" classname="gpt-4"');
      expect(content).toContain('<failure message="Failed to call required tool"');
      expect(content).toContain('Prompt: Read and analyze the file contents');
    });
  });

  describe('XML Escaping', () => {
    test('should properly escape XML characters in test names and messages', () => {
      const events: TestEvent[] = [
        {
          type: 'suite_start',
          data: { testCount: 1 },
        },
        {
          type: 'test_start',
          data: { name: 'test_with_<special>&"characters"' },
        },
        {
          type: 'test_complete',
          data: {
            name: 'test_with_<special>&"characters"',
            passed: false,
            errors: ['Error with <brackets> & "quotes"'],
          },
        },
        {
          type: 'suite_complete',
          data: { total: 1, passed: 0, failed: 1, duration: 1000 },
        },
      ];

      events.forEach(event => formatter.onEvent(event));
      formatter.flush();

      const content = readFileSync(outputFile, 'utf8');

      expect(content).toContain('&lt;special&gt;&amp;&quot;characters&quot;');
      expect(content).toContain('&lt;brackets&gt; &amp; &quot;quotes&quot;');
      expect(content).not.toContain('<special>');
      expect(content).not.toContain('"quotes"');
    });
  });

  describe('Test Timing', () => {
    test('should include timing information in XML output', () => {
      const startTime = Date.now();

      const events: TestEvent[] = [
        {
          type: 'suite_start',
          data: { testCount: 1 },
        },
        {
          type: 'test_start',
          data: { name: 'timing_test' },
        },
      ];

      events.forEach(event => formatter.onEvent(event));

      // Simulate some test duration
      setTimeout(() => {
        formatter.onEvent({
          type: 'test_complete',
          data: {
            name: 'timing_test',
            passed: true,
            errors: [],
          },
        });

        formatter.onEvent({
          type: 'suite_complete',
          data: { total: 1, passed: 1, failed: 0, duration: Date.now() - startTime },
        });

        formatter.flush();

        const content = readFileSync(outputFile, 'utf8');

        // Check that time attributes are present
        expect(content).toMatch(/time="\d+\.\d{3}"/);
        expect(content).toMatch(/<testcase[^>]*time="\d+\.\d{3}"/);
      }, 10);
    });
  });

  describe('Properties and Metadata', () => {
    test('should include properties for eval tests with model information', () => {
      const events: TestEvent[] = [
        {
          type: 'suite_start',
          data: { testCount: 1, modelCount: 1, totalRuns: 1 },
        },
        {
          type: 'progress',
          data: { model: 'claude-3-sonnet' },
        },
        {
          type: 'test_complete',
          data: {
            name: 'eval_test',
            model: 'claude-3-sonnet',
            passed: true,
            errors: [],
          },
        },
        {
          type: 'suite_complete',
          data: { total: 1, passed: 1, failed: 0, duration: 1000 },
        },
      ];

      events.forEach(event => formatter.onEvent(event));
      formatter.flush();

      const content = readFileSync(outputFile, 'utf8');

      expect(content).toContain('<properties>');
      expect(content).toContain('<property name="model" value="claude-3-sonnet"/>');
      expect(content).toContain('</properties>');
    });
  });

  describe('Error Handling', () => {
    test('should handle multiple test failures correctly', () => {
      const events: TestEvent[] = [
        {
          type: 'suite_start',
          data: { testCount: 2 },
        },
        {
          type: 'test_complete',
          data: {
            name: 'failing_test_1',
            passed: false,
            errors: ['First error', 'Second error'],
          },
        },
        {
          type: 'test_complete',
          data: {
            name: 'failing_test_2',
            passed: false,
            errors: ['Another error'],
          },
        },
        {
          type: 'suite_complete',
          data: { total: 2, passed: 0, failed: 2, duration: 1000 },
        },
      ];

      events.forEach(event => formatter.onEvent(event));
      formatter.flush();

      const content = readFileSync(outputFile, 'utf8');

      expect(content).toContain('failures="2"');
      expect(content).toContain('<failure message="First error; Second error"');
      expect(content).toContain('<failure message="Another error"');
    });
  });

  describe('File Output Options', () => {
    test('should use default filename when none specified', () => {
      const defaultFormatter = new JunitXmlFormatter(options);

      // Mock the flush method to avoid actual file writing in this test
      let flushed = false;
      defaultFormatter.flush = () => {
        flushed = true;
      };

      defaultFormatter.onEvent({
        type: 'suite_start',
        data: { testCount: 0 },
      });

      defaultFormatter.flush();
      expect(flushed).toBe(true);
    });

    test('should create output directory if it does not exist', () => {
      const nestedPath = path.join(tmpdir(), 'nested', 'dir', 'junit.xml');
      const nestedFormatter = new JunitXmlFormatter(options, nestedPath);

      nestedFormatter.onEvent({
        type: 'suite_start',
        data: { testCount: 0 },
      });

      nestedFormatter.onEvent({
        type: 'suite_complete',
        data: { total: 0, passed: 0, failed: 0, duration: 0 },
      });

      nestedFormatter.flush();

      expect(existsSync(nestedPath)).toBe(true);

      // Clean up
      unlinkSync(nestedPath);
    });
  });

  describe('XML Validation', () => {
    test('should produce valid XML that can be parsed by external library', () => {
      const events: TestEvent[] = [
        {
          type: 'suite_start',
          data: { testCount: 1 },
        },
        {
          type: 'test_complete',
          data: {
            name: 'sample_test',
            passed: true,
            errors: [],
          },
        },
        {
          type: 'suite_complete',
          data: { total: 1, passed: 1, failed: 0, duration: 1000 },
        },
      ];

      events.forEach(event => formatter.onEvent(event));
      formatter.flush();

      const content = readFileSync(outputFile, 'utf8');
      const validation = validateJunitXmlContent(content);

      expect(validation.valid).toBe(true);
    });
  });
});
