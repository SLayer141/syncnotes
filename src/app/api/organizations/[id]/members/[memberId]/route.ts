import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; memberId: string } }
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
      include: {
        members: {
          include: {
            user: true,
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

    // Check if the member exists and is not the last admin
    const memberToRemove = organization.members.find(
      (member) => member.id === params.memberId
    );

    if (!memberToRemove) {
      return NextResponse.json(
        { message: "Member not found" },
        { status: 404 }
      );
    }

    // Count admins
    const adminCount = organization.members.filter(
      (member) => member.role === "ADMIN"
    ).length;

    // If trying to remove the last admin
    if (memberToRemove.role === "ADMIN" && adminCount === 1) {
      return NextResponse.json(
        { message: "Cannot remove the last admin" },
        { status: 400 }
      );
    }

    // Remove the member
    await prisma.organizationMember.delete({
      where: {
        id: params.memberId,
      },
    });

    return NextResponse.json({ message: "Member removed successfully" });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { message: "Failed to remove member" },
      { status: 500 }
    );
  }
} 