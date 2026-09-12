import { BED, type BedVoice } from './bed';
import type { EventKind } from '../sim';

/**
 * All the game's sound, synthesised in the browser.
 *
 * Nothing is downloaded: the bed is oscillators and filtered noise, the
 * stingers are short envelopes on tuned tones, and the reverb is an impulse
 * response generated from decaying noise at startup. That keeps the whole
 * game installable and playable with no signal, which a music file would end.
 *
 * The context is only created on a user gesture, because mobile browsers will
 * not start audio otherwise, and it is suspended whenever the game is not
 * running so it costs no battery in the background.
 */
import { findLoop, hasMusic, introUrl, themeUrl } from './music';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private music: AudioBufferSourceNode | null = null;
  private musicFor: string | null = null;
  private musicToken = 0;
  private reverb: ConvolverNode | null = null;
  private wet: GainNode | null = null;
  private bedGain: GainNode | null = null;
  private voices: OscillatorNode[] = [];
  private voiceGains: GainNode[] = [];
  private filter: BiquadFilterNode | null = null;
  private noiseGain: GainNode | null = null;
  private swellLfo: OscillatorNode | null = null;
  private bellTimer: number | null = null;
  private driftTimer: number | null = null;
  private chord = 0;
  private readonly current: BedVoice = BED;
  /** Extra dissonance layered on while islands of yours are in revolt. */
  private unrest = 0;

  get running(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  /** Must be called from inside a real user gesture on mobile. */
  async start(): Promise<void> {
    if (!this.ctx) this.build();
    await this.ctx?.resume();
    this.scheduleBell();
    this.scheduleDrift();
  }

  async suspend(): Promise<void> {
    if (this.bellTimer !== null) {
      window.clearTimeout(this.bellTimer);
      this.bellTimer = null;
    }
    if (this.driftTimer !== null) {
      window.clearTimeout(this.driftTimer);
      this.driftTimer = null;
    }
    await this.ctx?.suspend();
  }

  stop(): void {
    if (this.bellTimer !== null) window.clearTimeout(this.bellTimer);
    this.bellTimer = null;
    if (this.driftTimer !== null) window.clearTimeout(this.driftTimer);
    this.driftTimer = null;
    this.musicToken++;
    try {
      this.music?.stop();
    } catch {
      /* already finished */
    }
    this.music = null;
    this.musicFor = null;
    this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.voices = [];
    this.voiceGains = [];
  }

  private build(): void {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(ctx.destination);

    // Music sits beside the bed rather than through the reverb: it arrives
    // already mixed, and putting a finished recording into a synthetic hall
    // only makes it sound like it is playing in the next room.
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0;
    this.musicGain.connect(this.master);

    // Reverb from decaying noise: a hall without a file to fetch.
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(this.current.tail);
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.5;
    this.reverb.connect(this.wet);
    this.wet.connect(this.master);

    this.bedGain = ctx.createGain();
    this.bedGain.gain.value = 0;
    this.bedGain.connect(this.master);
    this.bedGain.connect(this.reverb);

    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = this.current.cutoff;
    this.filter.Q.value = 0.7;
    this.filter.connect(this.bedGain);

    // The drone: one oscillator per interval, slightly out of tune with itself.
    for (const [index, ratio] of this.current.intervals.entries()) {
      const osc = ctx.createOscillator();
      osc.type = index === 0 ? 'sine' : 'triangle';
      osc.frequency.value = this.current.root * ratio;
      osc.detune.value = (index - 1) * this.current.detune;
      const gain = ctx.createGain();
      gain.gain.value = this.current.levels[index] ?? 0.3 / (index + 1);
      osc.connect(gain);
      gain.connect(this.filter);
      osc.start();
      this.voices.push(osc);
      this.voiceGains.push(gain);
    }

    // The sea itself: noise under a slow swell. Two bands rather than one —
    // the low one is the swell moving under the hull, the quieter high one is
    // the break of it, and without that second band the water reads as a
    // rumble instead of as water.
    const noise = ctx.createBufferSource();
    noise.buffer = this.noise(4);
    noise.loop = true;
    const noiseBand = ctx.createBiquadFilter();
    noiseBand.type = 'bandpass';
    noiseBand.frequency.value = 380;
    noiseBand.Q.value = 0.6;
    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = this.current.swell * 0.34;
    noise.connect(noiseBand);
    noiseBand.connect(this.noiseGain);
    this.noiseGain.connect(this.bedGain);

    const surfBand = ctx.createBiquadFilter();
    surfBand.type = 'bandpass';
    surfBand.frequency.value = 1400;
    surfBand.Q.value = 0.5;
    const surfGain = ctx.createGain();
    surfGain.gain.value = this.current.swell * 0.05;
    noise.connect(surfBand);
    surfBand.connect(surfGain);
    surfGain.connect(this.bedGain);
    noise.start();

    // A long slow rise and fall, so the bed breathes rather than sits.
    this.swellLfo = ctx.createOscillator();
    this.swellLfo.frequency.value = 0.05;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = this.current.swell * 0.2;
    this.swellLfo.connect(lfoDepth);
    lfoDepth.connect(this.noiseGain.gain);
    this.swellLfo.start();

    // Fade the bed up rather than punching in.
    this.bedGain.gain.setTargetAtTime(0.5, ctx.currentTime, 2);
  }

  /**
   * Play a side's theme, if a file for it exists.
   *
   * Safe to call every render: the same faction twice is a no-op, and a
   * different one cross-fades. Everything is guarded on a token so a slow
   * decode that finishes after the player has switched sides is discarded
   * rather than starting a second track over the first.
   *
   * The synthesised bed ducks while music plays instead of stopping. It is the
   * sea and the rigging; the score sits on top of it the way it would in a
   * film, and cutting it entirely made the game sound like a menu.
   */
  async setTheme(faction: string): Promise<void> {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain || !hasMusic()) return;
    if (this.musicFor === faction) return;
    const url = themeUrl(faction);
    if (!url) return;
    this.musicFor = faction;
    const token = ++this.musicToken;

    const fadeOut = this.music;
    if (fadeOut) {
      this.musicGain.gain.setTargetAtTime(0, ctx.currentTime, 1.2);
      window.setTimeout(() => {
        try {
          fadeOut.stop();
        } catch {
          /* already finished */
        }
      }, 4000);
    }

    const load = async (u: string) => ctx.decodeAudioData(await (await fetch(u)).arrayBuffer());
    let buffer: AudioBuffer;
    try {
      buffer = await load(url);
    } catch {
      this.musicFor = null;
      return;
    }
    if (token !== this.musicToken || !this.ctx) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const loop = findLoop(buffer);
    if (loop) {
      source.loopStart = loop.start;
      source.loopEnd = loop.end;
    }
    source.connect(this.musicGain);

    // An intro, where one was supplied: play it once and let the loop come in
    // underneath as it ends, so the join is a crossfade rather than a cut.
    const intro = introUrl(faction);
    let startAt = ctx.currentTime + 0.05;
    if (intro) {
      try {
        const introBuffer = await load(intro);
        if (token !== this.musicToken) return;
        const head = ctx.createBufferSource();
        head.buffer = introBuffer;
        head.connect(this.musicGain);
        head.start(startAt);
        startAt += Math.max(0, introBuffer.duration - 1.5);
      } catch {
        /* no intro, no matter */
      }
    }

    source.start(startAt, loop ? loop.start : 0);
    this.music = source;
    this.musicGain.gain.setTargetAtTime(0.55, ctx.currentTime, 2.5);
    // Duck the bed under the score.
    this.bedGain?.gain.setTargetAtTime(0.18, ctx.currentTime, 2.5);
  }

  /** Islands in revolt pull the bed down and sour it. */
  setUnrest(fraction: number): void {
    this.unrest = Math.max(0, Math.min(1, fraction));
    const ctx = this.ctx;
    if (!ctx || !this.filter) return;
    this.filter.frequency.setTargetAtTime(
      this.current.cutoff * (1 - this.unrest * 0.45),
      ctx.currentTime,
      3,
    );
  }

  /** A short sound for something that just happened. */
  play(kind: EventKind): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.master || !this.reverb) return;
    const now = ctx.currentTime;

    switch (kind) {
      case 'flip':
        // Two rising notes: something came over to somebody.
        this.ping(now, 587, 0.5, 0.16);
        this.ping(now + 0.14, 880, 0.7, 0.14);
        break;
      case 'mutiny':
        this.thud(now, 70, 0.9);
        this.ping(now + 0.05, this.current.root * 1.0595, 0.6, 0.22, 'sawtooth');
        break;
      case 'order':
        this.ping(now, 784, 0.45, 0.1);
        break;
      case 'mission':
        this.ping(now, 659, 0.3, 0.09);
        this.ping(now + 0.11, 659, 0.22, 0.09);
        break;
      case 'loss':
        this.thud(now, 96, 0.5);
        break;
      case 'war':
        [1, 1.5, 2].forEach((ratio, i) =>
          this.ping(now + i * 0.18, this.current.root * 2 * ratio, 0.5, 0.9),
        );
        break;
    }
  }

  private ping(
    at: number,
    freq: number,
    level: number,
    length: number,
    type: OscillatorType = 'sine',
  ): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(level * 0.28, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(gain);
    gain.connect(this.master!);
    gain.connect(this.reverb!);
    osc.start(at);
    osc.stop(at + length + 0.05);
  }

  private thud(at: number, freq: number, level: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, at);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.55, at + 0.4);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(level * 0.34, at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.55);
    osc.connect(gain);
    gain.connect(this.master!);
    osc.start(at);
    osc.stop(at + 0.6);
  }

  /** A bell out of the dark, at irregular intervals, forever. */
  private scheduleBell(): void {
    if (this.bellTimer !== null) window.clearTimeout(this.bellTimer);
    const mean = this.current.bellEvery * 1000;
    const wait = mean * (0.55 + Math.random() * 0.9);
    this.bellTimer = window.setTimeout(() => {
      if (this.ctx?.state === 'running') {
        this.ping(this.ctx.currentTime, this.current.bell, 0.22, 2.6, 'triangle');
      }
      this.scheduleBell();
    }, wait);
  }

  /**
   * Move the upper two voices to a new consonant position, very slowly.
   *
   * `setTargetAtTime` rather than a ramp, because a ramp arrives at a moment
   * and an exponential approach never quite does: the chord is simply somewhere
   * else the next time you listen for it.
   */
  private scheduleDrift(): void {
    if (this.driftTimer !== null) window.clearTimeout(this.driftTimer);
    const mean = this.current.driftEvery * 1000;
    const wait = mean * (0.7 + Math.random() * 0.7);
    this.driftTimer = window.setTimeout(() => {
      const ctx = this.ctx;
      const chords = this.current.chords;
      if (ctx?.state === 'running' && chords.length > 1 && this.voices.length >= 3) {
        // Anywhere but where we already are.
        let next = this.chord;
        while (next === this.chord) next = Math.floor(Math.random() * chords.length);
        this.chord = next;
        const glide = this.current.driftGlide / 3;
        for (const [step, ratio] of chords[next].entries()) {
          this.voices[step + 1]?.frequency.setTargetAtTime(
            this.current.root * ratio,
            ctx.currentTime,
            glide,
          );
        }
      }
      this.scheduleDrift();
    }, wait);
  }

  /** Decaying noise, which convolves into a plausible hall. */
  private impulse(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.6;
      }
    }
    return buffer;
  }

  private noise(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      // Brown-ish noise: closer to water than white noise's hiss.
      last = (last + (Math.random() * 2 - 1) * 0.08) * 0.98;
      data[i] = last;
    }
    return buffer;
  }
}
