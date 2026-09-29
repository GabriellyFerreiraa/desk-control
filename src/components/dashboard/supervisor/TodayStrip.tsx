import { cn } from '@/lib/utils';
import { useT } from '@/i18n/lang';

export interface TodayCounts {
  toReview: number;
  absent: number;
  onShift: number;
  onBreak: number;
  total: number;
  activeTasks: number;
}

export type StripTarget = 'action' | 'team' | 'tasks';

interface TodayStripProps {
  dateLabel: string;
  updatedLabel: string;
  counts: TodayCounts;
  onSelect: (target: StripTarget) => void;
}

// One line that answers "what is going on now". Each chip jumps to the
// place where that information lives. Color only when something needs
// attention; otherwise neutral.
export const TodayStrip = ({ dateLabel, updatedLabel, counts, onSelect }: TodayStripProps) => {
  const t = useT();
  const ts = t.supervisor;

  const chips: { key: string; label: string; dot: string; attention?: boolean; target: StripTarget }[] = [
    { key: 'review', label: ts.chips.toReview(counts.toReview), dot: counts.toReview > 0 ? 'bg-status-pending' : 'bg-status-neutral/40', attention: counts.toReview > 0, target: 'action' },
    { key: 'absent', label: ts.chips.absent(counts.absent), dot: counts.absent > 0 ? 'bg-status-pending' : 'bg-status-neutral/40', target: 'team' },
    { key: 'shift', label: ts.chips.onShift(counts.onShift, counts.total), dot: counts.onShift > 0 ? 'bg-status-success' : 'bg-status-neutral/40', target: 'team' },
    { key: 'break', label: ts.chips.onBreak(counts.onBreak), dot: counts.onBreak > 0 ? 'bg-status-info' : 'bg-status-neutral/40', target: 'team' },
    { key: 'tasks', label: ts.chips.activeTasks(counts.activeTasks), dot: 'bg-status-neutral/40', target: 'tasks' },
  ];

  return <section aria-label={dateLabel} className="rounded-lg border bg-card px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold">{ts.today(dateLabel)}</h2>
          <p className="text-xs text-muted-foreground">{updatedLabel}</p>
        </div>
        <ul className="flex flex-wrap gap-2">
          {chips.map((chip) => <li key={chip.key}>
              <button
                type="button"
                onClick={() => onSelect(chip.target)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  chip.attention && 'border-status-pending/40 bg-status-pending/10 font-medium text-status-pending-fg hover:bg-status-pending/15'
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', chip.dot)} aria-hidden />
                {chip.label}
              </button>
            </li>)}
        </ul>
      </div>
    </section>;
};
