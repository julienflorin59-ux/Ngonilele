import React, { useState } from 'react';
import { STRING_CONFIGS, NOTE_COLORS } from '../constants';
import { Tuning } from '../types';
import { ArrowRight, Trash2 } from 'lucide-react';

interface SequencerProps {
  onInsert: (code: string) => void;
  tuning: Tuning;
}

const Sequencer: React.FC<SequencerProps> = ({ onInsert, tuning }) => {
  // Config
  const [steps, setSteps] = useState(16); // 16 steps (Binary) or 12 steps (Ternary)
  const [grid, setGrid] = useState<Record<string, boolean[]>>({});
  
  // Initialize grid if empty
  if (Object.keys(grid).length === 0) {
      const initialGrid: Record<string, boolean[]> = {};
      STRING_CONFIGS.forEach(s => {
          initialGrid[s.stringId] = Array(steps).fill(false);
      });
      setGrid(initialGrid);
  }

  const toggleStep = (stringId: string, stepIndex: number) => {
      setGrid(prev => ({
          ...prev,
          [stringId]: prev[stringId].map((val, idx) => idx === stepIndex ? !val : val)
      }));
  };

  const clearGrid = () => {
      const newGrid: Record<string, boolean[]> = {};
      STRING_CONFIGS.forEach(s => {
          newGrid[s.stringId] = Array(steps).fill(false);
      });
      setGrid(newGrid);
  };

  const changeMode = (mode: 'binary' | 'ternary') => {
      const newSteps = mode === 'binary' ? 16 : 12;
      setSteps(newSteps);
      const newGrid: Record<string, boolean[]> = {};
      STRING_CONFIGS.forEach(s => {
          newGrid[s.stringId] = Array(newSteps).fill(false);
      });
      setGrid(newGrid);
  };

  const generateCode = () => {
      // Convert Grid to Text Code
      let code = "TXT [SEQUENCEUR]\n";
      
      // We process column by column (time steps)
      for (let i = 0; i < steps; i++) {
          const activeStrings = STRING_CONFIGS.filter(s => grid[s.stringId] && grid[s.stringId][i]);
          
          // Duration symbol
          // If 16 steps (Binary 4/4), each step is usually a "Double" (3 ticks) or sixteenth note
          // If 12 steps (Ternary 12/8), each step is a "Triolet" (4 ticks)
          const symbol = steps === 16 ? '♬' : '🎶';
          
          if (activeStrings.length === 0) {
              code += `${symbol}   S\n`;
          } else {
              activeStrings.forEach((s, idx) => {
                  const prefix = idx === 0 ? symbol : '='; // Polyphony uses '='
                  // Auto fingering logic based on string
                  const finger = ['1D','2D','3D','1G','2G','3G'].includes(s.stringId) ? 'P' : 'I';
                  code += `${prefix}   ${s.stringId}   ${finger}\n`;
              });
          }
      }
      onInsert(code + "+ S"); // Add a rest at end
  };

  const getColor = (stringId: string) => {
      const note = tuning[stringId];
      if (!note) return '#ccc';
      const base = note.charAt(0).toUpperCase();
      return NOTE_COLORS[base] || '#ccc';
  };

  const sortedStrings = [
      '1D','2D','3D','4D','5D','6D',
      '1G','2G','3G','4G','5G','6G'
  ];

  return (
    <div className="flex flex-col gap-4 p-4 h-full bg-[#fdf6e3] rounded-lg shadow-inner overflow-hidden">
        
        <div className="flex justify-between items-center bg-[#f0e6dc] p-2 rounded">
            <div className="flex gap-2">
                <button 
                    onClick={() => changeMode('binary')}
                    className={`px-3 py-1 text-xs font-bold rounded ${steps === 16 ? 'bg-[#A67C52] text-white' : 'bg-[#fdf6e3] border border-[#cbb094] text-[#5d4037]'}`}
                >
                    16 Pas (Binaire)
                </button>
                <button 
                    onClick={() => changeMode('ternary')}
                    className={`px-3 py-1 text-xs font-bold rounded ${steps === 12 ? 'bg-[#A67C52] text-white' : 'bg-[#fdf6e3] border border-[#cbb094] text-[#5d4037]'}`}
                >
                    12 Pas (Ternaire)
                </button>
            </div>
            <div className="flex gap-2">
                <button onClick={clearGrid} className="p-2 text-red-600 hover:bg-[#e5c4a3] rounded" title="Effacer"><Trash2 size={16}/></button>
                <button onClick={generateCode} className="px-4 py-1 bg-green-600 text-white rounded font-bold text-sm flex items-center gap-2 hover:bg-green-700">
                    Insérer <ArrowRight size={14}/>
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-auto border border-[#A67C52]/20 rounded relative custom-scrollbar bg-[#fdf6e3]">
            <div className="flex flex-col min-w-max">
                {sortedStrings.map(sid => {
                    const conf = STRING_CONFIGS.find(s => s.stringId === sid);
                    if (!conf) return null;
                    const color = getColor(sid);
                    return (
                        <div key={sid} className="flex items-center border-b border-[#A67C52]/10 hover:bg-[#f0e6dc] h-8 transition-colors">
                            {/* Header */}
                            <div 
                                className="w-12 flex-shrink-0 text-[10px] font-bold text-center border-r border-[#A67C52]/20 h-full flex items-center justify-center text-white"
                                style={{ backgroundColor: color }}
                            >
                                {sid}
                            </div>
                            
                            {/* Grid Cells */}
                            <div className="flex">
                                {grid[sid] && grid[sid].map((active, step) => (
                                    <div 
                                        key={step}
                                        onClick={() => toggleStep(sid, step)}
                                        className={`
                                            w-8 h-8 border-r border-[#A67C52]/10 cursor-pointer flex items-center justify-center transition-all
                                            ${step % 4 === 0 ? 'border-r-[#A67C52]/30 bg-[#f0e6dc]/30' : ''}
                                            ${active ? 'opacity-100 scale-90 rounded-sm' : 'opacity-0 hover:opacity-20'}
                                        `}
                                        style={{ backgroundColor: active ? color : 'transparent' }}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${active ? 'bg-white' : 'bg-gray-400'}`}></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
                
                {/* Footer Markers */}
                <div className="flex pl-12 h-6 items-center bg-[#f0e6dc] border-t border-[#A67C52]/20">
                    {Array(steps).fill(0).map((_, i) => (
                         <div key={i} className={`w-8 text-[9px] text-center text-[#8d6e63] ${i%4===0?'font-bold text-[#5d4037]':''}`}>
                             {i+1}
                         </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};

export default Sequencer;