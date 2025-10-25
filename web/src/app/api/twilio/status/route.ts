import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { finalizeCall, updateCallStatusBySid } from '@/server/calls';

export async function POST(request: Request) {
  const formData = await request.formData();
  const callSid = (formData.get('CallSid') as string) ?? null;
  const callStatus = (formData.get('CallStatus') as string | null) ?? undefined;

  if (!callSid) {
    return NextResponse.json({ ok: true });
  }

  if (callStatus) {
    switch (callStatus) {
      case 'completed':
        await updateCallStatusBySid(callSid, 'COMPLETED');
        break;
      case 'failed':
      case 'no-answer':
      case 'busy':
        await updateCallStatusBySid(callSid, 'FAILED');
        break;
      case 'in-progress':
        await updateCallStatusBySid(callSid, 'IN_PROGRESS');
        break;
    }
  }

  const call = await prisma.call.findFirst({ where: { callSid } });

  if (callStatus === 'completed' && call) {
    await finalizeCall(call.id);
  }

  return NextResponse.json({ ok: true });
}
