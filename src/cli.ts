#!/usr/bin/env node

/**
 * MCP Tester CLI
 */

import { Command } from 'commander';
import { IntegrationTestRunner } from './testing/integration/runner.js';
import { EvaluationTestRunner } from './testing/evals/runner.js';

interface CliOptions {
  serverConfig?: string;
  serverName?: string;
  timeout?: number;
  output?: 'console' | 'json' | 'junit';
  models?: string;
}

function handleError(error: unknown): never {
  let message: string;
  
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else {
    message = 'Unknown error';
  }
  
  console.error(`Error: ${message}`);
  process.exit(1);
}

async function runIntegrationTests(testFile: string, options: CliOptions): Promise<void> {
  try {
    console.log(`Running integration tests from: ${testFile}`);
    
    if (!options.serverConfig) {
      throw new Error('Server configuration is required. Use --server-config <file> to specify the MCP server configuration.');
    }
    
    const runner = new IntegrationTestRunner(testFile, options.serverConfig, options.serverName);
    const summary = await runner.run();
    
    // Exit with error code if any tests failed
    if (summary.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    handleError(error);
  }
}

async function runEvaluationTests(testFile: string, options: CliOptions): Promise<void> {
  try {
    console.log(`Running evaluation tests from: ${testFile}`);
    
    if (!options.serverConfig) {
      throw new Error('Server configuration is required. Use --server-config <file> to specify the MCP server configuration.');
    }
    
    const runner = new EvaluationTestRunner(testFile, options.serverConfig, options.serverName, options.models);
    const summary = await runner.run();
    
    // Exit with error code if any tests failed
    if (summary.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    handleError(error);
  }
}

async function main(): Promise<void> {
  const program = new Command();
  
  program
    .name('mcp-tester')
    .description('Standalone CLI tool for testing MCP servers')
    .version('1.0.0');
  
  // Integration tests command
  program
    .command('integration')
    .description('Run integration tests (direct tool calls)')
    .argument('<test-file>', 'Integration test configuration file (YAML)')
    .requiredOption('--server-config <file>', 'MCP server configuration file (JSON)')
    .option('--server-name <name>', 'Specific server name to use from config (if multiple servers defined)')
    .option('--timeout <ms>', 'Test timeout in milliseconds', '10000')
    .option('--output <format>', 'Output format (console, json, junit)', 'console')
    .action(async (testFile: string, options: CliOptions) => {
      await runIntegrationTests(testFile, options);
    });
  
  // Evaluation tests command
  program
    .command('evals')
    .description('Run evaluation tests (LLM interaction)')
    .argument('<test-file>', 'Evaluation test configuration file (YAML)')
    .requiredOption('--server-config <file>', 'MCP server configuration file (JSON)')
    .option('--server-name <name>', 'Specific server name to use from config (if multiple servers defined)')
    .option('--models <models>', 'LLM models to use (comma-separated, overrides config file)')
    .option('--timeout <ms>', 'Test timeout in milliseconds', '30000')
    .option('--output <format>', 'Output format (console, json, junit)', 'console')
    .action(async (testFile: string, options: CliOptions) => {
      await runEvaluationTests(testFile, options);
    });
  
  // Global options
  program
    .option('--debug', 'Enable debug logging')
    .option('--verbose', 'Enable verbose output');
  
  // Parse command line arguments
  program.parse();
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  handleError(error);
});

process.on('unhandledRejection', (reason) => {
  handleError(reason);
});

main();