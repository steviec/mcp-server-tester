/**
 * Simplified Resources tests leveraging SDK error detection
 * Focuses on business logic validation while SDK handles protocol compliance
 */

import { DiagnosticTest } from '../DiagnosticTest.js';
import { SdkErrorDetector, type SdkErrorTest } from '../SdkErrorDetector.js';
import {
  TEST_SEVERITY,
  ISSUE_TYPE,
  type DiagnosticResult,
  type ComplianceConfig,
} from '../types.js';
import type { McpClient } from '../../../shared/core/mcp-client.js';
import { ErrorCode, type Resource } from '@modelcontextprotocol/sdk/types.js';

export class ResourcesCapabilityTest extends DiagnosticTest {
  readonly name = 'Server Features: Resources - Capability Declaration';
  readonly description = 'Verify server declares resources capability using SDK validation';
  readonly category = 'server-features';
  readonly feature = 'resources' as const;
  readonly severity = TEST_SEVERITY.CRITICAL;
  readonly requiredCapability = 'resources';
  readonly mcpSpecSection = 'Server Features - Resources';

  async execute(client: McpClient, config: ComplianceConfig): Promise<DiagnosticResult> {
    // Use SDK to validate resources capability - it handles all protocol validation
    const sdkTests: SdkErrorTest[] = [
      {
        name: 'Resources Capability Declaration',
        description: 'Validate resources capability through SDK',
        category: 'server-features',
        feature: 'resources',
        severity: TEST_SEVERITY.CRITICAL,
        operation: async (client: McpClient) => await client.sdk.listResources(),
        expectsError: false,
      },
    ];

    try {
      const sdkResults = await SdkErrorDetector.executeTests(client, config, sdkTests);
      const diagnosticResults = SdkErrorDetector.convertTodiagnosticResults(sdkResults);

      const failedTests = diagnosticResults.filter(r => r.status === 'failed');

      if (failedTests.length === 0) {
        const result = await client.sdk.listResources();
        const resourceCount = result.resources?.length || 0;

        return this.createResult(
          true,
          `Resources capability validated via SDK (${resourceCount} resources found)`,
          { resourceCount, sdkValidated: true }
        );
      } else {
        return this.createEnhancedResult({
          success: false,
          message: 'SDK detected resources capability issues',
          details: { failedTests: failedTests.length, results: diagnosticResults },
          issueType: failedTests[0].issueType || ISSUE_TYPE.CRITICAL_FAILURE,
          expected: 'Valid resources capability declaration',
          actual: 'SDK validation failed',
          fixInstructions: failedTests.flatMap(t => t.recommendations || []),
          specLinks: ['https://spec.modelcontextprotocol.io/specification/server/resources/'],
        });
      }
    } catch (error) {
      return this.createResult(
        false,
        'Resources capability validation failed',
        { error: error instanceof Error ? error.message : String(error) },
        ['Check server resources capability implementation', 'Verify server connection']
      );
    }
  }
}

export class ResourceSchemaValidationTest extends DiagnosticTest {
  readonly name = 'Server Features: Resources - Schema Validation';
  readonly description = 'Validate resource schema compliance and quality (business logic)';
  readonly category = 'server-features';
  readonly feature = 'resources' as const;
  readonly severity = TEST_SEVERITY.WARNING;
  readonly requiredCapability = 'resources';
  readonly mcpSpecSection = 'Server Features - Resources';

