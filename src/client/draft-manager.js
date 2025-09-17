/**
 * Draft Manager for Over9000Games
 * Handles auto-saving, draft restoration, and undo/redo history using localStorage
 */

export class DraftManager {
  constructor() {
    this.currentDraftId = null;
    this.autoSaveInterval = null;
    this.maxHistorySize = 50; // Maximum undo states to keep
    this.autoSaveIntervalMs = 30000; // 30 seconds

    // Storage keys
    this.STORAGE_KEYS = {
      DRAFT_LIST: 'over9000_drafts',
      DRAFT_PREFIX: 'over9000_draft_',
      CURRENT_DRAFT: 'over9000_current_draft',
      SETTINGS: 'over9000_draft_settings'
    };

    this.initializeStorage();
  }

  /**
   * Initialize localStorage structure
   */
  initializeStorage() {
    if (!localStorage.getItem(this.STORAGE_KEYS.DRAFT_LIST)) {
      localStorage.setItem(this.STORAGE_KEYS.DRAFT_LIST, JSON.stringify([]));
    }

    // Load current draft ID if exists
    this.currentDraftId = localStorage.getItem(this.STORAGE_KEYS.CURRENT_DRAFT);
  }

  /**
   * Create a new draft
   */
  createDraft(initialData = {}) {
    const draftId = this.generateDraftId();
    const timestamp = Date.now();

    const draft = {
      id: draftId,
      created: timestamp,
      updated: timestamp,
      data: {
        description: initialData.description || '',
        title: initialData.title || '',
        message: initialData.message || '',
        gameCode: initialData.gameCode || null,
        originalDescription: initialData.originalDescription || '',
        ...initialData
      },
      history: [{
        timestamp,
        action: 'create',
        data: { ...initialData }
      }]
    };

    // Save to localStorage
    this.saveDraft(draft);
    this.addToMasterList(draft);
    this.setCurrentDraft(draftId);

    return draftId;
  }

  /**
   * Update current draft with new data
   */
  updateDraft(data, action = 'update') {
    if (!this.currentDraftId) {
      return this.createDraft(data);
    }

    const draft = this.loadDraft(this.currentDraftId);
    if (!draft) {
      return this.createDraft(data);
    }

    const timestamp = Date.now();

    // Update draft data
    draft.data = { ...draft.data, ...data };
    draft.updated = timestamp;

    // Simple history - just track last few actions for debugging
    draft.history.push({
      timestamp,
      action,
      description: data.description?.substring(0, 50) || 'Update'
    });

    // Keep only last 10 actions
    if (draft.history.length > 10) {
      draft.history = draft.history.slice(-10);
    }

    this.saveDraft(draft);
    this.updateMasterList(draft);

    return this.currentDraftId;
  }

  /**
   * Start auto-saving for current draft
   */
  startAutoSave(onAutoSave = null) {
    this.stopAutoSave(); // Clear any existing interval

    this.autoSaveInterval = setInterval(() => {
      if (this.currentDraftId) {
        // Get current form data
        const currentData = this.getCurrentFormData();
        if (currentData && Object.keys(currentData).length > 0) {
          this.updateDraft(currentData, 'auto-save');

          // Show auto-save indicator
          this.showAutoSaveIndicator();

          if (onAutoSave) {
            onAutoSave(this.currentDraftId, currentData);
          }
        }
      }
    }, this.autoSaveIntervalMs);
  }

  /**
   * Stop auto-saving
   */
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Get current form data from UI
   */
  getCurrentFormData() {
    const data = {};

    // Game creation form
    const descriptionEl = document.getElementById('game-description');
    if (descriptionEl && descriptionEl.value.trim()) {
      data.description = descriptionEl.value.trim();
    }

    // Modification form
    const modificationEl = document.getElementById('modification-prompt');
    if (modificationEl && modificationEl.value.trim()) {
      data.modification = modificationEl.value.trim();
    }

    // Publishing form
    const titleEl = document.getElementById('publish-title');
    if (titleEl && titleEl.value.trim()) {
      data.title = titleEl.value.trim();
    }

    const messageEl = document.getElementById('publish-message');
    if (messageEl && messageEl.value.trim()) {
      data.message = messageEl.value.trim();
    }

    return data;
  }

  /**
   * Restore draft data to UI forms
   */
  restoreDraftToUI(draftId = null) {
    const id = draftId || this.currentDraftId;
    if (!id) return false;

    const draft = this.loadDraft(id);
    if (!draft) return false;

    const data = draft.data;

    // Restore form fields
    const descriptionEl = document.getElementById('game-description');
    if (descriptionEl && data.description) {
      descriptionEl.value = data.description;
    }

    const modificationEl = document.getElementById('modification-prompt');
    if (modificationEl && data.modification) {
      modificationEl.value = data.modification;
    }

    const titleEl = document.getElementById('publish-title');
    if (titleEl && data.title) {
      titleEl.value = data.title;
    }

    const messageEl = document.getElementById('publish-message');
    if (messageEl && data.message) {
      messageEl.value = data.message;
    }

    this.setCurrentDraft(id);
    return true;
  }

