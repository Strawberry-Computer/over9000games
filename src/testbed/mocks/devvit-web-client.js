// Mock @devvit/web/client for testbed mode

/**
 * Navigate to a URL - in testbed mode convert Reddit URLs to local testbed URLs
 */
export function navigateTo(url) {
  console.log('[TESTBED] Navigate to:', url);

  // Convert Reddit post URLs to local testbed URLs
  // Format: https://reddit.com/r/subreddit/comments/POST_ID → /r/testbed/comments/POST_ID
  if (url.includes('reddit.com')) {
    const match = url.match(/\/r\/\w+\/comments\/([^/?]+)/);
    if (match) {
      const postId = match[1];
      const localUrl = `/r/testbed/comments/${postId}`;
      console.log('[TESTBED] Redirecting Reddit URL to local:', localUrl);
      window.location.href = localUrl;
      return;
    }
  }

  // Otherwise use the URL as-is
  window.location.href = url;
}

// Note: Fetch interception is handled by HTML injection in devvit-web-server.js
// to ensure it runs before client code loads
