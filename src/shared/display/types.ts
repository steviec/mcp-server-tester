/**
 * Types and interfaces for test output display and formatting
 */

import type { ScorerResult } from '../core/types.js';

export interface TestEvent {
  type:
    | 'test_start'
    | 'test_complete'
    | 'suite_start'
    | 'suite_complete'
    | 'progress'
    | 'tool_discovery'
    | 'section_start';
  data: Record<string, unknown>;
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
    messages?: any[]; // CoreMessage[] from 'ai' package
    scorer_results?: ScorerResult[];
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

export interface ToolDiscoveryEvent extends TestEvent {
  type: 'tool_discovery';
  data: {
    expectedTools: string[];
    foundTools: string[];
    passed: boolean;
  };
}

export interface SectionStartEvent extends TestEvent {
  type: 'section_start';
  data: {
    section: 'tools' | 'evals';
    title: string;
  };
}

export interface TestFormatter {
  onEvent(_event: TestEvent): void;
  flush(): void;
}

export interface DisplayOptions {
  formatter?: string;
  debug?: boolean;
  junitXml?: string;
  version?: string;
}
