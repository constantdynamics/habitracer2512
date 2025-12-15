import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, TrendingUp, Trash2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loadRaceData, loadStats, loadEntriesForHabit, deleteHabit, quickCheckIn, checkInWithValue, deleteEntry } from '../store/habitsSlice';
import { RaceVisualization } from '../components/RaceVisualization';
import { Trophy } from '../components/Trophy';
import { CheckInModal } from '../components/CheckInModal';
import { getHabit, getCurrentStreak } from '../services/habitService';
import { getTodayDate, formatDate } from '../db';
import { Habit } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns';

export function HabitDetail() {
  const { habitId } = useParams<{ habitId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { raceData, stats, entries } = useAppSelector((state) => state.habits);

  const [habit, setHabit] = useState<Habit | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  useEffect(() => {
    if (habitId) {
      getHabit(habitId).then((h) => {
        if (h) setHabit(h);
        else navigate('/');
      });
      dispatch(loadRaceData(habitId));
      dispatch(loadStats(habitId));
      dispatch(loadEntriesForHabit(habitId));
      getCurrentStreak(habitId).then(setCurrentStreak);
    }
  }, [habitId, dispatch, navigate]);

  const handleDelete = async () => {
    if (habitId) {
      await dispatch(deleteHabit(habitId));
      navigate('/');
    }
  };

  const handleCheckIn = async (value: number, notes?: string, date?: string) => {
    if (!habitId) return;

    if (habit?.type === 'boolean') {
      await dispatch(quickCheckIn(habitId));
    } else {
      await dispatch(checkInWithValue({ habitId, value, notes, date }));
    }

    await dispatch(loadRaceData(habitId));
    await dispatch(loadStats(habitId));
    await dispatch(loadEntriesForHabit(habitId));
    const newStreak = await getCurrentStreak(habitId);
    setCurrentStreak(newStreak);
    setShowCheckIn(false);
  };

  const handleDeleteEntry = async (date: string) => {
    if (!habitId) return;

    await dispatch(deleteEntry({ habitId, date }));
    await dispatch(loadRaceData(habitId));
    await dispatch(loadStats(habitId));
    await dispatch(loadEntriesForHabit(habitId));
    const newStreak = await getCurrentStreak(habitId);
    setCurrentStreak(newStreak);
  };

  if (!habit || !habitId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-white/60">Loading...</div>
      </div>
    );
  }

  const habitRaceData = raceData[habitId];
  const habitStats = stats[habitId];
  const habitEntries = entries[habitId] || [];
  const today = getTodayDate();
  const todayEntry = habitEntries.find((e) => e.date === today);

  // Calendar data
  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad with empty days for alignment
  const startDayOfWeek = monthStart.getDay();
  const paddedDays = [...Array(startDayOfWeek).fill(null), ...daysInMonth];

  return (
    <div className="min-h-screen pb-8">
      <div className="grid-overlay" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-vapor-dark/80 backdrop-blur-lg border-b border-white/10 safe-area-top">
        <div className="px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <span className="text-3xl">{habit.emoji}</span>
            <div>
              <h1 className="font-semibold text-white">{habit.name}</h1>
              <p className="text-sm text-white/40">
                {habit.type === 'boolean' ? 'Dagelijkse gewoonte' : `Doel: ${habit.goalValue} ${habit.unit}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center hover:bg-red-500/30 transition-colors text-red-400"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {/* Race Visualization Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-vapor-dark/80 to-vapor-darker/80 rounded-xl p-4 border border-white/10"
        >
          <h2 className="text-sm font-medium text-white/60 mb-3">Race Positie</h2>
          <RaceVisualization raceData={habitRaceData} />

          {habitRaceData?.nextTarget && (
            <div className="mt-4 p-3 bg-vapor-darker/50 rounded-lg">
              <div className="text-sm text-white/60">Volgende positie</div>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-semibold text-vapor-cyan">
                  {Math.abs(habitRaceData.nextTarget.value - habitRaceData.currentValue).toFixed(0)}{' '}
                  {habit.unit || 'meer'} naar #{habitRaceData.nextTarget.position}
                </span>
                {habitRaceData.nextTarget.estimatedDate && (
                  <span className="text-xs text-white/40">
                    Geschat {format(new Date(habitRaceData.nextTarget.estimatedDate), 'd MMM')}
                  </span>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* Start / Check-in Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => habit.type === 'boolean' ? handleCheckIn(todayEntry?.value === 1 ? 0 : 1) : setShowCheckIn(true)}
          className={`w-full p-4 rounded-xl flex items-center justify-between ${
            todayEntry?.value
              ? 'bg-green-500/20 border border-green-500/30'
              : 'bg-gradient-to-r from-vapor-pink/20 to-vapor-cyan/20 border border-white/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              todayEntry?.value ? 'bg-green-500' : 'bg-gradient-to-r from-vapor-pink to-vapor-cyan'
            }`}>
              {todayEntry?.value ? '✓' : '▶'}
            </div>
            <div className="text-left">
              <div className="font-medium text-white">
                {todayEntry?.value ? 'Vandaag voltooid' : 'Start nieuwe poging'}
              </div>
              <div className="text-sm text-white/40">
                {habit.type === 'quantifiable' && todayEntry?.value
                  ? `${todayEntry.value} ${habit.unit}`
                  : 'Tik om te beginnen'}
              </div>
            </div>
          </div>
          {todayEntry?.value && <span className="text-2xl">🎉</span>}
        </motion.button>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-vapor-dark/80 to-vapor-darker/80 rounded-xl p-4 border border-white/10"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🔥</span>
              <span className="text-sm text-white/60">Huidige Streak</span>
            </div>
            <div className="text-3xl font-bold text-white">{currentStreak}</div>
            <div className="text-xs text-white/40">dagen</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-gradient-to-br from-vapor-dark/80 to-vapor-darker/80 rounded-xl p-4 border border-white/10"
          >
            <div className="flex items-center gap-2 mb-2">
              <Trophy streakDays={currentStreak} size="sm" />
              <span className="text-sm text-white/60">Trofee</span>
            </div>
            <Trophy streakDays={currentStreak} showLabel size="md" />
          </motion.div>
        </div>

        {/* Extended Stats */}
        {habitStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-vapor-dark/80 to-vapor-darker/80 rounded-xl p-4 border border-white/10"
          >
            <h2 className="text-sm font-medium text-white/60 mb-4">Statistieken</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-white/40">Beste</div>
                <div className="text-lg font-semibold text-vapor-gold">
                  {habitStats.bestValue} {habit.unit}
                </div>
              </div>
              <div>
                <div className="text-xs text-white/40">Gemiddeld</div>
                <div className="text-lg font-semibold text-vapor-cyan">
                  {habitStats.averageValue.toFixed(1)} {habit.unit}
                </div>
              </div>
              <div>
                <div className="text-xs text-white/40">Totaal</div>
                <div className="text-lg font-semibold text-white">
                  {habitStats.totalEntries} dagen
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className={`w-4 h-4 ${
                  habitStats.trend === 'improving' ? 'text-green-400' :
                  habitStats.trend === 'declining' ? 'text-red-400' : 'text-white/40'
                }`} />
                <span className="text-sm text-white/60">
                  {habitStats.trend === 'improving' ? 'Verbetert' :
                   habitStats.trend === 'declining' ? 'Daalt' : 'Stabiel'}
                </span>
              </div>
              {habitStats.trendPercentage > 0 && (
                <span className={`text-sm ${
                  habitStats.trend === 'improving' ? 'text-green-400' :
                  habitStats.trend === 'declining' ? 'text-red-400' : 'text-white/40'
                }`}>
                  {habitStats.trendPercentage.toFixed(1)}%
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-gradient-to-br from-vapor-dark/80 to-vapor-darker/80 rounded-xl p-4 border border-white/10"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-white/60 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Geschiedenis
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCalendarMonth(new Date(calendarMonth.setMonth(calendarMonth.getMonth() - 1)))}
                className="text-white/40 hover:text-white"
              >
                ←
              </button>
              <span className="text-sm text-white">
                {format(calendarMonth, 'MMMM yyyy')}
              </span>
              <button
                onClick={() => setCalendarMonth(new Date(calendarMonth.setMonth(calendarMonth.getMonth() + 1)))}
                className="text-white/40 hover:text-white"
              >
                →
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Z', 'M', 'D', 'W', 'D', 'V', 'Z'].map((day, i) => (
              <div key={i} className="text-center text-xs text-white/40 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {paddedDays.map((day, i) => {
              if (!day) {
                return <div key={`empty-${i}`} className="aspect-square" />;
              }

              const dateStr = formatDate(day);
              const entry = habitEntries.find((e) => e.date === dateStr);
              const hasEntry = entry && (habit.type === 'boolean' ? entry.value === 1 : entry.value > 0);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={dateStr}
                  className={`
                    aspect-square rounded-lg flex items-center justify-center text-xs
                    ${hasEntry ? 'bg-green-500/30 text-green-400' : 'bg-vapor-darker/30 text-white/40'}
                    ${isCurrentDay ? 'ring-2 ring-vapor-cyan' : ''}
                  `}
                >
                  {format(day, 'd')}
                </div>
              );
            })}
          </div>
        </motion.div>
      </main>

      {/* Check-in Modal */}
      <AnimatePresence>
        {showCheckIn && habit.type === 'quantifiable' && (
          <CheckInModal
            habit={habit}
            currentValue={todayEntry?.value || 0}
            onCheckIn={handleCheckIn}
            onDeleteEntry={handleDeleteEntry}
            recentEntries={[...habitEntries].sort((a, b) => b.date.localeCompare(a.date))}
            onClose={() => setShowCheckIn(false)}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-vapor-dark rounded-xl p-6 border border-white/10 max-w-sm w-full"
            >
              <h3 className="text-lg font-semibold text-white mb-2">Gewoonte verwijderen?</h3>
              <p className="text-white/60 mb-6">
                Dit verwijdert "{habit.name}" en alle bijbehorende data permanent. Dit kan niet ongedaan worden gemaakt.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 bg-vapor-darker rounded-xl text-white font-medium hover:bg-vapor-darkest transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3 bg-red-500 rounded-xl text-white font-medium hover:bg-red-600 transition-colors"
                >
                  Verwijderen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
