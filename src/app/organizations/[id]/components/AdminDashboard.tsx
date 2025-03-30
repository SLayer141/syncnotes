import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { updateMemberRole, removeMember } from '@/app/actions/organization-members';
import { getActivityLogs } from '@/app/actions/activity-logs';
import { getNotes } from '@/app/actions/notes';
import NotesTab from './NotesTab';
import InvitesTab from './InvitesTab';

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

interface Note {
  id: string;
  title: string;
  content: string;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  organizationId: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string | null;
  };
  editHistory: {
    id: string;
    title: string;
    content: string;
    noteId: string;
    editedById: string;
    editedAt: Date;
    editedBy: {
      id: string;
      name: string | null;
      email: string | null;
    };
  }[];
}

interface ActivityLog {
  id: string;
  organizationId: string;
  userId: string;
  action: string;
  details: string | null;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface AdminDashboardProps {
  organizationId: string;
  members: Member[];
  onMemberUpdate?: (member: Member) => void;
  onMemberRemove?: (memberId: string) => void;
}

export default function AdminDashboard({ organizationId, members, onMemberUpdate, onMemberRemove }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'notes' | 'activity' | 'invites'>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (activeTab === 'activity') {
      fetchActivityLogs();
    } else if (activeTab === 'notes') {
      fetchNotes();
    }
  }, [activeTab]);

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      const result = await getActivityLogs(organizationId);
      
      if ('error' in result) {
        throw new Error(result.error);
      }
      
      setActivityLogs(result.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const result = await getNotes(organizationId);
      
      if ('error' in result) {
        throw new Error(result.error);
      }
      
      setNotes(result.notes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const result = await updateMemberRole(memberId, newRole);
      
      if ('error' in result) {
        throw new Error(result.error);
      }
      
      // Ensure the member object has all required fields
      const updatedMember: Member = {
        id: result.member.id,
        userId: result.member.userId,
        role: result.member.role,
        joinedAt: new Date(result.member.joinedAt),
        user: result.member.user
      };
      
      onMemberUpdate?.(updatedMember);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member role');
      console.error(err);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) {
      return;
    }

    try {
      const result = await removeMember(memberId);
      
      if ('error' in result) {
        throw new Error(result.error);
      }
      
      onMemberRemove?.(memberId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
      console.error(err);
    }
  };

  // Stats for the overview tab
  const stats = {
    totalMembers: members.length,
    admins: members.filter(m => m.role === 'ADMIN').length,
    regularMembers: members.filter(m => m.role === 'MEMBER').length,
    viewers: members.filter(m => m.role === 'VIEWER').length,
    totalNotes: notes.length,
    sharedNotes: notes.filter(n => n.isShared).length,
  };

  return (
    <div className="bg-gray-900 text-white">
      {/* Tab Navigation */}
      <div className="border-b border-gray-800 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Overview
          </button>
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
          <button
            onClick={() => setActiveTab('activity')}
            className={`py-4 px-1 border-b-2 ${
              activeTab === 'activity'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Activity Log
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`py-4 px-1 border-b-2 ${
              activeTab === 'invites'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Invites
          </button>
        </nav>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 text-red-200 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="text-indigo-400">Loading...</div>
        </div>
      )}

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-gray-200">Total Members</h3>
              <p className="text-3xl font-bold text-indigo-400 mt-2">{stats.totalMembers}</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-gray-200">Admins</h3>
              <p className="text-3xl font-bold text-indigo-400 mt-2">{stats.admins}</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-gray-200">Regular Members</h3>
              <p className="text-3xl font-bold text-indigo-400 mt-2">{stats.regularMembers}</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-gray-200">Viewers</h3>
              <p className="text-3xl font-bold text-indigo-400 mt-2">{stats.viewers}</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-gray-200">Total Notes</h3>
              <p className="text-3xl font-bold text-indigo-400 mt-2">{stats.totalNotes}</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-gray-200">Shared Notes</h3>
              <p className="text-3xl font-bold text-indigo-400 mt-2">{stats.sharedNotes}</p>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{member.user.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{member.user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                        className="bg-gray-700 text-white text-sm rounded-md border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
                        disabled={member.userId === session?.user?.id}
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="MEMBER">Member</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {member.userId !== session?.user?.id && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'notes' && (
          <NotesTab
            organizationId={organizationId}
            userRole="ADMIN"
          />
        )}

        {activeTab === 'activity' && (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {activityLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-indigo-400">{log.user.name}</div>
                          <div className="text-sm text-gray-400">{log.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        log.action.includes('Created') ? 'bg-green-100 text-green-800' :
                        log.action.includes('Updated') ? 'bg-blue-100 text-blue-800' :
                        log.action.includes('Deleted') ? 'bg-red-100 text-red-800' :
                        log.action.includes('Joined') ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-300">{log.details}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'invites' && (
          <InvitesTab 
            organizationId={organizationId} 
            isAdmin={true} 
          />
        )}
      </div>
    </div>
  );
} 