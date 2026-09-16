import { NextResponse } from "next/server";
import { createPickupRequest, listPickupRequests } from "@/server/keygo-flow-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listPickupRequests());
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = createPickupRequest(body);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid pickup request payload.",
      },
      { status: 400 },
    );
  }
}
