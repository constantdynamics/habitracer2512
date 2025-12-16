import { useState, useEffect, useMemo } from 'react';
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
    }, 100);

    return () => clearInterval(interval);
  }, [activeTimer]);

  const formatted = activeTimer ? formatElapsedTime(elapsedMs) : null;

  // Convert elapsed ms to minutes for comparison
  const currentMinutes = elapsedMs / 1000 / 60;

  // Calculate LIVE race position based on current timer value
  const liveRaceData = useMemo(() => {
    if (!raceData || !isDuration || !activeTimer) {
      return {
        positions: raceData?.positions || [],
        currentPosition: raceData?.currentPosition || 0,
        totalPositions: raceData?.totalPositions || 0,
        nextTarget: raceData?.nextTarget,
        distanceToNext: null as number | null,
        distanceToBest: null as number | null,
      };
    }

    const positions = raceData.positions || [];
    if (positions.length === 0) {
      return {
        positions: [],
        currentPosition: 1,
        totalPositions: 1,
        nextTarget: undefined,
        distanceToNext: null,
        distanceToBest: null,
      };
    }

    // Find where current timer value would rank
    let livePosition = positions.length + 1; // Start at last position
    for (let i = 0; i < positions.length; i++) {
      const posValue = positions[i].value;
      if (habit.direction === 'maximize') {
        if (currentMinutes >= posValue) {
          livePosition = i + 1;
          break;
        }
      } else {
        if (currentMinutes <= posValue) {
          livePosition = i + 1;
          break;
        }
      }
    }

    // Calculate distance to next position (the one we're trying to beat)
    let distanceToNext: number | null = null;
    let nextTarget = raceData.nextTarget;

    if (livePosition > 1) {
      const nextPos = positions[livePosition - 2]; // -2 because: -1 for 0-index, -1 for next position
      if (nextPos) {
        const nextValueMs = nextPos.value * 60 * 1000;
        distanceToNext = nextValueMs - elapsedMs;
        nextTarget = {
          value: nextPos.value,
          position: livePosition - 1,
          estimatedDate: undefined,
        };
      }
    }

    // Calculate distance to best (PR)
    let distanceToBest: number | null = null;
    if (positions.length > 0) {
      const bestValue = positions[0].value;
      const bestValueMs = bestValue * 60 * 1000;
      distanceToBest = bestValueMs - elapsedMs;
    }

    return {
      positions,
      currentPosition: Math.min(livePosition, positions.length + 1),
      totalPositions: positions.length + 1, // +1 for current attempt
      nextTarget,
      distanceToNext,
      distanceToBest,
    };
  }, [raceData, isDuration, activeTimer, currentMinutes, elapsedMs, habit.direction]);

  // Calculate comparisons for duration habits
  const getComparisons = () => {
    if (!isDuration || !activeTimer) return { vs_previous: null, vs_best: null };

    const prevMs = previousEntry ? previousEntry.value * 60 * 1000 : 0;
    const bestMs = previousBest ? previousBest * 60 * 1000 : 0;

    const showPrevious = prevMs > 0 && prevMs !== bestMs;

    return {
      vs_previous: showPrevious ? {
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

  // Use live race data when timer is active, otherwise use stored race data
  const displayPositions = activeTimer && isDuration ? liveRaceData.positions : (raceData?.positions || []);
  const displayCurrentPosition = activeTimer && isDuration ? liveRaceData.currentPosition : (raceData?.currentPosition || 0);
  const displayTotalPositions = activeTimer && isDuration ? liveRaceData.totalPositions : (raceData?.totalPositions || 0);

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

  // Progress bar calculation for timer habits
  const progressToNext = useMemo(() => {
    if (!activeTimer || !isDuration || !liveRaceData.nextTarget) return null;

    const targetMs = liveRaceData.nextTarget.value * 60 * 1000;
    if (targetMs <= 0) return null;

    const progress = Math.min((elapsedMs / targetMs) * 100, 100);
    return progress;
  }, [activeTimer, isDuration, liveRaceData.nextTarget, elapsedMs]);

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

          {/* Live distance indicators */}
          {(liveRaceData.distanceToNext !== null || liveRaceData.distanceToBest !== null) && (
            <div className="flex justify-center gap-3 text-[10px] mt-1">
              {liveRaceData.distanceToNext !== null && liveRaceData.distanceToNext > 0 && (
                <span className="text-yellow-400">
                  #{displayCurrentPosition - 1}: {formatElapsedTime(liveRaceData.distanceToNext).display}
                </span>
              )}
              {liveRaceData.distanceToBest !== null && liveRaceData.distanceToBest > 0 && (
                <span className="text-vapor-gold">
                  PR: {formatElapsedTime(liveRaceData.distanceToBest).display}
                </span>
              )}
              {liveRaceData.distanceToBest !== null && liveRaceData.distanceToBest <= 0 && (
                <span className="text-green-400 font-bold animate-pulse">
                  🏆 NIEUW PR!
                </span>
              )}
            </div>
          )}

          {/* Fallback to old comparisons if no live data */}
          {liveRaceData.distanceToNext === null && liveRaceData.distanceToBest === null && (comparisons.vs_previous || comparisons.vs_best) && (
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

          {/* Progress bar to next position */}
          {progressToNext !== null && displayCurrentPosition > 1 && (
            <div className="mt-2 px-1">
              <div className="h-1.5 bg-vapor-darker rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-vapor-pink to-vapor-cyan"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressToNext}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <div className="text-[9px] text-white/40 mt-0.5 text-center">
                {progressToNext.toFixed(0)}% naar #{displayCurrentPosition - 1}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Race visualization - blocks ordered best (left) to worst (right) */}
      {displayPositions.length > 0 && (
        <div className="flex-1 flex flex-col justify-center" onClick={onClick}>
          <div className="flex flex-wrap gap-1 mb-1">
            {displayPositions.slice(0, 10).map((pos, index) => {
              // During active timer: calculate live position
              // Green = verslagen (huidige positie is beter dan dit blokje)
              // Red = nog voor ons (dit blokje is beter dan huidige positie)
              // Yellow = huidige positie
              const positionNumber = index + 1;
              const isPR = pos.isPersonalRecord;

              // When timer is active, use live position
              const isCurrentPosition = activeTimer && isDuration
                ? positionNumber === displayCurrentPosition
                : pos.isCurrent;

              const isAheadOfUs = activeTimer && isDuration
                ? positionNumber < displayCurrentPosition
                : positionNumber < displayCurrentPosition;

              let bgColor = 'bg-green-500'; // Verslagen
              if (isCurrentPosition) {
                bgColor = 'bg-yellow-400';
              } else if (isAheadOfUs) {
                bgColor = 'bg-red-500'; // Nog voor ons
              }

              return (
                <div
                  key={index}
                  className={`w-5 h-5 rounded-sm ${bgColor} ${isPR ? 'ring-1 ring-vapor-gold' : ''} ${isCurrentPosition ? 'ring-2 ring-white animate-pulse' : ''}`}
                  title={`#${positionNumber}: ${pos.value.toFixed(1)} min`}
                />
              );
            })}
            {/* Show current attempt as separate block when timer active */}
            {activeTimer && isDuration && displayCurrentPosition > displayPositions.length && (
              <div
                className="w-5 h-5 rounded-sm bg-yellow-400 ring-2 ring-white animate-pulse"
                title={`Huidige: ${currentMinutes.toFixed(1)} min`}
              />
            )}
            {displayTotalPositions > 10 && (
              <span className="text-[10px] text-white/40 self-center">+{displayTotalPositions - 10}</span>
            )}
          </div>
          <div className="text-[10px] text-white/50">
            {displayTotalPositions > 0 ? (
              <>
                #{displayCurrentPosition}/{displayTotalPositions}
                {raceInfoText && <span className="text-vapor-cyan ml-1">{raceInfoText}</span>}
                {activeTimer && isDuration && displayCurrentPosition === 1 && (
                  <span className="text-green-400 ml-1">🏆 Leidt!</span>
                )}
              </>
            ) : (
              'Start je eerste poging'
            )}
          </div>
        </div>
      )}

      {/* No race data yet - but show placeholder blocks during timer */}
      {displayPositions.length === 0 && activeTimer && isDuration && (
        <div className="flex-1 flex flex-col justify-center" onClick={onClick}>
          <div className="flex gap-1 mb-1">
            <div className="w-5 h-5 rounded-sm bg-yellow-400 ring-2 ring-white animate-pulse" />
          </div>
          <div className="text-[10px] text-white/50">
            #1/1 - Eerste poging!
          </div>
        </div>
      )}

      {/* No race data yet */}
      {displayPositions.length === 0 && !activeTimer && (
        <div className="flex-1 flex items-center justify-center text-[10px] text-white/30" onClick={onClick}>
          Nog geen data
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-1 mt-2">
        {isBoolean ? (
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
