/**
 * Unified test runner that auto-detects capabilities from YAML and routes to appropriate runners
 */

import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { ConfigLoader } from '../config/loader.js';
import { CapabilitiesTestRunner } from './capabilities/runner.js';
import { EvaluationTestRunner } from './evals/runner.js';
import type { UnifiedTestConfig, TestSummary, TestResult } from '../core/types.js';
import type { EvaluationSummary } from './evals/runner.js';

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

export class UnifiedTestRunner {
  private config: UnifiedTestConfig;
  private serverOptions: ServerOptions;
  private tempFiles: string[] = [];

  constructor(configPath: string, serverOptions: ServerOptions) {
    this.config = ConfigLoader.loadUnifiedConfig(configPath);
    this.serverOptions = serverOptions;
  }

  async run(): Promise<TestSummary> {
    const startTime = Date.now();
    const capabilitiesResults: TestResult[] = [];
    const evaluationResults: TestResult[] = [];
    let totalDuration = 0;

    console.log('Detecting test capabilities...');

    // Auto-detect which capabilities to test based on config sections
    const hasTools = !!this.config.tools;
    const hasEvaluations = !!this.config.evaluations;

    if (!hasTools && !hasEvaluations) {
      throw new Error(
        'No test capabilities found. Please provide either "tools" or "evaluations" sections in your test file.'
      );
    }

    // Run capabilities tests if tools section exists
    if (hasTools) {
      console.log('Running capabilities tests...');
      const capabilitiesRunner = new CapabilitiesTestRunner(
        this.createCapabilitiesConfig(),
        this.serverOptions
      );
      const capabilitiesResult = await capabilitiesRunner.run();
      capabilitiesResults.push(...capabilitiesResult.results);
      totalDuration += capabilitiesResult.duration;
    }

    // Run evaluation tests if evaluations section exists
    if (hasEvaluations) {
      console.log('Running evaluation tests...');
      const evaluationRunner = new EvaluationTestRunner(
        this.createEvaluationConfig(),
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
      totalDuration += evaluationResult.duration;
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

    // Clean up temporary files
    this.cleanup();

    return combinedSummary;
  }

  private createCapabilitiesConfig(): string {
    // Create a temporary config file for the CapabilitiesTestRunner
    // This is a temporary approach until we refactor the runners to accept objects directly
    const capabilitiesConfig = {
      discovery: this.config.tools?.expect_tools
        ? {
            expect_tools: this.config.tools.expect_tools,
          }
        : undefined,
      tests: this.config.tools?.tests || [],
    };

    const tempPath = path.join(process.cwd(), '.mcp-tester-temp-capabilities.yaml');
    fs.writeFileSync(tempPath, YAML.stringify(capabilitiesConfig));
    this.tempFiles.push(tempPath);

    return tempPath;
  }

  private createEvaluationConfig(): string {
    // Create a temporary config file for the EvaluationTestRunner
    // This is a temporary approach until we refactor the runners to accept objects directly
    const evaluationConfig = {
      options: {
        models: this.config.evaluations?.models || ['claude-3-haiku-20240307'],
        timeout: this.config.evaluations?.timeout || 30000,
        max_steps: this.config.evaluations?.max_steps || 3,
      },
      tests: this.config.evaluations?.tests || [],
    };

    const tempPath = path.join(process.cwd(), '.mcp-tester-temp-evaluations.yaml');
    fs.writeFileSync(tempPath, YAML.stringify(evaluationConfig));
    this.tempFiles.push(tempPath);

    return tempPath;
  }

  private cleanup(): void {
    for (const tempFile of this.tempFiles) {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (error) {
        console.warn(`Warning: Could not clean up temporary file ${tempFile}:`, error);
      }
    }
    this.tempFiles = [];
  }
}
