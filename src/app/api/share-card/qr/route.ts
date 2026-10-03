export const revalidate = 86_400;

export async function GET() {
  try {
    const configuredUrl = new URL(process.env.APP_BASE_URL || "https://keygo-web-production.up.railway.app");
    const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(configuredUrl.hostname);
    if (process.env.NODE_ENV === "production" && (configuredUrl.protocol !== "https:" || isLocalHost)) {
      return new Response("APP_BASE_URL must be a public HTTPS address", { status: 503 });
    }
    const publicUrl = new URL("/", configuredUrl).toString();
    const qrUrl = new URL("https://api.qrserver.com/v1/create-qr-code/");
    qrUrl.searchParams.set("size", "500x500");
    qrUrl.searchParams.set("format", "png");
    qrUrl.searchParams.set("color", "0b315c");
    qrUrl.searchParams.set("bgcolor", "ffffff");
    qrUrl.searchParams.set("qzone", "4");
    qrUrl.searchParams.set("data", publicUrl);

    const response = await fetch(qrUrl, { next: { revalidate } });
    if (!response.ok) return new Response("QR service unavailable", { status: 502 });
    return new Response(await response.arrayBuffer(), {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
    });
  } catch (error) {
    console.error("Share card QR generation error:", error);
    return new Response("QR service unavailable", { status: 502 });
  }
}
