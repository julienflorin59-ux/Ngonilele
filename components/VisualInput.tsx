import React from 'react';
import { STRING_CONFIGS, NOTE_COLORS } from '../constants';
import { Tuning } from '../types';

interface VisualInputProps {
  onInsert: (text: string) => void;
  tuning?: Tuning;
}

export const VisualInput: React.FC<VisualInputProps> = ({ onInsert, tuning }) => {
  
  const handleNoteClick = (stringId: string, hand: string) => {
    // Determine default finger based on hand/string logic
    let finger = 'P'; // Default Pouce
    const index = parseInt(stringId.charAt(0));
    // Convention: 4,5,6 often Index
    if (index >= 4) finger = 'I';
    
    // Construct line
    // +   1G   P
    const line = `+   ${stringId}   ${finger}`;
    onInsert(line);
  };

  const getNoteName = (stringId: string) => {
      if (!tuning) return '';
      return tuning[stringId] || '';
  };

  const getColor = (stringId: string) => {
     if (!tuning) return '#ccc';
     const note = tuning[stringId];
     if (!note) return '#ccc';
     const base = note.charAt(0).toUpperCase();
     return NOTE_COLORS[base] || '#ccc';
  };

  // Group strings by hand
  const leftStrings = STRING_CONFIGS.filter(s => s.hand === 'G').sort((a,b) => b.index - a.index); // 6G to 1G
  const rightStrings = STRING_CONFIGS.filter(s => s.hand === 'D').sort((a,b) => a.index - b.index); // 1D to 6D

  return (
    <div className="flex flex-col gap-6 p-4 items-center bg-[#e5c4a1] rounded-lg h-full overflow-y-auto">
      <div className="text-sm text-center text-[#5d4037] mb-2 italic font-medium">
        Cliquez sur une corde pour ajouter une note (Noire)
      </div>

      <div className="flex gap-8">
        {/* Left Hand Cluster */}
        <div className="flex flex-col gap-2 items-center">
            <h3 className="font-bold text-[#5d4037] mb-2 border-b border-[#5d4037]">MAIN GAUCHE</h3>
            <div className="flex gap-2">
                {leftStrings.map(s => (
                    <button
                        key={s.stringId}
                        onClick={() => handleNoteClick(s.stringId, 'G')}
                        className="w-10 h-64 rounded-full relative flex flex-col items-center justify-end pb-4 hover:opacity-80 transition-transform active:scale-95 shadow-md border border-[#cbb094]"
                        style={{ backgroundColor: getColor(s.stringId) }}
                        title={`Corde ${s.stringId} (${getNoteName(s.stringId)})`}
                    >
                        <span className="text-white font-bold drop-shadow-md">{s.stringId}</span>
                        <div className="absolute top-4 text-white/70 text-xs font-mono">{getNoteName(s.stringId)}</div>
                    </button>
                ))}
            </div>
        </div>

        {/* Separator / Body representation */}
        <div className="w-4 bg-[#5d4037] rounded-full h-72 opacity-20"></div>

        {/* Right Hand Cluster */}
        <div className="flex flex-col gap-2 items-center">
            <h3 className="font-bold text-[#5d4037] mb-2 border-b border-[#5d4037]">MAIN DROITE</h3>
            <div className="flex gap-2">
                {rightStrings.map(s => (
                    <button
                        key={s.stringId}
                        onClick={() => handleNoteClick(s.stringId, 'D')}
                        className="w-10 h-64 rounded-full relative flex flex-col items-center justify-end pb-4 hover:opacity-80 transition-transform active:scale-95 shadow-md border border-[#cbb094]"
                        style={{ backgroundColor: getColor(s.stringId) }}
                        title={`Corde ${s.stringId} (${getNoteName(s.stringId)})`}
                    >
                        <span className="text-white font-bold drop-shadow-md">{s.stringId}</span>
                        <div className="absolute top-4 text-white/70 text-xs font-mono">{getNoteName(s.stringId)}</div>
                    </button>
                ))}
            </div>
        </div>

      {/* Rhythm Quick Insert */}
      <div className="grid grid-cols-4 gap-2 mt-4 w-full max-w-md">
          <button onClick={() => onInsert('+ S')} className="p-2 bg-[#fdf6e3] hover:bg-[#dcc0a3] rounded text-sm font-bold border border-[#cbb094] text-[#5d4037]">Silence (+)</button>
          <button onClick={() => onInsert('TXT Nouvelle Partie')} className="p-2 bg-[#fdf6e3] hover:bg-[#dcc0a3] rounded text-sm font-bold border border-[#cbb094] text-[#5d4037]">Texte</button>
          <button onClick={() => onInsert('PAGE')} className="p-2 bg-[#fdf6e3] hover:bg-[#dcc0a3] rounded text-sm font-bold border border-[#cbb094] text-[#5d4037]">Saut Page</button>
          <button onClick={() => onInsert('REPETER x2')} className="p-2 bg-[#fdf6e3] hover:bg-[#dcc0a3] rounded text-sm font-bold border border-[#cbb094] text-[#5d4037]">Répétition</button>
      </div>
    </div>
  );
};