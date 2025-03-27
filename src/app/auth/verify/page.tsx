"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function verifyToken() {
      const token = searchParams.get("token");

      if (!token) {
        setError("Invalid verification link");
        setIsLoading(false);
        return;
      }

      try {
        const response = await signIn("magic-link", {
          token,
          redirect: false,
        });

        if (response?.error) {
          setError("Invalid or expired verification link");
          setIsLoading(false);
          return;
        }

        router.push("/");
      } catch (error) {
        setError("Something went wrong");
        setIsLoading(false);
      }
    }

    verifyToken();
  }, [searchParams, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Verifying your email...</h1>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Verification Failed</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <a
            href="/login"
            className="text-indigo-600 hover:text-indigo-500"
          >
            Return to login
          </a>
        </div>
      </div>
    );
  }

  return null;
} 