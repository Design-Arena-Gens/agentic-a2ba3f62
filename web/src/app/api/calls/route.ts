import { isAuthenticated } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createOutboundCall, createCallInputSchema } from '@/server/calls';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const calls = await prisma.call.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      contact: {
        include: {
          instruction: true,
        },
      },
      summary: true,
      intent: true,
    },
    take: 50,
  });

  return NextResponse.json(calls);
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const payload = await request.json();
  const data = createCallInputSchema.parse(payload);

  const call = await createOutboundCall(data);

  return NextResponse.json(call, { status: 201 });
}
