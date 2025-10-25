import useSWR, { mutate } from 'swr';
import {
  Call,
  CallSummary,
  Contact,
  ContactInstruction,
  CustomInstruction,
  CallLog,
  CallIntent,
} from '@prisma/client';

type CallWithRelations = Call & {
  contact: (Contact & { instruction: ContactInstruction | null }) | null;
  summary: CallSummary | null;
  intent: CallIntent | null;
};

export type ContactWithInstruction = Contact & { instruction: ContactInstruction | null };

type FetcherKey = string;

const fetcher = async <T>(url: FetcherKey): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return response.json();
};

export function useDashboardData() {
  const {
    data: contacts,
    error: contactsError,
    isLoading: contactsLoading,
  } = useSWR<ContactWithInstruction[]>('/api/contacts', fetcher);

  const {
    data: instructions,
    error: instructionsError,
    isLoading: instructionsLoading,
  } = useSWR<CustomInstruction[]>('/api/instructions', fetcher);

  const {
    data: calls,
    error: callsError,
    isLoading: callsLoading,
  } = useSWR<CallWithRelations[]>('/api/calls', fetcher, { refreshInterval: 5000 });

  const refresh = () => {
    mutate('/api/contacts');
    mutate('/api/instructions');
    mutate('/api/calls');
  };

  return {
    contacts,
    instructions,
    calls,
    loading: contactsLoading || instructionsLoading || callsLoading,
    error: contactsError || instructionsError || callsError,
    refresh,
  };
}

export async function fetchCallLogs(callId: string) {
  const response = await fetch(`/api/calls/${callId}/logs`);
  if (!response.ok) {
    throw new Error('Unable to load call logs');
  }
  return (await response.json()) as CallLog[];
}
