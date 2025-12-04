import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Square, FileText, Music, Info, RefreshCcw, Download, Keyboard, Code, Video, Grid3X3, Settings } from 'lucide-react';
import { PRESETS, NOTE_COLORS, SCALES_PRESETS } from './constants';
import { parseTablature } from './utils/parser';
import { audioEngine } from './utils/audio';
import Visualizer, { VisualizerHandle } from './components/Visualizer';
import VisualInput from './components/VisualInput';
import Sequencer from './components/Sequencer';
import { Tuning } from './types';

function App() {
  const [code, setCode] = useState(PRESETS[0].code);
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTick, setCurrentTick] = useState(0);
  const [activeTab, setActiveTab] = useState<'editor' | 'keyboard' | 'sequencer'>('editor');
  
  // Tuning State
  const [selectedScaleName, setSelectedScaleName] = useState(SCALES_PRESETS[0].name);
  const [currentTuning, setCurrentTuning] = useState<Tuning>(SCALES_PRESETS[0].tuning);

  const visualizerRef = useRef<VisualizerHandle>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Parse code whenever it changes
  const parsedData = useMemo(() => parseTablature(code), [code]);

  // Handle Playback State
  useEffect(() => {
    if (isPlaying) {
      audioEngine.setNotes(parsedData);
      audioEngine.setBpm(bpm);
      audioEngine.setOnTick((tick) => setCurrentTick(tick));
      audioEngine.play().catch(err => {
        console.error("Playback failed:", err);
        setIsPlaying(false);
        setIsRecording(false);
      });
    } else {
      audioEngine.stop();
      if (isRecording) {
        stopRecording();
      }
    }
  }, [isPlaying, parsedData, bpm]);

  // Handle Tuning Change
  const handleScaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const scaleName = e.target.value;
    const preset = SCALES_PRESETS.find(s => s.name === scaleName);
    if (preset) {
        setSelectedScaleName(scaleName);
        setCurrentTuning(preset.tuning);
        // Update Audio Engine
        audioEngine.setTuning(preset.tuning);
    }
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = PRESETS.find(p => p.name === e.target.value);
    if (preset) {
      setCode(preset.code);
      setIsPlaying(false);
      setCurrentTick(0);
    }
  };

  const insertSymbol = (symbol: string) => {
    setCode(prev => {
        return prev + (prev.endsWith('\n') ? '' : '\n') + symbol;
    });
  };

  const startRecording = () => {
    if (!visualizerRef.current) return;
    
    // 1. Get Streams
    const canvasStream = visualizerRef.current.getCanvasStream();
    const audioStream = audioEngine.getAudioStream();

    if (!canvasStream || !audioStream) {
        alert("Erreur lors de l'initialisation de l'enregistrement (Flux manquants).");
        return;
    }

    // 2. Combine Streams
    const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioStream.getAudioTracks()
    ]);

    // 3. Setup Recorder
    const options = { mimeType: 'video/webm; codecs=vp9' };
    try {
        const recorder = new MediaRecorder(combinedStream, options);
        mediaRecorderRef.current = recorder;
        recordedChunksRef.current = [];

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunksRef.current.push(event.data);
            }
        };

        recorder.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'ngonilele_tab.webm';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);
            setIsRecording(false);
        };

        recorder.start();
        setIsRecording(true);
        // Auto start playback if not playing
        if (!isPlaying) togglePlay();

    } catch (e) {
        console.error("MediaRecorder error:", e);
        alert("Votre navigateur ne supporte pas l'enregistrement WebM.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
    }
    if (isPlaying) setIsPlaying(false);
  };

  // --- UI Components ---

  return (
    <div className="h-screen w-full flex flex-col bg-[#f5e6d3] text-[#5d4037]">
      {/* HEADER */}
      <header className="flex-none p-4 bg-[#fdf6e3] border-b-4 border-[#A67C52] shadow-sm flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#A67C52] rounded-full flex items-center justify-center text-white text-xl shadow-lg border-2 border-[#8d6e63]">🪕</div>
          <div>
            <h1 className="text-xl font-bold leading-tight">Générateur Tablature Ngonilélé</h1>
            <p className="text-xs text-[#8d6e63]">Composez, Écoutez et Exportez</p>
          </div>
        </div>

        {/* CONTROLS CENTER */}
        <div className="flex items-center gap-4 bg-[#f0e6dc] p-2 rounded-lg border border-[#cbb094]">
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-[#8d6e63]">BPM</span>
                <input 
                    type="number" 
                    value={bpm} 
                    onChange={(e) => setBpm(parseInt(e.target.value))} 
                    className="w-16 p-1 text-center bg-[#fdf6e3] border border-[#cbb094] rounded text-sm font-bold text-[#5d4037]"
                />
            </div>
            <div className="h-6 w-px bg-[#cbb094]"></div>
            
            <button
                onClick={togglePlay}
                className={`flex items-center gap-2 px-6 py-2 rounded-md font-bold text-white shadow transition-all ${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}
            >
                {isPlaying ? <><Square size={18} fill="currentColor" /> STOP</> : <><Play size={18} fill="currentColor" /> LECTURE</>}
            </button>

             <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex items-center gap-2 px-3 py-2 rounded-md font-bold text-sm border transition-all ${isRecording ? 'bg-red-100 text-red-600 border-red-300 animate-pulse' : 'bg-[#fdf6e3] text-[#5d4037] border-[#cbb094] hover:bg-[#e5c4a3]'}`}
                title="Enregistrer une vidéo de la performance"
            >
                <Video size={18} /> {isRecording ? 'REC...' : 'VIDÉO'}
            </button>
        </div>

        {/* RIGHT ACTIONS */}
        <div className="flex items-center gap-3">
             <div className="flex flex-col items-end">
                <label className="text-[10px] uppercase font-bold text-[#8d6e63] mb-1 flex items-center gap-1"><Settings size={10}/> Gamme</label>
                <select 
                    className="p-1 text-sm bg-[#fdf6e3] border border-[#cbb094] rounded text-[#5d4037] w-48 font-medium focus:ring-2 focus:ring-[#A67C52] outline-none"
                    value={selectedScaleName}
                    onChange={handleScaleChange}
                >
                    {SCALES_PRESETS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
             </div>
             
             <div className="h-8 w-px bg-[#cbb094]"></div>

             <div className="flex flex-col items-end">
                <label className="text-[10px] uppercase font-bold text-[#8d6e63] mb-1 flex items-center gap-1"><FileText size={10}/> Projet</label>
                <select 
                    className="p-1 text-sm bg-[#fdf6e3] border border-[#cbb094] rounded text-[#5d4037] w-48"
                    onChange={handlePresetChange}
                >
                    {PRESETS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
             </div>
        </div>
      </header>

      {/* MAIN CONTENT GRID */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANEL: EDITOR */}
        <section className="w-1/3 flex flex-col border-r border-[#cbb094] bg-[#f5e6d3]">
            {/* TABS */}
            <div className="flex border-b border-[#cbb094] bg-[#f0e6dc]">
                <button 
                    onClick={() => setActiveTab('editor')}
                    className={`flex-1 py-3 text-sm font-bold flex justify-center items-center gap-2 ${activeTab === 'editor' ? 'bg-[#fdf6e3] text-[#5d4037] border-b-2 border-[#A67C52]' : 'text-[#8d6e63] hover:bg-[#e5c4a3]'}`}
                >
                    <Code size={16} /> CODE
                </button>
                <button 
                    onClick={() => setActiveTab('keyboard')}
                    className={`flex-1 py-3 text-sm font-bold flex justify-center items-center gap-2 ${activeTab === 'keyboard' ? 'bg-[#fdf6e3] text-[#5d4037] border-b-2 border-[#A67C52]' : 'text-[#8d6e63] hover:bg-[#e5c4a3]'}`}
                >
                    <Keyboard size={16} /> CLAVIER
                </button>
                <button 
                    onClick={() => setActiveTab('sequencer')}
                    className={`flex-1 py-3 text-sm font-bold flex justify-center items-center gap-2 ${activeTab === 'sequencer' ? 'bg-[#fdf6e3] text-[#5d4037] border-b-2 border-[#A67C52]' : 'text-[#8d6e63] hover:bg-[#e5c4a3]'}`}
                >
                    <Grid3X3 size={16} /> SÉQUENCEUR
                </button>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 relative overflow-hidden bg-[#fdf6e3]">
                {activeTab === 'editor' && (
                    <div className="absolute inset-0 flex flex-col">
                        <div className="p-2 bg-[#f0e6dc] border-b border-[#cbb094] flex gap-2 overflow-x-auto custom-scrollbar">
                            {['+','♪','🎶','♬','S','=','TXT','PAGE'].map(sym => (
                                <button key={sym} onClick={() => insertSymbol(sym)} className="px-2 py-1 bg-[#fdf6e3] border border-[#cbb094] rounded text-xs font-bold hover:bg-[#A67C52] hover:text-white transition-colors">
                                    {sym}
                                </button>
                            ))}
                        </div>
                        <textarea
                            className="flex-1 w-full p-4 font-mono text-sm bg-[#fdf6e3] resize-none outline-none text-[#5d4037] custom-scrollbar leading-relaxed"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            spellCheck={false}
                            placeholder="Entrez votre tablature ici..."
                        />
                         <div className="p-2 bg-[#f0e6dc] text-[10px] text-[#8d6e63] border-t border-[#cbb094] text-center">
                            Astuce: Utilisez la syntaxe <span className="font-mono bg-[#fdf6e3] px-1 rounded">1   4G   P</span> pour une note.
                        </div>
                    </div>
                )}

                {activeTab === 'keyboard' && (
                    <div className="h-full overflow-hidden">
                        <VisualInput onInsert={insertSymbol} tuning={currentTuning} />
                    </div>
                )}

                {activeTab === 'sequencer' && (
                    <div className="h-full overflow-hidden">
                         <Sequencer onInsert={insertSymbol} tuning={currentTuning} />
                    </div>
                )}
            </div>
        </section>

        {/* RIGHT PANEL: VISUALIZER */}
        <section className="w-2/3 relative flex flex-col bg-[#fdf6e3]">
            {/* LEGEND BAR */}
            <div className="h-12 bg-[#f0e6dc] border-b border-[#cbb094] flex items-center px-4 justify-between">
                 <div className="flex items-center gap-4 text-xs font-bold text-[#5d4037]">
                    <span className="text-[#8d6e63] uppercase tracking-wider mr-2">Notes:</span>
                    {Object.entries(NOTE_COLORS).map(([note, color]) => (
                        <div key={note} className="flex items-center gap-1 bg-[#fdf6e3] px-2 py-1 rounded border border-[#cbb094]">
                            <span className="w-3 h-3 rounded-full border border-black/20" style={{backgroundColor: color}}></span>
                            <span>{note}</span>
                        </div>
                    ))}
                 </div>
                 <div className="text-[10px] text-[#8d6e63] font-mono">
                    TICK: {Math.floor(currentTick)}
                 </div>
            </div>

            {/* CANVAS CONTAINER */}
            <div className="flex-1 relative overflow-hidden">
                 <Visualizer 
                    ref={visualizerRef}
                    data={parsedData} 
                    currentTick={currentTick} 
                    tuning={currentTuning}
                 />
                 
                 {/* Floating Info Overlay if Empty */}
                 {parsedData.length === 0 && (
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                         <div className="bg-[#f0e6dc]/90 p-6 rounded-xl border-2 border-[#A67C52] text-center max-w-md shadow-xl">
                             <Info className="mx-auto mb-2 text-[#A67C52]" size={32}/>
                             <h3 className="font-bold text-lg text-[#5d4037]">Bienvenue !</h3>
                             <p className="text-sm text-[#8d6e63] mt-2">
                                Commencez par sélectionner un morceau dans "Projet" ou utilisez le Clavier/Séquenceur à gauche pour composer.
                             </p>
                             <p className="text-xs text-[#8d6e63] mt-4 italic bg-[#fdf6e3] p-2 rounded border border-[#cbb094]">
                                Info: Placez vos fichiers .mp3 dans le dossier /samples/ (ex: G3.mp3) pour un son réaliste.
                             </p>
                         </div>
                     </div>
                 )}
            </div>
        </section>

      </main>
    </div>
  );
}

export default App;