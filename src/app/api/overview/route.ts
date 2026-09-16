import { NextResponse } from "next/server";
import { getOverview } from "@/server/keygo-flow-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getOverview());
}
