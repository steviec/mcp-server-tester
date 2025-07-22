#!/usr/bin/env node
/* eslint-env node */
/* eslint-disable no-unused-vars */

/**
 * Non-compliant MCP server for compliance testing
 * Intentionally violates MCP spec to test compliance's detection capabilities
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'non-compliant-test-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      // Declare tools capability but don't implement properly
      tools: {},
      // Declare resources but with issues
      resources: {},
      // Don't declare prompts capability but try to implement
    },
  }
);

// Tools with various compliance issues
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'broken-echo',
        description: 'Echo tool with missing schema',
        // Missing inputSchema - violation
      },
      {
        name: 'invalid-schema',
        description: 'Tool with invalid schema',
        inputSchema: {
          // Invalid schema - missing type
          properties: {
            message: {
              type: 'string',
            },
          },
        },
      },
      {
        // Missing name - violation
        description: 'Tool without name',
        inputSchema: {
          type: 'object',
          properties: {
            value: { type: 'string' },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'broken-echo':
      // Return invalid format - should be content array
      return {
        result: args.message, // Wrong format
      };

    case 'invalid-schema':
      // Return malformed response
      return {
        content: [
          {
            // Missing type field
            text: 'Invalid response format',
          },
        ],
      };

    case 'nonexistent-tool':
      // This tool wasn't listed but we handle it anyway
      return {
        content: [
          {
            type: 'text',
            text: 'This tool was not listed!',
          },
        ],
      };

    default:
      // Poor error handling - throw generic error
      throw new Error('Tool error');
  }
});

// Resources with compliance issues
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        // Missing uri - violation
        name: 'Broken Resource',
        description: 'Resource without URI',
      },
      {
        uri: 'invalid-uri-format', // Invalid URI format
        name: 'Invalid URI Resource',
        // Missing description
      },
      {
        uri: 'file:///test/valid.txt',
        name: 'Valid Resource',
        description: 'This one is actually valid',
        mimeType: 'text/plain',
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async request => {
  const { uri } = request.params;

  switch (uri) {
    case 'file:///test/valid.txt':
      return {
        contents: [
          {
            uri,
            mimeType: 'text/plain',
            text: 'Valid resource content',
          },
        ],
      };

    case 'invalid-uri-format':
      // Return malformed response
      return {
        // Missing contents array
        data: 'Invalid format',
      };

    default:
      // Don't throw proper error, return invalid format
      return {
        error: 'Resource not found', // Should throw instead
      };
  }
});

// Handle requests that shouldn't be supported
try {
  server.setRequestHandler({ method: 'prompts/list' }, async () => {
    // Implementing prompts without declaring capability
    return {
      prompts: [
        {
          name: 'undeclared-prompt',
          description: 'This prompt capability was not declared',
        },
      ],
    };
  });
} catch (error) {
  // Ignore registration errors for this test server
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Test MCP server running on stdio');
}

main().catch(error => {
  console.error('Server error:', error);
  process.exit(1);
});
