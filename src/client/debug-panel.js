/**
 * Debug Panel Module
 * Provides developer tools for inspecting sprites, source code, audio, and game state
 */

export class DebugPanel {
  constructor() {
    this.isOpen = false;
    this.currentTab = 'sprites';
    this.gameCode = '';
    this.palette = [];
    this.sprites = [];
    this.audioEvents = [];
    this.maxAudioEvents = 50;

    // DOM elements
    this.toggleBtn = document.getElementById('btn-debug'); // Action bar button
    this.closeBtn = document.getElementById('btn-close-debug');
    this.panel = document.getElementById('debug-panel');
    this.tabs = document.querySelectorAll('.debug-tab');
    this.tabContents = document.querySelectorAll('.debug-tab-content');

    // Tab-specific elements
    this.paletteGrid = document.getElementById('palette-grid');
    this.spriteGrid = document.getElementById('sprite-grid');
    this.sourceCode = document.getElementById('source-code');
    this.sourceLineCount = document.getElementById('source-line-count');
    this.copySourceBtn = document.getElementById('btn-copy-source');
    this.audioLog = document.getElementById('audio-log');
    this.audioStats = document.getElementById('audio-stats');
    this.clearAudioBtn = document.getElementById('btn-clear-audio-log');

    this.initEventListeners();
  }

