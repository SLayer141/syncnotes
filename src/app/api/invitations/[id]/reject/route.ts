import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: params.id },
      include: { organization: true }
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    if (invitation.invitedUserId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to reject this invitation' },
        { status: 403 }
      );
    }

    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only reject pending invitations' },
        { status: 400 }
      );
    }

    // Update the invitation status to REJECTED
    await prisma.invitation.update({
      where: { id: params.id },
      data: { status: 'REJECTED' }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rejecting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to reject invitation' },
      { status: 500 }
    );
  }
} 