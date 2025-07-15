/**
 * Test discovery and registration system
 */

import type { DiagnosticTest } from './DiagnosticTest.js';

export class TestRegistry {
  private static tests: DiagnosticTest[] = [];

  static registerTest(test: DiagnosticTest): void {
    this.tests.push(test);
  }

  static getAllTests(): DiagnosticTest[] {
    return [...this.tests];
  }

  static getTestsByCategory(category: string): DiagnosticTest[] {
    return this.tests.filter(test => test.category === category);
  }

  static getTestsByCategories(categories: string[]): DiagnosticTest[] {
    return this.tests.filter(test => categories.includes(test.category));
  }

  static getAvailableCategories(): string[] {
    const categories = new Set(this.tests.map(test => test.category));
    return Array.from(categories).sort();
  }

  static clear(): void {
    this.tests = [];
  }
}

export function registerDoctorTest(test: DiagnosticTest): void {
  TestRegistry.registerTest(test);
}
