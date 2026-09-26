"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { uploadSiteMediaAction, type SiteMediaKind } from "@/actions/site-media-actions";

/**
 * Champ image mixte : coller un lien externe OU téléverser un fichier (JPEG/PNG/GIF/WebP,
 * 4 Mo max) qui part sur le stockage configuré (Cloudflare R2 en production). Les deux
 * options remplissent le même champ URL, sans rien changer au schéma existant.
 */
export function MediaUploadField({
  label,
  kind,
  value,
  onChange,
  placeholder = "https://...",
  className,
}: {
  label: string;
  kind: SiteMediaKind;
  value: string | undefined;
  onChange: (url: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const currentValue = value ?? "";
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("kind", kind);
      formData.set("file", file);
      const result = await uploadSiteMediaAction(formData);
      onChange(result.url);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Téléversement impossible");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Field className={className}>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <Input
          value={currentValue}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-11 flex-1 rounded-none border border-border bg-muted/40 px-3.5 transition-colors focus-visible:border-ring focus-visible:bg-white"
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={event => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          loading={uploading}
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="h-11 shrink-0"
        >
          <Upload className="mr-1.5 h-4 w-4" />
          Téléverser
        </Button>
      </div>
      {currentValue && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentValue}
          alt=""
          className="mt-2 h-16 w-16 rounded-md border object-cover"
          onError={event => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </Field>
  );
}
