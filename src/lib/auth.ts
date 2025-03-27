import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { isOTPExpired } from "./auth-utils";

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email) {
            throw new Error("Email is required");
          }

          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
          });

          if (!user) {
            throw new Error("No user found with this email");
          }

          // Handle OTP authentication
          if (credentials.otp) {
            console.log("OTP Authentication attempt:", {
              providedOTP: credentials.otp,
              storedOTP: user.otp,
              otpExpiry: user.otpExpiry,
            });

            if (!user.otp || !user.otpExpiry) {
              throw new Error("No OTP requested or OTP expired");
            }

            if (isOTPExpired(user.otpExpiry)) {
              // Clear expired OTP
              await prisma.user.update({
                where: { id: user.id },
                data: { otp: null, otpExpiry: null },
              });
              throw new Error("OTP has expired. Please request a new one.");
            }

            if (user.otp !== credentials.otp) {
              console.log("OTP mismatch:", {
                provided: credentials.otp,
                stored: user.otp,
              });
              throw new Error("Invalid OTP. Please check and try again.");
            }

            // Clear OTP after successful verification
            await prisma.user.update({
              where: { id: user.id },
              data: { otp: null, otpExpiry: null },
            });

            return {
              id: user.id,
              email: user.email,
              name: user.name,
            };
          }

          // Handle password authentication
          if (credentials.password) {
            if (!user.password) {
              throw new Error("This account doesn't have a password set");
            }

            const isPasswordValid = await bcrypt.compare(
              credentials.password,
              user.password
            );

            if (!isPasswordValid) {
              throw new Error("Invalid email or password");
            }

            return {
              id: user.id,
              email: user.email,
              name: user.name,
            };
          }

          throw new Error("Invalid credentials");
        } catch (error) {
          console.error("Authentication error:", error);
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async session({ token, session }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  debug: process.env.NODE_ENV === "development",
}; 