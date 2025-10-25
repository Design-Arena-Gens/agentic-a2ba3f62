import { CallStatus, CallRole } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { twilioClient, twilioPhoneNumber, twilioStatusCallbackUrl } from '@/lib/twilio';
import { getBaseUrl } from '@/lib/url';
import { generateAgentTurn, generateCallSummary } from './agent';
import { z } from 'zod';

export const createCallInputSchema = z.object({
  contactId: z.string().optional(),
  phoneNumber: z.string().optional(),
  direction: z.enum(['OUTBOUND', 'INBOUND']).default('OUTBOUND'),
  goal: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type CreateCallInput = z.infer<typeof createCallInputSchema>;

export async function createOutboundCall(input: CreateCallInput) {
  const data = createCallInputSchema.parse({ ...input, direction: 'OUTBOUND' });

  if (!data.contactId && !data.phoneNumber) {
    throw new Error('Either contactId or phoneNumber is required to place a call.');
  }

  const contact = data.contactId
    ? await prisma.contact.findUnique({ where: { id: data.contactId } })
    : null;

  const toNumber = contact?.phoneNumber ?? data.phoneNumber!;

  const metadata = data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined;

  const call = await prisma.call.create({
    data: {
      contactId: contact?.id,
      direction: 'OUTBOUND',
      goal: data.goal,
      metadata,
    },
  });

  if (!twilioClient) {
    throw new Error('Twilio client is not configured.');
  }

  const baseUrl = getBaseUrl();

  const response = await twilioClient.calls.create({
    to: toNumber,
    from: twilioPhoneNumber,
    url: `${baseUrl}/api/twilio/voice?callId=${call.id}`,
    statusCallback: twilioStatusCallbackUrl || undefined,
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    machineDetection: 'DetectMessageEnd',
    sendDigits: undefined,
  });

  await prisma.call.update({
    where: { id: call.id },
    data: {
      callSid: response.sid,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    },
  });

  return call;
}

export async function appendCallLog(callId: string, role: CallRole, content: string) {
  return prisma.callLog.create({
    data: {
      callId,
      role,
      content,
    },
  });
}

export async function handleAgentTurn(callId: string, userInput: string | undefined) {
  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: {
      contact: {
        include: {
          instruction: true,
        },
      },
      summary: true,
      logs: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!call) {
    throw new Error('Call not found');
  }

  const instructions = await prisma.customInstruction.findMany({
    where: { active: true },
  });

  const history = call.logs.map((log) => ({
    role: log.role,
    content: log.content,
    createdAt: log.createdAt,
  }));

  const agentResult = await generateAgentTurn({
    call,
    instructions: [
      ...instructions,
      ...(call.contact?.instruction ? [call.contact.instruction] : []),
    ],
    history,
    userInput,
  });

  await appendCallLog(callId, 'ASSISTANT', agentResult.reply);

  if (agentResult.intent) {
    await prisma.callIntent.upsert({
      where: { callId },
      update: {
        intent: agentResult.intent.label,
        confidence: agentResult.intent.confidence,
      },
      create: {
        callId,
        intent: agentResult.intent.label,
        confidence: agentResult.intent.confidence,
      },
    });
  }

  if (agentResult.followUp?.nextSteps || agentResult.followUp?.schedule) {
    await prisma.callSummary.upsert({
      where: { callId },
      update: {
        nextSteps: agentResult.followUp?.nextSteps ?? undefined,
        followUpBy: agentResult.followUp?.schedule?.time
          ? new Date(agentResult.followUp.schedule.time)
          : undefined,
      },
      create: {
        callId,
        summary: 'Pending summary',
        nextSteps: agentResult.followUp?.nextSteps,
        followUpBy: agentResult.followUp?.schedule?.time
          ? new Date(agentResult.followUp.schedule.time)
          : undefined,
      },
    });
  }

  return agentResult;
}

export async function finalizeCall(callId: string) {
  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: {
      logs: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!call) return;

  const history = call.logs.map((log) => ({
    role: log.role,
    content: log.content,
    createdAt: log.createdAt,
  }));

  const summary = await generateCallSummary(call, history);

  await prisma.callSummary.upsert({
    where: { callId },
    update: {
      summary: summary.summary,
      nextSteps: summary.nextSteps ?? undefined,
      followUpBy: summary.followUpBy ? new Date(summary.followUpBy) : undefined,
    },
    create: {
      callId,
      summary: summary.summary,
      nextSteps: summary.nextSteps ?? undefined,
      followUpBy: summary.followUpBy ? new Date(summary.followUpBy) : undefined,
    },
  });

  await prisma.call.update({
    where: { id: callId },
    data: {
      status: 'COMPLETED',
      endedAt: new Date(),
    },
  });
}

export async function updateCallStatusBySid(callSid: string, status: CallStatus) {
  await prisma.call.updateMany({
    where: { callSid },
    data: { status },
  });
}

export async function hangupCall(callSid: string) {
  if (!twilioClient) {
    throw new Error('Twilio client is not configured.');
  }

  await twilioClient.calls(callSid).update({ status: 'completed' });
}
