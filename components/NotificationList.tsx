"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import {
  listMyNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/actions/notification-actions";
import { Button } from "@/components/ui/button";
import charter from "@/settings/charter";

type Item = Awaited<ReturnType<typeof listMyNotificationsAction>>[number];

export function NotificationList({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const run = (task: () => Promise<void>) => {
    setError("");
    startTransition(async () => {
      try {
        await task();
        setItems(await listMyNotificationsAction());
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Une erreur est survenue");
      }
    });
  };

  const unreadCount = items.filter(item => !item.isRead).length;

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: charter.orange }}>
            Espace personnel
          </p>
          <h1 className="mt-1 text-2xl font-bold">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} non lue(s)` : "Tout est à jour."}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            type="button"
            variant="outline"
            loading={isPending}
            onClick={() => run(markAllNotificationsReadAction)}
            className="rounded-none"
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-xl border bg-card px-5 py-3 text-sm text-destructive shadow-sm">{error}</p>
      )}

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="divide-y">
          {items.map(item => (
            <div
              key={item.id}
              className={`flex items-start gap-3 p-5 ${item.isRead ? "" : "bg-muted/30"}`}
            >
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: item.isRead ? "transparent" : charter.orange }}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>{new Date(item.createdAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</span>
                  {item.link && (
                    <Link
                      href={item.link}
                      onClick={() => !item.isRead && run(() => markNotificationReadAction(item.id))}
                      className="font-medium underline"
                      style={{ color: charter.orange }}
                    >
                      Ouvrir
                    </Link>
                  )}
                  {!item.isRead && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => run(() => markNotificationReadAction(item.id))}
                      className="underline"
                    >
                      Marquer comme lue
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-5 py-14 text-center text-muted-foreground">
              <Bell className="h-8 w-8" />
              <p className="text-sm">Aucune notification pour le moment.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
