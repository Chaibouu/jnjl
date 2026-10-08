import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  Calendar,
  GraduationCap,
  MapPin,
  Users,
} from "lucide-react";
import { getActiveEditionOverviewAction } from "@/actions/edition-actions";
import { listPublishedNewsAction } from "@/actions/news-actions";
import { listActiveEditionPartnersAction } from "@/actions/partner-actions";
import { listActiveEditionSpeakersAction } from "@/actions/speaker-actions";
import { Button } from "@/components/ui/button";
import { Marquee } from "@/components/ui/marquee";
import { Particles } from "@/components/ui/particles";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { SectionHeader } from "@/components/site/SectionHeader";
import { AboutSection } from "@/components/site/AboutSection";
import { Reveal } from "@/components/site/Reveal";
import { NewsCard } from "@/components/site/NewsCard";
import { CountUp } from "@/components/site/CountUp";
import { ContactForm, ContactInfo } from "@/components/site/ContactForm";
import appConfig from "@/settings";
import charter from "@/settings/charter";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata, eventJsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo";

// Titre par défaut (défini dans le layout racine) ; seul le canonical est précisé ici.
export const metadata = { alternates: buildMetadata({ title: "", path: "/" }).alternates };

const TRACKS = [
  {
    icon: Users,
    title: "Participant",
    description: "Prenez part aux activités, ateliers et rencontres de l'édition en cours.",
    href: "/participer",
  },
  {
    icon: GraduationCap,
    title: "Jeune Leader",
    description: "Intégrez le parcours de formation au leadership et à l'engagement citoyen.",
    href: null,
  },
  {
    icon: Award,
    title: "Ambassadeur",
    description: "Représentez votre région, portez la voix de la jeunesse nigérienne.",
    href: "/ambassadeurs/candidature",
  },
] as const;

