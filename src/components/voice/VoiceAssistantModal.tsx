import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Mic, MicOff, Volume2, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({ isOpen, onClose }) => {
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const navigate = useNavigate();

  const sampleCommands = [
    { text: 'Bijli bill analyze karo', route: '/bills', desc: 'Scan and decode electricity bill' },
    { text: 'Check rooftop solar subsidy', route: '/solar', desc: 'Calculate PM Surya Ghar ROI' },
    { text: 'Find verified electrician nearby', route: '/workforce', desc: 'Browse local Surya Mitra workers' },
  ];

  const toggleListening = () => {
    if (!isListening) {
      setIsListening(true);
      setSpokenText('');
      setFeedback('Listening... Please speak now in Hindi or English');

      // Check for browser speech recognition
      const SpeechRecognition =
        (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
          .SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const recognition = new (SpeechRecognition as any)();
          recognition.lang = 'hi-IN';
          recognition.interimResults = false;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setSpokenText(transcript);
            setIsListening(false);
            processVoiceCommand(transcript);
          };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recognition.onerror = () => {
            setIsListening(false);
            setFeedback('Microphone permission or speech engine not available offline. You can select a quick voice query below.');
          };
          recognition.start();
        } catch {
          setIsListening(false);
          setFeedback('Voice capture ready. Choose a query or type below.');
        }
      } else {
        setTimeout(() => {
          setIsListening(false);
          setFeedback('Speech recognition is running in offline mode. Select one of the common prompts below.');
        }, 1500);
      }
    } else {
      setIsListening(false);
    }
  };

  const processVoiceCommand = (cmd: string) => {
    const lower = cmd.toLowerCase();
    if (lower.includes('bill') || lower.includes('bijli') || lower.includes('meter')) {
      setFeedback('Opening Bill Analyzer...');
      setTimeout(() => {
        onClose();
        navigate('/bills');
      }, 1000);
    } else if (lower.includes('solar') || lower.includes('dhoop') || lower.includes('subsidy')) {
      setFeedback('Opening Rooftop Solar Calculator...');
      setTimeout(() => {
        onClose();
        navigate('/solar');
      }, 1000);
    } else if (lower.includes('electrician') || lower.includes('worker') || lower.includes('technician') || lower.includes('kaam')) {
      setFeedback('Opening Community Workforce directory...');
      setTimeout(() => {
        onClose();
        navigate('/workforce');
      }, 1000);
    } else {
      setFeedback(`Recognized: "${cmd}". Select an action below.`);
    }
  };

  const handleSelectCommand = (route: string) => {
    onClose();
    navigate(route);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Urja Saathi Voice Assistant"
      description="Offline-first voice navigation for regional households (Hindi / English)"
      maxWidth="md"
    >
      <div className="flex flex-col items-center text-center py-4">
        {/* Animated Mic Ring */}
        <div className="relative mb-6">
          {isListening && (
            <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30" />
          )}
          <button
            onClick={toggleListening}
            className={`relative p-6 rounded-full transition-all duration-300 shadow-premium ${
              isListening
                ? 'bg-emerald-600 text-white scale-110 shadow-glow'
                : 'bg-emerald-50 text-emerald-800 border-2 border-emerald-200 hover:bg-emerald-100 hover:scale-105'
            }`}
            aria-label="Toggle voice listening"
          >
            {isListening ? (
              <Mic className="w-10 h-10 animate-pulse text-white" />
            ) : (
              <MicOff className="w-10 h-10 text-emerald-700" />
            )}
          </button>
        </div>

        <p className="text-sm font-semibold text-slate-800 mb-1">
          {isListening ? 'Listening... Speak in Hindi or English' : 'Tap the microphone to speak'}
        </p>
        <p className="text-xs text-slate-500 mb-6">
          "मेरा बिजली बिल समझाइए" or "Solar panel subsidy check karo"
        </p>

        {spokenText && (
          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 text-left">
            <span className="text-xs text-slate-400 font-medium">You said:</span>
            <p className="text-sm font-semibold text-slate-800">{spokenText}</p>
          </div>
        )}

        {feedback && (
          <div className="w-full bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 mb-6 text-emerald-900 text-xs flex items-center gap-2">
            <Volume2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Quick Voice Command Shortcuts */}
        <div className="w-full border-t border-slate-100 pt-4 text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Quick Voice Prompts
          </p>
          <div className="space-y-2">
            {sampleCommands.map((sc, i) => (
              <button
                key={i}
                onClick={() => handleSelectCommand(sc.route)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-left group"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800 group-hover:text-emerald-800">
                    "{sc.text}"
                  </p>
                  <p className="text-xs text-slate-500">{sc.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end w-full">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
