/**
 * Centralized MCP capability detection
 * Determines which optional MCP capabilities a server actually supports
 */

import type { McpClient } from '../../shared/core/mcp-client.js';

/**
 * MCP specification-compliant capability names
 * These are the optional capabilities a server can advertise
 */
export type McpCapability = 'tools' | 'resources' | 'prompts' | 'logging' | 'sampling' | 'roots';

/**
 * All possible MCP capabilities for reference
 */
export const ALL_MCP_CAPABILITIES: McpCapability[] = [
  'tools',
  'resources',
  'prompts',
  'logging',
  'sampling',
  'roots',
];

/**
 * Centralized capability detection for MCP servers
 */
export class CapabilityDetector {
  /**
   * Detect which MCP capabilities the server actually supports
   * First tries to read from initialization response, then falls back to probing
   */
  static async detectCapabilities(client: McpClient): Promise<Set<McpCapability>> {
    try {
      // First try to get capabilities from the initialization response
      const capabilities = await this.getCapabilitiesFromInit(client);
      if (capabilities.size > 0) {
        return capabilities;
      }

      // Fallback: probe each capability by testing if methods work
      return await this.probeCapabilities(client);
    } catch (error) {
      // If all else fails, return empty set
      console.warn('Failed to detect server capabilities:', error);
      return new Set();
    }
  }

  /**
   * Get capabilities from the server's initialization response
   */
  private static async getCapabilitiesFromInit(client: McpClient): Promise<Set<McpCapability>> {
    try {
      // Try to get the server capabilities from the client
      // Note: This method may not exist on all McpClient implementations
      type ClientWithServerInfo = McpClient & {
        getServerInfo?: () => Promise<{ capabilities?: Record<string, unknown> }>;
      };
      const clientWithInfo = client as ClientWithServerInfo;
      const serverInfo = clientWithInfo.getServerInfo ? await clientWithInfo.getServerInfo() : null;
      if (serverInfo?.capabilities) {
        const detectedCapabilities = new Set<McpCapability>();

        // Check each known capability
        for (const capability of ALL_MCP_CAPABILITIES) {
          if (serverInfo.capabilities[capability]) {
            detectedCapabilities.add(capability);
          }
        }

        return detectedCapabilities;
      }
    } catch {
      // Expected if getServerInfo is not available - fall through to probing
    }

    return new Set();
  }

  /**
   * Probe capabilities by testing if key methods work
   * This is a fallback when we can't get capabilities from initialization
   */
  private static async probeCapabilities(client: McpClient): Promise<Set<McpCapability>> {
    const capabilities = new Set<McpCapability>();

    // Test each capability by calling its primary method
    const probeTests: Array<{ capability: McpCapability; test: () => Promise<unknown> }> = [
      {
        capability: 'tools',
        test: () => client.sdk.listTools(),
      },
      {
        capability: 'resources',
        test: () => client.sdk.listResources(),
      },
      {
        capability: 'prompts',
        test: () => client.sdk.listPrompts(),
      },
      // Note: 'logging', 'sampling', and 'roots' are harder to probe
      // as they don't have simple list methods
    ];

    // Test each capability in parallel for efficiency
    const results = await Promise.allSettled(
      probeTests.map(async ({ capability, test }) => {
        try {
          await test();
          return capability;
        } catch {
          // Expected if capability is not supported
          return null;
        }
      })
    );

    // Collect successful probes
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        capabilities.add(result.value);
      }
    });

    return capabilities;
  }

  /**
   * Get the list of capabilities that are not supported by the server
   */
  static getUnsupportedCapabilities(supportedCapabilities: Set<McpCapability>): McpCapability[] {
    return ALL_MCP_CAPABILITIES.filter(cap => !supportedCapabilities.has(cap));
  }

  /**
   * Check if a server supports a specific capability
   */
  static hasCapability(capabilities: Set<McpCapability>, capability: McpCapability): boolean {
    return capabilities.has(capability);
  }

  /**
   * Format capabilities for display
   */
  static formatCapabilities(capabilities: Set<McpCapability>): string {
    if (capabilities.size === 0) {
      return 'None detected';
    }

    return Array.from(capabilities)
      .sort()
      .map(cap => `${cap} ✅`)
      .join(' | ');
  }

  /**
   * Format unsupported capabilities for display
   */
  static formatUnsupportedCapabilities(capabilities: Set<McpCapability>): string {
    const unsupported = this.getUnsupportedCapabilities(capabilities);
    if (unsupported.length === 0) {
      return 'All capabilities supported';
    }

    return unsupported
      .sort()
      .map(cap => `${cap} ⏭️`)
      .join(' | ');
  }
}
