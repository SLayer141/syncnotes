"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createOrganization(formData: FormData) {
  try {
    console.log("Starting organization creation...");
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.error("No authenticated session found");
      throw new Error("Not authenticated");
    }

    console.log("Session found for user:", session.user.email);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    console.log("Form data:", { name, description });

    if (!name) {
      console.error("Organization name is missing");
      throw new Error("Organization name is required");
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      console.error("User not found in database:", session.user.email);
      throw new Error("User not found");
    }

    console.log("Found user:", user.id);

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
    });

    console.log("Organization created successfully:", organization.id);
    revalidatePath("/organizations");
    return organization;
  } catch (error) {
    console.error("Error in createOrganization:", error);
    throw error;
  }
}

export async function getOrganizations() {
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
  });

  return organizations;
}

export async function getOrganizationById(id: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    throw new Error("Not authenticated");
  }

  const organization = await prisma.organization.findFirst({
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

  return organization;
} 