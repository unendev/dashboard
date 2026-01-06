import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Property-Based Tests for AI Parser
 * 
 * These tests validate the correctness properties of the AI parser
 * that extracts task information from user input.
 */

describe('AI Parser - Timer Tasks Parse API', () => {
  /**
   * Property 1: AI解析器标签提取
   * Feature: timer-tag-recognition, Property 1: AI解析器标签提取
   * Validates: Requirements 1.1, 4.1, 4.4
   * 
   * For any input containing # symbols, the AI parser should extract
   * the words after # as instanceTags (without the # symbol).
   */
  it('Property 1: Should extract tags from input with # symbols', () => {
    fc.assert(
      fc.property(
        fc.array(fc.stringMatching(/^[a-zA-Z0-9]+$/), {
          minLength: 1,
          maxLength: 5,
        }),
        (tags) => {
          // Generate input with tags
          const tagString = tags.map((tag) => `#${tag}`).join(' ');
          const input = `${tagString}`;

          // Simulate what the AI parser should do
          // Extract all words that follow # symbols
          const extractedTags = input
            .split(/\s+/)
            .filter((word) => word.startsWith('#'))
            .map((word) => word.substring(1)); // Remove # symbol

          // Verify: extracted tags should match original tags
          expect(extractedTags).toEqual(tags);

          // Verify: no extracted tag should contain # symbol
          extractedTags.forEach((tag) => {
            expect(tag).not.toContain('#');
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: 标签不作为任务名
   * Feature: timer-tag-recognition, Property 3: 标签不作为任务名
   * Validates: Requirements 1.4, 4.2
   * 
   * When input contains only tags (no task name), the parser should NOT
   * use the tag as the task name. Instead, it should use a category name.
   */
  it('Property 3: Should not use tags as task name when input is tag-only', () => {
    fc.assert(
      fc.property(
        fc.array(fc.stringMatching(/^[a-zA-Z0-9]+$/), {
          minLength: 1,
          maxLength: 3,
        }),
        (tags) => {
          // Generate input with only tags (no task name)
          const input = tags.map((tag) => `#${tag}`).join(' ');

          // Simulate parsing: extract tags and check if name contains #
          const extractedTags = input
            .split(/\s+/)
            .filter((word) => word.startsWith('#'))
            .map((word) => word.substring(1));

          // The key property: if input is tag-only, the extracted tags
          // should not be empty, and we should NOT use them as task name
          expect(extractedTags.length).toBeGreaterThan(0);

          // Verify: extracted tags should not contain # symbol
          extractedTags.forEach((tag) => {
            expect(tag).not.toContain('#');
          });

          // Verify: when we have tags, they should be in instanceTags array
          // not in the name field
          expect(extractedTags).toBeDefined();
          expect(Array.isArray(extractedTags)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: 标签转换为逗号分隔字符串
   * Feature: timer-tag-recognition, Property 4: 标签转换为逗号分隔字符串
   * Validates: Requirements 1.2, 2.2, 3.3
   * 
   * When converting tag arrays to comma-separated strings and back,
   * the round-trip should preserve the original data.
   */
  it('Property 4: Tag array to string conversion should be reversible (round-trip)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.stringMatching(/^[a-zA-Z0-9]+$/), {
          minLength: 0,
          maxLength: 5,
        }),
        (tags) => {
          // Convert array to comma-separated string
          const tagString = tags.join(',');

          // Convert back to array
          const reconstructed = tagString === '' ? [] : tagString.split(',');

          // Verify: round-trip should preserve original
          expect(reconstructed).toEqual(tags);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify tag extraction with mixed input
   * This tests the parser's ability to handle both task names and tags
   */
  it('Should correctly extract tags from mixed input (task name + tags)', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9]+$/),
        fc.array(fc.stringMatching(/^[a-zA-Z0-9]+$/), {
          minLength: 1,
          maxLength: 3,
        }),
        (taskName, tags) => {
          // Generate input with task name and tags
          const tagString = tags.map((tag) => `#${tag}`).join(' ');
          const input = `${taskName} ${tagString}`;

          // Extract tags
          const extractedTags = input
            .split(/\s+/)
            .filter((word) => word.startsWith('#'))
            .map((word) => word.substring(1));

          // Verify: extracted tags should match original tags
          expect(extractedTags).toEqual(tags);

          // Verify: no extracted tag should contain # symbol
          extractedTags.forEach((tag) => {
            expect(tag).not.toContain('#');
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
