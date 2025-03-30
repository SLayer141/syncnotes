'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createActivityLog } from "./activity-logs";
import { sendEmail } from "@/lib/email";

export async function updateMemberRole(memberId: string, newRole: string) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      throw new Error("Not authenticated");
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Get the member to update
    const memberToUpdate = await prisma.organizationMember.findUnique({
      where: { id: memberId },
      include: {
        organization: {
          include: {
            members: {
              include: {
                user: true,
              },
            },
          },
        },
        user: true,
      },
    });

    if (!memberToUpdate) {
      throw new Error("Member not found");
    }

    // Check if the current user is an admin of the organization
    const currentUserMember = memberToUpdate.organization.members.find(
      (m) => m.userId === user.id
    );

    if (!currentUserMember || currentUserMember.role !== "ADMIN") {
      throw new Error("You don't have permission to update member roles");
    }

    // Don't allow changing your own role
    if (memberToUpdate.userId === user.id) {
      throw new Error("You cannot change your own role");
    }

    const updatedMember = await prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: newRole },
      include: {
        user: true,
      },
    });

    // Log the activity
    await createActivityLog(
      memberToUpdate.organizationId,
      "Updated Member Role",
      `Changed ${memberToUpdate.user.name || memberToUpdate.user.email}'s role to ${newRole}`
    );

    revalidatePath(`/organizations/${memberToUpdate.organizationId}`);
    return { member: updatedMember };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to update member role" };
  }
}

export async function removeMember(memberId: string) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      throw new Error("Not authenticated");
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Get the member to remove
    const memberToRemove = await prisma.organizationMember.findUnique({
      where: { id: memberId },
      include: {
        organization: {
          include: {
            members: {
              include: {
                user: true,
              },
            },
          },
        },
        user: true,
      },
    });

    if (!memberToRemove) {
      throw new Error("Member not found");
    }

    // Check if the current user is an admin of the organization
    const currentUserMember = memberToRemove.organization.members.find(
      (m) => m.userId === user.id
    );

    if (!currentUserMember || currentUserMember.role !== "ADMIN") {
      throw new Error("You don't have permission to remove members");
    }

    // Don't allow removing yourself
    if (memberToRemove.userId === user.id) {
      throw new Error("You cannot remove yourself");
    }

    await prisma.organizationMember.delete({
      where: { id: memberId },
    });

    // Log the activity
    await createActivityLog(
      memberToRemove.organizationId,
      "Removed Member",
      `Removed ${memberToRemove.user.name || memberToRemove.user.email} from the organization`
    );

    revalidatePath(`/organizations/${memberToRemove.organizationId}`);
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to remove member" };
  }
}

export async function inviteMember(organizationId: string, email: string, role: string = "MEMBER") {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      throw new Error("Not authenticated");
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Check if the current user is an admin of the organization
    const currentUserMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
    });

    if (!currentUserMember || currentUserMember.role !== "ADMIN") {
      throw new Error("You don't have permission to invite members");
    }

    // Find or create the invited user
    let invitedUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!invitedUser) {
      // Create a placeholder user for the invited email
      invitedUser = await prisma.user.create({
        data: {
          email,
          name: email.split('@')[0], // Use part before @ as temporary name
        },
      });
    }

    // Check if user is already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: invitedUser.id,
        },
      },
    });

    if (existingMember) {
      throw new Error("User is already a member of this organization");
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        organizationId,
        invitedUserId: invitedUser.id,
        status: "PENDING",
      },
    });

    if (existingInvitation) {
      throw new Error("User already has a pending invitation");
    }

    // Get organization details for the email
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new Error("Organization not found");
    }

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        organizationId,
        invitedById: user.id,
        invitedUserId: invitedUser.id,
        status: "PENDING",
        role: role,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      include: {
        invitedUser: true,
        invitedBy: true,
        organization: true,
      },
    });

    // Send invitation email
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invitations/${invitation.id}`;
    
    await sendEmail({
      to: email,
      subject: `Invitation to join ${organization.name}`,
      text: `You have been invited to join ${organization.name} as a ${role.toLowerCase()} by ${user.name || user.email}. ${
        !invitedUser.password ? "You'll need to create an account when you accept the invitation. " : ""
      }Click the following link to ${!invitedUser.password ? "sign up and " : ""}accept the invitation: ${inviteUrl}`,
      html: `
        <h2>Organization Invitation</h2>
        <p>You have been invited to join <strong>${organization.name}</strong> as a <strong>${role.toLowerCase()}</strong> by ${user.name || user.email}.</p>
        ${!invitedUser.password ? "<p>You'll need to create an account when you accept the invitation.</p>" : ""}
        <p>Click the following link to ${!invitedUser.password ? "sign up and " : ""}accept the invitation:</p>
        <p><a href="${inviteUrl}">${inviteUrl}</a></p>
      `,
    });

    // Log the activity
    await createActivityLog(
      organizationId,
      "Sent Invitation",
      `Invited ${invitedUser.name || invitedUser.email} to join the organization as ${role.toLowerCase()}`
    );

    revalidatePath(`/organizations/${organizationId}`);
    return { invitation };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to send invitation" };
  }
}

export async function acceptInvitation(invitationId: string) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      throw new Error("Not authenticated");
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Get and validate invitation
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        organization: true,
      },
    });

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.invitedUserId !== user.id) {
      throw new Error("This invitation is not for you");
    }

    if (invitation.status !== "PENDING") {
      throw new Error("This invitation has already been processed");
    }

    if (invitation.expiresAt < new Date()) {
      throw new Error("This invitation has expired");
    }

    // Check if user is already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      throw new Error("You are already a member of this organization");
    }

    // Create member and update invitation status in a transaction
    const result = await prisma.$transaction([
      prisma.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId: user.id,
          role: invitation.role,
        },
      }),
      prisma.invitation.update({
        where: { id: invitationId },
        data: { status: "ACCEPTED" },
      }),
    ]);

    // Log the activity
    await createActivityLog(
      invitation.organizationId,
      "Joined Organization",
      `${user.name || user.email} joined the organization as ${invitation.role.toLowerCase()}`
    );

    revalidatePath(`/organizations/${invitation.organizationId}`);
    return { member: result[0] };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to accept invitation" };
  }
} 