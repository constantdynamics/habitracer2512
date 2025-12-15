import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Settings, List, Grid3X3 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  loadHabits,
  loadAllRaceData,
  quickCheckIn,
  loadRaceData,
  createHabitFromPreset,
  checkInWithValue,
} from '../store/habitsSlice';
import { setShowAddHabitModal, triggerCelebration, dismissCelebration } from '../store/uiSlice';
import { HabitCard } from '../components/HabitCard';
import { AddHabitModal } from '../components/AddHabitModal';
import { CheckInModal } from '../components/CheckInModal';
import { Celebration } from '../components/Celebration';
import { getTodayDate } from '../db';
import { Habit, PresetHabit, RaceData } from '../types';
import { getCurrentStreak } from '../services/habitService';

type TabType = 'habits' | 'races';

// Race Tile Component
function RaceTile({
  habit,
  raceData,
  streak,
  onClick
}: {
  habit: Habit;
  raceData: RaceData | undefined;
  streak: number;
  onClick: () => void;
}) {
  const positions = raceData?.positions || [];
  const currentPosition = raceData?.currentPosition || 0;
  const totalPositions = raceData?.totalPositions || 0;

  // Calculate race status
  const aheadCount = positions.filter(p => p.position < currentPosition).length;
  const behindCount = positions.filter(p => p.position > currentPosition && !p.isCurrent).length;
  const hasPR = positions.some(p => p.isPersonalRecord);

  // Determine overall tile status color
  let statusColor = 'from-vapor-dark to-vapor-darker';
  let borderColor = 'border-white/10';

  if (currentPosition === 1 && totalPositions > 0) {
    // Leading the race!
    statusColor = 'from-vapor-gold/30 to-vapor-gold/10';
    borderColor = 'border-vapor-gold/50';
  } else if (aheadCount > behindCount) {
    // More ahead than behind - doing poorly
    statusColor = 'from-red-500/20 to-red-900/10';
    borderColor = 'border-red-500/30';
  } else if (behindCount > aheadCount) {
    // More behind than ahead - doing well
    statusColor = 'from-green-500/20 to-green-900/10';
    borderColor = 'border-green-500/30';
  }

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full p-4 rounded-xl bg-gradient-to-br ${statusColor} border ${borderColor} text-left transition-all`}
    >
      {/* Header with emoji and name */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{habit.emoji}</span>
        <span className="font-semibold text-white truncate flex-1">{habit.name}</span>
        {hasPR && <span className="text-sm">👑</span>}
      </div>

      {/* Race visualization blocks */}
      <div className="flex flex-wrap gap-1 mb-3">
        {positions.length === 0 ? (
          // Empty state
          [...Array(5)].map((_, i) => (
            <div key={i} className="w-5 h-5 rounded bg-vapor-darker/50" />
          ))
        ) : (
          positions.slice(0, 10).map((pos, index) => {
            const isAhead = pos.position < currentPosition;
            const isCurrent = pos.isCurrent || pos.position === currentPosition;
            const isPR = pos.isPersonalRecord;

            let bgColor = 'bg-green-500'; // Behind (beaten)
            if (isAhead) {
              bgColor = 'bg-red-500'; // Ahead (need to catch)
            } else if (isCurrent) {
              bgColor = 'bg-yellow-400';
            }

            return (
              <motion.div
                key={pos.position}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.03 }}
                className={`w-5 h-5 rounded ${bgColor} ${isPR ? 'ring-2 ring-vapor-gold' : ''} ${isCurrent ? 'animate-pulse' : ''}`}
              />
            );
          })
        )}
      </div>

      {/* Position info */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/60">
          {totalPositions > 0 ? (
            <>Positie <span className="text-white font-bold">{currentPosition}</span> van {totalPositions}</>
          ) : (
            'Geen data'
          )}
        </span>
        {streak > 0 && (
          <span className="text-vapor-cyan font-medium">
            🔥 {streak}d
          </span>
        )}
      </div>

      {/* Legend mini */}
      <div className="flex items-center gap-3 mt-2 text-[10px] text-white/40">
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-red-500" /> Voor
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-yellow-400" /> Nu
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-green-500" /> Verslagen
        </span>
      </div>
    </motion.button>
  );
}

export function Dashboard() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { habits, raceData, entries } = useAppSelector((state) => state.habits);
  const { showAddHabitModal, showCelebration, celebrationMessage } = useAppSelector(
    (state) => state.ui
  );

  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [checkInHabit, setCheckInHabit] = useState<Habit | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('habits');

  // Load habits on mount
  useEffect(() => {
    dispatch(loadHabits());
  }, [dispatch]);

  // Load race data when habits change
  useEffect(() => {
    if (habits.length > 0) {
      dispatch(loadAllRaceData());
      // Load streaks
      Promise.all(
        habits.map(async (h) => {
          const streak = await getCurrentStreak(h.id);
          return { id: h.id, streak };
        })
      ).then((results) => {
        const streakMap: Record<string, number> = {};
        results.forEach((r) => {
          streakMap[r.id] = r.streak;
        });
        setStreaks(streakMap);
      });
    }
  }, [habits, dispatch]);

  const handleQuickCheckIn = async (habitId: string) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    const todayEntry = entries[habitId]?.find((e) => e.date === getTodayDate());
    const wasCompleted = todayEntry?.value === 1;

    await dispatch(quickCheckIn(habitId));
    await dispatch(loadRaceData(habitId));

    // Update streaks
    const newStreak = await getCurrentStreak(habitId);
    setStreaks((prev) => ({ ...prev, [habitId]: newStreak }));

    // Trigger celebration if newly completed
    if (!wasCompleted) {
      const previousStreak = streaks[habitId] || 0;
      if (newStreak > previousStreak) {
        // Check for trophy milestones
        if (newStreak === 3) {
          dispatch(triggerCelebration('Bronzen Trofee Ontgrendeld! 🥉'));
        } else if (newStreak === 7) {
          dispatch(triggerCelebration('Zilveren Trofee Ontgrendeld! 🥈'));
        } else if (newStreak === 14) {
          dispatch(triggerCelebration('Gouden Trofee Ontgrendeld! 🥇'));
        } else if (newStreak === 30) {
          dispatch(triggerCelebration('Diamanten Trofee Ontgrendeld! 💎'));
        } else {
          dispatch(triggerCelebration(`${newStreak} dagen streak! 🔥`));
        }
      }
    }
  };

  const handleCheckInWithValue = async (value: number, notes?: string) => {
    if (!checkInHabit) return;

    await dispatch(checkInWithValue({ habitId: checkInHabit.id, value, notes }));
    await dispatch(loadRaceData(checkInHabit.id));

    // Update streaks
    const newStreak = await getCurrentStreak(checkInHabit.id);
    setStreaks((prev) => ({ ...prev, [checkInHabit.id]: newStreak }));

    // Celebration for goal reached
    if (checkInHabit.goalValue && value >= checkInHabit.goalValue) {
      dispatch(triggerCelebration('Doel behaald! 🎯'));
    }

    setCheckInHabit(null);
  };

  const handleAddHabit = async (preset: PresetHabit) => {
    await dispatch(createHabitFromPreset(preset));
    dispatch(setShowAddHabitModal(false));
    dispatch(triggerCelebration(`${preset.name} toegevoegd! Let's go! 🚀`));
  };

  const handleViewDetails = (habit: Habit) => {
    if (habit.type === 'quantifiable') {
      setCheckInHabit(habit);
    } else {
      navigate(`/habit/${habit.id}`);
    }
  };

  const today = getTodayDate();

  return (
    <div className="min-h-screen pb-24">
      {/* Background effects */}
      <div className="grid-overlay" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-vapor-dark/80 backdrop-blur-lg border-b border-white/10 safe-area-top">
        <div className="px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="text-left hover:opacity-80 transition-opacity">
            <h1 className="font-display font-bold text-2xl text-white">
              Habit<span className="text-vapor-cyan">Racer</span>
            </h1>
            <p className="text-sm text-white/40">Race tegen jezelf</p>
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        {habits.length > 0 && (
          <div className="px-4 pb-2 flex gap-2">
            <button
              onClick={() => setActiveTab('habits')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === 'habits'
                  ? 'bg-vapor-cyan/20 text-vapor-cyan border border-vapor-cyan/50'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              <List className="w-4 h-4" />
              Gewoontes
            </button>
            <button
              onClick={() => setActiveTab('races')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === 'races'
                  ? 'bg-vapor-pink/20 text-vapor-pink border border-vapor-pink/50'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              Races
            </button>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="px-4 py-6">
        {habits.length === 0 ? (
          // Empty state
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="text-6xl mb-4">🏁</div>
            <h2 className="text-xl font-semibold text-white mb-2">Klaar om te racen?</h2>
            <p className="text-white/60 mb-6">
              Voeg je eerste gewoonte toe om tegen jezelf te strijden
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => dispatch(setShowAddHabitModal(true))}
              className="px-6 py-3 bg-gradient-to-r from-vapor-pink to-vapor-cyan text-white font-semibold rounded-xl glow-button"
            >
              Voeg Je Eerste Gewoonte Toe
            </motion.button>
          </motion.div>
        ) : activeTab === 'habits' ? (
          // Habits list view
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {habits.map((habit) => {
                const habitEntries = entries[habit.id] || [];
                const todayEntry = habitEntries.find((e) => e.date === today);

                return (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    raceData={raceData[habit.id]}
                    todayEntry={todayEntry}
                    currentStreak={streaks[habit.id] || 0}
                    onQuickCheckIn={() => handleQuickCheckIn(habit.id)}
                    onViewDetails={() => handleViewDetails(habit)}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          // Races grid view
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex items-center justify-center gap-4 text-xs text-white/60 mb-2">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-500" /> Voor je
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-yellow-400" /> Huidige positie
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500" /> Verslagen
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded ring-2 ring-vapor-gold" /> PR
              </span>
            </div>

            {/* Race tiles grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {habits.map((habit) => (
                  <RaceTile
                    key={habit.id}
                    habit={habit}
                    raceData={raceData[habit.id]}
                    streak={streaks[habit.id] || 0}
                    onClick={() => navigate(`/habit/${habit.id}`)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {/* FAB - Add habit button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => dispatch(setShowAddHabitModal(true))}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-vapor-pink to-vapor-cyan rounded-full flex items-center justify-center shadow-neon-pink z-40 safe-area-bottom"
      >
        <Plus className="w-6 h-6 text-white" />
      </motion.button>

      {/* Modals */}
      <AnimatePresence>
        {showAddHabitModal && (
          <AddHabitModal
            onAddPreset={handleAddHabit}
            onAddCustom={handleAddHabit}
            onClose={() => dispatch(setShowAddHabitModal(false))}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {checkInHabit && (
          <CheckInModal
            habit={checkInHabit}
            currentValue={
              entries[checkInHabit.id]?.find((e) => e.date === today)?.value || 0
            }
            onCheckIn={handleCheckInWithValue}
            onClose={() => setCheckInHabit(null)}
          />
        )}
      </AnimatePresence>

      {/* Celebration overlay */}
      <AnimatePresence>
        {showCelebration && (
          <Celebration
            message={celebrationMessage}
            onComplete={() => dispatch(dismissCelebration())}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
