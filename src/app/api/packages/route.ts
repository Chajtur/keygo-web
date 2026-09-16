import { NextResponse } from "next/server";
import { listPackages } from "@/server/keygo-flow-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listPackages());
}
