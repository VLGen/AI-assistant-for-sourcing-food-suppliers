import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const shortlistSchema = z.object({
  supplierIds: z.array(z.string()).min(1).max(4),
});

export async function GET() {
  const records = await prisma.shortlist.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      supplierIds: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ items: records });
}

export async function POST(request: Request) {
  try {
    const body = shortlistSchema.parse(await request.json());

    const suppliers = await prisma.supplier.findMany({
      where: { id: { in: body.supplierIds } },
      select: { id: true },
    });

    if (suppliers.length !== body.supplierIds.length) {
      return NextResponse.json({ error: "Некоторые поставщики не найдены" }, { status: 404 });
    }

    const shortlist = await prisma.shortlist.create({
      data: {
        supplierIds: JSON.stringify(body.supplierIds),
      },
    });

    return NextResponse.json({ shortlist }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Некорректный запрос";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await prisma.shortlist.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete shortlist" },
      { status: 500 },
    );
  }
}
