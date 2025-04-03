'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { acceptInvitation } from '@/app/actions/organization-members';

interface InvitationStatus {
  status: string;
  organizationName?: string;
  invitedEmail?: string;
  isRegistered?: boolean;
}

export default function InvitationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [invitationStatus, setInvitationStatus] = useState<InvitationStatus | null>(null);
  const invitationId = resolvedParams.id;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/invitations/${invitationId}`);
    }
  }, [status, invitationId, router]);

  useEffect(() => {
    async function fetchInvitationStatus() {
      try {
        const response = await fetch(`/api/invitations/${invitationId}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch invitation status');
        }
        
        setInvitationStatus(data);
        
        // If invitation is already accepted, redirect to organizations page
        if (data.status === 'ACCEPTED') {
          router.push('/organizations');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch invitation status');
      }
    }

    if (status === 'authenticated') {
      fetchInvitationStatus();
    }
  }, [invitationId, status, router]);

  const handleAcceptInvitation = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await acceptInvitation(invitationId);
      
      if ('error' in result) {
        throw new Error(result.error);
      }
      
      router.push('/organizations');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        </div>
      </div>
    );
  }

  // If the user is not logged in with the invited email
  if (invitationStatus?.invitedEmail && session?.user?.email !== invitationStatus.invitedEmail) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-800 rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-4">Wrong Account</h1>
            <div className="bg-yellow-900/50 text-yellow-200 p-4 rounded-md mb-4">
              This invitation was sent to <strong>{invitationStatus.invitedEmail}</strong>. 
              You are currently logged in as <strong>{session?.user?.email}</strong>.
            </div>
            <p className="text-gray-300 mb-6">
              Please log out and sign in with the correct email address to accept this invitation.
            </p>
            <button
              onClick={() => router.push('/api/auth/signout')}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-4">Organization Invitation</h1>
          
          {error ? (
            <div className="bg-red-900/50 text-red-200 p-4 rounded-md">
              {error}
            </div>
          ) : invitationStatus?.status === 'ACCEPTED' ? (
            <div className="bg-green-900/50 text-green-200 p-4 rounded-md">
              You have already accepted this invitation. Redirecting to organizations...
            </div>
          ) : invitationStatus?.status === 'EXPIRED' ? (
            <div className="bg-red-900/50 text-red-200 p-4 rounded-md">
              This invitation has expired.
            </div>
          ) : (
            <>
              <p className="text-gray-300 mb-6">
                You&apos;ve been invited to join {invitationStatus?.organizationName || 'an organization'}. 
                Click the button below to accept the invitation.
              </p>
              
              <button
                onClick={handleAcceptInvitation}
                disabled={loading}
                className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                Accept Invitation
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 