  /**
   * Auto-restore draft when app loads
   */
  autoRestoreOnLoad() {
    if (this.currentDraftId) {
      const draft = this.loadDraft(this.currentDraftId);
      if (draft && draft.data.description) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if there are drafts available
   */
  hasDrafts() {
    const drafts = this.getAllDrafts();
    return drafts.length > 0;
  }

  /**
   * Simple undo - go back to previous description
   */
  undo() {
    if (!this.currentDraftId) return false;

    const draft = this.loadDraft(this.currentDraftId);
    if (!draft || draft.history.length < 2) return false;

    // Find the previous description state
    for (let i = draft.history.length - 2; i >= 0; i--) {
      const historyItem = draft.history[i];
      if (historyItem.action === 'create' || historyItem.action.includes('generate')) {
        const descriptionEl = document.getElementById('game-description');
        if (descriptionEl && historyItem.description) {
          descriptionEl.value = historyItem.description;
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get all saved drafts
   */
  getAllDrafts() {
    try {
      const draftList = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.DRAFT_LIST) || '[]');
      return draftList.sort((a, b) => b.updated - a.updated); // Most recent first
    } catch (error) {
      console.error('Error loading draft list:', error);
      return [];
    }
  }

  /**
   * Delete a draft
   */
  deleteDraft(draftId) {
    // Remove from storage
    localStorage.removeItem(this.STORAGE_KEYS.DRAFT_PREFIX + draftId);

    // Remove from master list
    const draftList = this.getAllDrafts().filter(d => d.id !== draftId);
    localStorage.setItem(this.STORAGE_KEYS.DRAFT_LIST, JSON.stringify(draftList));

    // Clear current draft if it was deleted
    if (this.currentDraftId === draftId) {
      this.currentDraftId = null;
      localStorage.removeItem(this.STORAGE_KEYS.CURRENT_DRAFT);
    }
  }

  /**
   * Clean up old drafts (keep last 10)
   */
  cleanupOldDrafts() {
    const drafts = this.getAllDrafts();
    const draftsToDelete = drafts.slice(10); // Keep only first 10 (most recent)

    draftsToDelete.forEach(draft => {
      this.deleteDraft(draft.id);
    });
  }

  /**
   * Show auto-save indicator in UI
   */
  showAutoSaveIndicator() {
    // Create or update auto-save indicator
    let indicator = document.getElementById('auto-save-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'auto-save-indicator';
      indicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(76, 175, 80, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 1001;
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(indicator);
    }

    const now = new Date();
    indicator.textContent = `💾 Auto-saved ${now.toLocaleTimeString()}`;
    indicator.style.opacity = '1';

    // Fade out after 2 seconds
    setTimeout(() => {
      indicator.style.opacity = '0';
    }, 2000);
  }

  /**
   * Private helper methods
   */
  generateDraftId() {
    return 'draft_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  saveDraft(draft) {
    localStorage.setItem(this.STORAGE_KEYS.DRAFT_PREFIX + draft.id, JSON.stringify(draft));
  }

  loadDraft(draftId) {
    try {
      const draftData = localStorage.getItem(this.STORAGE_KEYS.DRAFT_PREFIX + draftId);
      return draftData ? JSON.parse(draftData) : null;
    } catch (error) {
      console.error('Error loading draft:', error);
      return null;
    }
  }

  addToMasterList(draft) {
    const draftList = this.getAllDrafts();
    draftList.push({
      id: draft.id,
      created: draft.created,
      updated: draft.updated,
      title: draft.data.title || draft.data.description?.substring(0, 50) || 'Untitled Game',
      preview: draft.data.description?.substring(0, 100) || ''
    });
    localStorage.setItem(this.STORAGE_KEYS.DRAFT_LIST, JSON.stringify(draftList));
  }

  updateMasterList(draft) {
    const draftList = this.getAllDrafts();
    const index = draftList.findIndex(d => d.id === draft.id);
    if (index !== -1) {
      draftList[index] = {
        id: draft.id,
        created: draft.created,
        updated: draft.updated,
        title: draft.data.title || draft.data.description?.substring(0, 50) || 'Untitled Game',
        preview: draft.data.description?.substring(0, 100) || ''
      };
      localStorage.setItem(this.STORAGE_KEYS.DRAFT_LIST, JSON.stringify(draftList));
    }
  }

  setCurrentDraft(draftId) {
    this.currentDraftId = draftId;
    if (draftId) {
      localStorage.setItem(this.STORAGE_KEYS.CURRENT_DRAFT, draftId);
    } else {
      localStorage.removeItem(this.STORAGE_KEYS.CURRENT_DRAFT);
    }
  }
}