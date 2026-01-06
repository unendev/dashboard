"use client";

import { useState, useRef, useEffect } from "react";
import { useStorage, useMutation, useSelf } from "@liveblocks/react/suspense";
import { Camera, UploadCloud, Radio, RefreshCw, StopCircle, Video, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Viewport() {
  const latestIntel = useStorage((root) => root.latestIntel);
  const me = useSelf();
  const updateIntel = useMutation(({ storage }, intel) => {
    storage.set("latestIntel", intel);
  }, []);

  // UI Modes: 'live' (my screen capture) | 'intel' (shared image)
  const [mode, setMode] = useState<'live' | 'intel'>('intel');
  const [isCapturing, setIsCapturing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto-switch to INTEL mode when new intel arrives (from others)
  const lastIntelTimestamp = useRef<number>(0);
  useEffect(() => {
    if (latestIntel && latestIntel.timestamp > lastIntelTimestamp.current) {
      lastIntelTimestamp.current = latestIntel.timestamp;
      // Only switch if we're not actively capturing/broadcasting ourselves
      // or if it's our own upload (confirmation)
      if (!isCapturing || latestIntel.uploaderId === me?.id) {
        setMode('intel');
      }
    }
  }, [latestIntel, isCapturing, me?.id]);

  const startCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as MediaTrackConstraints,
        audio: false
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCapturing(true);
      setMode('live');

      // Handle stream stop (e.g. user clicks "Stop sharing" in browser UI)
      stream.getVideoTracks()[0].onended = () => {
        stopCapture();
      };
    } catch (err) {
      console.error("Error starting screen capture:", err);
    }
  };

  const stopCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
    setMode('intel');
  };

  const captureAndBroadcast = async () => {
    if (!videoRef.current || !canvasRef.current || uploading) return;

    setUploading(true);
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to Blob
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
      if (!blob) throw new Error("Failed to create image blob");

      // 1. Get OSS Signature
      const filename = `intel-${Date.now()}.jpg`;
      const signRes = await fetch(`/api/upload/oss/signature?dir=goc-temp&filename=${filename}&contentType=image/jpeg`);
      if (!signRes.ok) throw new Error("Failed to get upload signature");
      const signData = await signRes.json();

      // 2. Upload to OSS (Direct)
      const formData = new FormData();
      formData.append('key', signData.key);
      formData.append('policy', signData.policy);
      formData.append('OSSAccessKeyId', signData.accessKeyId);
      formData.append('success_action_status', '200');
      formData.append('signature', signData.signature);
      formData.append('file', blob);

      const uploadRes = await fetch(signData.endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Failed to upload to OSS");

      // 3. Get Signed URL (Crucial for Private Buckets)
      // Instead of guessing the URL, we ask the server to sign it for read access
      // Since we just uploaded it, we know the key (signData.key)
      // But we need the full URL first to extract key in the backend utility, 
      // OR we can just pass the key if we modify the backend.
      // Let's stick to the existing /api/upload/oss/sign-url which expects { url }
      // We construct a fake URL just to pass the key, or better:
      // Let's verify how sign-url works. It extracts key from URL.
      
      // Let's assume standard format to satisfy the extraction logic
      const rawUrl = `${signData.endpoint}/${signData.key}`;
      
      const signedUrlRes = await fetch('/api/upload/oss/sign-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rawUrl })
      });
      
      if (!signedUrlRes.ok) throw new Error("Failed to sign URL");
      const { signedUrl } = await signedUrlRes.json();

      // 4. Broadcast to Room
      updateIntel({
        imageUrl: signedUrl,
        uploaderId: me?.id || 'anonymous',
        uploaderName: me?.info?.name || 'Unknown Agent',
        timestamp: Date.now()
      });

    } catch (error) {
      console.error("Broadcast failed:", error);
      alert("Transmission Failed. Check console.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-900 border-l border-zinc-800 p-4 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
         <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
           <Radio className={cn("w-5 h-5", mode === 'live' && isCapturing && "animate-pulse text-red-500")} />
           VISUAL UPLINK
         </h2>
         <div className="flex gap-2">
           {isCapturing ? (
             <button 
                onClick={stopCapture}
                className="p-1.5 bg-red-900/50 text-red-400 rounded hover:bg-red-900 transition-colors"
                title="Terminate Uplink"
             >
               <StopCircle className="w-4 h-4" />
             </button>
           ) : (
             <button 
                onClick={startCapture}
                className="p-1.5 bg-emerald-900/50 text-emerald-400 rounded hover:bg-emerald-900 transition-colors"
                title="Initialize Uplink"
             >
               <Video className="w-4 h-4" />
             </button>
           )}
         </div>
      </div>

      {/* Main Viewport Area */}
      <div className="flex-1 bg-black rounded border border-zinc-800 relative overflow-hidden group flex flex-col">
        {/* Scanline Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-900/5 to-transparent opacity-20 pointer-events-none animate-scan z-10"></div>
        
        {/* Mode: LIVE FEED */}
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          className={cn(
            "w-full h-full object-contain bg-black transition-opacity duration-500",
            mode === 'live' ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
          )}
        />

        {/* Mode: INTEL DISPLAY */}
        <div className={cn(
            "w-full h-full flex flex-col items-center justify-center transition-opacity duration-500 absolute inset-0 bg-zinc-950",
            mode === 'intel' ? "opacity-100 z-0" : "opacity-0 pointer-events-none"
          )}
        >
          {latestIntel ? (
             <>
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img src={latestIntel.imageUrl} alt="Tactical Intel" className="max-w-full max-h-full object-contain" />
               <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur text-zinc-300 text-xs p-2 flex justify-between items-center z-20">
                 <span className="font-mono text-emerald-500">SRC: {latestIntel.uploaderName}</span>
                 <span className="font-mono opacity-50">{new Date(latestIntel.timestamp).toLocaleTimeString()}</span>
               </div>
             </>
          ) : (
            <div className="text-zinc-600 text-center p-8">
              <Radio className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-bold tracking-widest text-sm">NO SIGNAL</p>
              <p className="text-[10px] mt-2">Waiting for visual transmission...</p>
            </div>
          )}
        </div>

        {/* Mode Indicator Tag */}
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/80 border border-zinc-700 rounded text-[10px] font-mono tracking-wider z-20">
          {mode === 'live' ? <span className="text-red-500 flex items-center gap-1">● LIVE FEED</span> : <span className="text-cyan-500">INTEL CHANNEL</span>}
        </div>
      </div>

      {/* Control Deck */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {mode === 'live' && isCapturing ? (
          <button 
            onClick={captureAndBroadcast}
            disabled={uploading}
            className="col-span-2 bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-800 text-emerald-100 py-3 rounded transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-wait"
          >
            {uploading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <UploadCloud className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            )}
            <span className="font-bold tracking-wider text-sm">{uploading ? 'TRANSMITTING...' : 'BROADCAST INTEL'}</span>
          </button>
        ) : (
          latestIntel && (
            <button 
              onClick={() => setShowLightbox(true)}
              className="col-span-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded transition-colors flex items-center justify-center gap-2"
            >
              <Maximize2 className="w-4 h-4" />
              <span className="text-sm">EXPAND INTEL</span>
            </button>
          )
        )}
        
        {/* Hidden Canvas for Capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Lightbox Overlay */}
      {showLightbox && latestIntel && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300"
          onClick={() => setShowLightbox(false)}
        >
          <div className="absolute top-6 right-6 z-[110]">
            <button 
              onClick={() => setShowLightbox(false)}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full transition-colors border border-zinc-700 shadow-xl"
            >
              <StopCircle className="w-6 h-6 rotate-45" />
            </button>
          </div>

          <div 
            className="relative max-w-full max-h-full border border-emerald-500/30 rounded-lg overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.1)]"
            onClick={(e) => e.stopPropagation()}
          >
             {/* eslint-disable-next-line @next/next/no-img-element */}
             <img 
               src={latestIntel.imageUrl} 
               alt="Full Resolution Intel" 
               className="max-w-full max-h-[90vh] object-contain"
             />
             
             {/* Bottom Info Bar */}
             <div className="bg-zinc-900/90 border-t border-zinc-800 p-4 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-emerald-400 font-bold text-sm tracking-widest uppercase">High-Resolution Tactical Feed</span>
                  <span className="text-zinc-500 text-[10px] font-mono">ENCRYPTED UPLINK // {latestIntel.uploaderName.toUpperCase()}</span>
                </div>
                <div className="text-right">
                  <span className="text-zinc-400 text-xs font-mono">{new Date(latestIntel.timestamp).toLocaleString()}</span>
                </div>
             </div>

             {/* UI Corners */}
             <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-emerald-500 rounded-tl pointer-events-none"></div>
             <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-emerald-500 rounded-tr pointer-events-none"></div>
             <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-emerald-500 rounded-bl pointer-events-none"></div>
             <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-emerald-500 rounded-br pointer-events-none"></div>
          </div>
        </div>
      )}
    </div>
  );
}
