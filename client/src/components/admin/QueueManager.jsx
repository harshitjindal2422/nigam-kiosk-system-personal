import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { getBackendBaseUrl } from '../../utils/urlHelper.js';
import { Users, Volume2, SkipForward, RotateCcw } from 'lucide-react';

export default function QueueManager() {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState('---');
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(getBackendBaseUrl(), {
      withCredentials: true,
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to socket.io server');
      socketRef.current.emit('fetchQueue');
    });

    socketRef.current.on('queueUpdated', (data) => {
      setQueue(data.queue || []);
      setCurrent(data.current || '---');
    });

    socketRef.current.on('queueChangeBroadcast', () => {
      socketRef.current.emit('fetchQueue');
    });

    socketRef.current.on('playAnnouncement', (tokenStr) => {
      playVoiceAnnouncement(tokenStr);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const playVoiceAnnouncement = (tokenStr) => {
    if (tokenStr === '---') return;
    const synth = window.speechSynthesis;
    if (synth) {
      synth.cancel();
      
      const cleanToken = tokenStr.replace('-', ' ');
      const msg = `टोकन नंबर ${cleanToken}, कृपया काउंटर पर आएं।`;
      
      const utterance = new SpeechSynthesisUtterance(msg);
      utterance.lang = 'hi-IN';
      utterance.rate = 0.85;
      
      const voices = synth.getVoices();
      const hindiVoice = voices.find(v => v.lang === 'hi-IN' || v.lang.startsWith('hi'));
      if (hindiVoice) {
        utterance.voice = hindiVoice;
      }
      
      synth.speak(utterance);
    }
  };

  const handleCallNext = () => {
    socketRef.current.emit('callNext');
  };

  const handleAnnounce = () => {
    socketRef.current.emit('announceToken', current);
  };

  const handleReset = () => {
    if (window.confirm("WARNING: Are you sure you want to clear the entire queue and reset token counters?")) {
      socketRef.current.emit('resetQueue');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 h-full flex flex-col font-rajdhani">
      <div className="flex items-center justify-between mb-8 border-b pb-4">
        <div className="flex items-center gap-3 text-navy">
          <Users className="w-8 h-8 text-saffron" />
          <h2 className="text-2xl font-bold m-0" style={{ fontFamily: "'Tiro Devanagari Hindi', serif" }}>
            कतार प्रबंधन (Queue Management)
          </h2>
        </div>
      </div>

      <div className="flex gap-8 flex-1">
        {/* Left Side: Controls & Current Token */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="bg-slate-100 p-8 rounded-2xl text-center border border-slate-200">
            <h2 className="m-0 text-slate-500 font-bold uppercase tracking-widest text-sm" style={{ fontFamily: "'Tiro Devanagari Hindi', serif" }}>
              वर्तमान में सेवारत (Currently Serving)
            </h2>
            <div className="text-7xl font-bold text-saffron mt-4 tracking-tighter">{current}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={handleCallNext}
              className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-xl font-bold text-xl flex flex-col items-center justify-center gap-2 transition-transform active:scale-95 shadow-md"
              style={{ fontFamily: "'Tiro Devanagari Hindi', serif" }}
            >
              <SkipForward className="w-8 h-8" />
              अगला टोकन बुलाएं <br/><span className="text-sm font-rajdhani uppercase tracking-wider opacity-80">(Call Next Token)</span>
            </button>

            <button 
              onClick={handleAnnounce}
              className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-xl font-bold text-xl flex flex-col items-center justify-center gap-2 transition-transform active:scale-95 shadow-md"
              style={{ fontFamily: "'Tiro Devanagari Hindi', serif" }}
            >
              <Volume2 className="w-8 h-8" />
              वर्तमान टोकन की घोषणा करें <br/><span className="text-sm font-rajdhani uppercase tracking-wider opacity-80">(Announce Current)</span>
            </button>
          </div>

          <div className="mt-auto pt-8">
            <button 
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 p-4 rounded-xl font-bold transition-colors border border-red-200"
            >
              <RotateCcw className="w-5 h-5" />
              Reset System (Clear All Queues)
            </button>
          </div>
        </div>

        {/* Right Side: Waiting Queue */}
        <div className="w-1/3 flex flex-col bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-inner">
          <div className="bg-slate-200 p-4 border-b border-slate-300">
            <h3 className="m-0 font-bold text-navy flex justify-between items-center" style={{ fontFamily: "'Tiro Devanagari Hindi', serif" }}>
              <span>प्रतीक्षा सूची (Waiting Queue)</span>
              <span className="bg-navy text-white text-sm px-3 py-1 rounded-full font-rajdhani">{queue.length}</span>
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {queue.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 font-semibold italic text-center px-4">
                Queue is empty. No one is currently waiting.
              </div>
            ) : (
              queue.map((t, i) => (
                <div key={i} className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
                  <span className="font-bold text-xl text-navy">{t}</span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pos: {i + 1}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
