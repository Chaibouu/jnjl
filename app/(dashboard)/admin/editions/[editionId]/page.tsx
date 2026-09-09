import Link from "next/link";
import { getEditionAction } from "@/actions/edition-actions";
import { Button } from "@/components/ui/button";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publiée",
  ACTIVE: "Active",
  ARCHIVED: "Archivée",
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
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Édition</p>
            <h1 className="mt-1 text-3xl font-bold">{edition.name}</h1>
            <p className="mt-1 text-muted-foreground">
              {edition.year} — /{edition.slug}
            </p>
          </div>
          <Button asChild>
            <Link href={`/admin/editions/${edition.id}/edit`}>Modifier</Link>
          </Button>
        </div>
        <dl className="mt-8 grid gap-5 sm:grid-cols-2">
          <Detail
            label="Statut"
            value={STATUS_LABEL[edition.status] ?? edition.status}
          />
          <Detail label="Thème" value={edition.theme || "—"} />
          <Detail label="Lieu" value={edition.location || "—"} />
          <Detail
            label="Dates"
            value={formatRange(edition.startDate, edition.endDate)}
          />
          <Detail
            label="Description"
            value={edition.description || "—"}
            full
          />
        </dl>
      </div>
    </section>
  );
}

function Detail({
  label,
  value,
  full = false,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-line text-sm">{value}</dd>
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
