import { CallLog, CallRole } from '@prisma/client';
import { cn } from '@/lib/utils';

const roleColors: Record<CallRole, string> = {
  USER: 'border-sky-400/40 bg-sky-400/10 text-sky-100',
  ASSISTANT: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
  SYSTEM: 'border-slate-500/40 bg-slate-800/60 text-slate-200',
  CONTACT: 'border-indigo-400/30 bg-indigo-400/10 text-indigo-100',
};

const roleLabel: Record<CallRole, string> = {
  USER: 'You',
  ASSISTANT: 'Agent',
  SYSTEM: 'System',
  CONTACT: 'Contact',
};

export function CallLogTimeline({ logs }: { logs: CallLog[] }) {
  if (!logs?.length) {
    return <p className="text-sm text-slate-400">No conversation turns recorded yet.</p>;
  }

  return (
    <ol className="space-y-4">
      {logs.map((log) => (
        <li key={log.id} className="flex gap-3">
          <div className="relative flex flex-col items-center">
            <div className="h-2 w-2 rounded-full bg-slate-500" />
            <div className="flex-1 border-l border-slate-800" />
          </div>
          <div className="flex-1">
            <div
              className={cn(
                'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium uppercase tracking-wide',
                roleColors[log.role],
              )}
            >
              {roleLabel[log.role]}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
              {log.content}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {new Date(log.createdAt).toLocaleString()}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
