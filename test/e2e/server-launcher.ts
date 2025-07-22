/**
 * Test server launcher utility for E2E tests
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';

export interface ServerLaunchConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  timeout?: number;
}

export class TestServerLauncher {
  private process?: ChildProcess;
  private config: ServerLaunchConfig;

  constructor(config: ServerLaunchConfig) {
    this.config = {
      timeout: 5000,
      ...config,
    };
  }

  async start(): Promise<void> {
    if (this.process) {
      throw new Error('Server is already running');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.process) {
          this.process.kill();
        }
        reject(new Error(`Server failed to start within ${this.config.timeout}ms`));
      }, this.config.timeout);

      this.process = spawn(this.config.command, this.config.args, {
        env: { ...process.env, ...this.config.env },
        stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr all piped
      });

      this.process.on('error', error => {
        clearTimeout(timeout);
        reject(new Error(`Failed to start server: ${error.message}`));
      });

      // Capture stderr to detect when server is ready, but don't let it reach console
      let serverReady = false;
      this.process.stderr?.on('data', data => {
        const output = data.toString();
        if (output.includes('Test MCP server running') && !serverReady) {
          serverReady = true;
          clearTimeout(timeout);
          resolve();
        }
        // Explicitly consume stderr data to prevent it from reaching the console
        // This data is captured but not displayed anywhere
      });

      this.process.on('exit', code => {
        if (code !== 0 && code !== null) {
          clearTimeout(timeout);
          reject(new Error(`Server exited with code ${code}`));
        }
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.process) {
      return;
    }

    return new Promise(resolve => {
      if (!this.process) {
        resolve();
        return;
      }

      this.process.on('exit', () => {
        this.process = undefined;
        resolve();
      });

      // Try graceful shutdown first
      this.process.kill('SIGTERM');

      // Force kill after 2 seconds
      setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGKILL');
        }
      }, 2000);
    });
  }

  getProcess(): ChildProcess | undefined {
    return this.process;
  }

  isRunning(): boolean {
    return !!this.process && !this.process.killed;
  }
}

/**
 * Get the path to the test server
 */
export function getTestServerPath(): string {
  return path.resolve(process.cwd(), 'test/fixtures/mock-servers/test-mcp-server.js');
}

/**
 * Get the path to the test server config
 */
export function getTestServerConfigPath(): string {
  return path.resolve(process.cwd(), 'test/fixtures/test-server-config.json');
}

/**
 * Create a test server launcher with default configuration
 */
export function createTestServerLauncher(): TestServerLauncher {
  return new TestServerLauncher({
    command: 'node',
    args: [getTestServerPath()],
    env: {
      NODE_ENV: 'test',
    },
  });
}

/**
 * Get the path to the compliance mock servers config
 */
export function getComplianceMockServersConfigPath(): string {
  return path.resolve(process.cwd(), 'test/fixtures/mock-servers/server-configs.json');
}

/**
 * Create test server launchers for compliance testing
 */
export function createComplianceTestServers(): {
  compliant: TestServerLauncher;
  nonCompliant: TestServerLauncher;
  minimal: TestServerLauncher;
} {
  const baseConfig = {
    command: 'node',
    env: { NODE_ENV: 'test' },
  };

  return {
    compliant: new TestServerLauncher({
      ...baseConfig,
      args: [path.resolve(process.cwd(), 'test/fixtures/mock-servers/compliant-server.js')],
    }),
    nonCompliant: new TestServerLauncher({
      ...baseConfig,
      args: [path.resolve(process.cwd(), 'test/fixtures/mock-servers/non-compliant-server.js')],
    }),
    minimal: new TestServerLauncher({
      ...baseConfig,
      args: [path.resolve(process.cwd(), 'test/fixtures/mock-servers/minimal-server.js')],
    }),
  };
}
