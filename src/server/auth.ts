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

export interface CurrentStaff {
  userId: number;
  email: string;
  fullName: string;
  roleCodes: string;
}

export async function getCurrentStaff(): Promise<CurrentStaff | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const database = getDatabase();
  const [rows] = await database.execute<(RowDataPacket & CurrentStaff)[]>(`
    SELECT u.id userId, u.email_normalized email, u.full_name fullName,
           GROUP_CONCAT(DISTINCT r.code ORDER BY r.code SEPARATOR ',') roleCodes
    FROM sessions s
    JOIN users u ON u.id=s.user_id
    JOIN user_roles ur ON ur.user_id=u.id
    JOIN roles r ON r.id=ur.role_id AND r.active=TRUE
    WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>NOW(3)
      AND u.status='ACTIVE' AND u.email_verified_at IS NOT NULL
    GROUP BY u.id LIMIT 1`, [hashToken(token)]);
  if (!rows.length) return null;
  await database.execute("UPDATE sessions SET last_used_at=NOW(3) WHERE token_hash=?", [hashToken(token)]);
  return rows[0];
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

export async function authorizeStaffPermission(permissionCode: string, warehouseCode?: string) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return { ok: false as const, status: 401 as const };

  const database = getDatabase();
  const tokenHash = hashToken(token);
  const [sessions] = await database.execute<(RowDataPacket & { userId: number })[]>(`
    SELECT u.id userId
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > NOW(3)
      AND u.status = 'ACTIVE' AND u.email_verified_at IS NOT NULL
    LIMIT 1`, [tokenHash]);
  if (!sessions.length) return { ok: false as const, status: 401 as const };

  const actor = sessions[0];
  const warehouseFilter = warehouseCode
    ? `AND EXISTS (
         SELECT 1 FROM user_warehouse_access uwa
         JOIN warehouses w ON w.id = uwa.warehouse_id
         WHERE uwa.user_id = u.id AND w.code = ? AND w.active = TRUE
       )`
    : "";
  const values = warehouseCode
    ? [actor.userId, tokenHash, permissionCode, warehouseCode]
    : [actor.userId, tokenHash, permissionCode];
  const [permissions] = await database.execute<RowDataPacket[]>(`
    SELECT 1
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    JOIN user_roles ur ON ur.user_id = u.id
    JOIN roles r ON r.id = ur.role_id AND r.active = TRUE
    JOIN role_permissions rp ON rp.role_id = r.id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE u.id = ? AND s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > NOW(3)
      AND u.status = 'ACTIVE' AND u.email_verified_at IS NOT NULL AND p.code = ?
      ${warehouseFilter}
    LIMIT 1`, values);

  if (!permissions.length) return { ok: false as const, status: 403 as const };
  await database.execute("UPDATE sessions SET last_used_at = NOW(3) WHERE token_hash = ?", [tokenHash]);
  return { ok: true as const, userId: Number(actor.userId) };
}
