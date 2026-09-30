import { NextResponse } from "next/server";
import { authorizeStaffPermission } from "@/server/auth";
import { getDatabase } from "@/server/db/mysql";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ publicId: string }> };
type FAQInput = { question?: unknown; answer?: unknown; category?: unknown; sortOrder?: unknown; published?: unknown };
function parseInput(body: FAQInput) {
  const question = String(body.question ?? "").trim(), answer = String(body.answer ?? "").trim();
  const category = String(body.category ?? "General").trim() || "General", sortOrder = Number(body.sortOrder ?? 0), published = body.published === true;
  if (question.length < 8 || question.length > 255 || answer.length < 5 || answer.length > 12000 || category.length > 80 || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) return null;
  return { question, answer, category, sortOrder, published };
}
async function authorize() {
  const auth = await authorizeStaffPermission("faqs.manage");
  if (!auth.ok) return { response: NextResponse.json({ error: auth.status === 401 ? "Inicia sesión con una cuenta de empleado." : "No tienes permiso para gestionar las FAQs." }, { status: auth.status }) };
  return { userId: auth.userId };
}

export async function PATCH(request: Request, context: Context) {
  const access = await authorize();
  if ("response" in access) return access.response;
  const { publicId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(publicId)) return NextResponse.json({ error: "FAQ no encontrada." }, { status: 404 });
  let body: FAQInput;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const faq = parseInput(body);
  if (!faq) return NextResponse.json({ error: "Revisa la pregunta, respuesta, categoría y orden." }, { status: 400 });
  const [result] = await getDatabase().execute(`UPDATE faqs SET question=?,answer=?,category=?,sort_order=?,is_published=?,updated_by=?,updated_at=NOW(3) WHERE public_id=?`, [faq.question, faq.answer, faq.category, faq.sortOrder, faq.published, access.userId, publicId]);
  if (!(result as { affectedRows: number }).affectedRows) return NextResponse.json({ error: "FAQ no encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true, publicId });
}

export async function DELETE(_request: Request, context: Context) {
  const access = await authorize();
  if ("response" in access) return access.response;
  const { publicId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(publicId)) return NextResponse.json({ error: "FAQ no encontrada." }, { status: 404 });
  const [result] = await getDatabase().execute("UPDATE faqs SET is_published=FALSE,updated_by=?,updated_at=NOW(3) WHERE public_id=?", [access.userId, publicId]);
  if (!(result as { affectedRows: number }).affectedRows) return NextResponse.json({ error: "FAQ no encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true, archived: true });
}
