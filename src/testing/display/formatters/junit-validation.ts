/**
 * JUnit XML validation utilities
 * Uses fast-xml-parser for proper XML validation
 * Validates against canonical JUnit XML schema structure
 */

import { readFileSync } from 'fs';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

export interface JunitValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface XmlAttribute {
  '@_message'?: string;
  '@_type'?: string;
}

interface XmlTestCase {
  '@_name'?: string;
  '@_classname'?: string;
  '@_time'?: string | number;
  failure?: XmlAttribute | XmlAttribute[];
  error?: XmlAttribute | XmlAttribute[];
}

interface XmlTestSuite {
  '@_name'?: string;
  '@_tests'?: string | number;
  '@_failures'?: string | number;
  '@_errors'?: string | number;
  '@_time'?: string | number;
  '@_timestamp'?: string;
  testcase?: XmlTestCase | XmlTestCase[];
}

interface XmlTestSuites {
  '@_tests'?: string | number;
  '@_failures'?: string | number;
  '@_errors'?: string | number;
  '@_time'?: string | number;
  testsuite?: XmlTestSuite | XmlTestSuite[];
}

interface ParsedXml {
  testsuites?: XmlTestSuites;
}

function getAttributeFromElement(
  element: XmlAttribute | XmlAttribute[] | undefined,
  attributeName: '@_message' | '@_type'
): string | undefined {
  if (!element) {
    return undefined;
  }

  if (Array.isArray(element)) {
    return element[0]?.[attributeName];
  }

  return element[attributeName];
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

    const parsed = parser.parse(content) as ParsedXml;

    // Check for testsuites root element
    if (!parsed.testsuites) {
      result.errors.push('Missing <testsuites> root element');
      result.valid = false;
      return result;
    }

    // Validate testsuites attributes according to canonical schema
    const testsuites = parsed.testsuites;
    if (!testsuites['@_tests'] && testsuites['@_tests'] !== 0) {
      result.warnings.push('<testsuites> missing tests attribute');
    }
    if (!testsuites['@_failures'] && testsuites['@_failures'] !== 0) {
      result.warnings.push('<testsuites> missing failures attribute');
    }
    if (!testsuites['@_errors'] && testsuites['@_errors'] !== 0) {
      result.warnings.push('<testsuites> missing errors attribute');
    }
    if (!testsuites['@_time'] && testsuites['@_time'] !== 0) {
      result.warnings.push('<testsuites> missing time attribute');
    }

    // Check testsuite elements
    if (testsuites.testsuite) {
      const testsuiteArray = Array.isArray(testsuites.testsuite)
        ? testsuites.testsuite
        : [testsuites.testsuite];

      testsuiteArray.forEach((testsuite: XmlTestSuite, index: number) => {
        // Required attributes according to canonical schema
        if (!testsuite['@_name']) {
          result.errors.push(`<testsuite> ${index + 1} missing required name attribute`);
          result.valid = false;
        }
        if (!testsuite['@_tests'] && testsuite['@_tests'] !== 0) {
          result.warnings.push(`<testsuite> ${index + 1} missing tests attribute`);
        }
        if (!testsuite['@_failures'] && testsuite['@_failures'] !== 0) {
          result.warnings.push(`<testsuite> ${index + 1} missing failures attribute`);
        }
        if (!testsuite['@_errors'] && testsuite['@_errors'] !== 0) {
          result.warnings.push(`<testsuite> ${index + 1} missing errors attribute`);
        }
        if (!testsuite['@_time'] && testsuite['@_time'] !== 0) {
          result.warnings.push(`<testsuite> ${index + 1} missing time attribute`);
        }
        // Optional but commonly expected attributes
        if (!testsuite['@_timestamp']) {
          result.warnings.push(`<testsuite> ${index + 1} missing timestamp attribute`);
        }

        // Check testcase elements
        if (testsuite.testcase) {
          const testcaseArray = Array.isArray(testsuite.testcase)
            ? testsuite.testcase
            : [testsuite.testcase];

          testcaseArray.forEach((testcase: XmlTestCase, testcaseIndex: number) => {
            // Required attributes according to canonical schema
            if (!testcase['@_name']) {
              result.errors.push(
                `<testcase> ${testcaseIndex + 1} in <testsuite> ${index + 1} missing required name attribute`
              );
              result.valid = false;
            }
            if (!testcase['@_classname']) {
              result.warnings.push(
                `<testcase> ${testcaseIndex + 1} in <testsuite> ${index + 1} missing classname attribute`
              );
            }
            if (!testcase['@_time'] && testcase['@_time'] !== 0) {
              result.warnings.push(
                `<testcase> ${testcaseIndex + 1} in <testsuite> ${index + 1} missing time attribute`
              );
            }

            // Validate failure/error elements structure
            if (testcase.failure) {
              if (!getAttributeFromElement(testcase.failure, '@_message')) {
                result.warnings.push(
                  `<failure> in <testcase> ${testcaseIndex + 1} missing message attribute`
                );
              }
              if (!getAttributeFromElement(testcase.failure, '@_type')) {
                result.warnings.push(
                  `<failure> in <testcase> ${testcaseIndex + 1} missing type attribute`
                );
              }
            }

            if (testcase.error) {
              if (!getAttributeFromElement(testcase.error, '@_message')) {
                result.warnings.push(
                  `<error> in <testcase> ${testcaseIndex + 1} missing message attribute`
                );
              }
              if (!getAttributeFromElement(testcase.error, '@_type')) {
                result.warnings.push(
                  `<error> in <testcase> ${testcaseIndex + 1} missing type attribute`
                );
              }
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
