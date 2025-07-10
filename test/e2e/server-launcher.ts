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
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.process.on('error', error => {
        clearTimeout(timeout);
        reject(new Error(`Failed to start server: ${error.message}`));
      });

      // Wait for server to indicate it's ready
      this.process.stderr?.on('data', data => {
        const output = data.toString();
        if (output.includes('Test MCP server running')) {
          clearTimeout(timeout);
          resolve();
        }
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
  return path.resolve(process.cwd(), 'examples/test-server.js');
}

/**
 * Get the path to the test server config
 */
export function getTestServerConfigPath(): string {
  return path.resolve(process.cwd(), 'examples/server-config.json');
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
