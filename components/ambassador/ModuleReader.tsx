"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";
import { markTrainingModuleCompleteAction } from "@/actions/training-actions";
import { Button } from "@/components/ui/button";
import { toEmbedUrl } from "@/lib/video-embed";
import charter from "@/settings/charter";

type Neighbour = { id: string; title: string } | null;

export function ModuleReader({
  module,
  courseTitle,
  position,
  total,
  previous,
  next,
  initiallyCompleted,
}: {
  module: { id: string; title: string; html: string; videoUrl: string | null };
  courseTitle: string;
  position: number;
  total: number;
  previous: Neighbour;
  next: Neighbour;
  initiallyCompleted: boolean;
}) {
  const router = useRouter();
  const [completed, setCompleted] = useState(initiallyCompleted);
  // Un module déjà terminé se relit librement ; sinon il faut aller jusqu'à la fin du contenu.
  const [reachedEnd, setReachedEnd] = useState(initiallyCompleted);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reachedEnd) return;
    const node = endRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) setReachedEnd(true);
      },
      { threshold: 0.1 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reachedEnd]);

  const complete = () => {
    setError("");
    startTransition(async () => {
      try {
        await markTrainingModuleCompleteAction(module.id);
        setCompleted(true);
        router.refresh();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  const embed = module.videoUrl ? toEmbedUrl(module.videoUrl) : null;

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/ambassadeur/formation"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Mes formations
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider" style={{ color: charter.orange }}>
          {courseTitle} · Module {position} / {total}
        </p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{module.title}</h1>
      </div>

      {module.videoUrl &&
        (embed ? (
          <div className="overflow-hidden border bg-black">
            <iframe
              src={embed}
              title={module.title}
              className="aspect-video w-full"
              allow="encrypted-media; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
        ) : (
          <a
            href={module.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border p-4 text-sm font-medium underline"
            style={{ color: charter.orange }}
          >
            <ExternalLink className="h-4 w-4" />
            Voir la vidéo du module
          </a>
        ))}

      {module.html ? (
        <div
          className="rich-content border bg-card p-6 shadow-sm sm:p-8"
          // Le HTML est nettoyé côté serveur (lib/rich-content) avant d'arriver ici.
          dangerouslySetInnerHTML={{ __html: module.html }}
        />
      ) : (
        !module.videoUrl && (
          <p className="border bg-card p-6 text-sm text-muted-foreground shadow-sm">
            Ce module ne contient pas de contenu écrit.
          </p>
        )
      )}

      {/* Repère de fin de lecture */}
      <div ref={endRef} aria-hidden="true" />

      <div className="space-y-4 border bg-card p-6 shadow-sm">
        {completed ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            Module terminé
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              type="button"
              loading={isPending}
              disabled={!reachedEnd}
              onClick={complete}
              className="h-10 px-5 font-semibold"
            >
              Marquer comme terminé
            </Button>
            {!reachedEnd && (
              <p className="text-xs text-muted-foreground">
                Faites défiler jusqu&apos;à la fin du module pour pouvoir le terminer.
              </p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          {previous ? (
            <Button nativeButton={false} variant="outline" render={<Link href={`/ambassadeur/formation/${previous.id}`} />}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              {previous.title}
            </Button>
          ) : (
            <span />
          )}
          {next ? (
            <Button nativeButton={false} variant={completed ? "default" : "outline"} render={<Link href={`/ambassadeur/formation/${next.id}`} />}>
              {next.title}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button nativeButton={false} variant={completed ? "default" : "outline"} render={<Link href="/ambassadeur/formation" />}>
              Retour à mes formations
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
