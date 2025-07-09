/**
 * Configuration loader for YAML test files and JSON server config
 */

import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import type { 
  IntegrationTestConfig, 
  EvaluationTestConfig, 
  McpServersConfig, 
  ServerConfig 
} from '../core/types.js';

export class ConfigLoader {
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
      throw new Error(`Invalid configuration format in ${resolvedPath}: ${error instanceof Error ? error.message : String(error)}`);
    }

    return this.validateIntegrationConfig(config, resolvedPath);
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
      throw new Error(`Invalid configuration format in ${resolvedPath}: ${error instanceof Error ? error.message : String(error)}`);
    }

    return this.validateEvaluationConfig(config, resolvedPath);
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
      throw new Error(`Invalid JSON in server config ${resolvedPath}: ${error instanceof Error ? error.message : String(error)}`);
    }

    const mcpConfig = this.validateServerConfig(config, resolvedPath);
    
    if (serverName) {
      if (!mcpConfig.mcpServers[serverName]) {
        const availableServers = Object.keys(mcpConfig.mcpServers).join(', ');
        throw new Error(`Server '${serverName}' not found in config. Available servers: ${availableServers}`);
      }
      return mcpConfig.mcpServers[serverName];
    }

    // If no server name specified, use the first (or only) server
    const serverNames = Object.keys(mcpConfig.mcpServers);
    if (serverNames.length === 0) {
      throw new Error('No servers found in configuration');
    }
    
    if (serverNames.length > 1) {
      throw new Error(`Multiple servers found in config: ${serverNames.join(', ')}. Please specify a server name.`);
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

  private static validateIntegrationConfig(config: unknown, filePath: string): IntegrationTestConfig {
    if (!config || typeof config !== 'object') {
      throw new Error(`Invalid configuration format in ${filePath}: expected object`);
    }

    const obj = config as Record<string, any>;

    if (!obj.server_config || typeof obj.server_config !== 'string') {
      throw new Error(`Invalid configuration in ${filePath}: server_config is required and must be a string`);
    }

    if (!obj.tests || !Array.isArray(obj.tests)) {
      throw new Error(`Invalid configuration in ${filePath}: tests is required and must be an array`);
    }

    // Validate each test
    for (const test of obj.tests) {
      if (!test.name || typeof test.name !== 'string') {
        throw new Error(`Invalid test in ${filePath}: name is required and must be a string`);
      }

      if (!test.calls || !Array.isArray(test.calls)) {
        throw new Error(`Invalid test '${test.name}' in ${filePath}: calls is required and must be an array`);
      }

      // Validate each call
      for (const call of test.calls) {
        if (!call.tool || typeof call.tool !== 'string') {
          throw new Error(`Invalid call in test '${test.name}': tool is required and must be a string`);
        }

        if (!call.params || typeof call.params !== 'object') {
          throw new Error(`Invalid call in test '${test.name}': params is required and must be an object`);
        }

        if (!call.expect || typeof call.expect !== 'object') {
          throw new Error(`Invalid call in test '${test.name}': expect is required and must be an object`);
        }

        if (typeof call.expect.success !== 'boolean') {
          throw new Error(`Invalid call in test '${test.name}': expect.success is required and must be a boolean`);
        }
      }
    }

    return obj as IntegrationTestConfig;
  }

  private static validateEvaluationConfig(config: unknown, filePath: string): EvaluationTestConfig {
    if (!config || typeof config !== 'object') {
      throw new Error(`Invalid configuration format in ${filePath}: expected object`);
    }

    const obj = config as Record<string, any>;

    if (!obj.server_config || typeof obj.server_config !== 'string') {
      throw new Error(`Invalid configuration in ${filePath}: server_config is required and must be a string`);
    }

    if (!obj.options || typeof obj.options !== 'object') {
      throw new Error(`Invalid configuration in ${filePath}: options is required and must be an object`);
    }

    if (!obj.options.models || !Array.isArray(obj.options.models)) {
      throw new Error(`Invalid configuration in ${filePath}: options.models is required and must be an array`);
    }

    if (!obj.tests || !Array.isArray(obj.tests)) {
      throw new Error(`Invalid configuration in ${filePath}: tests is required and must be an array`);
    }

    // Validate each test
    for (const test of obj.tests) {
      if (!test.name || typeof test.name !== 'string') {
        throw new Error(`Invalid test in ${filePath}: name is required and must be a string`);
      }

      if (!test.prompt || typeof test.prompt !== 'string') {
        throw new Error(`Invalid test '${test.name}' in ${filePath}: prompt is required and must be a string`);
      }
    }

    return obj as EvaluationTestConfig;
  }

  private static validateServerConfig(config: unknown, filePath: string): McpServersConfig {
    if (!config || typeof config !== 'object') {
      throw new Error(`Invalid server configuration format in ${filePath}: expected object`);
    }

    const obj = config as Record<string, any>;

    if (!obj.mcpServers || typeof obj.mcpServers !== 'object') {
      throw new Error(`Invalid server configuration in ${filePath}: mcpServers is required and must be an object`);
    }

    // Validate each server
    for (const [serverName, serverConfig] of Object.entries(obj.mcpServers)) {
      if (!serverConfig || typeof serverConfig !== 'object') {
        throw new Error(`Invalid server configuration for '${serverName}': expected object`);
      }

      const server = serverConfig as Record<string, any>;

      if (!server.command || typeof server.command !== 'string') {
        throw new Error(`Invalid server configuration for '${serverName}': command is required and must be a string`);
      }

      if (server.args && !Array.isArray(server.args)) {
        throw new Error(`Invalid server configuration for '${serverName}': args must be an array`);
      }

      if (server.env && typeof server.env !== 'object') {
        throw new Error(`Invalid server configuration for '${serverName}': env must be an object`);
      }
    }

    return obj as McpServersConfig;
  }
}