'use client';

import { useEffect, useMemo, useState } from 'react';
import { PlusIcon, PhoneIcon, RefreshCwIcon, Trash2Icon, UploadCloudIcon, UserPlusIcon } from 'lucide-react';
import { Call, CallSummary, CustomInstruction, CallIntent } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/status-badge';
import { CallDetailsDrawer } from '@/components/call-details-drawer';
import { useDashboardData, ContactWithInstruction } from '@/hooks/use-dashboard-data';
import { cn } from '@/lib/utils';

interface CallWithExtras extends Call {
  contact: ContactWithInstruction | null;
  summary: CallSummary | null;
  intent: CallIntent | null;
}

const getManualNumber = (call: CallWithExtras | null) => {
  if (!call?.metadata || typeof call.metadata !== 'object') {
    return undefined;
  }
  const metadata = call.metadata as Prisma.JsonObject;
  const value = metadata.manualNumber;
  if (!value) return undefined;
  return typeof value === 'string' ? value : String(value);
};

export function Dashboard() {
  const { contacts, instructions, calls, loading, error, refresh } = useDashboardData();
  const [selectedCall, setSelectedCall] = useState<CallWithExtras | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [callGoal, setCallGoal] = useState('');
  const [callContactId, setCallContactId] = useState<string>('');
  const [manualNumber, setManualNumber] = useState('');
  const [creatingCall, setCreatingCall] = useState(false);

  const [newContactName, setNewContactName] = useState('');
  const [newContactNumber, setNewContactNumber] = useState('');
  const [newContactNotes, setNewContactNotes] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  const [instructionTitle, setInstructionTitle] = useState('');
  const [instructionContent, setInstructionContent] = useState('');
  const [savingInstruction, setSavingInstruction] = useState(false);

  const [contactInstructionDrafts, setContactInstructionDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!contacts) return;
    setContactInstructionDrafts((previous) => {
      const next = { ...previous };
      contacts.forEach((contact) => {
        if (next[contact.id] === undefined) {
          next[contact.id] = contact.instruction?.content ?? '';
        }
      });
      return next;
    });
  }, [contacts]);

  const activeCalls = useMemo(
    () => (calls ?? []).filter((call) => call.status === 'PENDING' || call.status === 'IN_PROGRESS'),
    [calls],
  );
  const pastCalls = useMemo(() => (calls ?? []).filter((call) => call.status === 'COMPLETED'), [calls]);

  const startCall = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreatingCall(true);
    try {
      const payload: Record<string, unknown> = {
        goal: callGoal.trim() || undefined,
        metadata: {},
      };

      if (callContactId) {
        payload.contactId = callContactId;
      } else if (manualNumber.trim()) {
        payload.phoneNumber = manualNumber.trim();
        payload.metadata = { manualNumber: manualNumber.trim() };
      } else {
        throw new Error('Select a contact or provide a phone number.');
      }

      const response = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Failed to initiate call');
      }

      setCallGoal('');
      setManualNumber('');
      setCallContactId('');
      refresh();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to start call');
    } finally {
      setCreatingCall(false);
    }
  };

  const saveContact = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingContact(true);
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newContactName.trim(),
          phoneNumber: newContactNumber.trim(),
          notes: newContactNotes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Unable to create contact');
      }

      setNewContactName('');
      setNewContactNumber('');
      setNewContactNotes('');
      refresh();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Unable to create contact');
    } finally {
      setSavingContact(false);
    }
  };

  const saveInstruction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingInstruction(true);
    try {
      const response = await fetch('/api/instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: instructionTitle.trim(),
          content: instructionContent.trim(),
          active: true,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Unable to save instruction');
      }

      setInstructionTitle('');
      setInstructionContent('');
      refresh();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Unable to save instruction');
    } finally {
      setSavingInstruction(false);
    }
  };

  const toggleInstruction = async (instruction: CustomInstruction) => {
    const response = await fetch(`/api/instructions/${instruction.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !instruction.active }),
    });

    if (!response.ok) {
      alert('Unable to update instruction');
      return;
    }
    refresh();
  };

  const deleteInstruction = async (instruction: CustomInstruction) => {
    if (!confirm(`Delete instruction “${instruction.title}”?`)) {
      return;
    }
    const response = await fetch(`/api/instructions/${instruction.id}`, { method: 'DELETE' });
    if (!response.ok) {
      alert('Unable to delete instruction');
      return;
    }
    refresh();
  };

  const openCallDetails = (call: CallWithExtras) => {
    setSelectedCall(call);
    setDrawerOpen(true);
  };

  const hangupCall = async (call: CallWithExtras) => {
    if (!confirm('Hang up this call?')) return;
    const response = await fetch(`/api/calls/${call.id}/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'hangup' }),
    });
    if (!response.ok) {
      alert('Failed to hang up call');
      return;
    }
    refresh();
  };

  const saveContactInstruction = async (contact: ContactWithInstruction) => {
    const content = contactInstructionDrafts[contact.id]?.trim();

    if (!content) {
      const response = await fetch(`/api/contacts/${contact.id}/instruction`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        alert('Unable to clear instruction');
      } else {
        refresh();
      }
      return;
    }

    const response = await fetch(`/api/contacts/${contact.id}/instruction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      alert('Unable to save contact instruction');
      return;
    }

    refresh();
  };

  return (
    <div className="min-h-screen space-y-10 p-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-50">AI Phone Assistant</h1>
          <p className="mt-1 text-sm text-slate-400">
            Launch, monitor, and review autonomous phone calls with natural voice conversations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => refresh()} className="gap-2" disabled={loading}>
            <RefreshCwIcon className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          Unable to load dashboard data. Check your API credentials and database configuration.
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <form onSubmit={startCall} className="space-y-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <PhoneIcon className="h-5 w-5 text-sky-300" />
                Launch a Call
              </CardTitle>
              <CardDescription>
                Choose a contact or dial manually, define the goal, and the agent will handle the rest.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300" htmlFor="contact">
                    Contact
                  </label>
                  <select
                    id="contact"
                    value={callContactId}
                    onChange={(event) => setCallContactId(event.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  >
                    <option value="">Select contact…</option>
                    {contacts?.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name} ({contact.phoneNumber})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300" htmlFor="manualNumber">
                    Manual number
                  </label>
                  <Input
                    id="manualNumber"
                    placeholder="+1 555 123 4567"
                    value={manualNumber}
                    onChange={(event) => setManualNumber(event.target.value)}
                    disabled={Boolean(callContactId)}
                  />
                  <p className="text-xs text-slate-500">
                    Provide a number if no contact is selected. The assistant will dial it directly.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300" htmlFor="goal">
                  Call goal / context
                </label>
                <Textarea
                  id="goal"
                  rows={4}
                  placeholder="e.g. Reschedule Dr. Sharma appointment to next Tuesday after 10 AM"
                  value={callGoal}
                  onChange={(event) => setCallGoal(event.target.value)}
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <Button type="submit" className="gap-2" disabled={creatingCall}>
                  <PhoneIcon className={cn('h-4 w-4', creatingCall && 'animate-pulse')} />
                  {creatingCall ? 'Dialing…' : 'Start Call'}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <UserPlusIcon className="h-5 w-5 text-emerald-300" />
              Add Contact
            </CardTitle>
            <CardDescription>Securely store contacts for quick access and memory retention.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveContact} className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300" htmlFor="contactName">
                  Name
                </label>
                <Input
                  id="contactName"
                  value={newContactName}
                  onChange={(event) => setNewContactName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300" htmlFor="contactNumber">
                  Phone number
                </label>
                <Input
                  id="contactNumber"
                  value={newContactNumber}
                  onChange={(event) => setNewContactNumber(event.target.value)}
                  placeholder="+1 555 123 4567"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300" htmlFor="contactNotes">
                  Notes
                </label>
                <Textarea
                  id="contactNotes"
                  rows={3}
                  value={newContactNotes}
                  onChange={(event) => setNewContactNotes(event.target.value)}
                  placeholder="Preferred call times, assistant tone, key preferences…"
                />
              </div>
              <Button type="submit" className="w-full" disabled={savingContact}>
                {savingContact ? 'Saving…' : 'Save contact'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Active Calls</CardTitle>
            <CardDescription>Monitor live automations, intervene, or review details in real time.</CardDescription>
          </CardHeader>
          <CardContent>
            {activeCalls.length === 0 ? (
              <p className="text-sm text-slate-400">No active calls at the moment.</p>
            ) : (
              <div className="space-y-4">
                {activeCalls.map((call) => (
                  <div
                    key={call.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-medium text-slate-100">
                          {call.contact?.name ?? getManualNumber(call) ?? call.callSid}
                        </h3>
                        <StatusBadge status={call.status} />
                      </div>
                      <p className="text-sm text-slate-400">
                        Goal: {call.goal ?? 'Follow user instructions and assist the caller'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Started {call.startedAt ? new Date(call.startedAt).toLocaleTimeString() : 'pending'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" onClick={() => openCallDetails(call)} className="gap-2">
                        <UploadCloudIcon className="h-4 w-4" /> View
                      </Button>
                      <Button variant="destructive" onClick={() => hangupCall(call)} className="gap-2">
                        <PhoneIcon className="h-4 w-4" /> Hang up
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instruction Library</CardTitle>
            <CardDescription>Define how the assistant should speak and behave across scenarios.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={saveInstruction} className="space-y-3">
              <Input
                placeholder="Instruction title"
                value={instructionTitle}
                onChange={(event) => setInstructionTitle(event.target.value)}
                required
              />
              <Textarea
                rows={3}
                placeholder="e.g. For medical offices, start with a warm greeting and confirm availability politely."
                value={instructionContent}
                onChange={(event) => setInstructionContent(event.target.value)}
                required
              />
              <Button type="submit" className="w-full" disabled={savingInstruction}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Instruction
              </Button>
            </form>
            <div className="space-y-3">
              {(instructions ?? []).map((instruction) => (
                <div
                  key={instruction.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">{instruction.title}</h3>
                      <p className="mt-1 text-xs text-slate-400 whitespace-pre-wrap">
                        {instruction.content}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 text-xs">
                      <Button
                        variant={instruction.active ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => toggleInstruction(instruction)}
                      >
                        {instruction.active ? 'Disable' : 'Activate'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-300 hover:text-rose-100"
                        onClick={() => deleteInstruction(instruction)}
                      >
                        <Trash2Icon className="mr-1 h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      'mt-3',
                      instruction.active ? 'bg-emerald-400/15 text-emerald-200' : 'bg-slate-700/60 text-slate-300',
                    )}
                  >
                    {instruction.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              ))}
              {(instructions ?? []).length === 0 && (
                <p className="text-sm text-slate-400">
                  No instructions yet. Create one to steer the assistant’s tone and logic.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact Directory</CardTitle>
            <CardDescription>Secure contact list with AI memory for each relationship.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(contacts ?? []).map((contact) => (
              <div key={contact.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">{contact.name}</h3>
                    <p className="text-xs text-slate-400">{contact.phoneNumber}</p>
                  </div>
                </div>
                {contact.notes && (
                  <p className="mt-3 text-xs text-slate-400 whitespace-pre-wrap">{contact.notes}</p>
                )}
                <div className="mt-3 space-y-2">
                  <label className="text-xs font-medium text-slate-300" htmlFor={`instruction-${contact.id}`}>
                    Contact-specific instructions
                  </label>
                  <Textarea
                    id={`instruction-${contact.id}`}
                    rows={3}
                    value={contactInstructionDrafts[contact.id] ?? ''}
                    onChange={(event) =>
                      setContactInstructionDrafts((previous) => ({
                        ...previous,
                        [contact.id]: event.target.value,
                      }))
                    }
                    placeholder="Remind the clinic about insurance details, preferred tone, etc."
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => saveContactInstruction(contact)}>
                      Save instruction
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-300 hover:text-rose-100"
                      onClick={async () => {
                        setContactInstructionDrafts((previous) => ({
                          ...previous,
                          [contact.id]: '',
                        }));
                        const response = await fetch(`/api/contacts/${contact.id}/instruction`, {
                          method: 'DELETE',
                        });
                        if (!response.ok) {
                          alert('Unable to clear instruction');
                          return;
                        }
                        refresh();
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {(contacts ?? []).length === 0 && (
              <p className="text-sm text-slate-400">No contacts yet. Add one on the right to get started.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Call Summaries</CardTitle>
            <CardDescription>Every conversation is summarized automatically with next steps.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(pastCalls ?? []).slice(0, 6).map((call) => (
              <div key={call.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      {call.contact?.name ?? getManualNumber(call) ?? 'Unknown contact'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {call.endedAt ? new Date(call.endedAt).toLocaleString() : 'Completed'}
                    </p>
                  </div>
                  {call.summary?.followUpBy && (
                    <Badge className="bg-amber-400/20 text-amber-100">
                      Follow-up {new Date(call.summary.followUpBy).toLocaleDateString()}
                    </Badge>
                  )}
                </div>
                <p className="mt-3 text-sm text-slate-200 whitespace-pre-wrap">
                  {call.summary?.summary ?? 'Summary not generated yet.'}
                </p>
                {call.summary?.nextSteps && (
                  <div className="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-100">
                    <p className="font-semibold uppercase tracking-wide text-sky-200">Next steps</p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-100">{call.summary.nextSteps}</p>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                  <span>
                    Duration:
                    {call.startedAt && call.endedAt
                      ? ` ${Math.max(
                          1,
                          Math.round(
                            (new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 60000,
                          ),
                        )} min`
                      : ' N/A'}
                  </span>
                  {call.intent && <span>Intent: {call.intent.intent}</span>}
                </div>
              </div>
            ))}
            {(pastCalls ?? []).length === 0 && (
              <p className="text-sm text-slate-400">No completed calls yet. Summaries will appear here.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <CallDetailsDrawer call={selectedCall} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
