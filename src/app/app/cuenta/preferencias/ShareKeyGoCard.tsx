"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import Image from "next/image";

export default function ShareKeyGoCard({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const [qrUnavailable, setQrUnavailable] = useState(false);

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch { setCopied(false); }
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&format=png&color=0b315c&bgcolor=ffffff&qzone=4&data=${encodeURIComponent(url)}`;

  return <section className="share-keygo-card">
    <div className="share-keygo-copy"><Image className="share-keygo-logo" src="/brand/imagotipo.png" alt="KeyGo Cargo Express" width={180} height={82} /><p className="eyebrow">Invita a alguien</p><h2>Comparte KeyGo</h2><p>Escanea el código para visitar la página de KeyGo, instalar la app en el móvil y crear un casillero.</p><div className="share-keygo-url"><Share2 size={16} /><span>{url}</span></div><button type="button" className="quiet-button" onClick={() => void copyLink()}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? "Enlace copiado" : "Copiar enlace"}</button></div>
    <div className="share-keygo-qr">{qrUnavailable ? <span className="share-qr-error">No se pudo cargar el QR. Copia el enlace para compartirlo.</span> : <Image onError={() => setQrUnavailable(true)} src={qrUrl} alt="Código QR para visitar KeyGo y crear un casillero" width={180} height={180} unoptimized />}<small>Escanéame</small></div>
  </section>;
}
