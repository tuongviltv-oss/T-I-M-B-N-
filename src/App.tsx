/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  Timer, 
  Star, 
  Trophy, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Lightbulb,
  ChevronRight,
  Volume2,
  VolumeX
} from 'lucide-react';

// --- Sound Service ---
class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmOsc: OscillatorNode | null = null;
  private isMuted: boolean = false;

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = 0.3;
  }

  setMute(mute: boolean) {
    this.isMuted = mute;
    if (this.masterGain) {
      this.masterGain.gain.value = mute ? 0 : 0.3;
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.5, decay: boolean = true) {
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    if (decay) {
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    } else {
      gain.gain.setValueAtTime(volume, this.ctx.currentTime + duration);
    }
    
    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
    return { osc, gain };
  }

  private playNoise(duration: number, volume: number = 0.5) {
    if (!this.ctx || this.isMuted) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    noise.connect(gain);
    gain.connect(this.masterGain!);
    noise.start();
  }

  playCorrect() {
    // "Ting"
    this.playTone(987.77, 'sine', 0.2, 0.4); // B5
    // "Clapping"
    for (let i = 0; i < 4; i++) {
      setTimeout(() => this.playNoise(0.15, 0.2), i * 60);
    }
  }

  playIncorrect() {
    // "Bụp nhẹ" (Thud)
    this.playTone(110, 'triangle', 0.2, 0.5); // A2
    this.playTone(80, 'sine', 0.2, 0.6); // Low thud
  }

  playPop() {
    this.playTone(880, 'sine', 0.05, 0.3);
  }

  playVictory() {
    // Victory Chime
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.5, 0.3), i * 150);
    });
  }

  playTick() {
    this.playTone(440, 'sine', 0.02, 0.05);
  }

  startBGM() {
    if (!this.ctx || this.bgmOsc) return;
    
    // Simple Piano-like loop (Arpeggio)
    const playPianoNote = (freq: number, time: number) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.03, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 1.5);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(time);
      osc.stop(time + 1.5);
    };

    const loop = () => {
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;
      const scale = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      scale.forEach((freq, i) => {
        playPianoNote(freq, now + i * 0.5);
      });
      setTimeout(loop, 2000);
    };

    loop();
    this.bgmOsc = {} as any;
  }
}

const soundManager = new SoundManager();

// --- Types & Constants ---

type Question = {
  id: number;
  text: string;
  options: string[];
  correctAnswer: string;
  hint: string;
};

type Bag = {
  id: number;
  name: string;
  questions: Question[];
};

