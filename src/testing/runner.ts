/**
 * Main test runner that auto-detects test types and routes to appropriate runners
 */

import { ConfigLoader } from '../config/loader.js';
import { CapabilitiesTestRunner } from './capabilities/runner.js';
import { EvaluationTestRunner } from './evals/runner.js';
import type { TestConfig, TestSummary, TestResult } from '../core/types.js';

interface ServerOptions {
  serverConfig?: string;
  serverName?: string;
  serverCommand?: string;
  serverArgs?: string;
  serverEnv?: string;
  models?: string;
  timeout?: number;
  output?: 'console' | 'json' | 'junit';
}

export class TestRunner {
  private config: TestConfig;
  private serverOptions: ServerOptions;

  constructor(configPath: string, serverOptions: ServerOptions) {
    this.config = ConfigLoader.loadTestConfig(configPath);
    this.serverOptions = serverOptions;
  }

  async run(): Promise<TestSummary> {
    const startTime = Date.now();
    const capabilitiesResults: TestResult[] = [];
    const evaluationResults: TestResult[] = [];

    console.log('Detecting test types...');

    // Auto-detect which test types to run based on config sections
    const hasTools = !!this.config.tools;
    const hasEvaluations = !!this.config.evaluations;

    if (!hasTools && !hasEvaluations) {
      throw new Error(
        'No test sections found. Please provide either "tools" or "evaluations" sections in your test file.'
      );
    }

    // Run capabilities tests if tools section exists
    if (hasTools) {
      console.log('Running tools tests...');
      const capabilitiesRunner = new CapabilitiesTestRunner(this.config.tools!, this.serverOptions);
      const capabilitiesResult = await capabilitiesRunner.run();
      capabilitiesResults.push(...capabilitiesResult.results);
    }

    // Run evaluation tests if evaluations section exists
    if (hasEvaluations) {
      console.log('Running evaluation tests...');
      const evaluationRunner = new EvaluationTestRunner(
        this.config.evaluations!,
        this.serverOptions
      );
      const evaluationResult = await evaluationRunner.run();
      // Convert evaluation results to test results format
      const convertedResults: TestResult[] = evaluationResult.results.map(evalResult => ({
        name: `${evalResult.name} (${evalResult.model})`,
        passed: evalResult.passed,
        errors: evalResult.errors,
        calls: [], // Evaluations don't have tool calls in the same format
        duration: 0, // Individual test duration not tracked in evaluations
      }));
      evaluationResults.push(...convertedResults);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Combine results from all runners
    const allResults = [...capabilitiesResults, ...evaluationResults];
    const combinedSummary: TestSummary = {
      total: allResults.length,
      passed: allResults.filter(r => r.passed).length,
      failed: allResults.filter(r => !r.passed).length,
      duration,
      results: allResults,
    };

    console.log(`\\nTest Summary:`);
    console.log(`  Total: ${combinedSummary.total}`);
    console.log(`  Passed: ${combinedSummary.passed}`);
    console.log(`  Failed: ${combinedSummary.failed}`);
    console.log(`  Duration: ${combinedSummary.duration}ms`);

    return combinedSummary;
  }
}
