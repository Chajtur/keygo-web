import nextEnv from "@next/env";
import { randomBytes } from "node:crypto";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const base = process.env.APP_BASE_URL || "http://localhost:3000";
const configuredEmail = process.env.SMTP_USER;
if (!configuredEmail?.includes("@")) throw new Error("SMTP_USER debe contener un correo para ejecutar la prueba.");
const [local, domain] = configuredEmail.split("@");
const marker = Date.now().toString().slice(-9);
const email = `${local}+flow${marker}@${domain}`;
const password = `Kg!${randomBytes(8).toString("hex")}`;
const tracking = `KEYGO-TEST-${marker}`;

async function json(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(`${path}: ${payload.error || response.statusText}`);
  return { response, payload };
}

const registration = await json("/api/auth/register", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ fullName: "Cliente Prueba KeyGo", email, phone: "+504 9999-0000", password }),
});
if (!registration.payload.verificationUrl) throw new Error("La prueba local requiere verificationUrl.");
const verification = await fetch(registration.payload.verificationUrl, { redirect: "manual" });
if (![302, 307, 308].includes(verification.status)) throw new Error(`Verificación inesperada: ${verification.status}`);

const login = await json("/api/auth/login", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
});
const cookie = login.response.headers.get("set-cookie")?.split(";")[0];
if (!cookie) throw new Error("El inicio de sesión no devolvió cookie.");

const prealert = await json("/api/prealerts", {
  method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie },
  body: JSON.stringify({ trackingRaw: tracking, carrier: "UPS", store: "Tienda de prueba", description: "Paquete de validación integral", declaredValue: 25, currency: "USD" }),
});
const receipt = await json("/api/packages/receive-by-tracking", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ tracking, weightKg: 1.25, lengthCm: 30, widthCm: 20, heightCm: 15 }),
});
const packages = await json("/api/packages", { headers: { Cookie: cookie } });
const found = packages.payload.find((item) => item.code === receipt.payload.packageCode);
if (!found || found.status !== "RECEIVED_USA") throw new Error("El paquete recibido no apareció en la cuenta del cliente.");

console.log(JSON.stringify({
  ok: true,
  lockerCode: registration.payload.lockerCode,
  verification: "completed",
  login: "completed",
  prealertCode: prealert.payload.code,
  packageCode: receipt.payload.packageCode,
  packageStatus: found.status,
  registrationEmailSent: registration.payload.emailSent,
  receiptEmailSent: receipt.payload.emailSent,
}, null, 2));
