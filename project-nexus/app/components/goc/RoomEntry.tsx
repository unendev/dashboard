"use client";

import { useState, useEffect } from "react";
import { Room } from "./Room";
import { ArrowRight, User } from "lucide-react";

interface RoomEntryProps {
  roomId: string;
  initialUserName?: string;
  children: React.ReactNode;
}

export function RoomEntry({ roomId, initialUserName, children }: RoomEntryProps) {
  const [userName, setUserName] = useState(initialUserName || "");
  const [isEntered, setIsEntered] = useState(!!initialUserName);
  const [isChecking, setIsChecking] = useState(!initialUserName); // Start checking only if no URL param

  // Auto-load from localStorage and Auto-Enter
  useEffect(() => {
    if (!initialUserName) {
      const saved = localStorage.getItem("nexus_codename");
      if (saved) {
        setUserName(saved);
        setIsEntered(true);
      }
      setIsChecking(false); // Check done
    }
  }, [initialUserName]);

  const handleEnter = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      localStorage.setItem("nexus_codename", userName.trim());
      setIsEntered(true);
    }
  };

  if (isEntered) {
    return (
      <Room roomId={roomId} userName={userName}>
        {children}
      </Room>
    );
  }

  if (isChecking) {
    return <div className="h-screen w-full bg-[#0a0a0a] flex items-center justify-center text-zinc-500 font-mono">INITIALIZING...</div>;
  }

  return (
    <div className="h-screen w-full bg-[#0a0a0a] flex items-center justify-center font-mono text-zinc-100">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20 pointer-events-none" />
      
      <div className="z-10 w-full max-w-md p-8 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl relative overflow-hidden">
        {/* Scanline */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#D583F0]/5 to-transparent opacity-20 pointer-events-none animate-scan" />

        <div className="text-center mb-8">
          <div className="inline-block p-3 rounded-full bg-zinc-800 mb-4 border border-zinc-700">
            <User className="w-8 h-8 text-[#D583F0]" />
          </div>
          <h1 className="text-2xl font-bold tracking-widest mb-2">IDENTITY CHECK</h1>
          <p className="text-zinc-500 text-sm">Game Operations Center // Nexus AI</p>
        </div>

        <form onSubmit={handleEnter} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="codename" className="text-xs uppercase tracking-wider text-zinc-400 font-semibold ml-1">
              Enter Codename
            </label>
            <input
              id="codename"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="e.g. Commander Shepard"
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-zinc-100 focus:outline-none focus:border-[#D583F0] focus:ring-1 focus:ring-[#D583F0] transition-all placeholder:text-zinc-700"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={!userName.trim()}
            className="w-full bg-[#D583F0] hover:bg-[#c06ce0] text-black font-bold py-3 rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6 group"
          >
            INITIALIZE UPLINK
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-6 text-center">
           <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
             Secure Connection • E2E Encrypted • Low Latency
           </p>
        </div>
      </div>
    </div>
  );
}
