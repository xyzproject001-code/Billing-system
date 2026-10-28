/**
 * Layer 1 & 4: Voice-to-Cart Microphone Modal (Medium & High Plan)
 * Enables cashiers to speak orders into the counter microphone without typing
 */

import React, { useState, useEffect } from 'react';
import { Mic, MicOff, X, Plus, Sparkles, Check } from 'lucide-react';
import { Product } from '../types';
import { parseVoiceCommand, VoiceRecognizedItem } from '../utils/voiceRecognition';

interface VoiceMicModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: Product[];
  onAddItemsToCart: (items: VoiceRecognizedItem[]) => void;
}

export const VoiceMicModal: React.FC<VoiceMicModalProps> = ({
  isOpen,
  onClose,
  catalog,
  onAddItemsToCart,
}) => {
  if (!isOpen) return null;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognizedItems, setRecognizedItems] = useState<VoiceRecognizedItem[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  // Speech Recognition hook
  useEffect(() => {
    let recognition: any = null;

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Indian English handles Tamil transliterated food names best

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage('');
      };

      recognition.onresult = (event: any) => {
        let current = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          current += event.results[i][0].transcript;
        }
        setTranscript(current);
        const parsed = parseVoiceCommand(current, catalog);
        setRecognizedItems(parsed);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access blocked. Use the sample quick voice commands below.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognition) {
        try {
          recognition.stop();
        } catch (e) {}
      }
    };
  }, [catalog]);

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage('Browser Speech API not supported in this frame. Use quick phrases below.');
      return;
    }

    if (isListening) {
      setIsListening(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-IN';
        recognition.start();
        setIsListening(true);
      } catch (err) {
        setErrorMessage('Click a simulated voice phrase below to test without microphone.');
      }
    }
  };

  const handleSimulateSpoken = (phrase: string) => {
    setTranscript(phrase);
    const parsed = parseVoiceCommand(phrase, catalog);
    setRecognizedItems(parsed);
  };

  const handleConfirm = () => {
    if (recognizedItems.length > 0) {
      onAddItemsToCart(recognizedItems);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Mic className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">
                Voice-to-Cart Mic Billing
              </h3>
              <p className="text-xs text-slate-400">
                Medium & High Tier Feature: Speak items with zero clicking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mic Activation Area */}
        <div className="p-6 text-center space-y-4">
          <div className="relative inline-block">
            {isListening && (
              <div className="absolute inset-0 rounded-full bg-cyan-500/30 animate-ping" />
            )}
            <button
              onClick={toggleListening}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition shadow-xl ${
                isListening
                  ? 'bg-red-500 text-white shadow-red-500/30'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-blue-600/30'
              }`}
            >
              {isListening ? <Mic className="w-8 h-8 animate-pulse" /> : <Mic className="w-8 h-8" />}
            </button>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">
              {isListening ? 'Listening for order items...' : 'Tap Mic or Click a Sample Voice Phrase'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Example: &ldquo;2 Masala Dosa, 1 Filter Coffee, 3 Ghee Roast&rdquo;
            </p>
          </div>

          {errorMessage && (
            <p className="text-xs text-cyan-400 bg-cyan-950/40 border border-cyan-900/60 p-2 rounded-lg">
              {errorMessage}
            </p>
          )}

          {/* Quick Voice Simulation Buttons */}
          <div className="pt-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Instant Simulation Phrases (Test without mic):
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => handleSimulateSpoken('2 Masala Dosa and 1 Filter Coffee')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 hover:border-cyan-500 transition"
              >
                &ldquo;2 Masala Dosa and 1 Filter Coffee&rdquo;
              </button>
              <button
                onClick={() => handleSimulateSpoken('3 Ghee Roast and 2 Medu Vada')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 hover:border-cyan-500 transition"
              >
                &ldquo;3 Ghee Roast and 2 Medu Vada&rdquo;
              </button>
              <button
                onClick={() => handleSimulateSpoken('2 Sugar and 1 Urad Dal')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 hover:border-cyan-500 transition"
              >
                &ldquo;2 Sugar and 1 Urad Dal&rdquo;
              </button>
            </div>
          </div>

          {/* Live Transcript & Recognized Items */}
          {transcript && (
            <div className="mt-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-left">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Recognized Transcript:
              </p>
              <p className="text-sm font-medium text-cyan-300 mt-0.5 italic">
                &ldquo;{transcript}&rdquo;
              </p>

              {recognizedItems.length > 0 ? (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Matched In Catalog ({recognizedItems.length}{' '}
                    items):
                  </p>
                  {recognizedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-slate-800/80 px-2.5 py-1.5 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[11px] flex items-center justify-center">
                          {item.quantity}x
                        </span>
                        <span className="text-white font-medium">{item.product.nameEnglish}</span>
                      </div>
                      <span className="text-emerald-400 font-bold">
                        ₹{(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-cyan-400 mt-2">
                  No exact product names detected in speech. Speak more clearly or choose a sample phrase.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={recognizedItems.length === 0}
            className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              recognizedItems.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Add Recognized to Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
};
