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

  private calculateToolsTestCount(): number {
    if (!this.config.tools) {
      return 0;
    }

    let count = 0;
    if (this.config.tools.expected_tool_list) {
      count++;
    }
    if (this.config.tools.tests) {
      count += this.config.tools.tests.length;
    }
    return count;
  }

  private calculateEvalsTestCount(): number {
    if (!this.config.evals) {
      return 0;
    }

    const testCount = this.config.evals.tests?.length || 0;
    const modelCount = this.config.evals.models?.length || 1;
    return testCount * modelCount;
  }

  async run(): Promise<TestSummary> {
    const startTime = Date.now();
    const capabilitiesResults: TestResult[] = [];
    const evalResults: TestResult[] = [];

    // Auto-detect which test types to run based on config sections
    const hasTools = !!this.config.tools;
    const hasEvals = !!this.config.evals;

    if (!hasTools && !hasEvals) {
      throw new Error(
        'No test sections found. Please provide either "tools" or "evals" sections in your test file.'
      );
    }

    // Calculate total test count for progress tracking
    const toolsTestCount = hasTools ? this.calculateToolsTestCount() : 0;
    const evalsTestCount = hasEvals ? this.calculateEvalsTestCount() : 0;
    const totalTestCount = toolsTestCount + evalsTestCount;

    // Initialize the display with suite information
    this.displayManager.suiteStart(totalTestCount, undefined, hasTools, hasEvals);

    // Run capabilities tests if tools section exists
    if (hasTools) {
      // Load server config from file
      const serverConfig = ConfigLoader.loadServerConfig(
        this.serverOptions.serverConfig,
        this.serverOptions.serverName
      );
      const capabilitiesRunner = new CapabilitiesTestRunner(this.config.tools!, {
        serverConfig,
        timeout: this.serverOptions.timeout,
        quiet: this.serverOptions.quiet,
        verbose: this.serverOptions.verbose,
      });

      const capabilitiesResult = await capabilitiesRunner.run();
      capabilitiesResults.push(...capabilitiesResult.results);

      // Report tools test results to DisplayManager
      for (const result of capabilitiesResult.results) {
        this.displayManager.testComplete(
          result.name,
          result.passed,
          result.errors,
          undefined, // no model for tools tests
          undefined, // no prompt for tools tests
          'tool' // test type
        );
      }
    }

    // Run LLM evaluation (eval) tests if evals section exists
    if (hasEvals) {
      // Check for API key before running eval tests
      if (!process.env.ANTHROPIC_API_KEY) {
        console.warn('⚠️  ANTHROPIC_API_KEY not set - skipping LLM evaluation (eval) tests');
        console.warn(
          '   Set your Anthropic API key to run eval tests: export ANTHROPIC_API_KEY="your-key-here"'
        );
      } else {
        // Load server config from file
        const serverConfig = ConfigLoader.loadServerConfig(
          this.serverOptions.serverConfig,
          this.serverOptions.serverName
        );
        const evalRunner = new EvalTestRunner(
          this.config.evals!,
          {
            serverConfig,
            timeout: this.serverOptions.timeout,
            quiet: this.serverOptions.quiet,
            verbose: this.serverOptions.verbose,
          },
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

    // Send final summary to DisplayManager
    this.displayManager.suiteComplete(
      combinedSummary.total,
      combinedSummary.passed,
      combinedSummary.failed,
      duration
    );

    this.displayManager.flush();

    return combinedSummary;
  }
}
