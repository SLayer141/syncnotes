"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { sendOTP } from "@/app/actions/auth";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<"password" | "otp">("password");
  const [otpSent, setOtpSent] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);
    setPreviewUrl(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;

    try {
      if (authMethod === "otp") {
        if (!otpSent) {
          // Send OTP
          const result = await sendOTP(email);

          if ('error' in result) {
            throw new Error(result.error + (result.details ? `\n${result.details}` : ''));
          }

          setOtpSent(true);
          if (result.message) {
            setMessage(result.message);
          }
          if (result.previewUrl) {
            setPreviewUrl(result.previewUrl);
          }
          setIsLoading(false);
          return;
        }

        // Verify OTP
        const response = await signIn("credentials", {
          email,
          otp: formData.get("otp"),
          redirect: false,
        });

        if (response?.error) {
          throw new Error(response.error);
        }
      } else {
        // Password login
        const response = await signIn("credentials", {
          email,
          password: formData.get("password"),
          redirect: false,
        });

        if (response?.error) {
          throw new Error(response.error);
        }
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "An unexpected error occurred");
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-gray-800 rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={onSubmit}>
          {error && (
            <div className="bg-red-900/50 text-red-200 p-3 rounded text-sm">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-blue-900/50 text-blue-200 p-3 rounded text-sm">
              {message}
              {previewUrl && (
                <div className="mt-2">
                  <a 
                    href={previewUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Click here to view the test email
                  </a>
                </div>
              )}
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
                className="appearance-none rounded-t-md relative block w-full px-3 py-2 border border-gray-700 bg-gray-700 placeholder-gray-400 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            {authMethod === "password" ? (
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-b-md relative block w-full px-3 py-2 border border-gray-700 bg-gray-700 placeholder-gray-400 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                />
              </div>
            ) : (
              otpSent && (
                <div>
                  <label htmlFor="otp" className="sr-only">
                    OTP
                  </label>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    className="appearance-none rounded-b-md relative block w-full px-3 py-2 border border-gray-700 bg-gray-700 placeholder-gray-400 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Enter OTP"
                  />
                </div>
              )
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => {
                  setAuthMethod("password");
                  setOtpSent(false);
                  setError(null);
                  setMessage(null);
                  setPreviewUrl(null);
                }}
                className={`text-sm ${
                  authMethod === "password"
                    ? "text-indigo-400 font-medium"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMethod("otp");
                  setOtpSent(false);
                  setError(null);
                  setMessage(null);
                  setPreviewUrl(null);
                }}
                className={`text-sm ${
                  authMethod === "otp"
                    ? "text-indigo-400 font-medium"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                OTP
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading
                ? "Processing..."
                : authMethod === "otp" && !otpSent
                ? "Send OTP"
                : "Sign in"}
            </button>
          </div>
        </form>

        <div className="text-center space-y-2">
          <Link
            href="/register"
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            Don't have an account? Sign up
          </Link>
        </div>
      </div>
    </div>
  );
} 