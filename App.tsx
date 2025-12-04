
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Square, FileText, Music, Info, Download, Keyboard, Code, Video, Grid3X3, Settings, Share2, Star, Edit3, Github, Headphones } from 'lucide-react';
import { PRESETS, NOTE_COLORS, SCALES_PRESETS, ASSETS_BASE_URL } from './constants';
import { parseTablature } from './utils/parser';
import { audioEngine } from './utils/audio';
import Visualizer, { VisualizerHandle } from './components/Visualizer';
import { VisualInput } from './components/VisualInput';
import Sequencer from './components/Sequencer';
import { Tuning } from './types';

function App() {
  // --- STATE GLOBAL ---
  const [mainTab, setMainTab] = useState<'tuning' | 'editor' | 'video' | 'audio'>('tuning');
  
  // --- STATE AUDIO / EDITOR ---
  const [code, setCode] = useState(PRESETS[0].code);
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTick, setCurrentTick] = useState(0);
  
  // Sub-tabs for Editor
  const [editorSubTab, setEditorSubTab] = useState<'editor' | 'keyboard' | 'sequencer'>('editor');
  
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
        audioEngine.setTuning(preset.tuning);
    }
  };

  const applyScale = () => {
      // Just visual feedback or specific logic if needed
      alert(`Gamme ${selectedScaleName} appliquée !`);
  };

  const playScaleDemo = () => {
      // TODO: Implement scale demo playback
      alert("Lecture de la gamme (Fonctionnalité à venir)");
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
      // Switch to editor to see the song
      if (mainTab !== 'editor') setMainTab('editor');
    }
  };

  const insertSymbol = (symbol: string) => {
    setCode(prev => {
        return prev + (prev.endsWith('\n') ? '' : '\n') + symbol;
    });
  };

  const startRecording = () => {
    if (!visualizerRef.current) return;
    const canvasStream = visualizerRef.current.getCanvasStream();
    const audioStream = audioEngine.getAudioStream();

    if (!canvasStream || !audioStream) {
        alert("Erreur lors de l'initialisation de l'enregistrement (Flux manquants).");
        return;
    }
    const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioStream.getAudioTracks()
    ]);

    const options = { mimeType: 'video/webm; codecs=vp9' };
    try {
        const recorder = new MediaRecorder(combinedStream, options);
        mediaRecorderRef.current = recorder;
        recordedChunksRef.current = [];
        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) recordedChunksRef.current.push(event.data);
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

  return (
    <div className="h-screen w-full flex bg-[#e5c4a1] text-[#5d4037] overflow-hidden font-sans">
      
      {/* === LEFT SIDEBAR === */}
      <aside className="w-64 flex-none bg-[#d0b090] border-r border-[#cbb094] flex flex-col shadow-lg z-20">
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-[#cbb094]/50">
            <h2 className="font-bold text-lg flex items-center gap-2">
                <Settings size={20} /> Réglages
            </h2>
        </div>

        <div className="p-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar flex-1">
            
            {/* BPM Control */}
            <div className="bg-[#e5c4a1]/50 p-3 rounded-lg border border-[#cbb094]">
                <label className="text-xs font-bold uppercase mb-2 block">Tempo (BPM)</label>
                <input 
                    type="number" 
                    value={bpm} 
                    onChange={(e) => setBpm(parseInt(e.target.value))} 
                    className="w-full p-2 bg-[#fdf6e3] border border-[#cbb094] rounded font-bold text-[#5d4037] focus:ring-2 focus:ring-[#A67C52] outline-none"
                />
            </div>

            {/* Playback Controls */}
            <div className="flex flex-col gap-2">
                <button
                    onClick={togglePlay}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-md font-bold text-white shadow transition-all ${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}
                >
                    {isPlaying ? <><Square size={18} fill="currentColor" /> STOP</> : <><Play size={18} fill="currentColor" /> LECTURE</>}
                </button>
            </div>

            <hr className="border-[#cbb094]" />

            {/* Song Bank */}
            <div>
                <h3 className="font-bold mb-2 flex items-center gap-2">
                    <Music size={18} /> Banque de Morceaux
                </h3>
                <div className="flex gap-1 mb-2">
                    <button className="flex-1 py-1 text-xs bg-[#A67C52] text-white rounded-l font-bold">Morceaux</button>
                    <button className="flex-1 py-1 text-xs bg-[#e5c4a1] border border-[#cbb094] rounded-r font-bold text-[#8d6e63]">Exercices</button>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-[#8d6e63]">Exercice :</label>
                    <select 
                        className="w-full p-2 text-sm bg-[#fdf6e3] border border-[#cbb094] rounded text-[#5d4037] outline-none focus:ring-2 focus:ring-[#A67C52]"
                        onChange={handlePresetChange}
                    >
                        {PRESETS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                    </select>
                    <button onClick={() => {}} className="mt-2 w-full py-2 bg-[#dcc0a3] hover:bg-[#cbb094] border border-[#bfa085] rounded text-sm font-bold text-[#5d4037] shadow-sm">
                        Charger Exercice
                    </button>
                    <p className="text-[10px] text-[#8d6e63] mt-1 text-center">⚠ Remplacera le texte actuel.</p>
                </div>
            </div>
            
            <hr className="border-[#cbb094]" />

            {/* Contribute */}
            <div>
                 <h3 className="font-bold mb-3 flex items-center gap-2">
                    <Star size={18} fill="#A67C52" className="text-[#A67C52]" /> Contribuer
                </h3>
                <div className="flex flex-col gap-2">
                    <button className="text-left px-3 py-2 bg-[#A67C52] text-white rounded text-sm font-bold shadow hover:bg-[#8d6e63] flex items-center gap-2">
                        <FileText size={14}/> Proposer une partition
                    </button>
                     <button className="text-left px-3 py-2 bg-[#A67C52] text-white rounded text-sm font-bold shadow hover:bg-[#8d6e63] flex items-center gap-2">
                        <Music size={14}/> Proposer un morceau
                    </button>
                    <button className="text-left px-3 py-2 bg-[#A67C52] text-white rounded text-sm font-bold shadow hover:bg-[#8d6e63] flex items-center gap-2">
                        <Settings size={14}/> Proposer une gamme
                    </button>
                </div>
                <button className="mt-4 w-full py-2 border border-[#A67C52] text-[#A67C52] rounded text-xs font-bold hover:bg-[#fdf6e3] flex items-center justify-center gap-2">
                    <Share2 size={12}/> Créer un lien de partage
                </button>
            </div>

        </div>
      </aside>

      {/* === MAIN CONTENT === */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
          
          {/* Top Right Actions (Absolute) */}
          <div className="absolute top-4 right-4 flex items-center gap-3 text-[#5d4037] z-50">
             <span className="text-xs font-bold">Share</span>
             <Star size={16} className="cursor-pointer hover:text-[#A67C52]" />
             <Edit3 size={16} className="cursor-pointer hover:text-[#A67C52]" />
             <Github size={16} className="cursor-pointer hover:text-[#A67C52]" />
             <span className="cursor-pointer font-bold">:</span>
          </div>

          {/* HEADER SECTION */}
          <header className="pt-10 px-10 pb-4 bg-[#e5c4a1] flex-none">
              <div className="flex items-center gap-6 mb-6">
                 {/* Logo Placeholder - Attempts to load image from github assets, falls back to Emoji */}
                 <div className="w-24 h-24 bg-[#dcc0a3] rounded-full border-4 border-[#cbb094] flex items-center justify-center shadow-inner relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-black to-transparent z-10"></div>
                    <img 
                        src={`${ASSETS_BASE_URL}texture_ngonilele_2.png`}
                        alt="Ngonilélé Logo"
                        className="w-full h-full object-cover relative z-20"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            // Show emoji fallback via CSS adjacent sibling if needed, but here simplified:
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                                const span = document.createElement('span');
                                span.innerText = '🪕';
                                span.className = 'text-4xl relative z-0';
                                parent.appendChild(span);
                            }
                        }}
                    />
                 </div>
                 
                 <div>
                     <h1 className="text-4xl font-black text-[#1a120e] mb-1 flex items-center gap-2">
                        Générateur Tablature Ngonilélé <span className="text-lg text-[#8d6e63] font-normal border border-[#8d6e63] rounded px-1 ml-2">link</span>
                     </h1>
                     <div className="flex items-center gap-3 text-sm font-medium text-[#5d4037]">
                        <span>Composez, Écoutez et Exportez.</span>
                        <span className="text-[#A67C52]">|</span>
                        <a href="#" className="flex items-center gap-1 text-[#A67C52] font-bold hover:underline">
                            <Download size={14} /> Télécharger le livret PDF Ngonilélé
                        </a>
                     </div>
                 </div>
              </div>

              {/* TABS NAVIGATION */}
              <nav className="flex gap-4 border-b border-[#cbb094]">
                  <button 
                    onClick={() => setMainTab('tuning')}
                    className={`px-4 py-2 flex items-center gap-2 border rounded-t-lg font-bold text-sm transition-all ${mainTab === 'tuning' ? 'bg-[#cbb094] border-[#cbb094] text-[#5d4037]' : 'bg-transparent border-transparent text-[#8d6e63] hover:bg-[#dcc0a3]/50'}`}
                  >
                      <Settings size={16} /> Accordage
                  </button>
                  <button 
                    onClick={() => setMainTab('editor')}
                    className={`px-4 py-2 flex items-center gap-2 border rounded-t-lg font-bold text-sm transition-all ${mainTab === 'editor' ? 'bg-[#cbb094] border-[#cbb094] text-[#5d4037]' : 'bg-transparent border-transparent text-[#8d6e63] hover:bg-[#dcc0a3]/50'}`}
                  >
                      <Edit3 size={16} /> Éditeur & Partition
                  </button>
                  <button 
                    onClick={() => setMainTab('video')}
                    className={`px-4 py-2 flex items-center gap-2 border rounded-t-lg font-bold text-sm transition-all ${mainTab === 'video' ? 'bg-[#cbb094] border-[#cbb094] text-[#5d4037]' : 'bg-transparent border-transparent text-[#8d6e63] hover:bg-[#dcc0a3]/50'}`}
                  >
                      <Video size={16} /> Vidéo (Bêta)
                  </button>
                   <button 
                    onClick={() => setMainTab('audio')}
                    className={`px-4 py-2 flex items-center gap-2 border rounded-t-lg font-bold text-sm transition-all ${mainTab === 'audio' ? 'bg-[#cbb094] border-[#cbb094] text-[#5d4037]' : 'bg-transparent border-transparent text-[#8d6e63] hover:bg-[#dcc0a3]/50'}`}
                  >
                      <Headphones size={16} /> Audio & Groove
                  </button>
              </nav>
          </header>

          {/* PAGE CONTENT CONTAINER */}
          <div className="flex-1 bg-[#e5c4a1] border-t border-[#cbb094] p-8 overflow-hidden">
              
              {/* --- TAB: ACCORDAGE --- */}
              {mainTab === 'tuning' && (
                  <div className="h-full overflow-y-auto custom-scrollbar animate-in fade-in duration-300">
                      <h2 className="text-2xl font-bold mb-6">Gamme & Accordage</h2>
                      
                      <div className="mb-8">
                          <h3 className="font-bold text-lg mb-2">1. Choisir une Gamme Préfinie</h3>
                          <label className="text-xs text-[#8d6e63] mb-1 block">Sélectionner la gamme :</label>
                          <div className="relative inline-block w-full max-w-4xl">
                            <select 
                                className="w-full p-3 bg-[#d0b090] border border-[#cbb094] rounded shadow-inner font-medium text-[#5d4037] appearance-none outline-none focus:ring-2 focus:ring-[#A67C52]"
                                value={selectedScaleName}
                                onChange={handleScaleChange}
                            >
                                {SCALES_PRESETS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-[#5d4037]">▼</div>
                          </div>
                          
                          <div className="flex gap-4 mt-4 max-w-4xl">
                              <button onClick={applyScale} className="flex-1 py-3 bg-[#A67C52] text-white font-bold rounded shadow hover:bg-[#8d6e63] transition-colors">
                                  Appliquer cette gamme
                              </button>
                              <button onClick={playScaleDemo} className="flex-1 py-3 bg-[#e5c4a1] border border-[#A67C52] text-[#5d4037] font-bold rounded shadow hover:bg-[#dcc0a3] transition-colors flex justify-center items-center gap-2">
                                  <Headphones size={18}/> Écouter la gamme
                              </button>
                          </div>
                      </div>

                      <div className="mt-12">
                          <h3 className="font-bold text-lg mb-6">Code Couleur des Notes</h3>
                          <div className="flex gap-12 flex-wrap">
                              {Object.entries(NOTE_COLORS).map(([note, color]) => (
                                  <div key={note} className="flex flex-col items-center gap-3">
                                      <div 
                                        className="w-12 h-12 rounded-full shadow-lg border-2 border-white/20" 
                                        style={{backgroundColor: color}}
                                      ></div>
                                      <span className="font-bold text-lg">{note}</span>
                                  </div>
                              ))}
                          </div>
                          <p className="text-xs text-[#8d6e63] mt-6 italic">(Les notes dièses # et bémols b gardent la couleur de leur note racine)</p>
                      </div>
                  </div>
              )}

              {/* --- TAB: EDITOR & PARTITION --- */}
              {mainTab === 'editor' && (
                  <div className="flex h-full border border-[#cbb094] rounded-lg overflow-hidden shadow-sm animate-in fade-in duration-300">
                      
                      {/* Left Sub-Panel */}
                      <div className="w-1/3 flex flex-col border-r border-[#cbb094] bg-[#dcc0a3]/30">
                          {/* Sub-Tabs */}
                          <div className="flex border-b border-[#cbb094]">
                                <button 
                                    onClick={() => setEditorSubTab('editor')}
                                    className={`flex-1 py-3 text-xs font-bold flex justify-center items-center gap-2 ${editorSubTab === 'editor' ? 'bg-[#dcc0a3] text-[#5d4037] border-b-2 border-[#A67C52]' : 'hover:bg-[#dcc0a3]/50'}`}
                                >
                                    <Code size={14} /> CODE
                                </button>
                                <button 
                                    onClick={() => setEditorSubTab('keyboard')}
                                    className={`flex-1 py-3 text-xs font-bold flex justify-center items-center gap-2 ${editorSubTab === 'keyboard' ? 'bg-[#dcc0a3] text-[#5d4037] border-b-2 border-[#A67C52]' : 'hover:bg-[#dcc0a3]/50'}`}
                                >
                                    <Keyboard size={14} /> CLAVIER
                                </button>
                                <button 
                                    onClick={() => setEditorSubTab('sequencer')}
                                    className={`flex-1 py-3 text-xs font-bold flex justify-center items-center gap-2 ${editorSubTab === 'sequencer' ? 'bg-[#dcc0a3] text-[#5d4037] border-b-2 border-[#A67C52]' : 'hover:bg-[#dcc0a3]/50'}`}
                                >
                                    <Grid3X3 size={14} /> SÉQUENCEUR
                                </button>
                          </div>

                          <div className="flex-1 relative overflow-hidden bg-[#e5c4a1]">
                                {editorSubTab === 'editor' && (
                                    <div className="absolute inset-0 flex flex-col">
                                        <div className="p-2 bg-[#dcc0a3] flex gap-2 overflow-x-auto custom-scrollbar">
                                            {['+','♪','🎶','♬','S','=','TXT','PAGE'].map(sym => (
                                                <button key={sym} onClick={() => insertSymbol(sym)} className="px-2 py-1 bg-[#fdf6e3] border border-[#cbb094] rounded text-xs font-bold text-[#5d4037] hover:bg-[#A67C52] hover:text-white">
                                                    {sym}
                                                </button>
                                            ))}
                                        </div>
                                        <textarea
                                            className="flex-1 w-full p-4 font-mono text-sm bg-[#fdf6e3] resize-none outline-none text-[#5d4037] custom-scrollbar leading-relaxed"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value)}
                                            spellCheck={false}
                                        />
                                    </div>
                                )}
                                {editorSubTab === 'keyboard' && <VisualInput onInsert={insertSymbol} tuning={currentTuning} />}
                                {editorSubTab === 'sequencer' && <Sequencer onInsert={insertSymbol} tuning={currentTuning} />}
                          </div>
                      </div>

                      {/* Right Panel: Visualizer */}
                      <div className="w-2/3 flex flex-col bg-[#e5c4a1] relative">
                            {/* Legend Bar moved inside visualizer area or kept above? Screenshot didn't show visualizer, but let's keep it clean */}
                           <div className="h-8 bg-[#dcc0a3] border-b border-[#cbb094] flex items-center px-4 justify-between text-[10px] font-bold text-[#5d4037]">
                                <span>VISUALISATION</span>
                                <span>TICK: {Math.floor(currentTick)}</span>
                           </div>
                           <div className="flex-1 relative overflow-hidden">
                                <Visualizer 
                                    ref={visualizerRef}
                                    data={parsedData} 
                                    currentTick={currentTick} 
                                    tuning={currentTuning}
                                />
                                {parsedData.length === 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="bg-[#f0e6dc]/90 p-6 rounded-xl border-2 border-[#A67C52] text-center max-w-md shadow-xl">
                                            <Info className="mx-auto mb-2 text-[#A67C52]" size={32}/>
                                            <p className="text-sm text-[#5d4037] font-bold">Sélectionnez un morceau ou utilisez les outils à gauche.</p>
                                        </div>
                                    </div>
                                )}
                           </div>
                      </div>

                  </div>
              )}

              {/* --- TABS: VIDEO / AUDIO (Placeholders for now) --- */}
              {(mainTab === 'video' || mainTab === 'audio') && (
                  <div className="h-full flex flex-col items-center justify-center text-[#8d6e63]">
                      <Info size={48} className="mb-4 opacity-50"/>
                      <h3 className="text-xl font-bold">Fonctionnalité en cours de développement</h3>
                      <p>Cette section sera disponible prochainement.</p>
                      {mainTab === 'video' && (
                          <div className="mt-8 p-6 bg-[#dcc0a3] rounded-lg text-center">
                              <p className="mb-4 font-bold text-[#5d4037]">Enregistreur Bêta</p>
                              <button
                                onClick={isRecording ? stopRecording : startRecording}
                                className={`px-6 py-3 rounded-full font-bold text-white shadow transition-all flex items-center gap-2 mx-auto ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-[#A67C52] hover:bg-[#8d6e63]'}`}
                              >
                                <Video size={20} /> {isRecording ? 'Arrêter l\'enregistrement' : 'Lancer l\'enregistrement vidéo'}
                              </button>
                          </div>
                      )}
                  </div>
              )}

          </div>
      </main>
    </div>
  );
}

export default App;
