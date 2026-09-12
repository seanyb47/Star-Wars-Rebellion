import { hz, leadPlays, PHRASE_BARS, type Note, type Theme } from './score';

/** How far ahead notes are written into the graph, and how often we top it up.
 *
 *  Web Audio schedules to the sample; `setInterval` does not, and a timer that
 *  fires late on a busy frame would leave a hole in the bar. So the timer only
 *  ever decides *when to write*, never when a note sounds — everything is
 *  scheduled against `ctx.currentTime` a second in advance, which is longer
 *  than any hitch this game can produce. */
const LOOKAHEAD = 1.0;
const TICK_MS = 220;

/**
 * Plays a Theme.
 *
 * Every voice is built per note and disposed by its own `stop()`, so there is
 * nothing to garbage-collect and no state to get out of step: the only thing
 * the player remembers is which bar it is on.
 */
export class ScorePlayer {
  private timer: number | null = null;
  private bar = 0;
  private nextBar = 0;
  private theme: Theme | null = null;
  private noise: AudioBuffer;

  constructor(
    private ctx: AudioContext,
    /** Dry out. */
    private out: AudioNode,
    /** Reverb send, so the theme sits in the same room as everything else. */
    private send: AudioNode,
  ) {
    this.noise = this.makeNoise();
  }

  get playing(): boolean {
    return this.timer !== null;
  }

  start(theme: Theme): void {
    this.stop();
    this.theme = theme;
    this.bar = 0;
    // A beat of air before the first note, so turning sound on does not land
    // you mid-phrase.
    this.nextBar = this.ctx.currentTime + 0.35;
    this.tick();
    this.timer = window.setInterval(this.tick, TICK_MS);
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  private tick = (): void => {
    const theme = this.theme;
    if (!theme || this.ctx.state === 'closed') return;
    const beat = 60 / theme.bpm;
    const barLength = beat * 4;
    while (this.nextBar < this.ctx.currentTime + LOOKAHEAD) {
      this.scheduleBar(theme, this.bar, this.nextBar, beat);
      this.bar += 1;
      this.nextBar += barLength;
    }
  };

  private scheduleBar(theme: Theme, bar: number, at: number, beat: number): void {
    const inPhrase = bar % PHRASE_BARS;
    const turn = Math.floor(bar / PHRASE_BARS);
    const chord = theme.chords[Math.floor(inPhrase / 2) % theme.chords.length];
    const [root, ...upper] = chord;

    // Bass on the downbeat, and again at the half if the chord is holding.
    this.bass(at, root, beat * 3.6);
    if (inPhrase % 2 === 1) this.bass(at + beat * 2, root, beat * 1.8, 0.6);

    // The pad arrives with the chord and holds both its bars.
    if (inPhrase % 2 === 0) this.pad(theme, at, upper, beat * 8);

    for (const [offset, tone] of theme.pluck) {
      // Indices past the chord wrap up an octave rather than run out.
      const midi = upper[tone % upper.length] + 12 * Math.floor(tone / upper.length);
      this.pluck(at + offset * beat, midi, offset === 0 ? 1 : 0.72, beat);
    }

    for (const [offset, force] of theme.drum) {
      this.drum(at + offset * beat, force);
    }

    if (leadPlays(turn)) {
      for (const note of theme.melody[inPhrase] ?? []) {
        this.lead(theme, at, note, beat);
      }
    }
  }

  /** Low, round and slightly soft on the attack: a bowed string, not a pluck. */
  private bass(at: number, midi: number, length: number, level = 1): void {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = hz(midi);
    const body = ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.value = hz(midi);
    body.detune.value = 4;
    const bodyGain = ctx.createGain();
    bodyGain.gain.value = 0.35;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.2 * level, at + 0.09);
    gain.gain.setTargetAtTime(0.13 * level, at + 0.09, 0.5);
    gain.gain.setTargetAtTime(0, at + length, 0.18);

    osc.connect(gain);
    body.connect(bodyGain);
    bodyGain.connect(gain);
    gain.connect(this.out);
    osc.start(at);
    body.start(at);
    osc.stop(at + length + 1.2);
    body.stop(at + length + 1.2);
  }

