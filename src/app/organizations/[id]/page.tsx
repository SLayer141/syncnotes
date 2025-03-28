"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import InviteForm from "@/components/InviteForm";
import MembersTab from './components/MembersTab';
import NotesTab from './components/NotesTab';

interface Member {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface Organization {
  id: string;
  name: string;
  description?: string;
  members: Member[];
}

export default function OrganizationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [activeTab, setActiveTab] = useState<"members" | "notes">("members");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      loadOrganization();
    }
    console.log("Session status:", status);
    console.log("Session data:", session);
  }, [status, params.id]);

  async function loadOrganization() {
    try {
      console.log("Loading organization with ID:", params.id);
      const response = await fetch(`/api/organizations/${params.id}`);
      const data = await response.json();
      
      console.log("API Response:", { 
        status: response.status, 
        statusText: response.statusText,
        data 
      });
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      if (!data || !data.id) {
        throw new Error("Invalid organization data received");
      }
      
      setOrganization(data);
      // Check if current user is admin
      const currentUserMember = data.members.find(
        (member: Member) => member.user.email === session?.user?.email
      );
      setIsAdmin(currentUserMember?.role === "ADMIN");
    } catch (err) {
      console.error("Error loading organization:", {
        error: err,
        message: err instanceof Error ? err.message : "Unknown error",
        params: params,
        session: session
      });
      setError(err instanceof Error ? err.message : "Failed to load organization");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm("Are you sure you want to remove this member?")) {
      return;
    }

    try {
      const response = await fetch(`/api/organizations/${params.id}/members/${memberId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to remove member");
      }

      loadOrganization();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  async function handleDeleteOrganization() {
    if (!confirm("Are you sure you want to delete this organization? This action cannot be undone.")) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/organizations/${params.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete organization");
      }

      // Use replace instead of push to prevent going back to deleted org
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete organization");
    }
  }

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/organizations/${params.id}/members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      await loadOrganization();
    } catch (err) {
      setError('Failed to update member role');
      console.error(err);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-lg text-white">Loading...</div>
      </div>
    );
  }

  if (!session) {
    console.log("No session found");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-lg text-white">Please log in to view this page.</div>
      </div>
    );
  }

  if (!organization) {
    console.log("No organization data found");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-lg text-white">
          {error || "Organization not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">{organization.name}</h1>
            {organization.description && (
              <p className="text-gray-400 mt-2">{organization.description}</p>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="px-4 py-2 text-sm text-gray-300 hover:text-white"
            >
              Back to Organizations
            </Link>
            {isAdmin && (
              <>
                <button
                  onClick={() => setShowInviteForm(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Invite Members
                </button>
                <button
                  onClick={handleDeleteOrganization}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                >
                  Delete Organization
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 text-red-200 p-4 rounded-md mb-6">
            {error}
          </div>
        )}

        <div className="border-b border-gray-800 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('members')}
              className={`py-4 px-1 border-b-2 ${
                activeTab === 'members'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Members
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`py-4 px-1 border-b-2 ${
                activeTab === 'notes'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Notes
            </button>
          </nav>
        </div>

        {activeTab === 'members' ? (
          <MembersTab
            members={organization.members}
            onRemoveMember={handleRemoveMember}
            onUpdateRole={handleUpdateRole}
            currentUserId={session?.user?.id}
            isAdmin={isAdmin}
          />
        ) : (
          <NotesTab
            organizationId={organization.id}
            userRole={organization.members.find(m => m.user.email === session?.user?.email)?.role || 'VIEWER'}
          />
        )}

        {showInviteForm && (
          <InviteForm
            organizationId={organization.id}
            organizationName={organization.name}
            senderName={(session?.user?.name || session?.user?.email) ?? 'User'}
            onClose={() => setShowInviteForm(false)}
            onSuccess={() => {
              loadOrganization();
            }}
            isAdmin={isAdmin}
          />
        )}
      </div>
    </div>
  );
} 