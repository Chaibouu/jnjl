import Link from "next/link";
import { ArrowRight, CalendarDays, Clock } from "lucide-react";
import { toPlainText } from "@/lib/rich-content";
import charter from "@/settings/charter";

export type NewsCardItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string | null;
  coverImage: string | null;
  publishedAt: Date | string | null;
};

const ACCENTS = [charter.orange, charter.green, "#B58500"] as const;
const NEW_FOR_DAYS = 7;

const formatDate = (value: Date | string) =>
  new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

/** Temps de lecture estimé (200 mots/minute), au minimum 1 minute. */
function readingMinutes(plainText: string) {
  const words = plainText ? plainText.split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / 200));
}

function isRecent(date: Date | string | null) {
  if (!date) return false;
  return Date.now() - new Date(date).getTime() < NEW_FOR_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Carte d'actualité des pages publiques. Le résumé reprend l'extrait ; s'il est vide, il est tiré
 * du texte de l'article (sans balises), pour qu'aucune carte ne reste sans description.
 */
export function NewsCard({
  item,
  index = 0,
  variant = "default",
}: {
  item: NewsCardItem;
  index?: number;
  variant?: "default" | "featured";
}) {
  const accent = ACCENTS[index % ACCENTS.length];
  const plain = toPlainText(item.content);
  const summary = item.excerpt?.trim() || plain.slice(0, 220);
  const minutes = readingMinutes(plain);
  const featured = variant === "featured";
  const recent = isRecent(item.publishedAt);

  return (
    <Link
      href={`/actualites/${item.slug}`}
      className={`group relative flex overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl ${
        featured ? "flex-col md:flex-row" : "flex-col"
      }`}
      style={{ borderColor: charter.border }}
    >
      {/* Visuel */}
      <div
        className={`relative shrink-0 overflow-hidden bg-muted ${
          featured ? "aspect-[16/10] md:aspect-auto md:w-1/2" : "aspect-[16/10]"
        }`}
      >
        {item.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.coverImage}
            alt={item.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${accent}, ${charter.ink})` }}
          >
            <span className="text-5xl font-extrabold tracking-tight text-white/90">JNJL</span>
          </div>
        )}
        <div
          className="absolute inset-0 opacity-70 transition-opacity duration-300 group-hover:opacity-90"
          style={{ background: `linear-gradient(to top, ${charter.ink}b3, transparent 55%)` }}
          aria-hidden="true"
        />

        <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-2">
          {item.category ? (
            <span
              className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-md"
              style={{ backgroundColor: accent }}
            >
              {item.category}
            </span>
          ) : (
            <span />
          )}
          {recent && (
            <span
              className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide shadow-md"
              style={{ backgroundColor: charter.gold, color: charter.ink }}
            >
              Nouveau
            </span>
          )}
        </div>
      </div>

      {/* Texte */}
      <div className={`flex flex-1 flex-col ${featured ? "p-7 sm:p-10 md:justify-center" : "p-6"}`}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: charter.inkFaint }}>
          {item.publishedAt && (
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" style={{ color: accent }} />
              {formatDate(item.publishedAt)}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" style={{ color: accent }} />
            {minutes} min de lecture
          </span>
        </div>

        <h2
          className={`mt-3 font-bold leading-snug transition-colors duration-200 group-hover:text-[var(--accent)] ${
            featured ? "text-2xl sm:text-3xl" : "line-clamp-2 text-lg"
          }`}
          style={{ color: charter.ink, ["--accent" as string]: charter.orangeDark }}
        >
          {item.title}
        </h2>

        {summary && (
          <p
            className={`mt-3 leading-relaxed ${featured ? "line-clamp-4 text-base" : "line-clamp-3 text-sm"}`}
            style={{ color: charter.inkSoft }}
          >
            {summary}
          </p>
        )}

        <span
          className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-bold"
          style={{ color: charter.orangeDark }}
        >
          Lire l’article
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1.5" />
        </span>
      </div>

      {/* Liseré de couleur qui se déploie au survol */}
      <span
        className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
        style={{ backgroundColor: accent }}
        aria-hidden="true"
      />
    </Link>
  );
}
