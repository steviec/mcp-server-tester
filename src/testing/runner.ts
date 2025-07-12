/**
 * Main test runner that auto-detects test types and routes to appropriate runners
 */

import { ConfigLoader } from '../config/loader.js';
import { CapabilitiesTestRunner } from './capabilities/runner.js';
import { EvalTestRunner } from './evals/runner.js';
import { DisplayManager } from './display/DisplayManager.js';
import type { TestConfig, TestSummary, TestResult } from '../core/types.js';
import type { DisplayOptions } from './display/types.js';

interface ServerOptions {
  serverConfig: string;
  serverName?: string;
  timeout?: number;
  quiet?: boolean;
  verbose?: boolean;
  junitXml?: string;
}

export class TestRunner {
  private config: TestConfig;
  private serverOptions: ServerOptions;
  private displayManager: DisplayManager;

  constructor(configPath: string, serverOptions: ServerOptions) {
    this.config = ConfigLoader.loadTestConfig(configPath);
    this.serverOptions = serverOptions;

    // Create display manager with options
    const displayOptions: DisplayOptions = {
      formatter: 'console',
      quiet: serverOptions.quiet,
      verbose: serverOptions.verbose,
      junitXml: serverOptions.junitXml,
    };
    this.displayManager = new DisplayManager(displayOptions);
  }

  async run(): Promise<TestSummary> {
    const startTime = Date.now();
    const capabilitiesResults: TestResult[] = [];
    const evalResults: TestResult[] = [];

    this.displayManager.progress('Detecting test types...');

    // Auto-detect which test types to run based on config sections
    const hasTools = !!this.config.tools;
    const hasEvals = !!this.config.evals;

    if (!hasTools && !hasEvals) {
      throw new Error(
        'No test sections found. Please provide either "tools" or "evals" sections in your test file.'
      );
    }

    // Run capabilities tests if tools section exists
    if (hasTools) {
      this.displayManager.progress('Running tools tests...');
      const capabilitiesRunner = new CapabilitiesTestRunner(this.config.tools!, this.serverOptions);
      const capabilitiesResult = await capabilitiesRunner.run();
      capabilitiesResults.push(...capabilitiesResult.results);
    }

    // Run LLM evaluation (eval) tests if evals section exists
    if (hasEvals) {
      this.displayManager.progress('Running LLM evaluation (eval) tests...');
      const evalRunner = new EvalTestRunner(
        this.config.evals!,
        this.serverOptions,
        this.displayManager
      );
      const evalResult = await evalRunner.run();
      // Convert eval results to test results format
      const convertedResults: TestResult[] = evalResult.results.map(evalRes => ({
        name: `${evalRes.name} (${evalRes.model})`,
        passed: evalRes.passed,
        errors: evalRes.errors,
        calls: [], // Evals don't have tool calls in the same format
        duration: 0, // Individual test duration not tracked in evals
      }));
      evalResults.push(...convertedResults);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Combine results from all runners
    const allResults = [...capabilitiesResults, ...evalResults];
    const combinedSummary: TestSummary = {
      total: allResults.length,
      passed: allResults.filter(r => r.passed).length,
      failed: allResults.filter(r => !r.passed).length,
      duration,
      results: allResults,
    };

    // Final summary is handled by the individual test runners through DisplayManager
    // For capabilities tests, we might need to add DisplayManager support later
    // For now, only evals use the new display system

    this.displayManager.flush();

    return combinedSummary;
  }
}
