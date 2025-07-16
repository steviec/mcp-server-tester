/**
 * Comprehensive diagnostic tests for MCP server Resources functionality
 */

import { DiagnosticTest } from '../DiagnosticTest.js';
import { TEST_SEVERITY, type DiagnosticResult, type DoctorConfig } from '../types.js';
import type { McpClient } from '../../../core/mcp-client.js';
import type { Resource, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';

export class ResourcesCapabilityTest extends DiagnosticTest {
  readonly name = 'Resources: Capability Declaration';
  readonly description = 'Verify server declares resources capability correctly';
  readonly category = 'features';
  readonly severity = TEST_SEVERITY.WARNING;
  readonly requiredCapability = 'resources';
  readonly mcpSpecSection = 'MCP Spec §4.2';

  async execute(client: McpClient, _config: DoctorConfig): Promise<DiagnosticResult> {
    try {
      const result = await client.sdk.listResources();

      if (result && typeof result === 'object' && 'resources' in result) {
        const hasSubscribe = 'subscribe' in result ? result.subscribe : undefined;
        return this.createResult(
          true,
          `Resources capability declared correctly${hasSubscribe !== undefined ? ` (subscribe: ${hasSubscribe})` : ''}`,
          { hasSubscribe, resourcesCount: result.resources?.length || 0 }
        );
      } else {
        return this.createResult(
          false,
          'Server does not properly declare resources capability',
          { response: result },
          ['Ensure server implements resources/list method according to MCP specification']
        );
      }
    } catch (error) {
      // Resources are optional, so we'll treat this as a warning
      return this.createResult(
        false,
        'Server does not support resources capability',
        { error: error instanceof Error ? error.message : String(error) },
        ['Resources capability is optional but recommended for content-serving servers']
      );
    }
  }
}

export class ResourceListingTest extends DiagnosticTest {
  readonly name = 'Resources: Resource Listing';
  readonly description = 'Verify resource listing functionality';
  readonly category = 'features';
  readonly severity = TEST_SEVERITY.INFO;

  async execute(client: McpClient, _config: DoctorConfig): Promise<DiagnosticResult> {
    try {
      const result = await client.sdk.listResources();
      const resources = result.resources || [];

      if (resources.length === 0) {
        return this.createResult(false, 'No resources found', { resourceCount: 0 }, [
          'Consider implementing resources if server manages content',
          'Resources are optional but useful for content discovery',
        ]);
      }

      const resourceUris = resources.map(r => r.uri);
      const duplicateUris = resourceUris.filter(
        (uri, index) => resourceUris.indexOf(uri) !== index
      );

      if (duplicateUris.length > 0) {
        return this.createResult(
          false,
          `Duplicate resource URIs found: ${duplicateUris.join(', ')}`,
          { duplicates: duplicateUris, resourceCount: resources.length },
          ['Ensure all resource URIs are unique']
        );
      }

      return this.createResult(true, `${resources.length} resources found`, {
        resourceCount: resources.length,
        resourceUris: resourceUris.slice(0, 5), // Show first 5 resources
      });
    } catch (error) {
      return this.createResult(
        false,
        'Failed to list resources',
        { error: error instanceof Error ? error.message : String(error) },
        ['Check server resources/list implementation']
      );
    }
  }
}

export class ResourceReadingTest extends DiagnosticTest {
  readonly name = 'Resources: Resource Reading';
  readonly description = 'Test resource reading functionality';
  readonly category = 'features';
  readonly severity = TEST_SEVERITY.INFO;

  async execute(client: McpClient, config: DoctorConfig): Promise<DiagnosticResult> {
    try {
      const result = await client.sdk.listResources();
      const resources = result.resources || [];

      if (resources.length === 0) {
        return this.createSkippedResult('No resources available to test reading');
      }

      const testResource = this.findSuitableTestResource(resources);

      if (!testResource) {
        return this.createResult(
          false,
          'No suitable resource found for reading test',
          { availableResources: resources.map(r => r.uri) },
          ['Ensure resources have valid URIs', 'Check resource accessibility']
        );
      }

      const timeout = config.timeouts?.testExecution || 30000;

      try {
        const startTime = Date.now();
        const readResult = (await Promise.race([
          client.sdk.readResource({ uri: testResource.uri }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Resource read timeout')), timeout)
          ),
        ])) as ReadResourceResult;
        const duration = Date.now() - startTime;

        const contents = Array.isArray(readResult.contents)
          ? readResult.contents
          : [readResult.contents];

        return this.createResult(true, `Resource reading successful (${testResource.uri})`, {
          resourceUri: testResource.uri,
          duration,
          contentCount: contents.length,
          mimeTypes: contents.map(c => c.mimeType).filter(Boolean),
        });
      } catch (error) {
        return this.createResult(
          false,
          `Resource reading failed (${testResource.uri})`,
          {
            resourceUri: testResource.uri,
            error: error instanceof Error ? error.message : String(error),
          },
          ['Check resource implementation', 'Verify resource URI validity']
        );
      }
    } catch (error) {
      return this.createResult(false, 'Failed to test resource reading', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private findSuitableTestResource(resources: Resource[]): Resource | null {
    // Prefer resources with safe-looking URIs
    const safePatterns = ['config', 'readme', 'info', 'status', 'help'];

    for (const pattern of safePatterns) {
      const resource = resources.find(r => r.uri.toLowerCase().includes(pattern));
      if (resource) {
        return resource;
      }
    }

    // Fall back to first resource
    return resources[0];
  }
}

export class MimeTypeHandlingTest extends DiagnosticTest {
  readonly name = 'Resources: MIME Type Handling';
  readonly description = 'Verify proper MIME type handling in resources';
  readonly category = 'features';
  readonly severity = TEST_SEVERITY.INFO;

  async execute(client: McpClient, _config: DoctorConfig): Promise<DiagnosticResult> {
    try {
      const result = await client.sdk.listResources();
      const resources = result.resources || [];

      if (resources.length === 0) {
        return this.createSkippedResult('No resources available to check MIME types');
      }

      const mimeTypeStats = this.analyzeMimeTypes(resources);

      if (mimeTypeStats.withMimeType === 0) {
        return this.createResult(
          false,
          'No resources specify MIME types',
          { resourceCount: resources.length },
          [
            'Add mimeType field to resource definitions',
            'MIME types help clients handle content appropriately',
          ]
        );
      }

      const coverage = (mimeTypeStats.withMimeType / resources.length) * 100;

      if (coverage < 50) {
        return this.createResult(
          false,
          `Poor MIME type coverage: ${coverage.toFixed(1)}%`,
          {
            ...mimeTypeStats,
            coverage: coverage.toFixed(1) + '%',
          },
          ['Add MIME types to more resources']
        );
      }

      return this.createResult(true, `Good MIME type coverage: ${coverage.toFixed(1)}%`, {
        ...mimeTypeStats,
        coverage: coverage.toFixed(1) + '%',
      });
    } catch (error) {
      return this.createResult(false, 'Failed to check MIME type handling', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private analyzeMimeTypes(resources: Resource[]) {
    const mimeTypes = new Set<string>();
    let withMimeType = 0;

    for (const resource of resources) {
      if (resource.mimeType) {
        withMimeType++;
        mimeTypes.add(resource.mimeType);
      }
    }

    return {
      totalResources: resources.length,
      withMimeType,
      withoutMimeType: resources.length - withMimeType,
      uniqueMimeTypes: Array.from(mimeTypes),
      mimeTypeCount: mimeTypes.size,
    };
  }
}

export class UriValidationTest extends DiagnosticTest {
  readonly name = 'Resources: URI Validation';
  readonly description = 'Validate resource URI format and structure';
  readonly category = 'features';
  readonly severity = TEST_SEVERITY.WARNING;

  async execute(client: McpClient, _config: DoctorConfig): Promise<DiagnosticResult> {
    try {
      const result = await client.sdk.listResources();
      const resources = result.resources || [];

      if (resources.length === 0) {
        return this.createSkippedResult('No resources available to validate URIs');
      }

      const uriIssues: string[] = [];
      const validUris: string[] = [];

      for (const resource of resources) {
        const issues = this.validateUri(resource.uri);
        if (issues.length > 0) {
          uriIssues.push(`${resource.uri}: ${issues.join(', ')}`);
        } else {
          validUris.push(resource.uri);
        }
      }

      if (uriIssues.length > 0) {
        return this.createResult(
          false,
          `URI validation failed for ${uriIssues.length} resources`,
          { uriIssues, validUris, totalResources: resources.length },
          ['Fix URI format issues', 'Ensure URIs follow proper format standards']
        );
      }

      return this.createResult(true, `All ${resources.length} resource URIs are valid`, {
        validUris,
        totalResources: resources.length,
      });
    } catch (error) {
      return this.createResult(false, 'Failed to validate resource URIs', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private validateUri(uri: string): string[] {
    const issues: string[] = [];

    if (!uri || typeof uri !== 'string') {
      issues.push('missing or invalid URI');
      return issues;
    }

    if (uri.trim() !== uri) {
      issues.push('URI contains leading/trailing whitespace');
    }

    if (uri.length === 0) {
      issues.push('empty URI');
      return issues;
    }

    // Check for basic URI structure
    try {
      new URL(uri);
    } catch {
      // Not a valid URL, check if it's a valid URI-like string
      if (!uri.includes(':')) {
        issues.push('URI should include scheme (e.g., file:, custom:)');
      }
    }

    return issues;
  }
}

export class ResourceNotFoundTest extends DiagnosticTest {
  readonly name = 'Resources: Not Found Handling';
  readonly description = 'Test handling of non-existent resource requests';
  readonly category = 'features';
  readonly severity = TEST_SEVERITY.INFO;

  async execute(client: McpClient, _config: DoctorConfig): Promise<DiagnosticResult> {
    try {
      const nonExistentUri = 'test://nonexistent/resource/12345';

      try {
        await client.sdk.readResource({ uri: nonExistentUri });

        return this.createResult(
          false,
          'Server did not return error for non-existent resource',
          { testedUri: nonExistentUri },
          [
            'Implement proper error handling for non-existent resources',
            'Return appropriate error code (e.g., -32002 InvalidRequest)',
          ]
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Check if error indicates proper not-found handling
        const isProperError =
          errorMessage.includes('not found') ||
          errorMessage.includes('does not exist') ||
          errorMessage.includes('-32002') ||
          errorMessage.includes('InvalidRequest');

        return this.createResult(
          isProperError,
          isProperError
            ? 'Server properly handles non-existent resources'
            : 'Server returns error but message could be more specific',
          {
            testedUri: nonExistentUri,
            errorMessage,
            isProperError,
          },
          isProperError
            ? []
            : ['Consider returning more specific error messages for resource not found']
        );
      }
    } catch (error) {
      return this.createResult(false, 'Failed to test resource not found handling', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
