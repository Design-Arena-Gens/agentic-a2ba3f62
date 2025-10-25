'use client';

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import { Call, CallSummary, Contact, ContactInstruction, CallLog, CallIntent, Prisma } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CallLogTimeline } from '@/components/call-log-timeline';
import { fetchCallLogs } from '@/hooks/use-dashboard-data';
import { StatusBadge } from '@/components/status-badge';

export interface CallDetailsDrawerProps {
  call: (Call & { contact: (Contact & { instruction: ContactInstruction | null }) | null; summary: CallSummary | null; intent: CallIntent | null }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function resolveManualNumber(call: CallDetailsDrawerProps['call']) {
  const metadata = call?.metadata as Prisma.JsonObject | null;
  if (!metadata) return undefined;
  const value = metadata.manualNumber;
  if (!value) return undefined;
  return typeof value === 'string' ? value : String(value);
}

export function CallDetailsDrawer({ call, open, onOpenChange }: CallDetailsDrawerProps) {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const manualNumber = resolveManualNumber(call);

  useEffect(() => {
    if (!open || !call) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCallLogs(call.id);
        setLogs(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load logs');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [open, call]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-950/70 backdrop-blur" />
        <Dialog.Content className="fixed inset-y-0 right-0 flex w-full max-w-xl flex-col gap-6 overflow-y-auto border-l border-slate-800 bg-slate-950/96 p-8 shadow-2xl shadow-slate-950/60">
          <header className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-2xl font-semibold text-slate-50">
                {call?.contact?.name ?? manualNumber ?? 'Call Details'}
              </Dialog.Title>
              <p className="text-sm text-slate-400">
                {call?.contact?.phoneNumber ?? manualNumber ?? 'Unknown number'}
              </p>
            </div>
            <Dialog.Close asChild>
              <Button size="icon" variant="ghost" className="text-slate-400 hover:text-slate-100">
                <XIcon className="h-5 w-5" />
              </Button>
            </Dialog.Close>
          </header>

          {call && (
            <div className="space-y-4">
              <StatusBadge status={call.status} />
              {call.contact?.instruction?.content && (
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Instructions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm text-slate-200">
                      {call.contact.instruction.content}
                    </p>
                  </CardContent>
                </Card>
              )}
              {call.goal && (
                <Card>
                  <CardHeader>
                    <CardTitle>Call Goal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-200">{call.goal}</p>
                  </CardContent>
                </Card>
              )}

              {call.summary && (
                <Card>
                  <CardHeader>
                    <CardTitle>Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                      {call.summary.summary}
                    </p>
                    {call.summary.nextSteps && (
                      <div className="mt-4 rounded-lg border border-sky-400/30 bg-sky-400/10 p-4 text-sm text-sky-100">
                        <p className="font-medium uppercase tracking-wide text-sky-200">Next Steps</p>
                        <p className="mt-1 whitespace-pre-wrap text-slate-100">{call.summary.nextSteps}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {call.intent && (
                <Card>
                  <CardHeader>
                    <CardTitle>Detected Intent</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-slate-200">
                      <span>{call.intent.intent}</span>
                      <span className="text-slate-400">
                        Confidence: {(call.intent.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Conversation Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {loading && <p className="text-sm text-slate-400">Loading conversation…</p>}
              {error && <p className="text-sm text-rose-400">{error}</p>}
              {!loading && !error && <CallLogTimeline logs={logs} />}
            </CardContent>
          </Card>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
