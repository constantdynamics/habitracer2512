import { useState, useEffect, useMemo, useRef } from 'react';
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
  personalRecord?: number;
  averageValue?: number;
  recentEntries?: number[]; // Last 5 entries for sparkline
  onQuickCheckIn: () => void;
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onSaveTimer: (elapsedMs: number) => void;
  onDeleteTimer: () => void;
  onClick: () => void;
}

// Helper: format time difference like cycling/skating (+1:23 or -0:42)
function formatTimeDiff(diffMs: number): string {
  const isNegative = diffMs < 0;
  const absMs = Math.abs(diffMs);
  const totalSeconds = Math.floor(absMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const prefix = isNegative ? '-' : '+';
  return `${prefix}${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Helper: get color based on position relative to current
function getPositionColor(position: number, totalPositions: number): { bg: string; text: string } {
  if (totalPositions <= 1) return { bg: 'bg-green-500', text: 'text-green-400' };

  const ratio = (position - 1) / (totalPositions - 1);

  if (ratio <= 0.33) {
    return { bg: 'bg-green-500', text: 'text-green-400' };
  } else if (ratio <= 0.66) {
    return { bg: 'bg-yellow-500', text: 'text-yellow-400' };
  } else {
    return { bg: 'bg-red-500', text: 'text-red-400' };
  }
}

// Mini sparkline component
function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 100" className={`${className} overflow-visible`} preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="url(#sparkGradient)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="sparkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Confetti burst component
function ConfettiBurst({ show }: { show: boolean }) {
  if (!show) return null;

  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: (i / 12) * 360,
    delay: Math.random() * 0.2,
    color: ['#22c55e', '#eab308', '#ef4444', '#00f5d4', '#ff6b9d'][i % 5],
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-2 h-2 rounded-full"
          style={{
            backgroundColor: p.color,
            left: '50%',
            top: '50%',
          }}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          animate={{
            x: Math.cos(p.angle * Math.PI / 180) * 80,
            y: Math.sin(p.angle * Math.PI / 180) * 80,
            scale: 0,
            opacity: 0,
          }}
          transition={{ duration: 0.8, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

// Horizontal race track with proportional spacing
// Left = worst (red), Right = PR (green), You = yellow/white pulsing
function HorizontalRaceTrack({
  positions,
  currentPosition,
  currentValue,
  isNearNext,
}: {
  positions: RaceData['positions'];
  currentPosition: number;
  currentValue: number;
  isNearNext: boolean;
}) {
  const MAX_BLOCKS = 5;

  // Calculate which positions to show and their proportional positions
  const trackData = useMemo(() => {
    if (positions.length === 0) return { blocks: [], youPosition: 50 };

    // Get all values including current attempt
    const allValues = positions.map(p => p.value);
    const minValue = Math.min(...allValues, currentValue);
    const maxValue = Math.max(...allValues, currentValue);
    const range = maxValue - minValue || 1;

    // Select which positions to display (max 5)
    let displayPositions = [...positions];
    if (positions.length > MAX_BLOCKS) {
      // Show: worst, some middle ones around current, best
      const relevantIndices = new Set<number>();
      relevantIndices.add(0); // Best (PR)
      relevantIndices.add(positions.length - 1); // Worst

      // Add positions around current
      const currentIdx = currentPosition - 1;
      for (let i = Math.max(0, currentIdx - 1); i <= Math.min(positions.length - 1, currentIdx + 1); i++) {
        relevantIndices.add(i);
      }

      // Convert to array and sort
      const indices = Array.from(relevantIndices).sort((a, b) => a - b).slice(0, MAX_BLOCKS);
      displayPositions = indices.map(i => positions[i]);
    }

    // Calculate proportional x positions (0-100)
    // Left = worst (highest value for maximize), Right = best (PR)
    const blocks = displayPositions.map((pos) => {
      const originalIndex = positions.findIndex(p => p.value === pos.value && p.date === pos.date);
      const posNumber = originalIndex + 1;

      // x position: 0 = worst, 100 = best
      // For maximize: higher value = better = more to the right
      const xPercent = ((pos.value - minValue) / range) * 100;

      const isBetterThanCurrent = posNumber < currentPosition;
      const isWorseThanCurrent = posNumber > currentPosition;

      return {
        posNumber,
        value: pos.value,
        xPercent,
        isPR: pos.isPersonalRecord,
        isBetterThanCurrent,
        isWorseThanCurrent,
      };
    });

    // Calculate "you" position
    const youXPercent = ((currentValue - minValue) / range) * 100;

    return { blocks, youPosition: youXPercent };
  }, [positions, currentPosition, currentValue]);

  if (positions.length === 0) {
    return (
      <div className="w-full h-10 flex items-center justify-center">
        <div className="text-sm text-white/40">Eerste poging!</div>
      </div>
    );
  }

  return (
    <div className="w-full px-2 py-3 relative">
      {/* Track line */}
      <div className="absolute left-2 right-2 top-1/2 h-1 bg-white/10 rounded-full transform -translate-y-1/2" />

      {/* Gradient overlay on track */}
      <div
        className="absolute left-2 right-2 top-1/2 h-1 rounded-full transform -translate-y-1/2"
        style={{
          background: 'linear-gradient(to right, #ef4444 0%, #eab308 50%, #22c55e 100%)',
          opacity: 0.3,
        }}
      />

      {/* Position blocks */}
      {trackData.blocks.map((block) => {
        let bgColor = 'bg-green-500'; // Better than current
        if (block.isWorseThanCurrent) bgColor = 'bg-red-500';

        return (
          <div
            key={`block-${block.posNumber}`}
            className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2"
            style={{ left: `calc(${block.xPercent}% * 0.9 + 5%)` }}
          >
            <div
              className={`w-6 h-6 rounded ${bgColor} flex items-center justify-center shadow-md ${block.isPR ? 'ring-2 ring-yellow-300' : ''}`}
            >
              <span className="text-[9px] font-bold text-white">{block.posNumber}</span>
            </div>
          </div>
        );
      })}

      {/* "You" marker - larger, pulsing yellow/white */}
      <motion.div
        className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 z-10"
        style={{ left: `calc(${trackData.youPosition}% * 0.9 + 5%)` }}
        animate={isNearNext ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 0.3, repeat: Infinity }}
      >
        <motion.div
          className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg"
          animate={{
            backgroundColor: ['#facc15', '#ffffff', '#facc15'],
            boxShadow: [
              '0 0 0 0 rgba(250, 204, 21, 0.4)',
              '0 0 0 8px rgba(255, 255, 255, 0)',
              '0 0 0 0 rgba(250, 204, 21, 0.4)',
            ],
          }}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          <span className="text-xs font-black text-gray-900">JIJ</span>
        </motion.div>
      </motion.div>

      {/* Labels */}
      <div className="absolute -bottom-4 left-2 text-[8px] text-red-400/60">slechtst</div>
      <div className="absolute -bottom-4 right-2 text-[8px] text-green-400/60">PR</div>
    </div>
  );
}

// Motivational text based on race state
function MotivationalText({
  position,
  distanceToNext,
  distanceToBest,
  isNearNext,
  isNewPR,
}: {
  position: number;
  distanceToNext: number | null;
  distanceToBest: number | null;
  isNearNext: boolean;
  isNewPR: boolean;
}) {
  if (isNewPR) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="text-center"
      >
        <span className="text-green-400 font-bold text-sm animate-pulse">
          🏁 Nieuwe PR onderweg! 🔥
        </span>
      </motion.div>
    );
  }

  if (position === 1) {
    return (
      <div className="text-center">
        <span className="text-green-400 font-bold text-sm">
          Leidt! 🏆 {distanceToBest !== null && distanceToBest < 0 && (
            <span className="text-vapor-gold">+{formatTimeDiff(Math.abs(distanceToBest))} op PR</span>
          )}
        </span>
      </div>
    );
  }

  if (isNearNext && distanceToNext !== null) {
    return (
      <motion.div
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        className="text-center"
      >
        <span className="text-yellow-400 font-bold text-sm">
          Je haalt #{position - 1} in! Nog {formatTimeDiff(distanceToNext)}
        </span>
      </motion.div>
    );
  }

  if (distanceToNext !== null && distanceToNext > 0) {
    const nextPos = position - 1;
    const minutes = Math.floor(distanceToNext / 60000);
    const seconds = Math.floor((distanceToNext % 60000) / 1000);

    if (minutes < 1) {
      return (
        <div className="text-center">
          <span className="text-yellow-400 font-medium text-sm">
            Push door! Nog {seconds} sec naar #{nextPos}!
          </span>
        </div>
      );
    }

    return (
      <div className="text-center">
        <span className="text-white/70 text-sm">
          Nog {minutes}:{seconds.toString().padStart(2, '0')} naar #{nextPos}
        </span>
      </div>
    );
  }

  return null;
}

export function RaceTile({
  habit,
  raceData,
  todayEntry,
  currentStreak,
  activeTimer,
  personalRecord,
  averageValue,
  recentEntries,
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
  const [showConfetti, setShowConfetti] = useState(false);
  const lastPositionRef = useRef<number | null>(null);

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
        progressPercent: 0,
        isNearNext: false,
        isNewPR: false,
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
        progressPercent: 0,
        isNearNext: false,
        isNewPR: true,
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
    let progressPercent = 0;
    let isNearNext = false;

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

        const prevPos = positions[livePosition - 1];
        if (prevPos) {
          const prevValueMs = prevPos.value * 60 * 1000;
          const range = nextValueMs - prevValueMs;
          if (range > 0) {
            progressPercent = ((elapsedMs - prevValueMs) / range) * 100;
            isNearNext = progressPercent >= 90;
          }
        } else {
          progressPercent = (elapsedMs / nextValueMs) * 100;
          isNearNext = progressPercent >= 90;
        }
      }
    } else {
      progressPercent = 100;
    }

    let distanceToBest: number | null = null;
    let isNewPR = false;
    if (positions.length > 0) {
      const bestValue = positions[0].value;
      const bestValueMs = bestValue * 60 * 1000;
      distanceToBest = bestValueMs - elapsedMs;
      isNewPR = distanceToBest <= 0;
    }

    return {
      positions,
      currentPosition: Math.min(livePosition, positions.length + 1),
      totalPositions: positions.length + 1,
      nextTarget,
      distanceToNext,
      distanceToBest,
      progressPercent: Math.max(0, Math.min(progressPercent, 100)),
      isNearNext,
      isNewPR,
    };
  }, [raceData, isDuration, activeTimer, currentMinutes, elapsedMs, habit.direction]);

  // Track position changes for confetti
  useEffect(() => {
    const currentPos = liveRaceData.currentPosition;
    if (lastPositionRef.current !== null && lastPositionRef.current !== currentPos) {
      if (currentPos < lastPositionRef.current) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 1000);
      }
    }
    lastPositionRef.current = currentPos;
  }, [liveRaceData.currentPosition]);

  const displayPositions = activeTimer && isDuration ? liveRaceData.positions : (raceData?.positions || []);
  const displayCurrentPosition = activeTimer && isDuration ? liveRaceData.currentPosition : (raceData?.currentPosition || 0);
  const displayTotalPositions = activeTimer && isDuration ? liveRaceData.totalPositions : (raceData?.totalPositions || 0);

  const showRaceTrack = activeTimer && isDuration;

  // Dynamic border color based on state
  let borderClass = 'border-white/10';
  if (activeTimer) {
    borderClass = 'border-yellow-500/50';
  } else if (isCompleted) {
    borderClass = 'border-vapor-cyan/30';
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative bg-gradient-to-br from-vapor-dark/90 to-vapor-darker/90 rounded-xl p-4 border-2 ${borderClass} flex flex-col min-h-[200px]`}
    >
      {/* Confetti on position pass */}
      <ConfettiBurst show={showConfetti} />

      {/* Header row */}
      <div className="flex items-start justify-between mb-2 relative z-10" onClick={onClick}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-2xl">{habit.emoji}</span>
          <span className="text-base font-semibold text-white truncate">{habit.name}</span>
        </div>

        {/* Position badge during race */}
        {showRaceTrack && (
          <div className={`px-2 py-0.5 rounded text-sm font-bold ${
            displayCurrentPosition === 1 ? 'bg-green-500 text-white' :
            displayCurrentPosition <= 3 ? 'bg-yellow-500 text-gray-900' :
            'bg-red-500 text-white'
          }`}>
            P{displayCurrentPosition}
          </div>
        )}

        {!showRaceTrack && currentStreak > 0 && (
          <span className="text-sm text-vapor-cyan whitespace-nowrap font-medium">🔥{currentStreak}</span>
        )}
      </div>

      {/* Timer display */}
      {activeTimer && formatted && (
        <div className="text-center mb-2 relative z-10">
          <div className="font-mono text-3xl font-bold text-white">
            {formatted.display}
            <span className="text-base text-vapor-cyan">{formatted.centis}</span>
          </div>

          {/* Time differences */}
          <div className="flex justify-center gap-4 text-sm mt-1">
            {liveRaceData.distanceToNext !== null && liveRaceData.distanceToNext > 0 && (
              <span className={`font-mono font-bold ${liveRaceData.isNearNext ? 'text-yellow-400 animate-pulse' : 'text-white/70'}`}>
                #{displayCurrentPosition - 1}: {formatTimeDiff(liveRaceData.distanceToNext)}
              </span>
            )}
            {liveRaceData.distanceToBest !== null && (
              <span className={`font-mono font-bold ${liveRaceData.isNewPR ? 'text-green-400' : 'text-vapor-gold'}`}>
                {liveRaceData.isNewPR ? '🏁 PR!' : `PR: ${formatTimeDiff(liveRaceData.distanceToBest)}`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Horizontal race track during timer */}
      {showRaceTrack && (
        <div className="relative z-10 mb-2">
          <HorizontalRaceTrack
            positions={displayPositions}
            currentPosition={displayCurrentPosition}
            currentValue={currentMinutes}
            isNearNext={liveRaceData.isNearNext}
          />
        </div>
      )}

      {/* Motivational text */}
      {showRaceTrack && (
        <div className="relative z-10 mb-2">
          <MotivationalText
            position={displayCurrentPosition}
            distanceToNext={liveRaceData.distanceToNext}
            distanceToBest={liveRaceData.distanceToBest}
            isNearNext={liveRaceData.isNearNext}
            isNewPR={liveRaceData.isNewPR}
          />
        </div>
      )}

      {/* Center content area (when no timer) */}
      <div className="flex-1 flex items-center justify-center relative z-10" onClick={onClick}>
        {/* Race blocks (when not timing) */}
        {!showRaceTrack && displayPositions.length > 0 && (
          <div className="flex flex-col items-center">
            <div className="flex flex-wrap gap-1.5 mb-2 justify-center">
              {displayPositions.slice(0, 10).map((pos, index) => {
                const positionNumber = index + 1;
                const isPR = pos.isPersonalRecord;
                const isCurrentPosition = pos.isCurrent;
                const colors = getPositionColor(positionNumber, displayPositions.length);

                return (
                  <div
                    key={index}
                    className={`w-6 h-6 rounded flex items-center justify-center ${colors.bg} ${isPR ? 'ring-1 ring-vapor-gold' : ''} ${isCurrentPosition ? 'ring-2 ring-white' : ''}`}
                    title={`#${positionNumber}: ${pos.value.toFixed(1)} min`}
                  >
                    <span className="text-[10px] font-bold text-white">{positionNumber}</span>
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-white/60 font-medium">
              #{displayCurrentPosition}/{displayTotalPositions}
            </div>
          </div>
        )}

        {/* No data state */}
        {displayPositions.length === 0 && !activeTimer && (
          <div className="text-xs text-white/40">Nog geen data</div>
        )}

        {/* First attempt */}
        {displayPositions.length === 0 && activeTimer && isDuration && (
          <div className="text-center">
            <div className="text-2xl font-bold text-vapor-cyan">#1</div>
            <div className="text-sm text-white/60">Eerste poging! 🚀</div>
          </div>
        )}
      </div>

      {/* Stats strip */}
      {(personalRecord || averageValue || currentStreak > 0) && !showRaceTrack && (
        <div className="flex items-center justify-center gap-3 text-[10px] text-white/50 mb-2 relative z-10">
          {personalRecord && (
            <span>🏆 PR: {personalRecord.toFixed(1)}</span>
          )}
          {averageValue && (
            <span>⚡ Gem: {averageValue.toFixed(1)}</span>
          )}
          {currentStreak > 0 && (
            <span>🔥 {currentStreak}d</span>
          )}
        </div>
      )}

      {/* Mini sparkline */}
      {recentEntries && recentEntries.length >= 2 && !showRaceTrack && (
        <div className="h-4 mb-2 relative z-10">
          <Sparkline values={recentEntries} className="w-full h-full" />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-1.5 mt-auto relative z-10">
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
