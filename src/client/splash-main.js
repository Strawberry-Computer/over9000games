import { requestExpandedMode } from '@devvit/web/client';

document.addEventListener('DOMContentLoaded', async () => {
  const playButton = document.getElementById('play-button');
  const backgroundImage = document.getElementById('background-image');
  const gameTitle = document.getElementById('game-title');

  // Fetch metadata to get screenshot and title
  try {
    const response = await fetch('/api/init');
    if (response.ok) {
      const data = await response.json();

      // Set background image if available
      if (data.metadata?.screenshotUrl) {
        backgroundImage.src = data.metadata.screenshotUrl;
        backgroundImage.style.display = 'block';
      }

      // Set game title if available
      if (data.metadata?.title && data.metadata.title !== 'over9000games') {
        gameTitle.textContent = data.metadata.title;
      }
    }
  } catch (error) {
    console.error('Failed to fetch metadata:', error);
  }

  playButton.addEventListener('click', async (event) => {
    try {
      await requestExpandedMode(event, 'game');
    } catch (error) {
      console.error('Failed to enter expanded mode:', error);
    }
  });
});
