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

    // Check if user is a member of the organization
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId: params.id,
        user: {
          email: session.user.email,
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { message: "You don't have access to this organization" },
        { status: 403 }
      );
    }

    // Fetch recent activities
    const activities = await prisma.activityLog.findMany({
      where: {
        organizationId: params.id,
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
      take: 50, // Limit to last 50 activities
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return NextResponse.json(
      { message: "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
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

    const body = await request.json();
    const { action, details } = body;

    if (!action) {
      return NextResponse.json(
        { message: "Action is required" },
        { status: 400 }
      );
    }

    const activity = await prisma.activityLog.create({
      data: {
        action,
        details,
        organizationId: params.id,
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

    return NextResponse.json(activity);
  } catch (error) {
    console.error("Error creating activity log:", error);
    return NextResponse.json(
      { message: "Failed to create activity log" },
      { status: 500 }
    );
  }
} 