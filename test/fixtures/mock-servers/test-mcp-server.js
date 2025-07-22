#!/usr/bin/env node

/**
 * Simple test MCP server for testing the mcp-tester tool
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'test-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Add a simple echo tool
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'echo',
        description: 'Echo back the input message',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Message to echo back',
            },
          },
          required: ['message'],
        },
      },
      {
        name: 'add',
        description: 'Add two numbers',
        inputSchema: {
          type: 'object',
          properties: {
            a: {
              type: 'number',
              description: 'First number',
            },
            b: {
              type: 'number',
              description: 'Second number',
            },
          },
          required: ['a', 'b'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'echo':
      if (!args.message) {
        throw new Error('Missing required parameter: message');
      }
      return {
        content: [
          {
            type: 'text',
            text: `Echo: ${args.message}`,
          },
        ],
      };

    case 'add': {
      if (args.a === undefined || args.b === undefined) {
        throw new Error('Missing required parameters: a and b');
      }
      const result = args.a + args.b;
      return {
        content: [
          {
            type: 'text',
            text: `${args.a} + ${args.b} = ${result}`,
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Test MCP server running on stdio');
}

runServer().catch(console.error);
