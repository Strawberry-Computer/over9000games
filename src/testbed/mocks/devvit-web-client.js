// Mock @devvit/web/client for testbed mode

/**
 * Navigate to a URL - in testbed mode just use standard navigation
 */
export function navigateTo(url) {
  console.log('[TESTBED] Navigate to:', url);
  window.location.href = url;
}
