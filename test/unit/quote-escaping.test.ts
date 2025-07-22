import { describe, it, expect } from 'vitest';
import { AnthropicProvider } from '../../src/commands/evals/providers/anthropic-provider.js';
import type { CoreMessage } from 'ai';

describe('LLM Judge Quote Escaping', () => {
  it('should handle quotes in conversation context without breaking JSON parsing', async () => {
    const provider = new AnthropicProvider();

    // Create messages with quoted content that should be problematic
    const messages: CoreMessage[] = [
      {
        role: 'user',
        content: 'Please echo the message "Hello from eval test"',
      },
      {
        role: 'assistant',
        content: 'I\'ll echo the message "Hello from eval test" for you.',
      },
      {
        role: 'tool',
        content: { result: 'Echoed: "Hello from eval test"' },
      },
    ];

    const criteria = 'Did the assistant successfully echo the message with quotes?';

    // This should not throw an error or return a parsing failure
    const result = await provider.judgeResponse(messages, criteria, 0.7);

    // The result should be valid and not contain a parsing error message
    expect(result).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.rationale).toBeDefined();
    expect(result.rationale).not.toContain('Failed to parse judge response');
  });

  it('should handle single quotes in conversation context', async () => {
    const provider = new AnthropicProvider();

    const messages: CoreMessage[] = [
      {
        role: 'user',
        content: "Please echo 'Hello from eval test'",
      },
      {
        role: 'assistant',
        content: "I'll echo 'Hello from eval test' for you.",
      },
    ];

    const criteria = 'Did the assistant correctly handle the single-quoted message?';

    const result = await provider.judgeResponse(messages, criteria, 0.7);

    expect(result.rationale).not.toContain('Failed to parse judge response');
  });

  it('should handle mixed quotes and special characters', async () => {
    const provider = new AnthropicProvider();

    const messages: CoreMessage[] = [
      {
        role: 'user',
        content: 'Display button with "Allow" and \'Cancel\' options',
      },
      {
        role: 'assistant',
        content: 'Showing buttons: "Allow" and \'Cancel\' with newlines\nand tabs\t here.',
      },
    ];

    const criteria = 'Did the assistant handle the complex quoted content correctly?';

    const result = await provider.judgeResponse(messages, criteria, 0.7);

    expect(result.rationale).not.toContain('Failed to parse judge response');
  });
});
