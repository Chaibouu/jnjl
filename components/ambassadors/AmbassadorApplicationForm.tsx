"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useForm, type Control, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  HeartPulse,
  Loader2,
  MapPinned,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  ambassadorApplicationSchema,
  type AmbassadorApplicationInput,
} from "@/schemas/ambassador-application";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import charter from "@/settings/charter";

type Option = { id: string; name: string; year?: number; code?: string };
type ActiveEdition = { id: string; name: string; year: number } | null;
type FormPath = FieldPath<AmbassadorApplicationInput>;
type TextFieldPath = Exclude<FormPath, "hasDisability" | "consent">;
const inputClass =
  "h-11 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white";

type Step = {
  title: string;
  shortTitle: string;
  description: string;
  icon: React.ReactNode;
  fields: FormPath[];
};

export function AmbassadorApplicationForm({
  activeEdition,
  regions,
}: {
  activeEdition: ActiveEdition;
  regions: Option[];
}) {
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const form = useForm<AmbassadorApplicationInput>({
    resolver: zodResolver(ambassadorApplicationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      gender: undefined,
      birthDate: "",
      birthPlace: "",
      educationLevel: "",
      hasDisability: false,
      disabilityDetails: "",
      regionId: "",
      consent: false,
    },
    mode: "onTouched",
  });
  const hasDisability = form.watch("hasDisability");
  const steps = useMemo<Step[]>(
    () => [
      {
        title: "Votre point de départ",
        shortTitle: "Région",
        description: "Choisissez la région qui portera votre candidature.",
        icon: <MapPinned className="h-4 w-4" />,
        fields: ["regionId"],
      },
      {
        title: "Votre identité",
        shortTitle: "Identité",
        description:
          "Renseignez vos informations personnelles et vos coordonnées.",
        icon: <UserRound className="h-4 w-4" />,
        fields: [
          "firstName",
          "lastName",
          "phone",
          "gender",
          "birthDate",
          "birthPlace",
          "educationLevel",
          "email",
        ],
      },
      {
        title: "Votre situation",
        shortTitle: "Finalisation",
        description:
          "Indiquez votre situation et confirmez votre consentement.",
        icon: <HeartPulse className="h-4 w-4" />,
        fields: ["hasDisability", "disabilityDetails", "consent"],
      },
    ],
    []
  );

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const next = async () => {
    if (!(await form.trigger(steps[step].fields, { shouldFocus: true })))
      return;
    setStep(current => Math.min(current + 1, steps.length - 1));
  };
  const previous = () => setStep(current => Math.max(current - 1, 0));
  const submit = (values: AmbassadorApplicationInput) => {
    setResult(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/applications/ambassador", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const data = await response.json();
        if (!response.ok) {
          if (data.errors)
            Object.entries(data.errors).forEach(([key, messages]) =>
              form.setError(key as FormPath, {
                message: Array.isArray(messages)
                  ? String(messages[0])
                  : String(messages),
              })
            );
          setResult({
            type: "error",
            message: data.error ?? "Une erreur est survenue",
          });
          return;
        }
        form.reset();
        setStep(0);
        setResult({
          type: "success",
          message:
            "Votre candidature a été enregistrée. Elle sera étudiée par notre équipe.",
        });
      } catch {
        setResult({
          type: "error",
          message: "Erreur réseau. Veuillez réessayer.",
        });
      }
    });
  };

  if (!activeEdition || !regions.length) return <EmptyState />;
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <Form {...form}>
      <div ref={topRef} className="space-y-5">
        <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>
              Étape <strong style={{ color: charter.orange }}>{step + 1}</strong> sur{" "}
              {steps.length}
            </span>
            <span style={{ color: charter.orange }}>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: charter.orange }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35 }}
            />
          </div>
          <div className="mt-5 flex items-start justify-between gap-2">
            {steps.map((item, index) => (
              <div
                key={item.shortTitle}
                className="flex min-w-0 flex-1 items-center gap-2"
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
                    index <= step ? "text-white" : "bg-muted text-muted-foreground"
                  )}
                  style={index <= step ? { backgroundColor: charter.orange } : undefined}
                >
                  {index < step ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span
                  className={cn(
                    "hidden truncate text-xs font-semibold sm:block",
                    index !== step && "text-muted-foreground"
                  )}
                  style={index === step ? { color: charter.orange } : undefined}
                >
                  {item.shortTitle}
                </span>
                {index < steps.length - 1 && (
                  <div
                    className={cn("h-px flex-1", index >= step && "bg-border")}
                    style={index < step ? { backgroundColor: charter.orange } : undefined}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        <div
          className="rounded-xl border p-5 shadow-sm"
          style={{ borderColor: `${charter.orange}33`, backgroundColor: `${charter.orange}0d` }}
        >
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: charter.orange }}>
            Campagne ouverte
          </p>
          <p className="mt-2 text-lg font-bold">
            {activeEdition.name}{" "}
            <span className="font-normal text-muted-foreground">
              ({activeEdition.year})
            </span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Votre candidature sera automatiquement rattachée à cette édition
            active.
          </p>
        </div>
        {result && (
          <div
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4 text-sm",
              result.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            )}
          >
            {result.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}
            <span>{result.message}</span>
          </div>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.2 }}
          >
            <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
              <div className="mb-6 flex items-start gap-3 border-b pb-5">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${charter.orange}1a`, color: charter.orange }}
                >
                  {steps[step].icon}
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: charter.orange }}>
                    {steps[step].shortTitle}
                  </p>
                  <h2 className="mt-1 text-xl font-bold">
                    {steps[step].title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {steps[step].description}
                  </p>
                </div>
              </div>
              {step === 0 && (
                <RegionStep regions={regions} control={form.control} />
              )}
              {step === 1 && <IdentityStep control={form.control} />}
              {step === 2 && (
                <SituationStep
                  control={form.control}
                  hasDisability={hasDisability}
                />
              )}
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={previous}
              disabled={isPending}
              className="rounded-none"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Précédent
            </Button>
          ) : (
            <span className="hidden text-xs text-muted-foreground sm:block">
              Vos données restent confidentielles.
            </span>
          )}
          {step < steps.length - 1 ? (
            <Button
              type="button"
              onClick={next}
              disabled={isPending}
              className="rounded-none text-white transition-opacity hover:opacity-90 sm:min-w-36"
              style={{ backgroundColor: charter.orange }}
            >
              Continuer
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => form.handleSubmit(submit)()}
              disabled={isPending}
              className="rounded-none text-white transition-opacity hover:opacity-90 sm:min-w-52"
              style={{ backgroundColor: charter.orange }}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Envoyer ma candidature
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Form>
  );
}

function RegionStep({
  regions,
  control,
}: {
  regions: Option[];
  control: Control<AmbassadorApplicationInput>;
}) {
  return (
    <div className="space-y-5">
      <FormField
        control={control}
        name="regionId"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-semibold">
              Région de rattachement
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="Choisir votre région">
                    {(value: string) => {
                      const region = regions.find(item => item.id === value);
                      return region
                        ? `${region.name} ${region.code ? `(${region.code})` : ""}`
                        : "Choisir votre région";
                    }}
                  </SelectValue>
                </SelectTrigger>
              </FormControl>
              <SelectContent className="rounded-none">
                {regions.map(region => (
                  <SelectItem key={region.id} value={region.id}>
                    {region.name} {region.code ? `(${region.code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

function IdentityStep({
  control,
}: {
  control: Control<AmbassadorApplicationInput>;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field
        control={control}
        name="firstName"
        label="Prénom"
        placeholder="Votre prénom"
      />
      <Field
        control={control}
        name="lastName"
        label="Nom"
        placeholder="Votre nom"
      />
      <Field
        control={control}
        name="phone"
        label="Téléphone"
        type="tel"
        placeholder="+227 ..."
      />
      <SelectField
        control={control}
        name="gender"
        label="Sexe"
        placeholder="Choisir"
        options={[
          ["MASCULIN", "Masculin"],
          ["FEMININ", "Féminin"],
          ["AUTRE", "Autre"],
        ]}
      />
      <Field
        control={control}
        name="birthDate"
        label="Date de naissance"
        type="date"
      />
      <Field
        control={control}
        name="birthPlace"
        label="Lieu de naissance"
        placeholder="Ville / commune"
      />
      <Field
        control={control}
        name="educationLevel"
        label="Niveau académique"
        placeholder="Ex. Licence"
      />
      <Field
        control={control}
        name="email"
        label="Adresse email"
        type="email"
        placeholder="vous@exemple.com"
      />{" "}
    </div>
  );
}

function SituationStep({
  control,
  hasDisability,
}: {
  control: Control<AmbassadorApplicationInput>;
  hasDisability: boolean;
}) {
  return (
    <div className="space-y-5">
      <FormField
        control={control}
        name="hasDisability"
        render={({ field }) => (
          <FormItem className="flex items-center gap-3 space-y-0 rounded-xl border bg-muted/30 p-4">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={value => field.onChange(value === true)}
              />
            </FormControl>
            <FormLabel className="cursor-pointer text-sm">
              Je suis en situation de handicap
            </FormLabel>
          </FormItem>
        )}
      />
      {hasDisability && (
        <Field
          control={control}
          name="disabilityDetails"
          label="Précisions (optionnel)"
          placeholder="Vous pouvez préciser"
        />
      )}
      <FormField
        control={control}
        name="consent"
        render={({ field }) => (
          <FormItem>
            <div
              className="flex gap-3 rounded-xl border p-5"
              style={{ borderColor: `${charter.orange}33`, backgroundColor: `${charter.orange}0d` }}
            >
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={value => field.onChange(value === true)}
                />
              </FormControl>
              <div>
                <FormLabel className="cursor-pointer text-sm font-medium leading-relaxed">
                  J’accepte que mes informations soient utilisées pour traiter
                  ma candidature ambassadeur.
                </FormLabel>
                <FormMessage />
              </div>
            </div>
          </FormItem>
        )}
      />
      <p className="text-sm text-muted-foreground">
        Un compte utilisateur sera créé uniquement si votre candidature est
        acceptée par l’équipe JNJL.
      </p>
    </div>
  );
}

function SelectField({
  control,
  name,
  label,
  placeholder,
  options,
}: {
  control: Control<AmbassadorApplicationInput>;
  name: "gender";
  label: string;
  placeholder: string;
  options: string[][];
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm font-semibold">{label}</FormLabel>
          <Select onValueChange={field.onChange} value={field.value ?? ""}>
            <FormControl>
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder={placeholder}>
                  {(value: string) =>
                    options.find(([optionValue]) => optionValue === value)?.[1] ?? placeholder
                  }
                </SelectValue>
              </SelectTrigger>
            </FormControl>
            <SelectContent className="rounded-none">
              {options.map(([value, text]) => (
                <SelectItem key={value} value={value}>
                  {text}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
function Field({
  control,
  name,
  label,
  placeholder,
  type = "text",
}: {
  control: Control<AmbassadorApplicationInput>;
  name: TextFieldPath;
  label: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm font-semibold">{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              value={field.value ?? ""}
              type={type}
              placeholder={placeholder}
              className={inputClass}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
function EmptyState() {
  return (
    <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
      <AlertCircle className="mx-auto h-9 w-9 text-muted-foreground" />
      <h2 className="mt-4 text-xl font-bold">
        Candidatures temporairement fermées
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Aucune édition active ou région disponible pour le moment.
      </p>
    </div>
  );
}
