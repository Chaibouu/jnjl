"use server";

import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/actions/requirePermission";
import { ADMIN_ACTION_LABELS } from "@/lib/audit";

export type AuditEntry = {
  id: string;
  createdAt: Date;
  action: string;
  actionLabel: string;
  status: string;
  actor: { id: string; name: string | null; email: string | null; role: string } | null;
  /** Personne ou objet visé, lu dans les détails de l'événement. */
  target: string;
  details: string;
  ipAddress: string | null;
};

const HIDDEN_BY_DEFAULT = ["LOGIN_SUCCESS", "LOGIN_FAILURE", "LOGOUT", "2FA_SUCCESS"];

function describeTarget(metadata: Record<string, unknown> | null): string {
  if (!metadata) return "";
  const name = typeof metadata.name === "string" ? metadata.name : "";
  const label = typeof metadata.label === "string" ? metadata.label : typeof metadata.email === "string" ? metadata.email : "";
  return [name, label].filter(Boolean).join(" · ");
}

function describeDetails(metadata: Record<string, unknown> | null): string {
  if (!metadata) return "";
  const skip = new Set(["name", "label", "email", "userId", "targetUserId", "applicationId", "editionId", "regionId"]);
  return Object.entries(metadata)
    .filter(([key, value]) => !skip.has(key) && value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key} : ${Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value) : String(value)}`)
    .join(" · ");
}

/** Journal d'audit des actions d'administration (qui a fait quoi, sur qui, quand). Réservé au Super Admin. */
export async function listAuditLogAction(filter?: { action?: string; search?: string; includeLogins?: boolean }) {
  await requireSuperAdmin();

  const logs = await db.auditLog.findMany({
    where: {
      ...(filter?.action ? { action: filter.action } : {}),
      ...(!filter?.action && !filter?.includeLogins ? { action: { notIn: HIDDEN_BY_DEFAULT } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      createdAt: true,
      action: true,
      status: true,
      ipAddress: true,
      metadata: true,
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  const query = filter?.search?.trim().toLowerCase();
  const entries: AuditEntry[] = logs
    .map(log => {
      const metadata = (log.metadata ?? null) as Record<string, unknown> | null;
      return {
        id: log.id,
        createdAt: log.createdAt,
        action: log.action,
        actionLabel: ADMIN_ACTION_LABELS[log.action] ?? log.action,
        status: log.status,
        actor: log.user,
        target: describeTarget(metadata),
        details: describeDetails(metadata),
        ipAddress: log.ipAddress,
      };
    })
    .filter(entry =>
      query
        ? `${entry.actionLabel} ${entry.actor?.name ?? ""} ${entry.actor?.email ?? ""} ${entry.target} ${entry.details}`
            .toLowerCase()
            .includes(query)
        : true
    );

  return {
    entries,
    actions: Object.entries(ADMIN_ACTION_LABELS).map(([code, label]) => ({ code, label })),
  };
}
