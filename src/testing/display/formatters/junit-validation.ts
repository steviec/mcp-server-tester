/**
 * JUnit XML validation utilities
 * Uses fast-xml-parser for proper XML validation
 */

import { readFileSync } from 'fs';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

export interface JunitValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a JUnit XML file using fast-xml-parser
 */
export function validateJunitXml(filePath: string): JunitValidationResult {
  try {
    const content = readFileSync(filePath, 'utf8');
    return validateJunitXmlContent(content);
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
    };
  }
}

/**
 * Validates JUnit XML content string using fast-xml-parser
 */
export function validateJunitXmlContent(content: string): JunitValidationResult {
  const result: JunitValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // First, validate XML syntax
  const validationResult = XMLValidator.validate(content);
  if (validationResult !== true) {
    result.valid = false;
    result.errors.push(`Invalid XML: ${validationResult.err.msg}`);
    return result;
  }

  // Parse the XML to validate JUnit structure
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });

    const parsed = parser.parse(content);

    // Check for testsuites root element
    if (!parsed.testsuites) {
      result.errors.push('Missing <testsuites> root element');
      result.valid = false;
      return result;
    }

    // Validate testsuites attributes
    const testsuites = parsed.testsuites;
    if (!testsuites['@_tests'] && testsuites['@_tests'] !== 0) {
      result.warnings.push('<testsuites> missing tests attribute');
    }
    if (!testsuites['@_failures'] && testsuites['@_failures'] !== 0) {
      result.warnings.push('<testsuites> missing failures attribute');
    }
    if (!testsuites['@_time'] && testsuites['@_time'] !== 0) {
      result.warnings.push('<testsuites> missing time attribute');
    }

    // Check testsuite elements
    if (testsuites.testsuite) {
      const testsuiteArray = Array.isArray(testsuites.testsuite)
        ? testsuites.testsuite
        : [testsuites.testsuite];

      testsuiteArray.forEach((testsuite: any, index: number) => {
        if (!testsuite['@_name']) {
          result.errors.push(`<testsuite> ${index + 1} missing name attribute`);
          result.valid = false;
        }
        if (!testsuite['@_tests'] && testsuite['@_tests'] !== 0) {
          result.warnings.push(`<testsuite> ${index + 1} missing tests attribute`);
        }
        if (!testsuite['@_time'] && testsuite['@_time'] !== 0) {
          result.warnings.push(`<testsuite> ${index + 1} missing time attribute`);
        }

        // Check testcase elements
        if (testsuite.testcase) {
          const testcaseArray = Array.isArray(testsuite.testcase)
            ? testsuite.testcase
            : [testsuite.testcase];

          testcaseArray.forEach((testcase: any, testcaseIndex: number) => {
            if (!testcase['@_name']) {
              result.errors.push(
                `<testcase> ${testcaseIndex + 1} in <testsuite> ${index + 1} missing name attribute`
              );
              result.valid = false;
            }
            if (!testcase['@_classname']) {
              result.warnings.push(
                `<testcase> ${testcaseIndex + 1} in <testsuite> ${index + 1} missing classname attribute`
              );
            }
          });
        }
      });
    } else {
      result.warnings.push('No <testsuite> elements found');
    }
  } catch (error) {
    result.valid = false;
    result.errors.push(
      `Failed to parse XML: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return result;
}
