import Image from "next/image";
import type { ReactNode } from "react";
import charter from "@/settings/charter";

const TINTS = {
  orange: { from: charter.orangeDark, blob: charter.orange, accent: charter.gold },
  green: { from: "#3f6620", blob: charter.green, accent: charter.gold },
  gold: { from: "#8a6400", blob: charter.gold, accent: charter.gold },
} as const;

/**
 * Bandeau d'en-tête des pages publiques : photo plein cadre, voile aux couleurs de la charte,
 * formes flottantes et vague de transition. Mêmes codes que l'accueil, une teinte par page.
 */
export function PageHero({
  eyebrow,
  title,
  description,
  image = "/header.jpg",
  imagePosition = "50% 70%",
  tint = "orange",
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  image?: string;
  /** Cadrage de la photo (object-position) : sert aussi à écarter le filigrane du photographe. */
  imagePosition?: string;
  tint?: keyof typeof TINTS;
  children?: ReactNode;
}) {
  const colors = TINTS[tint];
  return (
    <section className="relative isolate overflow-hidden text-white">
      {image.startsWith("/") ? (
        <Image src={image} alt="" fill priority sizes="100vw" className="-z-20 object-cover" style={{ objectPosition: imagePosition }} />
      ) : (
        // Photo hébergée à l'extérieur (ex. galerie d'une édition) : balise img, sans domaine à déclarer.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" style={{ objectPosition: imagePosition }} />
      )}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: `linear-gradient(110deg, ${charter.ink}f0 0%, ${charter.ink}b8 40%, ${colors.from}99 100%)`,
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-20 -top-24 -z-10 h-80 w-80 rounded-full motion-safe:animate-float-slow"
        style={{ background: `radial-gradient(circle, ${colors.blob}88 0%, transparent 68%)` }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 right-10 -z-10 h-72 w-72 rounded-full motion-safe:animate-float-slow [animation-delay:-5s]"
        style={{ background: `radial-gradient(circle, ${charter.gold}77 0%, transparent 68%)` }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-16 text-center motion-safe:animate-fade-up sm:px-6 sm:pb-28 sm:pt-24">
        <span
          className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest backdrop-blur"
          style={{ color: colors.accent }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.accent }} />
          {eyebrow}
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        {description && (
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">{description}</p>
        )}
        {children && <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{children}</div>}
      </div>

      <svg
        className="pointer-events-none absolute -bottom-px left-0 w-full"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        height="80"
        aria-hidden="true"
      >
        <path d="M0 40C240 80 480 80 720 48C960 16 1200 16 1440 52V80H0Z" fill={charter.bg} />
      </svg>
    </section>
  );
}
