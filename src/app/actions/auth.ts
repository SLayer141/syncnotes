'use server';

import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { generateOTP } from "@/lib/auth-utils";
import { sendEmail } from "@/lib/email";

export async function sendOTP(email: string) {
  try {
    console.log('Starting OTP send process for:', email);
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log('User not found:', email);
      return { error: "User not found" };
    }

    // First, try sending a test email
    try {
      console.log('Sending test email before OTP...');
      await sendEmail({
        to: email,
        subject: "Test Email from SyncNotes",
        html: `
          <h1>Test Email</h1>
          <p>This is a test email to verify that our email system is working correctly.</p>
          <p>If you receive this email, you should receive your OTP shortly.</p>
        `,
      });
      console.log('Test email sent successfully');
    } catch (testError) {
      console.error('Test email failed:', testError);
      return { error: "Failed to send test email. Please check your email configuration." };
    }

    const otp = generateOTP();
    console.log('Generated OTP for user:', { email, otp });
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otp,
        otpExpiry,
      },
    });
    console.log('Updated user with new OTP');

    try {
      await sendEmail({
        to: email,
        subject: "Your OTP for SyncNotes",
        html: `
          <h1>Your SyncNotes OTP</h1>
          <p>Your OTP is: <strong>${otp}</strong></p>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this OTP, please ignore this email.</p>
        `,
      });
      console.log('OTP email sent successfully');
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      return { error: "Failed to send OTP email. Please try again later." };
    }

    return { success: true, message: "OTP sent successfully. Please check your email (including spam folder)." };
  } catch (error) {
    console.error("Error in sendOTP:", error);
    return { error: "Failed to send OTP" };
  }
}

export async function verifyOTP(email: string, otp: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.otp || !user.otpExpiry) {
      throw new Error("No OTP found. Please request a new one.");
    }

    if (user.otp !== otp) {
      throw new Error("Invalid OTP");
    }

    if (user.otpExpiry < new Date()) {
      throw new Error("OTP has expired. Please request a new one.");
    }

    // Clear OTP after successful verification
    await prisma.user.update({
      where: { email },
      data: {
        otp: null,
        otpExpiry: null,
        emailVerified: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to verify OTP" };
  }
}

export async function register(email: string, password: string, name: string) {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await hash(password, 12);

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        emailVerified: new Date(), // Mark email as verified immediately for registration
      },
    });

    // Create a session for the new user
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create session");
    }

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to register" };
  }
}

export async function login(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Send OTP for login
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    await prisma.user.update({
      where: { email },
      data: {
        otp,
        otpExpiry,
      },
    });

    // Send OTP email
    await sendEmail({
      to: email,
      subject: 'Your SyncNotes Login OTP',
      html: `
        <h1>Your SyncNotes Login OTP</h1>
        <p>Your OTP is: <strong>${otp}</strong></p>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this OTP, please ignore this email.</p>
      `,
    });

    return { success: true, requiresOTP: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to login" };
  }
}

export async function verifyLoginOTP(email: string, otp: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.otp || !user.otpExpiry) {
      throw new Error("No OTP found. Please request a new one.");
    }

    if (user.otp !== otp) {
      throw new Error("Invalid OTP");
    }

    if (user.otpExpiry < new Date()) {
      throw new Error("OTP has expired. Please request a new one.");
    }

    // Clear OTP after successful verification
    await prisma.user.update({
      where: { email },
      data: {
        otp: null,
        otpExpiry: null,
      },
    });

    // Create a session for the user
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        otp,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create session");
    }

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to verify OTP" };
  }
}

export async function logout() {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/signout`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error("Failed to logout");
    }

    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to logout" };
  }
} 