const QUESTIONS: Bag[] = [
  {
    id: 1,
    name: "Túi Mù 1",
    questions: [
      {
        id: 1,
        text: "Số 1 024 làm tròn đến hàng nghìn ta được số:",
        options: ["1 000", "1 100", "1 020", "1 050"],
        correctAnswer: "1 000",
        hint: "Lưu ý: Khi làm tròn số đến hàng nghìn, ta so sánh chữ số hàng trăm với 5. Nếu chữ số hàng trăm bé hơn 5 thì ta làm tròn lùi, còn lại thì làm tròn tiến. Số 1 024 có chữ số hàng trăm là 0. Do 0 < 5 nên ta làm tròn lùi."
      },
      {
        id: 2,
        text: "Số 13 048 làm tròn đến chữ số hàng chục nghìn ta được số:",
        options: ["10 000", "13 000", "13 050", "13 100"],
        correctAnswer: "10 000",
        hint: "Lưu ý: Khi làm tròn đến hàng chục nghìn, ta so sánh chữ số hàng nghìn với 5. Nếu chữ số hàng nghìn bé hơn 5 thì làm tròn lùi, còn lại thì làm tròn tiến. Số 13 048 có chữ số hàng nghìn là 3. Do 3 < 5 nên ta làm tròn lùi."
      }
    ]
  },
  {
    id: 2,
    name: "Túi Mù 2",
    questions: [
      {
        id: 1,
        text: "“Số 45 385 làm tròn đến hàng nghìn thành số 46 000”. Phát biểu trên đúng hay sai?",
        options: ["Đúng", "Sai"],
        correctAnswer: "Sai",
        hint: "Lưu ý: Khi làm tròn số đến hàng nghìn, ta so sánh chữ số hàng trăm với 5. Nếu chữ số hàng trăm bé hơn 5 thì làm tròn lùi, còn lại thì làm tròn tiến. Số 45 385 có chữ số hàng trăm là 3. Do 3 < 5 nên ta làm tròn xuống."
      },
      {
        id: 2,
        text: "Một nông trại trồng 23 255 cây cà phê. Bác nông dân nói “Nông trại của tôi trồng khoảng 23 000 cây cà phê”. Hỏi Bác đã làm tròn số cây cà phê đến hàng nào?",
        options: ["Hàng chục", "Hàng trăm", "Hàng nghìn", "Hàng chục nghìn"],
        correctAnswer: "Hàng nghìn",
        hint: "Số 23 255 có chữ số hàng trăm là 2, do 2 < 5 nên khi làm tròn đến hàng nghìn, ta làm tròn lùi."
      }
    ]
  },
  {
    id: 3,
    name: "Túi Mù 3",
    questions: [
      {
        id: 1,
        text: "Quãng đường từ Hà Nội đến Thủ đô Paris – Pháp dài 9 190 km. Khi làm tròn đến chữ số hàng nghìn, ta nói: “Quãng đường từ Hà Nội đến Paris dài khoảng … km”",
        options: ["10 000 km", "9 100 km", "9 200 km", "9 000 km"],
        correctAnswer: "9 000 km",
        hint: "Số 9 190 có chữ số hàng trăm là 1, do 1 < 5 nên khi làm tròn đến hàng nghìn, ta làm tròn lùi."
      },
      {
        id: 2,
        text: "Một trường học có 10 880 học sinh. Nếu làm tròn số học sinh đến hàng chục nghìn, ta có thể nói: Trường học đó có khoảng:",
        options: ["11 000 học sinh", "10 000 học sinh", "10 900 học sinh", "11 900 học sinh"],
        correctAnswer: "10 000 học sinh",
        hint: "Số 10 880 có chữ số hàng nghìn là 0, do 0 < 5 nên khi làm tròn đến hàng chục nghìn, ta làm tròn lùi."
      }
    ]
  },
  {
    id: 4,
    name: "Túi Mù 4",
    questions: [
      {
        id: 1,
        text: "Phát biểu nào sau đây không chính xác?",
        options: [
          "Nếu chữ số hàng nghìn là 6, thì khi làm tròn đến hàng chục nghìn, ta làm tròn tiến.",
          "Nếu chữ số hàng trăm là 4, thì khi làm tròn đến hàng nghìn, ta làm tròn lùi.",
          "Nếu chữ số hàng trăm là 5, thì khi làm tròn đến hàng nghìn, ta làm tròn lùi.",
          "Nếu chữ số hàng nghìn là 9, thì khi làm tròn đến hàng chục nghìn, ta làm tròn tiến."
        ],
        correctAnswer: "Nếu chữ số hàng trăm là 5, thì khi làm tròn đến hàng nghìn, ta làm tròn lùi.",
        hint: "Nếu chữ số hàng trăm là 5, do 5 = 5 nên khi làm tròn đến chữ số hàng nghìn, ta cần làm tròn tiến."
      },
      {
        id: 2,
        text: "Trong dịp Tết trung thu, một cơ sở sản xuất 64 358 hộp bánh. Nếu làm tròn số đến hàng nghìn, cơ sở đó đã sản xuất khoảng:",
        options: ["63 000 hộp", "64 000 hộp", "65 000 hộp", "60 000 hộp"],
        correctAnswer: "64 000 hộp",
        hint: "Khi làm tròn số đến hàng nghìn, ta so sánh chữ số hàng trăm với 5. Nếu chữ số hàng trăm bé hơn 5 thì làm tròn xuống, còn lại thì làm tròn lên."
      }
    ]
  }
];

type GameState = 'SETUP' | 'HOME' | 'OPENING' | 'QUESTION' | 'HINT' | 'TIMEOUT' | 'RESULT';

const AVATARS = ['🐱', '🐶', '🦊', '🐯', '🦁', '🐼', '🐨', '🐸'];

