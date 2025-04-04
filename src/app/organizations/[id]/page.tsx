"use client";

import { useState, useEffect, use, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from "next/link";
import InviteForm from "@/components/InviteForm";
import MembersTab from './components/MembersTab';
import NotesTab from './components/NotesTab';
import AdminDashboard from './components/AdminDashboard';
import { getOrganization, deleteOrganization } from '@/app/actions/organizations';
import { updateMemberRole, removeMember } from '@/app/actions/organization-members';
import InvitesTab from './components/InvitesTab';

interface Member {
  id: string;
  userId: string;
  role: string;
  joinedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface Organization {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  members: Member[];
}

export default function OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'notes' | 'admin' | 'invites'>('members');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);

  const loadOrganization = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getOrganization(resolvedParams.id);
      
      if ('error' in result) {
        throw new Error(result.error);
      }
      
      // Ensure all members have the required fields
      const organizationWithTypedMembers: Organization = {
        ...result.organization,
        members: result.organization.members.map(member => ({
          id: member.id,
          userId: member.userId,
          role: member.role,
          joinedAt: new Date(member.joinedAt),
          user: member.user
        }))
      };
      
      setOrganization(organizationWithTypedMembers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load organization");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      loadOrganization();
    }
  }, [status, router, loadOrganization]);

  async function handleRemoveMember(memberId: string) {
    try {
      setError(null);
      const result = await removeMember(memberId);
      
      if ('error' in result) {
        throw new Error(result.error);
      }
      
      setOrganization(prev => ({
        ...prev!,
        members: prev!.members.filter(m => m.id !== memberId)
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
      console.error(err);
    }
  }

  async function handleUpdateRole(memberId: string, newRole: string) {
    try {
      setError(null);
      const result = await updateMemberRole(memberId, newRole);
      
      if ('error' in result) {
        throw new Error(result.error);
      }
      
      setOrganization(prev => {
        if (!prev) return prev;
        const existingMember = prev.members.find(m => m.id === memberId);
        if (!existingMember) return prev;
        
        return {
          ...prev,
          members: prev.members.map(m =>
            m.id === memberId ? {
              ...existingMember,
              role: newRole
            } : m
          )
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update member role");
      console.error(err);
    }
  }

  async function handleDeleteOrganization() {
    if (!confirm('Are you sure you want to delete this organization?')) {
      return;
    }

    try {
      setError(null);
      const result = await deleteOrganization(organization!.id);
      
      if ('error' in result) {
        throw new Error(result.error);
      }
      
      router.push('/organizations');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete organization");
      console.error(err);
    }
  }

  if (isLoading) {
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

  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-900/50 text-red-200 p-4 rounded-md">
            {error || "Organization not found"}
          </div>
        </div>
      </div>
    );
  }

  const currentUser = organization.members.find(m => m.userId === session?.user?.id);
  const userRole = currentUser?.role || 'VIEWER';
  const isAdmin = userRole === 'ADMIN';

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">{organization.name}</h1>
            <p className="text-gray-400 mt-2">{organization.description}</p>
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

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'members'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Members
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'notes'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Notes
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('invites')}
                  className={`px-4 py-2 rounded-md ${
                    activeTab === 'invites'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Invites
                </button>
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-4 py-2 rounded-md ${
                    activeTab === 'admin'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Admin Dashboard
                </button>
              </>
            )}
          </div>

          {activeTab === 'members' && (
            <MembersTab
              members={organization.members}
              userRole={userRole}
              onUpdateRole={handleUpdateRole}
              onRemoveMember={handleRemoveMember}
            />
          )}

          {activeTab === 'notes' && (
            <NotesTab
              organizationId={organization.id}
              userRole={userRole}
            />
          )}

          {activeTab === 'invites' && isAdmin && (
            <InvitesTab
              organizationId={organization.id}
              isAdmin={isAdmin}
            />
          )}

          {activeTab === 'admin' && isAdmin && (
            <AdminDashboard
              organizationId={organization.id}
              members={organization.members}
              onMemberUpdate={(member) => handleUpdateRole(member.id, member.role)}
              onMemberRemove={handleRemoveMember}
            />
          )}
        </div>

        {showInviteForm && (
          <InviteForm
            organizationId={organization.id}
            organizationName={organization.name}
            onClose={() => setShowInviteForm(false)}
            onSuccess={() => {
              setShowInviteForm(false);
              loadOrganization();
            }}
            isAdmin={isAdmin}
          />
        )}
      </div>
    </div>
  );
} 