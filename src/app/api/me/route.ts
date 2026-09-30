import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { getCurrentCustomer } from "@/server/auth";
import { getDatabase } from "@/server/db/mysql";
import type { RowDataPacket } from "mysql2";
import { sendVerificationEmail } from "@/server/email";
import { getAppBaseUrl } from "@/server/app-url";

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const hashText = (value: string) => createHash("sha256").update(value).digest("hex");
export const dynamic = "force-dynamic";

export async function GET() {
  const customer = await getCurrentCustomer();
  return customer
    ? NextResponse.json(customer)
    : NextResponse.json({ error: "No autenticado." }, { status: 401 });
}

export async function PATCH(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "La solicitud no contiene datos válidos." }, { status: 400 }); }

  const fullName = String(body.fullName ?? "").trim();
  const email = normalizeEmail(String(body.email ?? ""));
  const phone = String(body.phone ?? "").trim();
  if (!fullName || fullName.length > 160) return NextResponse.json({ error: "Escribe tu nombre (máximo 160 caracteres)." }, { status: 400 });
  if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Escribe un correo válido." }, { status: 400 });
  if (phone.length > 40) return NextResponse.json({ error: "El teléfono no puede superar 40 caracteres." }, { status: 400 });

  const connection = await getDatabase().getConnection();
  let emailChanged = false;
  try {
    await connection.beginTransaction();
    const [users] = await connection.execute<(RowDataPacket & { email: string })[]>(
      "SELECT email_normalized email FROM users WHERE id=? FOR UPDATE", [customer.userId],
    );
    if (!users.length) { await connection.rollback(); return NextResponse.json({ error: "No se encontró la cuenta." }, { status: 404 }); }
    emailChanged = users[0].email !== email;
    if (emailChanged) {
      const [existing] = await connection.execute<RowDataPacket[]>("SELECT id FROM users WHERE email_normalized=? AND id<>? LIMIT 1 FOR UPDATE", [email, customer.userId]);
      if (existing.length) { await connection.rollback(); return NextResponse.json({ error: "Ese correo ya está registrado en otra cuenta." }, { status: 409 }); }
      await connection.execute("UPDATE users SET email_normalized=?, full_name=?, email_verified_at=NULL, updated_at=NOW(3) WHERE id=?", [email, fullName, customer.userId]);
      await connection.execute("UPDATE account_tokens SET consumed_at=NOW(3) WHERE user_id=? AND purpose='EMAIL_VERIFICATION' AND consumed_at IS NULL", [customer.userId]);
      const token = randomBytes(32).toString("hex");
      await connection.execute("INSERT INTO account_tokens (user_id,purpose,token_hash,expires_at,created_at) VALUES (?,'EMAIL_VERIFICATION',?,?,NOW(3))", [customer.userId, hashText(token), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]);
      await connection.execute("UPDATE customers SET phone=?, billing_name=?, updated_at=NOW(3) WHERE user_id=?", [phone || null, fullName, customer.userId]);
      await connection.commit();
      try {
        const verificationUrl = new URL("/api/auth/verify-email", getAppBaseUrl(request));
        verificationUrl.searchParams.set("token", token);
        await sendVerificationEmail({ to: email, fullName, verificationUrl: verificationUrl.toString() });
      } catch (error) {
        console.error("Profile email verification send error:", error);
        return NextResponse.json({ ok: true, emailVerificationRequired: true, emailSent: false, message: "Tus datos se guardaron, pero no se pudo enviar el correo de verificación. Solicita reenviarlo desde la página de acceso." });
      }
      return NextResponse.json({ ok: true, emailVerificationRequired: true, emailSent: true, message: "Tus datos se guardaron. Confirma el nuevo correo desde el enlace que te enviamos." });
    }
    await connection.execute("UPDATE users SET full_name=?, updated_at=NOW(3) WHERE id=?", [fullName, customer.userId]);
    await connection.execute("UPDATE customers SET phone=?, billing_name=?, updated_at=NOW(3) WHERE user_id=?", [phone || null, fullName, customer.userId]);
    await connection.commit();
    return NextResponse.json({ ok: true, emailVerificationRequired: false, message: "Tus datos se actualizaron." });
  } catch (error) {
    try { await connection.rollback(); } catch { /* transaction may already be closed */ }
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "No se pudieron actualizar tus datos." }, { status: 500 });
  } finally { connection.release(); }
}
