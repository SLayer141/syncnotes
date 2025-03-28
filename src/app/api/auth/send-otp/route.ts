import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY environment variable");
}

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

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    try {
      // Send OTP via Resend with simplified configuration
      await resend.emails.send({
        from: "onboarding@resend.dev",
        to: email,
        subject: "Your SyncNotes Login OTP",
        text: `Your OTP is: ${otp}. This OTP will expire in 10 minutes.`,
      });

      // Only update the user's OTP after successful email sending
      await prisma.user.update({
        where: { id: user.id },
        data: {
          otp,
          otpExpiry,
        },
      });

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
  } catch (error) {
    console.error("Error in OTP route:", error);
    return NextResponse.json(
      { message: "Failed to process OTP request" },
      { status: 500 }
    );
  }
} 