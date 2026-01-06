import { test, expect } from '@playwright/test';

test('reproduce streaming stuck at ...', async ({ page }) => {
  // Capture console logs
  page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));

  // Navigate to room with auto-login via URL param
  await page.goto('/room/debug-stream-test-v1?name=PlaywrightTester');

  // Wait for the input to be ready
  const input = page.getByPlaceholder('Awaiting orders...');
  await expect(input).toBeVisible({ timeout: 10000 });

  // Type and send a message
  await input.fill('Hello, are you there?');
  await page.getByRole('button', { name: 'SEND' }).click();

  // Wait for the user message to appear
  await expect(page.getByText('Hello, are you there?')).toBeVisible();

  // Wait for the AI message bubble (initially "...")
  // The "..." is inside a div with animate-pulse
  const loadingIndicator = page.locator('.animate-pulse').filter({ hasText: '...' });
  await expect(loadingIndicator).toBeVisible({ timeout: 5000 });

  console.log('AI response started (loading indicator visible)');

  // Wait for the loading indicator to disappear OR for some text to appear in the AI bubble
  // We expect the text to NOT be "..." eventually.
  // The bubble container usually has "bg-black/40" for assistant.
  
  // Let's try to wait for ANY text in the last assistant message that is NOT "..."
  // This is tricky because the structure is complex.
  
  // We can check if the loading indicator disappears.
  try {
    await expect(loadingIndicator).toBeHidden({ timeout: 15000 });
    console.log('Loading indicator disappeared!');
  } catch (e) {
    console.log('Loading indicator is STUCK!');
    // Take a screenshot if stuck
    await page.screenshot({ path: '.playwright-mcp/stuck-state.png' });
    throw e;
  }
});
