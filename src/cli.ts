#!/usr/bin/env node

/**
 * MCP Tester CLI
 */

import { Command } from 'commander';
import { UnifiedTestRunner } from './testing/unified-runner.js';

interface CliOptions {
  serverConfig?: string;
  serverName?: string;
  serverCommand?: string;
  serverArgs?: string;
  serverEnv?: string;
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

async function runTests(testFile: string, options: CliOptions): Promise<void> {
  try {
    console.log(`Running tests from: ${testFile}`);

    // Validate server configuration options
    const hasConfigMode = !!options.serverConfig;
    const hasCommandMode = !!options.serverCommand;

    if (!hasConfigMode && !hasCommandMode) {
      throw new Error(
        'Server configuration is required. Use either:\n' +
          '  --server-config <file> [--server-name <name>] for config file mode, or\n' +
          '  --server-command <command> [--server-args <args>] for CLI launch mode'
      );
    }

    if (hasConfigMode && hasCommandMode) {
      throw new Error(
        'Cannot use both --server-config and --server-command. Choose one mode:\n' +
          '  --server-config for existing server configuration, or\n' +
          '  --server-command for direct server launch'
      );
    }

    const runner = new UnifiedTestRunner(testFile, options);
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
    .name('mcp-server-tester')
    .description('Standalone CLI tool for testing MCP servers')
    .version('1.0.0');

  // Unified test command
  program
    .argument('<test-file>', 'Test configuration file (YAML)')
    .option('--server-config <file>', 'MCP server configuration file (JSON)')
    .option(
      '--server-name <name>',
      'Specific server name to use from config (if multiple servers defined)'
    )
    .option('--server-command <command>', 'Command to launch MCP server directly')
    .option('--server-args <args>', 'Arguments for server command (comma-separated)')
    .option('--server-env <env>', 'Environment variables for server (key=value,key2=value2)')
    .option('--models <models>', 'LLM models to use (comma-separated, overrides config file)')
    .option('--timeout <ms>', 'Test timeout in milliseconds', '10000')
    .option('--output <format>', 'Output format (console, json, junit)', 'console')
    .action(async (testFile: string, options: CliOptions) => {
      await runTests(testFile, options);
    });

  // Global options
  program.option('--debug', 'Enable debug logging').option('--verbose', 'Enable verbose output');

  // Parse command line arguments
  program.parse();
}

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  handleError(error);
});

process.on('unhandledRejection', reason => {
  handleError(reason);
});

main();
