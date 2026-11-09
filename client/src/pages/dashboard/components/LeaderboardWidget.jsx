import { Trophy, Medal, Award, Flame, CheckCircle, Calendar } from 'lucide-react';
import { formatCurrency, initials } from '@/lib/utils';
import { WidgetCard } from './WidgetCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export function LeaderboardWidget({ leaderboard = [], isLoading = false, isError = false, onRetry }) {
  const getRankBadge = (rank) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs ring-1 ring-amber-500/30 shadow-xs">
            <Trophy className="h-3.5 w-3.5" />
          </div>
        );
      case 2:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-400/20 text-slate-700 dark:text-slate-300 font-bold text-xs ring-1 ring-slate-400/30">
            <Medal className="h-3.5 w-3.5" />
          </div>
        );
      case 3:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-700/20 text-amber-800 dark:text-amber-600 font-bold text-xs ring-1 ring-amber-700/30">
            <Award className="h-3.5 w-3.5" />
          </div>
        );
      default:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground font-mono text-[11px] font-semibold">
            {rank}
          </div>
        );
    }
  };

  return (
    <WidgetCard
      title="Sales Team Leaderboard"
      description="Top performers by won revenue, closed deals, and sales velocity"
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
    >
      <div className="space-y-3">
        {leaderboard.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No sales team performance metrics available.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {leaderboard.map((row, index) => {
              const rank = index + 1;
              const rep = row.user || {};

              return (
                <div
                  key={rep.id || index}
                  className="flex items-center justify-between py-3 gap-3 first:pt-0 last:pb-0"
                >
                  {/* Rank & Rep info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0">{getRankBadge(rank)}</div>

                    <Avatar className="h-9 w-9 shrink-0">
                      {rep.avatarUrl && <AvatarImage src={rep.avatarUrl} alt={rep.name} />}
                      <AvatarFallback>{initials(rep.name || 'User')}</AvatarFallback>
                    </Avatar>

                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {rep.name}
                        </span>
                        {rank === 1 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            <Flame className="h-3 w-3 fill-amber-500/20" /> Top Closer
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{rep.email}</p>
                    </div>
                  </div>

                  {/* Stats Breakdown */}
                  <div className="flex items-center gap-4 shrink-0 text-right">
                    <div className="hidden sm:block">
                      <div className="flex items-center gap-1 justify-end text-[11px] text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{row.activitiesLogged} activities</span>
                      </div>
                      <div className="flex items-center gap-1 justify-end text-[10px] text-muted-foreground">
                        <CheckCircle className="h-2.5 w-2.5 text-emerald-500" />
                        <span>{row.followUpsCompleted} completed</span>
                      </div>
                    </div>

                    <div className="min-w-[80px]">
                      <span className="text-sm font-bold text-foreground font-mono block">
                        {formatCurrency(row.wonValue)}
                      </span>
                      <Badge variant="won" className="text-[10px] px-1.5 py-0 font-medium">
                        {row.leadsWon} {row.leadsWon === 1 ? 'deal' : 'deals'} won
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WidgetCard>
  );
}

export default LeaderboardWidget;
