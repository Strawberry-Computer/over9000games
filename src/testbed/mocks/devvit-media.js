// Mock @devvit/media for testbed mode

/**
 * Mock media upload - in testbed mode, just return the data URI as-is
 * In production this would upload to Reddit's CDN
 */
export const media = {
  async upload({ url, type }) {
    console.log('[TESTBED] Media upload (mock):', { type, size: url.length });

    // Return a mock media URL (base64 data URI in testbed mode)
    return {
      mediaUrl: url, // Just return the data URI as-is
      mediaId: `mock_${Date.now()}`
    };
  }
};