  async execute(client: McpClient, _config: ComplianceConfig): Promise<DiagnosticResult> {
    try {
      // SDK handles the listResources call validation, we focus on business logic
      const result = await client.sdk.listResources();
      const resources = result.resources || [];

      if (resources.length === 0) {
        return this.createResult(false, 'No resources available for schema validation', {
          resourceCount: 0,
        });
      }

      const issues: string[] = [];
      const warnings: string[] = [];
      const validations: string[] = [];

      // Business logic validation (not protocol validation)
      resources.forEach((resource: Resource, index: number) => {
        // Check for required business fields
        if (!resource.uri || resource.uri.trim().length === 0) {
          issues.push(`Resource ${index}: Empty URI`);
        } else {
          // Basic URI format validation
          try {
            new URL(resource.uri);
            validations.push(`Resource ${index}: Valid URI format`);
          } catch {
            // Not a full URL, might be a valid URI scheme
            if (resource.uri.includes('://') || resource.uri.startsWith('/')) {
              validations.push(`Resource ${index}: Acceptable URI format`);
            } else {
              warnings.push(`Resource ${index}: URI format unclear: ${resource.uri}`);
            }
          }
        }

        if (!resource.name || resource.name.trim().length === 0) {
          warnings.push(`Resource ${index}: Missing name`);
        } else if (resource.name.length > 100) {
          warnings.push(
            `Resource ${index} (${resource.name}): Name very long (${resource.name.length} chars)`
          );
        } else {
          validations.push(`Resource ${index} (${resource.name}): Valid name`);
        }

        if (resource.description) {
          if (resource.description.length < 10) {
            warnings.push(`Resource ${index} (${resource.name}): Very short description`);
          } else if (resource.description.length > 500) {
            warnings.push(
              `Resource ${index} (${resource.name}): Very long description (${resource.description.length} chars)`
            );
          } else {
            validations.push(`Resource ${index} (${resource.name}): Good description`);
          }
        }

        // Check MIME type if provided
        if (resource.mimeType) {
          if (resource.mimeType.includes('/')) {
            validations.push(`Resource ${index} (${resource.name}): Has MIME type`);
          } else {
            warnings.push(`Resource ${index} (${resource.name}): Invalid MIME type format`);
          }
        }
      });

      // Check for duplicate URIs (business logic)
      const uris = resources.map(r => r.uri);
      const duplicates = uris.filter((uri, index) => uris.indexOf(uri) !== index);
      if (duplicates.length > 0) {
        issues.push(`Duplicate resource URIs: ${duplicates.join(', ')}`);
      }

      const hasIssues = issues.length > 0;
      const message = hasIssues
        ? `Resource schema validation found ${issues.length} issues, ${warnings.length} warnings`
        : warnings.length > 0
          ? `Resource schemas valid with ${warnings.length} improvement suggestions`
          : `All ${resources.length} resource schemas are well-formed`;

      return this.createResult(
        !hasIssues,
        message,
        {
          resourceCount: resources.length,
          issues,
          warnings,
          validations: validations.slice(0, 10), // Limit output
        },
        hasIssues || warnings.length > 0
          ? [...issues.map(i => `Fix: ${i}`), ...warnings.map(w => `Consider: ${w}`)]
          : undefined
      );
    } catch (error) {
      return this.createResult(
        false,
        'Resource schema validation failed',
        { error: error instanceof Error ? error.message : String(error) },
        ['Check resources/list implementation', 'Verify resource schema format']
      );
    }
  }
}

export class ResourceReadingTest extends DiagnosticTest {
  readonly name = 'Server Features: Resources - Reading (resources/read)';
  readonly description = 'Test resource reading using SDK error detection';
  readonly category = 'server-features';
  readonly feature = 'resources' as const;
  readonly severity = TEST_SEVERITY.WARNING;
  readonly requiredCapability = 'resources';

