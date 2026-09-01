import { useState, useRef } from 'react';
import { Play, Square, Flag, RotateCcw } from 'lucide-react';
import { getStopwatchState, saveStopwatchState, resetStopwatchState } from '@/lib/local-timer-storage';
import type { StopwatchState, LapRecord } from '@/lib/local-timer-storage';

interface Props {
  tick: number;
}

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

function calcElapsed(state: StopwatchState): number {
  if (state.isRunning && state.startTime) {
    return state.elapsedMs + (Date.now() - state.startTime);
  }
  return state.elapsedMs;
}

export default function StopwatchPanel({ tick }: Props) {
  const [state, setState] = useState<StopwatchState>(() => getStopwatchState());
  const stateRef = useRef(state);
  stateRef.current = state;

  const elapsed = calcElapsed(state);

  const handleStart = () => {
    const s = getStopwatchState();
    const now = Date.now();
    let next: StopwatchState;
    if (s.laps.length > 0 && !s.isRunning) {
      next = { ...s, isRunning: true, startTime: now, laps: [] };
    } else {
      next = { ...s, isRunning: true, startTime: now };
    }
    saveStopwatchState(next);
    setState(next);
  };

  const handleStop = () => {
    const s = getStopwatchState();
    if (!s.startTime) return;
    const finalElapsed = s.elapsedMs + (Date.now() - s.startTime);
    const next = { ...s, isRunning: false, startTime: null, elapsedMs: finalElapsed };
    saveStopwatchState(next);
    setState(next);
  };

  const handleReset = () => {
    resetStopwatchState();
    setState(getStopwatchState());
  };

  const handleLap = () => {
    const s = getStopwatchState();
    if (!s.isRunning || !s.startTime) return;
    const totalMs = s.elapsedMs + (Date.now() - s.startTime);
    const prevTotal = s.laps.length > 0 ? s.laps[s.laps.length - 1].totalTime : 0;
    const lap: LapRecord = { lapNumber: s.laps.length + 1, lapTime: totalMs - prevTotal, totalTime: totalMs };
    const next = { ...s, laps: [...s.laps, lap] };
    saveStopwatchState(next);
    setState(next);
  };


  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 px-3 py-1.5 overflow-hidden" data-drag="true">
      <div className="font-mono text-3xl font-bold tracking-wider text-emerald-400 select-all" data-drag="false">
        {formatMs(elapsed)}
      </div>

      <div className="flex items-center gap-3 my-0.5" data-drag="false">
        {state.isRunning ? (
          <button
            onClick={handleLap}
            className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-all duration-200 active:scale-95"
            title="计次"
            data-drag="false"
          >
            <Flag size={15} />
          </button>
        ) : (state.elapsedMs > 0 || state.laps.length > 0) ? (
          <div className="w-9 h-9" />
        ) : null}

        {(state.elapsedMs > 0 || state.laps.length > 0 || state.isRunning) && (
          <button
            onClick={handleReset}
            className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-all duration-200 active:scale-95"
            title="重置"
            data-drag="false"
          >
            <RotateCcw size={15} />
          </button>
        )}

        {!state.isRunning ? (
          <button
            onClick={handleStart}
            className="w-9 h-9 rounded-full bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-400 flex items-center justify-center transition-all duration-200 active:scale-95 shadow-md shadow-emerald-950/20"
            title="开始"
            data-drag="false"
          >
            <Play size={16} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="w-9 h-9 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-all duration-200 active:scale-95 shadow-md shadow-red-950/20"
            title="停止"
            data-drag="false"
          >
            <Square size={15} fill="currentColor" />
          </button>
        )}
      </div>

      {state.laps.length > 0 && (
        <div className="w-full flex-1 max-h-[85px] overflow-y-auto border-t border-zinc-800/60 pt-1 mt-1 scrollbar-none custom-scrollbar" data-drag="false">
          <div className="text-[9px] text-zinc-500 mb-1 flex justify-between px-1 font-semibold uppercase tracking-wider" data-drag="false">
            <span>计次</span>
            <span>单圈</span>
            <span>累计</span>
          </div>
          {[...state.laps].reverse().map((lap) => (
            <div key={lap.lapNumber} className="flex justify-between px-1.5 py-0.5 text-[11px] font-mono text-zinc-400 even:bg-zinc-800/20 rounded" data-drag="false">
              <span className="text-zinc-600">#{lap.lapNumber}</span>
              <span>{formatMs(lap.lapTime)}</span>
              <span className="text-zinc-300 font-medium">{formatMs(lap.totalTime)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
