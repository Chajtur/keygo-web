import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { authorizeStaffPermission } from "@/server/auth";
import { getDatabase } from "@/server/db/mysql";

export const dynamic = "force-dynamic";
type FAQInput = { question?: unknown; answer?: unknown; category?: unknown; sortOrder?: unknown; published?: unknown };
function parseInput(body: FAQInput) {
  const question = String(body.question ?? "").trim();
  const answer = String(body.answer ?? "").trim();
  const category = String(body.category ?? "General").trim() || "General";
  const sortOrder = Number(body.sortOrder ?? 0);
  const published = body.published === true;
  if (question.length < 8 || question.length > 255 || answer.length < 5 || answer.length > 12000 || category.length > 80 || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) return null;
  return { question, answer, category, sortOrder, published };
}

export async function GET() {
  const auth = await authorizeStaffPermission("faqs.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.status === 401 ? "Inicia sesión con una cuenta de empleado." : "No tienes permiso para gestionar las FAQs." }, { status: auth.status });
  const [faqs] = await getDatabase().execute<RowDataPacket[]>(`SELECT public_id publicId,question,answer,category,sort_order sortOrder,is_published published,updated_at updatedAt FROM faqs ORDER BY sort_order,category,question`);
  return NextResponse.json({ faqs });
}

export async function POST(request: Request) {
  const auth = await authorizeStaffPermission("faqs.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.status === 401 ? "Inicia sesión con una cuenta de empleado." : "No tienes permiso para gestionar las FAQs." }, { status: auth.status });
  let body: FAQInput;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const faq = parseInput(body);
  if (!faq) return NextResponse.json({ error: "Revisa la pregunta, respuesta, categoría y orden." }, { status: 400 });
  const publicId = randomUUID();
  await getDatabase().execute(`INSERT INTO faqs (public_id,question,answer,category,sort_order,is_published,created_by,updated_by) VALUES (?,?,?,?,?,?,?,?)`, [publicId, faq.question, faq.answer, faq.category, faq.sortOrder, faq.published, auth.userId, auth.userId]);
  return NextResponse.json({ ok: true, publicId }, { status: 201 });
}
