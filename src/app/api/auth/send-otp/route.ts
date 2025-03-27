import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOTP, getOTPExpiryDate } from "@/lib/auth-utils";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, type } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    if (type === "otp") {
      const otp = generateOTP();
      const otpExpiry = getOTPExpiryDate();

      await prisma.user.update({
        where: { email },
        data: {
          otp,
          otpExpiry,
        },
      });

      try {
        // Send OTP email
        const result = await resend.emails.send({
          from: "onboarding@resend.dev", // Using Resend's default verified domain
          to: email,
          subject: "Your SyncNotes OTP",
          html: `
            <h1>Your OTP for SyncNotes</h1>
            <p>Your OTP is: <strong>${otp}</strong></p>
            <p>This OTP will expire in 10 minutes.</p>
            <p>If you didn't request this OTP, please ignore this email.</p>
          `,
        });

        console.log("Email sent successfully:", result);
        return NextResponse.json(
          { message: "OTP sent successfully" },
          { status: 200 }
        );
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        return NextResponse.json(
          { message: "Failed to send OTP email" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { message: "Invalid type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in send-otp route:", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
} 