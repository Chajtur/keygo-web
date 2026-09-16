import { NextResponse } from "next/server";
import { createShipment, listShipments } from "@/server/keygo-flow-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listShipments());
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const shipment = createShipment(body);

    return NextResponse.json(shipment, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid shipment payload.",
      },
      { status: 400 },
    );
  }
}