export default async function HomePage() {
  const [edition, news, partners, speakers] = await Promise.all([
    getActiveEditionOverviewAction(),
    listPublishedNewsAction(3),
    listActiveEditionPartnersAction(),
    listActiveEditionSpeakersAction(),
  ]);

  // Un compteur à zéro donne une mauvaise impression : on ne l'affiche qu'une fois alimenté.
  const heroStats: { label: string; value: string; count?: number; suffix?: string }[] = [
    { label: "Édition", value: edition ? String(edition.year) : "—" },
    ...(speakers.length > 0
      ? [{ label: "Intervenants", value: `${speakers.length}+`, count: speakers.length, suffix: "+" }]
      : []),
    ...(partners.length > 0
      ? [{ label: "Partenaires", value: `${partners.length}+`, count: partners.length, suffix: "+" }]
      : []),
  ];

  return (
    <div className="overflow-hidden">
      <JsonLd
        data={[
          organizationJsonLd(),
          websiteJsonLd(),
          ...(edition
            ? [
                eventJsonLd({
                  name: edition.name,
                  description: edition.description,
                  theme: edition.theme,
                  location: edition.location,
                  startDate: edition.startDate,
                  endDate: edition.endDate,
                  path: "/",
                }),
              ]
            : []),
        ]}
      />

      {/* Hero : photo de l'événement plein cadre, couleurs de la charte, éléments en mouvement */}
      <section className="relative isolate overflow-hidden text-white">
        <Image
          src="/header.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-[50%_78%]"
        />
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: `linear-gradient(100deg, ${charter.ink}ee 0%, ${charter.ink}b3 42%, ${charter.ink}4d 75%, ${charter.orangeDark}59 100%)`,
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -left-24 -top-24 -z-10 h-96 w-96 rounded-full motion-safe:animate-float-slow"
          style={{ background: `radial-gradient(circle, ${charter.orange}99 0%, transparent 68%)` }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 right-1/4 -z-10 h-80 w-80 rounded-full motion-safe:animate-float-slow [animation-delay:-4s]"
          style={{ background: `radial-gradient(circle, ${charter.green}99 0%, transparent 68%)` }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute right-8 top-10 -z-10 h-56 w-56 rounded-full motion-safe:animate-float-slow [animation-delay:-7s]"
          style={{ background: `radial-gradient(circle, ${charter.gold}99 0%, transparent 68%)` }}
          aria-hidden="true"
        />
        <Particles className="absolute inset-0 -z-10" quantity={55} color={charter.gold} size={0.6} ease={60} />

        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-24 pt-12 sm:px-6 sm:pt-16 md:grid-cols-[1.2fr_0.8fr] md:items-center [@media(min-height:900px)]:pb-32 [@media(min-height:900px)]:pt-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span
                  className="absolute inline-flex h-full w-full rounded-full opacity-75 motion-safe:animate-ping"
                  style={{ backgroundColor: charter.gold }}
                />
                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: charter.gold }} />
              </span>
              <AnimatedGradientText colorFrom={charter.gold} colorTo="#ffffff">
                Journée Nationale du Jeune Leader
              </AnimatedGradientText>
            </span>

            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl [@media(min-height:900px)]:lg:text-7xl">
              {edition ? edition.name : appConfig.appName}
            </h1>

            {edition?.theme && (
              <p className="mt-3 text-lg font-semibold sm:text-xl [@media(min-height:900px)]:sm:text-2xl" style={{ color: charter.gold }}>
                {edition.theme}
              </p>
            )}

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base [@media(min-height:900px)]:sm:text-lg">
              {appConfig.websiteDescription}
            </p>

            {edition && (edition.location || edition.startDate) && (
              <div className="mt-5 flex flex-wrap items-center gap-2.5 text-sm font-medium">
                {edition.location && (
                  <span className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur">
                    <MapPin className="h-4 w-4" style={{ color: charter.gold }} />
                    {edition.location}
                  </span>
                )}
                {edition.startDate && (
                  <span className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur">
                    <Calendar className="h-4 w-4" style={{ color: charter.gold }} />
                    {formatRange(edition.startDate, edition.endDate)}
                  </span>
                )}
              </div>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                nativeButton={false}
                className="group h-12 gap-2 rounded-none px-8 text-base font-semibold text-white shadow-lg shadow-black/30 transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95"
                style={{ backgroundColor: charter.orange }}
                render={<Link href="/ambassadeurs/candidature" />}
              >
                Devenir Ambassadeur
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                className="h-12 rounded-none border-2 border-white/40 bg-white/5 px-8 text-base font-semibold text-white backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-black"
                render={<Link href="/programme" />}
              >
                Voir le programme
              </Button>
            </div>

            {/* Chiffres clés animés */}
            <div className="mt-8 flex flex-wrap gap-x-10 gap-y-3 border-t border-white/20 pt-5">
              {heroStats.map(stat => (
                <div key={stat.label}>
                  <p className="text-2xl font-extrabold sm:text-3xl" style={{ color: charter.gold }}>
                    {stat.count !== undefined ? <CountUp value={stat.count} suffix={stat.suffix} /> : stat.value}
                  </p>
                  <p className="mt-0.5 text-xs uppercase tracking-wide text-white/70">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Visuel : carte flottante */}
          <div className="relative isolate hidden md:flex md:justify-end">
            <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/15 px-5 py-4 shadow-2xl backdrop-blur-md motion-safe:animate-float-card">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1.5">
                <Image
                  src={appConfig.logoUrl}
                  height={40}
                  width={40}
                  alt={appConfig.appName}
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <p className="text-sm font-bold leading-none">{appConfig.appName}</p>
                <p className="mt-1 text-xs text-white/70">Plateforme nationale</p>
              </div>
            </div>
          </div>
        </div>

        {/* Vague de transition vers la section suivante */}
        <svg
          className="pointer-events-none absolute -bottom-px left-0 w-full"
          viewBox="0 0 1440 90"
          preserveAspectRatio="none"
          height="90"
          aria-hidden="true"
        >
          <path d="M0 50C240 90 480 90 720 55C960 20 1200 20 1440 60V90H0Z" fill="#ffffff" />
        </svg>
      </section>

      <AboutSection />

      {/* Stats band */}
      {edition && edition.stats.length > 0 && (
        <section
          className="relative overflow-hidden px-4 py-16 sm:px-6"
          style={{ background: `linear-gradient(120deg, ${charter.green}, #4d7a28)` }}
        >
          <div
            className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 motion-safe:animate-float-slow"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-20 right-10 h-72 w-72 rounded-full opacity-25 motion-safe:animate-float-slow [animation-delay:-5s]"
            style={{ backgroundColor: charter.gold }}
            aria-hidden="true"
          />
          <Reveal stagger={0.12} className="relative mx-auto grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {edition.stats.map(stat => (
              <div key={stat.id} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-6 text-center backdrop-blur-sm">
                <p className="text-4xl font-extrabold text-white sm:text-5xl">
                  <CountUp value={Number(stat.value)} />
                </p>
                <p className="mt-2 text-sm font-medium text-white/85">{stat.label}</p>
              </div>
            ))}
          </Reveal>
        </section>
      )}

      {/* Nos parcours */}
      <section
        className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28"
        style={{ background: `linear-gradient(135deg, ${charter.orange}, ${charter.orangeDark})` }}
      >
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 motion-safe:animate-float-slow"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-28 -left-20 h-96 w-96 rounded-full opacity-20 motion-safe:animate-float-slow [animation-delay:-6s]"
          style={{ backgroundColor: charter.gold }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl">
          <SectionHeader
            tone="light"
            eyebrow="Participer"
            title="Trois façons de vivre la JNJL"
            description="Quel que soit votre profil, la JNJL vous propose un parcours adapté pour vous engager."
            className="mb-14"
          />

          <Reveal stagger={0.15} className="grid gap-6 sm:grid-cols-3">
            {TRACKS.map((track, index) => {
              const Icon = track.icon;
              const color = [charter.orange, charter.green, charter.ink][index];
              const content = (
                <>
                  <div
                    className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110"
                    style={{ backgroundColor: color }}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold" style={{ color: charter.ink }}>
                    {track.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: charter.inkSoft }}>
                    {track.description}
                  </p>
                  <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold">
                    {track.href ? (
                      <span className="flex items-center gap-1.5" style={{ color: charter.orangeDark }}>
                        Postuler <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1.5" />
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        Bientôt disponible
                      </span>
                    )}
                  </div>
                </>
              );

              return track.href ? (
                <Link
                  key={track.title}
                  href={track.href}
                  className="group rounded-2xl bg-white p-7 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
                >
                  {content}
                </Link>
              ) : (
                <div key={track.title} className="group rounded-2xl bg-white/95 p-7 shadow-lg">
                  {content}
                </div>
              );
            })}
          </Reveal>
        </div>
      </section>

      {/* Actualités */}
      {news.length > 0 && (
        <section className="px-4 py-20 sm:px-6 sm:py-28" style={{ backgroundColor: charter.bg }}>
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeader eyebrow="Actualités" title="Ce qui se passe à la JNJL" align="left" />
              <Link href="/actualites" className="text-sm font-semibold hover:underline" style={{ color: charter.orange }}>
                Toutes les actualités →
              </Link>
            </div>

            <Reveal stagger={0.12} className="mt-10 grid gap-6 sm:grid-cols-3">
              {news.map((item, index) => (
                <NewsCard key={item.id} item={item} index={index} />
              ))}
            </Reveal>
          </div>
        </section>
      )}

      {/* Intervenants */}
      {speakers.length > 0 && (
        <section className="bg-white px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeader eyebrow="Intervenants" title="Ils interviennent à la JNJL" align="left" />
              <Link href="/intervenants" className="text-sm font-semibold hover:underline" style={{ color: charter.orange }}>
                Tous les intervenants →
              </Link>
            </div>

            <Reveal stagger={0.1} className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {speakers.slice(0, 4).map(speaker => (
                <div
                  key={speaker.id}
                  className="overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                  style={{ borderColor: charter.border }}
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-muted">
                    {speaker.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={speaker.photo}
                        alt={`${speaker.firstName} ${speaker.lastName}`}
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center text-3xl font-bold"
                        style={{ backgroundColor: `${charter.orange}12`, color: charter.orange }}
                      >
                        {`${speaker.firstName[0] ?? ""}${speaker.lastName[0] ?? ""}`.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="p-5 text-center">
                    <p className="font-semibold" style={{ color: charter.ink }}>
                      {speaker.firstName} {speaker.lastName}
                    </p>
                    {speaker.role && (
                      <p className="mt-0.5 text-sm" style={{ color: charter.inkFaint }}>
                        {speaker.role}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </Reveal>
          </div>
        </section>
      )}

      {/* Partenaires */}
      {partners.length > 0 && (
        <section className="px-4 py-20 sm:px-6 sm:py-24" style={{ backgroundColor: charter.bg }}>
          <div className="mx-auto max-w-6xl">
            <SectionHeader eyebrow="Partenaires" title="Ils soutiennent la JNJL" className="mb-12" />
            <Marquee pauseOnHover className="[--duration:30s]">
              {partners.map(partner => (
                <div
                  key={partner.id}
                  className="mx-3 flex h-24 w-40 items-center justify-center rounded-xl border bg-white p-4 shadow-sm"
                  style={{ borderColor: charter.border }}
                >
                  {partner.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={partner.logoUrl} alt={partner.name} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-center text-sm font-medium" style={{ color: charter.inkSoft }}>
                      {partner.name}
                    </span>
                  )}
                </div>
              ))}
            </Marquee>
          </div>
        </section>
      )}

      {/* CTA band */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-3xl px-8 py-16 text-center shadow-2xl sm:px-16">
          <Image
            src="/entetes/galerie-3.jpg"
            alt=""
            fill
            sizes="(min-width: 1152px) 1152px, 100vw"
            className="-z-20 object-cover"
          />
          <div
            className="absolute inset-0 -z-10"
            style={{ background: `linear-gradient(120deg, ${charter.ink}ee, ${charter.orangeDark}cc)` }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -right-10 -top-10 -z-10 h-56 w-56 rounded-full motion-safe:animate-float-slow"
            style={{ background: `radial-gradient(circle, ${charter.gold}99 0%, transparent 68%)` }}
            aria-hidden="true"
          />
          <h2 className="text-3xl font-extrabold text-white sm:text-5xl">Rejoignez la JNJL</h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
            Devenez Ambassadeur de votre région et portez la voix de la jeunesse nigérienne lors de la prochaine édition.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              nativeButton={false}
              className="group h-12 gap-2 rounded-none px-8 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95"
              style={{ backgroundColor: charter.orange }}
              render={<Link href="/ambassadeurs/candidature" />}
            >
              Postuler maintenant
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              className="h-12 rounded-none border-2 border-white/40 bg-transparent px-8 text-base font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-black"
              render={<Link href="/programme" />}
            >
              Voir le programme
            </Button>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="px-4 py-20 sm:px-6 sm:py-28" style={{ backgroundColor: charter.bg }}>
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Contact"
            title="Une question ? Écrivez-nous"
            description="Notre équipe vous répond dans les meilleurs délais."
            className="mb-12"
          />
          <Reveal className="grid gap-10 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <ContactInfo />
            </div>
            <div className="lg:col-span-3">
              <ContactForm />
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

function formatRange(start: Date | null, end: Date | null) {
  if (!start) return "À venir";
  const fmt = (value: Date) =>
    new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  return end ? `${fmt(start)} → ${fmt(end)}` : fmt(start);
}
