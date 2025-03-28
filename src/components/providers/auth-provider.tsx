"use client";

import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/auth/verify');

  return (
    <SessionProvider>
      {!isAuthPage && <Navbar />}
      {children}
    </SessionProvider>
  );
} 