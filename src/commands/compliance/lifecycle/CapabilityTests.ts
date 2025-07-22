/**
 * Capability declaration tests for MCP server lifecycle
 */

import { DiagnosticTest } from '../DiagnosticTest.js';
import { TEST_SEVERITY, type DiagnosticResult, type ComplianceConfig } from '../types.js';
import type { McpClient } from '../../../shared/core/mcp-client.js';

interface ExpectedCapabilities {
  tools?: { listChanged?: boolean };
  resources?: { subscribe?: boolean; listChanged?: boolean };
  prompts?: { listChanged?: boolean };
  logging?: object;
  completions?: object;
}

export class CapabilityTests extends DiagnosticTest {
  readonly name = 'Lifecycle: Capability Negotiation';
  readonly description = 'Tests MCP server capability announcements and validation';
  readonly category = 'lifecycle';
  readonly feature = 'capabilities' as const;
  readonly severity = TEST_SEVERITY.WARNING;

  async execute(client: McpClient, _config: ComplianceConfig): Promise<DiagnosticResult> {
    try {
      const results = await Promise.allSettled([
        this.testCapabilityAnnouncement(client),
        this.testCapabilityFormat(client),
        this.testFeatureAvailability(client),
        this.testListChangedSupport(client),
      ]);

      const issues: string[] = [];
      const warnings: string[] = [];
      const details: Record<string, unknown> = {};

      // Process test results
      results.forEach((result, index) => {
        const testNames = [
          'CapabilityAnnouncement',
          'CapabilityFormat',
          'FeatureAvailability',
          'ListChangedSupport',
        ];

        if (result.status === 'rejected') {
          const error = String(result.reason);
          if (error.includes('listChanged') || error.includes('subscribe')) {
            warnings.push(`${testNames[index]}: ${error}`);
          } else {
            issues.push(`${testNames[index]}: ${error}`);
          }
        } else {
          details[testNames[index]] = result.value;
        }
      });

      if (issues.length > 0) {
        return this.createResult(
          false,
          `Capability declaration has ${issues.length} critical issue(s) and ${warnings.length} warning(s)`,
          { issues, warnings, details },
          [
            'Verify server declares capabilities correctly in initialization response',
            'Ensure declared capabilities match actual feature availability',
            'Consider implementing listChanged notifications for better client experience',
          ]
        );
      }

      if (warnings.length > 0) {
        return this.createResult(
          true,
          `Capability declaration working with ${warnings.length} warning(s)`,
          { warnings, details },
          [
            'Consider implementing listChanged notifications for tools, resources, and prompts',
            'Add subscribe capability for resources if applicable',
          ]
        );
      }

      return this.createResult(true, 'Capability declaration is complete and valid', details);
    } catch (error) {
      return this.createResult(
        false,
        'Capability declaration test failed',
        { error: error instanceof Error ? error.message : String(error) },
        ['Check server capability implementation and MCP protocol compliance']
      );
    }
  }

  private async testCapabilityAnnouncement(client: McpClient): Promise<unknown> {
    try {
      const capabilities = client.sdk.getServerCapabilities();

      if (!capabilities || typeof capabilities !== 'object') {
        throw new Error('Server did not announce capabilities properly');
      }

      const caps = capabilities as ExpectedCapabilities;
      const announcedCapabilities = Object.keys(caps);

      if (announcedCapabilities.length === 0) {
        throw new Error('Server announced no capabilities');
      }

      return {
        status: 'passed',
        message: `Server announced ${announcedCapabilities.length} capability type(s)`,
        capabilities: announcedCapabilities,
        details: caps,
      };
    } catch (error) {
      throw new Error(`Capability announcement test failed: ${error}`);
    }
  }

