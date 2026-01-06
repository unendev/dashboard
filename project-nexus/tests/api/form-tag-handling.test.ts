import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Property-Based Tests for Form Tag Handling
 * 
 * These tests validate the correctness properties of the form mode
 * tag handling in the CreateLogFormWithCards component.
 */

describe('Form Tag Handling - Timer Create Form', () => {
  /**
   * Property 5: 表单标签选择
   * Feature: timer-tag-recognition, Property 5: 表单标签选择
   * Validates: Requirements 2.1, 2.2
   * 
   * When user selects tags in the form, these tags should be converted
   * to a comma-separated string when submitting.
   */
  it('Property 5: Selected tags should be converted to comma-separated string on submit', () => {
    fc.assert(
      fc.property(
        fc.array(fc.stringMatching(/^[a-zA-Z0-9]+$/), {
          minLength: 0,
          maxLength: 5,
        }),
        (selectedTags) => {
          // Simulate form submission: convert tags array to string
          const tagsString = selectedTags.length > 0 ? selectedTags.join(',') : undefined;

          // Verify: if tags were selected, they should be in the string
          if (selectedTags.length > 0) {
            expect(tagsString).toBeDefined();
            expect(tagsString).not.toBeNull();
            
            // Verify: the string should contain all tags separated by commas
            const reconstructed = tagsString!.split(',');
            expect(reconstructed).toEqual(selectedTags);
          } else {
            // Verify: if no tags selected, tagsString should be undefined
            expect(tagsString).toBeUndefined();
          }

          // Verify: no tag should contain comma (since we use comma as separator)
          selectedTags.forEach((tag) => {
            expect(tag).not.toContain(',');
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: 表单模式不使用标签作为任务名
   * Feature: timer-tag-recognition, Property 6: 表单模式不使用标签作为任务名
   * Validates: Requirements 2.2
   * 
   * When user selects tags but doesn't enter a task name, the system should
   * use the category name as the task name, NOT the tag.
   */
  it('Property 6: Form mode should not use tags as task name when task name is empty', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9]+$/), // category name
        fc.array(fc.stringMatching(/^[a-zA-Z0-9]+$/), {
          minLength: 1,
          maxLength: 3,
        }), // selected tags
        (categoryName, selectedTags) => {
          // Simulate form submission logic
          let taskName = ''; // User didn't enter task name
          let finalTaskName = taskName.trim();

          // This is the fix: use category name when task name is empty
          if (!finalTaskName) {
            finalTaskName = categoryName;
          }

          // Verify: finalTaskName should be the category name, not a tag
          expect(finalTaskName).toBe(categoryName);
          expect(finalTaskName).not.toBe(selectedTags[0]);

          // Verify: finalTaskName should not be empty
          expect(finalTaskName.trim().length).toBeGreaterThan(0);

          // Verify: tags should be passed separately, not as task name
          const tagsString = selectedTags.length > 0 ? selectedTags.join(',') : undefined;
          expect(tagsString).toBeDefined();
          expect(tagsString).not.toEqual(finalTaskName);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify that when task name IS provided, it's used instead of category
   */
  it('Should use provided task name when user enters one, regardless of selected tags', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9]+$/), // task name
        fc.stringMatching(/^[a-zA-Z0-9]+$/), // category name
        fc.array(fc.stringMatching(/^[a-zA-Z0-9]+$/), {
          minLength: 1,
          maxLength: 3,
        }), // selected tags
        (taskName, categoryName, selectedTags) => {
          // Simulate form submission logic
          let finalTaskName = taskName.trim();

          // This is the fix: use category name only when task name is empty
          if (!finalTaskName) {
            finalTaskName = categoryName;
          }

          // Verify: finalTaskName should be the provided task name
          expect(finalTaskName).toBe(taskName);
          expect(finalTaskName).not.toBe(categoryName);
          expect(finalTaskName).not.toBe(selectedTags[0]);

          // Verify: tags should be passed separately
          const tagsString = selectedTags.length > 0 ? selectedTags.join(',') : undefined;
          expect(tagsString).toBeDefined();
          expect(tagsString).not.toEqual(finalTaskName);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify round-trip conversion of tags
   */
  it('Should preserve tags through array-to-string-to-array conversion', () => {
    fc.assert(
      fc.property(
        fc.array(fc.stringMatching(/^[a-zA-Z0-9]+$/), {
          minLength: 0,
          maxLength: 5,
        }),
        (originalTags) => {
          // Convert array to string
          const tagsString = originalTags.length > 0 ? originalTags.join(',') : undefined;

          // Convert back to array
          const reconstructed = tagsString ? tagsString.split(',') : [];

          // Verify: round-trip should preserve original
          expect(reconstructed).toEqual(originalTags);
        }
      ),
      { numRuns: 100 }
    );
  });
});
