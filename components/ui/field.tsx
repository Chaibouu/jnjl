"use client";

import * as React from "react";
import { Field as FieldPrimitive } from "@base-ui/react/field";
import { cn } from "cn";

// Wrapper léger autour de Base UI Field — https://base-ui.com/react/components/field
// Field.Control est volontairement omis : Base UI précise que tout composant Input
// (https://base-ui.com/react/components/input) fonctionne directement avec Field.Root,
// donc nos <Input>/<Textarea> déjà stylés s'y branchent sans duplication.

function FieldRoot({ className, ...props }: FieldPrimitive.Root.Props) {
  return (
    <FieldPrimitive.Root
      data-slot="field"
      className={cn("space-y-2", className)}
      {...props}
    />
  );
}

function FieldLabel({ className, ...props }: FieldPrimitive.Label.Props) {
  return (
    <FieldPrimitive.Label
      data-slot="field-label"
      className={cn("block text-sm font-medium", className)}
      {...props}
    />
  );
}

function FieldDescription({
  className,
  ...props
}: FieldPrimitive.Description.Props) {
  return (
    <FieldPrimitive.Description
      data-slot="field-description"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function FieldError({ className, ...props }: FieldPrimitive.Error.Props) {
  return (
    <FieldPrimitive.Error
      data-slot="field-error"
      className={cn("text-xs font-medium text-destructive", className)}
      {...props}
    />
  );
}

export { FieldRoot as Field, FieldLabel, FieldDescription, FieldError };
