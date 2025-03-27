import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { generateOTP, getOTPExpiryDate } from "@/lib/auth-utils";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { name, email, password, otp: submittedOTP } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    // If OTP is provided, verify it and create the account
    if (submittedOTP) {
      if (!existingUser || !existingUser.otp || !existingUser.otpExpiry) {
        return NextResponse.json(
          { message: "Invalid or expired verification code" },
          { status: 400 }
        );
      }

      if (existingUser.otp !== submittedOTP) {
        return NextResponse.json(
          { message: "Invalid verification code" },
          { status: 400 }
        );
      }

      if (new Date() > existingUser.otpExpiry) {
        return NextResponse.json(
          { message: "Verification code has expired" },
          { status: 400 }
        );
      }

      if (!name || !password) {
        return NextResponse.json(
          { message: "Name and password are required" },
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // Create the verified user
      const user = await prisma.user.update({
        where: { email },
        data: {
          name,
          password: hashedPassword,
          emailVerified: new Date(),
          otp: null,
          otpExpiry: null,
        },
      });

      return NextResponse.json(
        { message: "Account created successfully" },
        { status: 201 }
      );
    }

    // If no OTP is provided, this is the initial registration request
    if (existingUser?.emailVerified) {
      return NextResponse.json(
        { message: "Email already registered" },
        { status: 400 }
      );
    }

    // Generate and send OTP
    const newOTP = generateOTP();
    const otpExpiry = getOTPExpiryDate();

    // Create or update unverified user with OTP
    await prisma.user.upsert({
      where: { email },
      update: {
        otp: newOTP,
        otpExpiry,
      },
      create: {
        email,
        otp: newOTP,
        otpExpiry,
      },
    });

    // Send verification email
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Verify your email for SyncNotes",
      html: `
        <h2>Welcome to SyncNotes!</h2>
        <p>Your verification code is: <strong>${newOTP}</strong></p>
        <p>This code will expire in 10 minutes.</p>
      `,
    });

    return NextResponse.json(
      { message: "Verification code sent to your email" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
} 