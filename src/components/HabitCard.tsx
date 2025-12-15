import { motion } from 'framer-motion';
import { CheckCircle, Circle, ChevronRight } from 'lucide-react';
import { Habit, RaceData, HabitEntry } from '../types';
import { RaceVisualizationMini } from './RaceVisualization';
import { Trophy } from './Trophy';

interface HabitCardProps {
  habit: Habit;
  raceData?: RaceData;
  todayEntry?: HabitEntry;
  currentStreak: number;
  onQuickCheckIn: () => void;
  onViewDetails: () => void;
}

export function HabitCard({
  habit,
  raceData,
  todayEntry,
  currentStreak,
  onQuickCheckIn,
  onViewDetails,
}: HabitCardProps) {
  const isCompletedToday = habit.type === 'boolean'
    ? todayEntry?.value === 1
    : (todayEntry?.value ?? 0) > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative overflow-hidden rounded-xl p-4
        bg-gradient-to-br from-vapor-dark/80 to-vapor-darker/80
        border border-white/10
        backdrop-blur-sm
        ${isCompletedToday ? 'ring-2 ring-green-500/50' : ''}
        cursor-pointer
        transition-all duration-300
      `}
      onClick={onViewDetails}
    >
      {/* Glow effect when completed */}
      {isCompletedToday && (
        <div className="absolute inset-0 bg-green-500/5 pointer-events-none" />
      )}

      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{habit.emoji}</span>
          <div>
            <h3 className="font-semibold text-white">{habit.name}</h3>
            <div className="text-sm text-white/60">
              {habit.type === 'quantifiable' && habit.goalValue && (
                <span>Goal: {habit.goalValue} {habit.unit}</span>
              )}
              {habit.type === 'boolean' && (
                <span>{habit.frequency === 'daily' ? 'Daily' : 'Custom'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Quick check-in button for boolean habits */}
        {habit.type === 'boolean' && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onQuickCheckIn();
            }}
            className={`
              w-10 h-10 rounded-full flex items-center justify-center
              transition-all duration-300
              ${isCompletedToday
                ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)]'
                : 'bg-vapor-darker/50 text-white/60 hover:bg-vapor-darker hover:text-white'
              }
            `}
          >
            {isCompletedToday ? (
              <CheckCircle className="w-6 h-6" />
            ) : (
              <Circle className="w-6 h-6" />
            )}
          </motion.button>
        )}

        {/* Value display for quantifiable habits */}
        {habit.type === 'quantifiable' && (
          <div className="text-right">
            <div className="text-2xl font-bold text-vapor-cyan">
              {todayEntry?.value ?? 0}
            </div>
            <div className="text-xs text-white/40">{habit.unit}</div>
          </div>
        )}
      </div>

      {/* Race visualization */}
      <div className="mb-3">
        <RaceVisualizationMini raceData={raceData} />
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between">
        {/* Streak and trophy */}
        <div className="flex items-center gap-3">
          {currentStreak > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xl">🔥</span>
              <span className="text-sm font-medium text-white">{currentStreak}</span>
            </div>
          )}
          <Trophy streakDays={currentStreak} size="sm" />
        </div>

        {/* Race position */}
        {raceData && (
          <div className="flex items-center gap-2 text-sm text-white/60">
            <span>
              Position {raceData.currentPosition}/{raceData.totalPositions}
            </span>
            <ChevronRight className="w-4 h-4" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
