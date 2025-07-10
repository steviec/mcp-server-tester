/**
 * Configuration loader for YAML test files and JSON server config
 */

import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import Ajv from 'ajv';
import type {
  IntegrationTestConfig,
  EvaluationTestConfig,
  McpServersConfig,
  ServerConfig,
} from '../core/types.js';

// Import JSON schemas
import integrationTestSchema from '../schemas/integration-test.json' assert { type: 'json' };
import evaluationTestSchema from '../schemas/evaluation-test.json' assert { type: 'json' };
import serverConfigSchema from '../schemas/server-config.json' assert { type: 'json' };

export class ConfigLoader {
  private static ajv = new Ajv({ allErrors: true, verbose: true });
  /**
   * Load integration test configuration from YAML file
   */
  static loadIntegrationConfig(filePath: string): IntegrationTestConfig {
    const resolvedPath = this.resolvePath(filePath);
    const content = this.readFile(resolvedPath);

    let config: unknown;
    try {
      if (this.isYamlFile(resolvedPath)) {
        config = YAML.parse(content);
      } else {
        config = JSON.parse(content);
      }
    } catch (error) {
      throw new Error(
        `Invalid configuration format in ${resolvedPath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return this.validateWithSchema(
      config,
      integrationTestSchema,
      resolvedPath,
      'Integration test configuration'
    ) as IntegrationTestConfig;
  }

  /**
   * Load evaluation test configuration from YAML file
   */
  static loadEvaluationConfig(filePath: string): EvaluationTestConfig {
    const resolvedPath = this.resolvePath(filePath);
    const content = this.readFile(resolvedPath);

    let config: unknown;
    try {
      if (this.isYamlFile(resolvedPath)) {
        config = YAML.parse(content);
      } else {
        config = JSON.parse(content);
      }
    } catch (error) {
      throw new Error(
        `Invalid configuration format in ${resolvedPath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return this.validateWithSchema(
      config,
      evaluationTestSchema,
      resolvedPath,
      'Evaluation test configuration'
    ) as EvaluationTestConfig;
  }

  /**
   * Load MCP server configuration from JSON file
   */
  static loadServerConfig(filePath: string, serverName?: string): ServerConfig {
    const resolvedPath = this.resolvePath(filePath);
    const content = this.readFile(resolvedPath);

    let config: unknown;
    try {
      config = JSON.parse(content);
    } catch (error) {
      throw new Error(
        `Invalid JSON in server config ${resolvedPath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const mcpConfig = this.validateWithSchema(
      config,
      serverConfigSchema,
      resolvedPath,
      'Server configuration'
    ) as McpServersConfig;

    if (serverName) {
      if (!mcpConfig.mcpServers[serverName]) {
        const availableServers = Object.keys(mcpConfig.mcpServers).join(', ');
        throw new Error(
          `Server '${serverName}' not found in config. Available servers: ${availableServers}`
        );
      }
      return mcpConfig.mcpServers[serverName];
    }

    // If no server name specified, use the first (or only) server
    const serverNames = Object.keys(mcpConfig.mcpServers);
    if (serverNames.length === 0) {
      throw new Error('No servers found in configuration');
    }

    if (serverNames.length > 1) {
      throw new Error(
        `Multiple servers found in config: ${serverNames.join(', ')}. Please specify a server name.`
      );
    }

    return mcpConfig.mcpServers[serverNames[0]];
  }

  private static resolvePath(filePath: string): string {
    return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  }

  private static readFile(filePath: string): string {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Configuration file not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf-8');
  }

  private static isYamlFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.yaml' || ext === '.yml';
  }

  /**
   * Validate configuration using JSON Schema with helpful error messages
   */
  private static validateWithSchema(
    config: unknown,
    schema: any,
    filePath: string,
    configType: string
  ): unknown {
    const validate = this.ajv.compile(schema);
    const valid = validate(config);

    if (!valid) {
      const errors = validate.errors || [];
      const errorMessages = errors.map(error => {
        const path = error.instancePath ? `at '${error.instancePath}'` : 'at root';
        const message = error.message || 'validation failed';
        const data = error.data !== undefined ? ` (got: ${JSON.stringify(error.data)})` : '';
        return `  - ${path}: ${message}${data}`;
      });

      throw new Error(
        `${configType} validation failed in ${filePath}:\n${errorMessages.join('\n')}\n\n` +
          `Please check your configuration format. See the documentation for examples.`
      );
    }

    return config;
  }
}
