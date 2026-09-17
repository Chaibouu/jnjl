"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { UserButton } from "@/components/auth/user-button";

export const Navbar = () => {
  const pathname = usePathname();

  return (
    <nav className="bg-secondary flex justify-between items-center p-4 rounded-xl w-[600px] shadow-sm">
      <div className="flex gap-x-2">
        <Button
          variant={pathname === "/server" ? "default" : "outline"}
          nativeButton={false}
          render={<Link href="/server" />}
        >
          Server
        </Button>
        <Button
          variant={pathname === "/client" ? "default" : "outline"}
          nativeButton={false}
          render={<Link href="/client" />}
        >
          Client
        </Button>
        <Button
          variant={pathname === "/admin" ? "default" : "outline"}
          nativeButton={false}
          render={<Link href="/admin" />}
        >
          Admin
        </Button>
        <Button
          variant={pathname === "/settings" ? "default" : "outline"}
          nativeButton={false}
          render={<Link href="/settings" />}
        >
          Settings
        </Button>
      </div>
      <UserButton />
    </nav>
  );
};
