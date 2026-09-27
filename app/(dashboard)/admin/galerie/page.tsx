import { Calendar, ImageIcon } from "lucide-react";
import { getActiveEditionOverviewAction } from "@/actions/edition-actions";
import { getUser } from "@/actions/getUser";
import { listEditionMediaAction, listEditionStatsAction } from "@/actions/edition-content-actions";
import { EditionContentManager } from "@/components/admin/EditionContentManager";
import { hasPermission } from "@/lib/permissions";
import type { User } from "@/types/user";
import charter from "@/settings/charter";

/**
 * Point d'entrée dédié vers la Galerie/Chiffres clés de l'édition ACTIVE, accessible
 * sans la permission `editions.manage` (contrairement à /admin/editions/[id]) — voir
 * §7 du guide admin. Utilisé notamment par le rôle WEBMASTER (permission `media.manage`).
 */
export default async function GaleriePage() {
  const edition = await getActiveEditionOverviewAction();

  const session = await getUser();
  const currentUser = session?.user?.user as User | undefined;
  const canManageStats = !!currentUser && hasPermission(currentUser, "editions.manage");
  const canManageMedia = !!currentUser && hasPermission(currentUser, "media.manage");

  if (!edition) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
          <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            Aucune édition active pour le moment. La galerie sera disponible dès qu'une édition
            sera activée.
          </p>
        </div>
      </section>
    );
  }

  const [stats, media] = await Promise.all([
    canManageStats ? listEditionStatsAction(edition.id) : [],
    canManageMedia ? listEditionMediaAction(edition.id) : [],
  ]);

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${charter.orange}15` }}
            >
              <Calendar className="h-6 w-6" style={{ color: charter.orange }} />
            </span>
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">{edition.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Édition active — {edition.year}
              </p>
            </div>
          </div>
        </div>
      </div>

      <EditionContentManager
        editionId={edition.id}
        initialStats={stats}
        initialMedia={media}
        canManageStats={canManageStats}
        canManageMedia={canManageMedia}
      />
    </section>
  );
}
