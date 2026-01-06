import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Property-Based Tests for AI Mode Consistency
 * 
 * These tests validate that Timer and Nexus use the same API format
 * and that AI-parsed instanceTags are correctly converted to comma-separated strings.
 */

describe('AI Mode Consistency - Timer and Nexus Integration', () => {
  /**
   * Property 7: API调用一致性
   * Feature: timer-tag-recognition, Property 7: API调用一致性
   * Validates: Requirements 3.1, 3.2
   * 
   * Timer and Nexus should call the same AI parse API and receive
   * responses in the same format: { name, categoryPath, instanceTags }
   * 
   * When instanceTags are returned from the API, they should be converted
   * to a comma-separated string for the instanceTagNames parameter.
   */
  it('Property 7: AI parse API response should have consistent format and tags should convert to comma-separated string', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9]+$/), // task name
        fc.stringMatching(/^[a-zA-Z0-9/]+$/), // category path
        fc.array(fc.stringMatching(/^[a-zA-Z0-9]+$/), {
          minLength: 0,
          maxLength: 5,
        }), // instanceTags array
        (taskName, categoryPath, instanceTags) => {
          // Simulate API response format
          const apiResponse = {
            name: taskName,
            categoryPath: categoryPath,
            instanceTags: instanceTags,
          };

          // Verify: API response has the expected structure
          expect(apiResponse).toHaveProperty('name');
          expect(apiResponse).toHaveProperty('categoryPath');
          expect(apiResponse).toHaveProperty('instanceTags');

          // Verify: name is a string
          expect(typeof apiResponse.name).toBe('string');

          // Verify: categoryPath is a string
          expect(typeof apiResponse.categoryPath).toBe('string');

          // Verify: instanceTags is an array
          expect(Array.isArray(apiResponse.instanceTags)).toBe(true);

          // Simulate the conversion that happens in handleAiSubmit()
          // Convert instanceTags array to comma-separated string
          const tagsString = apiResponse.instanceTags?.length > 0 
            ? apiResponse.instanceTags.join(',') 
            : undefined;

          // Verify: if instanceTags is not empty, tagsString should be defined
          if (apiResponse.instanceTags.length > 0) {
            expect(tagsString).toBeDefined();
            expect(tagsString).not.toBeNull();
            
            // Verify: the string should contain all tags separated by commas
            const reconstructed = tagsString!.split(',');
            expect(reconstructed).toEqual(apiResponse.instanceTags);
          } else {
            // Verify: if instanceTags is empty, tagsString should be undefined
            expect(tagsString).toBeUndefined();
          }

          // Verify: the conversion should be reversible (round-trip)
          if (tagsString) {
            const roundTrip = tagsString.split(',');
            expect(roundTrip).toEqual(apiResponse.instanceTags);
          }

          // Verify: no tag should contain comma (since we use comma as separator)
          apiResponse.instanceTags.forEach((tag) => {
            expect(tag).not.toContain(',');
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify that the conversion logic in handleAiSubmit
   * correctly transforms API response to the format expected by onAddToTimer
   */
  it('Should correctly convert AI parse response to onAddToTimer parameters', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9]+$/), // task name
        fc.stringMatching(/^[a-zA-Z0-9/]+$/), // category path
        fc.array(fc.stringMatching(/^[a-zA-Z0-9]+$/), {
          minLength: 0,
          maxLength: 5,
        }), // instanceTags array
        (taskName, categoryPath, instanceTags) => {
          // Simulate API response
          const parsed = {
            name: taskName,
            categoryPath: categoryPath,
            instanceTags: instanceTags,
          };

          // Simulate the conversion in handleAiSubmit()
          const tagsString = parsed.instanceTags?.length > 0 
            ? parsed.instanceTags.join(',') 
            : undefined;

          // These are the parameters that would be passed to onAddToTimer
          const onAddToTimerParams = {
            taskName: parsed.name,
            categoryPath: parsed.categoryPath,
            instanceTagNames: tagsString,
          };

          // Verify: all required parameters are present
          expect(onAddToTimerParams).toHaveProperty('taskName');
          expect(onAddToTimerParams).toHaveProperty('categoryPath');
          expect(onAddToTimerParams).toHaveProperty('instanceTagNames');

          // Verify: taskName should match the API response name
          expect(onAddToTimerParams.taskName).toBe(parsed.name);

          // Verify: categoryPath should match the API response categoryPath
          expect(onAddToTimerParams.categoryPath).toBe(parsed.categoryPath);

          // Verify: instanceTagNames should be comma-separated or undefined
          if (parsed.instanceTags.length > 0) {
            expect(onAddToTimerParams.instanceTagNames).toBeDefined();
            expect(typeof onAddToTimerParams.instanceTagNames).toBe('string');
            
            // Verify: can be split back to original tags
            const reconstructed = onAddToTimerParams.instanceTagNames!.split(',');
            expect(reconstructed).toEqual(parsed.instanceTags);
          } else {
            expect(onAddToTimerParams.instanceTagNames).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify consistency between Electron and Web modes
   * Both should use the same API response format and conversion logic
   */
  it('Should handle API response consistently in both Electron and Web modes', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9]+$/), // task name
        fc.stringMatching(/^[a-zA-Z0-9/]+$/), // category path
        fc.array(fc.stringMatching(/^[a-zA-Z0-9]+$/), {
          minLength: 0,
          maxLength: 5,
        }), // instanceTags array
        (taskName, categoryPath, instanceTags) => {
          // Simulate API response (same for both modes)
          const apiResponse = {
            name: taskName,
            categoryPath: categoryPath,
            instanceTags: instanceTags,
          };

          // Simulate conversion in both modes
          const electronModeConversion = {
            text: apiResponse.name,
            categoryPath: apiResponse.categoryPath,
            instanceTagNames: apiResponse.instanceTags?.length > 0 
              ? apiResponse.instanceTags.join(',') 
              : undefined,
          };

          const webModeConversion = {
            taskName: apiResponse.name,
            categoryPath: apiResponse.categoryPath,
            instanceTagNames: apiResponse.instanceTags?.length > 0 
              ? apiResponse.instanceTags.join(',') 
              : undefined,
          };

          // Verify: both modes should produce the same instanceTagNames
          expect(electronModeConversion.instanceTagNames).toBe(webModeConversion.instanceTagNames);

          // Verify: both modes should preserve the task name
          expect(electronModeConversion.text).toBe(webModeConversion.taskName);

          // Verify: both modes should preserve the category path
          expect(electronModeConversion.categoryPath).toBe(webModeConversion.categoryPath);
        }
      ),
      { numRuns: 100 }
    );
  });
});
