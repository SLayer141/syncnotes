import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: params.id },
      include: {
        organization: true,
        invitedUser: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    if (invitation.invitedUserId !== user.id) {
      return NextResponse.json(
        { error: 'This invitation is not for you' },
        { status: 403 }
      );
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({
        status: 'EXPIRED',
        organizationName: invitation.organization.name,
        invitedEmail: invitation.invitedUser.email,
        isRegistered: !!invitation.invitedUser.password,
      });
    }

    return NextResponse.json({
      status: invitation.status,
      organizationName: invitation.organization.name,
      invitedEmail: invitation.invitedUser.email,
      isRegistered: !!invitation.invitedUser.password,
      role: invitation.role,
    });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitation' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get the invitation and check if the user has permission to cancel it
    const invitation = await prisma.invitation.findUnique({
      where: { id: params.id },
      include: {
        organization: true,
        invitedUser: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if the user is an admin of the organization
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: user.id,
        },
      },
    });

    if (!member || member.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Not authorized to cancel invitations' },
        { status: 403 }
      );
    }

    // Delete the invitation
    await prisma.invitation.delete({
      where: { id: params.id },
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        organizationId: invitation.organizationId,
        userId: user.id,
        action: 'Cancelled Invitation',
        details: `Cancelled invitation for ${invitation.invitedUser.email}`,
      },
    });

    revalidatePath(`/organizations/${invitation.organizationId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    return NextResponse.json(
      { error: 'Failed to cancel invitation' },
      { status: 500 }
    );
  }
} 