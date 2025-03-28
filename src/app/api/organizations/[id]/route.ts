import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log("GET /api/organizations/[id] - Params:", params);
    
    // Test database connection
    try {
      await prisma.$connect();
      console.log("Database connection successful");
    } catch (dbError) {
      console.error("Database connection failed:", dbError);
      return NextResponse.json(
        { message: "Database connection failed" },
        { status: 500 }
      );
    }

    const session = await getServerSession(authOptions);
    console.log("Session:", { 
      authenticated: !!session, 
      email: session?.user?.email,
      id: session?.user?.id
    });

    if (!session?.user?.email) {
      console.log("Authentication failed - no session or email");
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    console.log("Fetching organization:", {
      id: params.id,
      userEmail: session.user.email
    });

    try {
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

      console.log("Organization query result:", {
        found: !!organization,
        memberCount: organization?.members?.length,
        organizationId: organization?.id
      });

      if (!organization) {
        return NextResponse.json(
          { message: "Organization not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(organization);
    } catch (queryError) {
      console.error("Database query failed:", {
        error: queryError,
        query: "organization.findFirst",
        params: {
          id: params.id,
          userEmail: session.user.email
        }
      });
      throw queryError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error("Error fetching organization:", {
      error,
      errorName: error instanceof Error ? error.name : "Unknown",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorStack: error instanceof Error ? error.stack : "No stack trace",
      params,
    });
    return NextResponse.json(
      { 
        message: "Failed to fetch organization",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  } finally {
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error("Error disconnecting from database:", disconnectError);
    }
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