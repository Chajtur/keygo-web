import { NextResponse } from "next/server";
import { createPrealert, listPrealerts } from "@/server/keygo-flow-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listPrealerts());
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = createPrealert(body);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid prealert payload.",
      },
      { status: 400 },
    );
  }
}
