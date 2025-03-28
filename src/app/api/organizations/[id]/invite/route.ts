import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  console.error("RESEND_API_KEY is missing in environment variables");
  throw new Error("Missing RESEND_API_KEY environment variable");
}

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

type Role = "VIEWER" | "MEMBER" | "ADMIN";

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  VIEWER: "view content",
  MEMBER: "view and edit content",
  ADMIN: "have full administrative control",
};

interface InviteRequestBody {
  email: string;
  role: Role;
  organizationName: string;
  senderName: string;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Check if user is an admin of the organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId: params.id,
        user: {
          email: session.user.email,
        },
        role: "ADMIN",
      },
      include: {
        organization: true,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { message: "You must be an admin to send invites" },
        { status: 403 }
      );
    }

    const { email, role, organizationName, senderName }: InviteRequestBody = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    if (!role || !["VIEWER", "MEMBER", "ADMIN"].includes(role)) {
      return NextResponse.json(
        { message: "Invalid role specified" },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: params.id,
        user: {
          email,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { message: "User is already a member of this organization" },
        { status: 400 }
      );
    }

    // Generate invite token with role
    const token = Buffer.from(JSON.stringify({
      organizationId: params.id,
      email,
      role,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    })).toString('base64');

    // Create invite URL
    const inviteUrl = `${BASE_URL}/register?invite=${token}`;

    try {
      console.log("Attempting to send email with Resend...");
      console.log({
        to: email,
        organizationName,
        senderName,
        inviteUrl,
        BASE_URL
      });
      
      // Send invite email with better formatting and role description
      const emailResponse = await resend.emails.send({
        from: "SyncNotes <onboarding@resend.dev>", // Using Resend's default domain
        to: [email], // Ensure email is in array format
        subject: `Invitation to join ${organizationName} on SyncNotes`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 24px;">
            <div style="background-color: white; border-radius: 8px; padding: 32px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
              <h1 style="color: #4F46E5; margin-top: 0;">Join ${organizationName}</h1>
              <p style="font-size: 16px; color: #374151; margin: 24px 0; line-height: 1.5;">
                ${senderName} has invited you to join <strong>${organizationName}</strong> on SyncNotes as a <strong>${role.toLowerCase()}</strong>. 
                With this role, you'll be able to ${ROLE_DESCRIPTIONS[role]}.
              </p>
              <div style="margin: 32px 0; text-align: center;">
                <a href="${inviteUrl}" style="background-color: #4F46E5; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
                  Accept Invitation
                </a>
              </div>
              <p style="font-size: 14px; color: #6B7280; margin-bottom: 0;">
                This invitation link will expire in 7 days. If you don't have a SyncNotes account, you'll be able to create one when accepting the invitation.
              </p>
            </div>
          </div>
        `,
        reply_to: session.user.email,
      });

      console.log("Email response:", emailResponse);

      if (!emailResponse.id) {
        console.error("No email ID in response:", emailResponse);
        throw new Error("Failed to send email - no email ID returned");
      }

      return NextResponse.json({ 
        message: "Invite sent successfully",
        emailId: emailResponse.id 
      });
    } catch (emailError) {
      console.error("Detailed email error:", {
        error: emailError,
        message: emailError instanceof Error ? emailError.message : "Unknown error",
        stack: emailError instanceof Error ? emailError.stack : undefined,
        name: emailError instanceof Error ? emailError.name : undefined,
      });
      
      // Return more detailed error message
      return NextResponse.json(
        { 
          message: "Failed to send invite email. Please try again.",
          details: emailError instanceof Error ? emailError.message : "Unknown error",
          error: emailError
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error processing invite:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { 
        message: "Failed to process invite",
        details: error instanceof Error ? error.message : "Unknown error",
        error: error
      },
      { status: 500 }
    );
  }
} 