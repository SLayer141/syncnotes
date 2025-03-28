import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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
  editHistory: {
    editedBy: {
      id: string;
      name: string | null;
      email: string | null;
    };
    editedAt: string;
  }[];
}

interface NotesTabProps {
  organizationId: string;
  userRole: string;
}

interface NoteModalProps {
  note?: Note | null;
  onClose: () => void;
  onSubmit: (noteId: string | null, title: string, content: string, isShared: boolean) => void;
  canShare: boolean;
}

function NoteModal({ note, onClose, onSubmit, canShare }: NoteModalProps) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [isShared, setIsShared] = useState(note?.isShared || false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(note?.id || null, title, content, isShared);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">
          {note ? 'Edit Note' : 'Create Note'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-300">
              Content
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={8}
              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          {canShare && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isShared"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                className="rounded bg-gray-700 border-gray-600 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isShared" className="ml-2 text-sm text-gray-300">
                Share with all members
              </label>
            </div>
          )}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              {note ? 'Save Changes' : 'Create Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NotesTab({ organizationId, userRole }: NotesTabProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const { data: session } = useSession();
  const router = useRouter();

  // Fetch notes
  useEffect(() => {
    fetchNotes();
  }, [organizationId]);

  const fetchNotes = async () => {
    try {
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

  const handleCreateNote = async (noteId: string | null, title: string, content: string, isShared: boolean) => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content, isShared }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create note');
      }

      setNotes([data, ...notes]);
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note');
      console.error(err);
    }
  };

  const handleUpdateNote = async (noteId: string | null, title: string, content: string, isShared: boolean) => {
    if (!noteId) return;
    
    try {
      const response = await fetch(`/api/organizations/${organizationId}/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content, isShared }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update note');
      }

      setNotes(notes.map(note => note.id === noteId ? data : note));
      setEditingNote(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update note');
      console.error(err);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      const response = await fetch(`/api/organizations/${organizationId}/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      setNotes(notes.filter(note => note.id !== noteId));
    } catch (err) {
      setError('Failed to delete note');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-900/50 text-red-200 p-4 rounded-md">
          {error}
        </div>
      )}

      {/* Create Note Button */}
      {userRole !== 'VIEWER' && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Create Note
          </button>
        </div>
      )}

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {notes.map(note => (
          <div
            key={note.id}
            className="bg-gray-800 rounded-lg p-6 space-y-4 hover:bg-gray-700 transition-colors"
          >
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-semibold text-white">{note.title}</h3>
              {note.isShared && (
                <span className="bg-green-600/20 text-green-400 text-xs px-2 py-1 rounded">
                  Shared
                </span>
              )}
            </div>
            
            <p className="text-gray-300 line-clamp-3">{note.content}</p>
            
            <div className="text-sm text-gray-400">
              Created by {note.createdBy.name || note.createdBy.email}
              <br />
              Last edited {new Date(note.updatedAt).toLocaleDateString()}
            </div>

            {/* Actions */}
            {(userRole === 'ADMIN' || (userRole === 'MEMBER' && note.createdBy.id === session?.user?.id)) && (
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                <button
                  onClick={() => setEditingNote(note)}
                  className="text-indigo-400 hover:text-indigo-300"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingNote) && (
        <NoteModal
          note={editingNote}
          onClose={() => {
            setShowCreateModal(false);
            setEditingNote(null);
          }}
          onSubmit={editingNote ? handleUpdateNote : handleCreateNote}
          canShare={userRole === 'ADMIN'}
        />
      )}
    </div>
  );
} 