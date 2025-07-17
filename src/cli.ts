#!/usr/bin/env node

/**
 * MCP Tester CLI
 */

import { Command } from 'commander';
import { TestRunner } from './testing/runner.js';
import { DoctorRunner, formatReport } from './testing/doctor/index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import testConfigSchema from './schemas/test-config.json' with { type: 'json' };
import serverConfigSchema from './schemas/server-config.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

interface CliOptions {
  serverConfig: string;
  serverName?: string;
  timeout?: number;
  debug?: boolean;
  junitXml?: string;
}

interface DoctorOptions {
  serverConfig: string;
  serverName?: string;
  categories?: string;
  output?: string;
  timeout?: string;
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

    const runner = new TestRunner(testFile, options);
    const summary = await runner.run();

    // Exit with error code if any tests failed
    if (summary.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    handleError(error);
  }
}

async function runDoctor(options: DoctorOptions): Promise<void> {
  try {
    console.log(`Running doctor diagnostics...`);

    const doctorRunner = new DoctorRunner(options);
    const report = await doctorRunner.runDiagnostics();

    if (options.output === 'json') {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatReport(report));
    }

    // Exit with error code if any tests failed
    if (report.summary.testResults.failed > 0) {
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
    .version(packageJson.version, '--version')
    .helpOption('--help', 'Show help for command')
    .option('--help-schema', 'Show schemas for server config and test config files')
    .addHelpText(
      'after',
      `
Examples:
  $ mcp-server-tester test test.yaml --server-config server.json
  $ mcp-server-tester doctor --server-config server.json
  $ mcp-server-tester test eval.yaml --server-config server.json --server-name filesystem`
    )
    .action(options => {
      if (options.helpSchema) {
        console.log('Server Configuration Schema:');
        console.log(`
${JSON.stringify(serverConfigSchema, null, 2)}
`);
        console.log('Test Configuration Schema:');
        console.log(`
${JSON.stringify(testConfigSchema, null, 2)}
`);
        process.exit(0);
      } else {
        program.help();
      }
    });

  // Test command
  program
    .command('test')
    .description(
      'Run tests against MCP servers (tools and/or evals). Use --help-schema to see test config schema.'
    )
    .argument('<test-file>', 'Test configuration file (YAML)')
    .requiredOption(
      '--server-config <file>',
      'MCP server configuration file (JSON). Use --help-schema to see server config schema.'
    )
    .option(
      '--server-name <name>',
      'Specific server name to use from config (if multiple servers defined)'
    )
    .option('--timeout <ms>', 'Test timeout in milliseconds', '10000')
    .option('--debug', 'Enable debug output with additional details')
    .option('--junit-xml [filename]', 'Generate JUnit XML output (default: junit.xml)')
    .action(async (testFile: string, options: CliOptions) => {
      await runTests(testFile, options);
    });

  // Doctor command
  program
    .command('doctor')
    .description('Run diagnostic tests for MCP server health')
    .requiredOption('--server-config <file>', 'MCP server configuration file (JSON)')
    .option(
      '--server-name <name>',
      'Specific server name to use from config (if multiple servers defined)'
    )
    .option('--categories <list>', 'Test categories to run (comma-separated)')
    .option('--output <format>', 'Output format: console, json', 'console')
    .option('--timeout <ms>', 'Overall timeout for doctor tests', '300000')
    .action(async (options: DoctorOptions) => {
      await runDoctor(options);
    });

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
