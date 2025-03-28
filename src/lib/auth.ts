import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { compare } from "bcryptjs";
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
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          throw new Error("Email is required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("Invalid email or password");
        }

        // Handle password authentication
        if (credentials.password) {
          if (!user.password) {
            throw new Error("Password login is not enabled for this account");
          }
          const isValid = await compare(credentials.password, user.password);
          if (!isValid) {
            throw new Error("Invalid email or password");
          }
          return user;
        }

        // Handle OTP authentication
        if (credentials.otp) {
          if (!user.otp || user.otp !== credentials.otp) {
            throw new Error("Invalid OTP");
          }
          if (user.otpExpiry && user.otpExpiry < new Date()) {
            throw new Error("OTP has expired");
          }
          return user;
        }

        throw new Error("Invalid credentials");
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
}; 