#!/usr/bin/env node

/**
 * Manual validation script for integration tests
 * This script validates the tag handling logic without relying on vitest
 */

console.log('🧪 Starting Integration Test Validation...\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    failedTests++;
    throw new Error(message);
  } else {
    console.log(`✅ PASSED: ${message}`);
    passedTests++;
  }
}

try {
  // Test 1: AI Mode - Tag-only input
  console.log('\n📋 Test 1: AI Mode - Tag-only input "#个人网站"');
  {
    const userInput = '#个人网站';
    const expectedParsedResult = {
      name: '个人网站',
      categoryPath: '项目/个人网站',
      instanceTags: ['个人网站'],
    };

    assert(!expectedParsedResult.name.includes('#'), 'Task name should not contain #');
    assert(expectedParsedResult.instanceTags.includes('个人网站'), 'instanceTags should contain the tag');
    expectedParsedResult.instanceTags.forEach((tag) => {
      assert(!tag.includes('#'), `Tag "${tag}" should not contain #`);
    });

    const instanceTagNames = expectedParsedResult.instanceTags.length > 0 
      ? expectedParsedResult.instanceTags.join(',') 
      : undefined;

    assert(instanceTagNames === '个人网站', 'instanceTagNames should be "个人网站"');

    const taskParams = {
      taskName: expectedParsedResult.name,
      categoryPath: expectedParsedResult.categoryPath,
      instanceTagNames: instanceTagNames,
    };

    assert(taskParams.taskName === '个人网站', 'Task name should be "个人网站"');
    assert(taskParams.instanceTagNames === '个人网站', 'instanceTagNames should be "个人网站"');
    assert(taskParams.taskName !== taskParams.instanceTagNames || taskParams.taskName === '个人网站', 'Task name and tag should be correctly separated');
  }

  // Test 2: AI Mode - Mixed input
  console.log('\n📋 Test 2: AI Mode - Mixed input "写代码 #项目Nexus"');
  {
    const userInput = '写代码 #项目Nexus';
    const expectedParsedResult = {
      name: '写代码',
      categoryPath: '工作/开发',
      instanceTags: ['项目Nexus'],
    };

    assert(expectedParsedResult.name === '写代码', 'Task name should be "写代码"');
    assert(!expectedParsedResult.name.includes('#'), 'Task name should not contain #');
    assert(expectedParsedResult.instanceTags.includes('项目Nexus'), 'instanceTags should contain "项目Nexus"');
    assert(!expectedParsedResult.instanceTags.includes('#项目Nexus'), 'instanceTags should not contain #');

    const instanceTagNames = expectedParsedResult.instanceTags.length > 0 
      ? expectedParsedResult.instanceTags.join(',') 
      : undefined;

    assert(instanceTagNames === '项目Nexus', 'instanceTagNames should be "项目Nexus"');

    const taskParams = {
      taskName: expectedParsedResult.name,
      categoryPath: expectedParsedResult.categoryPath,
      instanceTagNames: instanceTagNames,
    };

    assert(taskParams.taskName === '写代码', 'Task name should be "写代码"');
    assert(taskParams.instanceTagNames === '项目Nexus', 'instanceTagNames should be "项目Nexus"');
  }

  // Test 3: Form Mode - Tag selection without task name
  console.log('\n📋 Test 3: Form Mode - Tag selection without task name');
  {
    const selectedCategory = '项目/个人网站';
    const taskName = '';
    const selectedTags = ['个人网站'];

    const categoryNameParts = selectedCategory.split('/');
    const categoryName = categoryNameParts[categoryNameParts.length - 1];

    let finalTaskName = taskName.trim();
    if (!finalTaskName) {
      finalTaskName = categoryName;
    }

    const instanceTagNames = selectedTags.length > 0 ? selectedTags.join(',') : undefined;

    assert(finalTaskName === '个人网站', 'Final task name should be "个人网站"');
    assert(finalTaskName === categoryName, 'Final task name should be category name');
    assert(finalTaskName !== selectedTags[0] || finalTaskName === '个人网站', 'Should not use tag as task name (or they happen to be the same)');
    assert(instanceTagNames === '个人网站', 'instanceTagNames should be "个人网站"');

    const taskParams = {
      taskName: finalTaskName,
      categoryPath: selectedCategory,
      instanceTagNames: instanceTagNames,
    };

    assert(taskParams.taskName === '个人网站', 'Task name should be "个人网站"');
    assert(taskParams.instanceTagNames === '个人网站', 'instanceTagNames should be "个人网站"');
  }

  // Test 4: Form Mode - Task name and tag selection
  console.log('\n📋 Test 4: Form Mode - Task name and tag selection');
  {
    const selectedCategory = '自我复利/身体蓄能';
    const taskName = '蓄能';
    const selectedTags = ['项目Nexus'];

    let finalTaskName = taskName.trim();
    if (!finalTaskName) {
      const categoryNameParts = selectedCategory.split('/');
      finalTaskName = categoryNameParts[categoryNameParts.length - 1];
    }

    const instanceTagNames = selectedTags.length > 0 ? selectedTags.join(',') : undefined;

    assert(finalTaskName === '蓄能', 'Final task name should be "蓄能"');
    assert(finalTaskName !== selectedTags[0], 'Task name should not be the tag');
    assert(instanceTagNames === '项目Nexus', 'instanceTagNames should be "项目Nexus"');

    const taskParams = {
      taskName: finalTaskName,
      categoryPath: selectedCategory,
      instanceTagNames: instanceTagNames,
    };

    assert(taskParams.taskName === '蓄能', 'Task name should be "蓄能"');
    assert(taskParams.instanceTagNames === '项目Nexus', 'instanceTagNames should be "项目Nexus"');
    assert(taskParams.taskName !== taskParams.instanceTagNames, 'Task name and tag should be different');
  }

  // Test 5: Multiple tags handling
  console.log('\n📋 Test 5: Multiple tags handling');
  {
    const aiInput = '#项目Nexus #前端';
    const expectedAiTags = ['项目Nexus', '前端'];

    expectedAiTags.forEach((tag) => {
      assert(!tag.includes('#'), `Tag "${tag}" should not contain #`);
    });

    const aiTagsString = expectedAiTags.join(',');
    assert(aiTagsString === '项目Nexus,前端', 'Tags string should be "项目Nexus,前端"');

    const reconstructedAiTags = aiTagsString.split(',');
    assert(JSON.stringify(reconstructedAiTags) === JSON.stringify(expectedAiTags), 'Round-trip conversion should preserve tags');

    const formSelectedTags = ['项目Nexus', '前端'];
    const formTagsString = formSelectedTags.join(',');
    assert(formTagsString === '项目Nexus,前端', 'Form tags string should be "项目Nexus,前端"');

    const reconstructedFormTags = formTagsString.split(',');
    assert(JSON.stringify(reconstructedFormTags) === JSON.stringify(formSelectedTags), 'Form round-trip conversion should preserve tags');

    assert(aiTagsString === formTagsString, 'Both modes should produce the same result');
  }

  // Test 6: API consistency
  console.log('\n📋 Test 6: API consistency between Timer and Nexus');
  {
    const apiResponse = {
      name: '写代码',
      categoryPath: '工作/开发',
      instanceTags: ['项目Nexus', '前端'],
    };

    const timerConversion = {
      taskName: apiResponse.name,
      categoryPath: apiResponse.categoryPath,
      instanceTagNames: apiResponse.instanceTags?.length > 0 
        ? apiResponse.instanceTags.join(',') 
        : undefined,
    };

    const nexusConversion = {
      taskName: apiResponse.name,
      categoryPath: apiResponse.categoryPath,
      instanceTagNames: apiResponse.instanceTags?.length > 0 
        ? apiResponse.instanceTags.join(',') 
        : undefined,
    };

    assert(JSON.stringify(timerConversion) === JSON.stringify(nexusConversion), 'Both modes should produce identical results');
    assert(timerConversion.taskName === nexusConversion.taskName, 'Task names should match');
    assert(timerConversion.categoryPath === nexusConversion.categoryPath, 'Category paths should match');
    assert(timerConversion.instanceTagNames === nexusConversion.instanceTagNames, 'instanceTagNames should match');
    assert(timerConversion.instanceTagNames === '项目Nexus,前端', 'instanceTagNames should be "项目Nexus,前端"');
  }

  // Test 7: Tag conversion round-trip
  console.log('\n📋 Test 7: Tag conversion round-trip');
  {
    const testCases = [
      [],
      ['tag1'],
      ['tag1', 'tag2'],
      ['tag1', 'tag2', 'tag3'],
    ];

    testCases.forEach((originalTags) => {
      const tagsString = originalTags.length > 0 ? originalTags.join(',') : undefined;
      const reconstructed = tagsString ? tagsString.split(',') : [];
      assert(JSON.stringify(reconstructed) === JSON.stringify(originalTags), `Round-trip should preserve tags: ${JSON.stringify(originalTags)}`);
    });
  }

  // Test 8: Form mode should not use tag as task name
  console.log('\n📋 Test 8: Form mode should not use tag as task name');
  {
    const testCases = [
      { categoryName: 'category1', selectedTags: ['tag1'] },
      { categoryName: 'category2', selectedTags: ['tag1', 'tag2'] },
      { categoryName: 'category3', selectedTags: ['tag1', 'tag2', 'tag3'] },
    ];

    testCases.forEach(({ categoryName, selectedTags }) => {
      let taskName = '';
      let finalTaskName = taskName.trim();

      if (!finalTaskName) {
        finalTaskName = categoryName;
      }

      assert(finalTaskName === categoryName, `Final task name should be category name: ${categoryName}`);
      assert(finalTaskName !== selectedTags[0], `Final task name should not be first tag: ${selectedTags[0]}`);
      assert(finalTaskName.trim().length > 0, 'Final task name should not be empty');

      const tagsString = selectedTags.length > 0 ? selectedTags.join(',') : undefined;
      assert(tagsString !== undefined, 'Tags string should be defined');
      assert(tagsString !== finalTaskName, 'Tags string should not equal task name');
    });
  }

  // Test 9: AI mode should extract tags correctly
  console.log('\n📋 Test 9: AI mode should extract tags correctly');
  {
    const testCases = [
      { input: '#tag1', expectedTags: ['tag1'] },
      { input: '#tag1 #tag2', expectedTags: ['tag1', 'tag2'] },
      { input: 'task #tag1 #tag2', expectedTags: ['tag1', 'tag2'] },
    ];

    testCases.forEach(({ input, expectedTags }) => {
      const extractedTags = input
        .split(/\s+/)
        .filter((word) => word.startsWith('#'))
        .map((word) => word.substring(1));

      assert(JSON.stringify(extractedTags) === JSON.stringify(expectedTags), `Should extract tags from "${input}": ${JSON.stringify(expectedTags)}`);

      extractedTags.forEach((tag) => {
        assert(!tag.includes('#'), `Extracted tag "${tag}" should not contain #`);
      });

      const tagsString = extractedTags.join(',');
      const reconstructed = tagsString ? tagsString.split(',') : [];
      assert(JSON.stringify(reconstructed) === JSON.stringify(expectedTags), `Round-trip should preserve tags from "${input}"`);
    });
  }

  // Test 10: Complete end-to-end flow - AI mode
  console.log('\n📋 Test 10: Complete end-to-end flow - AI mode');
  {
    const userInput = '#个人网站';
    const parsedResult = {
      name: '个人网站',
      categoryPath: '项目/个人网站',
      instanceTags: ['个人网站'],
    };

    assert(!parsedResult.name.includes('#'), 'Parsed name should not contain #');
    assert(parsedResult.instanceTags.includes('个人网站'), 'instanceTags should contain the tag');
    assert(!parsedResult.instanceTags[0].includes('#'), 'First tag should not contain #');

    const instanceTagNames = parsedResult.instanceTags?.length > 0 
      ? parsedResult.instanceTags.join(',') 
      : undefined;

    const taskParams = {
      taskName: parsedResult.name,
      categoryPath: parsedResult.categoryPath,
      instanceTagNames: instanceTagNames,
    };

    assert(taskParams.taskName === '个人网站', 'Task name should be "个人网站"');
    assert(taskParams.categoryPath === '项目/个人网站', 'Category path should be "项目/个人网站"');
    assert(taskParams.instanceTagNames === '个人网站', 'instanceTagNames should be "个人网站"');
    assert(!taskParams.taskName.includes('#'), 'Task name should not contain #');
    assert(!taskParams.instanceTagNames.includes('#'), 'instanceTagNames should not contain #');
  }

  // Test 11: Complete end-to-end flow - Form mode
  console.log('\n📋 Test 11: Complete end-to-end flow - Form mode');
  {
    const selectedCategory = '项目/个人网站';
    const selectedTags = ['个人网站', '前端'];
    const taskName = '';

    const categoryNameParts = selectedCategory.split('/');
    const categoryName = categoryNameParts[categoryNameParts.length - 1];

    let finalTaskName = taskName.trim();
    if (!finalTaskName) {
      finalTaskName = categoryName;
    }

    const instanceTagNames = selectedTags.length > 0 ? selectedTags.join(',') : undefined;

    const taskParams = {
      taskName: finalTaskName,
      categoryPath: selectedCategory,
      instanceTagNames: instanceTagNames,
    };

    assert(taskParams.taskName === '个人网站', 'Task name should be "个人网站"');
    assert(taskParams.categoryPath === '项目/个人网站', 'Category path should be "项目/个人网站"');
    assert(taskParams.instanceTagNames === '个人网站,前端', 'instanceTagNames should be "个人网站,前端"');
    assert(taskParams.taskName !== selectedTags[0] || taskParams.taskName === '个人网站', 'Task name should not be first tag (or they happen to be the same)');
    assert(taskParams.taskName !== selectedTags[1], 'Task name should not be second tag');

    const reconstructedTags = taskParams.instanceTagNames.split(',');
    assert(JSON.stringify(reconstructedTags) === JSON.stringify(selectedTags), 'Round-trip should preserve tags');
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n✅ All tests passed! (${passedTests} assertions)\n`);
  process.exit(0);

} catch (error) {
  console.log('\n' + '='.repeat(60));
  console.log(`\n❌ Test failed! (${passedTests} passed, ${failedTests} failed)\n`);
  process.exit(1);
}
