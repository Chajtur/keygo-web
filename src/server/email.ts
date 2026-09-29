import { createTransport } from "nodemailer";
import { Resend } from "resend";

export interface EmailSendResult {
  ok: boolean;
  mode: "smtp" | "resend" | "mock";
  messageId?: string;
  previewUrl?: string;
}

const shell = (content: string) => `
  <div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;color:#082e59;">
    <div style="border-top:6px solid #ec650b;padding-top:20px;">${content}</div>
  </div>`;

const buildVerificationHtml = (fullName: string, verificationUrl: string) => shell(`
  <h2 style="margin-bottom:12px;">Hola ${fullName},</h2>
  <p style="line-height:1.6;">Gracias por crear tu casillero KeyGo. Confirma tu correo para activar la cuenta.</p>
  <p style="margin:24px 0;"><a href="${verificationUrl}" style="background:#ec650b;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block;">Confirmar correo</a></p>
  <p style="line-height:1.6;">Si el botón no funciona, copia esta URL:</p>
  <p style="word-break:break-all;">${verificationUrl}</p>`);

const buildPackageReceivedHtml = (fullName: string, packageCode: string, tracking: string) => shell(`
  <p style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#ec650b;">Recepción Miami</p>
  <h2 style="margin:0 0 12px;">¡Tu paquete ya está en KeyGo!</h2>
  <p style="line-height:1.6;">Hola ${fullName}, recibimos e identificamos tu paquete en nuestra bodega de Miami.</p>
  <div style="background:#f2f6fa;border-radius:12px;padding:16px;margin:20px 0;">
    <p style="margin:0 0 8px;"><strong>Código KeyGo:</strong> ${packageCode}</p>
    <p style="margin:0;"><strong>Tracking:</strong> ${tracking}</p>
  </div>
  <p style="line-height:1.6;">Puedes consultar su estado desde tu cuenta. El pago se solicitará al llegar a Honduras y antes de la entrega.</p>`);

function getSmtp() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) return null;
  return {
    transporter: createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    }),
    from: SMTP_FROM,
  };
}

async function sendEmail(input: { to: string; subject: string; html: string; text: string }): Promise<EmailSendResult> {
  const provider = (process.env.EMAIL_PROVIDER || "smtp").toLowerCase();
  const smtp = getSmtp();
  const { RESEND_API_KEY, RESEND_FROM } = process.env;

  if (provider === "smtp" && smtp) {
    const info = await smtp.transporter.sendMail({ from: smtp.from, ...input });
    return { ok: true, mode: "smtp", messageId: info.messageId };
  }

  if (provider === "resend" && RESEND_API_KEY && RESEND_FROM) {
    const response = await new Resend(RESEND_API_KEY).emails.send({ from: RESEND_FROM, ...input });
    if (response.error) throw new Error(response.error.message || "No se pudo enviar el correo con Resend.");
    return { ok: true, mode: "resend", messageId: response.data?.id };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(`El proveedor de correo "${provider}" no está configurado correctamente en producción.`);
  }

  console.log(`[KeyGo Email] Mock email sent to ${input.to}: ${input.subject}`);
  return { ok: true, mode: "mock" };
}

export async function sendVerificationEmail(input: { to: string; fullName: string; verificationUrl: string }) {
  const result = await sendEmail({
    to: input.to,
    subject: "Verifica tu casillero KeyGo",
    html: buildVerificationHtml(input.fullName, input.verificationUrl),
    text: `Hola ${input.fullName}, confirma tu correo en: ${input.verificationUrl}`,
  });
  return { ...result, previewUrl: result.mode === "mock" ? input.verificationUrl : undefined };
}

export async function sendPackageReceivedEmail(input: { to: string; fullName: string; packageCode: string; tracking: string }) {
  return sendEmail({
    to: input.to,
    subject: `Recibimos tu paquete ${input.packageCode} en Miami`,
    html: buildPackageReceivedHtml(input.fullName, input.packageCode, input.tracking),
    text: `Hola ${input.fullName}, recibimos tu paquete ${input.packageCode} (${input.tracking}) en Miami.`,
  });
}

export async function verifyEmailTransport() {
  const smtp = getSmtp();
  if (!smtp) throw new Error("La configuración SMTP está incompleta.");
  await smtp.transporter.verify();
  return { ok: true, provider: "smtp" as const };
}
