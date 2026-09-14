import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids");

  if (!idsParam) {
    return NextResponse.json({ error: "ids is required" }, { status: 400 });
  }

  const ids = idsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const rows = await prisma.supplier.findMany({
    where: { id: { in: ids } },
  });

  const ordered = ids
    .map((id) => rows.find((supplier) => supplier.id === id))
    .filter((supplier): supplier is NonNullable<typeof supplier> => Boolean(supplier));

  return NextResponse.json({ items: ordered });
}
