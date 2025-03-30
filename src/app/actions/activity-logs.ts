'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getActivityLogs(organizationId: string) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      throw new Error("Not authenticated");
    }

    const logs = await prisma.activityLog.findMany({
      where: {
        organizationId,
        organization: {
          members: {
            some: {
              user: {
                email: session.user.email,
              },
            },
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { logs };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to fetch activity logs" };
  }
}

export async function createActivityLog(organizationId: string, action: string, details?: string) {
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

    // Check if user is a member of the organization
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
    });

    if (!member) {
      throw new Error("You don't have access to this organization");
    }

    const log = await prisma.activityLog.create({
      data: {
        action,
        details,
        organizationId,
        userId: user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    revalidatePath(`/organizations/${organizationId}`);
    return { log };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create activity log" };
  }
} 