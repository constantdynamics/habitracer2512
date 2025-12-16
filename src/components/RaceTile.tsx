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

// Circuit track component that wraps around the tile
function CircuitTrack({
  positions,
  currentPosition,
  isRunning
}: {
  positions: RaceData['positions'];
  currentPosition: number;
  totalPositions: number;
  isRunning: boolean;
}) {
  const positionCount = Math.min(positions.length + 1, 10); // +1 for current attempt

  const getTrackPosition = (index: number, total: number) => {
    // Distribute positions evenly around the track
    const percentage = (index / total) * 100;

    // Convert to position around rectangle (clockwise from top-left)
    // Top: 0-25%, Right: 25-50%, Bottom: 50-75%, Left: 75-100%
    if (percentage <= 25) {
      // Top edge (left to right)
      return { top: '0%', left: `${percentage * 4}%`, transform: 'translate(-50%, -50%)' };
    } else if (percentage <= 50) {
      // Right edge (top to bottom)
      return { top: `${(percentage - 25) * 4}%`, right: '0%', transform: 'translate(50%, -50%)' };
    } else if (percentage <= 75) {
      // Bottom edge (right to left)
      return { bottom: '0%', right: `${(percentage - 50) * 4}%`, transform: 'translate(50%, 50%)' };
    } else {
      // Left edge (bottom to top)
      return { bottom: `${(percentage - 75) * 4}%`, left: '0%', transform: 'translate(-50%, 50%)' };
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Track line */}
      <div className="absolute inset-2 rounded-xl border-2 border-white/10" />

      {/* Position markers */}
      {positions.slice(0, 8).map((pos, index) => {
        const positionNumber = index + 1;
        const isCurrentPos = positionNumber === currentPosition;
        const isAhead = positionNumber < currentPosition;
        const isPR = pos.isPersonalRecord;

        let bgColor = 'bg-green-500'; // Verslagen
        if (isCurrentPos) bgColor = 'bg-yellow-400';
        else if (isAhead) bgColor = 'bg-red-500';

        const style = getTrackPosition(index, positionCount);

        return (
          <motion.div
            key={index}
            className={`absolute w-3 h-3 rounded-full ${bgColor} ${isPR ? 'ring-1 ring-vapor-gold' : ''} ${isCurrentPos && isRunning ? 'animate-pulse ring-2 ring-white' : ''}`}
            style={style}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.05 }}
          />
        );
      })}

      {/* Current attempt marker if not in positions */}
      {currentPosition > positions.length && (
        <motion.div
          className="absolute w-3 h-3 rounded-full bg-yellow-400 ring-2 ring-white animate-pulse"
          style={getTrackPosition(positions.length, positionCount)}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        />
      )}
    </div>
  );
}

