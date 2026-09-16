import { NextResponse } from "next/server";
import { receivePackage } from "@/server/keygo-flow-store";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  try {
    const body = await request.json();
    const payload = receivePackage(decodeURIComponent(code), body ?? {});

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to receive package.",
      },
      { status: 400 },
    );
  }
}
