import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import { getCountdownState, saveCountdownState, resetCountdownState } from '@/lib/local-timer-storage';
import type { CountdownState } from '@/lib/local-timer-storage';

function useAlarm() {
  const ctxRef = useRef<AudioContext | null>(null);
  const timeoutIds = useRef<number[]>([]);

  const stop = useCallback(() => {
    timeoutIds.current.forEach(clearTimeout);
    timeoutIds.current = [];
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }
  }, []);

  const play = useCallback(() => {
    stop();
    ctxRef.current = new AudioContext();
    const ctx = ctxRef.current;
    const beep = () => {
      if (!ctx || ctx.state === 'closed') return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    };
    beep();
    for (let i = 1; i < 10; i++) {
      const id = window.setTimeout(beep, i * 500);
      timeoutIds.current.push(id);
    }
  }, [stop]);

  useEffect(() => () => stop(), [stop]);

  return { play, stop };
}

interface Props {
  tick: number;
}

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

function calcRemaining(state: CountdownState): number {
  if (!state.isRunning || state.isPaused || state.startTime === null) {
    return state.remainingSeconds > 0 ? state.remainingSeconds : state.totalSeconds;
  }
  const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
  return Math.max(0, state.remainingSeconds - elapsed);
}

export default function CountdownPanel({ tick }: Props) {
  const [state, setState] = useState<CountdownState>(() => getCountdownState());
  const notifiedRef = useRef(false);
  const alarm = useAlarm();

  const remaining = calcRemaining(state);
  const finished = !state.isRunning && !state.isPaused && state.totalSeconds > 0 && remaining <= 0;

  useEffect(() => {
    if (finished && !notifiedRef.current) {
      notifiedRef.current = true;
      alarm.play();
      try {
        const n = new Notification('倒计时结束', { body: '设置的时间已到！' });
        setTimeout(() => n.close(), 5000);
      } catch {
        // Notification API not available
      }
    } else if (remaining > 0) {
      notifiedRef.current = false;
    }
  }, [finished, remaining, alarm]);

  const parseTimeInput = (h: string, m: string, s: string): number => {
    return (parseInt(h) || 0) * 3600 + (parseInt(m) || 0) * 60 + (parseInt(s) || 0);
  };

  const [inputH, setInputH] = useState('');
  const [inputM, setInputM] = useState('');
  const [inputS, setInputS] = useState('0');

  const handleStart = () => {
    alarm.stop();
    const st = getCountdownState();
    const total = st.totalSeconds > 0 ? st.totalSeconds : parseTimeInput(inputH, inputM, inputS);
    if (total <= 0) return;
    const now = Date.now();
    const next: CountdownState = { isRunning: true, totalSeconds: total, remainingSeconds: total, startTime: now, isPaused: false };
    saveCountdownState(next);
    setState(next);
    notifiedRef.current = false;
  };

  const handleStartWithDuration = (seconds: number) => {
    alarm.stop();
    const now = Date.now();
    const next: CountdownState = { isRunning: true, totalSeconds: seconds, remainingSeconds: seconds, startTime: now, isPaused: false };
    saveCountdownState(next);
    setState(next);
    notifiedRef.current = false;
  };

  const handlePause = () => {
    const st = getCountdownState();
    if (!st.isRunning || !st.startTime) return;
    const elapsed = Math.floor((Date.now() - st.startTime) / 1000);
    const rem = Math.max(0, st.remainingSeconds - elapsed);
    const next: CountdownState = { ...st, isRunning: false, isPaused: true, startTime: null, remainingSeconds: rem };
    saveCountdownState(next);
    setState(next);
  };

  const handleResume = () => {
    const st = getCountdownState();
    const next: CountdownState = { ...st, isRunning: true, isPaused: false, startTime: Date.now() };
    saveCountdownState(next);
    setState(next);
  };

  const handleReset = () => {
    alarm.stop();
    notifiedRef.current = false;
    resetCountdownState();
    setState(getCountdownState());
  };

  const isSet = state.totalSeconds > 0;
  const pct = state.totalSeconds > 0 ? (remaining / state.totalSeconds) * 105 : 0;

  // Win11 preset timers
  const presets = [
    { label: '1分', seconds: 60 },
    { label: '3分', seconds: 180 },
    { label: '5分', seconds: 300 },
    { label: '10分', seconds: 600 },
    { label: '25分', seconds: 1500 },
    { label: '1h', seconds: 3600 },
  ];

  if (!isSet) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 p-3 select-none" data-drag="true">
        <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider" data-drag="false">设置倒计时</div>
        <div className="flex items-center gap-1 font-mono text-lg my-1" data-drag="false">
          <input type="number" min="0" max="99" placeholder="时" value={inputH} onChange={(e) => setInputH(e.target.value)} className="w-10 bg-zinc-800/80 border border-zinc-700/60 text-white text-center rounded-md py-1 text-sm outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" data-drag="false" />
          <span className="text-zinc-600 font-bold">:</span>
          <input type="number" min="0" max="59" placeholder="分" value={inputM} onChange={(e) => setInputM(e.target.value)} className="w-10 bg-zinc-800/80 border border-zinc-700/60 text-white text-center rounded-md py-1 text-sm outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" data-drag="false" />
          <span className="text-zinc-600 font-bold">:</span>
          <input type="number" min="0" max="59" placeholder="秒" value={inputS} onChange={(e) => setInputS(e.target.value)} className="w-10 bg-zinc-800/80 border border-zinc-700/60 text-white text-center rounded-md py-1 text-sm outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" data-drag="false" />
        </div>
        
        {/* Preset chips - Win11 style */}
        <div className="flex flex-wrap justify-center gap-1 max-w-[190px] mt-0.5 mb-1.5" data-drag="false">
          {presets.map((p) => (
            <button
              key={p.seconds}
              onClick={() => handleStartWithDuration(p.seconds)}
              className="px-2 py-0.5 text-[10px] font-medium rounded bg-zinc-800 hover:bg-emerald-600/30 border border-zinc-700/50 hover:border-emerald-500/50 text-zinc-400 hover:text-emerald-400 transition-colors"
              data-drag="false"
            >
              {p.label}
            </button>
          ))}
        </div>

        <button onClick={handleStart} disabled={parseTimeInput(inputH, inputM, inputS) <= 0} className="px-5 py-1 text-xs font-bold rounded-full bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-400 disabled:text-zinc-600 disabled:bg-zinc-850/50 transition-all duration-200 active:scale-95 shadow-md shadow-emerald-950/10" data-drag="false">
          开始
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-2.5 p-3 overflow-hidden" data-drag="true">
      <div className="relative w-20 h-20 my-0.5" data-drag="false">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" data-drag="false">
          {/* Win11 thin ring design */}
          <circle cx="50" cy="50" r="46" fill="none" stroke="#27272a" strokeWidth="2" />
          <circle cx="50" cy="50" r="46" fill="none" stroke={finished ? '#ef4444' : '#10b981'} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 46}`} strokeDashoffset={`${2 * Math.PI * 46 * (1 - pct / 100)}`} className="transition-all duration-300" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center" data-drag="false">
          <span className={`font-mono text-lg font-bold ${finished ? 'text-red-400 animate-pulse' : 'text-white'}`} data-drag="false">{formatCountdown(remaining)}</span>
        </div>
      </div>

      <div className="flex items-center gap-3" data-drag="false">
        {!state.isRunning && !state.isPaused ? (
          <button onClick={handleStart} className="w-9 h-9 rounded-full bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-400 flex items-center justify-center transition-all duration-200 active:scale-95 shadow-md shadow-emerald-950/20" title="重新开始" data-drag="false">
            <RotateCcw size={15} />
          </button>
        ) : state.isPaused ? (
          <button onClick={handleResume} className="w-9 h-9 rounded-full bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-400 flex items-center justify-center transition-all duration-200 active:scale-95 shadow-md shadow-emerald-950/20" title="继续" data-drag="false">
            <Play size={16} fill="currentColor" />
          </button>
        ) : (
          <button onClick={handlePause} className="w-9 h-9 rounded-full bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 flex items-center justify-center transition-all duration-200 active:scale-95 shadow-md shadow-yellow-950/20" title="暂停" data-drag="false">
            <Pause size={16} fill="currentColor" />
          </button>
        )}
        <button onClick={handleReset} className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-all duration-200 active:scale-95" title="重置" data-drag="false">
          <Square size={14} />
        </button>
      </div>

      <button onClick={handleReset} className="text-[10px] text-zinc-500 hover:text-zinc-300 hover:underline transition-colors mt-0.5" data-drag="false">
        重新设置
      </button>
    </div>
  );
}
