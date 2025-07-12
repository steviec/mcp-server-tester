/**
 * MCP Client connection management with transport support
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { TransportOptions, ServerConfig } from './types.js';

// Re-export TransportOptions for external use
export type { TransportOptions } from './types.js';

export class McpClient {
  private client: Client;
  private transport: any;
  private connected = false;

  constructor() {
    this.client = new Client({
      name: 'mcp-tester',
      version: '1.0.0',
    });
  }

  async connect(options: TransportOptions): Promise<void> {
    if (this.connected) {
      throw new Error('Client is already connected');
    }

    try {
      this.transport = await this.createTransport(options);
      await this.client.connect(this.transport);
      this.connected = true;
    } catch (error) {
      throw new Error(
        `Failed to connect to MCP server: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      await this.client.close();
      this.connected = false;
    } catch (error) {
      console.error('Error disconnecting from MCP server:', error);
    }
  }

  async listTools(): Promise<any> {
    this.ensureConnected();
    try {
      const result = await this.client.listTools();
      return result;
    } catch (error) {
      throw new Error(
        `Failed to list tools: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async callTool(name: string, arguments_: Record<string, any>): Promise<any> {
    this.ensureConnected();
    try {
      const result = await this.client.callTool({
        name,
        arguments: arguments_,
      });
      return result;
    } catch (error) {
      throw new Error(
        `Failed to call tool ${name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async listResources(): Promise<any> {
    this.ensureConnected();
    try {
      const result = await this.client.listResources();
      return result;
    } catch (error) {
      throw new Error(
        `Failed to list resources: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async readResource(uri: string): Promise<any> {
    this.ensureConnected();
    try {
      const result = await this.client.readResource({ uri });
      return result;
    } catch (error) {
      throw new Error(
        `Failed to read resource ${uri}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async listPrompts(): Promise<any> {
    this.ensureConnected();
    try {
      const result = await this.client.listPrompts();
      return result;
    } catch (error) {
      throw new Error(
        `Failed to list prompts: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getPrompt(name: string, arguments_: Record<string, any> = {}): Promise<any> {
    this.ensureConnected();
    try {
      const result = await this.client.getPrompt({
        name,
        arguments: arguments_,
      });
      return result;
    } catch (error) {
      throw new Error(
        `Failed to get prompt ${name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async createTransport(options: TransportOptions): Promise<any> {
    switch (options.type) {
      case 'stdio':
        return this.createStdioTransport(options);
      case 'sse':
        return this.createSSETransport(options);
      case 'http':
        throw new Error('HTTP transport not yet implemented');
      default:
        throw new Error(`Unsupported transport type: ${options.type}`);
    }
  }

  private async createStdioTransport(options: TransportOptions): Promise<StdioClientTransport> {
    if (!options.command) {
      throw new Error('Command is required for stdio transport');
    }

    return new StdioClientTransport({
      command: options.command,
      args: options.args || [],
      env: { ...process.env, ...options.env } as Record<string, string>,
    });
  }

  private async createSSETransport(options: TransportOptions): Promise<SSEClientTransport> {
    if (!options.url) {
      throw new Error('URL is required for SSE transport');
    }

    return new SSEClientTransport(new URL(options.url));
  }

  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Client is not connected. Call connect() first.');
    }
  }
}

export function createTransportOptions(serverConfig: ServerConfig): TransportOptions {
  // Default to stdio for command-based servers
  return {
    type: 'stdio',
    command: serverConfig.command,
    args: serverConfig.args,
    env: serverConfig.env,
  };
}

export function createTransportOptionsFromUrl(url: string): TransportOptions {
  const parsedUrl = new URL(url);

  // Determine transport type based on URL path
  if (parsedUrl.pathname.endsWith('/mcp')) {
    return { type: 'http', url };
  } else if (parsedUrl.pathname.endsWith('/sse')) {
    return { type: 'sse', url };
  } else {
    // Default to SSE for URLs
    return { type: 'sse', url };
  }
}

export function createServerConfigFromCli(
  command: string,
  args?: string,
  env?: string
): ServerConfig {
  const serverConfig: ServerConfig = {
    command,
  };

  // Parse comma-separated args
  if (args) {
    serverConfig.args = args.split(',').map(arg => arg.trim());
  }

  // Parse key=value,key2=value2 environment variables
  if (env) {
    serverConfig.env = {};
    const envPairs = env.split(',');
    for (const pair of envPairs) {
      const [key, value] = pair.split('=');
      if (key && value) {
        serverConfig.env[key.trim()] = value.trim();
      }
    }
  }

  return serverConfig;
}
