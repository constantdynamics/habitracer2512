import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Square, Trash2, Check } from 'lucide-react';
import { ActiveTimer, Habit, RaceData, HabitEntry } from '../types';
import { getElapsedMs, formatElapsedTime } from '../services/timerService';

interface RaceTileProps {
  habit: Habit;
  raceData?: RaceData;
  todayEntry?: HabitEntry;
  currentStreak: number;
  activeTimer?: ActiveTimer;
  previousBest?: number;
  previousEntry?: { value: number; date: string };
  onQuickCheckIn: () => void;
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onSaveTimer: (elapsedMs: number) => void;
  onDeleteTimer: () => void;
  onClick: () => void;
}

export function RaceTile({
  habit,
  raceData,
  todayEntry,
  currentStreak,
  activeTimer,
  previousBest,
  previousEntry,
  onQuickCheckIn,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onSaveTimer,
  onDeleteTimer,
  onClick,
}: RaceTileProps) {
  const [elapsedMs, setElapsedMs] = useState(activeTimer ? getElapsedMs(activeTimer) : 0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isDuration = habit.type === 'quantifiable' && habit.metricType === 'duration';
  const isBoolean = habit.type === 'boolean';
  const isCompleted = todayEntry && (isBoolean ? todayEntry.value === 1 : todayEntry.value > 0);

  // Update elapsed time for active timer
  useEffect(() => {
    if (!activeTimer || !activeTimer.isRunning) {
      if (activeTimer) setElapsedMs(getElapsedMs(activeTimer));
      return;
    }

    const interval = setInterval(() => {
      setElapsedMs(getElapsedMs(activeTimer));
    }, 100); // Update every 100ms for performance

    return () => clearInterval(interval);
  }, [activeTimer]);

  const formatted = activeTimer ? formatElapsedTime(elapsedMs) : null;

  // Calculate comparisons for duration habits
  const getComparisons = () => {
    if (!isDuration || !activeTimer) return { vs_previous: null, vs_best: null };

    const prevMs = previousEntry ? previousEntry.value * 60 * 1000 : 0;
    const bestMs = previousBest ? previousBest * 60 * 1000 : 0;

    return {
      vs_previous: prevMs > 0 ? {
        diff: elapsedMs - prevMs,
        isAhead: habit.direction === 'maximize' ? elapsedMs > prevMs : elapsedMs < prevMs,
      } : null,
      vs_best: bestMs > 0 ? {
        diff: elapsedMs - bestMs,
        isAhead: habit.direction === 'maximize' ? elapsedMs > bestMs : elapsedMs < bestMs,
      } : null,
    };
  };

  const comparisons = getComparisons();

  // Race visualization
  const positions = raceData?.positions || [];
  const currentPosition = raceData?.currentPosition || 0;
  const totalPositions = raceData?.totalPositions || 0;

  // Calculate race info text
  let raceInfoText = '';
  if (isBoolean && raceData?.previousRecord) {
    const prStreak = raceData.previousRecord.value || 0;
    const daysToGo = prStreak - currentStreak;
    if (daysToGo > 0) {
      raceInfoText = `${daysToGo}d tot PR`;
    } else if (currentStreak > 0 && currentStreak >= prStreak) {
      raceInfoText = 'PR!';
    }
  }

  // Tile border color based on state
  let borderColor = 'border-white/10';
  if (activeTimer?.isRunning) {
    borderColor = 'border-green-500/50';
  } else if (activeTimer) {
    borderColor = 'border-yellow-500/50';
  } else if (isCompleted) {
    borderColor = 'border-vapor-cyan/30';
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-gradient-to-br from-vapor-dark/90 to-vapor-darker/90 rounded-xl p-3 border ${borderColor} flex flex-col min-h-[140px]`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-2" onClick={onClick}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xl">{habit.emoji}</span>
          <span className="text-sm font-medium text-white truncate">{habit.name}</span>
        </div>
        {currentStreak > 0 && (
          <span className="text-xs text-vapor-cyan whitespace-nowrap">🔥{currentStreak}</span>
        )}
      </div>

      {/* Timer display for duration habits with active timer */}
      {activeTimer && formatted && (
        <div className="text-center mb-2">
          <div className="font-mono text-2xl font-bold text-white">
            {formatted.display}
            <span className="text-sm text-vapor-cyan">{formatted.centis}</span>
          </div>
          {/* Comparisons */}
          {(comparisons.vs_previous || comparisons.vs_best) && (
            <div className="flex justify-center gap-3 text-[10px] mt-1">
              {comparisons.vs_previous && (
                <span className={comparisons.vs_previous.isAhead ? 'text-green-400' : 'text-red-400'}>
                  vorige: {comparisons.vs_previous.isAhead ? '+' : '-'}
                  {formatElapsedTime(Math.abs(comparisons.vs_previous.diff)).display}
                </span>
              )}
              {comparisons.vs_best && (
                <span className={comparisons.vs_best.isAhead ? 'text-green-400' : 'text-vapor-gold'}>
                  beste: {comparisons.vs_best.isAhead ? '+' : '-'}
                  {formatElapsedTime(Math.abs(comparisons.vs_best.diff)).display}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Race visualization */}
      {positions.length > 0 && (
        <div className="flex-1 flex flex-col justify-center" onClick={onClick}>
          <div className="flex flex-wrap gap-0.5 mb-1">
            {positions.slice(0, 10).map((pos, index) => {
              const isAhead = pos.position < currentPosition;
              const isCurrent = pos.isCurrent || pos.position === currentPosition;
              const isPR = pos.isPersonalRecord;

              let bgColor = 'bg-green-500';
              if (isAhead) bgColor = 'bg-red-500';
              else if (isCurrent) bgColor = 'bg-yellow-400';

              return (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-sm ${bgColor} ${isPR ? 'ring-1 ring-vapor-gold' : ''} ${isCurrent ? 'animate-pulse' : ''}`}
                />
              );
            })}
            {totalPositions > 10 && (
              <span className="text-[10px] text-white/40 self-center">+{totalPositions - 10}</span>
            )}
          </div>
          <div className="text-[10px] text-white/50">
            {totalPositions > 0 ? (
              <>#{currentPosition}/{totalPositions} {raceInfoText && <span className="text-vapor-cyan">{raceInfoText}</span>}</>
            ) : (
              'Start je eerste poging'
            )}
          </div>
        </div>
      )}

      {/* No race data yet */}
      {positions.length === 0 && !activeTimer && (
        <div className="flex-1 flex items-center justify-center text-[10px] text-white/30" onClick={onClick}>
          Nog geen data
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-1 mt-2">
        {isBoolean ? (
          // Boolean habit: simple check button
          <button
            onClick={(e) => { e.stopPropagation(); onQuickCheckIn(); }}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
              isCompleted
                ? 'bg-green-500/30 text-green-400'
                : 'bg-vapor-darker/50 text-white/60 hover:text-white'
            }`}
          >
            <Check className="w-3 h-3" />
            {isCompleted ? 'Gedaan' : 'Check'}
          </button>
        ) : isDuration ? (
          // Duration habit: timer controls
          activeTimer ? (
            <>
              {activeTimer.isRunning ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onPauseTimer(); }}
                  className="flex-1 py-2 bg-yellow-500/20 rounded-lg text-yellow-400 text-xs font-medium flex items-center justify-center gap-1"
                >
                  <Pause className="w-3 h-3" />
                </button>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); onResumeTimer(); }}
                  className="flex-1 py-2 bg-green-500/20 rounded-lg text-green-400 text-xs font-medium flex items-center justify-center gap-1"
                >
                  <Play className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onSaveTimer(elapsedMs); }}
                className="flex-1 py-2 bg-vapor-cyan/20 rounded-lg text-vapor-cyan text-xs font-medium flex items-center justify-center gap-1"
              >
                <Square className="w-3 h-3" />
              </button>
              {showDeleteConfirm ? (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteTimer(); setShowDeleteConfirm(false); }}
                    className="px-2 py-2 bg-red-500 rounded-lg text-white text-xs"
                  >
                    Ja
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                    className="px-2 py-2 bg-vapor-darker rounded-lg text-white/60 text-xs"
                  >
                    Nee
                  </button>
                </>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                  className="px-2 py-2 bg-red-500/20 rounded-lg text-red-400 text-xs"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onStartTimer(); }}
              className="flex-1 py-2 bg-green-500/20 rounded-lg text-green-400 text-xs font-medium flex items-center justify-center gap-1"
            >
              <Play className="w-3 h-3" />
              Start
            </button>
          )
        ) : (
          // Other quantifiable: just a click to open detail
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="flex-1 py-2 bg-vapor-darker/50 rounded-lg text-white/60 text-xs font-medium"
          >
            Invullen
          </button>
        )}
      </div>
    </motion.div>
  );
}
