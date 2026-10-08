"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Facebook, Link2, Linkedin, Share2, Twitter } from "lucide-react";
import charter from "@/settings/charter";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.003 3C8.83 3 3 8.83 3 16c0 2.29.6 4.52 1.74 6.49L3 29l6.7-1.72A12.94 12.94 0 0 0 16 29c7.17 0 13-5.83 13-13S23.17 3 16.003 3Zm0 23.7c-1.98 0-3.9-.53-5.58-1.53l-.4-.24-3.98 1.02 1.06-3.88-.26-.4A10.66 10.66 0 0 1 5.3 16c0-5.88 4.82-10.7 10.7-10.7S26.7 10.12 26.7 16s-4.82 10.7-10.7 10.7Zm5.87-8.01c-.32-.16-1.9-.94-2.2-1.05-.3-.1-.51-.16-.73.16-.21.32-.84 1.05-1.03 1.27-.19.21-.38.24-.7.08-.32-.16-1.36-.5-2.59-1.6-.96-.85-1.6-1.9-1.79-2.22-.19-.32-.02-.5.14-.66.15-.14.32-.38.48-.57.16-.19.21-.32.32-.54.1-.21.05-.4-.03-.56-.08-.16-.73-1.76-1-2.4-.26-.63-.53-.54-.73-.55h-.62c-.21 0-.56.08-.85.4-.3.32-1.12 1.1-1.12 2.68s1.15 3.11 1.31 3.32c.16.21 2.26 3.45 5.48 4.84.77.33 1.37.53 1.83.68.77.24 1.47.21 2.02.13.62-.09 1.9-.78 2.17-1.53.27-.75.27-1.4.19-1.53-.08-.13-.3-.21-.62-.37Z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M21.94 4.36 18.7 19.62c-.24 1.08-.88 1.35-1.78.84l-4.92-3.63-2.37 2.29c-.26.26-.48.48-.99.48l.35-5.02 9.14-8.26c.4-.35-.09-.55-.62-.2L6.2 13.2 1.34 11.68c-1.06-.33-1.08-1.06.22-1.57L20.55 2.8c.88-.33 1.65.2 1.39 1.56Z" />
    </svg>
  );
}

type Network = { name: string; href: string; color: string; icon: React.ReactNode };

/**
 * Partage d'une page sur les réseaux sociaux. Simples liens de partage officiels : aucun script de réseau
 * social n'est chargé, et rien n'est transmis à ces services tant que la personne ne clique pas.
 * Sur téléphone, le bouton « Partager » ouvre le menu de partage natif (WhatsApp, SMS, Instagram…).
 */
export function ShareBar({
  url,
  title,
  heading = "Partager",
}: {
  /** Adresse absolue de la page à partager. */
  url: string;
  title: string;
  /** Petit libellé avant les boutons ; chaîne vide pour le masquer. */
  heading?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Détecté après l'affichage : évite un écart entre le rendu serveur et le rendu navigateur.
  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const text = encodeURIComponent(title);
  const link = encodeURIComponent(url);
  const networks: Network[] = [
    {
      name: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`,
      color: "#25D366",
      icon: <WhatsAppIcon className="h-[18px] w-[18px]" />,
    },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${link}`,
      color: "#1877F2",
      icon: <Facebook className="h-[18px] w-[18px]" />,
    },
    {
      name: "X",
      href: `https://twitter.com/intent/tweet?text=${text}&url=${link}`,
      color: "#000000",
      icon: <Twitter className="h-[18px] w-[18px]" />,
    },
    {
      name: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${link}`,
      color: "#0A66C2",
      icon: <Linkedin className="h-[18px] w-[18px]" />,
    },
    {
      name: "Telegram",
      href: `https://t.me/share/url?url=${link}&text=${text}`,
      color: "#26A5E4",
      icon: <TelegramIcon className="h-[18px] w-[18px]" />,
    },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Navigateur sans accès au presse-papiers : repli par sélection d'un champ temporaire.
      const field = document.createElement("textarea");
      field.value = url;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      document.body.removeChild(field);
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2200);
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title, url });
    } catch {
      // Partage annulé par la personne : rien à faire.
    }
  };

  // Boutons neutres et fins : la couleur du réseau n'apparaît qu'au survol.
  const iconButton =
    "inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white text-[#282828] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--brand)] hover:bg-[var(--brand)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {heading && (
        <span className="mr-1 text-xs font-semibold uppercase tracking-widest" style={{ color: charter.inkFaint }}>
          {heading}
        </span>
      )}

      <ul className="flex flex-wrap items-center gap-2">
        {networks.map(network => (
          <li key={network.name}>
            <a
              href={network.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Partager sur ${network.name}`}
              title={network.name}
              className={iconButton}
              style={{ borderColor: charter.border, ["--brand" as string]: network.color }}
            >
              {network.icon}
            </a>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={copyLink}
            aria-live="polite"
            className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors duration-200 hover:bg-[#282828] hover:text-white ${
              copied ? "border-[#6D9743] text-[#6D9743]" : "border-[#E7E7EA] bg-white text-[#282828]"
            }`}
          >
            {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            {copied ? "Lien copié" : "Copier le lien"}
          </button>
        </li>
        {canNativeShare && (
          <li>
            <button
              type="button"
              onClick={nativeShare}
              className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: charter.orange }}
            >
              <Share2 className="h-4 w-4" />
              Partager
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
