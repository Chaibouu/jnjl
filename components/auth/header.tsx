import { Poppins } from "next/font/google";
import Image from "next/image";

import { cn } from "@/lib/utils";
import appConfig from "@/settings";
import charter from "@/settings/charter";

const font = Poppins({
  subsets: ["latin"],
  weight: ["600"],
});

interface HeaderProps {
  label: string;
};

export const Header = ({
  label,
}: HeaderProps) => {
  return (
    <div className="w-full flex flex-col gap-y-3 items-center justify-center">
      <Image
        src={appConfig.logoUrl}
        alt={appConfig.appName}
        width={56}
        height={56}
        className="h-14 w-14 rounded-xl object-contain"
      />
      <h1 className={cn(
        "text-2xl",
        font.className,
      )} style={{ color: charter.ink }}>
        {appConfig.appName}
      </h1>
      <p className="text-sm" style={{ color: charter.inkFaint }}>
        {label}
      </p>
    </div>
  );
};
