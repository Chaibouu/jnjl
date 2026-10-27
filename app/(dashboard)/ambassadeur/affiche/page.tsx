import { AMBASSADOR_POSTER, PosterGenerator } from "@/components/site/PosterGenerator";
import charter from "@/settings/charter";

export default function AmbassadorPosterPage() {
  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: charter.orange }}>
          Espace ambassadeur
        </p>
        <h1 className="mt-1 text-2xl font-bold">Mon affiche « Je suis ambassadeur JNJL »</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ajoutez votre photo à l&apos;affiche officielle des ambassadeurs de la 6ᵉ édition de la Journée Nationale du Jeune
          Leader, puis téléchargez-la et partagez-la autour de vous.
        </p>
      </div>
      <PosterGenerator config={AMBASSADOR_POSTER} />
    </section>
  );
}
