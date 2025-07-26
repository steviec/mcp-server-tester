/**
 * Utility functions for formatting conversation messages for console output
 */

export interface ConversationMessage {
  role: string;
  content: any;
  toolInvocations?: any[];
}

/**
 * Format a conversation array into human-readable console output
 */
export function formatConversation(messages: ConversationMessage[], prompt?: string): string[] {
  const output: string[] = [];

  // Add horizontal line at the start
  output.push(formatText('─'.repeat(60)));

  // Include initial prompt if provided
  if (prompt) {
    output.push(formatRole('user'));
    output.push(formatText(prompt));
    output.push('');
  }

  messages.forEach(msg => {
    // Format role header
    const roleDisplay = formatRole(msg.role);
    output.push(roleDisplay);

    // Format content
    const contentLines = formatContent(msg.content);
    output.push(...contentLines);

    // Handle legacy tool invocations
    if (msg.toolInvocations && msg.toolInvocations.length > 0) {
      msg.toolInvocations.forEach(tool => {
        const toolLine = formatToolCall(tool.toolName, tool.args);
        output.push(toolLine);
      });
    }

    // Add space between messages
    output.push('');
  });

  // Add horizontal line at the end
  output.push(formatText('─'.repeat(60)));

  return output;
}

/**
 * Format role with appropriate colors
 */
export function formatRole(role: string): string {
  switch (role) {
    case 'user':
      return '\x1b[32m[USER]\x1b[0m'; // Green
    case 'assistant':
      return '\x1b[36m[ASSISTANT]\x1b[0m'; // Cyan
    case 'system':
      return '\x1b[33m[SYSTEM]\x1b[0m'; // Yellow
    case 'tool':
      return '\x1b[35m[TOOL]\x1b[0m'; // Magenta
    default:
      return `\x1b[37m[${role.toUpperCase()}]\x1b[0m`; // White
  }
}

/**
 * Format text content with darker color
 */
export function formatText(text: string): string {
  return `\x1b[90m${text}\x1b[0m`; // Dark gray/dim
}

/**
 * Format content based on type
 */
export function formatContent(content: any): string[] {
  const lines: string[] = [];

  if (typeof content === 'string') {
    lines.push(formatText(content));
  } else if (Array.isArray(content)) {
    // Handle content array (multimodal messages)
    content.forEach((part: any) => {
      if (part.type === 'text') {
        lines.push(formatText(part.text));
      } else if (part.type === 'tool-call') {
        const toolLine = formatToolCall(part.toolName, part.args);
        lines.push(toolLine);
      } else if (part.type === 'tool-result') {
        const resultLine = formatToolResult(part.result);
        lines.push(resultLine);
      }
    });
  } else {
    // Fallback for other content types
    lines.push(formatText(JSON.stringify(content)));
  }

  return lines;
}

/**
 * Format tool call
 */
export function formatToolCall(toolName: string, args: any): string {
  const argsStr = JSON.stringify(args, null, 2);
  return formatText(`🔧 Tool Call: ${toolName}(${argsStr})`);
}

/**
 * Format tool result
 */
export function formatToolResult(result: any): string {
  return formatText(
    `✅ Tool Result: ${JSON.stringify(result.structuredContent ?? result.content, null, 2)}`
  );
}
