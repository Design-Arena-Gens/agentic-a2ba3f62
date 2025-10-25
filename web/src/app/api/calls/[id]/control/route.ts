import { isAuthenticated } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hangupCall } from '@/server/calls';

const controlSchema = z.object({
  action: z.enum(['hangup', 'mute', 'unmute', 'hold', 'resume']),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const payload = await request.json();
  const data = controlSchema.parse(payload);

  const call = await prisma.call.findUnique({ where: { id } });

  if (!call?.callSid) {
    return NextResponse.json({ error: 'Call SID not available' }, { status: 400 });
  }

  switch (data.action) {
    case 'hangup':
      await hangupCall(call.callSid);
      await prisma.call.update({
        where: { id },
        data: { status: 'CANCELED', endedAt: new Date() },
      });
      break;
    case 'mute':
    case 'unmute':
    case 'hold':
    case 'resume':
      // TODO: integrate with Twilio conference/participant controls.
      break;
  }

  return NextResponse.json({ success: true });
}
