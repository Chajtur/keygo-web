import { createHash } from "crypto";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getDatabase } from "@/server/db/mysql";

const hashText = (value: string) => createHash("sha256").update(value).digest("hex");
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const loginUrl = new URL("/ingresar", request.url);
  if (!token) { loginUrl.searchParams.set("error", "token"); return NextResponse.redirect(loginUrl); }
  const db = getDatabase();
  const [rows] = await db.execute<(RowDataPacket & { id: number; user_id: number; expires_at: Date; consumed_at: Date | null })[]>(
    "SELECT id, user_id, expires_at, consumed_at FROM account_tokens WHERE purpose='EMAIL_VERIFICATION' AND token_hash=? LIMIT 1",
    [hashText(token)],
  );
  if (!rows.length || rows[0].consumed_at || new Date(rows[0].expires_at).getTime() < Date.now()) {
    loginUrl.searchParams.set("error", "token");
    return NextResponse.redirect(loginUrl);
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("UPDATE users SET email_verified_at=NOW(3), updated_at=NOW(3) WHERE id=?", [rows[0].user_id]);
    await connection.execute("UPDATE account_tokens SET consumed_at=NOW(3) WHERE id=?", [rows[0].id]);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
  loginUrl.searchParams.set("verified", "1");
  return NextResponse.redirect(loginUrl);
}
