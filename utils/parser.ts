import { ParsedNote, TICKS_QUARTER, TICKS_EIGHTH, TICKS_TRIPLET, TICKS_SIXTEENTH } from '../types';

const SYMBOLS_DURATION: Record<string, number> = {
  '+': TICKS_QUARTER,
  '♪': TICKS_EIGHTH,
  '🎶': TICKS_TRIPLET,
  '♬': TICKS_SIXTEENTH
};

const AUTOMATIC_FINGERING: Record<string, string> = {
  '1G': 'P', '2G': 'P', '3G': 'P',
  '1D': 'P', '2D': 'P', '3D': 'P',
  '4G': 'I', '5G': 'I', '6G': 'I',
  '4D': 'I', '5D': 'I', '6D': 'I'
};

export const parseTablature = (text: string): ParsedNote[] => {
  const data: ParsedNote[] = [];
  let currentTick = 0;
  let lastNoteTick = 0;
  let lastNoteDuration = TICKS_QUARTER;

  if (!text) return [];

  const lines = text.trim().split('\n');

  lines.forEach((line, index) => {
    // Basic whitespace splitting
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) return;

    const col1 = parts[0]; // Duration symbol
    let thisStart = currentTick;
    let thisDuration = lastNoteDuration;

    // --- 1. Rhythm Detection ---
    if (col1 === '=') {
      // Sync with previous note start (chord or polyphony)
      thisStart = lastNoteTick;
      thisDuration = lastNoteDuration;
    } else if (/^\d+$/.test(col1)) {
      // Measure number or absolute time marker.
      // In python logic: '1' resets to 0, others behave like '+' (Noire)
      if (col1 === '1') {
          thisStart = 0;
          currentTick = 0; // Reset global cursor
      }
      thisDuration = TICKS_QUARTER;
      currentTick = thisStart + thisDuration;
    } else if (SYMBOLS_DURATION[col1]) {
      // Standard symbols (+, ♪, etc.)
      thisDuration = SYMBOLS_DURATION[col1];
      thisStart = currentTick;
      currentTick += thisDuration;
    } else {
       // Fallback: If it looks like a note definition without valid symbol, skip or treat as default?
       // Python logic defaults to NOIRE if col1 is '+' or unknown but looks like structure.
       // We'll stricter check to avoid garbage.
       if (col1 !== '+') return;
       thisDuration = TICKS_QUARTER;
       thisStart = currentTick;
       currentTick += thisDuration;
    }

    lastNoteTick = thisStart;
    lastNoteDuration = thisDuration;

    // --- 2. Content Analysis ---
    let stringCode = parts[1].toUpperCase();
    let message = '';
    
    // Special Command: TXT
    if (stringCode === 'TXT') {
      message = parts.slice(2).join(' ');
      data.push({
        id: `txt-${index}`,
        tick: thisStart,
        duration: thisDuration,
        stringId: 'TEXTE',
        message
      });
      return;
    }

    // Special Command: PAGE
    if (stringCode === 'PAGE') {
      data.push({
        id: `pg-${index}`,
        tick: thisStart,
        duration: 0,
        stringId: 'PAGE_BREAK',
        isPageBreak: true
      });
      return;
    }

    // Silence
    if (stringCode === 'S' || stringCode === 'SILENCE' || stringCode === 'SEP') {
       // Just advance time (already done above), no note object needed for audio/visual
       return;
    }

    // Normal Note
    // Determine fingering (P=Pouce, I=Index)
    let doigt = AUTOMATIC_FINGERING[stringCode]; 
    let repetition = 1;

    // Check optional 3rd column
    if (parts.length > 2) {
      const p3 = parts[2].toUpperCase();
      if (p3.startsWith('X') && /^\d+$/.test(p3.substring(1))) {
        repetition = parseInt(p3.substring(1), 10);
      } else if (p3 === 'I' || p3 === 'P') {
        doigt = p3;
      }
    }
    
    // Add Note(s) handling repetitions
    let tempCursor = thisStart;
    for (let i = 0; i < repetition; i++) {
      data.push({
        id: `note-${index}-${i}`,
        tick: tempCursor,
        duration: thisDuration,
        stringId: stringCode,
        doigt: doigt
      });

      if (i < repetition - 1) {
        tempCursor += thisDuration;
        // Update global cursor if we are repeating times
        currentTick = tempCursor + thisDuration;
      }
    }
  });

  return data.sort((a, b) => a.tick - b.tick);
};
