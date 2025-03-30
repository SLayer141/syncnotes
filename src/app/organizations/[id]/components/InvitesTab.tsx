import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Invite {
  id: string;
  invitedUser: {
    email: string;
    name: string | null;
  };
  invitedBy: {
    email: string;
    name: string | null;
  };
  status: string;
  role: string;
  createdAt: string;
  expiresAt: string;
}

interface InvitesTabProps {
  organizationId: string;
  isAdmin: boolean;
}

export default function InvitesTab({ organizationId, isAdmin }: InvitesTabProps) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchInvites() {
      try {
        const response = await fetch(`/api/organizations/${organizationId}/invites`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch invites');
        }

        setInvites(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch invites');
      } finally {
        setLoading(false);
      }
    }

    fetchInvites();
  }, [organizationId]);

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const response = await fetch(`/api/invitations/${inviteId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel invitation');
      }

      // Remove the cancelled invite from the list
      setInvites(invites.filter(invite => invite.id !== inviteId));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel invitation');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 text-red-200 p-4 rounded-md">
        {error}
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No pending invitations.
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Invited User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Invited By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Expires
              </th>
              {isAdmin && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {invites.map((invite) => (
              <tr key={invite.id} className="hover:bg-gray-700/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-white">
                    {invite.invitedUser.name || invite.invitedUser.email}
                  </div>
                  {invite.invitedUser.name && (
                    <div className="text-xs text-gray-400">{invite.invitedUser.email}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-white">
                    {invite.invitedBy.name || invite.invitedBy.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-900 text-indigo-200">
                    {invite.role.toLowerCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    invite.status === 'PENDING' ? 'bg-yellow-900 text-yellow-200' :
                    invite.status === 'ACCEPTED' ? 'bg-green-900 text-green-200' :
                    'bg-red-900 text-red-200'
                  }`}>
                    {invite.status.toLowerCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {new Date(invite.expiresAt).toLocaleDateString()}
                </td>
                {isAdmin && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {invite.status === 'PENDING' && (
                      <button
                        onClick={() => handleCancelInvite(invite.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 