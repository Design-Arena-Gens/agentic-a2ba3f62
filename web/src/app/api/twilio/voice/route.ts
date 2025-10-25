import { NextRequest, NextResponse } from 'next/server';
import { twiml } from 'twilio';
import { prisma } from '@/lib/prisma';
import {
  appendCallLog,
  finalizeCall,
  handleAgentTurn,
  updateCallStatusBySid,
} from '@/server/calls';
import { getBaseUrl } from '@/lib/url';

function buildTwimlResponse(callback: (response: twiml.VoiceResponse) => void) {
  const response = new twiml.VoiceResponse();
  callback(response);
  return new NextResponse(response.toString(), {
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const callIdParam = url.searchParams.get('callId');
  const formData = await request.formData();

  const callSid = (formData.get('CallSid') as string | null) ?? undefined;
  const speechResult = (formData.get('SpeechResult') as string | null) ?? undefined;
  const callStatus = (formData.get('CallStatus') as string | null) ?? undefined;
  const fromNumber = (formData.get('From') as string | null) ?? undefined;
  const toNumber = (formData.get('To') as string | null) ?? undefined;

  if (callSid && callStatus) {
    switch (callStatus) {
      case 'in-progress':
        await updateCallStatusBySid(callSid, 'IN_PROGRESS');
        break;
      case 'completed':
        await updateCallStatusBySid(callSid, 'COMPLETED');
        break;
      case 'failed':
      case 'busy':
      case 'no-answer':
        await updateCallStatusBySid(callSid, 'FAILED');
        break;
    }
  }

  let callId = callIdParam;

  if (!callId) {
    // Handle inbound call by ensuring we have a call record.
    const existing = callSid
      ? await prisma.call.findFirst({ where: { callSid } })
      : null;

    if (existing) {
      callId = existing.id;
    } else {
      const contact = fromNumber
        ? await prisma.contact.findFirst({ where: { phoneNumber: fromNumber } })
        : null;

      const created = await prisma.call.create({
        data: {
          callSid: callSid ?? undefined,
          direction: 'INBOUND',
          contactId: contact?.id,
          status: 'IN_PROGRESS',
          metadata: {
            fromNumber,
            toNumber,
          },
        },
      });

      callId = created.id;
    }
  }

  if (!callId) {
    return buildTwimlResponse((response) => {
      response.say({ voice: 'Polly.Joanna' }, 'We could not locate your call record. Goodbye.');
      response.hangup();
    });
  }

  if (speechResult) {
    await appendCallLog(callId, 'CONTACT', speechResult);
  }

  const agentTurn = await handleAgentTurn(callId, speechResult ?? undefined);

  if (agentTurn.shouldHangup) {
    await finalizeCall(callId);
    return buildTwimlResponse((response) => {
      response.say({ voice: 'Polly.Joanna' }, agentTurn.reply || 'Thank you. Goodbye.');
      response.hangup();
    });
  }

  const baseUrl = getBaseUrl();

  return buildTwimlResponse((response) => {
    const gather = response.gather({
      input: ['speech'],
      method: 'POST',
      action: `${baseUrl}/api/twilio/voice?callId=${callId}`,
      speechTimeout: 'auto',
      enhanced: true,
      speechModel: 'phone_call',
      language: 'en-US',
    });

    gather.say({ voice: 'Polly.Joanna' }, agentTurn.reply);
    response.pause({ length: 1 });
  });
}
