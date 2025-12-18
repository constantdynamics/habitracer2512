import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  recentEntries?: number[];
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

// Helper: format minutes to hh:mm:ss
function formatMinutesToHMS(minutes: number): string {
  const totalSeconds = Math.round(minutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Helper: get border color based on position (red -> yellow -> green)
function getPositionBorderColor(position: number, totalPositions: number): string {
  if (totalPositions <= 1) return '#22c55e'; // green

  const ratio = (position - 1) / (totalPositions - 1); // 0 = first (green), 1 = last (red)

  if (ratio <= 0.5) {
    // Green to Yellow
    const t = ratio * 2;
    const r = Math.round(34 + (234 - 34) * t);
    const g = Math.round(197 - (197 - 179) * t);
    const b = Math.round(94 - (94 - 8) * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Yellow to Red
    const t = (ratio - 0.5) * 2;
    const r = Math.round(234 + (239 - 234) * t);
    const g = Math.round(179 - (179 - 68) * t);
    const b = Math.round(8 + (68 - 8) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
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

// GO! Animation component (Lichtenstein style explosion)
function GoAnimation({ show, onComplete }: { show: boolean; onComplete: () => void }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onComplete, 1500);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ type: 'spring', damping: 10, stiffness: 200 }}
          >
            {/* Explosion rays */}
            <div className="absolute inset-0 flex items-center justify-center">
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-4 h-20 bg-yellow-400"
                  style={{
                    transform: `rotate(${i * 30}deg)`,
                    transformOrigin: 'center 60px',
                  }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 0.1 + i * 0.02 }}
                />
              ))}
            </div>
            {/* GO text */}
            <motion.div
              className="relative z-10 text-7xl font-black text-yellow-400 drop-shadow-lg"
              style={{
                textShadow: '4px 4px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
                fontFamily: 'Impact, sans-serif',
              }}
              initial={{ scale: 0.5 }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.3 }}
            >
              GO!
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// FINISH Animation component
function FinishAnimation({
  show,
  time,
  position,
  totalPositions,
  onComplete
}: {
  show: boolean;
  time: string;
  position: number;
  totalPositions: number;
  onComplete: () => void;
}) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onComplete, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="text-5xl font-black text-white mb-2"
            style={{
              textShadow: '3px 3px 0 #22c55e',
              fontFamily: 'Impact, sans-serif',
            }}
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            FINISH!
          </motion.div>
          <motion.div
            className="text-4xl font-mono font-bold text-yellow-400 mb-2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
          >
            {time}
          </motion.div>
          <motion.div
            className="text-2xl font-bold text-white mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            #{position} / {totalPositions}
          </motion.div>
          <motion.div
            className="text-3xl font-black text-green-400"
            style={{
              textShadow: '2px 2px 0 #000',
              fontFamily: 'Impact, sans-serif',
            }}
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 1.2, type: 'spring' }}
          >
            GOOD JOB!
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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

  const trackData = useMemo(() => {
    if (positions.length === 0) return { blocks: [], youPosition: 50 };

    const allValues = positions.map(p => p.value);
    const minValue = Math.min(...allValues, currentValue);
    const maxValue = Math.max(...allValues, currentValue);
    const range = maxValue - minValue || 1;

    let displayPositions = [...positions];
    if (positions.length > MAX_BLOCKS) {
      const relevantIndices = new Set<number>();
      relevantIndices.add(0);
      relevantIndices.add(positions.length - 1);

      const currentIdx = currentPosition - 1;
      for (let i = Math.max(0, currentIdx - 1); i <= Math.min(positions.length - 1, currentIdx + 1); i++) {
        relevantIndices.add(i);
      }

      const indices = Array.from(relevantIndices).sort((a, b) => a - b).slice(0, MAX_BLOCKS);
      displayPositions = indices.map(i => positions[i]);
    }

    const blocks = displayPositions.map((pos) => {
      const originalIndex = positions.findIndex(p => p.value === pos.value && p.date === pos.date);
      const posNumber = originalIndex + 1;
      const xPercent = ((pos.value - minValue) / range) * 100;

      // Beaten = position number > current position (we passed them)
      const isBeaten = posNumber > currentPosition;
      // Skip if this is the current position (we show JIJ instead)
      const isCurrentPos = posNumber === currentPosition;

      return {
        posNumber,
        value: pos.value,
        xPercent,
        isPR: pos.isPersonalRecord,
        isBeaten,
        isCurrentPos,
      };
    });

    const youXPercent = ((currentValue - minValue) / range) * 100;

    return { blocks, youPosition: youXPercent };
  }, [positions, currentPosition, currentValue]);

  if (positions.length === 0) {
    return (
      <div className="w-full h-14 flex items-center justify-center">
        <div className="text-sm text-white/60">Eerste poging!</div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 relative h-16">
      {/* Track line */}
      <div className="absolute left-1 right-1 top-1/2 h-1.5 bg-white/20 rounded-full transform -translate-y-1/2" />

      {/* Position blocks with medals - all bottom-aligned */}
      {trackData.blocks.map((block) => {
        // Don't show block for current position (JIJ marker shows instead)
        if (block.isCurrentPos) return null;

        // Green = beaten (passed), Grey = not beaten yet
        const bgColor = block.isBeaten ? 'bg-green-500' : 'bg-gray-500';

        // Medal for top 3
        let medal = null;
        if (block.posNumber === 1) medal = '🥇';
        else if (block.posNumber === 2) medal = '🥈';
        else if (block.posNumber === 3) medal = '🥉';

        return (
          <div
            key={`block-${block.posNumber}`}
            className="absolute top-1/2 transform -translate-x-1/2 flex flex-col items-center"
            style={{
              left: `calc(${block.xPercent}% * 0.85 + 7.5%)`,
              // Position so block is centered on line, medal is above
              transform: 'translateX(-50%) translateY(-50%)',
            }}
          >
            <div className="flex flex-col items-center">
              {/* Medal above block */}
              {medal && (
                <span className="text-xs leading-none mb-0.5">{medal}</span>
              )}
              <div
                className={`w-8 h-8 rounded-md ${bgColor} flex items-center justify-center shadow-md ${block.isPR ? 'ring-2 ring-yellow-400' : ''}`}
              >
                <span className="text-xs font-bold text-white">{block.posNumber}</span>
              </div>
            </div>
          </div>
        );
      })}

      {/* "You" marker - same height as other blocks */}
      <motion.div
        className="absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10"
        style={{ left: `calc(${trackData.youPosition}% * 0.85 + 7.5%)` }}
        animate={isNearNext ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.3, repeat: Infinity }}
      >
        <motion.div
          className="w-10 h-8 rounded-md flex items-center justify-center shadow-lg border-2 border-white"
          animate={{
            backgroundColor: ['#facc15', '#ffffff', '#facc15'],
          }}
          transition={{ duration: 0.6, repeat: Infinity }}
        >
          <span className="text-xs font-black text-gray-900">JIJ</span>
        </motion.div>
      </motion.div>
    </div>
  );
}

