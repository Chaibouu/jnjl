import {
  DEFAULT_LOGIN_REDIRECT,
  apiAuthPrefix,
  authRoutes,
  publicRoutes,
} from "@/routes";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUser } from "./actions/getUser";
import { applyRateLimit } from "./lib/rateLimit";
import { isRouteProtected } from "./utils/is-route-protected";

// ─── CSP Nonce ────────────────────────────────────────────────────────────────
/**
 * Génère un nonce cryptographiquement aléatoire par requête.
 * Le nonce est transmis :
 *   - En header de requête (x-nonce) → lu par RootLayout pour les balises <Script>
 *   - En header de réponse (Content-Security-Policy) → envoyé au navigateur
 *
 * Cela permet de supprimer 'unsafe-inline' de script-src tout en
 * autorisant les scripts inline de Next.js (qui reçoivent le nonce).
 */
function buildCspWithNonce(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";

  // Origine publique du stockage R2 (vide si non configuré).
  let r2Origin = "";
  try {
    if (process.env.R2_PUBLIC_URL) r2Origin = new URL(process.env.R2_PUBLIC_URL).origin;
  } catch {
    r2Origin = "";
  }

  // En dev, Next.js/Turbopack utilise eval() et des scripts inline pour le HMR.
  // On doit donc autoriser 'unsafe-eval' et 'unsafe-inline' (sans 'strict-dynamic'
  // ni nonce qui casseraient le HMR).
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:"
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;

  const directives = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    // Images saisies par les admins (R2, CDN…) : les images ne peuvent pas exécuter de code.
    "img-src 'self' data: blob: https:",
    // Vidéos intégrées + aperçu des PDF générés (engagement, attestations), sur le site ou sur R2.
    `frame-src 'self' blob: ${r2Origin} https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com`,
    "font-src 'self' data:",
    isDev ? "connect-src 'self' ws: wss: http: https:" : "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  return directives.join("; ");
}

// ─── Middleware principal ─────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;

  try {
    const isApiRoute = nextUrl.pathname.startsWith("/api");
    const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
    // Une entrée publique couvre son chemin exact ainsi que ses sous-routes
    // (ex : "/actualites" autorise aussi "/actualites/mon-article").
    const isPublicRoute = publicRoutes.some(
      route =>
        nextUrl.pathname === route || nextUrl.pathname.startsWith(`${route}/`)
    );
    const isAuthRoute = authRoutes.includes(nextUrl.pathname);

    // ─── Nonce CSP — généré pour chaque requête HTML ───────────────────────
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
    const csp = buildCspWithNonce(nonce);

    // ─── Rate limiting (in-memory) sur les routes d'auth ──────────────────
    if (isApiAuthRoute) {
      const rateLimitResponse = await applyRateLimit(req);
      if (rateLimitResponse) return rateLimitResponse;
      return NextResponse.next();
    }

    // ─── Routes API ────────────────────────────────────────────────────────
    if (isApiRoute) {
      if (!isPublicRoute) {
        const authorizationHeader = req.headers.get("Authorization");
        const accessToken = authorizationHeader?.split(" ")[1];
        if (!accessToken) {
          return NextResponse.json(
            { error: "Token d'accès manquant ou non valide" },
            { status: 401 }
          );
        }
      }
      return NextResponse.next();
    }

    // ─── Routes Frontend ───────────────────────────────────────────────────
    // Transmettre le nonce en header de requête pour que le RootLayout puisse le lire
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-nonce", nonce);

    const result = await getUser();

    // Rafraîchissement du token d'accès si nécessaire
    if (result?.tokenInfo) {
      const response = NextResponse.next({
        request: { headers: requestHeaders },
      });
      response.cookies.set({
        name: "accessToken",
        value: result.tokenInfo.accessToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: result.tokenInfo.expiresAt,
        path: "/",
        sameSite: "lax",
      });
      response.headers.set("Content-Security-Policy", csp);
      response.headers.set("x-nonce", nonce);
      return response;
    }

    const isLoggedIn = !!result?.user && !result.error;
    const userRole = result?.user?.user?.role;
    const userPermissions = result?.user?.user?.permissions;
    const protectedRoute = isRouteProtected(userRole, nextUrl.pathname, userPermissions);

    if (isLoggedIn && protectedRoute) {
      return NextResponse.redirect(new URL("/unauthorized", nextUrl));
    }

    if (isAuthRoute && isLoggedIn) {
      return NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
    }

    if (!isPublicRoute && !isAuthRoute && !isLoggedIn) {
      const callbackUrl = nextUrl.search
        ? `${nextUrl.pathname}${nextUrl.search}`
        : nextUrl.pathname;
      return NextResponse.redirect(
        new URL(
          `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`,
          nextUrl
        )
      );
    }

    // Injecter x-nonce dans la requête transmise à l'app
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set("Content-Security-Policy", csp);
    response.headers.set("x-nonce", nonce);
    return response;
  } catch (error) {
    console.error("Erreur dans le middleware:", error);
    return NextResponse.redirect(new URL("/auth/login", nextUrl));
  }
}

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
