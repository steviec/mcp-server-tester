#!/usr/bin/env node

/**
 * MCP Tester CLI
 */

import { Command } from 'commander';
import { CapabilitiesTestRunner } from './commands/tools/runner.js';
import { EvalTestRunner } from './commands/evals/runner.js';
import { ComplianceRunner } from './commands/compliance/index.js';
import { formatHierarchicalReport } from './commands/compliance/formatHierarchicalReport.js';
import { ConfigLoader } from './shared/config/loader.js';
import { DisplayManager } from './shared/display/DisplayManager.js';
import type { DisplayOptions } from './shared/display/types.js';
import type { TestResult, TestSummary } from './shared/core/types.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import testConfigSchema from './schemas/tests-schema.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

const GITHUB_HELP_TEXT = `Learn more:\n  For detailed examples see the README at https://github.com/steviec/mcp-server-tester`;

interface CliOptions {
  serverConfig: string;
  serverName?: string;
  timeout?: number;
  debug?: boolean;
  junitXml?: string;
}

interface ComplianceOptions {
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

function getVersion(): string {
  try {
    return packageJson.version;
  } catch {
    return '1.0.7'; // fallback version
  }
}

async function runToolsTests(testFile: string, options: CliOptions): Promise<void> {
  try {
    console.log(`Running tools tests from: ${testFile}`);

    // Load and validate test config
    const testConfig = ConfigLoader.loadTestConfig(testFile);

    if (!testConfig.tools) {
      throw new Error(
        'No tools section found in test file. Please add a "tools:" section to your test configuration.'
      );
    }

    const toolsConfig = testConfig.tools;

    // Load server config
    const serverConfig = ConfigLoader.loadServerConfig(options.serverConfig, options.serverName);

    // Setup display manager
    const displayOptions: DisplayOptions = {
      formatter: 'console',
      debug: options.debug,
      junitXml: options.junitXml,
      version: getVersion(),
    };
    const displayManager = new DisplayManager(displayOptions);

    // Initialize display
    displayManager.suiteStart(0);

    // Run tools tests
    const toolsRunner = new CapabilitiesTestRunner(
      toolsConfig,
      {
        serverConfig,
        timeout: options.timeout,
        debug: options.debug,
      },
      displayManager
    );

    const result = await toolsRunner.run();

    // Emit suite complete event
    displayManager.suiteComplete(result.total, result.passed, result.failed, result.duration);
    displayManager.flush();

    // Exit with error code if any tests failed
    if (result.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    handleError(error);
  }
}

async function runEvalsTests(testFile: string, options: CliOptions): Promise<void> {
  try {
    console.log(`Running LLM evaluation tests from: ${testFile}`);

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        'ANTHROPIC_API_KEY environment variable is required for eval tests. ' +
          'Set your Anthropic API key: export ANTHROPIC_API_KEY="your-key-here"'
      );
    }

    // Load and validate test config
    const testConfig = ConfigLoader.loadTestConfig(testFile);

    if (!testConfig.evals) {
      throw new Error(
        'No evals section found in test file. Please add an "evals:" section to your test configuration.'
      );
    }

    const evalsConfig = testConfig.evals;

    // Load server config
    const serverConfig = ConfigLoader.loadServerConfig(options.serverConfig, options.serverName);

    // Setup display manager
    const displayOptions: DisplayOptions = {
      formatter: 'console',
      debug: options.debug,
      junitXml: options.junitXml,
      version: getVersion(),
    };
    const displayManager = new DisplayManager(displayOptions);

    // Initialize display
    displayManager.suiteStart(0);

    // Run evals tests
    const evalsRunner = new EvalTestRunner(
      evalsConfig,
      {
        serverConfig,
        timeout: options.timeout,
        debug: options.debug,
      },
      displayManager
    );

    const evalResult = await evalsRunner.run();

    // Convert eval results to test results format for consistent display
    const convertedResults: TestResult[] = evalResult.results.map(evalRes => ({
      name: `${evalRes.name} (${evalRes.model})`,
      passed: evalRes.passed,
      errors: evalRes.errors,
      calls: [], // Evals don't have tool calls in the same format
      duration: 0, // Individual test duration not tracked in evals
    }));

    const summary: TestSummary = {
      total: convertedResults.length,
      passed: convertedResults.filter(r => r.passed).length,
      failed: convertedResults.filter(r => !r.passed).length,
      duration: evalResult.duration,
      results: convertedResults,
    };

    // Emit suite complete event
    displayManager.suiteComplete(summary.total, summary.passed, summary.failed, summary.duration);
    displayManager.flush();

    // Exit with error code if any tests failed
    if (summary.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    handleError(error);
  }
}

async function runCompliance(options: ComplianceOptions): Promise<void> {
  try {
    console.log(`Running compliance checks...`);

    const complianceRunner = new ComplianceRunner(options);
    const report = await complianceRunner.runDiagnostics();

    if (options.output === 'json') {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatHierarchicalReport(report));
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
    .addHelpText(
      'after',
      `
Examples:
  $ mcp-server-tester tools test.yaml --server-config server.json
  $ mcp-server-tester evals eval.yaml --server-config server.json
  $ mcp-server-tester compliance --server-config server.json
  $ mcp-server-tester schema
  $ mcp-server-tester documentation

${GITHUB_HELP_TEXT}`
    );

  // Tools command
  program
    .command('tools')
    .description(
      'Run MCP server tools tests (direct API testing). Use "mcp-server-tester schema" to see test file schema.'
    )
    .argument('[test-file]', 'Test configuration file (YAML)')
    .option('--server-config <file>', 'MCP server configuration file (JSON)')
    .option(
      '--server-name <name>',
      'Specific server name to use from config (if multiple servers defined)'
    )
    .option('--timeout <ms>', 'Test timeout in milliseconds', '10000')
    .option('--debug', 'Enable debug output with additional details')
    .option('--junit-xml [filename]', 'Generate JUnit XML output (default: junit.xml)')
    .addHelpText('after', GITHUB_HELP_TEXT)
    .action(async (testFile: string | undefined, options: CliOptions) => {
      // Validate required arguments
      if (!testFile) {
        console.error("error: missing required argument 'test-file'");
        process.exit(1);
      }
      if (!options.serverConfig) {
        console.error("error: required option '--server-config <file>' not specified");
        process.exit(1);
      }

      await runToolsTests(testFile, options);
    });

  // Evals command
  program
    .command('evals')
    .description(
      'Run LLM evaluation tests (end-to-end testing with real LLMs). Requires ANTHROPIC_API_KEY. Use "mcp-server-tester schema" to see test file schema.'
    )
    .argument('[test-file]', 'Test configuration file (YAML)')
    .option('--server-config <file>', 'MCP server configuration file (JSON)')
    .option(
      '--server-name <name>',
      'Specific server name to use from config (if multiple servers defined)'
    )
    .option('--timeout <ms>', 'Test timeout in milliseconds', '10000')
    .option('--debug', 'Enable debug output with additional details')
    .option('--junit-xml [filename]', 'Generate JUnit XML output (default: junit.xml)')
    .addHelpText('after', GITHUB_HELP_TEXT)
    .action(async (testFile: string | undefined, options: CliOptions) => {
      // Validate required arguments
      if (!testFile) {
        console.error("error: missing required argument 'test-file'");
        process.exit(1);
      }
      if (!options.serverConfig) {
        console.error("error: required option '--server-config <file>' not specified");
        process.exit(1);
      }

      await runEvalsTests(testFile, options);
    });

  // Compliance command (renamed from compliance)
  program
    .command('compliance')
    .description('Run MCP protocol compliance checks')
    .requiredOption('--server-config <file>', 'MCP server configuration file (JSON)')
    .option(
      '--server-name <name>',
      'Specific server name to use from config (if multiple servers defined)'
    )
    .option('--categories <list>', 'Test categories to run (comma-separated)')
    .option('--output <format>', 'Output format: console, json', 'console')
    .option('--timeout <ms>', 'Overall timeout for compliance tests', '300000')
    .addHelpText('after', GITHUB_HELP_TEXT)
    .action(async (options: ComplianceOptions) => {
      await runCompliance(options);
    });

  // Schema command
  program
    .command('schema')
    .description('Display JSON schema for test configuration files')
    .action(() => {
      console.log('# Test file JSON Schema for both tools and evals commands');
      console.log('');
      console.log('```json');
      console.log(JSON.stringify(testConfigSchema, null, 2));
      console.log('```');
    });

  // Documentation command
  program
    .command('documentation')
    .alias('docs')
    .description('Display full documentation for MCP Server Tester')
    .action(() => {
      try {
        const readmePath = join(__dirname, '../README.md');
        const readmeContent = readFileSync(readmePath, 'utf8');
        console.log(readmeContent);
      } catch (error) {
        console.error('Error reading README.md:', error);
        process.exit(1);
      }
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
