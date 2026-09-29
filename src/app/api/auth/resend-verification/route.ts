import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getDatabase } from "@/server/db/mysql";
import { sendVerificationEmail } from "@/server/email";

const hashText = (value: string) => createHash("sha256").update(value).digest("hex");
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const generic = { ok: true, message: "Si la cuenta existe y aún no está verificada, enviaremos un nuevo enlace." };
    if (!email || email.length > 255) return NextResponse.json(generic);

    const connection = await getDatabase().getConnection();
    let recipient: { id: number; fullName: string } | undefined;
    const token = randomBytes(32).toString("hex");
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute<(RowDataPacket & { id: number; full_name: string; email_verified_at: Date | null })[]>(
        "SELECT id, full_name, email_verified_at FROM users WHERE email_normalized=? AND status='ACTIVE' LIMIT 1 FOR UPDATE", [email]);
      if (rows.length && !rows[0].email_verified_at) {
        recipient = { id: Number(rows[0].id), fullName: rows[0].full_name };
        await connection.execute("UPDATE account_tokens SET consumed_at=NOW(3) WHERE user_id=? AND purpose='EMAIL_VERIFICATION' AND consumed_at IS NULL", [recipient.id]);
        await connection.execute(
          "INSERT INTO account_tokens (user_id, purpose, token_hash, expires_at, created_at) VALUES (?, 'EMAIL_VERIFICATION', ?, ?, NOW(3))",
          [recipient.id, hashText(token), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)],
        );
      }
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }

    if (recipient) {
      const base = (process.env.APP_BASE_URL || new URL(request.url).origin).replace(/\/$/, "");
      const verificationUrl = `${base}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
      try { await sendVerificationEmail({ to: email, fullName: recipient.fullName, verificationUrl }); }
      catch (error) { console.error("Verification resend failed:", error); }
    }
    return NextResponse.json(generic);
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ error: "No se pudo procesar la solicitud." }, { status: 500 });
  }
}
