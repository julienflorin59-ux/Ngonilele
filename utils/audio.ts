import { ParsedNote, Tuning } from '../types';
import { BASE_TUNING } from '../constants';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private nextNoteIndex = 0;
  private startTime = 0;
  private schedulerId: number | null = null;
  private bpm = 120;
  private notes: ParsedNote[] = [];
  private onTickCallback: ((tick: number) => void) | null = null;
  private animationFrameId: number | null = null;
  private currentTuning: Tuning = BASE_TUNING;
  
  // Storage for audio buffers (samples)
  private stringBuffers: Record<string, AudioBuffer> = {};
  private samplesLoaded = false;
  
  private dest: MediaStreamAudioDestinationNode | null = null;

  constructor() {}

  public init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.dest = this.ctx.createMediaStreamDestination();
    }
  }

  /**
   * Loads sample files from the server/public folder.
   * Expects files to be named after the note (e.g., "samples/G3.mp3").
   */
  public async loadSamples() {
     if (!this.ctx) return;
     
     const uniqueNotes = Array.from(new Set(Object.values(this.currentTuning)));
     console.log("Chargement des samples...", uniqueNotes);

     const loadPromises = uniqueNotes.map(async (note) => {
        if (this.stringBuffers[note]) return;

        try {
            // Attempt to fetch custom sample
            // PATH CONVENTION: /samples/{NOTE}.mp3  (e.g. /samples/A3.mp3)
            const response = await fetch(`samples/${note}.mp3`);
            
            if (!response.ok) {
                throw new Error(`Fichier introuvable: samples/${note}.mp3`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.ctx!.decodeAudioData(arrayBuffer);
            this.stringBuffers[note] = audioBuffer;
        } catch (e) {
            console.warn(`Sample manquant pour ${note}. Utilisation du synthétiseur de secours.`);
            // Fallback to simple synthesis if user hasn't uploaded samples yet
            if (this.ctx) {
                this.stringBuffers[note] = this.generateFallbackBuffer(this.ctx, this.getNoteFreq(note));
            }
        }
     });

     await Promise.all(loadPromises);
     this.samplesLoaded = true;
     console.log("Initialisation audio terminée.");
  }

  private getNoteFreq(note: string): number {
    const noteMap: Record<string, number> = {
      'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
      'C4': 261.63, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
      'C5': 523.25, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99
    };
    return noteMap[note] || 440;
  }

  // Fallback beep if sample is missing
  private generateFallbackBuffer(ctx: AudioContext, freq: number): AudioBuffer {
     const sr = ctx.sampleRate;
     const len = sr * 1.0; // 1 second decay
     const buffer = ctx.createBuffer(1, len, sr);
     const data = buffer.getChannelData(0);
     for(let i=0; i<len; i++) {
         const t = i/sr;
         // Simple Sine with exponential decay (pluck-like envelope)
         data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-4 * t);
     }
     return buffer;
  }

  public getAudioStream(): MediaStream | null {
    if (!this.dest) this.init();
    return this.dest ? this.dest.stream : null;
  }

  public setNotes(notes: ParsedNote[]) {
    this.notes = notes.filter(n => n.stringId !== 'TEXTE' && n.stringId !== 'PAGE_BREAK');
  }

  public setBpm(bpm: number) {
    this.bpm = bpm;
  }
  
  public setTuning(tuning: Tuning) {
    this.currentTuning = tuning;
    if (this.ctx) {
        this.loadSamples();
    }
  }

  public setOnTick(cb: (tick: number) => void) {
    this.onTickCallback = cb;
  }

  public async play() {
    this.init();
    if (!this.ctx) return;

    // Ensure audio context is ready
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    // Load samples if not already done
    await this.loadSamples();
    
    this.isPlaying = true;
    this.nextNoteIndex = 0;
    // Add small delay to ensure smooth start
    this.startTime = this.ctx.currentTime + 0.1; 
    
    this.schedule();
    this.updateTickUI();
  }

  public stop() {
    this.isPlaying = false;
    if (this.schedulerId) {
      clearTimeout(this.schedulerId);
      this.schedulerId = null;
    }
    if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
    }
  }

  private schedule = () => {
    if (!this.isPlaying || !this.ctx) return;

    const lookahead = 25.0; 
    const scheduleAheadTime = 0.1; 

    while (this.nextNoteIndex < this.notes.length) {
      const note = this.notes[this.nextNoteIndex];
      const secondsPerTick = (60 / this.bpm) / 12;
      const noteTime = this.startTime + (note.tick * secondsPerTick);

      if (noteTime < this.ctx.currentTime + scheduleAheadTime) {
        this.playNote(note, noteTime);
        this.nextNoteIndex++;
      } else {
        break;
      }
    }
    
    if (this.nextNoteIndex >= this.notes.length) {
        const lastNote = this.notes[this.notes.length - 1];
        if (lastNote) {
            const secondsPerTick = (60 / this.bpm) / 12;
            const endTime = this.startTime + (lastNote.tick * secondsPerTick) + 2.0;
            if (this.ctx.currentTime > endTime) {
                this.stop();
                return;
            }
        } else {
            this.stop();
        }
    }

    this.schedulerId = window.setTimeout(this.schedule, lookahead);
  };

  private updateTickUI = () => {
    if (!this.isPlaying || !this.ctx) return;
    
    const secondsPerTick = (60 / this.bpm) / 12;
    const currentTick = (this.ctx.currentTime - this.startTime) / secondsPerTick;
    
    if (this.onTickCallback) {
        this.onTickCallback(Math.max(0, currentTick));
    }
    
    this.animationFrameId = requestAnimationFrame(this.updateTickUI);
  }

  private playNote(note: ParsedNote, time: number) {
    if (!this.ctx) return;

    const noteName = this.currentTuning[note.stringId];
    if (!noteName) return; 

    const buffer = this.stringBuffers[noteName];
    if (!buffer) return;

    // Create source from buffer (Sample Player)
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    
    // Slight humanization
    const velocity = 0.9 + Math.random() * 0.1; 
    gain.gain.value = velocity;

    source.connect(gain);
    gain.connect(this.ctx.destination);
    
    // Connect to MediaStreamDestination for recording
    if (this.dest) {
        gain.connect(this.dest);
    }

    source.start(time);
  }
}

export const audioEngine = new AudioEngine();