import { ArrowLeft, HelpCircle, Clock, Send, CheckCircle2, AlertTriangle, UserCheck, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import charter from "@/settings/charter";

export default function RepechageGuidePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/repechage"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au module de repêchage
        </Link>
        
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${charter.orange}15` }}
          >
            <HelpCircle className="h-6 w-6" style={{ color: charter.orange }} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Guide du Repêchage</h1>
            <p className="text-muted-foreground">
              Procédure pour les demandes de repêchage par les staffs régionaux
            </p>
          </div>
        </div>
      </div>

      {/* Vue d'ensemble */}
      <div className="mb-8 rounded-2xl border bg-card p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <UserCheck className="h-5 w-5" style={{ color: charter.orange }} />
          Qu'est-ce que le repêchage ?
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Le repêchage est une procédure exceptionnelle qui permet de sélectionner un candidat ambassadeur 
          initialement non retenu par le quota régional, en raison de circonstances particulières ou de 
          qualités spéciales méritant une reconsidération.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 dark:bg-amber-950/20 dark:border-amber-900/40">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Important :</strong> Le repêchage reste une exception et nécessite une justification 
            solide et documentée de la part du staff régional.
          </p>
        </div>
      </div>

      {/* Étapes du processus */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-6">Processus de demande de repêchage</h2>
        
        <div className="space-y-6">
          {/* Étape 1 */}
          <div className="flex gap-4">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: charter.orange }}
            >
              1
            </div>
            <div>
              <h3 className="font-semibold mb-2">Identification du candidat</h3>
              <p className="text-muted-foreground text-sm mb-2">
                Identifiez dans votre région un candidat non sélectionné qui mérite d'être reconsidéré.
              </p>
              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 ml-4">
                <li>Le candidat doit avoir le statut "NON_SELECTIONNE"</li>
                <li>Il doit appartenir à votre région de compétence</li>
                <li>Aucune demande de repêchage ne doit être en cours pour ce candidat</li>
              </ul>
            </div>
          </div>

          {/* Étape 2 */}
          <div className="flex gap-4">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: charter.orange }}
            >
              2
            </div>
            <div>
              <h3 className="font-semibold mb-2">Rédaction du motif</h3>
              <p className="text-muted-foreground text-sm mb-2">
                Préparez une justification détaillée expliquant pourquoi ce candidat mérite d'être repêché.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 dark:bg-blue-950/20 dark:border-blue-900/40">
                <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-2">
                  Exemples de motifs valides :
                </p>
                <ul className="list-disc list-inside text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <li>Engagement exceptionnel dans des initiatives locales</li>
                  <li>Compétences particulières requises pour l'équilibre régional</li>
                  <li>Représentativité d'une communauté ou d'un secteur sous-représenté</li>
                  <li>Motivation et potentiel de leadership avérés sur le terrain</li>
                  <li>Circonstances particulières ayant affecté les résultats du QCM</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Étape 3 */}
          <div className="flex gap-4">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: charter.orange }}
            >
              3
            </div>
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Send className="h-4 w-4" />
                Soumission de la demande
              </h3>
              <p className="text-muted-foreground text-sm mb-2">
                Cliquez sur "Demander un repêchage" à côté du candidat concerné et saisissez votre motif.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 dark:bg-green-950/20 dark:border-green-900/40">
                <p className="text-xs text-green-800 dark:text-green-200">
                  <strong>Conseil :</strong> Rédigez un motif de minimum 10 caractères, mais privilégiez 
                  un texte détaillé et argumenté pour maximiser les chances d'acceptation.
                </p>
              </div>
            </div>
          </div>

          {/* Étape 4 */}
          <div className="flex gap-4">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white bg-amber-600"
            >
              4
            </div>
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Attente de validation
              </h3>
              <p className="text-muted-foreground text-sm mb-2">
                Votre demande passe en statut "EN_ATTENTE" et sera examinée par les administrateurs.
              </p>
              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 ml-4">
                <li>Vous pouvez annuler votre demande tant qu'elle n'a pas été traitée</li>
                <li>Le candidat et vous recevrez une notification de la décision</li>
                <li>Les administrateurs peuvent ajouter des commentaires à leur décision</li>
              </ul>
            </div>
          </div>

          {/* Étape 5 */}
          <div className="flex gap-4">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white bg-green-600"
            >
              5
            </div>
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Décision finale
              </h3>
              <p className="text-muted-foreground text-sm">
                Les administrateurs valident ou refusent la demande. En cas d'acceptation, 
                le candidat rejoint automatiquement la liste des ambassadeurs sélectionnés.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bonnes pratiques */}
      <div className="mb-8 rounded-2xl border bg-card p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Bonnes pratiques
        </h2>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="font-medium text-green-700 dark:text-green-400 mb-2">✅ À faire</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Justifier précisément le motif du repêchage</li>
              <li>• Mentionner des faits concrets et vérifiables</li>
              <li>• Prendre en compte l'équilibre régional</li>
              <li>• S'assurer du sérieux du candidat</li>
              <li>• Documenter l'engagement local du candidat</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium text-red-700 dark:text-red-400 mb-2">❌ À éviter</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Motifs vagues ou génériques</li>
              <li>• Demandes basées uniquement sur des relations personnelles</li>
              <li>• Repêchage systématique sans justification solide</li>
              <li>• Oublier de vérifier l'engagement réel du candidat</li>
              <li>• Multiplier les demandes non justifiées</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Statuts des demandes */}
      <div className="mb-8 rounded-2xl border bg-card p-6">
        <h2 className="text-xl font-semibold mb-4">Statuts des demandes</h2>
        
        <div className="grid gap-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
              <Clock className="h-3 w-3 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">EN_ATTENTE</p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Demande soumise, en cours d'examen par les administrateurs
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-900/40">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">VALIDÉ</p>
              <p className="text-xs text-green-700 dark:text-green-300">
                Repêchage accepté, le candidat rejoint les ambassadeurs sélectionnés
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/40">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
              <X className="h-3 w-3 text-red-600" />
            </div>
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">REFUSÉ</p>
              <p className="text-xs text-red-700 dark:text-red-300">
                Repêchage refusé par les administrateurs
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          nativeButton={false}
          render={<Link href="/admin/repechage" />}
          className="rounded-xl text-white"
          style={{ backgroundColor: charter.orange }}
        >
          Accéder au module de repêchage
        </Button>

        <Button
          nativeButton={false}
          variant="outline"
          render={<Link href="/admin/guide" />}
          className="rounded-xl"
        >
          Guide général de l'administration
        </Button>
      </div>
    </div>
  );
}