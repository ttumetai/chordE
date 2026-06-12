import { midiToNoteName } from "./music";

const SAMPLE_BASE = "/samples";

function toSampleFileName(noteName: string): string {
  return noteName.replace("#", "s");
}

export class PianoAudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private unlocked = false;

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.15;
      this.masterGain.connect(this.audioContext.destination);
    }

    return this.audioContext;
  }

  async unlock(): Promise<void> {
    const context = this.ensureContext();
    if (context.state === "suspended") {
      await context.resume();
    }
    this.unlocked = true;
  }

  async playMidi(midi: number, durationMs = 1200): Promise<void> {
    await this.unlock();
    const sampleName = toSampleFileName(midiToNoteName(midi, "sharp"));
    const samplePlayed = await this.tryPlaySample(sampleName);

    if (!samplePlayed) {
      this.playOscillator(midi, durationMs);
    }
  }

  async playChord(midiNotes: number[], playMode: "block" | "arp" = "block"): Promise<void> {
    await this.unlock();
    if (playMode === "block") {
      midiNotes.forEach((midi) => {
        void this.playMidi(midi, 1600);
      });
      return;
    }

    midiNotes.forEach((midi, index) => {
      window.setTimeout(() => {
        void this.playMidi(midi, 1600);
      }, index * 35);
    });
  }

  private async tryPlaySample(sampleName: string): Promise<boolean> {
    if (!this.unlocked) {
      return false;
    }

    const context = this.ensureContext();
    const response = await fetch(`${SAMPLE_BASE}/${sampleName}.mp3`).catch(() => null);
    if (!response?.ok) {
      return false;
    }

    const buffer = await response.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(buffer);
    const source = context.createBufferSource();
    const gainNode = context.createGain();
    gainNode.gain.value = 0.95;
    source.buffer = audioBuffer;
    source.connect(gainNode);
    gainNode.connect(this.masterGain!);
    source.start();
    return true;
  }

  private playOscillator(midi: number, durationMs: number): void {
    const context = this.ensureContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const frequency = 440 * 2 ** ((midi - 69) / 12);

    oscillator.type = "triangle";
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(0.0001, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + durationMs / 1000);
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain!);
    oscillator.start();
    oscillator.stop(context.currentTime + durationMs / 1000 + 0.05);
  }
}

export const pianoAudio = new PianoAudioEngine();