export default function App() {
  const [gameState, setGameState] = useState<GameState>('SETUP');
  const [playerName, setPlayerName] = useState<string>('');
  const [playerAvatar, setPlayerAvatar] = useState<string>(AVATARS[0]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentBagIndex, setCurrentBagIndex] = useState<number>(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [timer, setTimer] = useState<number>(25);
  const [hintUsed, setHintUsed] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [completedBags, setCompletedBags] = useState<number[]>([]);
  const [openingCountdown, setOpeningCountdown] = useState<number>(3);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  // --- Game Logic ---

  const currentBag = QUESTIONS[currentBagIndex];
  const currentQuestion = currentBag.questions[currentQuestionIndex];

  const startBag = (index: number) => {
    soundManager.playPop();
    setCurrentBagIndex(index);
    setCurrentQuestionIndex(0);
    setGameState('OPENING');
    setOpeningCountdown(3);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < currentBag.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      resetQuestionState();
      setGameState('QUESTION');
    } else {
      soundManager.playVictory();
      setCompletedBags(prev => [...prev, currentBag.id]);
      if (completedBags.length + 1 === QUESTIONS.length) {
        setGameState('RESULT');
      } else {
        setGameState('HOME');
      }
    }
  };

  const resetQuestionState = () => {
    setTimer(25);
    setHintUsed(false);
    setSelectedOption(null);
    setIsCorrect(null);
    setShowConfetti(false);
  };

  const handleAnswer = (option: string) => {
    if (selectedOption || gameState === 'TIMEOUT') return;
    
    setSelectedOption(option);
    const correct = option === currentQuestion.correctAnswer;
    setIsCorrect(correct);

    if (correct) {
      soundManager.playCorrect();
      setShowConfetti(true);
      const points = hintUsed ? 5 : 10;
      setScore(prev => prev + points);
      setTimeout(() => {
        setShowConfetti(false);
        nextQuestion();
      }, 1500);
    } else {
      soundManager.playIncorrect();
      setGameState('HINT');
    }
  };

  const handleRetry = () => {
    soundManager.playPop();
    setHintUsed(true);
    setTimer(25);
    setSelectedOption(null);
    setIsCorrect(null);
    setGameState('QUESTION');
  };

  // --- Effects ---

  // Opening Countdown
  useEffect(() => {
    if (gameState === 'OPENING') {
      if (openingCountdown > 0) {
        soundManager.playTick();
        const t = setTimeout(() => setOpeningCountdown(prev => prev - 1), 1000);
        return () => clearTimeout(t);
      } else {
        soundManager.playPop();
        resetQuestionState();
        setGameState('QUESTION');
      }
    }
  }, [gameState, openingCountdown]);

  // Question Timer
  useEffect(() => {
    if (gameState === 'QUESTION' && timer > 0 && !selectedOption) {
      if (timer <= 5) soundManager.playTick();
      const t = setInterval(() => setTimer(prev => prev - 1), 1000);
      return () => clearInterval(t);
    } else if (gameState === 'QUESTION' && timer === 0 && !selectedOption) {
      soundManager.playIncorrect();
      setGameState('TIMEOUT');
    }
  }, [gameState, timer, selectedOption]);

  const toggleMute = () => {
    soundManager.playPop();
    const newMute = !isMuted;
    setIsMuted(newMute);
    soundManager.setMute(newMute);
  };

  const handleStartGame = () => {
    soundManager.playPop();
    soundManager.init();
    soundManager.startBGM();
    setGameState('HOME');
  };

  // --- Render Helpers ---

  const getRank = () => {
    if (score >= 70) return { title: "Siêu sao làm tròn số", icon: "🥇" };
    if (score >= 55) return { title: "Thợ săn túi mù", icon: "🥈" };
    if (score >= 40) return { title: "Người mở túi tài năng", icon: "🥉" };
    return { title: "Chiến binh đang luyện tập", icon: "🎖" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 text-white font-sans overflow-hidden flex flex-col items-center justify-center p-4">
      
      {/* Score Header (Visible during game) */}
      {gameState !== 'SETUP' && (
        <div className="fixed top-6 right-6 flex items-center gap-4 z-50">
          <button 
            onClick={toggleMute}
            className="bg-white/10 backdrop-blur-md p-2 rounded-full border border-white/20 hover:bg-white/20 transition-colors"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          {gameState !== 'HOME' && gameState !== 'RESULT' && (
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
              <Star className="text-yellow-400 fill-yellow-400" size={20} />
              <span className="font-bold text-xl tracking-wider">ĐIỂM: {score}</span>
            </div>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        
        {/* --- SETUP SCREEN --- */}
        {gameState === 'SETUP' && (
          <motion.div 
            key="setup"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="w-full max-w-xl bg-white/10 backdrop-blur-xl p-6 md:p-8 rounded-[40px] border border-white/20 shadow-2xl text-center"
          >
            <h2 className="text-2xl md:text-3xl font-black mb-6 uppercase tracking-tight">Chào mừng nhà thám hiểm!</h2>
            
            <div className="mb-6">
              <p className="text-purple-200 font-bold mb-3 uppercase tracking-widest text-xs">Chọn hình đại diện</p>
              <div className="flex flex-wrap justify-center gap-3">
                {AVATARS.map(avatar => (
                  <motion.button
                    key={avatar}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      soundManager.playPop();
                      setPlayerAvatar(avatar);
                    }}
                    className={`text-3xl p-3 rounded-xl transition-all ${playerAvatar === avatar ? 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)] scale-110' : 'bg-white/5 hover:bg-white/10'}`}
                  >
                    {avatar}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <p className="text-purple-200 font-bold mb-3 uppercase tracking-widest text-xs">Nhập tên của bạn</p>
              <input 
                type="text" 
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Tên của bạn..."
                className="w-full bg-white/5 border-2 border-white/20 rounded-xl px-4 py-3 text-xl font-bold text-center focus:outline-none focus:border-yellow-400 transition-colors placeholder:text-white/20"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={!playerName.trim()}
              onClick={handleStartGame}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white py-4 rounded-xl text-xl font-black shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              BẮT ĐẦU NGAY!
            </motion.button>
          </motion.div>
        )}

        {/* --- HOME SCREEN --- */}
        {gameState === 'HOME' && (
          <motion.div 
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-4xl text-center"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 100 }}
              className="mb-8"
            >
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-2 drop-shadow-2xl">
                🎒 TÚI MÙ BÍ ẨN
              </h1>
              <p className="text-lg md:text-xl font-medium text-purple-200 uppercase tracking-[0.2em]">
                Thử thách làm tròn số
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 max-w-3xl mx-auto">
              {QUESTIONS.map((bag, idx) => {
                const isCompleted = completedBags.includes(bag.id);
                return (
                  <motion.button
                    key={bag.id}
                    whileHover={!isCompleted ? { scale: 1.05, rotate: 2 } : {}}
                    whileTap={!isCompleted ? { scale: 0.95 } : {}}
                    onClick={() => !isCompleted && startBag(idx)}
                    disabled={isCompleted}
                    className={`relative group aspect-[4/5] rounded-3xl flex flex-col items-center justify-center gap-4 transition-all duration-300 ${
                      isCompleted 
                        ? 'bg-gray-800/50 opacity-50 cursor-not-allowed border-gray-700' 
                        : 'bg-gradient-to-b from-purple-500/20 to-indigo-500/20 border-2 border-white/20 hover:border-white/50 backdrop-blur-sm'
                    }`}
                  >
                    <div className="relative">
                      <Package 
                        size={80} 
                        className={`${isCompleted ? 'text-gray-500' : 'text-purple-300 group-hover:text-white'} transition-colors`}
                      />
                      {!isCompleted && (
                        <motion.div 
                          animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full blur-sm"
                        />
                      )}
                    </div>
                    <span className="font-bold text-lg uppercase tracking-widest">
                      {isCompleted ? "ĐÃ MỞ" : `TÚI ${bag.id}`}
                    </span>
                    {isCompleted && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <CheckCircle2 className="text-green-400" size={48} />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-16 flex items-center justify-center gap-4 text-purple-300">
              <Star className="animate-pulse" />
              <span className="text-lg font-semibold">Điểm hiện tại: {score}</span>
              <Star className="animate-pulse" />
            </div>
          </motion.div>
        )}

        {/* --- OPENING ANIMATION --- */}
        {gameState === 'OPENING' && (
          <motion.div 
            key="opening"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.2, filter: "blur(10px)" }}
            className="flex flex-col items-center justify-center relative w-full h-full"
          >
            <div className="relative">
              {/* Sparkles & Confetti effect */}
              {openingCountdown === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* Confetti */}
                  {[...Array(30)].map((_, i) => (
                    <motion.div
                      key={`confetti-${i}`}
                      initial={{ scale: 0, x: 0, y: 0, rotate: 0 }}
                      animate={{ 
                        scale: [0, 1, 0.5, 0],
                        x: (Math.random() - 0.5) * 600,
                        y: (Math.random() - 0.5) * 600,
                        rotate: Math.random() * 360,
                      }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className={`absolute w-3 h-3 rounded-sm ${
                        ['bg-yellow-400', 'bg-pink-400', 'bg-blue-400', 'bg-green-400', 'bg-white'][i % 5]
                      }`}
                    />
                  ))}
                  {/* Sparkles */}
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={`sparkle-${i}`}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ 
                        opacity: [0, 1, 0],
                        scale: [0, 1.5, 0],
                        x: (Math.random() - 0.5) * 400,
                        y: (Math.random() - 0.5) * 400,
                      }}
                      transition={{ 
                        duration: 0.8, 
                        delay: Math.random() * 0.5,
                        repeat: 1
                      }}
                      className="absolute w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]"
                    />
                  ))}
                </div>
              )}

              {/* The Bag with Pop & Bounce */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={openingCountdown > 0 ? { 
                  scale: [1, 1.15, 1],
                  rotate: [0, -8, 8, 0],
                  y: [0, -20, 0],
                  opacity: 1
                } : {
                  scale: [1, 1.8, 0],
                  rotate: [0, 360, 720],
                  opacity: [1, 1, 0],
                  filter: ["blur(0px)", "blur(0px)", "blur(20px)"]
                }}
                transition={openingCountdown > 0 ? { 
                  repeat: Infinity, 
                  duration: 0.4,
                  ease: "easeInOut"
                } : {
                  duration: 0.7,
                  ease: "backIn"
                }}
              >
                <Package size={220} className="text-purple-400 drop-shadow-[0_0_60px_rgba(168,85,247,0.6)]" />
              </motion.div>
            </div>
            
            <AnimatePresence mode="wait">
              {openingCountdown > 0 ? (
                <motion.div 
                  key={openingCountdown}
                  initial={{ scale: 3, opacity: 0, rotate: -20 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.2, opacity: 0, rotate: 20 }}
                  className="text-8xl md:text-9xl font-black italic text-yellow-400 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] mt-6"
                >
                  {openingCountdown}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0, opacity: 0, y: 50 }}
                  animate={{ scale: [0, 1.4, 1.2], opacity: 1, y: 0 }}
                  className="text-6xl md:text-8xl font-black italic text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.8)] mt-6 uppercase tracking-tighter"
                >
                  BÙM!!!
                </motion.div>
              )}
            </AnimatePresence>
            
            <motion.p 
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-xl md:text-2xl font-bold tracking-widest uppercase mt-10 text-purple-200"
            >
              {openingCountdown > 0 ? `Đang chuẩn bị túi ${currentBag.id}...` : "Khám phá ngay!"}
            </motion.p>
          </motion.div>
        )}

        {/* --- QUESTION SCREEN --- */}
        {gameState === 'QUESTION' && (
          <motion.div 
            key="question"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="w-full max-w-4xl flex flex-col gap-8"
          >
            {/* Header Info */}
            <div className="flex justify-between items-end px-4 mb-2">
              <div className="flex flex-col gap-0">
                <span className="text-purple-300 font-bold uppercase tracking-widest text-xs">
                  🎒 {currentBag.name}
                </span>
                <span className="text-2xl font-black italic">
                  CÂU {currentQuestionIndex + 1}/2
                </span>
              </div>
              
              <div className="relative flex items-center justify-center">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="transparent"
                    className="text-white/10"
                  />
                  <motion.circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray="175.9"
                    animate={{ strokeDashoffset: 175.9 - (timer / 25) * 175.9 }}
                    className={`${timer <= 5 ? 'text-red-500' : 'text-yellow-400'}`}
                  />
                </svg>
                <div className={`absolute text-xl font-black ${timer <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  {timer}
                </div>
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-white rounded-[30px] p-6 md:p-8 shadow-2xl border-b-4 border-purple-200">
              <h2 className="text-xl md:text-3xl font-bold text-gray-800 leading-tight text-center">
                {currentQuestion.text}
              </h2>
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative">
              {/* Correct Answer Confetti */}
              {showConfetti && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={`correct-confetti-${i}`}
                      initial={{ scale: 0, x: 0, y: 0 }}
                      animate={{ 
                        scale: [0, 1, 0],
                        x: (Math.random() - 0.5) * 400,
                        y: (Math.random() - 0.5) * 400,
                        rotate: Math.random() * 360,
                      }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`absolute w-3 h-3 rounded-full ${
                        ['bg-yellow-400', 'bg-green-400', 'bg-blue-400', 'bg-white'][i % 4]
                      }`}
                    />
                  ))}
                </div>
              )}
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedOption === option;
                
                let btnClass = "bg-white/10 hover:bg-white/20 border-white/20";
                if (isSelected) {
                  btnClass = isCorrect ? "bg-green-500 border-green-400" : "bg-red-500 border-red-400";
                }

                return (
                  <motion.button
                    key={idx}
                    animate={isSelected && !isCorrect ? {
                      x: [0, -10, 10, -10, 10, 0],
                      transition: { duration: 0.4 }
                    } : isSelected && isCorrect ? {
                      scale: [1, 1.1, 1],
                      transition: { duration: 0.3 }
                    } : {}}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAnswer(option)}
                    disabled={!!selectedOption}
                    className={`relative p-4 md:p-5 rounded-2xl border-2 text-lg md:text-xl font-bold transition-all flex items-center justify-center gap-3 ${btnClass}`}
                  >
                    <span className="absolute left-4 opacity-30 text-2xl">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {option}
                    {isSelected && isCorrect && <CheckCircle2 className="text-white" size={20} />}
                    {isSelected && !isCorrect && <XCircle className="text-white" size={20} />}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* --- HINT OVERLAY --- */}
        {gameState === 'HINT' && (
          <motion.div 
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[30px] p-6 md:p-8 max-w-xl w-full text-gray-800 shadow-[0_0_50px_rgba(255,255,255,0.2)]"
            >
              <div className="flex items-center gap-3 mb-4 text-yellow-600">
                <Lightbulb size={32} className="fill-yellow-400" />
                <h3 className="text-2xl font-black uppercase tracking-tight">Gợi ý cho bạn</h3>
              </div>
              
              <div className="bg-yellow-50 p-6 rounded-2xl border-2 border-yellow-200 mb-6">
                <p className="text-lg leading-relaxed font-medium italic text-gray-700">
                  {currentQuestion.hint}
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRetry}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl text-xl font-black flex items-center justify-center gap-2 shadow-xl"
              >
                <RotateCcw size={20} />
                THỬ LẠI NGAY
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {/* --- TIMEOUT SCREEN --- */}
        {gameState === 'TIMEOUT' && (
          <motion.div 
            key="timeout"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center flex flex-col items-center gap-6"
          >
            <div className="bg-red-500 p-6 rounded-full animate-bounce">
              <Timer size={80} />
            </div>
            <h2 className="text-5xl md:text-7xl font-black italic text-red-400">HẾT GIỜ!</h2>
            <div className="bg-white/10 backdrop-blur-md p-6 md:p-8 rounded-[30px] border border-white/20">
              <p className="text-xl font-medium text-purple-200 mb-2">Đáp án đúng là:</p>
              <p className="text-3xl md:text-5xl font-black text-green-400">{currentQuestion.correctAnswer}</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                soundManager.playPop();
                nextQuestion();
              }}
              className="mt-4 bg-white text-indigo-900 px-10 py-4 rounded-full text-xl font-black flex items-center gap-2"
            >
              TIẾP TỤC <ChevronRight />
            </motion.button>
          </motion.div>
        )}

        {/* --- RESULT SCREEN --- */}
        {gameState === 'RESULT' && (
          <motion.div 
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-4xl text-center flex flex-col items-center"
          >
            <div className="relative mb-6">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                className="absolute inset-0 bg-yellow-400/20 blur-[60px] rounded-full"
              />
              <Trophy size={100} className="text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)] relative z-10" />
            </div>

            <h2 className="text-2xl font-bold text-purple-200 mb-2 uppercase tracking-widest">Tổng kết hành trình</h2>
            <div className="text-7xl font-black text-white mb-6 drop-shadow-2xl">
              {score}<span className="text-2xl text-yellow-400 ml-2">ĐIỂM</span>
            </div>

            <div className="bg-white/10 backdrop-blur-xl p-6 md:p-8 rounded-[40px] border border-white/20 w-full max-w-xl mb-8">
              <div className="flex items-center justify-center gap-4 mb-4">
                <span className="text-4xl bg-white/10 p-3 rounded-2xl">{playerAvatar}</span>
                <div className="text-left">
                  <p className="text-purple-300 font-bold uppercase tracking-widest text-xs">Người chơi</p>
                  <h4 className="text-2xl font-black text-white">{playerName}</h4>
                </div>
              </div>
              <div className="text-5xl mb-2">{getRank().icon}</div>
              <h3 className="text-3xl font-black text-yellow-400 mb-2 uppercase italic">
                {getRank().title}
              </h3>
              <p className="text-lg text-purple-100">
                Bạn đã hoàn thành xuất sắc thử thách!
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                soundManager.playPop();
                window.location.reload();
              }}
              className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-12 py-4 rounded-full text-2xl font-black shadow-2xl flex items-center gap-3"
            >
              <RotateCcw size={24} /> CHƠI LẠI
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />
      </div>
    </div>
  );
}
