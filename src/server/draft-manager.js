import { randomUUID } from 'crypto';

const DRAFT_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const MAX_VERSIONS = 10;
const MAX_DRAFTS_PER_USER = 20;

export class DraftManager {
  constructor(redis) {
    this.redis = redis;
  }

  /**
   * Create a new draft with initial version
   * Uses hash for metadata and sorted set for versions (score = timestamp)
   */
  async createDraft(userId, data) {
    const draftId = randomUUID();
    const now = Date.now();

    // Extract title from game metadata if available
    let title = data.title || 'Untitled Game';
    if (data.gameData?.metadata?.title) {
      title = data.gameData.metadata.title;
    }

    const draft = {
      id: draftId,
      userId,
      title,
      description: data.description || data.gameData?.description || '',
      status: data.status || 'draft',
      currentIndex: '0',
      postId: '',
      jobId: data.jobId || '',
      generationModel: data.generationModel || '',
      createdAt: now.toString(),
      updatedAt: now.toString()
    };

    const draftKey = `draft:${userId}:${draftId}`;
    const versionsKey = `draft:${userId}:${draftId}:versions`;

    // Store draft metadata in hash
    await this.redis.hSet(draftKey, draft);
    await this.redis.expire(draftKey, DRAFT_TTL_SECONDS);

    // Store initial version in sorted set (score = timestamp, member = JSON)
    const initialVersion = {
      gameCode: data.gameData?.gameCode || '',
      description: data.gameData?.description || data.description || '',
      metadata: data.gameData?.metadata || {},
      savedAt: now
    };
    await this.redis.zAdd(versionsKey, { member: JSON.stringify(initialVersion), score: now });
    await this.redis.expire(versionsKey, DRAFT_TTL_SECONDS);

    // Add to user's draft index (sorted set with timestamp score)
    await this.redis.zAdd(`draft_index:${userId}`, {
      member: draftId,
      score: now
    });

    // Enforce max drafts limit
    await this.enforceMaxDrafts(userId);

    console.log(`Created draft ${draftId} for user ${userId}`);

    return {
      draftId,
      title,
      currentIndex: 0,
      createdAt: now
    };
  }

  /**
   * Get draft metadata and all versions
   */
  async getDraft(userId, draftId) {
    const draftKey = `draft:${userId}:${draftId}`;
    const versionsKey = `draft:${userId}:${draftId}:versions`;

    const [draft, versionsRaw] = await Promise.all([
      this.redis.hGetAll(draftKey),
      // Get all versions sorted by score (timestamp) ascending
      this.redis.zRange(versionsKey, 0, -1, { by: 'rank' })
    ]);

    if (!draft.id) return null;

    // Refresh TTL on access
    await Promise.all([
      this.redis.expire(draftKey, DRAFT_TTL_SECONDS),
      this.redis.expire(versionsKey, DRAFT_TTL_SECONDS)
    ]);

    // Parse versions from sorted set members
    const versions = versionsRaw.map(v => {
      try {
        return JSON.parse(v.member);
      } catch (e) {
        console.error('Failed to parse version:', e);
        return null;
      }
    }).filter(Boolean);

    return {
      id: draft.id,
      userId: draft.userId,
      title: draft.title,
      description: draft.description,
      status: draft.status,
      currentIndex: parseInt(draft.currentIndex),
      postId: draft.postId || null,
      jobId: draft.jobId || null,
      generationModel: draft.generationModel || null,
      createdAt: parseInt(draft.createdAt),
      updatedAt: parseInt(draft.updatedAt),
      versions
    };
  }

  /**
   * Update draft with new version history
   * Replaces entire version array and currentIndex
   */
  async updateDraft(userId, draftId, data) {
    const draftKey = `draft:${userId}:${draftId}`;
    const versionsKey = `draft:${userId}:${draftId}:versions`;

    // Verify draft exists and belongs to user
    const existing = await this.redis.hGet(draftKey, 'userId');
    if (!existing || existing !== userId) {
      throw new Error('DRAFT_NOT_FOUND');
    }

    const now = Date.now();

    // Update metadata
    const updates = {
      updatedAt: now.toString(),
      currentIndex: data.currentIndex.toString()
    };
    if (data.title) updates.title = data.title;
    if (data.status) {
      updates.status = data.status;
      // Clear jobId when transitioning to 'draft' status (generation complete)
      if (data.status === 'draft') {
        updates.jobId = '';
      }
    }

    await this.redis.hSet(draftKey, updates);

    // Replace versions in sorted set
    if (data.versions && Array.isArray(data.versions)) {
      // Enforce max versions - keep only the most recent
      const versionsToStore = data.versions.slice(-MAX_VERSIONS);

      // Delete old versions
      await this.redis.del(versionsKey);

      // Add new versions with incrementing timestamps to preserve order
      for (let i = 0; i < versionsToStore.length; i++) {
        const version = versionsToStore[i];
        const versionData = {
          ...version,
          savedAt: version.savedAt || now
        };
        // Use index as part of score to preserve order within same timestamp
        await this.redis.zAdd(versionsKey, {
          member: JSON.stringify(versionData),
          score: now + i
        });
      }
      await this.redis.expire(versionsKey, DRAFT_TTL_SECONDS);
    }

    // Refresh TTL
    await this.redis.expire(draftKey, DRAFT_TTL_SECONDS);

    // Update index score
    await this.redis.zAdd(`draft_index:${userId}`, {
      member: draftId,
      score: now
    });

    console.log(`Updated draft ${draftId} with ${data.versions?.length || 0} versions`);

    return { updatedAt: now };
  }