  initEventListeners() {
    // Toggle panel - now triggered by action bar button
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.toggle());
    }
    this.closeBtn.addEventListener('click', () => this.close());

    // Tab switching
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // Copy source code
    this.copySourceBtn.addEventListener('click', () => this.copySourceCode());

    // Clear audio log
    this.clearAudioBtn.addEventListener('click', () => this.clearAudioLog());

    // Keyboard shortcut: ` (backtick) to toggle
    document.addEventListener('keydown', (e) => {
      if (e.key === '`' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Don't trigger if user is typing in an input/textarea
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          this.toggle();
        }
      }
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.isOpen = true;
    this.panel.style.display = 'flex';
    this.refresh();
    // Prevent body scroll when modal open
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.isOpen = false;
    this.panel.style.display = 'none';
    // Restore body scroll
    document.body.style.overflow = '';
  }

  switchTab(tabName) {
    this.currentTab = tabName;

    // Update tab buttons
    this.tabs.forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Update tab contents
    this.tabContents.forEach(content => {
      if (content.id === `debug-tab-${tabName}`) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });

    // Refresh current tab data
    this.refreshCurrentTab();
  }

  refresh() {
    this.refreshCurrentTab();
  }

  refreshCurrentTab() {
    switch (this.currentTab) {
      case 'sprites':
        this.renderPalette();
        this.renderSprites();
        break;
      case 'source':
        this.renderSourceCode();
        break;
      case 'audio':
        this.renderAudioLog();
        break;
      case 'state':
        // State is updated in real-time by updateState()
        break;
    }
  }

  // ==================== SPRITES TAB ====================

  setGameResources(palette, sprites) {
    this.palette = palette || [];
    this.sprites = sprites || [];
    if (this.isOpen && this.currentTab === 'sprites') {
      this.renderPalette();
      this.renderSprites();
    }
  }

  renderPalette() {
    if (!this.paletteGrid) return;

    this.paletteGrid.innerHTML = '';

    if (this.palette.length === 0) {
      this.paletteGrid.innerHTML = '<div style="color: #666; grid-column: 1 / -1;">No palette loaded</div>';
      return;
    }

    this.palette.forEach((color, index) => {
      const colorDiv = document.createElement('div');
      colorDiv.className = 'palette-color';

      // Convert color to hex string
      const hexColor = typeof color === 'number'
        ? `#${color.toString(16).padStart(6, '0')}`
        : color;

      colorDiv.style.backgroundColor = hexColor;
      colorDiv.title = `${index}: ${hexColor}`;

      const label = document.createElement('div');
      label.className = 'palette-color-label';
      label.textContent = index.toString(16).toUpperCase();
      colorDiv.appendChild(label);

      this.paletteGrid.appendChild(colorDiv);
    });
  }

  renderSprites() {
    if (!this.spriteGrid) return;

    this.spriteGrid.innerHTML = '';

    if (this.sprites.length === 0) {
      this.spriteGrid.innerHTML = '<div style="color: #666;">No sprites loaded</div>';
      return;
    }

    this.sprites.forEach((sprite, index) => {
      const spriteItem = document.createElement('div');
      spriteItem.className = 'sprite-item';

      // Create canvas for sprite preview
      const canvas = document.createElement('canvas');
      canvas.className = 'sprite-canvas';
      canvas.width = 8;
      canvas.height = 8;

      // Render sprite (we'll need access to the sprite rendering function)
      this.renderSpriteToCanvas(canvas, sprite, index);

      const idLabel = document.createElement('div');
      idLabel.className = 'sprite-id';
      idLabel.textContent = `#${index}`;

      spriteItem.appendChild(canvas);
      spriteItem.appendChild(idLabel);
      this.spriteGrid.appendChild(spriteItem);
    });
  }

  renderSpriteToCanvas(canvas, spriteData, spriteId) {
    const ctx = canvas.getContext('2d');

    // Validate sprite data
    if (!spriteData || !Array.isArray(spriteData) || spriteData.length !== 8) {
      ctx.fillStyle = '#333';
      ctx.fillRect(0, 0, 8, 8);
      return;
    }

    // Create image data
    const imageData = ctx.createImageData(8, 8);
    const data = imageData.data;

    // Render each pixel using the palette
    for (let y = 0; y < 8; y++) {
      const row = spriteData[y];
      if (!row || typeof row !== 'string') continue;

      for (let x = 0; x < 8; x++) {
        const colorIndex = parseInt(row[x] || '0', 16);
        const color = this.palette[colorIndex] || 0x000000;
        const dataIndex = (y * 8 + x) * 4;

        // Extract RGB from color value
        data[dataIndex] = (color >> 16) & 0xFF;     // R
        data[dataIndex + 1] = (color >> 8) & 0xFF;  // G
        data[dataIndex + 2] = color & 0xFF;         // B
        data[dataIndex + 3] = colorIndex === 0 ? 0 : 255;  // A (transparent if index 0)
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  // ==================== SOURCE TAB ====================

  setGameCode(code) {
    this.gameCode = code || '';
    if (this.isOpen && this.currentTab === 'source') {
      this.renderSourceCode();
    }
  }

  renderSourceCode() {
    if (!this.sourceCode) return;

    if (!this.gameCode) {
      this.sourceCode.innerHTML = '<code>// No game code loaded</code>';
      this.sourceLineCount.textContent = 'Lines: 0';
      return;
    }

    const lines = this.gameCode.split('\n');
    this.sourceLineCount.textContent = `Lines: ${lines.length}`;

    // Add line numbers
    const numberedCode = lines
      .map((line, i) => {
        const lineNum = (i + 1).toString().padStart(4, ' ');
        return `${lineNum}  ${line}`;
      })
      .join('\n');

    this.sourceCode.innerHTML = `<code>${this.escapeHtml(numberedCode)}</code>`;
  }

  copySourceCode() {
    if (!this.gameCode) {
      console.log('No source code to copy');
      return;
    }

    navigator.clipboard.writeText(this.gameCode).then(() => {
      // Show feedback
      const originalText = this.copySourceBtn.textContent;
      this.copySourceBtn.textContent = '✓ COPIED!';
      this.copySourceBtn.style.borderColor = 'var(--nes-green)';

      setTimeout(() => {
        this.copySourceBtn.textContent = originalText;
        this.copySourceBtn.style.borderColor = '';
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy source code:', err);
    });
  }

  // ==================== AUDIO TAB ====================

  logAudioEvent(event) {
    this.audioEvents.push({
      timestamp: Date.now(),
      ...event
    });

    // Keep only last N events
    if (this.audioEvents.length > this.maxAudioEvents) {
      this.audioEvents.shift();
    }

    if (this.isOpen && this.currentTab === 'audio') {
      this.renderAudioLog();
    }
  }

  renderAudioLog() {
    if (!this.audioLog) return;

    if (this.audioEvents.length === 0) {
      this.audioLog.innerHTML = '<div class="audio-log-empty">No audio events yet</div>';
      this.audioStats.textContent = 'Stats: 0 sounds played';
      return;
    }

    // Render events (newest first)
    const eventsHtml = [...this.audioEvents].reverse().map(event => {
      return `<div class="audio-log-entry">
        Frame ${event.frame || '?'} | Slot ${event.slotId} | ${event.soundId} | ${event.channel} | ${event.note || '--'} | ${event.duration}s
      </div>`;
    }).join('');

    this.audioLog.innerHTML = eventsHtml;

    // Update stats
    const channels = new Set(this.audioEvents.map(e => e.channel));
    this.audioStats.textContent = `Stats: ${this.audioEvents.length} sounds played | Channels: ${channels.size}`;

    // Auto-scroll to bottom
    this.audioLog.scrollTop = this.audioLog.scrollHeight;
  }

  clearAudioLog() {
    this.audioEvents = [];
    this.renderAudioLog();
  }

  // ==================== STATE TAB ====================

  updateState(stateData) {
    if (!this.isOpen || this.currentTab !== 'state') return;

    // Update game state
    document.getElementById('state-score').textContent = stateData.score || 0;
    document.getElementById('state-gameover').textContent = stateData.gameOver ? 'true' : 'false';
    document.getElementById('state-frame').textContent = stateData.frame || 0;
    document.getElementById('state-fps').textContent = stateData.fps ? stateData.fps.toFixed(0) : '60';

    // Update render stats
    document.getElementById('stats-sprites').textContent = `${stateData.spriteCount || 0} / 64`;
    document.getElementById('stats-tiles').textContent = `${stateData.tileCount || 0} / 2048`;
    document.getElementById('stats-scroll').textContent = `{x: ${stateData.scrollX || 0}, y: ${stateData.scrollY || 0}}`;
    document.getElementById('stats-render-time').textContent = `${(stateData.renderTime || 0).toFixed(1)}ms`;
  }

  // ==================== UTILITIES ====================

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export singleton instance
export const debugPanel = new DebugPanel();
