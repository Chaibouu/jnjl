/** Bouton flottant « Rejoindre le groupe WhatsApp » : visible sur toutes les pages publiques, lien géré dans Paramètres. */
export function WhatsAppButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Rejoindre le groupe WhatsApp de la JNJL"
      className="group fixed bottom-5 right-5 z-50 flex items-center gap-3 sm:bottom-7 sm:right-7"
    >
      <span className="pointer-events-none hidden translate-x-2 whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#128C7E] opacity-0 shadow-lg transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 sm:block">
        Rejoindre le groupe WhatsApp
      </span>
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-black/25 transition-transform duration-200 group-hover:scale-110">
        <span className="absolute inset-0 rounded-full bg-[#25D366] motion-safe:animate-pulse-ring" aria-hidden="true" />
        <svg viewBox="0 0 32 32" className="relative h-7 w-7 fill-current" aria-hidden="true">
          <path d="M16.003 3C8.83 3 3 8.83 3 16c0 2.29.6 4.52 1.74 6.49L3 29l6.7-1.72A12.94 12.94 0 0 0 16 29c7.17 0 13-5.83 13-13S23.17 3 16.003 3Zm0 23.7c-1.98 0-3.9-.53-5.58-1.53l-.4-.24-3.98 1.02 1.06-3.88-.26-.4A10.66 10.66 0 0 1 5.3 16c0-5.88 4.82-10.7 10.7-10.7S26.7 10.12 26.7 16s-4.82 10.7-10.7 10.7Zm5.87-8.01c-.32-.16-1.9-.94-2.2-1.05-.3-.1-.51-.16-.73.16-.21.32-.84 1.05-1.03 1.27-.19.21-.38.24-.7.08-.32-.16-1.36-.5-2.59-1.6-.96-.85-1.6-1.9-1.79-2.22-.19-.32-.02-.5.14-.66.15-.14.32-.38.48-.57.16-.19.21-.32.32-.54.1-.21.05-.4-.03-.56-.08-.16-.73-1.76-1-2.4-.26-.63-.53-.54-.73-.55h-.62c-.21 0-.56.08-.85.4-.3.32-1.12 1.1-1.12 2.68s1.15 3.11 1.31 3.32c.16.21 2.26 3.45 5.48 4.84.77.33 1.37.53 1.83.68.77.24 1.47.21 2.02.13.62-.09 1.9-.78 2.17-1.53.27-.75.27-1.4.19-1.53-.08-.13-.3-.21-.62-.37Z" />
        </svg>
      </span>
    </a>
  );
}
