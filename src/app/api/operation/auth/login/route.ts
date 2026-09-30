import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { createSession } from "@/server/auth";
import { getDatabase } from "@/server/db/mysql";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    let body: { email?: unknown; password?: unknown };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Ingresa un correo y contraseña válidos." }, { status: 400 }); }
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255 || !password || password.length > 128) {
      return NextResponse.json({ error: "Ingresa un correo y contraseña válidos." }, { status: 400 });
    }
    const [rows] = await getDatabase().execute<(RowDataPacket & { id: number; password_hash: string; email_verified_at: Date | null })[]>(`
      SELECT u.id,u.password_hash,u.email_verified_at
      FROM users u
      WHERE u.email_normalized=? AND u.status='ACTIVE'
        AND EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id AND r.active=TRUE WHERE ur.user_id=u.id)
      LIMIT 1`, [email]);
    if (!rows.length || !(await compare(password, rows[0].password_hash))) {
      return NextResponse.json({ error: "Credenciales inválidas o cuenta sin acceso de empleado." }, { status: 401 });
    }
    if (!rows[0].email_verified_at) {
      return NextResponse.json({ error: "La cuenta debe tener el correo confirmado para usar el panel." }, { status: 403 });
    }
    await createSession(Number(rows[0].id));
    return NextResponse.json({ ok: true, redirectTo: "/operacion" });
  } catch (error) {
    console.error("Staff login error:", error);
    return NextResponse.json({ error: "No se pudo iniciar sesión. Intenta de nuevo." }, { status: 500 });
  }
}