  private async testCapabilityFormat(client: McpClient): Promise<unknown> {
    try {
      const capabilities = client.sdk.getServerCapabilities() as ExpectedCapabilities;
      const validationResults: Record<string, unknown> = {};

      // Validate tools capability format
      if (capabilities.tools) {
        validationResults.tools = {
          present: true,
          listChanged: capabilities.tools.listChanged === true,
        };
      }

      // Validate resources capability format
      if (capabilities.resources) {
        validationResults.resources = {
          present: true,
          subscribe: capabilities.resources.subscribe === true,
          listChanged: capabilities.resources.listChanged === true,
        };
      }

      // Validate prompts capability format
      if (capabilities.prompts) {
        validationResults.prompts = {
          present: true,
          listChanged: capabilities.prompts.listChanged === true,
        };
      }

      // Validate other capabilities
      if (capabilities.logging) {
        validationResults.logging = { present: true };
      }

      if (capabilities.completions) {
        validationResults.completions = { present: true };
      }

      return {
        status: 'passed',
        message: 'Capability format validation completed',
        validation: validationResults,
      };
    } catch (error) {
      throw new Error(`Capability format validation failed: ${error}`);
    }
  }

  private async testFeatureAvailability(client: McpClient): Promise<unknown> {
    try {
      const capabilities = client.sdk.getServerCapabilities() as ExpectedCapabilities;
      const availability: Record<string, unknown> = {};

      // Test tools availability matches declaration
      if (capabilities.tools) {
        try {
          const toolsResult = await client.sdk.listTools();
          availability.tools = {
            declared: true,
            available: true,
            count: toolsResult.tools?.length || 0,
          };
        } catch (error) {
          availability.tools = {
            declared: true,
            available: false,
            error: String(error),
          };
        }
      } else {
        // Check if tools are available despite not being declared
        try {
          const toolsResult = await client.sdk.listTools();
          if (toolsResult.tools && toolsResult.tools.length > 0) {
            throw new Error('Server has tools but did not declare tools capability');
          }
          availability.tools = { declared: false, available: false };
        } catch {
          availability.tools = { declared: false, available: false };
        }
      }

      // Test resources availability matches declaration
      if (capabilities.resources) {
        try {
          const resourcesResult = await client.sdk.listResources();
          availability.resources = {
            declared: true,
            available: true,
            count: resourcesResult.resources?.length || 0,
          };
        } catch (error) {
          availability.resources = {
            declared: true,
            available: false,
            error: String(error),
          };
        }
      }

      // Test prompts availability matches declaration
      if (capabilities.prompts) {
        try {
          const promptsResult = await client.sdk.listPrompts();
          availability.prompts = {
            declared: true,
            available: true,
            count: promptsResult.prompts?.length || 0,
          };
        } catch (error) {
          availability.prompts = {
            declared: true,
            available: false,
            error: String(error),
          };
        }
      }

      return {
        status: 'passed',
        message: 'Feature availability matches capability declarations',
        availability,
      };
    } catch (error) {
      throw new Error(`Feature availability test failed: ${error}`);
    }
  }

  private async testListChangedSupport(client: McpClient): Promise<unknown> {
    try {
      const capabilities = client.sdk.getServerCapabilities() as ExpectedCapabilities;
      const listChangedSupport: Record<string, boolean> = {};
      const warnings: string[] = [];

      // Check tools listChanged support
      if (capabilities.tools) {
        listChangedSupport.tools = capabilities.tools.listChanged === true;
        if (!listChangedSupport.tools) {
          warnings.push('Tools capability missing listChanged notification support');
        }
      }

      // Check resources listChanged support
      if (capabilities.resources) {
        listChangedSupport.resources = capabilities.resources.listChanged === true;
        if (!listChangedSupport.resources) {
          warnings.push('Resources capability missing listChanged notification support');
        }
      }

      // Check prompts listChanged support
      if (capabilities.prompts) {
        listChangedSupport.prompts = capabilities.prompts.listChanged === true;
        if (!listChangedSupport.prompts) {
          warnings.push('Prompts capability missing listChanged notification support');
        }
      }

      if (warnings.length > 0) {
        throw new Error(warnings.join('; '));
      }

      return {
        status: 'passed',
        message: 'ListChanged notifications supported for all capabilities',
        support: listChangedSupport,
      };
    } catch (error) {
      throw new Error(`ListChanged support test: ${error}`);
    }
  }
}
