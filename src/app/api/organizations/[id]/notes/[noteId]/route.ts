import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Note {
  createdById: string;
  isShared: boolean;
  sharedWithRoles?: string[];
}

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

// Helper function to check if user can edit note
async function canEditNote(note: Note, userId: string, role: string) {
  if (role === "ADMIN") return true;
  if (role === "MEMBER" && note.createdById === userId) return true;
  if (role === "VIEWER") {
    const sharedWithRoles = note.sharedWithRoles || [];
    return sharedWithRoles.includes(role);
  }
  return false;
}

// Helper function to check if user can view note
async function canViewNote(note: Note, role: string) {
  if (role === "ADMIN" || role === "MEMBER") return true;
  if (role === "VIEWER") {
    if (!note.isShared) return false;
    const sharedWithRoles = note.sharedWithRoles || [];
    return sharedWithRoles.includes(role);
  }
  return false;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string; noteId: string } }
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

    const note = await prisma.note.findUnique({
      where: { id: params.noteId },
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
        },
      },
    });

    if (!note) {
      return NextResponse.json(
        { message: "Note not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to view the note
    if (!(await canViewNote(note, role))) {
      return NextResponse.json(
        { message: "You don't have permission to view this note" },
        { status: 403 }
      );
    }

    return NextResponse.json(note);
  } catch (error) {
    console.error("Error fetching note:", error);
    return NextResponse.json(
      { message: "Failed to fetch note" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string; noteId: string } }
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
        { message: "You don't have permission to edit notes" },
        { status: 403 }
      );
    }

    const note = await prisma.note.findUnique({
      where: { id: params.noteId },
    });

    if (!note) {
      return NextResponse.json(
        { message: "Note not found" },
        { status: 404 }
      );
    }

    if (!(await canEditNote(note, user.id, role))) {
      return NextResponse.json(
        { message: "You don't have permission to edit this note" },
        { status: 403 }
      );
    }

    const { title, content, sharedWithRoles = [] } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { message: "Title and content are required" },
        { status: 400 }
      );
    }

    // Only admins can update sharing settings
    const sharingUpdate = role === "ADMIN" ? {
      isShared: sharedWithRoles.length > 0,
      sharedWithRoles,
    } : {};

    const updatedNote = await prisma.note.update({
      where: { id: params.noteId },
      data: {
        title,
        content,
        ...sharingUpdate,
        editHistory: {
          create: {
            title,
            content,
            editedById: user.id,
          },
        },
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
        },
      },
    });

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error("Error updating note:", error);
    return NextResponse.json(
      { message: "Failed to update note" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; noteId: string } }
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
        { message: "You don't have permission to delete notes" },
        { status: 403 }
      );
    }

    const note = await prisma.note.findUnique({
      where: { id: params.noteId },
    });

    if (!note) {
      return NextResponse.json(
        { message: "Note not found" },
        { status: 404 }
      );
    }

    // Only allow note deletion by creator or admin
    if (note.createdById !== user.id && role !== "ADMIN") {
      return NextResponse.json(
        { message: "You don't have permission to delete this note" },
        { status: 403 }
      );
    }

    await prisma.note.delete({
      where: { id: params.noteId },
    });

    return NextResponse.json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { message: "Failed to delete note" },
      { status: 500 }
    );
  }
} 