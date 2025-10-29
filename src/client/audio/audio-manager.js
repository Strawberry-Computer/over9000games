// ============================================================================
// NES-Style Audio Manager
// Single-file audio system with slot-based sound management
// ============================================================================

// ----------------------------------------------------------------------------
// Note Frequency Calculation
// ----------------------------------------------------------------------------

const SEMITONE_RATIOS = [
  1.0000, // C
  1.0595, // C#
  1.1225, // D
  1.1892, // D#
  1.2599, // E
  1.3348, // F
  1.4142, // F#
  1.4983, // G
  1.5874, // G#
  1.6818, // A
  1.7818, // A#
  1.8877, // B
];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const C2_FREQ = 65.41;

/**
 * Convert note name to frequency (e.g., 'C4' -> 261.63 Hz)
 */
function noteToFrequency(note) {
  const match = note.match(/^([A-G]#?)(\d)$/);
  if (!match) return 440; // Default to A4

  const [, noteName, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  const semitone = NOTE_NAMES.indexOf(noteName);

  if (semitone === -1) return 440;

  const ratio = SEMITONE_RATIOS[semitone];
  const octaveMultiplier = Math.pow(2, octave - 2);

  return C2_FREQ * ratio * octaveMultiplier;
}

// ----------------------------------------------------------------------------
// Envelope Presets
// ----------------------------------------------------------------------------

const ENVELOPE_PRESETS = {
  sharp: { attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.05 },
  soft: { attack: 0.05, decay: 0.1, sustain: 0.6, release: 0.1 },
  fade: { attack: 0.02, decay: 0.3, sustain: 0.2, release: 0.2 },
  sustain: { attack: 0.01, decay: 0.02, sustain: 0.8, release: 0.1 },
};

function resolveEnvelope(envelope) {
  if (typeof envelope === 'string') {
    return ENVELOPE_PRESETS[envelope] || ENVELOPE_PRESETS.sharp;
  }
  return envelope || ENVELOPE_PRESETS.sharp;
}

// ----------------------------------------------------------------------------
// Channel Sound Generators
// ----------------------------------------------------------------------------

function playPulseSound(ctx, soundDef, destination) {
  const freq = soundDef.frequency || noteToFrequency(soundDef.note || 'A4');
  const duration = soundDef.duration || 0.2;
  const volume = soundDef.volume ?? 0.5;
  const envelope = resolveEnvelope(soundDef.envelope);

  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.value = freq;

  if (soundDef.sweep) {
    const targetFreq = soundDef.sweep.target || noteToFrequency(soundDef.sweep.targetNote || 'A4');
    const sweepTime = soundDef.sweep.time || duration;
    osc.frequency.linearRampToValueAtTime(targetFreq, now + sweepTime);
  }

  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;

  const attackTime = envelope.attack;
  const decayTime = envelope.decay;
  const sustainLevel = envelope.sustain * volume;
  const releaseTime = envelope.release;

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(volume, now + attackTime);
  gainNode.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
  gainNode.gain.setValueAtTime(sustainLevel, now + duration - releaseTime);
  gainNode.gain.linearRampToValueAtTime(0, now + duration);

  osc.connect(gainNode);
  gainNode.connect(destination);

  osc.start(now);
  osc.stop(now + duration);

  return { osc, gainNode, stopTime: now + duration };
}

function playTriangleSound(ctx, soundDef, destination) {
  const freq = soundDef.frequency || noteToFrequency(soundDef.note || 'A4');
  const duration = soundDef.duration || 0.2;
  const volume = soundDef.volume ?? 0.5;
  const envelope = resolveEnvelope(soundDef.envelope);

  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = freq;

  if (soundDef.sweep) {
    const targetFreq = soundDef.sweep.target || noteToFrequency(soundDef.sweep.targetNote || 'A4');
    const sweepTime = soundDef.sweep.time || duration;
    osc.frequency.linearRampToValueAtTime(targetFreq, now + sweepTime);
  }

  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;

  const attackTime = envelope.attack;
  const decayTime = envelope.decay;
  const sustainLevel = envelope.sustain * volume;
  const releaseTime = envelope.release;

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(volume, now + attackTime);
  gainNode.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
  gainNode.gain.setValueAtTime(sustainLevel, now + duration - releaseTime);
  gainNode.gain.linearRampToValueAtTime(0, now + duration);

  osc.connect(gainNode);
  gainNode.connect(destination);

  osc.start(now);
  osc.stop(now + duration);

  return { osc, gainNode, stopTime: now + duration };
}

function playNoiseSound(ctx, soundDef, destination) {
  const duration = soundDef.duration || 0.2;
  const volume = soundDef.volume ?? 0.5;
  const envelope = resolveEnvelope(soundDef.envelope);

  const now = ctx.currentTime;

  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (soundDef.mode === 'periodic') {
    const period = 32;
    const pattern = new Array(period);
    for (let i = 0; i < period; i++) {
      pattern[i] = Math.random() * 2 - 1;
    }
    for (let i = 0; i < bufferSize; i++) {
      data[i] = pattern[i % period];
    }
  } else {
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;

  const attackTime = envelope.attack;
  const decayTime = envelope.decay;
  const sustainLevel = envelope.sustain * volume;
  const releaseTime = envelope.release;

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(volume, now + attackTime);
  gainNode.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
  gainNode.gain.setValueAtTime(sustainLevel, now + duration - releaseTime);
  gainNode.gain.linearRampToValueAtTime(0, now + duration);

  source.connect(gainNode);
  gainNode.connect(destination);

  source.start(now);

  return { source, gainNode, stopTime: now + duration };
}

// ----------------------------------------------------------------------------
// Sound Slot Management
// ----------------------------------------------------------------------------

function createSoundSlot(slotId) {
  return {
    slotId,
    currentSoundId: null,
    activeNodes: null,
    isLooping: false,
  };
}

// ----------------------------------------------------------------------------
// AudioManager Class
// ----------------------------------------------------------------------------

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.slots = [];
    this.muted = false;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);

    for (let i = 0; i < 8; i++) {
      this.slots[i] = createSoundSlot(i);
    }

    this.initialized = true;
  }

  async resume() {
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /**
   * Synchronous one-time resume attempt for user gesture handlers.
   * Call this directly in touch/click event handlers to satisfy Safari's autoplay policy.
   * Safe to call multiple times - only attempts resume once.
   */
  tryResume() {
    if (!this.ctx) {
      // Initialize synchronously if not done yet
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);

        for (let i = 0; i < 8; i++) {
          this.slots[i] = createSoundSlot(i);
        }

        this.initialized = true;
        console.log("Audio context created synchronously on user gesture");
      } catch (error) {
        console.warn("Failed to create audio context:", error);
        return;
      }
    }

    // Resume synchronously if suspended
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        console.log("Audio context resumed on user gesture");
      }).catch(err => {
        console.warn("Audio resume failed:", err);
      });
    }
  }

  processCommands(commands) {
    if (!this.initialized || !this.ctx) return;

    const slotCommands = new Map();

    for (const cmd of commands) {
      if (cmd.type === 'sound') {
        slotCommands.set(cmd.slotId, cmd);
      } else if (cmd.type === 'audio') {
        this._processGlobalCommand(cmd);
      }
    }

    for (let i = 0; i < 8; i++) {
      const command = slotCommands.get(i);
      this._updateSlot(this.slots[i], command);
    }

    const now = this.ctx.currentTime;
    for (const slot of this.slots) {
      if (slot.activeNodes && !slot.isLooping && slot.activeNodes.stopTime <= now) {
        this._stopSlot(slot);
      }
    }
  }

  _updateSlot(slot, command) {
    if (!command || command.soundId === null) {
      this._stopSlot(slot);
      return;
    }

    // If soundId is provided, use it to detect same sound
    // Otherwise treat as one-shot that restarts each frame
    const soundId = command.soundId || `inline_${slot.slotId}`;

    if (soundId === slot.currentSoundId && this._isSlotPlaying(slot)) {
      return; // Continue playing, don't restart
    }

    this._stopSlot(slot);
    this._startSlot(slot, command, soundId);
  }

  _startSlot(slot, command, soundId) {
    if (!command.channel) {
      console.warn('Sound command missing channel:', command);
      return;
    }

    const channel = command.channel;
    let activeNodes;

    try {
      switch (channel) {
        case 'pulse1':
        case 'pulse2':
          activeNodes = playPulseSound(this.ctx, command, this.masterGain);
          break;
        case 'triangle':
          activeNodes = playTriangleSound(this.ctx, command, this.masterGain);
          break;
        case 'noise':
          activeNodes = playNoiseSound(this.ctx, command, this.masterGain);
          break;
        default:
          console.warn(`Unknown channel: ${channel}`);
          return;
      }

      slot.currentSoundId = soundId;
      slot.activeNodes = activeNodes;
      slot.isLooping = command.loop || false;
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  _stopSlot(slot) {
    if (slot.activeNodes) {
      try {
        if (slot.activeNodes.osc) slot.activeNodes.osc.stop();
        if (slot.activeNodes.source) slot.activeNodes.source.stop();
      } catch (e) {
        // Already stopped
      }
      slot.activeNodes = null;
    }
    slot.currentSoundId = null;
    slot.isLooping = false;
  }

  _isSlotPlaying(slot) {
    if (!slot.activeNodes) return false;
    if (slot.isLooping) return true;
    return slot.activeNodes.stopTime > this.ctx.currentTime;
  }

  _processGlobalCommand(cmd) {
    if (cmd.masterVolume !== undefined) {
      this.masterGain.gain.value = cmd.masterVolume;
    }
    if (cmd.mute !== undefined) {
      this.muted = cmd.mute;
      this.masterGain.gain.value = cmd.mute ? 0 : 1;
    }
  }

  cleanup() {
    for (const slot of this.slots) {
      this._stopSlot(slot);
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.initialized = false;
  }
}
