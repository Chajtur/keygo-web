import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getDatabase } from "@/server/db/mysql";

export const dynamic = "force-dynamic";
export async function GET() {
  const [faqs] = await getDatabase().execute<RowDataPacket[]>(`
    SELECT public_id publicId,question,answer,category,sort_order sortOrder
    FROM faqs WHERE is_published=TRUE ORDER BY sort_order,category,question`);
  return NextResponse.json({ faqs });
}
