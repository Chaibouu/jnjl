import Link from "next/link";
import { ArrowRight, Hourglass } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import charter from "@/settings/charter";

/**
 * Page affichée à la place d'un formulaire quand les candidatures sont fermées.
 * Le message libre (« Ouverture prévue… ») vient de la page Paramètres de l'administration.
 */
export function ClosedNotice({
  eyebrow,
  title,
  description,
  note,
  image,
  imagePosition,
}: {
  eyebrow: string;
  title: string;
  description: string;
  note?: string;
  image?: string;
  imagePosition?: string;
}) {
  return (
    <div style={{ backgroundColor: charter.bg }}>
      <PageHero
        eyebrow={eyebrow}
        title={title}
        description={description}
        image={image}
        imagePosition={imagePosition}
        tint="orange"
      />

      <div className="px-4 pb-24 pt-6 sm:px-6">
        <div
          className="mx-auto max-w-xl rounded-2xl border bg-white p-8 text-center shadow-sm sm:p-10"
          style={{ borderColor: charter.border }}
        >
          <span
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: `${charter.orange}18`, color: charter.orange }}
          >
            <Hourglass className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-xl font-bold" style={{ color: charter.ink }}>
            Fermé pour le moment
          </h2>
          {note ? (
            <p className="mt-3 text-base font-semibold" style={{ color: charter.orangeDark }}>
              {note}
            </p>
          ) : null}
          <p className="mt-3 text-sm leading-relaxed" style={{ color: charter.inkSoft }}>
            Suivez nos actualités : toute nouvelle ouverture sera annoncée sur le site et sur nos réseaux.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/actualites"
              className="group inline-flex h-11 items-center gap-2 px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: charter.orange }}
            >
              Voir les actualités
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/"
              className="inline-flex h-11 items-center border-2 px-6 text-sm font-semibold transition-colors hover:bg-black hover:text-white"
              style={{ borderColor: charter.ink, color: charter.ink }}
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
