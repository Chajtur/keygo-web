import { createHash, randomBytes, randomUUID } from "crypto";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getDatabase } from "@/server/db/mysql";
import { sendVerificationEmail } from "@/server/email";

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const hashText = (value: string) => createHash("sha256").update(value).digest("hex");
const verificationUrlFor = (token: string) => `${(process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "")}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const connection = await getDatabase().getConnection();
  try {
    const body = await request.json();
    const fullName = String(body?.fullName ?? "").trim();
    const email = normalizeEmail(String(body?.email ?? ""));
    const phone = String(body?.phone ?? "").trim();
    const password = String(body?.password ?? "");
    if (!fullName || !email || !phone || !password) return NextResponse.json({ error: "Todos los campos son requeridos." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });

    await connection.beginTransaction();
    const [existing] = await connection.execute<(RowDataPacket & { id: number })[]>("SELECT id FROM users WHERE email_normalized = ? LIMIT 1", [email]);
    if (existing.length) { await connection.rollback(); return NextResponse.json({ error: "Este correo ya está registrado." }, { status: 409 }); }
    const now = new Date();
    const [userResult] = await connection.execute(
      `INSERT INTO users (public_id, email_normalized, password_hash, full_name, status, email_verified_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'ACTIVE', NULL, ?, ?)`,
      [randomUUID(), email, await hash(password, 12), fullName, now, now],
    );
    const userId = Number((userResult as { insertId: number }).insertId);
    const [customerResult] = await connection.execute(
      `INSERT INTO customers (public_id, user_id, phone, billing_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [randomUUID(), userId, phone, fullName, now, now],
    );
    const customerId = Number((customerResult as { insertId: number }).insertId);
    const lockerCode = `KG-${String(customerId).padStart(6, "0")}`;
    await connection.execute("INSERT INTO lockers (public_id, customer_id, code, status, created_at) VALUES (?, ?, ?, 'ACTIVE', ?)", [randomUUID(), customerId, lockerCode, now]);
    await connection.execute("INSERT INTO policy_acceptances (user_id, policy_version, accepted_at) VALUES (?, '2026-09', ?)", [userId, now]);
    const token = randomBytes(32).toString("hex");
    await connection.execute(
      "INSERT INTO account_tokens (user_id, purpose, token_hash, expires_at, created_at) VALUES (?, 'EMAIL_VERIFICATION', ?, ?, ?)",
      [userId, hashText(token), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), now],
    );
    await connection.commit();

    const verificationUrl = verificationUrlFor(token);
    let emailSent = true;
    let emailError: string | undefined;
    try { await sendVerificationEmail({ to: email, fullName, verificationUrl }); }
    catch (error) {
      emailSent = false;
      emailError = error instanceof Error ? error.message : "No se pudo enviar el correo.";
      console.error("Verification email error:", error);
    }
    return NextResponse.json({
      ok: true, lockerCode, emailSent, emailError,
      message: emailSent ? "Registro exitoso. Revisa tu correo para verificar tu cuenta." : "El casillero fue creado, pero el correo no pudo enviarse.",
      ...(process.env.NODE_ENV !== "production" ? { verificationUrl } : {}),
    }, { status: 201 });
  } catch (error) {
    try { await connection.rollback(); } catch { /* transaction may already be closed */ }
    console.error("Register error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo crear la cuenta." }, { status: 500 });
  } finally { connection.release(); }
}
