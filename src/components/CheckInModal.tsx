import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Play, Pause, RotateCcw } from 'lucide-react';
import { Habit } from '../types';

interface CheckInModalProps {
  habit: Habit;
  currentValue: number;
  onCheckIn: (value: number, notes?: string) => void;
  onClose: () => void;
}

export function CheckInModal({ habit, currentValue, onCheckIn, onClose }: CheckInModalProps) {
  const [value, setValue] = useState(currentValue || 0);
  const [notes, setNotes] = useState('');

  // Timer state for duration habits
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  const isDuration = habit.metricType === 'duration';

  // Timer logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Sync timer to value (in minutes)
  useEffect(() => {
    if (isDuration) {
      setValue(Math.floor(timerSeconds / 60));
    }
  }, [timerSeconds, isDuration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = () => {
    onCheckIn(value, notes.trim() || undefined);
  };

  const increment = () => setValue((v) => v + 1);
  const decrement = () => setValue((v) => Math.max(0, v - 1));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm bg-gradient-to-br from-vapor-dark to-vapor-darker rounded-2xl border border-white/10 overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{habit.emoji}</span>
              <div>
                <h2 className="font-semibold text-white">{habit.name}</h2>
                <div className="text-sm text-white/60">Check-in</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Timer for duration habits */}
            {isDuration && (
              <div className="text-center space-y-4">
                <div className="text-5xl font-mono font-bold text-vapor-cyan">
                  {formatTime(timerSeconds)}
                </div>
                <div className="flex justify-center gap-4">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className={`
                      w-14 h-14 rounded-full flex items-center justify-center
                      ${isTimerRunning
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-green-500 hover:bg-green-600'
                      }
                      transition-colors
                    `}
                  >
                    {isTimerRunning ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6 ml-1" />
                    )}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setIsTimerRunning(false);
                      setTimerSeconds(0);
                    }}
                    className="w-14 h-14 rounded-full bg-vapor-darker flex items-center justify-center hover:bg-vapor-darkest transition-colors"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </motion.button>
                </div>
                <div className="text-white/40 text-sm">
                  or enter manually below
                </div>
              </div>
            )}

            {/* Value input */}
            <div className="flex items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={decrement}
                className="w-12 h-12 rounded-full bg-vapor-darker flex items-center justify-center hover:bg-vapor-darkest transition-colors"
              >
                <Minus className="w-5 h-5" />
              </motion.button>

              <div className="text-center">
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-24 text-4xl font-bold text-center bg-transparent text-vapor-cyan focus:outline-none focus:ring-2 focus:ring-vapor-cyan/50 rounded-lg"
                />
                <div className="text-sm text-white/40 mt-1">
                  {habit.unit || (habit.metricType === 'count' ? 'times' : '')}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={increment}
                className="w-12 h-12 rounded-full bg-vapor-darker flex items-center justify-center hover:bg-vapor-darkest transition-colors"
              >
                <Plus className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Goal indicator */}
            {habit.goalValue && (
              <div className="text-center">
                <div className="w-full h-2 bg-vapor-darker rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-vapor-pink to-vapor-cyan"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (value / habit.goalValue) * 100)}%` }}
                    transition={{ type: 'spring', stiffness: 100 }}
                  />
                </div>
                <div className="text-xs text-white/40 mt-2">
                  {value} / {habit.goalValue} {habit.unit}
                  {value >= habit.goalValue && (
                    <span className="text-green-400 ml-2">Goal reached! 🎉</span>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-sm text-white/60 mb-2 block">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How did it go?"
                className="w-full p-3 bg-vapor-darker/50 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-vapor-cyan/50 resize-none"
                rows={2}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              className="w-full py-3 bg-gradient-to-r from-vapor-pink to-vapor-cyan text-white font-semibold rounded-xl glow-button"
            >
              Save Check-in
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
