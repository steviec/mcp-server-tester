/**
 * Server metadata tests for MCP server lifecycle
 */

import { DiagnosticTest } from '../DiagnosticTest.js';
import { TEST_SEVERITY, type DiagnosticResult, type ComplianceConfig } from '../types.js';
import type { McpClient } from '../../../shared/core/mcp-client.js';

interface ServerInfo {
  name: string;
  version: string;
  title?: string;
}

interface ImplementationDetails {
  name: string;
  version: string;
}

export class ServerMetadataTests extends DiagnosticTest {
  readonly name = 'Lifecycle: Server Info & Metadata';
  readonly description = 'Tests MCP server metadata validation and compliance';
  readonly category = 'lifecycle';
  readonly feature = 'initialization' as const;
  readonly severity = TEST_SEVERITY.INFO;

  async execute(client: McpClient, _config: ComplianceConfig): Promise<DiagnosticResult> {
    try {
      const results = await Promise.allSettled([
        this.testServerInfo(client),
        this.testImplementationDetails(client),
        this.testInstructionsField(client),
        this.testMetadataFormat(client),
      ]);

      const issues: string[] = [];
      const warnings: string[] = [];
      const details: Record<string, unknown> = {};

      // Process test results
      results.forEach((result, index) => {
        const testNames = [
          'ServerInfo',
          'ImplementationDetails',
          'InstructionsField',
          'MetadataFormat',
        ];

        if (result.status === 'rejected') {
          const error = String(result.reason);
          if (error.includes('instructions') || error.includes('title')) {
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
          `Server metadata has ${issues.length} issue(s) and ${warnings.length} warning(s)`,
          { issues, warnings, details },
          [
            'Ensure server provides valid name and version in server info',
            'Verify implementation details follow MCP specification format',
            'Consider adding server title and instructions for better user experience',
          ]
        );
      }

      if (warnings.length > 0) {
        return this.createResult(
          true,
          `Server metadata valid with ${warnings.length} recommendation(s)`,
          { warnings, details },
          [
            'Consider adding instructions field to help users understand server capabilities',
            'Add title field for better server identification',
          ]
        );
      }

      return this.createResult(true, 'Server metadata is complete and compliant', details);
    } catch (error) {
      return this.createResult(
        false,
        'Server metadata test failed',
        { error: error instanceof Error ? error.message : String(error) },
        ['Check server metadata implementation and MCP protocol compliance']
      );
    }
  }

  private async testServerInfo(client: McpClient): Promise<unknown> {
    try {
      const serverVersion = client.sdk.getServerVersion();

      if (!serverVersion || typeof serverVersion !== 'object') {
        throw new Error('Server did not provide version information');
      }

      const serverInfo = serverVersion as ServerInfo;

      // Validate required fields
      if (!serverInfo.name || typeof serverInfo.name !== 'string') {
        throw new Error('Server name is missing or invalid');
      }

      if (!serverInfo.version || typeof serverInfo.version !== 'string') {
        throw new Error('Server version is missing or invalid');
      }

      // Check for semantic versioning pattern
      const semverPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
      const isValidSemver = semverPattern.test(serverInfo.version);

      return {
        status: 'passed',
        message: `Server info valid (name: "${serverInfo.name}", version: "${serverInfo.version}")`,
        serverInfo: {
          name: serverInfo.name,
          version: serverInfo.version,
          title: serverInfo.title,
          hasTitle: !!serverInfo.title,
          isValidSemver,
        },
      };
    } catch (error) {
      throw new Error(`Server info validation failed: ${error}`);
    }
  }

  private async testImplementationDetails(client: McpClient): Promise<unknown> {
    try {
      const serverVersion = client.sdk.getServerVersion();
      const implementationDetails = serverVersion as ImplementationDetails;

      // Validate implementation details structure
      const validation = {
        hasName: !!implementationDetails.name,
        hasVersion: !!implementationDetails.version,
        nameType: typeof implementationDetails.name,
        versionType: typeof implementationDetails.version,
      };

      if (!validation.hasName || validation.nameType !== 'string') {
        throw new Error('Implementation name is missing or not a string');
      }

      if (!validation.hasVersion || validation.versionType !== 'string') {
        throw new Error('Implementation version is missing or not a string');
      }

      return {
        status: 'passed',
        message: 'Implementation details are valid',
        validation,
        implementation: {
          name: implementationDetails.name,
          version: implementationDetails.version,
        },
      };
    } catch (error) {
      throw new Error(`Implementation details validation failed: ${error}`);
    }
  }

  private async testInstructionsField(client: McpClient): Promise<unknown> {
    try {
      const instructions = client.sdk.getInstructions();

      if (instructions === null || instructions === undefined) {
        throw new Error('Server does not provide instructions field');
      }

      if (typeof instructions === 'string') {
        return {
          status: 'passed',
          message: 'Server provides instructions field',
          instructions: {
            present: true,
            type: 'string',
            length: instructions.length,
            content: instructions.slice(0, 100) + (instructions.length > 100 ? '...' : ''),
          },
        };
      } else {
        return {
          status: 'passed',
          message: 'Server provides instructions field (non-string format)',
          instructions: {
            present: true,
            type: typeof instructions,
            content: instructions,
          },
        };
      }
    } catch (error) {
      throw new Error(`Instructions field not available or accessible: ${error}`);
    }
  }

  private async testMetadataFormat(client: McpClient): Promise<unknown> {
    try {
      const serverVersion = client.sdk.getServerVersion();
      const capabilities = client.sdk.getServerCapabilities();

      // Validate overall metadata format compliance
      const formatValidation = {
        serverVersionPresent: !!serverVersion,
        capabilitiesPresent: !!capabilities,
        serverVersionIsObject: typeof serverVersion === 'object',
        capabilitiesIsObject: typeof capabilities === 'object',
      };

      // Check for any extra/unknown fields that might indicate format issues
      const serverVersionObj = serverVersion as Record<string, unknown>;
      const knownServerFields = ['name', 'version', 'title'];
      const unknownServerFields = Object.keys(serverVersionObj).filter(
        key => !knownServerFields.includes(key)
      );

      if (!formatValidation.serverVersionPresent) {
        throw new Error('Server version metadata missing');
      }

      if (!formatValidation.capabilitiesPresent) {
        throw new Error('Server capabilities metadata missing');
      }

      if (!formatValidation.serverVersionIsObject) {
        throw new Error('Server version metadata is not an object');
      }

      if (!formatValidation.capabilitiesIsObject) {
        throw new Error('Server capabilities metadata is not an object');
      }

      return {
        status: 'passed',
        message: 'Metadata format compliance verified',
        formatValidation,
        analysis: {
          unknownServerFields,
          hasUnknownFields: unknownServerFields.length > 0,
        },
      };
    } catch (error) {
      throw new Error(`Metadata format compliance test failed: ${error}`);
    }
  }
}
