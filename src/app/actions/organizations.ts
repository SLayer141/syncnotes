'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createActivityLog } from "./activity-logs";

export async function getOrganizations() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      throw new Error("Not authenticated");
    }

    const organizations = await prisma.organization.findMany({
      where: {
        members: {
          some: {
            user: {
              email: session.user.email,
            },
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { organizations };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to fetch organizations" };
  }
}

export async function createOrganization(name: string, description?: string) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      throw new Error("Not authenticated");
    }

    if (!name) {
      throw new Error("Organization name is required");
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        description,
        members: {
          create: {
            userId: user.id,
            role: "ADMIN",
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Log the activity
    await createActivityLog(
      organization.id,
      "Created Organization",
      `Created organization: ${name}`
    );

    revalidatePath('/organizations');
    return { organization };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create organization" };
  }
}

export async function getOrganization(id: string) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      throw new Error("Not authenticated");
    }

    const organization = await prisma.organization.findUnique({
      where: {
        id,
        members: {
          some: {
            user: {
              email: session.user.email,
            },
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!organization) {
      throw new Error("Organization not found");
    }

    return { organization };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to fetch organization" };
  }
}

export async function updateOrganization(id: string, name: string, description?: string) {
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

    // Check if user is an admin
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId: user.id,
        },
      },
    });

    if (!member || member.role !== "ADMIN") {
      throw new Error("You don't have permission to update this organization");
    }

    const organization = await prisma.organization.update({
      where: { id },
      data: {
        name,
        description,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Log the activity
    await createActivityLog(
      id,
      "Updated Organization",
      `Updated organization details`
    );

    revalidatePath(`/organizations/${id}`);
    return { organization };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to update organization" };
  }
}

export async function deleteOrganization(id: string) {
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

    // Check if user is an admin
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId: user.id,
        },
      },
    });

    if (!member || member.role !== "ADMIN") {
      throw new Error("You don't have permission to delete this organization");
    }

    // Get organization details for the activity log
    const organization = await prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new Error("Organization not found");
    }

    // Log the activity before deletion
    await createActivityLog(
      id,
      "Deleted Organization",
      `Deleted organization: ${organization.name}`
    );

    // Delete the organization
    await prisma.organization.delete({
      where: { id },
    });

    revalidatePath('/organizations');
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to delete organization" };
  }
} 