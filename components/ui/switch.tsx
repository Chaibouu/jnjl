"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "cn"

// Le projet est en Tailwind 3 : les variantes `data-checked:` (Tailwind 4) n'existent pas,
// d'où l'interrupteur invisible. On utilise la syntaxe `data-[checked]:` compatible.
function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-gray-300 p-0.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#F07321]/50 data-[checked]:bg-[#F07321] data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 dark:bg-gray-600",
        size === "sm" ? "h-4 w-7" : "h-6 w-11",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow transition-transform data-[unchecked]:translate-x-0",
          size === "sm" ? "h-3 w-3 data-[checked]:translate-x-3" : "h-5 w-5 data-[checked]:translate-x-5"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
