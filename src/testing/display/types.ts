/**
 * Types and interfaces for test output display and formatting
 */

export interface TestEvent {
  type: 'test_start' | 'test_complete' | 'suite_start' | 'suite_complete' | 'progress';
  data: any;
}

export interface TestStartEvent extends TestEvent {
  type: 'test_start';
  data: {
    name: string;
    model?: string;
  };
}

export interface TestCompleteEvent extends TestEvent {
  type: 'test_complete';
  data: {
    name: string;
    model?: string;
    passed: boolean;
    errors: string[];
    prompt?: string;
  };
}

export interface SuiteStartEvent extends TestEvent {
  type: 'suite_start';
  data: {
    testCount: number;
    modelCount?: number;
    totalRuns?: number;
  };
}

export interface SuiteCompleteEvent extends TestEvent {
  type: 'suite_complete';
  data: {
    total: number;
    passed: number;
    failed: number;
    duration: number;
  };
}

export interface ProgressEvent extends TestEvent {
  type: 'progress';
  data: {
    message: string;
    model?: string;
  };
}

export interface TestFormatter {
  onEvent(_event: TestEvent): void;
  flush(): void;
}

export interface DisplayOptions {
  formatter?: string;
  quiet?: boolean;
  verbose?: boolean;
}
