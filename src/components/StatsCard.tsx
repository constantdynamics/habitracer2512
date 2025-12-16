import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Trophy, Target, Calendar, Zap, Award } from 'lucide-react';
import { HabitStats, Habit, HabitEntry } from '../types';

interface StatsCardProps {
  habit: Habit;
  stats: HabitStats;
  entries: HabitEntry[];
  currentStreak: number;
}

export function StatsCard({ habit, stats, entries, currentStreak }: StatsCardProps) {
  // Calculate additional stats
  const sortedByValue = [...entries].sort((a, b) => {
    if (habit.direction === 'maximize') {
      return b.value - a.value;
    }
    return a.value - b.value;
  });

  const top5 = sortedByValue.slice(0, 5);
  const recentEntries = [...entries]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 7);

  // Calculate improvement rate (last 7 vs previous 7)
  const sortedByDate = [...entries].sort((a, b) => b.createdAt - a.createdAt);
  const last7 = sortedByDate.slice(0, 7);
  const prev7 = sortedByDate.slice(7, 14);

  let improvementRate = 0;
  if (last7.length > 0 && prev7.length > 0) {
    const last7Avg = last7.reduce((sum, e) => sum + e.value, 0) / last7.length;
    const prev7Avg = prev7.reduce((sum, e) => sum + e.value, 0) / prev7.length;
    if (prev7Avg > 0) {
      improvementRate = ((last7Avg - prev7Avg) / prev7Avg) * 100;
    }
  }

  // Format value with unit
  const formatValue = (value: number) => {
    if (habit.metricType === 'duration') {
      if (value < 1) {
        return `${(value * 60).toFixed(0)}s`;
      }
      const mins = Math.floor(value);
      const secs = Math.round((value - mins) * 60);
      return secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins}m`;
    }
    return `${value.toFixed(value % 1 === 0 ? 0 : 1)} ${habit.unit || ''}`;
  };

  // Get trend icon
  const TrendIcon = stats.trend === 'improving' ? TrendingUp :
                    stats.trend === 'declining' ? TrendingDown : Minus;

  const trendColor = stats.trend === 'improving' ? 'text-green-400' :
                     stats.trend === 'declining' ? 'text-red-400' : 'text-white/40';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Personal Record */}
        <div className="bg-gradient-to-br from-vapor-gold/20 to-vapor-gold/5 rounded-xl p-4 border border-vapor-gold/30">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-vapor-gold" />
            <span className="text-xs text-vapor-gold/80">Persoonlijk record</span>
          </div>
          <div className="text-2xl font-bold text-vapor-gold">
            {formatValue(stats.bestValue)}
          </div>
          {top5[0] && (
            <div className="text-[10px] text-vapor-gold/60 mt-1">
              {new Date(top5[0].createdAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
            </div>
          )}
        </div>

        {/* Current Streak */}
        <div className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 rounded-xl p-4 border border-orange-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-orange-400/80">Huidige streak</span>
          </div>
          <div className="text-2xl font-bold text-orange-400">
            {currentStreak}
          </div>
          <div className="text-[10px] text-orange-400/60 mt-1">
            dagen op rij
          </div>
        </div>

        {/* Average */}
        <div className="bg-gradient-to-br from-vapor-cyan/20 to-vapor-cyan/5 rounded-xl p-4 border border-vapor-cyan/30">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-vapor-cyan" />
            <span className="text-xs text-vapor-cyan/80">Gemiddeld</span>
          </div>
          <div className="text-2xl font-bold text-vapor-cyan">
            {formatValue(stats.averageValue)}
          </div>
          <div className="text-[10px] text-vapor-cyan/60 mt-1">
            per poging
          </div>
        </div>

        {/* Total Entries */}
        <div className="bg-gradient-to-br from-vapor-pink/20 to-vapor-pink/5 rounded-xl p-4 border border-vapor-pink/30">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-vapor-pink" />
            <span className="text-xs text-vapor-pink/80">Totaal</span>
          </div>
          <div className="text-2xl font-bold text-vapor-pink">
            {stats.totalEntries}
          </div>
          <div className="text-[10px] text-vapor-pink/60 mt-1">
            pogingen
          </div>
        </div>
      </div>

      {/* Trend Card */}
      <div className="bg-gradient-to-br from-vapor-dark/80 to-vapor-darker/80 rounded-xl p-4 border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-white/60">Trend (laatste 14 dagen)</span>
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-sm font-medium">
              {stats.trend === 'improving' ? 'Verbetering' :
               stats.trend === 'declining' ? 'Achteruitgang' : 'Stabiel'}
            </span>
          </div>
        </div>

        {/* Mini Bar Chart - Last 7 entries */}
        {recentEntries.length > 0 && (
          <div className="flex items-end gap-1 h-16 mt-2">
            {recentEntries.reverse().map((entry, index) => {
              const maxValue = Math.max(...recentEntries.map(e => e.value), 1);
              const height = (entry.value / maxValue) * 100;
              const isLatest = index === recentEntries.length - 1;

              return (
                <div
                  key={entry.id}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: index * 0.05 }}
                    className={`w-full rounded-t ${
                      isLatest ? 'bg-vapor-cyan' : 'bg-vapor-pink/60'
                    }`}
                  />
                  <span className="text-[8px] text-white/30">
                    {new Date(entry.createdAt).toLocaleDateString('nl-NL', { day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {improvementRate !== 0 && (
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-white/40">Week-over-week</span>
            <span className={`text-sm font-medium ${improvementRate > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {improvementRate > 0 ? '+' : ''}{improvementRate.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Top 5 Best Performances */}
      {top5.length > 1 && (
        <div className="bg-gradient-to-br from-vapor-dark/80 to-vapor-darker/80 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-vapor-gold" />
            <span className="text-sm text-white/60">Top 5 beste pogingen</span>
          </div>
          <div className="space-y-2">
            {top5.map((entry, index) => {
              const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
              const bgOpacity = 100 - (index * 15);

              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between py-2 px-3 rounded-lg bg-white/${bgOpacity < 10 ? '5' : bgOpacity/10}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{medals[index]}</span>
                    <span className="text-sm text-white/60">
                      {new Date(entry.createdAt).toLocaleDateString('nl-NL', {
                        day: 'numeric',
                        month: 'short',
                        year: entry.createdAt < Date.now() - 365 * 24 * 60 * 60 * 1000 ? 'numeric' : undefined
                      })}
                    </span>
                  </div>
                  <span className={`font-mono font-medium ${index === 0 ? 'text-vapor-gold' : 'text-white'}`}>
                    {formatValue(entry.value)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Additional Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-vapor-darker/50 rounded-lg p-3 text-center">
          <div className="text-[10px] text-white/40 mb-1">Slechtste</div>
          <div className="text-sm font-medium text-white/60">
            {formatValue(stats.worstValue)}
          </div>
        </div>
        <div className="bg-vapor-darker/50 rounded-lg p-3 text-center">
          <div className="text-[10px] text-white/40 mb-1">Langste streak</div>
          <div className="text-sm font-medium text-white/60">
            {stats.longestStreak}d
          </div>
        </div>
        <div className="bg-vapor-darker/50 rounded-lg p-3 text-center">
          <div className="text-[10px] text-white/40 mb-1">Voltooiingsgraad</div>
          <div className="text-sm font-medium text-white/60">
            {stats.completionRate.toFixed(0)}%
          </div>
        </div>
      </div>
    </motion.div>
  );
}
