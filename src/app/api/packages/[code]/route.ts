import { NextResponse } from "next/server";
import { getPackageTimeline } from "@/server/keygo-flow-store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  try {
    const payload = getPackageTimeline(decodeURIComponent(code));
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Package not found.",
      },
      { status: 404 },
    );
  }
}