export function RaceTile({
  habit,
  raceData,
  todayEntry,
  currentStreak,
  activeTimer,
  personalRecord,
  averageValue,
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
  const [showGoAnimation, setShowGoAnimation] = useState(false);
  const [showFinishAnimation, setShowFinishAnimation] = useState(false);
  const [finishData, setFinishData] = useState({ time: '', position: 0, totalPositions: 0 });
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

  // Dynamic border color based on position
  const borderColor = showRaceTrack
    ? getPositionBorderColor(displayCurrentPosition, displayTotalPositions)
    : (isCompleted ? 'rgba(0, 245, 212, 0.3)' : 'rgba(255, 255, 255, 0.1)');

  // Handle start with GO animation
  const handleStart = () => {
    setShowGoAnimation(true);
    onStartTimer();
  };

  // Handle stop with FINISH animation
  const handleStop = () => {
    const timeStr = formatted ? `${formatted.display}${formatted.centis}` : '00:00.00';
    setFinishData({
      time: timeStr,
      position: displayCurrentPosition,
      totalPositions: displayTotalPositions,
    });
    setShowFinishAnimation(true);
    onSaveTimer(elapsedMs);
  };

  // Racing layout when timer is active
  if (showRaceTrack) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-gradient-to-br from-vapor-dark/90 to-vapor-darker/90 rounded-xl p-3 flex flex-col min-h-[220px] overflow-hidden"
        style={{ border: `3px solid ${borderColor}` }}
      >
        <GoAnimation show={showGoAnimation} onComplete={() => setShowGoAnimation(false)} />
        <FinishAnimation
          show={showFinishAnimation}
          time={finishData.time}
          position={finishData.position}
          totalPositions={finishData.totalPositions}
          onComplete={() => setShowFinishAnimation(false)}
        />
        <ConfettiBurst show={showConfetti} />

        {/* Header: habit name left, timer right */}
        <div className="flex items-start justify-between mb-1">
          {/* Left: habit name and position */}
          <div onClick={onClick}>
            <div className="flex items-center gap-1.5">
              <span className="text-xl">{habit.emoji}</span>
              <span className="text-sm font-semibold text-white">{habit.name}</span>
            </div>
            <div className="text-white/60 text-xs mt-0.5">
              {displayCurrentPosition} / {displayTotalPositions}
            </div>
          </div>

          {/* Right: timer */}
          {formatted && (
            <div className="font-mono text-2xl font-bold text-white text-right">
              {formatted.display}
              <span className="text-sm text-white/70">{formatted.centis}</span>
            </div>
          )}
        </div>

        {/* Target info - LARGER text */}
        <div className="text-center my-2">
          {liveRaceData.distanceToNext !== null && liveRaceData.distanceToNext > 0 ? (
            <div className={`${liveRaceData.isNearNext ? 'animate-pulse' : ''}`}>
              <span className="text-white font-mono text-2xl font-bold">
                #{displayCurrentPosition - 1}: {formatTimeDiff(liveRaceData.distanceToNext)}
              </span>
            </div>
          ) : liveRaceData.isNewPR ? (
            <span className="text-green-400 font-bold text-2xl">🏁 NIEUW PR!</span>
          ) : null}
          {liveRaceData.distanceToBest !== null && !liveRaceData.isNewPR && (
            <div>
              <span className="text-white font-mono text-xl">
                PR: {formatTimeDiff(liveRaceData.distanceToBest)}
              </span>
            </div>
          )}
        </div>

        {/* Horizontal race track */}
        <div className="flex-1 flex items-center">
          <HorizontalRaceTrack
            positions={displayPositions}
            currentPosition={displayCurrentPosition}
            currentValue={currentMinutes}
            isNearNext={liveRaceData.isNearNext}
          />
        </div>

        {/* Action buttons - all equal size with text */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          {activeTimer.isRunning ? (
            <button
              onClick={(e) => { e.stopPropagation(); onPauseTimer(); }}
              className="py-2.5 bg-yellow-500 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-1"
            >
              <Pause className="w-4 h-4" />
              PAUSE
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onResumeTimer(); }}
              className="py-2.5 bg-green-500 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-1"
            >
              <Play className="w-4 h-4" />
              START
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleStop(); }}
            className="py-2.5 bg-red-500 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-1"
          >
            <Square className="w-4 h-4" />
            STOP
          </button>
          {showDeleteConfirm ? (
            <div className="flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteTimer(); setShowDeleteConfirm(false); }}
                className="flex-1 py-2.5 bg-red-600 rounded-lg text-white font-bold text-xs"
              >
                JA
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                className="flex-1 py-2.5 bg-gray-600 rounded-lg text-white font-bold text-xs"
              >
                NEE
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
              className="py-2.5 bg-gray-900 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              DELETE
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // Normal layout when no timer is active
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative bg-gradient-to-br from-vapor-dark/90 to-vapor-darker/90 rounded-xl p-4 flex flex-col min-h-[200px] overflow-hidden"
      style={{ border: `2px solid ${borderColor}` }}
    >
      <GoAnimation show={showGoAnimation} onComplete={() => setShowGoAnimation(false)} />
      <FinishAnimation
        show={showFinishAnimation}
        time={finishData.time}
        position={finishData.position}
        totalPositions={finishData.totalPositions}
        onComplete={() => setShowFinishAnimation(false)}
      />
      <ConfettiBurst show={showConfetti} />

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

      {/* Center content area */}
      <div className="flex-1 flex items-center justify-center relative z-10" onClick={onClick}>
        {displayPositions.length > 0 && (
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

        {displayPositions.length === 0 && !activeTimer && (
          <div className="text-xs text-white/40">Nog geen data</div>
        )}

        {displayPositions.length === 0 && activeTimer && isDuration && (
          <div className="text-center">
            <div className="text-2xl font-bold text-vapor-cyan">#1</div>
            <div className="text-sm text-white/60">Eerste poging!</div>
          </div>
        )}
      </div>

      {/* Stats strip - with hh:mm:ss format */}
      {(personalRecord || averageValue || currentStreak > 0) && (
        <div className="flex items-center justify-center gap-3 text-[10px] text-white/50 mb-2 relative z-10">
          {personalRecord && (
            <span>🏆 PR: {formatMinutesToHMS(personalRecord)}</span>
          )}
          {averageValue && (
            <span>⚡ Gem: {formatMinutesToHMS(averageValue)}</span>
          )}
          {currentStreak > 0 && (
            <span>🔥 {currentStreak}d</span>
          )}
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
          <button
            onClick={(e) => { e.stopPropagation(); handleStart(); }}
            className="flex-1 py-2.5 bg-green-500 rounded-lg text-white text-sm font-bold flex items-center justify-center gap-1.5"
          >
            <Play className="w-4 h-4" />
            START
          </button>
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
