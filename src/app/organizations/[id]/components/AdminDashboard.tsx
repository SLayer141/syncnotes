import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import NotesTab from './NotesTab';

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

interface Note {
  id: string;
  title: string;
  content: string;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface AdminDashboardProps {
  organizationId: string;
  members: Member[];
  onUpdateRole: (memberId: string, newRole: string) => Promise<void>;
  onRemoveMember: (memberId: string) => Promise<void>;
}

export default function AdminDashboard({ 
  organizationId, 
  members,
  onUpdateRole,
  onRemoveMember
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'notes' | 'activity'>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const [notes, setNotes] = useState<Note[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  // Fetch notes when the tab changes to 'notes' or 'overview' (for stats)
  useEffect(() => {
    if (activeTab === 'notes' || activeTab === 'overview') {
      fetchNotes();
    }
  }, [activeTab]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/organizations/${organizationId}/notes`);
      if (!response.ok) {
        throw new Error('Failed to fetch notes');
      }
      const data = await response.json();
      setNotes(data);
    } catch (err) {
      setError('Failed to load notes');
      console.error(err);
    } finally {
      setLoading(false);
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">
                          {member.user.name || 'Unnamed User'}
                        </div>
                        <div className="text-sm text-gray-400">{member.user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={member.role}
                        onChange={(e) => onUpdateRole(member.id, e.target.value)}
                        className="bg-gray-700 text-white text-sm rounded-md border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="MEMBER">Member</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      <button
                        onClick={() => onRemoveMember(member.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
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
            onNotesChange={fetchNotes}
          />
        )}

        {activeTab === 'activity' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-gray-400">Activity log coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
} 