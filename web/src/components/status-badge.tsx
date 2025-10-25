import { CallStatus } from '@prisma/client';
import { cn } from '@/lib/utils';

const statusMap: Record<CallStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-slate-500/20 text-slate-200 border-slate-400/30' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-amber-500/15 text-amber-200 border-amber-400/30' },
  COMPLETED: { label: 'Completed', className: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/20' },
  FAILED: { label: 'Failed', className: 'bg-rose-500/15 text-rose-200 border-rose-400/20' },
  CANCELED: { label: 'Canceled', className: 'bg-slate-700/40 text-slate-300 border-slate-600/50' },
};

export function StatusBadge({ status }: { status: CallStatus }) {
  const info = statusMap[status] ?? statusMap.PENDING;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide',
        info.className,
      )}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {info.label}
    </span>
  );
}
