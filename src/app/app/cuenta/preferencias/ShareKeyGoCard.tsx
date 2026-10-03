"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Check, Copy, Download, Share2 } from "lucide-react";

function waitForImage(image: HTMLImageElement | null) {
  if (!image) return Promise.reject(new Error("No se cargó una imagen de la tarjeta."));
  if (image.complete && image.naturalWidth > 0) return Promise.resolve(image);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", () => reject(new Error("No se cargó una imagen de la tarjeta.")), { once: true });
  });
}

function createCardImage(logo: HTMLImageElement, qr: HTMLImageElement, siteHost: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Este navegador no pudo preparar la tarjeta.");

  context.fillStyle = "#0b315c";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ec650b";
  context.fillRect(0, 0, canvas.width, 18);
  context.fillStyle = "#ffffff";
  context.font = "700 28px Arial, sans-serif";
  context.textAlign = "center";
  context.fillText("TU CASILLERO EN USA", 540, 105);

  context.fillStyle = "#ffffff";
  context.beginPath();
  context.roundRect(120, 145, 840, 545, 30);
  context.fill();
  context.drawImage(logo, 170, 167, 740, 500);

  context.fillStyle = "#ffffff";
  context.beginPath();
  context.roundRect(315, 745, 450, 450, 28);
  context.fill();
  context.drawImage(qr, 340, 770, 400, 400);

  context.fillStyle = "#ffffff";
  context.font = "700 34px Arial, sans-serif";
  context.fillText("ESCANEA Y CREA TU CASILLERO", 540, 1255);
  context.fillStyle = "#ffb27e";
  context.font = "500 28px Arial, sans-serif";
  context.fillText(siteHost, 540, 1305);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("No se pudo crear la imagen de KeyGo.")), "image/png");
  });
}

function downloadImage(blob: Blob) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = "keygo-cargo-express.png";
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export default function ShareKeyGoCard({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const [qrUnavailable, setQrUnavailable] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState("");
  const logoRef = useRef<HTMLImageElement>(null);
  const qrRef = useRef<HTMLImageElement>(null);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setMessage("Enlace copiado. Ya puedes pegarlo en tu publicación o mensaje.");
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setMessage("No se pudo copiar automáticamente. Selecciona y copia el enlace mostrado.");
    }
  }

  async function getImageBlob() {
    const [logo, qr] = await Promise.all([waitForImage(logoRef.current), waitForImage(qrRef.current)]);
    return createCardImage(logo, qr, new URL(url).host);
  }

  async function downloadCard() {
    setMessage("");
    try {
      downloadImage(await getImageBlob());
      setMessage("Tarjeta descargada como PNG. Puedes adjuntarla en WhatsApp, Telegram, Messenger o tus redes.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo descargar la tarjeta.");
    }
  }

  async function shareCard() {
    setSharing(true);
    setMessage("");
    let cardBlob: Blob | null = null;
    try {
      cardBlob = await getImageBlob();
      const file = new File([cardBlob], "keygo-cargo-express.png", { type: "image/png" });
      const shareText = "Conoce KeyGo Cargo Express. Visita nuestra página, instala la app y crea tu casillero.";
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "KeyGo Cargo Express", text: shareText, url, files: [file] });
      } else {
        downloadImage(cardBlob);
        try { await navigator.clipboard.writeText(url); } catch { /* Link remains visible to copy manually. */ }
        setMessage("Tu navegador no comparte imágenes directamente. Descargamos la tarjeta y copiamos el enlace para que los adjuntes en la app que prefieras.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (cardBlob) {
        downloadImage(cardBlob);
        try { await navigator.clipboard.writeText(url); } catch { /* Link remains visible to copy manually. */ }
        setMessage("No se pudo abrir el menú de compartir. Descargamos la tarjeta y copiamos el enlace para que los adjuntes manualmente.");
      } else setMessage(error instanceof Error ? error.message : "No se pudo preparar la tarjeta para compartir.");
    } finally {
      setSharing(false);
    }
  }

  const qrUrl = "/api/share-card/qr";

  return <section className="share-keygo-card">
    <div className="share-keygo-copy">
      <Image ref={logoRef} className="share-keygo-logo" src="/brand/imagotipo.png" alt="KeyGo Cargo Express" width={180} height={82} />
      <p className="eyebrow">Invita a alguien</p><h2>Comparte KeyGo</h2>
      <p>Envía la tarjeta de presentación con el código QR y el enlace para visitar KeyGo, instalar la app y crear un casillero.</p>
      <div className="share-keygo-url"><Share2 size={16} /><span>{url}</span></div>
      <div className="share-keygo-actions">
        <button type="button" className="share-card-button" onClick={() => void shareCard()} disabled={sharing || qrUnavailable}><Share2 size={17} />{sharing ? "Preparando…" : "Compartir tarjeta"}</button>
        <button type="button" className="share-card-button secondary" onClick={() => void downloadCard()} disabled={qrUnavailable}><Download size={17} />Descargar PNG</button>
        <button type="button" className="quiet-button" onClick={() => void copyLink()}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? "Enlace copiado" : "Copiar enlace"}</button>
      </div>
      {message ? <p className="share-card-message" role="status">{message}</p> : null}
    </div>
    <div className="share-keygo-qr">
      {qrUnavailable ? <span className="share-qr-error">No se pudo cargar el QR. Intenta actualizar la página.</span> : <Image ref={qrRef} onError={() => setQrUnavailable(true)} src={qrUrl} alt="Código QR para visitar KeyGo y crear un casillero" width={180} height={180} unoptimized />}
      <small>Escanéame</small>
    </div>
  </section>;
}
