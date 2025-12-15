import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Settings, Timer } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  loadHabits,
  loadAllRaceData,
  quickCheckIn,
  loadRaceData,
  createHabitFromPreset,
  checkInWithValue,
  loadEntriesForHabit,
} from '../store/habitsSlice';
import {
  loadActiveTimers,
  startTimer,
  pauseTimer,
  stopAndSaveTimer,
  deleteTimer,
} from '../store/timersSlice';
import { setShowAddHabitModal, triggerCelebration, dismissCelebration } from '../store/uiSlice';
import { HabitCard } from '../components/HabitCard';
import { AddHabitModal } from '../components/AddHabitModal';
import { CheckInModal } from '../components/CheckInModal';
import { Celebration } from '../components/Celebration';
import { LiveTimerCard } from '../components/LiveTimerCard';
import { getTodayDate } from '../db';
import { Habit, PresetHabit } from '../types';
import { getCurrentStreak, getEntriesForHabit } from '../services/habitService';

export function Dashboard() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { habits, raceData, entries } = useAppSelector((state) => state.habits);
  const { activeTimers } = useAppSelector((state) => state.timers);
  const { showAddHabitModal, showCelebration, celebrationMessage } = useAppSelector(
    (state) => state.ui
  );

  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [checkInHabit, setCheckInHabit] = useState<Habit | null>(null);
  const [bestValues, setBestValues] = useState<Record<string, number>>({});
  const [previousEntries, setPreviousEntries] = useState<Record<string, { value: number; date: string }>>({});

  // Load habits and active timers on mount
  useEffect(() => {
    dispatch(loadHabits());
    dispatch(loadActiveTimers());
  }, [dispatch]);

  // Load race data, streaks, and best values when habits change
  useEffect(() => {
    if (habits.length > 0) {
      dispatch(loadAllRaceData());
      // Load streaks, best values, and previous entries
      Promise.all(
        habits.map(async (h) => {
          const streak = await getCurrentStreak(h.id);
          const allEntries = await getEntriesForHabit(h.id);
          const sortedEntries = [...allEntries].sort((a, b) => b.date.localeCompare(a.date));
          const best = allEntries.length > 0 ? Math.max(...allEntries.map(e => e.value)) : 0;
          const previous = sortedEntries.length > 1 ? sortedEntries[1] : sortedEntries[0];
          return { id: h.id, streak, best, previous };
        })
      ).then((results) => {
        const streakMap: Record<string, number> = {};
        const bestMap: Record<string, number> = {};
        const prevMap: Record<string, { value: number; date: string }> = {};
        results.forEach((r) => {
          streakMap[r.id] = r.streak;
          bestMap[r.id] = r.best;
          if (r.previous) {
            prevMap[r.id] = { value: r.previous.value, date: r.previous.date };
          }
        });
        setStreaks(streakMap);
        setBestValues(bestMap);
        setPreviousEntries(prevMap);
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
          dispatch(triggerCelebration('Bronzen trofee ontgrendeld! 🥉'));
        } else if (newStreak === 7) {
          dispatch(triggerCelebration('Zilveren trofee ontgrendeld! 🥈'));
        } else if (newStreak === 14) {
          dispatch(triggerCelebration('Gouden trofee ontgrendeld! 🥇'));
        } else if (newStreak === 30) {
          dispatch(triggerCelebration('Diamanten trofee ontgrendeld! 💎'));
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

  // Timer handlers
  const handleStartTimer = async (habitId: string) => {
    await dispatch(startTimer(habitId));
  };

  const handlePauseTimer = async (habitId: string) => {
    await dispatch(pauseTimer(habitId));
  };

  const handleResumeTimer = async (habitId: string) => {
    await dispatch(startTimer(habitId));
  };

  const handleSaveTimer = async (habitId: string, elapsedMs: number, autoRestart: boolean = true) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    // Convert ms to the habit's unit (assuming minutes for duration)
    const minutes = Math.round(elapsedMs / 1000 / 60 * 10) / 10; // 1 decimal place

    await dispatch(stopAndSaveTimer({ habitId, autoRestart }));
    await dispatch(checkInWithValue({ habitId, value: minutes }));
    await dispatch(loadRaceData(habitId));
    await dispatch(loadEntriesForHabit(habitId));

    // Update streaks
    const newStreak = await getCurrentStreak(habitId);
    setStreaks((prev) => ({ ...prev, [habitId]: newStreak }));

    dispatch(triggerCelebration(`${minutes} minuten opgeslagen! ${autoRestart ? 'Nieuwe poging gestart!' : ''}`));
  };

  const handleDeleteTimer = async (habitId: string) => {
    await dispatch(deleteTimer(habitId));
  };

  const today = getTodayDate();

  // Duration habits that could have timers
  const durationHabits = habits.filter(h =>
    h.type === 'quantifiable' && h.metricType === 'duration'
  );

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
          <div className="flex items-center gap-2">
            {activeTimers.length > 0 && (
              <div className="flex items-center gap-1 px-3 py-1 bg-green-500/20 rounded-full">
                <Timer className="w-4 h-4 text-green-400 animate-pulse" />
                <span className="text-sm text-green-400 font-medium">{activeTimers.length}</span>
              </div>
            )}
            <button
              onClick={() => navigate('/settings')}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 py-6 space-y-6">
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
              Voeg je eerste gewoonte toe
            </motion.button>
          </motion.div>
        ) : (
          <>
            {/* Live Timers Section */}
            {activeTimers.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  Lopende pogingen
                </h2>
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {activeTimers.map((timer) => {
                      const habit = habits.find(h => h.id === timer.habitId);
                      if (!habit) return null;

                      return (
                        <LiveTimerCard
                          key={timer.id}
                          timer={timer}
                          habit={habit}
                          previousBest={bestValues[habit.id]}
                          previousEntry={previousEntries[habit.id] ? {
                            id: '',
                            habitId: habit.id,
                            date: previousEntries[habit.id].date,
                            value: previousEntries[habit.id].value,
                            createdAt: 0,
                            updatedAt: 0,
                          } : undefined}
                          onPause={() => handlePauseTimer(habit.id)}
                          onResume={() => handleResumeTimer(habit.id)}
                          onSave={(elapsedMs) => handleSaveTimer(habit.id, elapsedMs, true)}
                          onDelete={() => handleDeleteTimer(habit.id)}
                        />
                      );
                    })}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {/* Start new timer buttons for duration habits without active timer */}
            {durationHabits.filter(h => !activeTimers.some(t => t.habitId === h.id)).length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-white/60 mb-3">Start een timer</h2>
                <div className="flex flex-wrap gap-2">
                  {durationHabits
                    .filter(h => !activeTimers.some(t => t.habitId === h.id))
                    .map((habit) => (
                      <motion.button
                        key={habit.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleStartTimer(habit.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-vapor-darker/50 rounded-full border border-white/10 hover:border-vapor-cyan/50 transition-colors"
                      >
                        <span>{habit.emoji}</span>
                        <span className="text-sm text-white/80">{habit.name}</span>
                        <Timer className="w-4 h-4 text-vapor-cyan" />
                      </motion.button>
                    ))}
                </div>
              </section>
            )}

            {/* Integrated Habits & Races View */}
            <section>
              <h2 className="text-sm font-medium text-white/60 mb-3">Jouw gewoontes & races</h2>

              {/* Legend */}
              <div className="flex items-center justify-start gap-4 text-xs text-white/40 mb-3">
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

              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {habits.map((habit) => {
                    const habitEntries = entries[habit.id] || [];
                    const todayEntry = habitEntries.find((e) => e.date === today);
                    const habitRaceData = raceData[habit.id];
                    const streak = streaks[habit.id] || 0;

                    // Calculate race info text for boolean habits
                    let raceInfoText = '';
                    if (habit.type === 'boolean' && habitRaceData) {
                      const prStreak = habitRaceData.previousRecord?.value || 0;
                      const daysToGo = prStreak - streak;
                      if (daysToGo > 0) {
                        raceInfoText = `Nog ${daysToGo} dag${daysToGo !== 1 ? 'en' : ''} tot je PR`;
                      } else if (streak > 0) {
                        raceInfoText = '🏆 Nieuw persoonlijk record!';
                      }
                    }

                    return (
                      <motion.div
                        key={habit.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-gradient-to-br from-vapor-dark/80 to-vapor-darker/80 rounded-xl border border-white/10 overflow-hidden"
                      >
                        {/* Habit Card Header */}
                        <div className="p-4">
                          <HabitCard
                            habit={habit}
                            raceData={habitRaceData}
                            todayEntry={todayEntry}
                            currentStreak={streak}
                            onQuickCheckIn={() => handleQuickCheckIn(habit.id)}
                            onViewDetails={() => handleViewDetails(habit)}
                          />
                        </div>

                        {/* Race Progress Bar */}
                        {habitRaceData && habitRaceData.totalPositions > 0 && (
                          <div
                            className="px-4 pb-4 cursor-pointer"
                            onClick={() => navigate(`/habit/${habit.id}`)}
                          >
                            {/* Mini race visualization */}
                            <div className="flex gap-1 mb-2">
                              {habitRaceData.positions.slice(0, 15).map((pos, index) => {
                                const isAhead = pos.position < habitRaceData.currentPosition;
                                const isCurrent = pos.isCurrent || pos.position === habitRaceData.currentPosition;
                                const isPR = pos.isPersonalRecord;

                                let bgColor = 'bg-green-500';
                                if (isAhead) bgColor = 'bg-red-500';
                                else if (isCurrent) bgColor = 'bg-yellow-400';

                                return (
                                  <motion.div
                                    key={pos.position}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: index * 0.02 }}
                                    className={`w-4 h-4 rounded ${bgColor} ${isPR ? 'ring-1 ring-vapor-gold' : ''} ${isCurrent ? 'animate-pulse' : ''}`}
                                  />
                                );
                              })}
                              {habitRaceData.totalPositions > 15 && (
                                <span className="text-xs text-white/40 self-center ml-1">
                                  +{habitRaceData.totalPositions - 15}
                                </span>
                              )}
                            </div>

                            {/* Position text */}
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-white/60">
                                Positie <span className="text-white font-bold">{habitRaceData.currentPosition}</span> van {habitRaceData.totalPositions}
                              </span>
                              {raceInfoText && (
                                <span className="text-vapor-cyan">{raceInfoText}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </section>
          </>
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
