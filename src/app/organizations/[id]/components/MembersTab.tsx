import { useState } from 'react';
import { useSession } from 'next-auth/react';

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

interface MembersTabProps {
  members: Member[];
  userRole: string;
  onRemoveMember: (memberId: string) => void;
  onUpdateRole: (memberId: string, newRole: string) => void;
}

export default function MembersTab({
  members,
  userRole,
  onRemoveMember,
  onUpdateRole,
}: MembersTabProps) {
  const { data: session } = useSession();
  const formatDate = (date: Date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return "N/A";
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isAdmin = userRole === 'ADMIN';

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Member
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Role
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Joined
            </th>
            {isAdmin && (
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-gray-800 divide-y divide-gray-700">
          {members.map((member) => (
            <tr key={member.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div>
                    <div className="text-sm font-medium text-white">
                      {member.user.name || member.user.email}
                    </div>
                    <div className="text-sm text-gray-400">
                      {member.user.email}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {isAdmin ? (
                  <select
                    value={member.role}
                    onChange={(e) => onUpdateRole(member.id, e.target.value)}
                    className="bg-gray-700 text-white text-sm rounded-md border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
                    disabled={member.userId === session?.user?.id}
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="MEMBER">Member</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                ) : (
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      member.role === "ADMIN"
                        ? "bg-purple-100 text-purple-800"
                        : member.role === "MEMBER"
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {member.role}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                {formatDate(member.joinedAt)}
              </td>
              {isAdmin && (
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onRemoveMember(member.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 