"use client";

import * as z from "zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import Image from "next/image";
import { User, Mail, Lock, ChevronRight, Sparkles, Users, ShieldCheck } from "lucide-react";

import { SignupSchema } from "@/schemas";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/form-error";
import { FormSuccess } from "@/components/form-success";
import { Social } from "@/components/auth/social";
import { signup } from "@/actions/signup";
import appConfig from "@/settings";
import charter from "@/settings/charter";

const highlights = [
  { icon: Sparkles, text: "Déposez votre candidature Jeune Leader ou Ambassadeur" },
  { icon: Users, text: "Suivez vos candidatures et participations en temps réel" },
  { icon: ShieldCheck, text: "Un compte unique pour toute votre évolution dans la JNJL" },
];

export const RegisterForm = () => {
  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof SignupSchema>>({
    resolver: zodResolver(SignupSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
  });

  const onSubmit = (values: z.infer<typeof SignupSchema>) => {
    setError("");
    setSuccess("");

    startTransition(() => {
      signup(values)
        .then((data) => {
          setError(data.error);
          setSuccess(data.success);
        });
    });
  };

  return (
    <div
      className="flex w-full max-w-4xl overflow-hidden shadow-2xl"
      style={{ backgroundColor: charter.surface }}
    >
      {/* ── Panneau de marque (masqué en dessous de lg) ── */}
      <div
        className="relative hidden w-1/2 shrink-0 flex-col justify-between overflow-hidden p-10 text-white lg:flex"
        style={{
          background: `linear-gradient(160deg, ${charter.ink} 0%, color-mix(in srgb, ${charter.ink} 78%, #000 22%) 45%, color-mix(in srgb, ${charter.ink} 55%, ${charter.orange} 45%) 100%)`,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 12%, color-mix(in srgb, #fff 25%, transparent) 0%, transparent 40%), radial-gradient(circle at 85% 90%, color-mix(in srgb, ${charter.gold} 55%, transparent) 0%, transparent 45%)`,
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white/95 shadow-lg">
              <Image
                src={appConfig.logoUrl}
                alt={appConfig.appName}
                width={44}
                height={44}
                className="h-full w-full object-contain"
              />
            </div>
            <span className="text-sm font-semibold uppercase tracking-widest text-white/80">
              {appConfig.appName}
            </span>
          </div>
          <h2 className="mt-10 text-3xl font-bold leading-tight">
            Rejoignez la communauté JNJL
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/80">
            {appConfig.websiteDescription}
          </p>
        </div>

        <ul className="relative z-10 mt-10 space-y-4">
          {highlights.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3 text-sm text-white/90">
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="leading-snug">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Formulaire ── */}
      <div className="flex w-full flex-col justify-center px-6 py-10 sm:px-10 lg:w-1/2">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Image
              src={appConfig.logoUrl}
              alt={appConfig.appName}
              width={40}
              height={40}
              className="h-10 w-10 rounded-lg object-contain"
            />
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: charter.ink }}>
              {appConfig.appName}
            </span>
          </div>

          <h1 className="text-2xl font-bold" style={{ color: charter.ink }}>
            Créer un compte
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: charter.inkFaint }}>
            Rejoignez la plateforme en quelques secondes.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                            style={{ color: charter.inkFaint }}
                          />
                          <Input
                            {...field}
                            disabled={isPending}
                            placeholder="John Doe"
                            className="pl-9"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                            style={{ color: charter.inkFaint }}
                          />
                          <Input
                            {...field}
                            disabled={isPending}
                            placeholder="john.doe@example.com"
                            type="email"
                            className="pl-9"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                            style={{ color: charter.inkFaint }}
                          />
                          <Input
                            {...field}
                            disabled={isPending}
                            placeholder="••••••••"
                            type="password"
                            className="pl-9"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormError message={error} />
              <FormSuccess message={success} />
              <Button
                loading={isPending}
                type="submit"
                className="h-11 w-full gap-1.5 text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: charter.orange }}
              >
                {isPending ? "Création..." : "Créer un compte"}
                {!isPending && <ChevronRight className="h-4 w-4" />}
              </Button>
            </form>
          </Form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1" style={{ backgroundColor: charter.border }} />
            <span className="text-xs uppercase tracking-wide" style={{ color: charter.inkFaint }}>
              Ou continuer avec
            </span>
            <div className="h-px flex-1" style={{ backgroundColor: charter.border }} />
          </div>
          <Social />

          <p className="mt-8 text-center text-sm" style={{ color: charter.inkFaint }}>
            Déjà un compte ?{" "}
            <Link href="/auth/login" className="font-semibold hover:underline" style={{ color: charter.orange }}>
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
