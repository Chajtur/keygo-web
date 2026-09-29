import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { createSession } from "@/server/auth";
import { getDatabase } from "@/server/db/mysql";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const [rows] = await getDatabase().execute<(RowDataPacket & { id: number; password_hash: string; email_verified_at: Date | null })[]>(
      "SELECT id, password_hash, email_verified_at FROM users WHERE email_normalized = ? AND status = 'ACTIVE' LIMIT 1",
      [email],
    );
    if (!rows.length || !(await compare(password, rows[0].password_hash))) {
      return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    }
    if (!rows[0].email_verified_at) {
      return NextResponse.json({ error: "Primero confirma tu correo electrónico." }, { status: 403 });
    }
    await createSession(Number(rows[0].id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "No se pudo iniciar sesión." }, { status: 500 });
  }
}