export function RaceTile({
  habit,
  raceData,
  todayEntry,
  currentStreak,
  activeTimer,
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

    let livePosition = positions.length + 1;
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

    let distanceToNext: number | null = null;
    let nextTarget = raceData.nextTarget;

    if (livePosition > 1) {
      const nextPos = positions[livePosition - 2];
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

    let distanceToBest: number | null = null;
    if (positions.length > 0) {
      const bestValue = positions[0].value;
      const bestValueMs = bestValue * 60 * 1000;
      distanceToBest = bestValueMs - elapsedMs;
    }

    return {
      positions,
      currentPosition: Math.min(livePosition, positions.length + 1),
      totalPositions: positions.length + 1,
      nextTarget,
      distanceToNext,
      distanceToBest,
    };
  }, [raceData, isDuration, activeTimer, currentMinutes, elapsedMs, habit.direction]);

  const displayPositions = activeTimer && isDuration ? liveRaceData.positions : (raceData?.positions || []);
  const displayCurrentPosition = activeTimer && isDuration ? liveRaceData.currentPosition : (raceData?.currentPosition || 0);
  const displayTotalPositions = activeTimer && isDuration ? liveRaceData.totalPositions : (raceData?.totalPositions || 0);

  // Progress bar calculation
  const progressToNext = useMemo(() => {
    if (!activeTimer || !isDuration || !liveRaceData.nextTarget) return null;
    const targetMs = liveRaceData.nextTarget.value * 60 * 1000;
    if (targetMs <= 0) return null;
    return Math.min((elapsedMs / targetMs) * 100, 100);
  }, [activeTimer, isDuration, liveRaceData.nextTarget, elapsedMs]);

  // Tile border color
  let borderColor = 'border-white/10';
  if (activeTimer?.isRunning) {
    borderColor = 'border-green-500/50';
  } else if (activeTimer) {
    borderColor = 'border-yellow-500/50';
  } else if (isCompleted) {
    borderColor = 'border-vapor-cyan/30';
  }

  const showCircuitTrack = activeTimer && isDuration && displayPositions.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative bg-gradient-to-br from-vapor-dark/90 to-vapor-darker/90 rounded-xl p-4 border-2 ${borderColor} flex flex-col min-h-[160px]`}
    >
      {/* Circuit track visualization during active timer */}
      {showCircuitTrack && (
        <CircuitTrack
          positions={displayPositions}
          currentPosition={displayCurrentPosition}
          totalPositions={displayTotalPositions}
          isRunning={activeTimer?.isRunning || false}
        />
      )}

      {/* Header row */}
      <div className="flex items-start justify-between mb-2 relative z-10" onClick={onClick}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-2xl">{habit.emoji}</span>
          <span className="text-base font-semibold text-white truncate">{habit.name}</span>
        </div>
        {currentStreak > 0 && (
          <span className="text-sm text-vapor-cyan whitespace-nowrap font-medium">🔥{currentStreak}</span>
        )}
      </div>

      {/* Timer display */}
      {activeTimer && formatted && (
        <div className="text-center mb-3 relative z-10">
          <div className="font-mono text-3xl font-bold text-white">
            {formatted.display}
            <span className="text-base text-vapor-cyan">{formatted.centis}</span>
          </div>

          {/* Live distance indicators */}
          {(liveRaceData.distanceToNext !== null || liveRaceData.distanceToBest !== null) && (
            <div className="flex justify-center gap-4 text-xs mt-2">
              {liveRaceData.distanceToNext !== null && liveRaceData.distanceToNext > 0 && (
                <span className="text-yellow-400 font-medium">
                  #{displayCurrentPosition - 1}: {formatElapsedTime(liveRaceData.distanceToNext).display}
                </span>
              )}
              {liveRaceData.distanceToBest !== null && liveRaceData.distanceToBest > 0 && (
                <span className="text-vapor-gold font-medium">
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

          {/* Progress bar */}
          {progressToNext !== null && displayCurrentPosition > 1 && (
            <div className="mt-3 px-2">
              <div className="h-2 bg-vapor-darker rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-vapor-pink to-vapor-cyan"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressToNext}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <div className="text-[10px] text-white/50 mt-1 text-center">
                {progressToNext.toFixed(0)}% naar #{displayCurrentPosition - 1}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Race blocks in center (when not using circuit view) */}
      {!showCircuitTrack && displayPositions.length > 0 && (
        <div className="flex-1 flex flex-col justify-center relative z-10" onClick={onClick}>
          <div className="flex flex-wrap gap-1.5 mb-2 justify-center">
            {displayPositions.slice(0, 10).map((pos, index) => {
              const positionNumber = index + 1;
              const isPR = pos.isPersonalRecord;
              const isCurrentPosition = pos.isCurrent;
              const isAheadOfUs = positionNumber < displayCurrentPosition;

              let bgColor = 'bg-green-500';
              if (isCurrentPosition) bgColor = 'bg-yellow-400';
              else if (isAheadOfUs) bgColor = 'bg-red-500';

              return (
                <div
                  key={index}
                  className={`w-5 h-5 rounded-sm ${bgColor} ${isPR ? 'ring-1 ring-vapor-gold' : ''} ${isCurrentPosition ? 'ring-2 ring-white animate-pulse' : ''}`}
                  title={`#${positionNumber}: ${pos.value.toFixed(1)} min`}
                />
              );
            })}
            {displayTotalPositions > 10 && (
              <span className="text-xs text-white/40 self-center ml-1">+{displayTotalPositions - 10}</span>
            )}
          </div>
          <div className="text-xs text-white/60 text-center font-medium">
            #{displayCurrentPosition}/{displayTotalPositions}
          </div>
        </div>
      )}

      {/* Position indicator when circuit is shown */}
      {showCircuitTrack && (
        <div className="flex-1 flex items-center justify-center relative z-10" onClick={onClick}>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              #{displayCurrentPosition}
            </div>
            <div className="text-xs text-white/50">
              van {displayTotalPositions}
            </div>
            {displayCurrentPosition === 1 && (
              <div className="text-sm text-green-400 font-medium mt-1">🏆 Leidt!</div>
            )}
          </div>
        </div>
      )}

      {/* No race data state */}
      {displayPositions.length === 0 && !activeTimer && (
        <div className="flex-1 flex items-center justify-center text-xs text-white/40 relative z-10" onClick={onClick}>
          Nog geen data
        </div>
      )}

      {/* First attempt during timer */}
      {displayPositions.length === 0 && activeTimer && isDuration && (
        <div className="flex-1 flex items-center justify-center relative z-10" onClick={onClick}>
          <div className="text-center">
            <div className="text-xl font-bold text-vapor-cyan">#1</div>
            <div className="text-xs text-white/50">Eerste poging!</div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-1.5 mt-3 relative z-10">
        {isBoolean ? (
          <button
            onClick={(e) => { e.stopPropagation(); onQuickCheckIn(); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              isCompleted
                ? 'bg-green-500/30 text-green-400'
                : 'bg-vapor-darker/50 text-white/70 hover:text-white'
            }`}
          >
            <Check className="w-4 h-4" />
            {isCompleted ? 'Gedaan' : 'Check'}
          </button>
        ) : isDuration ? (
          activeTimer ? (
            <>
              {activeTimer.isRunning ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onPauseTimer(); }}
                  className="flex-1 py-2.5 bg-yellow-500/20 rounded-lg text-yellow-400 text-sm font-semibold flex items-center justify-center gap-1"
                >
                  <Pause className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); onResumeTimer(); }}
                  className="flex-1 py-2.5 bg-green-500/20 rounded-lg text-green-400 text-sm font-semibold flex items-center justify-center gap-1"
                >
                  <Play className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onSaveTimer(elapsedMs); }}
                className="flex-1 py-2.5 bg-vapor-cyan/20 rounded-lg text-vapor-cyan text-sm font-semibold flex items-center justify-center gap-1"
              >
                <Square className="w-4 h-4" />
              </button>
              {showDeleteConfirm ? (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteTimer(); setShowDeleteConfirm(false); }}
                    className="px-3 py-2.5 bg-red-500 rounded-lg text-white text-sm font-semibold"
                  >
                    Ja
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                    className="px-3 py-2.5 bg-vapor-darker rounded-lg text-white/60 text-sm"
                  >
                    Nee
                  </button>
                </>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                  className="px-3 py-2.5 bg-red-500/20 rounded-lg text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onStartTimer(); }}
              className="flex-1 py-2.5 bg-green-500/20 rounded-lg text-green-400 text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              <Play className="w-4 h-4" />
              Start
            </button>
          )
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="flex-1 py-2.5 bg-vapor-darker/50 rounded-lg text-white/70 text-sm font-semibold"
          >
            Invullen
          </button>
        )}
      </div>
    </motion.div>
  );
}
