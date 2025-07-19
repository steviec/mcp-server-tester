/**
 * JSON formatter stub for structured test output
 * Future implementation for CI/CD integration
 */

import type { TestEvent, TestFormatter, DisplayOptions } from '../types.js';

export class JsonFormatter implements TestFormatter {
  private events: TestEvent[] = [];
  private options: DisplayOptions;

  constructor(options: DisplayOptions = {}) {
    this.options = options;
  }

  onEvent(event: TestEvent): void {
    this.events.push(event);
  }

  flush(): void {
    // TODO: Implement JSON output
    // Could output to file or stdout depending on options
    if (this.options.debug) {
      console.log('JSON formatter not yet implemented');
    }
  }
}
