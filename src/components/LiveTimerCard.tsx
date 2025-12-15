import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Square, Trash2 } from 'lucide-react';
import { ActiveTimer, Habit, HabitEntry } from '../types';
import { getElapsedMs, formatElapsedTime } from '../services/timerService';

interface LiveTimerCardProps {
  timer: ActiveTimer;
  habit: Habit;
  previousBest?: number; // Best previous entry value in ms/units
  previousEntry?: HabitEntry; // Most recent previous entry
  onPause: () => void;
  onResume: () => void;
  onSave: (elapsedMs: number) => void;
  onDelete: () => void;
}

export function LiveTimerCard({
  timer,
  habit,
  previousBest,
  previousEntry,
  onPause,
  onResume,
  onSave,
  onDelete,
}: LiveTimerCardProps) {
  const [elapsedMs, setElapsedMs] = useState(getElapsedMs(timer));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Update elapsed time every 10ms for centisecond display
  useEffect(() => {
    if (!timer.isRunning) {
      setElapsedMs(getElapsedMs(timer));
      return;
    }

    const interval = setInterval(() => {
      setElapsedMs(getElapsedMs(timer));
    }, 10);

    return () => clearInterval(interval);
  }, [timer]);

  const formatted = formatElapsedTime(elapsedMs);

  // Calculate comparison to previous entry
  const getComparison = useCallback(() => {
    if (!previousEntry || habit.metricType !== 'duration') return null;

    const previousMs = previousEntry.value * 60 * 1000; // Convert minutes to ms
    const diff = elapsedMs - previousMs;

    return {
      diff,
      isAhead: habit.direction === 'maximize' ? diff > 0 : diff < 0,
      formatted: formatElapsedTime(Math.abs(diff)),
    };
  }, [elapsedMs, previousEntry, habit.direction, habit.metricType]);

  // Calculate comparison to best
  const getBestComparison = useCallback(() => {
    if (!previousBest || habit.metricType !== 'duration') return null;

    const bestMs = previousBest * 60 * 1000; // Convert minutes to ms
    const diff = elapsedMs - bestMs;

    return {
      diff,
      isAhead: habit.direction === 'maximize' ? diff > 0 : diff < 0,
      formatted: formatElapsedTime(Math.abs(diff)),
    };
  }, [elapsedMs, previousBest, habit.direction, habit.metricType]);

  const comparison = getComparison();
  const bestComparison = getBestComparison();

  const handleSave = () => {
    onSave(elapsedMs);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-gradient-to-br from-vapor-dark/90 to-vapor-darker/90 rounded-xl p-4 border border-white/10"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{habit.emoji}</span>
          <div>
            <h3 className="font-medium text-white">{habit.name}</h3>
            <p className="text-xs text-white/40">
              {timer.isRunning ? 'Loopt...' : 'Gepauzeerd'}
            </p>
          </div>
        </div>
        <div
          className={`w-3 h-3 rounded-full ${
            timer.isRunning ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
          }`}
        />
      </div>

      {/* Timer Display */}
      <div className="text-center py-4">
        <div className="font-mono text-5xl font-bold text-white tracking-wider">
          {formatted.display}
          <span className="text-2xl text-vapor-cyan">{formatted.centis}</span>
        </div>
      </div>

      {/* Comparisons */}
      {(comparison || bestComparison) && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {comparison && (
            <div className="bg-vapor-darker/50 rounded-lg p-2 text-center">
              <div className="text-xs text-white/40 mb-1">vs vorige</div>
              <div
                className={`text-sm font-medium ${
                  comparison.isAhead ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {comparison.isAhead ? '+' : '-'}
                {comparison.formatted.display}
              </div>
            </div>
          )}
          {bestComparison && (
            <div className="bg-vapor-darker/50 rounded-lg p-2 text-center">
              <div className="text-xs text-white/40 mb-1">vs beste</div>
              <div
                className={`text-sm font-medium ${
                  bestComparison.isAhead ? 'text-green-400' : 'text-vapor-gold'
                }`}
              >
                {bestComparison.isAhead ? '+' : '-'}
                {bestComparison.formatted.display}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        {timer.isRunning ? (
          <button
            onClick={onPause}
            className="flex-1 py-3 bg-yellow-500/20 rounded-xl text-yellow-400 font-medium hover:bg-yellow-500/30 transition-colors flex items-center justify-center gap-2"
          >
            <Pause className="w-4 h-4" />
            Pauzeer
          </button>
        ) : (
          <button
            onClick={onResume}
            className="flex-1 py-3 bg-green-500/20 rounded-xl text-green-400 font-medium hover:bg-green-500/30 transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            Hervat
          </button>
        )}

        <button
          onClick={handleSave}
          className="flex-1 py-3 bg-gradient-to-r from-vapor-pink/20 to-vapor-cyan/20 rounded-xl text-white font-medium hover:from-vapor-pink/30 hover:to-vapor-cyan/30 transition-colors flex items-center justify-center gap-2"
        >
          <Square className="w-4 h-4" />
          Opslaan
        </button>

        {showDeleteConfirm ? (
          <div className="flex gap-1">
            <button
              onClick={() => {
                onDelete();
                setShowDeleteConfirm(false);
              }}
              className="px-3 py-3 bg-red-500 rounded-xl text-white text-sm"
            >
              Ja
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-3 bg-vapor-darker rounded-xl text-white/60 text-sm"
            >
              Nee
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-3 bg-red-500/20 rounded-xl text-red-400 hover:bg-red-500/30 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
