'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createActivityLog } from "./activity-logs";

export async function getNotes(organizationId: string) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      throw new Error("Not authenticated");
    }

    // Get the user and their role in the organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      throw new Error("User not found");
    }

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

    // Build the where clause based on user role
    let whereClause: any = {
      organizationId,
    };

    // If not an admin, add role-based filters
    if (member.role !== 'ADMIN') {
      if (member.role === 'MEMBER') {
        // Members can see their own notes and notes shared with MEMBER role
        whereClause.OR = [
          { createdById: user.id },
          {
            AND: [
              { isShared: true },
              { sharedWithRoles: { has: 'MEMBER' } }
            ]
          }
        ];
      } else if (member.role === 'VIEWER') {
        // Viewers can only see notes shared with VIEWER role
        whereClause.AND = [
          { isShared: true },
          { sharedWithRoles: { has: 'VIEWER' } }
        ];
      }
    }

    const notes = await prisma.note.findMany({
      where: whereClause,
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
            editedAt: 'desc',
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return { notes };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to fetch notes" };
  }
}

export async function createNote(
  organizationId: string,
  title: string,
  content: string,
  sharedWithRoles: string[] = []
) {
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

    const note = await prisma.note.create({
      data: {
        title,
        content,
        organizationId,
        createdById: user.id,
        isShared: sharedWithRoles.length > 0,
        sharedWithRoles,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log the activity
    await createActivityLog(organizationId, "Created Note", `Created note: ${title}`);

    revalidatePath(`/organizations/${organizationId}`);
    return { note };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create note" };
  }
}

export async function updateNote(
  noteId: string,
  title: string,
  content: string,
  sharedWithRoles: string[] = []
) {
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
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: {
        organization: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!note) {
      throw new Error("Note not found");
    }

    const member = note.organization.members.find(m => m.userId === user.id);
    if (!member) {
      throw new Error("You don't have access to this note");
    }

    // Only allow sharing if user is an admin
    const canShare = member.role === 'ADMIN';
    const updatedSharedWithRoles = canShare ? sharedWithRoles : note.sharedWithRoles;
    const isShared = updatedSharedWithRoles.length > 0;

    // Create edit history entry
    await prisma.noteEdit.create({
      data: {
        noteId,
        editedById: user.id,
        title: note.title,
        content: note.content,
      },
    });

    // Update the note
    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data: {
        title,
        content,
        isShared,
        sharedWithRoles: updatedSharedWithRoles,
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
            editedAt: 'desc',
          },
        },
      },
    });

    // Log the activity
    await createActivityLog(note.organizationId, "Updated Note", `Updated note: ${title}`);

    revalidatePath(`/organizations/${note.organizationId}`);
    return { note: updatedNote };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to update note" };
  }
}

export async function deleteNote(noteId: string) {
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

    // Get the note and check permissions
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: {
        organization: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!note) {
      throw new Error("Note not found");
    }

    const member = note.organization.members.find(m => m.userId === user.id);
    if (!member) {
      throw new Error("You don't have access to this note");
    }

    // Only allow note deletion by creator or admin
    if (note.createdById !== user.id && member.role !== "ADMIN") {
      throw new Error("You don't have permission to delete this note");
    }

    // Delete the note
    await prisma.note.delete({
      where: { id: noteId },
    });

    // Log the activity
    await createActivityLog(note.organizationId, "Deleted Note", `Deleted note: ${note.title}`);

    revalidatePath(`/organizations/${note.organizationId}`);
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to delete note" };
  }
} 