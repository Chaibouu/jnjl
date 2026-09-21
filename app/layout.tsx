import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmProvider } from "@/components/ui/confirm-provider";
import { SessionProvider } from "@/context/SessionContext";
import { getUser } from "@/actions/getUser";
import { generateMetadata as generateAppMetadata } from "@/lib/generateMetadata";
import { Suspense } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import NextTopLoader from "nextjs-toploader";
import appConfig from "@/settings";
import { headers } from "next/headers";
import { Loader } from "@/components/common/Loader";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ["latin"] });

// Utiliser la nouvelle API de métadonnées de Next.js 15
export async function generateMetadata() {
  return await generateAppMetadata();
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user = null;
  let isImpersonation = false;

  try {
    const result = await getUser();
    user = result?.user;
    isImpersonation = result?.isImpersonation ?? false;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error);
  }

  // Lire le nonce CSP injecté par le middleware
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") ?? undefined;

  return (
    <html lang="fr" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className={inter.className}>
        <ErrorBoundary>
          <Suspense fallback={<Loader size="md" />}>
            <SessionProvider
              user={user?.user}
              isImpersonation={isImpersonation}
            >
              <NextTopLoader
                color={appConfig.primaryColor}
                showSpinner={false}
                nonce={nonce}
              />
              <ConfirmProvider>{children}</ConfirmProvider>
              <Toaster />
            </SessionProvider>
          </Suspense>
        </ErrorBoundary>
      </body>
    </html>
  );
}