  /** The chord itself, well back and behind a filter. */
  private pad(theme: Theme, at: number, midis: number[], length: number): void {
    const ctx = this.ctx;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = theme.padCutoff;
    filter.Q.value = 0.4;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.075, at + 1.1);
    gain.gain.setValueAtTime(0.075, at + length - 1.4);
    gain.gain.linearRampToValueAtTime(0, at + length);
    filter.connect(gain);
    gain.connect(this.out);
    gain.connect(this.send);

    for (const [index, midi] of midis.entries()) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = hz(midi);
      osc.detune.value = (index - 1) * 6;
      const voice = ctx.createGain();
      voice.gain.value = 1 / midis.length;
      osc.connect(voice);
      voice.connect(filter);
      osc.start(at);
      osc.stop(at + length + 0.2);
    }
  }

  /**
   * The plucked instrument, and the one doing most of the work.
   *
   * A pad and a bass are a texture; it is the plucked note with a hard start
   * and a long decay that makes an ear hear a player rather than a synthesiser.
   * Two voices a few cents apart, because one is dead and three is a chorus.
   */
  private pluck(at: number, midi: number, level: number, beat: number): void {
    const ctx = this.ctx;
    // The decay is set by the tempo, not fixed. At a fixed 1.5 seconds the
    // Crown's 56bpm left every note still ringing when the next was struck, and
    // the pulse measured almost flat: an onset you cannot hear the gap before
    // is not an onset. Ringing a beat's length keeps the tread audible without
    // making it staccato.
    const decay = Math.min(1.55, Math.max(0.55, beat * 0.95));
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.085 * level, at + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + decay);

    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.setValueAtTime(3200, at);
    tone.frequency.exponentialRampToValueAtTime(900, at + decay * 0.5);
    tone.Q.value = 0.6;

    for (const cents of [-5, 6]) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = hz(midi);
      osc.detune.value = cents;
      osc.connect(tone);
      osc.start(at);
      osc.stop(at + decay + 0.2);
    }
    tone.connect(gain);
    gain.connect(this.out);
    gain.connect(this.send);
  }

  /** The tune. Sine with a little of the octave in it, and a slow vibrato. */
  private lead(theme: Theme, barAt: number, note: Note, beat: number): void {
    const ctx = this.ctx;
    const [offset, midi, beats] = note;
    const at = barAt + offset * beat;
    const length = beats * beat;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.09, at + 0.11);
    gain.gain.setValueAtTime(0.09, at + Math.max(0.14, length - 0.3));
    gain.gain.linearRampToValueAtTime(0, at + length);
    gain.connect(this.out);
    gain.connect(this.send);

    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 5.2;
    const depth = ctx.createGain();
    // Held notes get the vibrato; short ones would only sound seasick.
    depth.gain.setValueAtTime(0, at);
    depth.gain.linearRampToValueAtTime(length > beat ? 6 : 0, at + length * 0.55);
    vibrato.connect(depth);
    vibrato.start(at);
    vibrato.stop(at + length + 0.2);

    for (const [harmonic, level] of [
      [1, 1],
      [2, theme.leadEdge],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = hz(midi) * harmonic;
      depth.connect(osc.detune);
      const voice = ctx.createGain();
      voice.gain.value = level;
      osc.connect(voice);
      voice.connect(gain);
      osc.start(at);
      osc.stop(at + length + 0.2);
    }
  }

  /** A frame drum: a soft pitched thump with a scrape of skin on the front. */
  private drum(at: number, force: number): void {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(86, at);
    osc.frequency.exponentialRampToValueAtTime(44, at + 0.16);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.15 * force, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.42);
    osc.connect(gain);
    gain.connect(this.out);
    osc.start(at);
    osc.stop(at + 0.5);

    const skin = ctx.createBufferSource();
    skin.buffer = this.noise;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1900;
    band.Q.value = 0.9;
    const skinGain = ctx.createGain();
    skinGain.gain.setValueAtTime(0.035 * force, at);
    skinGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
    skin.connect(band);
    band.connect(skinGain);
    skinGain.connect(this.out);
    skin.start(at);
    skin.stop(at + 0.12);
  }

  private makeNoise(): AudioBuffer {
    const ctx = this.ctx;
    const length = Math.floor(ctx.sampleRate * 0.25);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
}
