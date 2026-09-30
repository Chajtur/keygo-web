import "server-only";

/** Resolve the public origin used in links sent by the server. */
export function getAppBaseUrl(request: Request) {
  const configuredBaseUrl = process.env.APP_BASE_URL?.trim();

  if (process.env.NODE_ENV === "production" && !configuredBaseUrl) {
    throw new Error("APP_BASE_URL debe configurarse con el dominio HTTPS público en producción.");
  }

  const baseUrl = new URL(configuredBaseUrl || new URL(request.url).origin);
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(baseUrl.hostname);

  if (process.env.NODE_ENV === "production" && (baseUrl.protocol !== "https:" || isLocalHost)) {
    throw new Error("APP_BASE_URL debe ser el dominio HTTPS público; no se permiten URLs locales en producción.");
  }

  return baseUrl.origin;
}
