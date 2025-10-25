import { Call, CallLog, CallSummary, Contact, ContactInstruction, CustomInstruction } from '@prisma/client';
import { z } from 'zod';
import { openai, defaultCallModel, defaultSummaryModel } from '@/lib/openai';
import type { ResponseInput } from 'openai/resources/responses/responses';

export type ConversationTurn = Pick<CallLog, 'role' | 'content' | 'createdAt'>;

type AgentContext = {
  call: Call & { contact: Contact | null; summary?: CallSummary | null };
  instructions: (CustomInstruction | ContactInstruction)[];
  history: ConversationTurn[];
  userInput?: string;
};

const agentSchema = z.object({
  reply: z.string().default(''),
  shouldHangup: z.boolean().default(false),
  followUp: z
    .object({
      nextSteps: z.string().optional(),
      schedule: z
        .object({
          time: z.string(),
          notes: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  intent: z
    .object({
      label: z.string(),
      confidence: z.number().min(0).max(1).default(0.5),
    })
    .optional(),
});

function buildSystemMessage(context: AgentContext) {
  const instructions = context.instructions
    .map((instruction) => instruction.content)
    .filter(Boolean)
    .join('\n\n');

  const contact = context.call.contact;
  const summary = context.call.summary;

  const pieces = [
    'You are an autonomous phone agent handling a live call on behalf of the user. '
      + 'Respond succinctly, politely, and confidently. Confirm critical details back to the contact.',
    'Never mention that you are an AI. Speak as the user would. Maintain a warm tone.',
    'Keep responses short (2 sentences max) unless you are providing a summary or answering a complex question.',
    'If you are asked something you cannot do (e.g., provide sensitive data), politely decline.',
  ];

  if (instructions) {
    pieces.push('Custom instructions:\n' + instructions);
  }

  if (context.call.goal) {
    pieces.push(`Call goal: ${context.call.goal}`);
  }

  if (contact) {
    pieces.push(
      `Contact profile: ${contact.name} (${contact.phoneNumber})${contact.notes ? ` | Notes: ${contact.notes}` : ''}`,
    );
  }

  if (summary) {
    pieces.push('Recent call memory:\n' + summary.summary);
    if (summary.nextSteps) {
      pieces.push('Outstanding follow-ups:\n' + summary.nextSteps);
    }
  }

  pieces.push(
    'When you conclude the call or achieve the goal, set shouldHangup to true. '
      + 'Whenever you promise a follow-up, populate followUp.nextSteps and optionally followUp.schedule.',
  );

  return pieces.join('\n\n');
}

export async function generateAgentTurn(context: AgentContext) {
  if (!openai) {
    throw new Error('OpenAI client is not configured.');
  }

  const system = buildSystemMessage(context);

  const input: ResponseInput = [
    {
      role: 'system',
      content: system,
    },
    ...context.history.map((turn) => ({
      role: turn.role === 'ASSISTANT' ? ('assistant' as const) : ('user' as const),
      content: turn.content,
    })),
  ];

  if (context.userInput) {
    input.push({
      role: 'user',
      content: context.userInput,
    });
  }

  const response = await openai.responses.create({
    model: defaultCallModel,
    input,
    temperature: 0.6,
    max_output_tokens: 200,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'agent_turn',
        schema: {
          type: 'object',
          properties: {
            reply: { type: 'string' },
            shouldHangup: { type: 'boolean' },
            followUp: {
              type: 'object',
              properties: {
                nextSteps: { type: 'string' },
                schedule: {
                  type: 'object',
                  properties: {
                    time: { type: 'string' },
                    notes: { type: 'string' },
                  },
                  required: ['time'],
                },
              },
            },
            intent: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                confidence: { type: 'number' },
              },
              required: ['label', 'confidence'],
            },
          },
          required: ['reply', 'shouldHangup'],
        },
      },
    },
  } as any);

  const payload = (() => {
    try {
      return JSON.parse(response.output_text ?? '{}');
    } catch (error) {
      console.error('Failed to parse agent response payload', error);
      return {};
    }
  })();

  const parsed = agentSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error('Agent response did not match expected schema.');
  }

  return parsed.data;
}

export async function generateCallSummary(call: Call, history: ConversationTurn[]) {
  if (!openai) {
    throw new Error('OpenAI client is not configured.');
  }

  const summaryPrompt = [
    {
      role: 'system' as const,
      content:
        'You are a meticulous call summarizer. Produce a JSON object with summary, nextSteps, and followUpBy (ISO8601 string or null).',
    },
    {
      role: 'user' as const,
      content: `Conversation transcript:\n${history
        .map((turn) => `${turn.role}: ${turn.content}`)
        .join('\n')}`,
    },
  ];

  const summary = await openai.responses.create({
    model: defaultSummaryModel,
    input: summaryPrompt,
    temperature: 0.2,
    max_output_tokens: 300,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'call_summary',
        schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            nextSteps: { type: 'string' },
            followUpBy: { type: ['string', 'null'] },
          },
          required: ['summary'],
        },
      },
    },
  } as any);

  const payload = (() => {
    try {
      return JSON.parse(summary.output_text ?? '{}');
    } catch (error) {
      console.error('Failed to parse call summary payload', error);
      return {};
    }
  })() as {
    summary?: string;
    nextSteps?: string | null;
    followUpBy?: string | null;
  };

  return {
    summary: payload.summary ?? 'No summary generated.',
    nextSteps: payload.nextSteps ?? null,
    followUpBy: payload.followUpBy ?? null,
  };
}
