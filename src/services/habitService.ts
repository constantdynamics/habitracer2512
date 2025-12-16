import { db, generateId, getTodayDate, formatDate, parseDate, shouldHaveEntry } from '../db';
import { Habit, HabitEntry, RaceData, RacePosition, HabitStats, PresetHabit } from '../types';

// HABIT CRUD OPERATIONS

export async function createHabit(habitData: Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'archived'>): Promise<Habit> {
  const now = Date.now();
  const habit: Habit = {
    ...habitData,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    archived: false,
  };

  await db.habits.add(habit);
  return habit;
}

export async function createHabitFromPreset(preset: PresetHabit): Promise<Habit> {
  return createHabit({
    name: preset.name,
    emoji: preset.emoji,
    type: preset.type,
    metricType: preset.metricType,
    direction: preset.direction,
    goalValue: preset.goalValue,
    unit: preset.unit,
    frequency: preset.frequency,
  });
}

export async function updateHabit(id: string, updates: Partial<Habit>): Promise<void> {
  await db.habits.update(id, {
    ...updates,
    updatedAt: Date.now(),
  });
}

export async function deleteHabit(id: string): Promise<void> {
  // Delete all related entries and streaks
  await db.entries.where('habitId').equals(id).delete();
  await db.streaks.where('habitId').equals(id).delete();
  await db.habits.delete(id);
}

export async function archiveHabit(id: string): Promise<void> {
  await updateHabit(id, { archived: true });
}

export async function getHabit(id: string): Promise<Habit | undefined> {
  return db.habits.get(id);
}

export async function getAllHabits(): Promise<Habit[]> {
  return db.habits.where('archived').equals(0).toArray() as unknown as Habit[];
}

