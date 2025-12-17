import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, Trash2, Check, ChevronUp, ChevronDown, Minus } from 'lucide-react';
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

// Helper: get color based on position (green=leading, yellow=middle, red=behind)
function getPositionColor(position: number, totalPositions: number): { bg: string; text: string; glow: string } {
  if (totalPositions <= 1) return { bg: 'bg-green-500', text: 'text-green-400', glow: 'shadow-green-500/50' };

  const ratio = (position - 1) / (totalPositions - 1); // 0 = first, 1 = last

  if (ratio <= 0.33) {
    return { bg: 'bg-green-500', text: 'text-green-400', glow: 'shadow-green-500/50' };
  } else if (ratio <= 0.66) {
    return { bg: 'bg-yellow-500', text: 'text-yellow-400', glow: 'shadow-yellow-500/50' };
  } else {
    return { bg: 'bg-red-500', text: 'text-red-400', glow: 'shadow-red-500/50' };
  }
}

// Helper: get border gradient based on position
function getPositionBorderStyle(position: number, totalPositions: number, progressPercent: number): React.CSSProperties {
  if (totalPositions <= 1) {
    return {
      background: `conic-gradient(from 0deg, #22c55e 0deg, #22c55e ${progressPercent * 3.6}deg, transparent ${progressPercent * 3.6}deg)`,
    };
  }

  const ratio = (position - 1) / (totalPositions - 1);

  // Red -> Yellow -> Green gradient based on position
  let startColor: string, endColor: string;

  if (ratio <= 0.5) {
    // Green to Yellow
    const t = ratio * 2;
    startColor = `rgb(${Math.round(34 + (234 - 34) * t)}, ${Math.round(197 - (197 - 179) * t)}, ${Math.round(94 - (94 - 8) * t)})`;
    endColor = '#22c55e';
  } else {
    // Yellow to Red
    const t = (ratio - 0.5) * 2;
    startColor = `rgb(${Math.round(234 + (239 - 234) * t)}, ${Math.round(179 - (179 - 68) * t)}, ${Math.round(8 + (68 - 8) * t)})`;
    endColor = '#eab308';
  }

  const progressDeg = progressPercent * 3.6;

  return {
    background: `conic-gradient(from 0deg, ${endColor} 0deg, ${startColor} ${progressDeg}deg, transparent ${progressDeg}deg)`,
  };
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

// Speed lines effect
function SpeedLines({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl opacity-30">
      {Array.from({ length: 6 }, (_, i) => (
        <motion.div
          key={i}
          className="absolute h-[1px] bg-gradient-to-r from-transparent via-white to-transparent"
          style={{
            top: `${15 + i * 15}%`,
            left: '-100%',
            width: '50%',
          }}
          animate={{
            left: ['−100%', '200%'],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.2,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

// Circuit track with position blocks
function CircuitTrack({
  positions,
  currentPosition,
  totalPositions,
  progressPercent,
  isNearNext,
}: {
  positions: RaceData['positions'];
  currentPosition: number;
  totalPositions: number;
  progressPercent: number;
  isNearNext: boolean;
}) {
  // Show only relevant positions: 2 ahead, current, 2 behind
  const relevantPositions = useMemo(() => {
    const result: { pos: RaceData['positions'][0] | null; index: number; isYou: boolean }[] = [];

    // Find positions around current
    for (let i = Math.max(0, currentPosition - 3); i < Math.min(positions.length, currentPosition + 2); i++) {
      if (positions[i]) {
        result.push({
          pos: positions[i],
          index: i,
          isYou: i + 1 === currentPosition,
        });
      }
    }

    // Add "you" marker if not in existing positions
    if (!result.some(r => r.isYou) && currentPosition <= totalPositions) {
      result.push({
        pos: null,
        index: currentPosition - 1,
        isYou: true,
      });
      result.sort((a, b) => a.index - b.index);
    }

    return result.slice(0, 5);
  }, [positions, currentPosition, totalPositions]);

  const getPositionStyle = (slotIndex: number, totalSlots: number): React.CSSProperties => {
    const percentage = ((slotIndex + 0.5) / totalSlots) * 100;

    // Distribute around perimeter
    if (percentage < 25) {
      const x = (percentage / 25) * 100;
      return { top: '-14px', left: `${x}%`, transform: 'translateX(-50%)' };
    } else if (percentage < 50) {
      const y = ((percentage - 25) / 25) * 100;
      return { top: `${y}%`, right: '-14px', transform: 'translateY(-50%)' };
    } else if (percentage < 75) {
      const x = 100 - ((percentage - 50) / 25) * 100;
      return { bottom: '-14px', left: `${x}%`, transform: 'translateX(-50%)' };
    } else {
      const y = 100 - ((percentage - 75) / 25) * 100;
      return { top: `${y}%`, left: '-14px', transform: 'translateY(-50%)' };
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {/* Background track */}
      <div
        className="absolute inset-0 rounded-xl"
        style={{ border: '3px solid rgba(255,255,255,0.1)' }}
      />

      {/* Progress track with position-based color */}
      <motion.div
        className={`absolute inset-[-3px] rounded-xl overflow-hidden ${isNearNext ? 'animate-pulse' : ''}`}
        style={{
          ...getPositionBorderStyle(currentPosition, totalPositions, progressPercent),
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          padding: '3px',
        }}
        animate={isNearNext ? { opacity: [1, 0.7, 1] } : {}}
        transition={{ duration: 0.5, repeat: Infinity }}
      />

      {/* Position blocks */}
      {relevantPositions.map((item, slotIndex) => {
        const posNumber = item.index + 1;
        const isYou = item.isYou;
        const isPR = item.pos?.isPersonalRecord;
        const isBehind = posNumber > currentPosition;
        const isAhead = posNumber < currentPosition;

        let bgColor = 'bg-green-500';
        if (isYou) bgColor = 'bg-yellow-400';
        else if (isAhead) bgColor = 'bg-red-500';
        else if (isBehind) bgColor = 'bg-green-500';

        const style = getPositionStyle(slotIndex, relevantPositions.length);

        return (
          <motion.div
            key={`pos-${posNumber}`}
            className={`absolute flex items-center justify-center shadow-lg ${bgColor} ${
              isYou ? 'w-7 h-7 ring-2 ring-white z-10' : 'w-5 h-5'
            } ${isPR ? 'ring-1 ring-vapor-gold' : ''} rounded`}
            style={style}
            animate={isYou ? {
              scale: [1, 1.1, 1],
              boxShadow: ['0 0 0 0 rgba(255,255,255,0.4)', '0 0 0 8px rgba(255,255,255,0)', '0 0 0 0 rgba(255,255,255,0.4)']
            } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <span className={`font-bold text-white drop-shadow-sm ${isYou ? 'text-xs' : 'text-[9px]'}`}>
              {posNumber}
            </span>
          </motion.div>
        );
      })}

      {/* Moving progress indicator along the track */}
      <motion.div
        className="absolute w-3 h-3 rounded-full bg-white shadow-lg shadow-white/50"
        style={{
          ...getPositionStyle(
            Math.floor((progressPercent / 100) * relevantPositions.length),
            relevantPositions.length
          ),
        }}
        animate={{
          opacity: [0.5, 1, 0.5],
        }}
        transition={{ duration: 1, repeat: Infinity }}
      />
    </div>
  );
}

// Position change indicator with animation
function PositionIndicator({
  position,
  totalPositions,
  previousPosition,
  isLeading,
}: {
  position: number;
  totalPositions: number;
  previousPosition: number | null;
  isLeading: boolean;
}) {
  const posColors = getPositionColor(position, totalPositions);
  const positionChanged = previousPosition !== null && previousPosition !== position;
  const improved = previousPosition !== null && position < previousPosition;
  const declined = previousPosition !== null && position > previousPosition;

  return (
    <div className="flex items-center gap-2">
      <AnimatePresence mode="wait">
        <motion.div
          key={position}
          initial={{ scale: 1.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          className={`${posColors.bg} rounded-lg px-3 py-1 shadow-lg ${posColors.glow}`}
        >
          <span className="text-2xl font-black text-white">P{position}</span>
        </motion.div>
      </AnimatePresence>

      {/* Position change arrow */}
      {positionChanged && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center"
        >
          {improved ? (
            <ChevronUp className="w-5 h-5 text-green-400" />
          ) : declined ? (
            <ChevronDown className="w-5 h-5 text-red-400" />
          ) : (
            <Minus className="w-4 h-4 text-white/40" />
          )}
          {improved && previousPosition && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-green-400 font-medium"
            >
              P{previousPosition} → P{position}
            </motion.span>
          )}
        </motion.div>
      )}

      {isLeading && (
        <motion.span
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="text-lg"
        >
          🏆
        </motion.span>
      )}
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
  const [previousPosition, setPreviousPosition] = useState<number | null>(null);
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
        isNewPR: true, // First attempt is always a PR
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

        // Calculate progress to next position
        const prevPos = positions[livePosition - 1];
        if (prevPos) {
          const prevValueMs = prevPos.value * 60 * 1000;
          const range = nextValueMs - prevValueMs;
          if (range > 0) {
            progressPercent = ((elapsedMs - prevValueMs) / range) * 100;
            // Near next if within 10% of the gap
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

  // Track position changes for animations
  useEffect(() => {
    const currentPos = liveRaceData.currentPosition;
    if (lastPositionRef.current !== null && lastPositionRef.current !== currentPos) {
      setPreviousPosition(lastPositionRef.current);

      // Show confetti when passing someone
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

  const showCircuitTrack = activeTimer && isDuration;
  const isTimerRunning = activeTimer?.isRunning;

  // Dynamic border color based on state
  let borderStyle: React.CSSProperties = {};
  let borderClass = 'border-white/10';

  if (showCircuitTrack) {
    borderClass = 'border-transparent';
  } else if (activeTimer) {
    borderClass = 'border-yellow-500/50';
  } else if (isCompleted) {
    borderClass = 'border-vapor-cyan/30';
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative bg-gradient-to-br from-vapor-dark/90 to-vapor-darker/90 rounded-xl p-4 border-2 ${borderClass} flex flex-col min-h-[220px]`}
      style={borderStyle}
    >
      {/* Speed lines during active timer */}
      <SpeedLines active={!!isTimerRunning} />

      {/* Confetti on position pass */}
      <ConfettiBurst show={showConfetti} />

      {/* Circuit track visualization */}
      {showCircuitTrack && displayPositions.length > 0 && (
        <CircuitTrack
          positions={displayPositions}
          currentPosition={displayCurrentPosition}
          totalPositions={displayTotalPositions}
          progressPercent={liveRaceData.progressPercent}
          isNearNext={liveRaceData.isNearNext}
        />
      )}

      {/* Header row */}
      <div className="flex items-start justify-between mb-2 relative z-10" onClick={onClick}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-2xl">{habit.emoji}</span>
          <span className="text-base font-semibold text-white truncate">{habit.name}</span>
        </div>

        {/* Position indicator in corner during race */}
        {showCircuitTrack && (
          <PositionIndicator
            position={displayCurrentPosition}
            totalPositions={displayTotalPositions}
            previousPosition={previousPosition}
            isLeading={displayCurrentPosition === 1}
          />
        )}

        {!showCircuitTrack && currentStreak > 0 && (
          <span className="text-sm text-vapor-cyan whitespace-nowrap font-medium">🔥{currentStreak}</span>
        )}
      </div>

      {/* Timer display with cycling-style time difference */}
      {activeTimer && formatted && (
        <div className="text-center mb-2 relative z-10">
          <div className="font-mono text-3xl font-bold text-white">
            {formatted.display}
            <span className="text-base text-vapor-cyan">{formatted.centis}</span>
          </div>

          {/* Cycling-style time differences */}
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

      {/* Motivational text */}
      {showCircuitTrack && (
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

      {/* Center content area */}
      <div className="flex-1 flex items-center justify-center relative z-10" onClick={onClick}>
        {/* Race blocks (when not using circuit) */}
        {!showCircuitTrack && displayPositions.length > 0 && (
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
      {(personalRecord || averageValue || currentStreak > 0) && !showCircuitTrack && (
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
      {recentEntries && recentEntries.length >= 2 && !showCircuitTrack && (
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
