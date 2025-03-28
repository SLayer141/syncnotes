import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Helper function to check user's role and permissions
async function checkUserPermissions(organizationId: string, userId: string) {
  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  });

  if (!member) {
    return null;
  }

  return member.role;
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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    const role = await checkUserPermissions(params.id, user.id);

    if (!role || role === "VIEWER") {
      return NextResponse.json(
        { message: "You don't have permission to create notes" },
        { status: 403 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 }
      );
    }

    const { title, content, isShared = false } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { message: "Title is required and must be a string" },
        { status: 400 }
      );
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { message: "Content is required and must be a string" },
        { status: 400 }
      );
    }

    if (typeof isShared !== 'boolean') {
      return NextResponse.json(
        { message: "isShared must be a boolean" },
        { status: 400 }
      );
    }

    // Check if organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: params.id },
    });

    if (!organization) {
      return NextResponse.json(
        { message: "Organization not found" },
        { status: 404 }
      );
    }

    const note = await prisma.note.create({
      data: {
        title,
        content,
        isShared,
        createdById: user.id,
        organizationId: params.id,
        editHistory: {
          create: {
            title,
            content,
            editedById: user.id,
          },
        },
      },
      include: {
        createdBy: true,
        editHistory: {
          include: {
            editedBy: true,
          },
          orderBy: {
            editedAt: "desc",
          },
          take: 1,
        },
      },
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      { message: "Failed to create note. Please try again." },
      { status: 500 }
    );
  }
}

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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    const role = await checkUserPermissions(params.id, user.id);

    if (!role) {
      return NextResponse.json(
        { message: "You don't have access to this organization" },
        { status: 403 }
      );
    }

    // For viewers, only return shared notes
    const notes = await prisma.note.findMany({
      where: {
        organizationId: params.id,
        ...(role === "VIEWER" ? { isShared: true } : {}),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        editHistory: {
          include: {
            editedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            editedAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { message: "Failed to fetch notes" },
      { status: 500 }
    );
  }
} 