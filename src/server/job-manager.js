import { randomUUID } from 'crypto';

export class JobManager {
  constructor(redis) {
    this.redis = redis;
  }

  async createJob(postId, description, userId, options = {}) {
    const jobId = randomUUID();

    const job = {
      id: jobId,
      postId,
      description,
      userId,
      model: options.model || 'gpt-5',
      status: 'queued',
      priority: String(options.priority || 0),
      createdAt: Date.now().toString()
    };

    // Add previousGame if it exists (for edit operations)
    if (options.previousGame) {
      job.previousGame = options.previousGame;
    }

    // Store job details
    await this.redis.hSet(`job:${jobId}`, job);

    // Add to queue using sorted set (timestamp as score for FIFO)
    await this.redis.zAdd('job_queue', { member: jobId, score: Date.now() });

    console.log(`Created job ${jobId} for user ${userId} with model ${job.model}`);

    return {
      jobId,
      status: 'queued',
      model: job.model,
      estimatedTime: this.getEstimatedTime(job.model)
    };
  }

  async getJob(jobId) {
    const job = await this.redis.hGetAll(`job:${jobId}`);

    if (!job.id) {
      return null;
    }

    // Parse stored JSON fields
    if (job.gameDefinition) {
      try {
        job.gameDefinition = JSON.parse(job.gameDefinition);
      } catch (e) {
        console.error(`Failed to parse gameDefinition for job ${jobId}:`, e);
      }
    }

    // Calculate progress for in-progress jobs
    if (job.status === 'in_progress' || job.status === 'polling') {
      job.progress = this.calculateProgress(job);
    }

    return job;
  }

  async updateJob(jobId, updates) {
    // Convert objects to JSON strings for Redis storage
    const processedUpdates = { ...updates };
    if (processedUpdates.gameDefinition && typeof processedUpdates.gameDefinition === 'object') {
      processedUpdates.gameDefinition = JSON.stringify(processedUpdates.gameDefinition);
    }

    await this.redis.hSet(`job:${jobId}`, processedUpdates);
    console.log(`Updated job ${jobId}:`, Object.keys(updates));
  }

  async markJobPolling(jobId, openaiResponseId) {
    await this.updateJob(jobId, {
      status: 'polling',
      openaiResponseId
    });
  }

  async markJobCompleted(jobId, gameDefinition) {
    await this.updateJob(jobId, {
      status: 'completed',
      gameDefinition,
      completedAt: Date.now().toString()
    });

    // Remove from active jobs
    await this.redis.zRem('active_jobs', [jobId]);
    console.log(`Job ${jobId} completed successfully`);
  }

  async markJobFailed(jobId, error) {
    await this.updateJob(jobId, {
      status: 'failed',
      error: error.message || error.toString(),
      completedAt: Date.now().toString()
    });

    // Remove from active jobs
    await this.redis.zRem('active_jobs', [jobId]);
    console.log(`Job ${jobId} failed:`, error.message);
  }

  calculateProgress(job) {
    const now = Date.now();
    const startTime = parseInt(job.startedAt || job.createdAt);
    const elapsed = now - startTime;

    const estimatedTotal = this.getEstimatedTime(job.model) * 1000; // Convert to ms
    const progress = Math.min(Math.floor((elapsed / estimatedTotal) * 100), 95);

    return progress;
  }

  getEstimatedTime(model) {
    // Based on testbed data: avg 165s, median 164s, 90th percentile 265s
    return 180; // seconds (gpt-5 - 3 minutes, covers ~85% of cases)
  }
}