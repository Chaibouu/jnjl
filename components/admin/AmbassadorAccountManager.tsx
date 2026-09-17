"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Eye, KeyRound, Mail, Search, UserCheck, UserX } from "lucide-react";
import {
  sendAmbassadorPasswordResetAction,
  setAmbassadorPasswordAction,
  toggleAmbassadorAccountAction,
} from "@/actions/ambassador-account-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";

type Account = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  region: { name: string; code: string };
  edition: { name: string; year: number };
  user: {
    id: string;
    name: string | null;
    email: string | null;
    isActive: boolean;
    emailVerified: Date | null;
    isTwoFactorEnabled: boolean;
  };
};

export function AmbassadorAccountManager({
  accounts: initialAccounts,
}: {
  accounts: Account[];
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [passwordTarget, setPasswordTarget] = useState<Account | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? accounts.filter(item =>
          `${item.firstName} ${item.lastName} ${item.email} ${item.region.name}`
            .toLowerCase()
            .includes(query)
        )
      : accounts;
  }, [search, accounts]);

  const toggle = (account: Account) => {
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        const updated = await toggleAmbassadorAccountAction(account.user.id);
        setAccounts(current =>
          current.map(item =>
            item.user.id === account.user.id
              ? { ...item, user: { ...item.user, isActive: updated.isActive } }
              : item
          )
        );
        setMessage(
          updated.isActive
            ? "Compte activé"
            : "Compte désactivé — les sessions actives ont été fermées"
        );
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Une erreur est survenue"
        );
      }
    });
  };

  const sendResetLink = (account: Account) => {
    if (
      !window.confirm(
        `Envoyer un lien de réinitialisation de mot de passe à ${account.email} ?`
      )
    )
      return;
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        await sendAmbassadorPasswordResetAction(account.user.id);
        setMessage(`Lien de réinitialisation envoyé à ${account.email}`);
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Impossible d'envoyer le lien de réinitialisation"
        );
      }
    });
  };

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border bg-card p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          Ambassadeurs
        </p>
        <h1 className="mt-1 text-3xl font-bold">Comptes</h1>
        <p className="mt-2 text-muted-foreground">
          Activez, désactivez ou réinitialisez le mot de passe des comptes
          ambassadeurs créés après acceptation d&apos;une candidature.
        </p>
      </header>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Liste des ambassadeurs</h2>
            <p className="text-sm text-muted-foreground">
              {filtered.length} compte{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Rechercher..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
        </div>
        {message && (
          <p className="border-b px-5 py-3 text-sm text-green-600">{message}</p>
        )}
        {error && (
          <p className="border-b px-5 py-3 text-sm text-destructive">{error}</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-4">Ambassadeur</th>
                <th className="px-5 py-4">Région</th>
                <th className="px-5 py-4">Édition</th>
                <th className="px-5 py-4">Statut</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(account => (
                <tr key={account.id} className="hover:bg-muted/30">
                  <td className="px-5 py-4">
                    <p className="font-medium">
                      {account.firstName} {account.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {account.email} · {account.phone}
                    </p>
                  </td>
                  <td className="px-5 py-4">{account.region.name}</td>
                  <td className="px-5 py-4">
                    {account.edition.name} ({account.edition.year})
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${account.user.isActive ? "text-green-600" : "text-muted-foreground"}`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${account.user.isActive ? "bg-green-500" : "bg-gray-400"}`}
                      />
                      {account.user.isActive ? "Actif" : "Désactivé"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Voir les informations"
                        nativeButton={false}
                        render={
                          <Link
                            href={`/admin/ambassadeurs/candidatures/${account.id}`}
                          />
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        title={account.user.isActive ? "Désactiver" : "Activer"}
                        onClick={() => toggle(account)}
                        disabled={isPending}
                      >
                        {account.user.isActive ? (
                          <UserX className="h-4 w-4 text-amber-600" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        title="Envoyer un lien de réinitialisation"
                        onClick={() => sendResetLink(account)}
                        disabled={isPending}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        title="Définir un nouveau mot de passe"
                        onClick={() => setPasswordTarget(account)}
                        disabled={isPending}
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-muted-foreground"
                  >
                    Aucun compte ambassadeur trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SetPasswordDialog
        account={passwordTarget}
        onClose={() => setPasswordTarget(null)}
        onSuccess={() => {
          setPasswordTarget(null);
          setMessage("Mot de passe mis à jour — les sessions actives ont été fermées");
        }}
      />
    </section>
  );
}

function SetPasswordDialog({
  account,
  onClose,
  onSuccess,
}: {
  account: Account | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!account) return;
    setError("");
    startTransition(async () => {
      try {
        await setAmbassadorPasswordAction(account.user.id, { password });
        setPassword("");
        onSuccess();
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Une erreur est survenue"
        );
      }
    });
  };

  return (
    <Dialog
      open={!!account}
      onOpenChange={open => {
        if (!open) {
          setPassword("");
          setError("");
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Nouveau mot de passe {account ? `— ${account.firstName} ${account.lastName}` : ""}
          </DialogTitle>
        </DialogHeader>
        <form id="set-ambassador-password" onSubmit={submit} className="space-y-4">
          <Field>
            <FieldLabel>Mot de passe</FieldLabel>
            <Input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              minLength={8}
              required
              autoFocus
              placeholder="Au moins 8 caractères"
            />
          </Field>
          {error && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            L&apos;ambassadeur devra se reconnecter avec ce nouveau mot de passe ;
            ses sessions actives seront fermées.
          </p>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="submit"
            form="set-ambassador-password"
            disabled={isPending || password.length < 8}
          >
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
