import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ParsedNote, Tuning } from '../types';
import { STRING_CONFIGS, NOTE_COLORS } from '../constants';

interface VisualizerProps {
  data: ParsedNote[];
  currentTick: number;
  tuning: Tuning;
}

export interface VisualizerHandle {
  getCanvasStream: () => MediaStream | null;
}

// Dimensions and constants
const NOTE_RADIUS = 7;
const STRING_SPACING = 15;
const TICK_HEIGHT = 12;
const CANVAS_PADDING_TOP = 60;
const LEFT_OFFSET = 180;
const MAX_WIDTH = 360;

const Visualizer = forwardRef<VisualizerHandle, VisualizerProps>(({ data, currentTick, tuning }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Expose canvas stream for recording
  useImperativeHandle(ref, () => ({
    getCanvasStream: () => {
      if (canvasRef.current) {
        return canvasRef.current.captureStream(30); // 30 FPS
      }
      return null;
    }
  }));

  const maxTick = data.length > 0 ? data[data.length - 1].tick + 48 : 0;
  const height = Math.max(600, maxTick * (TICK_HEIGHT / 4) + CANVAS_PADDING_TOP + 100);

  const getX = (stringId: string) => {
    const config = STRING_CONFIGS.find(s => s.stringId === stringId);
    if (!config) return LEFT_OFFSET;
    const direction = config.hand === 'G' ? -1 : 1;
    return LEFT_OFFSET + (direction * (config.index * STRING_SPACING));
  };

  const getSubColor = (stringId: string) => {
     // Retrieve color based on the actual Note in the tuning, not the String ID
     const note = tuning[stringId];
     if (!note) return '#000000';
     const baseNote = note.charAt(0).toUpperCase(); // 'C4' -> 'C'
     return NOTE_COLORS[baseNote] || '#000000';
  };

  // Auto-scroll logic (DOM level)
  useEffect(() => {
    if (containerRef.current) {
        const cursorY = CANVAS_PADDING_TOP + currentTick * (TICK_HEIGHT / 4);
        const containerHeight = containerRef.current.clientHeight || 0;
        const targetScroll = cursorY - (containerHeight / 3);
        containerRef.current.scrollTo({
            top: targetScroll,
            behavior: 'auto' // Instant scroll might be better for recording sync, but smooth looks better
        });
    }
  }, [currentTick]);

  // Main Draw Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear with BEIGE background
    ctx.clearRect(0, 0, MAX_WIDTH, height);
    ctx.fillStyle = "#fdf6e3"; // BEIGE instead of white
    ctx.fillRect(0, 0, MAX_WIDTH, height);

    // --- 1. Background Grid ---
    ctx.beginPath();
    ctx.strokeStyle = "#5d4037"; // Dark brown for central line
    ctx.lineWidth = 1.5;
    ctx.moveTo(LEFT_OFFSET, 0);
    ctx.lineTo(LEFT_OFFSET, height);
    ctx.stroke();

    // --- 2. String Guides ---
    STRING_CONFIGS.forEach(s => {
        ctx.beginPath();
        // Use the current tuning color for the guide lines too, but faint
        ctx.strokeStyle = getSubColor(s.stringId);
        ctx.globalAlpha = 0.08;
        ctx.lineWidth = 1;
        const x = getX(s.stringId);
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    });

    // --- 3. Notes ---
    data.forEach(note => {
        const y = CANVAS_PADDING_TOP + note.tick * (TICK_HEIGHT / 4);

        if (note.stringId === 'TEXTE') {
            // Box
            ctx.fillStyle = "#f0e6dc"; // Darker beige
            ctx.strokeStyle = "#A67C52";
            ctx.beginPath();
            ctx.roundRect(LEFT_OFFSET - 80, y - 12, 160, 20, 4);
            ctx.fill();
            ctx.stroke();
            // Text
            ctx.fillStyle = "#5d4037";
            ctx.font = "bold 11px monospace";
            ctx.textAlign = "center";
            ctx.fillText(note.message || "", LEFT_OFFSET, y + 4);
            return;
        }

        if (note.stringId === 'PAGE_BREAK') {
            ctx.strokeStyle = "#A67C52";
            ctx.setLineDash([8, 4]);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(20, y);
            ctx.lineTo(MAX_WIDTH - 20, y);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.fillStyle = "#A67C52";
            ctx.font = "10px sans-serif";
            ctx.textAlign = "right";
            ctx.fillText("PAGE", MAX_WIDTH - 30, y - 5);
            return;
        }

        const x = getX(note.stringId);
        const color = getSubColor(note.stringId);

        // Stem
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + (note.duration * (TICK_HEIGHT/4)));
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Head
        ctx.fillStyle = color;
        ctx.strokeStyle = "#5d4037"; // Brown border
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, NOTE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Finger
        if (note.doigt) {
            ctx.fillStyle = "white";
            ctx.font = "bold 9px Arial";
            ctx.textAlign = "center";
            ctx.fillText(note.doigt, x, y + 3.5);
        }
    });

    // --- 4. Cursor (Dynamic Playhead) ---
    const cursorY = CANVAS_PADDING_TOP + currentTick * (TICK_HEIGHT / 4);
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(0, cursorY);
    ctx.lineTo(MAX_WIDTH, cursorY);
    ctx.stroke();
    ctx.setLineDash([]);

  }, [data, currentTick, height, tuning]);

  return (
    <div ref={containerRef} className="w-full h-full overflow-y-auto bg-[#fdf6e3] relative custom-scrollbar text-center">
        <canvas 
            ref={canvasRef} 
            width={MAX_WIDTH} 
            height={height} 
            className="inline-block bg-[#fdf6e3]"
        />
    </div>
  );
});

Visualizer.displayName = 'Visualizer';
export default Visualizer;