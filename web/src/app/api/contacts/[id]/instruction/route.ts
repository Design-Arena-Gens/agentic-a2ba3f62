import { isAuthenticated } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const instructionSchema = z.object({
  content: z.string().min(1),
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
  const data = instructionSchema.parse(payload);

  const instruction = await prisma.contactInstruction.upsert({
    where: { contactId: id },
    update: data,
    create: {
      contactId: id,
      content: data.content,
    },
  });

  return NextResponse.json(instruction);
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await prisma.contactInstruction.deleteMany({ where: { contactId: id } });
  return NextResponse.json({ success: true });
}