export async function getActiveHabits(): Promise<Habit[]> {
  // Get habits that are not archived, sorted by most recently updated
  const habits = await db.habits.toArray();
  return habits
    .filter(h => !h.archived)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

// ENTRY OPERATIONS

export async function createEntry(habitId: string, date: string, value: number, notes?: string, isAttempt?: boolean): Promise<HabitEntry> {
  const now = Date.now();

  // For attempt-based entries (timer habits), always create a new entry
  if (isAttempt) {
    const entry: HabitEntry = {
      id: generateId(),
      habitId,
      date,
      value,
      notes,
      createdAt: now,
      updatedAt: now,
      isAttempt: true,
    };

    await db.entries.add(entry);
    await updateStreaks(habitId);
    return entry;
  }

  // Check if entry already exists for this habit and date
  const existing = await db.entries
    .where('[habitId+date]')
    .equals([habitId, date])
    .first();

  // Only update if existing entry is not an attempt
  if (existing && !existing.isAttempt) {
    // Update existing entry
    await db.entries.update(existing.id, {
      value,
      notes,
      updatedAt: now,
    });
    return { ...existing, value, notes, updatedAt: now };
  }

  // Create new entry
  const entry: HabitEntry = {
    id: generateId(),
    habitId,
    date,
    value,
    notes,
    createdAt: now,
    updatedAt: now,
  };

  await db.entries.add(entry);

  // Update streaks after adding entry
  await updateStreaks(habitId);

  return entry;
}

export async function getEntry(habitId: string, date: string): Promise<HabitEntry | undefined> {
  return db.entries
    .where('[habitId+date]')
    .equals([habitId, date])
    .first();
}

export async function deleteEntry(habitId: string, date: string): Promise<void> {
  const entry = await getEntry(habitId, date);
  if (entry) {
    await db.entries.delete(entry.id);
    await updateStreaks(habitId);
  }
}

export async function getEntriesForHabit(habitId: string, startDate?: string, endDate?: string): Promise<HabitEntry[]> {
  let query = db.entries.where('habitId').equals(habitId);

  const entries = await query.toArray();

  if (startDate && endDate) {
    return entries.filter(e => e.date >= startDate && e.date <= endDate);
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getTodayEntry(habitId: string): Promise<HabitEntry | undefined> {
  return getEntry(habitId, getTodayDate());
}

// STREAK OPERATIONS

export async function updateStreaks(habitId: string): Promise<void> {
  const habit = await getHabit(habitId);
  if (!habit) return;

  const entries = await getEntriesForHabit(habitId);
  if (entries.length === 0) return;

  // Sort entries by date
  const sortedEntries = entries.sort((a, b) => a.date.localeCompare(b.date));

  // Calculate current streak
  const today = getTodayDate();
  let currentStreak = 0;
  let streakStartDate = today;

  // Check backwards from today
  const checkDate = new Date();
  while (true) {
    const dateStr = formatDate(checkDate);

    // Don't count future dates
    if (dateStr > today) {
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    }

    // Check if this day should have an entry
    if (!shouldHaveEntry(habit, dateStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    }

    const entry = sortedEntries.find(e => e.date === dateStr);

    // For boolean habits, value must be 1
    // For quantifiable habits, any value > 0 counts
    const isCompleted = entry && (habit.type === 'boolean' ? entry.value === 1 : entry.value > 0);

    if (isCompleted) {
      currentStreak++;
      streakStartDate = dateStr;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // If today is not completed, that's okay - check yesterday
      if (dateStr === today) {
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      }
      break;
    }

    // Safety limit
    if (currentStreak > 1000) break;
  }

  // Get or create active streak
  const existingActiveStreak = await db.streaks
    .where('[habitId+isActive]')
    .equals([habitId, 1])
    .first();

  // Get longest streak ever
  const allStreaks = await db.streaks.where('habitId').equals(habitId).toArray();
  const longestStreak = Math.max(0, ...allStreaks.map(s => s.length));

  if (currentStreak > 0) {
    const isPersonalRecord = currentStreak > longestStreak;

    if (existingActiveStreak) {
      await db.streaks.update(existingActiveStreak.id, {
        startDate: streakStartDate,
        length: currentStreak,
        isPersonalRecord,
      });
    } else {
      await db.streaks.add({
        id: generateId(),
        habitId,
        startDate: streakStartDate,
        length: currentStreak,
        isActive: true,
        isPersonalRecord,
      });
    }
  } else if (existingActiveStreak) {
    // End the active streak
    await db.streaks.update(existingActiveStreak.id, {
      endDate: today,
      isActive: false,
    });
  }
}

export async function getCurrentStreak(habitId: string): Promise<number> {
  const streak = await db.streaks
    .where('[habitId+isActive]')
    .equals([habitId, 1])
    .first();

  return streak?.length || 0;
}

export async function getLongestStreak(habitId: string): Promise<number> {
  const streaks = await db.streaks.where('habitId').equals(habitId).toArray();
  return Math.max(0, ...streaks.map(s => s.length));
}

// RACE ALGORITHM

export async function calculateRaceData(habitId: string): Promise<RaceData> {
  const habit = await getHabit(habitId);
  if (!habit) {
    throw new Error('Habit not found');
  }

  const entries = await getEntriesForHabit(habitId);

  // For quantifiable habits: show all entries as race positions (each entry is a "race")
  // For boolean habits: use streak-based racing
  let currentValue = 0;
  let positions: RacePosition[] = [];

  if (habit.type === 'boolean') {
    // Boolean: race against streaks
    currentValue = await getCurrentStreak(habitId);

    // Get unique streak lengths from historical data
    const streakValues = new Set<number>();
    let tempStreak = 0;
    const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date));

    for (let i = 0; i < sortedEntries.length; i++) {
      if (sortedEntries[i].value === 1) {
        tempStreak++;
        streakValues.add(tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Convert to positions
    const streakArray = Array.from(streakValues).sort((a, b) => b - a).slice(0, 10);
    positions = streakArray.map((value, index) => ({
      value,
      date: '',
      isPersonalRecord: index === 0,
      isCurrent: value === currentValue,
      position: index + 1,
    }));

  } else {
    // Quantifiable: each entry is a separate race position
    // Sort entries by value (best first for maximize, worst first for minimize)
    const sortedByValue = [...entries].sort((a, b) => {
      if (habit.direction === 'maximize') {
        return b.value - a.value;
      }
      return a.value - b.value;
    });

    // Sort by createdAt for most recent
    const sortedByDate = [...entries].sort((a, b) => b.createdAt - a.createdAt);
    const mostRecentEntry = sortedByDate[0];
    currentValue = mostRecentEntry?.value || 0;

    // 75% beste entries + 25% meest recente entries (for interesting race mix)
    const totalSlots = Math.min(entries.length, 10);
    const bestSlots = Math.ceil(totalSlots * 0.75);
    const recentSlots = totalSlots - bestSlots;

    const bestEntries = sortedByValue.slice(0, bestSlots);
    const recentEntries = sortedByDate
      .filter(e => !bestEntries.some(b => b.id === e.id))
      .slice(0, recentSlots);

    // Combine and remove duplicates
    const combinedEntries = [...bestEntries, ...recentEntries];
    const uniqueEntries = combinedEntries.filter((entry, index, self) =>
      index === self.findIndex(e => e.id === entry.id)
    );

    // Re-sort combined entries by value for proper positioning
    const raceEntries = uniqueEntries.sort((a, b) => {
      if (habit.direction === 'maximize') {
        return b.value - a.value;
      }
      return a.value - b.value;
    });

    const personalRecord = sortedByValue[0];

    positions = raceEntries.map((entry, index) => ({
      value: entry.value,
      date: entry.date,
      isPersonalRecord: entry.id === personalRecord?.id,
      isCurrent: mostRecentEntry ? entry.id === mostRecentEntry.id : false,
      position: index + 1,
    }));
  }

  // Find current position
  let currentPosition = 0;
  const currentInRace = positions.find(p => p.isCurrent);
  if (currentInRace) {
    currentPosition = currentInRace.position;
  } else if (positions.length > 0) {
    // Find where current value would rank
    for (let i = 0; i < positions.length; i++) {
      if (habit.direction === 'maximize') {
        if (currentValue >= positions[i].value) {
          currentPosition = positions[i].position;
          break;
        }
      } else {
        if (currentValue <= positions[i].value) {
          currentPosition = positions[i].position;
          break;
        }
      }
    }
    if (currentPosition === 0) {
      currentPosition = positions.length + 1;
    }
  }

  // Find personal record
  const personalRecord = positions.find(p => p.isPersonalRecord);

  // Calculate next target
  let nextTarget: RaceData['nextTarget'] | undefined;

  if (currentPosition > 1) {
    const nextPos = positions.find(p => p.position === currentPosition - 1);
    if (nextPos) {
      // Estimate date to reach next position based on improvement trend
      const estimatedDate = await estimateReachDate(habitId, currentValue, nextPos.value, habit.direction);

      nextTarget = {
        value: nextPos.value,
        position: nextPos.position,
        estimatedDate,
      };
    }
  }

  // Ensure currentPosition never exceeds totalPositions
  const totalPositions = positions.length;
  const validCurrentPosition = totalPositions > 0 ? Math.min(currentPosition, totalPositions) : 0;

  return {
    habitId,
    currentValue,
    currentPosition: validCurrentPosition,
    totalPositions,
    positions: positions.slice(0, 10),
    nextTarget,
    previousRecord: personalRecord ? {
      value: personalRecord.value,
      date: personalRecord.date,
    } : undefined,
  };
}

async function estimateReachDate(
  habitId: string,
  currentValue: number,
  targetValue: number,
  direction: 'maximize' | 'minimize'
): Promise<string | undefined> {
  const entries = await getEntriesForHabit(habitId);

  if (entries.length < 7) {
    return undefined; // Not enough data
  }

  // Get last 30 days of entries
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentEntries = entries
    .filter(e => parseDate(e.date) >= thirtyDaysAgo)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (recentEntries.length < 7) {
    return undefined;
  }

  // Calculate linear regression for trend
  const n = recentEntries.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  recentEntries.forEach((entry, i) => {
    sumX += i;
    sumY += entry.value;
    sumXY += i * entry.value;
    sumX2 += i * i;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  // Check if trend is in the right direction
  if (direction === 'maximize' && slope <= 0) {
    return undefined; // Not improving
  }
  if (direction === 'minimize' && slope >= 0) {
    return undefined; // Not improving
  }

  // Calculate days to reach target
  const valueGap = Math.abs(targetValue - currentValue);
  const dailyImprovement = Math.abs(slope);

  if (dailyImprovement === 0) {
    return undefined;
  }

  const daysToTarget = Math.ceil(valueGap / dailyImprovement);

  // Cap at reasonable estimate (180 days)
  if (daysToTarget > 180) {
    return undefined;
  }

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysToTarget);

  return formatDate(targetDate);
}

// STATISTICS

export async function getHabitStats(habitId: string): Promise<HabitStats> {
  const habit = await getHabit(habitId);
  if (!habit) {
    throw new Error('Habit not found');
  }

  const entries = await getEntriesForHabit(habitId);
  const currentStreak = await getCurrentStreak(habitId);
  const longestStreak = await getLongestStreak(habitId);

  if (entries.length === 0) {
    return {
      habitId,
      totalEntries: 0,
      currentStreak: 0,
      longestStreak: 0,
      averageValue: 0,
      totalValue: 0,
      completionRate: 0,
      bestValue: 0,
      worstValue: 0,
      trend: 'stable',
      trendPercentage: 0,
    };
  }

  const values = entries.map(e => e.value);
  const totalValue = values.reduce((sum, v) => sum + v, 0);
  const averageValue = totalValue / values.length;

  // Best and worst based on direction
  let bestValue: number, worstValue: number;
  if (habit.direction === 'maximize') {
    bestValue = Math.max(...values);
    worstValue = Math.min(...values);
  } else {
    bestValue = Math.min(...values);
    worstValue = Math.max(...values);
  }

  // Completion rate (for boolean habits)
  const completionRate = habit.type === 'boolean'
    ? (values.filter(v => v === 1).length / values.length) * 100
    : (values.filter(v => v > 0).length / values.length) * 100;

  // Calculate trend (last 14 days vs previous 14 days)
  const sortedByDate = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const recent = sortedByDate.slice(-14);
  const previous = sortedByDate.slice(-28, -14);

  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  let trendPercentage = 0;

  if (recent.length >= 7 && previous.length >= 7) {
    const recentAvg = recent.reduce((sum, e) => sum + e.value, 0) / recent.length;
    const previousAvg = previous.reduce((sum, e) => sum + e.value, 0) / previous.length;

    if (previousAvg > 0) {
      trendPercentage = ((recentAvg - previousAvg) / previousAvg) * 100;

      if (habit.direction === 'maximize') {
        trend = trendPercentage > 5 ? 'improving' : trendPercentage < -5 ? 'declining' : 'stable';
      } else {
        trend = trendPercentage < -5 ? 'improving' : trendPercentage > 5 ? 'declining' : 'stable';
      }
    }
  }

  return {
    habitId,
    totalEntries: entries.length,
    currentStreak,
    longestStreak,
    averageValue,
    totalValue,
    completionRate,
    bestValue,
    worstValue,
    trend,
    trendPercentage: Math.abs(trendPercentage),
  };
}

// Quick check-in for boolean habits
export async function quickCheckIn(habitId: string): Promise<HabitEntry> {
  const today = getTodayDate();
  const existing = await getEntry(habitId, today);

  // Toggle value
  const newValue = existing?.value === 1 ? 0 : 1;

  return createEntry(habitId, today, newValue);
}

// Check-in with value for quantifiable habits
export async function checkInWithValue(habitId: string, value: number, notes?: string, date?: string, isAttempt?: boolean): Promise<HabitEntry> {
  return createEntry(habitId, date || getTodayDate(), value, notes, isAttempt);
}
