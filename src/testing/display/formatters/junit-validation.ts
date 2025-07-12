/**
 * JUnit XML validation utilities
 * Provides basic validation against JUnit XML schema
 */

import { readFileSync } from 'fs';

export interface JunitValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a JUnit XML file for basic structure and required elements
 */
export function validateJunitXml(filePath: string): JunitValidationResult {
  const result: JunitValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  try {
    const content = readFileSync(filePath, 'utf8');

    // Basic XML structure validation
    if (!content.includes('<?xml version="1.0"')) {
      result.errors.push('Missing XML declaration');
      result.valid = false;
    }

    if (!content.includes('<testsuites')) {
      result.errors.push('Missing <testsuites> root element');
      result.valid = false;
    }

    if (!content.includes('</testsuites>')) {
      result.errors.push('Missing closing </testsuites> tag');
      result.valid = false;
    }

    // Count testsuites and testcases
    const testsuiteMatches = content.match(/<testsuite[^>]*>/g);
    const testcaseMatches = content.match(/<testcase[^>]*>/g);

    if (!testsuiteMatches || testsuiteMatches.length === 0) {
      result.warnings.push('No <testsuite> elements found');
    }

    if (!testcaseMatches || testcaseMatches.length === 0) {
      result.warnings.push('No <testcase> elements found');
    }

    // Validate required attributes on testsuites
    const testsuitesMatch = content.match(/<testsuites[^>]*>/);
    if (testsuitesMatch) {
      const testsuitesTag = testsuitesMatch[0];
      if (!testsuitesTag.includes('tests=')) {
        result.warnings.push('<testsuites> missing tests attribute');
      }
      if (!testsuitesTag.includes('failures=')) {
        result.warnings.push('<testsuites> missing failures attribute');
      }
      if (!testsuitesTag.includes('time=')) {
        result.warnings.push('<testsuites> missing time attribute');
      }
    }

    // Validate required attributes on testsuite elements
    if (testsuiteMatches) {
      testsuiteMatches.forEach((suite, index) => {
        if (!suite.includes('name=')) {
          result.errors.push(`<testsuite> ${index + 1} missing name attribute`);
          result.valid = false;
        }
        if (!suite.includes('tests=')) {
          result.warnings.push(`<testsuite> ${index + 1} missing tests attribute`);
        }
        if (!suite.includes('time=')) {
          result.warnings.push(`<testsuite> ${index + 1} missing time attribute`);
        }
      });
    }

    // Validate required attributes on testcase elements
    if (testcaseMatches) {
      testcaseMatches.forEach((testcase, index) => {
        if (!testcase.includes('name=')) {
          result.errors.push(`<testcase> ${index + 1} missing name attribute`);
          result.valid = false;
        }
        if (!testcase.includes('classname=')) {
          result.warnings.push(`<testcase> ${index + 1} missing classname attribute`);
        }
      });
    }

    // Also check for self-closing testcase tags without attributes
    const selfClosingTestcases = content.match(/<testcase\s*\/>/g);
    if (selfClosingTestcases && selfClosingTestcases.length > 0) {
      selfClosingTestcases.forEach((_, index) => {
        result.errors.push(`<testcase/> ${index + 1} missing required attributes`);
        result.valid = false;
      });
    }

    // Check for properly escaped XML
    const unescapedPatterns = [{ pattern: /[<>&](?![a-z]+;)/g, name: 'unescaped XML characters' }];

    unescapedPatterns.forEach(({ pattern, name }) => {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        result.warnings.push(`Found ${matches.length} instances of ${name}`);
      }
    });
  } catch (error) {
    result.errors.push(
      `Failed to read or parse file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    result.valid = false;
  }

  return result;
}

/**
 * Validates JUnit XML content string
 */
export function validateJunitXmlContent(content: string): JunitValidationResult {
  const result: JunitValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Basic XML structure validation
  if (!content.includes('<?xml version="1.0"')) {
    result.errors.push('Missing XML declaration');
    result.valid = false;
  }

  if (!content.includes('<testsuites')) {
    result.errors.push('Missing <testsuites> root element');
    result.valid = false;
  }

  // Count opening and closing tags
  const openTags = (content.match(/<testsuites[^>]*>/g) || []).length;
  const closeTags = (content.match(/<\/testsuites>/g) || []).length;

  if (openTags !== closeTags) {
    result.errors.push('Mismatched <testsuites> opening and closing tags');
    result.valid = false;
  }

  return result;
}
