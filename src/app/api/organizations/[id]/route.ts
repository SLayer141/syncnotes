import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
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

    const organization = await prisma.organization.findFirst({
      where: {
        id: params.id,
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
      return NextResponse.json(
        { message: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      { message: "Failed to fetch organization" },
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
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Check if user is an admin of the organization
    const organization = await prisma.organization.findFirst({
      where: {
        id: params.id,
        members: {
          some: {
            user: {
              email: session.user.email,
            },
            role: "ADMIN",
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { message: "Organization not found or you don't have permission" },
        { status: 404 }
      );
    }

    // First, delete all members of the organization
    await prisma.organizationMember.deleteMany({
      where: {
        organizationId: params.id,
      },
    });

    // Then delete all notes associated with the organization
    await prisma.note.deleteMany({
      where: {
        organizationId: params.id,
      },
    });

    // Finally, delete the organization
    await prisma.organization.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({ message: "Organization deleted successfully" });
  } catch (error) {
    console.error("Error deleting organization:", error);
    return NextResponse.json(
      { message: "Failed to delete organization" },
      { status: 500 }
    );
  }
} 