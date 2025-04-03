import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Image from "next/image";

async function getUserProfile() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      emailVerified: true,
      organizations: {
        include: {
          organization: true,
        },
        orderBy: {
          joinedAt: 'desc',
        },
      },
    },
  });

  return user;
}

export default async function ProfilePage() {
  const user = await getUserProfile();

  if (!user) {
    redirect('/auth/signin');
  }

  // Get the earliest date available for the user's join date
  const joinDate = user.emailVerified || new Date();

  return (
    <div className="min-h-screen bg-gray-900 text-white py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Profile Header */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex items-center space-x-4">
            {user.image && (
              <Image
                src={user.image}
                alt={user.name || 'Profile'}
                width={64}
                height={64}
                className="rounded-full"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold">{user.name || 'Anonymous User'}</h1>
              <p className="text-gray-400">{user.email}</p>
              <p className="text-sm text-gray-500">
                Joined {joinDate.toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Organizations List */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Organizations</h2>
          <div className="space-y-4">
            {user.organizations.map((membership) => (
              <div
                key={membership.organizationId}
                className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <div>
                  <h3 className="font-medium">{membership.organization.name}</h3>
                  <p className="text-sm text-gray-400">
                    Joined {new Date(membership.joinedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    membership.role === 'ADMIN'
                      ? 'bg-red-500/20 text-red-400'
                      : membership.role === 'MEMBER'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {membership.role}
                  </span>
                  <a
                    href={`/organizations/${membership.organizationId}`}
                    className="text-indigo-400 hover:text-indigo-300 text-sm"
                  >
                    View
                  </a>
                </div>
              </div>
            ))}
            {user.organizations.length === 0 && (
              <p className="text-gray-400 text-center py-4">
                You are not a member of any organizations yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 