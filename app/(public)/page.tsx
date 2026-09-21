import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  GraduationCap,
  MapPin,
  Sparkles,
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
import { WaveDivider } from "@/components/site/WaveDivider";
import { AboutSection } from "@/components/site/AboutSection";
import { Reveal } from "@/components/site/Reveal";
import { HeroScene } from "@/components/site/HeroScene";
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

  const heroStats = [
    { label: "Édition", value: edition ? String(edition.year) : "—" },
    { label: "Intervenants", value: `${speakers.length}+` },
    { label: "Partenaires", value: `${partners.length}+` },
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

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20" style={{ backgroundColor: charter.bg }}>
        <div
          className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl"
          style={{ backgroundColor: `${charter.orange}1f` }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-16 top-1/3 h-72 w-72 rounded-full blur-3xl"
          style={{ backgroundColor: `${charter.gold}26` }}
          aria-hidden="true"
        />
        <Particles
          className="absolute inset-0"
          quantity={70}
          color={charter.orange}
          size={0.5}
          ease={60}
        />

        <div className="relative mx-auto grid max-w-6xl gap-14 md:grid-cols-2 md:items-center">
          {/* Text */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-semibold shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: charter.orange }} />
              <AnimatedGradientText colorFrom={charter.orange} colorTo={charter.gold}>
                Journée Nationale du Jeune Leader
              </AnimatedGradientText>
            </span>

            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl" style={{ color: charter.ink }}>
              {edition ? edition.name : appConfig.appName}
            </h1>

            {edition?.theme && (
              <p className="mt-3 text-lg font-medium" style={{ color: charter.orangeDark }}>
                {edition.theme}
              </p>
            )}

            <p className="mt-4 max-w-lg text-base leading-relaxed" style={{ color: charter.inkSoft }}>
              {appConfig.websiteDescription}
            </p>

            {edition && (edition.location || edition.startDate) && (
              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm font-medium" style={{ color: charter.inkSoft }}>
                {edition.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" style={{ color: charter.orange }} />
                    {edition.location}
                  </span>
                )}
                {edition.startDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" style={{ color: charter.orange }} />
                    {formatRange(edition.startDate, edition.endDate)}
                  </span>
                )}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                nativeButton={false}
                className="h-12 gap-2 rounded-none px-8 text-base font-semibold text-white shadow-lg transition-opacity duration-200 hover:opacity-90"
                style={{ backgroundColor: charter.orange }}
                render={<Link href="/ambassadeurs/candidature" />}
              >
                Devenir Ambassadeur
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                className="h-12 rounded-none border-2 px-8 text-base font-semibold"
                render={<Link href="/programme" />}
              >
                Voir le programme
              </Button>
            </div>

            {/* Inline stats */}
            <div className="mt-10 flex flex-wrap gap-8 border-t pt-6" style={{ borderColor: charter.border }}>
              {heroStats.map(stat => (
                <div key={stat.label}>
                  <p className="text-2xl font-bold" style={{ color: charter.ink }}>
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: charter.inkFaint }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Visual */}
          <div className="relative isolate hidden md:block">
            <HeroScene className="pointer-events-none absolute -inset-16 -z-10" />
            <div
              className="rounded-3xl p-8 shadow-xl"
              style={{ background: `linear-gradient(135deg, ${charter.ink}, #000)` }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white p-2">
                  <Image src={appConfig.logoUrl} height={40} width={40} alt={appConfig.appName} className="h-full w-full object-contain" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{appConfig.appName}</p>
                  <p className="text-xs text-white/50">Plateforme nationale</p>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                {[
                  { icon: Sparkles, label: "Thème", value: edition?.theme || "À venir" },
                  { icon: MapPin, label: "Lieu", value: edition?.location || "À venir" },
                  { icon: Calendar, label: "Dates", value: edition ? formatRange(edition.startDate, edition.endDate) : "À venir" },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
                    <row.icon className="h-4 w-4 shrink-0" style={{ color: charter.gold }} />
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide text-white/50">{row.label}</p>
                      <p className="truncate text-sm font-medium text-white">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-6 -left-6 flex items-center gap-3 rounded-2xl border bg-white px-5 py-4 shadow-lg" style={{ borderColor: charter.border }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${charter.orange}15` }}>
                <CheckCircle2 className="h-5 w-5" style={{ color: charter.orange }} />
              </div>
              <div>
                <p className="text-sm font-bold leading-none" style={{ color: charter.ink }}>
                  Édition active
                </p>
                <p className="mt-1 text-xs" style={{ color: charter.inkFaint }}>
                  Candidatures ouvertes
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <WaveDivider className="-mt-1 h-10 bg-white" />

      <AboutSection />

      {/* Stats band */}
      {edition && edition.stats.length > 0 && (
        <section className="px-4 py-14 sm:px-6" style={{ background: `linear-gradient(120deg, ${charter.ink}, #05070a)` }}>
          <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {edition.stats.map(stat => (
              <div key={stat.id} className="text-center">
                <p className="text-4xl font-bold tabular-nums" style={{ color: charter.gold }}>
                  {stat.value.toLocaleString("fr-FR")}
                </p>
                <p className="mt-2 text-sm text-white/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Nos parcours */}
      <section className="bg-white px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Participer"
            title="Trois façons de vivre la JNJL"
            description="Quel que soit votre profil, la JNJL vous propose un parcours adapté pour vous engager."
            className="mb-14"
          />

          <Reveal className="grid gap-6 sm:grid-cols-3">
            {TRACKS.map(track => {
              const Icon = track.icon;
              const content = (
                <>
                  <div
                    className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: `${charter.orange}12` }}
                  >
                    <Icon className="h-6 w-6" style={{ color: charter.orange }} />
                  </div>
                  <h3 className="text-lg font-bold" style={{ color: charter.ink }}>
                    {track.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: charter.inkSoft }}>
                    {track.description}
                  </p>
                  <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold">
                    {track.href ? (
                      <span className="flex items-center gap-1.5" style={{ color: charter.orange }}>
                        Postuler <ArrowRight className="h-3.5 w-3.5" />
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
                  className="group rounded-2xl border p-7 transition-shadow duration-200 hover:shadow-lg"
                  style={{ borderColor: charter.border }}
                >
                  {content}
                </Link>
              ) : (
                <div key={track.title} className="rounded-2xl border p-7" style={{ borderColor: charter.border }}>
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

            <Reveal className="mt-10 grid gap-6 sm:grid-cols-3">
              {news.map(item => (
                <Link
                  key={item.id}
                  href={`/actualites/${item.slug}`}
                  className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow duration-200 hover:shadow-lg"
                  style={{ borderColor: charter.border }}
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-muted">
                    {item.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.coverImage}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm font-medium text-muted-foreground">
                        {appConfig.appName}
                      </div>
                    )}
                    {item.category && (
                      <span
                        className="absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow"
                        style={{ backgroundColor: charter.ink }}
                      >
                        {item.category}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold leading-snug" style={{ color: charter.ink }}>
                      {item.title}
                    </h3>
                    {item.excerpt && (
                      <p className="mt-2 line-clamp-2 text-sm" style={{ color: charter.inkFaint }}>
                        {item.excerpt}
                      </p>
                    )}
                    {item.publishedAt && (
                      <p className="mt-3 text-xs" style={{ color: charter.inkFaint }}>
                        {new Date(item.publishedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                      </p>
                    )}
                  </div>
                </Link>
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

            <Reveal className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {speakers.slice(0, 4).map(speaker => (
                <div
                  key={speaker.id}
                  className="overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow duration-200 hover:shadow-lg"
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
        <div
          className="mx-auto max-w-6xl overflow-hidden rounded-3xl px-8 py-14 text-center shadow-xl sm:px-16"
          style={{ background: `linear-gradient(120deg, ${charter.ink}, #05070a)` }}
        >
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Rejoignez la JNJL</h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/70">
            Devenez Ambassadeur de votre région et portez la voix de la jeunesse nigérienne lors de la prochaine édition.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              nativeButton={false}
              className="h-12 gap-2 rounded-none px-8 text-base font-semibold text-white shadow-lg transition-opacity duration-200 hover:opacity-90"
              style={{ backgroundColor: charter.orange }}
              render={<Link href="/ambassadeurs/candidature" />}
            >
              Postuler maintenant
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              className="h-12 rounded-none border-2 border-white/30 bg-transparent px-8 text-base font-semibold text-white hover:bg-white/10 hover:text-white"
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
