"use client";

import { useState, useTransition } from "react";
import { Download, FileText } from "lucide-react";
import {
  generateMyMissionOrderAction,
  generateMyPermissionRequestAction,
  getMyDocumentFormDataAction,
} from "@/actions/ambassador-document-actions";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import charter from "@/settings/charter";

type FormData = Awaited<ReturnType<typeof getMyDocumentFormDataAction>>;

/** Demande de permission : générée à partir du modèle Word officiel — l'ambassadeur ne fait que
 * compléter les quelques informations manquantes, puis télécharge le document (format Word). */
export function PermissionRequestSection({ initialData }: { initialData: FormData }) {
  const [data, setData] = useState(initialData);
  return <PermissionRequestCard data={data} onGenerated={doc => setData(current => ({ ...current, permissionRequest: doc }))} />;
}

/** Ordre de mission : même principe que la demande de permission, à partir de son propre modèle Word. */
export function MissionOrderSection({ initialData }: { initialData: FormData }) {
  const [data, setData] = useState(initialData);
  return <MissionOrderCard data={data} onGenerated={doc => setData(current => ({ ...current, missionOrder: doc }))} />;
}

function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function DownloadLink({ fileUrl, label }: { fileUrl: string; label: string }) {
  return (
    <a
      href={fileUrl}
      download
      className="inline-flex items-center gap-1.5 text-sm font-semibold underline"
      style={{ color: charter.orange }}
    >
      <Download className="h-4 w-4" />
      {label}
    </a>
  );
}

function PermissionRequestCard({
  data,
  onGenerated,
}: {
  data: FormData;
  onGenerated: (doc: NonNullable<FormData["permissionRequest"]>) => void;
}) {
  const [civilite, setCivilite] = useState<"Monsieur" | "Madame">("Monsieur");
  const [destinataireTitre, setDestinataireTitre] = useState("");
  const [etablissement, setEtablissement] = useState(data.institution);
  const [niveau, setNiveau] = useState(data.educationLevel);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const { fileUrl } = await generateMyPermissionRequestAction({
          destinataireTitre,
          civilite,
          etablissement,
          niveau,
        });
        onGenerated({ fileUrl, generatedAt: new Date() } as never);
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  return (
    <Card
      title="Demande de permission"
      description={`Lettre à remettre à votre établissement pour justifier votre absence ${data.absenceDates} (${data.durationDays} jour${data.durationDays > 1 ? "s" : ""}).`}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field>
          <FieldLabel>Civilité du destinataire</FieldLabel>
          <Select value={civilite} onValueChange={value => value && setCivilite(value as "Monsieur" | "Madame")}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Monsieur">Monsieur</SelectItem>
              <SelectItem value="Madame">Madame</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>Titre du destinataire</FieldLabel>
          <Input
            value={destinataireTitre}
            onChange={event => setDestinataireTitre(event.target.value)}
            placeholder="ex. le Directeur Général, la Proviseure, le Recteur…"
            required
          />
        </Field>
        <Field>
          <FieldLabel>Établissement</FieldLabel>
          <Input value={etablissement} onChange={event => setEtablissement(event.target.value)} required />
        </Field>
        <Field>
          <FieldLabel>Niveau / filière</FieldLabel>
          <Input value={niveau} onChange={event => setNiveau(event.target.value)} required />
        </Field>
        {error && <p className="bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button type="submit" loading={isPending} className="w-full">
          <FileText className="mr-1.5 h-4 w-4" />
          {data.permissionRequest ? "Régénérer le document" : "Générer le document"}
        </Button>
        {data.permissionRequest && (
          <DownloadLink fileUrl={data.permissionRequest.fileUrl} label="Télécharger ma demande de permission" />
        )}
      </form>
    </Card>
  );
}

function MissionOrderCard({
  data,
  onGenerated,
}: {
  data: FormData;
  onGenerated: (doc: NonNullable<FormData["missionOrder"]>) => void;
}) {
  const [etablissement, setEtablissement] = useState(data.institution);
  const [moyenTransport, setMoyenTransport] = useState("");
  const [financement, setFinancement] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const { fileUrl } = await generateMyMissionOrderAction({ etablissement, moyenTransport, financement });
        onGenerated({ fileUrl, generatedAt: new Date() } as never);
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  return (
    <Card
      title="Ordre de mission"
      description={`Document officiel de mission pour ${data.missionDates}, à ${data.location}.`}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field>
          <FieldLabel>Établissement / organisme d&apos;origine</FieldLabel>
          <Input value={etablissement} onChange={event => setEtablissement(event.target.value)} required />
        </Field>
        <Field>
          <FieldLabel>Moyen de transport</FieldLabel>
          <Input
            value={moyenTransport}
            onChange={event => setMoyenTransport(event.target.value)}
            placeholder="ex. Véhicule personnel, transport en commun…"
            required
          />
        </Field>
        <Field>
          <FieldLabel>Financement</FieldLabel>
          <Input
            value={financement}
            onChange={event => setFinancement(event.target.value)}
            placeholder="ex. JNJL"
            required
          />
        </Field>
        {error && <p className="bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button type="submit" loading={isPending} className="w-full">
          <FileText className="mr-1.5 h-4 w-4" />
          {data.missionOrder ? "Régénérer le document" : "Générer le document"}
        </Button>
        {data.missionOrder && (
          <DownloadLink fileUrl={data.missionOrder.fileUrl} label="Télécharger mon ordre de mission" />
        )}
      </form>
    </Card>
  );
}
