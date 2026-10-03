import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "KeyGo Cargo Express",
    short_name: "KeyGo",
    description: "Administra tu casillero y sigue tus paquetes con KeyGo.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0b3260",
    icons: [
      { src: "/icons/keygo-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/keygo-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
