"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import {
  getNotificationBellAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/actions/notification-actions";

type BellData = Awaited<ReturnType<typeof getNotificationBellAction>>;

const REFRESH_MS = 60_000;

/** Cloche de notifications du header : pastille des non lues, aperçu des dernières, accès à la liste. */
export default function NotificationBell() {
  const router = useRouter();
  const [data, setData] = useState<BellData>({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      setData(await getNotificationBellAction());
    } catch {
      // Session expirée ou base momentanément indisponible : la cloche reste telle quelle.
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openItem = async (item: BellData["items"][number]) => {
    setOpen(false);
    if (!item.isRead) {
      await markNotificationReadAction(item.id).catch(() => undefined);
      refresh();
    }
    if (item.link) router.push(item.link);
  };

  const readAll = async () => {
    await markAllNotificationsReadAction().catch(() => undefined);
    refresh();
  };

  return (
    <div className="relative" ref={container}>
      <button
        type="button"
        onClick={() => {
          setOpen(value => !value);
          if (!open) refresh();
        }}
        aria-label={data.unread > 0 ? `Notifications (${data.unread} non lues)` : "Notifications"}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-stroke bg-gray text-black transition-colors hover:text-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
      >
        <Bell className="h-5 w-5" />
        {data.unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {data.unread > 9 ? "9+" : data.unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute -right-16 z-50 mt-3 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark sm:right-0">
          <div className="flex items-center justify-between border-b border-stroke px-4 py-3 dark:border-strokedark">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {data.unread > 0 && (
              <button type="button" onClick={readAll} className="text-xs font-medium text-primary hover:underline">
                Tout marquer comme lu
              </button>
            )}
          </div>

          {data.items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Aucune notification.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-stroke overflow-y-auto dark:divide-strokedark">
              {data.items.map(item => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-2 dark:hover:bg-meta-4 ${
                      item.isRead ? "" : "bg-primary/5"
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.isRead ? "bg-transparent" : "bg-red-500"}`}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{item.title}</span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{item.message}</span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/dashboard/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-stroke px-4 py-3 text-center text-sm font-medium text-primary hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
          >
            Voir toutes les notifications
          </Link>
        </div>
      )}
    </div>
  );
}
