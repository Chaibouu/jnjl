"use client"
import { Poppins } from "next/font/google";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LoginButton } from "@/components/auth/login-button";
import appConfig from "@/settings";
import charter from "@/settings/charter";
import Image from "next/image";
import { ChevronRight } from "lucide-react";

const font = Poppins({
  subsets: ["latin"],
  weight: ["600", "700"]
})

export default function Home() {
  return (
    <main
      className="relative flex h-full min-h-screen flex-col items-center justify-center overflow-hidden px-6"
      style={{ backgroundColor: charter.bg }}
    >
      {/* Decorative accents */}
      <div
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl"
        style={{ backgroundColor: `${charter.orange}22` }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-20 -bottom-24 h-80 w-80 rounded-full blur-3xl"
        style={{ backgroundColor: `${charter.gold}30` }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center space-y-6 text-center">
        <div
          className="rounded-3xl bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
        >
          <Image
            src={appConfig.logoUrl}
            height={180}
            width={180}
            alt={appConfig.appName}
            className="h-auto w-36 sm:w-44"
            priority
          />
        </div>

        <div className="space-y-3">
          <h1
            className={cn("text-4xl tracking-tight sm:text-5xl", font.className)}
            style={{ color: charter.ink }}
          >
            {appConfig.appName}
          </h1>
          <div className="mx-auto h-1 w-16 rounded-full" style={{ backgroundColor: charter.orange }} />
          <p className="mx-auto max-w-lg text-base leading-relaxed" style={{ color: charter.inkSoft }}>
            {appConfig.websiteDescription}
          </p>
        </div>

        <div>
          <LoginButton asChild>
            <Button
              size="lg"
              className="h-12 gap-2 rounded-xl px-8 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:opacity-95"
              style={{ backgroundColor: charter.orange }}
            >
              Se connecter
              <ChevronRight className="h-4 w-4" />
            </Button>
          </LoginButton>
        </div>
      </div>
    </main>
  )
}
