import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getNotes, createNote, updateNote, deleteNote } from '@/app/actions/notes';

interface Note {
  id: string;
  title: string;
  content: string;
  isShared: boolean;
  sharedWithRoles: string[];
  createdAt: Date;
  updatedAt: Date;
  organizationId: string;
  createdById: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string | null;
  };
  editHistory?: {
    id: string;
    noteId: string;
    editedById: string;
    title: string;
    content: string;
    editedAt: Date;
    editedBy: {
      id: string;
      name: string | null;
      email: string | null;
    };
  }[];
}

interface NotesTabProps {
  organizationId: string;
  userRole: string;
  onNotesChange?: () => void;
}

interface NoteModalProps {
  note?: Note | null;
  onClose: () => void;
  onSubmit: (noteId: string | null, title: string, content: string, isShared: boolean, sharedWithRoles: string[]) => void;
  canShare: boolean;
}

function NoteModal({ note, onClose, onSubmit, canShare }: NoteModalProps) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [isShared, setIsShared] = useState(note?.isShared || false);
  const [sharedWithRoles, setSharedWithRoles] = useState<string[]>(note?.sharedWithRoles || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(note?.id || null, title, content, isShared, sharedWithRoles);
  };

  const handleRoleToggle = (role: string) => {
    setSharedWithRoles(prev => {
      if (prev.includes(role)) {
        return prev.filter(r => r !== role);
      } else {
        return [...prev, role];
      }
    });
    // If any role is selected, set isShared to true
    setIsShared(true);
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
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Share with:
              </label>
              <div className="space-y-2">
                {['ADMIN', 'MEMBER', 'VIEWER'].map((role) => (
                  <div key={role} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`role-${role}`}
                      checked={sharedWithRoles.includes(role)}
                      onChange={() => handleRoleToggle(role)}
                      className="rounded bg-gray-700 border-gray-600 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor={`role-${role}`} className="ml-2 text-sm text-gray-300">
                      {role.charAt(0) + role.slice(1).toLowerCase()}s
                    </label>
                  </div>
                ))}
              </div>
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

export default function NotesTab({ organizationId, userRole, onNotesChange }: NotesTabProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const { data: session } = useSession();

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const notes = await getNotes(organizationId);
      
      if (Array.isArray(notes)) {
        setNotes(notes);
      } else {
        throw new Error('Failed to load notes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // Fetch notes
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleCreateNote = async (noteId: string | null, title: string, content: string, isShared: boolean, sharedWithRoles: string[]) => {
    try {
      const result = await createNote(organizationId, title, content, sharedWithRoles);
      
      if ('error' in result) {
        throw new Error(result.error);
      }
      
      setNotes([result.note, ...notes]);
      setShowCreateModal(false);
      onNotesChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note');
      console.error(err);
    }
  };

  const handleUpdateNote = async (noteId: string | null, title: string, content: string, isShared: boolean, sharedWithRoles: string[]) => {
    if (!noteId) return;
    
    try {
      const result = await updateNote(noteId, title, content, sharedWithRoles);
      
      if ('error' in result) {
        throw new Error(result.error);
      }
      
      setNotes(notes.map(note => note.id === noteId ? result.note : note));
      setEditingNote(null);
      onNotesChange?.();
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
      const result = await deleteNote(noteId);
      
      if ('error' in result) {
        throw new Error(result.error);
      }
      
      setNotes(notes.filter(note => note.id !== noteId));
      onNotesChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
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

  const canEditNote = (note: Note) => {
    if (!session?.user?.id) return false;
    return (
      userRole === 'ADMIN' ||
      (userRole === 'MEMBER' && note.createdById === session.user.id)
    );
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-900/50 text-red-200 p-4 rounded-md">
          {error}
        </div>
      )}

      {/* Create Note Button */}
      {(userRole === 'ADMIN' || userRole === 'MEMBER') && (
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
          Create Note
        </button>
      )}

      {/* Notes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {notes.map((note) => (
          <div key={note.id} className="bg-gray-800 p-6 rounded-lg">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-white">{note.title}</h3>
              {canEditNote(note) && (
                <div className="flex space-x-2">
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
            <p className="text-gray-300 mb-4">{note.content}</p>
            <div className="flex justify-between items-center text-sm text-gray-400">
              <div>
                Created by: {note.createdBy.name || note.createdBy.email}
              </div>
              <div>
                {note.isShared && note.sharedWithRoles.length > 0 && (
                  <span className="text-indigo-400">
                    Shared with: {note.sharedWithRoles.join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Note Modal */}
      {(showCreateModal || editingNote) && (
        <NoteModal
          note={editingNote}
          onClose={() => {
            setShowCreateModal(false);
            setEditingNote(null);
          }}
          onSubmit={editingNote ? handleUpdateNote : handleCreateNote}
          canShare={userRole === 'ADMIN' || userRole === 'MEMBER'}
        />
      )}
    </div>
  );
} 