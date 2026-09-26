"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { FadeLoader } from "react-spinners";
import { logout } from "@/actions/logout";
import appConfig from "@/settings";

interface LogoutButtonProps {
  children?: React.ReactNode;
}

export const LogoutButton = ({ children }: LogoutButtonProps) => {
  const [isPending, startTransition] = useTransition();
  // Le portail a besoin du DOM du navigateur : on ne le monte qu'après l'hydratation.
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const onClick = () => {
    if (isPending) return;
    startTransition(async () => {
      await logout();
      // Rechargement complet : réinitialise tout l'état client (session, sidebar…)
      // sur une page qui n'exige plus d'authentification.
      window.location.href = "/auth/login";
    });
  };

  return (
    <>
      <span onClick={onClick} className="cursor-pointer">
        {children}
      </span>
      {mounted && isPending &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-sm"
            role="status"
            aria-label="Déconnexion en cours"
          >
            <div className="flex flex-col items-center gap-4">
              <FadeLoader color={appConfig.primaryColor} height={11} width={3} radius={1} margin={2} />
              <p className="text-sm font-medium text-muted-foreground">Déconnexion en cours…</p>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
