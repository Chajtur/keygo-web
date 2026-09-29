import nextEnv from "@next/env";
import nodemailer from "nodemailer";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Faltan variables: ${missing.join(", ")}`);
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
});

try {
  await transporter.verify();
  console.log("SMTP autenticado correctamente. Gmail está listo para enviar correos de prueba.");
} catch (error) {
  const code = error && typeof error === "object" && "code" in error ? error.code : "UNKNOWN";
  console.error(`No fue posible autenticar el SMTP (${code}). Revisa el usuario y la contraseña de aplicación.`);
  process.exit(1);
}
