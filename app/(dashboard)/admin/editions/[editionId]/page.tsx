import Link from "next/link";
import { Calendar, FileText, MapPin, Sparkles } from "lucide-react";
import { getEditionAction } from "@/actions/edition-actions";
import { Button } from "@/components/ui/button";
import charter from "@/settings/charter";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publiée",
  ACTIVE: "Active",
  ARCHIVED: "Archivée",
};

const STATUS_CLASS: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PUBLISHED: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-green-100 text-green-700",
  ARCHIVED: "bg-amber-100 text-amber-700",
};

export default async function EditionDetailsPage({
  params,
}: {
  params: Promise<{ editionId: string }>;
}) {
  const { editionId } = await params;
  const edition = await getEditionAction(editionId);

  return (
    <section className="space-y-6">
      <Link
        href="/admin/editions"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Retour aux éditions
      </Link>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
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
                  {edition.year} — /{edition.slug}
                </p>
                <span
                  className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[edition.status] ?? "bg-muted"}`}
                >
                  {STATUS_LABEL[edition.status] ?? edition.status}
                </span>
              </div>
            </div>
            <Button
              nativeButton={false}
              className="text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: charter.orange }}
              render={<Link href={`/admin/editions/${edition.id}/edit`} />}
            >
              Modifier
            </Button>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <InfoTile
              icon={Sparkles}
              label="Thème"
              value={edition.theme || "—"}
            />
            <InfoTile
              icon={MapPin}
              label="Lieu"
              value={edition.location || "—"}
            />
            <InfoTile
              icon={Calendar}
              label="Dates"
              value={formatRange(edition.startDate, edition.endDate)}
            />
          </div>

          <div className="mt-6 rounded-xl border bg-muted/30 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Description
            </div>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {edition.description || "Aucune description renseignée."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function formatRange(start: Date | null, end: Date | null) {
  if (!start && !end) return "—";
  const fmt = (value: Date) =>
    new Date(value).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  if (start && end) return `${fmt(start)} → ${fmt(end)}`;
  return fmt((start ?? end) as Date);
}
