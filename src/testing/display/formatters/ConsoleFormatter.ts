/**
 * Console formatter that provides rich human-readable test output
 * Inspired by the old inspector output format
 */

import type {
  TestEvent,
  TestFormatter,
  DisplayOptions,
  SuiteStartEvent,
  SectionStartEvent,
  ToolDiscoveryEvent,
  ProgressEvent,
  TestStartEvent,
  TestCompleteEvent,
  SuiteCompleteEvent,
} from '../types.js';
import { formatConversation } from '../utils/conversationFormatter.js';

export class ConsoleFormatter implements TestFormatter {
  private options: DisplayOptions;
  private currentModel: string | undefined;
  private hasShownVersion = false;

  constructor(options: DisplayOptions = {}) {
    this.options = options;
  }

  onEvent(event: TestEvent): void {
    switch (event.type) {
      case 'suite_start':
        this.handleSuiteStart(event.data as SuiteStartEvent['data']);
        break;
      case 'section_start':
        this.handleSectionStart(event.data as SectionStartEvent['data']);
        break;
      case 'tool_discovery':
        this.handleToolDiscovery(event.data as ToolDiscoveryEvent['data']);
        break;
      case 'progress':
        this.handleProgress(event.data as ProgressEvent['data']);
        break;
      case 'test_start':
        this.handleTestStart(event.data as TestStartEvent['data']);
        break;
      case 'test_complete':
        this.handleTestComplete(event.data as TestCompleteEvent['data']);
        break;
      case 'suite_complete':
        this.handleSuiteComplete(event.data as SuiteCompleteEvent['data']);
        break;
    }
  }

  private handleSuiteStart(_data: SuiteStartEvent['data']): void {
    // Show version info once at the very beginning
    if (!this.hasShownVersion) {
      const version = this.options.version || '1.0.7';
      console.log(`\nMCP Server Tester v${version}`);
      this.hasShownVersion = true;
    }
  }

  private handleSectionStart(data: SectionStartEvent['data']): void {
    console.log(`\n${data.title}`);
  }

  private handleToolDiscovery(data: ToolDiscoveryEvent['data']): void {
    const { expectedTools, foundTools, passed } = data;
    const icon = passed ? '✅' : '❌';

    if (passed) {
      console.log(
        `${icon} Tool discovery: ${foundTools.length}/${expectedTools.length} expected tools found (${foundTools.join(', ')})`
      );
    } else {
      const missing = expectedTools.filter((tool: string) => !foundTools.includes(tool));
      console.log(
        `${icon} Tool discovery: ${foundTools.length}/${expectedTools.length} expected tools found (missing: ${missing.join(', ')})`
      );
    }
  }

  private handleProgress(data: ProgressEvent['data']): void {
    if (data.model && data.model !== this.currentModel) {
      this.currentModel = data.model;
      // Model changes are now handled by section headers
    } else if (data.message) {
      // Only show progress messages in debug mode
      if (this.options.debug) {
        console.log(data.message);
      }
    }
  }

  private handleTestStart(_data: TestStartEvent['data']): void {
    // For now, we don't show individual test starts
    // Could add debug mode later that shows "Running: test_name..."
  }

  private handleTestComplete(data: TestCompleteEvent['data']): void {
    const { name, passed, errors, prompt, messages, scorer_results } = data;

    if (passed) {
      console.log(`✅ ${name}: PASSED`);
    } else {
      console.log(`❌ ${name}: FAILED`);

      if (prompt) {
        console.log(`    Prompt: "${prompt}"`);
      }

      if (errors && errors.length > 0) {
        errors.forEach((error: string) => {
          console.log(`    • ${error}`);
        });
      }
    }

    // Show conversation in debug mode
    if (this.options.debug && messages && messages.length > 0) {
      console.log();
      console.log('─'.repeat(60));
      console.log('\x1b[36mDEBUG: Conversation\x1b[0m');
      console.log();
      const formattedLines = formatConversation(messages, prompt);
      // Remove the top and bottom horizontal lines from formatConversation since we're adding our own
      const conversationContent = formattedLines.slice(1, -1);
      conversationContent.forEach(line => console.log(line));
      console.log('─'.repeat(60));
      console.log();
    }

    // Show scorer results in debug mode
    if (this.options.debug && scorer_results && scorer_results.length > 0) {
      console.log('\x1b[36mDEBUG: Scorer Results\x1b[0m');
      console.log();

      scorer_results.forEach(result => {
        const status = result.passed ? 'PASSED' : 'FAILED';

        if (result.type === 'regex') {
          console.log(`\x1b[90mREGEX Scorer: ${status}\x1b[0m`);
          console.log(
            `\x1b[90mPattern: ${result.details?.replace("Pattern '", '').replace("' found", '').replace("' not found", '')}\x1b[0m`
          );
        } else if (result.type === 'llm-judge') {
          const scoreText =
            result.score !== undefined
              ? ` (${result.score}/${result.details?.match(/threshold: ([\d.]+)/)?.[1] || '0.7'})`
              : '';
          console.log(`\x1b[90mLLM Judge: ${status}${scoreText}\x1b[0m`);

          // Extract criteria and rationale from details
          const criteriaMatch = result.details?.match(/Criteria: (.+?)\. Rationale:/);
          const rationaleMatch = result.details?.match(/Rationale: (.+)$/);

          if (criteriaMatch) {
            console.log(`\x1b[90mCriteria: ${criteriaMatch[1]}\x1b[0m`);
          }

          if (rationaleMatch) {
            const rationale = rationaleMatch[1];
            const truncated =
              rationale.length > 150 ? `${rationale.substring(0, 150)}...` : rationale;
            console.log(`\x1b[90mRationale: ${truncated}\x1b[0m`);
          }
        } else {
          console.log(`\x1b[90m${String(result.type).toUpperCase()} Scorer: ${status}\x1b[0m`);
          if (result.details) {
            console.log(`\x1b[90mDetails: ${result.details}\x1b[0m`);
          }
        }

        console.log();
      });

      console.log('─'.repeat(60));
      console.log();
    }
  }

  private handleSuiteComplete(data: SuiteCompleteEvent['data']): void {
    const { total, passed, duration } = data;
    const durationInSeconds = (duration / 1000).toFixed(1);

    console.log(`\n📊 Results: ${passed}/${total} tests passed (${durationInSeconds}s)`);
  }

  flush(): void {
    // Console output is synchronous, nothing to flush
  }
}
