"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"email" | "verification">("email");
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
    otp: "",
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (step === "email") {
        // First step: Send verification code
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: formData.email }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message);
        }

        setStep("verification");
      } else {
        // Second step: Verify OTP and create account
        if (!formData.name.trim()) {
          throw new Error("Name is required");
        }
        if (!formData.password || formData.password.length < 8) {
          throw new Error("Password must be at least 8 characters long");
        }

        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message);
        }

        router.push("/login");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-gray-800 rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={onSubmit}>
          {error && (
            <div className="bg-red-900/50 text-red-200 p-3 rounded text-sm">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                disabled={step === "verification"}
                className="appearance-none rounded-t-md relative block w-full px-3 py-2 border border-gray-700 bg-gray-700 placeholder-gray-400 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm disabled:opacity-50"
                placeholder="Email address"
              />
            </div>
            {step === "verification" && (
              <>
                <div>
                  <label htmlFor="name" className="sr-only">
                    Full name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-700 bg-gray-700 placeholder-gray-400 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-700 bg-gray-700 placeholder-gray-400 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Password (min. 8 characters)"
                  />
                </div>
                <div>
                  <label htmlFor="otp" className="sr-only">
                    Verification Code
                  </label>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    value={formData.otp}
                    onChange={(e) =>
                      setFormData({ ...formData, otp: e.target.value })
                    }
                    className="appearance-none rounded-b-md relative block w-full px-3 py-2 border border-gray-700 bg-gray-700 placeholder-gray-400 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Enter verification code"
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading
                ? "Processing..."
                : step === "email"
                ? "Send verification code"
                : "Create account"}
            </button>
          </div>
        </form>
        <div className="text-center space-y-2">
          <Link
            href="/login"
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
} 