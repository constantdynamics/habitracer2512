import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Play, Square, RotateCcw, Calendar, Trash2 } from 'lucide-react';
import { Habit, HabitEntry } from '../types';

interface CheckInModalProps {
  habit: Habit;
  currentValue: number;
  onCheckIn: (value: number, notes?: string, date?: string) => void;
  onDeleteEntry?: (date: string) => void;
  recentEntries?: HabitEntry[];
  onClose: () => void;
}

export function CheckInModal({
  habit,
  currentValue,
  onCheckIn,
  onDeleteEntry,
  recentEntries = [],
  onClose
}: CheckInModalProps) {
  const [value, setValue] = useState(currentValue || 0);
  const [notes, setNotes] = useState('');

  // Timer state for duration habits - continuous stopwatch
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMilliseconds, setTimerMilliseconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Terugwerkende kracht state
  const [showBackdate, setShowBackdate] = useState(false);
  const [backdateDate, setBackdateDate] = useState('');

  // Entry verwijderen state
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  const isDuration = habit.metricType === 'duration';

  // High-precision timer with centiseconds
  useEffect(() => {
    if (isTimerRunning) {
      startTimeRef.current = Date.now() - timerMilliseconds;
      timerRef.current = setInterval(() => {
        setTimerMilliseconds(Date.now() - startTimeRef.current);
      }, 10); // Update every 10ms for centiseconds
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  // Format time with centiseconds: MM:SS.cc
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const centis = Math.floor((ms % 1000) / 10);
    return {
      display: `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
      centis: `.${centis.toString().padStart(2, '0')}`
    };
  };

  const handleSaveAndContinue = () => {
    // For duration: save current time in minutes
    const valueToSave = isDuration ? Math.floor(timerMilliseconds / 60000) : value;

    if (backdateDate) {
      // Terugwerkende kracht
      onCheckIn(valueToSave, notes.trim() || undefined, backdateDate);
      setBackdateDate('');
      setShowBackdate(false);
    } else {
      onCheckIn(valueToSave, notes.trim() || undefined);
    }

    // Auto-restart timer for continuous tracking
    if (isDuration) {
      setTimerMilliseconds(0);
      // Keep running if it was running
    }

    setNotes('');
    if (!isDuration) {
      setValue(0);
    }
  };

  const handleSaveAndClose = () => {
    handleSaveAndContinue();
    setIsTimerRunning(false);
    onClose();
  };

  const handleDeleteEntry = (date: string) => {
    if (onDeleteEntry) {
      onDeleteEntry(date);
      setEntryToDelete(null);
    }
  };

  const increment = () => setValue((v) => v + 1);
  const decrement = () => setValue((v) => Math.max(0, v - 1));

  const time = formatTime(timerMilliseconds);

  // Get today's date for max date input
  const today = new Date().toISOString().split('T')[0];

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
          className="w-full max-w-sm bg-gradient-to-br from-vapor-dark to-vapor-darker rounded-2xl border border-white/10 overflow-hidden max-h-[90vh] overflow-y-auto relative"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{habit.emoji}</span>
              <div>
                <h2 className="font-semibold text-white">{habit.name}</h2>
                <div className="text-sm text-white/60">
                  {isDuration ? 'Stopwatch' : 'Invoer'}
                </div>
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
            {/* Timer for duration habits - Stopwatch style */}
            {isDuration && (
              <div className="text-center space-y-4">
                {/* Large stopwatch display */}
                <div className="relative inline-block">
                  <div className="text-6xl font-mono font-bold text-vapor-cyan tracking-tight">
                    {time.display}
                    <span className="text-3xl text-vapor-cyan/60">{time.centis}</span>
                  </div>
                  {isTimerRunning && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  )}
                </div>

                {/* Timer controls */}
                <div className="flex justify-center gap-4">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className={`
                      w-16 h-16 rounded-full flex items-center justify-center text-white
                      ${isTimerRunning
                        ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                        : 'bg-green-500 hover:bg-green-600 shadow-[0_0_20px_rgba(34,197,94,0.5)]'
                      }
                      transition-all
                    `}
                  >
                    {isTimerRunning ? (
                      <Square className="w-6 h-6" fill="currentColor" />
                    ) : (
                      <Play className="w-7 h-7 ml-1" fill="currentColor" />
                    )}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setIsTimerRunning(false);
                      setTimerMilliseconds(0);
                    }}
                    className="w-16 h-16 rounded-full bg-vapor-darker flex items-center justify-center hover:bg-vapor-darkest transition-colors border border-white/10"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </motion.button>
                </div>

                <p className="text-white/40 text-xs">
                  {isTimerRunning ? 'Loopt... Druk op Stop als je klaar bent' : 'Druk op Start om te beginnen'}
                </p>
              </div>
            )}

            {/* Value input for non-duration habits */}
            {!isDuration && (
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
                    {habit.unit || (habit.metricType === 'count' ? 'keer' : '')}
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
            )}

            {/* Manual input for duration (alternative to timer) */}
            {isDuration && (
              <div className="text-center">
                <div className="text-xs text-white/40 mb-2">Of voer handmatig in:</div>
                <div className="flex items-center justify-center gap-2">
                  <input
                    type="number"
                    value={Math.floor(timerMilliseconds / 60000) || ''}
                    onChange={(e) => {
                      const mins = parseInt(e.target.value) || 0;
                      setTimerMilliseconds(mins * 60000);
                    }}
                    placeholder="0"
                    className="w-20 text-2xl font-bold text-center bg-vapor-darker/50 text-vapor-cyan focus:outline-none focus:ring-2 focus:ring-vapor-cyan/50 rounded-lg p-2"
                  />
                  <span className="text-white/40">{habit.unit || 'minuten'}</span>
                </div>
              </div>
            )}

            {/* Goal indicator */}
            {habit.goalValue && (
              <div className="text-center">
                <div className="w-full h-2 bg-vapor-darker rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-vapor-pink to-vapor-cyan"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(100, ((isDuration ? Math.floor(timerMilliseconds / 60000) : value) / habit.goalValue) * 100)}%`
                    }}
                    transition={{ type: 'spring', stiffness: 100 }}
                  />
                </div>
                <div className="text-xs text-white/40 mt-2">
                  {isDuration ? Math.floor(timerMilliseconds / 60000) : value} / {habit.goalValue} {habit.unit}
                  {(isDuration ? Math.floor(timerMilliseconds / 60000) : value) >= habit.goalValue && (
                    <span className="text-green-400 ml-2">Doel behaald! 🎉</span>
                  )}
                </div>
              </div>
            )}

            {/* Terugwerkende kracht sectie */}
            <div className="border-t border-white/10 pt-4">
              <button
                onClick={() => setShowBackdate(!showBackdate)}
                className="flex items-center gap-2 text-sm text-white/60 hover:text-white/80 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                <span>Vergeten in te vullen?</span>
              </button>

              {showBackdate && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 space-y-3"
                >
                  <div>
                    <label className="text-xs text-white/40 block mb-1">Datum</label>
                    <input
                      type="date"
                      value={backdateDate}
                      onChange={(e) => setBackdateDate(e.target.value)}
                      max={today}
                      className="w-full p-2 bg-vapor-darker/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-vapor-cyan/50"
                    />
                  </div>
                  <p className="text-xs text-white/40">
                    Hiermee kun je een eerdere poging alsnog invoeren
                  </p>
                </motion.div>
              )}
            </div>

            {/* Recente entries met verwijder optie */}
            {recentEntries.length > 0 && (
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/60">Recente pogingen</span>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {recentEntries.slice(0, 5).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-2 bg-vapor-darker/30 rounded-lg text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-white/40">{entry.date}</span>
                        <span className="text-vapor-cyan font-medium">
                          {entry.value} {habit.unit}
                        </span>
                      </div>
                      {onDeleteEntry && (
                        <button
                          onClick={() => setEntryToDelete(entry.date)}
                          className="p-1 text-white/40 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-sm text-white/60 mb-2 block">Notities (optioneel)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Hoe ging het?"
                className="w-full p-3 bg-vapor-darker/50 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-vapor-cyan/50 resize-none"
                rows={2}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 space-y-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSaveAndClose}
              className="w-full py-3 bg-gradient-to-r from-vapor-pink to-vapor-cyan text-white font-semibold rounded-xl glow-button"
            >
              {isDuration ? 'Opslaan & Sluiten' : 'Opslaan'}
            </motion.button>
            {isDuration && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSaveAndContinue}
                className="w-full py-3 bg-vapor-darker text-white font-medium rounded-xl border border-white/10 hover:bg-vapor-darkest transition-colors"
              >
                Opslaan & Nieuwe Poging
              </motion.button>
            )}
          </div>

          {/* Delete confirmation */}
          <AnimatePresence>
            {entryToDelete && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.9 }}
                  className="bg-vapor-dark rounded-xl p-4 border border-white/10 max-w-xs w-full"
                >
                  <h3 className="text-white font-medium mb-2">Poging verwijderen?</h3>
                  <p className="text-white/60 text-sm mb-4">
                    Weet je zeker dat je de poging van {entryToDelete} wilt verwijderen?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEntryToDelete(null)}
                      className="flex-1 py-2 bg-vapor-darker rounded-lg text-white text-sm hover:bg-vapor-darkest transition-colors"
                    >
                      Annuleren
                    </button>
                    <button
                      onClick={() => handleDeleteEntry(entryToDelete)}
                      className="flex-1 py-2 bg-red-500 rounded-lg text-white text-sm hover:bg-red-600 transition-colors"
                    >
                      Verwijderen
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
