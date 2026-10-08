"use client";

import { Clock, CheckCircle2, XCircle, Users, AlertTriangle } from "lucide-react";
import charter from "@/settings/charter";
import type { Candidate } from "./RepechageManager";

interface RepechageStatsProps {
  candidates: Candidate[];
  currentUser: { id: string; role: string } | null;
}

export function RepechageStats({ candidates, currentUser }: RepechageStatsProps) {
  const isStaff = currentUser?.role === "STAFF";

  // Calculs des statistiques
  const stats = {
    total: candidates.length,
    pending: candidates.filter(c => c.repechage?.status === "EN_ATTENTE").length,
    approved: candidates.filter(c => c.repechage?.status === "VALIDE").length,
    rejected: candidates.filter(c => c.repechage?.status === "REFUSE").length,
    noRequest: candidates.filter(c => !c.repechage).length,
    myRequests: isStaff ? candidates.filter(c => c.repechage?.requestedBy?.id === currentUser?.id).length : 0,
  };

  const statCards = isStaff 
    ? [
        {
          label: "Candidats éligibles",
          value: stats.noRequest,
          icon: Users,
          color: "blue",
          description: "Candidats sans demande de repêchage"
        },
        {
          label: "Mes demandes en cours",
          value: stats.myRequests,
          icon: Clock,
          color: "amber",
          description: "Demandes soumises par vous"
        },
        {
          label: "Repêchages validés",
          value: stats.approved,
          icon: CheckCircle2,
          color: "green",
          description: "Total des repêchages acceptés"
        },
      ]
    : [
        {
          label: "Demandes en attente",
          value: stats.pending,
          icon: Clock,
          color: "amber",
          description: "En attente de validation"
        },
        {
          label: "Repêchages validés",
          value: stats.approved,
          icon: CheckCircle2,
          color: "green",
          description: "Demandes acceptées"
        },
        {
          label: "Demandes refusées",
          value: stats.rejected,
          icon: XCircle,
          color: "red",
          description: "Demandes rejetées"
        },
        {
          label: "Sans demande",
          value: stats.noRequest,
          icon: AlertTriangle,
          color: "gray",
          description: "Candidats éligibles"
        },
      ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case "amber":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/20",
          border: "border-amber-200 dark:border-amber-900/40",
          icon: "text-amber-600",
          text: "text-amber-900 dark:text-amber-100",
          number: "text-amber-800 dark:text-amber-200"
        };
      case "green":
        return {
          bg: "bg-green-50 dark:bg-green-950/20",
          border: "border-green-200 dark:border-green-900/40",
          icon: "text-green-600",
          text: "text-green-900 dark:text-green-100",
          number: "text-green-800 dark:text-green-200"
        };
      case "red":
        return {
          bg: "bg-red-50 dark:bg-red-950/20",
          border: "border-red-200 dark:border-red-900/40",
          icon: "text-red-600",
          text: "text-red-900 dark:text-red-100",
          number: "text-red-800 dark:text-red-200"
        };
      case "blue":
        return {
          bg: "bg-blue-50 dark:bg-blue-950/20",
          border: "border-blue-200 dark:border-blue-900/40",
          icon: "text-blue-600",
          text: "text-blue-900 dark:text-blue-100",
          number: "text-blue-800 dark:text-blue-200"
        };
      default:
        return {
          bg: "bg-muted/30",
          border: "border-border",
          icon: "text-muted-foreground",
          text: "text-foreground",
          number: "text-foreground"
        };
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        const colors = getColorClasses(stat.color);
        
        return (
          <div 
            key={stat.label}
            className={`rounded-xl border p-4 ${colors.bg} ${colors.border}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium ${colors.text}`}>
                  {stat.label}
                </p>
                <p className={`text-2xl font-bold tabular-nums ${colors.number}`}>
                  {stat.value}
                </p>
              </div>
              <Icon className={`h-5 w-5 ${colors.icon}`} />
            </div>
            <p className={`mt-1 text-xs ${colors.text} opacity-80`}>
              {stat.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}