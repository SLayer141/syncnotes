'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { acceptInvitation } from '@/app/actions/organization-members';

interface Invitation {
  id: string;
  organization: {
    id: string;
    name: string;
  };
  invitedBy: {
    name: string | null;
    email: string;
  };
  role: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

export default function InvitesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchInvitations();
    }
  }, [status]);

  async function fetchInvitations() {
    try {
      const response = await fetch('/api/invitations');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch invitations');
      }

      setInvitations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invitations');
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptInvitation(invitationId: string) {
    try {
      setError(null);
      const result = await acceptInvitation(invitationId);
      
      if ('error' in result) {
        throw new Error(result.error);
      }
      
      // Remove the accepted invitation from the list
      setInvitations(invitations.filter(invite => invite.id !== invitationId));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation");
      console.error(err);
    }
  }

  async function handleRejectInvitation(invitationId: string) {
    try {
      setError(null);
      const response = await fetch(`/api/invitations/${invitationId}/reject`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject invitation');
      }

      // Remove the rejected invitation from the list
      setInvitations(invitations.filter(invite => invite.id !== invitationId));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject invitation");
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Invitations</h1>
          <Link
            href="/"
            className="px-4 py-2 text-sm text-gray-300 hover:text-white"
          >
            Back to Organizations
          </Link>
        </div>

        {error && (
          <div className="bg-red-900/50 text-red-200 p-4 rounded-md mb-6">
            {error}
          </div>
        )}

        {invitations.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No pending invitations.
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Organization
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {invitations.map((invitation) => (
                    <tr key={invitation.id} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">
                          {invitation.organization.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">
                          {invitation.invitedBy.name || invitation.invitedBy.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-900 text-indigo-200">
                          {invitation.role.toLowerCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          invitation.status === 'PENDING' ? 'bg-yellow-900 text-yellow-200' :
                          invitation.status === 'ACCEPTED' ? 'bg-green-900 text-green-200' :
                          invitation.status === 'REJECTED' ? 'bg-red-900 text-red-200' :
                          'bg-gray-900 text-gray-200'
                        }`}>
                          {invitation.status.toLowerCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {invitation.status === 'PENDING' && (
                          <div className="flex space-x-4">
                            <button
                              onClick={() => handleAcceptInvitation(invitation.id)}
                              className="text-green-400 hover:text-green-300 transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleRejectInvitation(invitation.id)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 