  /**
   * List all drafts for a user (metadata only, no versions)
   */
  async listDrafts(userId, limit = 20) {
    // Get draft IDs sorted by most recent (reverse order)
    const draftEntries = await this.redis.zRange(
      `draft_index:${userId}`,
      0, limit - 1,
      { reverse: true }
    );

    if (!draftEntries.length) return [];

    // Extract just the member (draftId) from entries
    const draftIds = draftEntries.map(entry => entry.member);

    // Fetch draft summaries
    const drafts = await Promise.all(
      draftIds.map(async (draftId) => {
        const draftKey = `draft:${userId}:${draftId}`;
        const data = await this.redis.hGetAll(draftKey);

        // Skip if draft was deleted/expired
        if (!data.id) {
          // Clean up orphaned index entry
          await this.redis.zRem(`draft_index:${userId}`, [draftId]);
          return null;
        }

        return {
          id: data.id,
          title: data.title,
          description: data.description?.substring(0, 100),
          status: data.status,
          jobId: data.jobId || null,
          generationModel: data.generationModel || null,
          createdAt: parseInt(data.createdAt),
          updatedAt: parseInt(data.updatedAt)
        };
      })
    );

    return drafts.filter(Boolean);
  }

  /**
   * Delete a draft
   */
  async deleteDraft(userId, draftId) {
    const draftKey = `draft:${userId}:${draftId}`;
    const versionsKey = `draft:${userId}:${draftId}:versions`;

    // Verify ownership
    const existing = await this.redis.hGet(draftKey, 'userId');
    if (existing && existing !== userId) {
      throw new Error('UNAUTHORIZED');
    }

    await Promise.all([
      this.redis.del(draftKey),
      this.redis.del(versionsKey),
      this.redis.zRem(`draft_index:${userId}`, [draftId])
    ]);

    console.log(`Deleted draft ${draftId}`);
    return true;
  }

  /**
   * Update draft generation status (when job completes or fails)
   */
  async updateGenerationStatus(userId, draftId, { status, jobId }) {
    const draftKey = `draft:${userId}:${draftId}`;

    const existing = await this.redis.hGet(draftKey, 'userId');
    if (!existing || existing !== userId) {
      throw new Error('DRAFT_NOT_FOUND');
    }

    const updates = {
      status,
      jobId: jobId || '',
      updatedAt: Date.now().toString()
    };

    await this.redis.hSet(draftKey, updates);
    await this.redis.expire(draftKey, DRAFT_TTL_SECONDS);

    console.log(`Draft ${draftId} generation status updated to ${status}`);
    return true;
  }

  /**
   * Mark draft as published
   */
  async markPublished(userId, draftId, postId) {
    const draftKey = `draft:${userId}:${draftId}`;

    await this.redis.hSet(draftKey, {
      status: 'published',
      postId,
      updatedAt: Date.now().toString()
    });

    console.log(`Draft ${draftId} marked as published to post ${postId}`);
    return true;
  }

  /**
   * Enforce maximum drafts per user
   * Deletes oldest drafts when limit exceeded
   */
  async enforceMaxDrafts(userId) {
    const indexKey = `draft_index:${userId}`;
    const count = await this.redis.zCard(indexKey);

    if (count > MAX_DRAFTS_PER_USER) {
      // Get oldest drafts to delete (lowest scores = oldest)
      const toDeleteEntries = await this.redis.zRange(
        indexKey,
        0, count - MAX_DRAFTS_PER_USER - 1,
        { by: 'rank' }
      );

      const toDelete = toDeleteEntries.map(entry => entry.member);

      for (const draftId of toDelete) {
        await this.deleteDraft(userId, draftId);
      }

      console.log(`Deleted ${toDelete.length} old drafts for user ${userId}`);
    }
  }
}
