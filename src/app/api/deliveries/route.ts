import { NextResponse } from "next/server";
import { createDelivery, listDeliveries } from "@/server/keygo-flow-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listDeliveries());
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = createDelivery(body);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid delivery payload.",
      },
      { status: 400 },
    );
  }
}
