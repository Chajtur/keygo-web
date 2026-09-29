import "server-only";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import type { RowDataPacket } from "mysql2";
import { getDatabase } from "@/server/db/mysql";

const SESSION_COOKIE = "keygo_session";
const SESSION_DAYS = 30;
const hashToken = (value: string) => createHash("sha256").update(value).digest("hex");

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await getDatabase().execute(
    "INSERT INTO sessions (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, NOW(3))",
    [userId, hashToken(token), expiresAt],
  );
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await getDatabase().execute("UPDATE sessions SET revoked_at = NOW(3) WHERE token_hash = ?", [hashToken(token)]);
  store.delete(SESSION_COOKIE);
}

export interface CurrentCustomer {
  userId: number;
  customerId: number;
  email: string;
  fullName: string;
  phone: string | null;
  lockerCode: string;
  emailVerified: boolean;
}

export async function getCurrentCustomer(): Promise<CurrentCustomer | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [rows] = await getDatabase().execute<(RowDataPacket & CurrentCustomer)[]>(`
    SELECT u.id userId, c.id customerId, u.email_normalized email, u.full_name fullName,
           c.phone, l.code lockerCode, (u.email_verified_at IS NOT NULL) emailVerified
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    JOIN customers c ON c.user_id = u.id
    JOIN lockers l ON l.customer_id = c.id
    WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > NOW(3)
    LIMIT 1`, [hashToken(token)]);
  if (!rows.length) return null;
  await getDatabase().execute("UPDATE sessions SET last_used_at = NOW(3) WHERE token_hash = ?", [hashToken(token)]);
  return { ...rows[0], emailVerified: Boolean(rows[0].emailVerified) };
}
