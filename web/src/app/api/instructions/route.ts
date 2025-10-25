import { isAuthenticated } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const instructionSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  active: z.boolean().optional(),
});

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const instructions = await prisma.customInstruction.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(instructions);
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const payload = await request.json();
  const data = instructionSchema.parse(payload);

  const instruction = await prisma.customInstruction.create({
    data,
  });

  return NextResponse.json(instruction, { status: 201 });
}