  async execute(client: McpClient, config: ComplianceConfig): Promise<DiagnosticResult> {
    try {
      // Get available resources via SDK
      const resourcesResult = await client.sdk.listResources();
      const resources = resourcesResult.resources || [];

      if (resources.length === 0) {
        return this.createResult(false, 'No resources available for reading test', {
          resourceCount: 0,
        });
      }

      // Test reading with SDK error detection
      const sdkTests: SdkErrorTest[] = [
        {
          name: 'Invalid Resource URI Error Handling',
          description: 'Test error handling for non-existent resources',
          category: 'server-features',
          feature: 'resources',
          severity: TEST_SEVERITY.WARNING,
          operation: async (client: McpClient) => {
            return await client.sdk.readResource({
              uri: 'nonexistent://definitely-not-found/resource',
            });
          },
          expectsError: true,
          expectedErrorCode: ErrorCode.InvalidParams,
        },
      ];

      const sdkResults = await SdkErrorDetector.executeTests(client, config, sdkTests);
      const diagnosticResults = SdkErrorDetector.convertTodiagnosticResults(sdkResults);

      const failedTests = diagnosticResults.filter(r => r.status === 'failed');
      const passedTests = diagnosticResults.filter(r => r.status === 'passed');

      if (failedTests.length === 0) {
        return this.createResult(true, `Resource reading error handling validated via SDK`, {
          availableResources: resources.length,
          passedTests: passedTests.length,
          sdkValidated: true,
        });
      } else {
        return this.createEnhancedResult({
          success: false,
          message: `SDK detected ${failedTests.length} resource reading issues`,
          details: {
            availableResources: resources.length,
            failedTests: failedTests.length,
            passedTests: passedTests.length,
            results: diagnosticResults,
          },
          issueType: failedTests[0].issueType || ISSUE_TYPE.SPEC_WARNING,
          expected: 'Proper resource reading error handling',
          actual: `${failedTests.length} reading issues detected by SDK`,
          fixInstructions: failedTests.flatMap(t => t.recommendations || []),
          specLinks: ['https://spec.modelcontextprotocol.io/specification/server/resources/'],
        });
      }
    } catch (error) {
      return this.createResult(
        false,
        'Resource reading test failed',
        { error: error instanceof Error ? error.message : String(error) },
        ['Check resources/read implementation', 'Verify resource reading logic']
      );
    }
  }
}

export class ResourceMimeTypeTest extends DiagnosticTest {
  readonly name = 'Server Features: Resources - MIME Type Handling';
  readonly description = 'Check for proper MIME type usage (business logic)';
  readonly category = 'server-features';
  readonly feature = 'resources' as const;
  readonly severity = TEST_SEVERITY.INFO;
  readonly requiredCapability = 'resources';

  async execute(client: McpClient, _config: ComplianceConfig): Promise<DiagnosticResult> {
    try {
      // SDK handles the protocol validation, we check business logic
      const result = await client.sdk.listResources();
      const resources = result.resources || [];

      if (resources.length === 0) {
        return this.createResult(false, 'No resources available for MIME type checking', {
          resourceCount: 0,
        });
      }

      const suggestions: string[] = [];
      let mimeTypeCount = 0;

      resources.forEach((resource: Resource) => {
        // Check for MIME type usage (business logic, not spec requirements)
        if (resource.mimeType) {
          mimeTypeCount++;
          // Validate common MIME type patterns
          if (!resource.mimeType.includes('/')) {
            suggestions.push(
              `Resource '${resource.uri}': Invalid MIME type format '${resource.mimeType}'`
            );
          }
        } else {
          suggestions.push(
            `Resource '${resource.uri}': Consider adding MIME type for better client handling`
          );
        }
      });

      const message =
        suggestions.length === 0
          ? `All ${resources.length} resources have proper MIME type handling`
          : `Found ${suggestions.length} MIME type improvement opportunities`;

      return this.createResult(
        true, // This is informational, not a failure
        message,
        {
          resourceCount: resources.length,
          mimeTypeCount,
          suggestionCount: suggestions.length,
          suggestions: suggestions.slice(0, 5), // Limit output
        },
        suggestions.length > 0 ? suggestions.slice(0, 3) : undefined
      );
    } catch (error) {
      return this.createResult(
        false,
        'Resource MIME type check failed',
        { error: error instanceof Error ? error.message : String(error) },
        ['Check resources/list implementation']
      );
    }
  }
}
