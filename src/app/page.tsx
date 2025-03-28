"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Organization {
  id: string;
  name: string;
  description?: string;
  members: Array<{
    user: {
      name: string;
      email: string;
    };
    role: string;
  }>;
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      loadOrganizations();
    }
  }, [status, router]);

  async function loadOrganizations() {
    try {
      const response = await fetch("/api/organizations");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to load organizations");
      }
      setOrganizations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load organizations");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateOrganization(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, description }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to create organization");
      }

      setShowCreateForm(false);
      loadOrganizations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization");
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-lg text-white">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Welcome to SyncNotes</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
            >
              Create Organization
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 text-red-200 p-4 rounded-md mb-6">
            {error}
          </div>
        )}

        {showCreateForm && (
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">Create New Organization</h2>
            <form onSubmit={handleCreateOrganization} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                  Organization Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300">
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org) => (
            <div
              key={org.id}
              className="bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => router.push(`/organizations/${org.id}`)}
            >
              <h2 className="text-xl font-semibold mb-2">{org.name}</h2>
              {org.description && (
                <p className="text-gray-400 mb-4">{org.description}</p>
              )}
              <div className="text-sm text-gray-400">
                {org.members.length} member{org.members.length !== 1 ? "s" : ""}
              </div>
            </div>
          ))}
        </div>

        {organizations.length === 0 && !showCreateForm && (
          <div className="text-center py-12">
            <p className="text-gray-400">You haven't joined any organizations yet.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-4 text-indigo-400 hover:text-indigo-300"
            >
              Create your first organization
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
