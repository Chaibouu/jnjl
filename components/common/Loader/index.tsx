"use client";

import { FadeLoader } from "react-spinners";
import appConfig from "@/settings";
import { cn } from "@/lib/utils";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

const Loader = ({ size = "md", className, text }: LoaderProps) => {
  return (
    <div
      className={cn(
        "flex h-screen items-center justify-center bg-background",
        className
      )}
      role="status"
      aria-label={text || "Chargement"}
    >
      <div className="flex flex-col items-center space-y-4">
        <FadeLoader
          color={appConfig.primaryColor}
          height={size === "sm" ? 8 : size === "lg" ? 15 : 11}
          width={size === "sm" ? 2 : 3}
          radius={1}
          margin={2}
        />
        {text && (
          <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
        )}
      </div>
    </div>
  );
};

export { Loader };
