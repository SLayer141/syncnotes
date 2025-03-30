"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const { data: session } = useSession();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          SyncNotes
        </Link>
        {session?.user ? (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-2 hover:text-gray-300 focus:outline-none"
            >
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "Profile"}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                  {session.user.name?.charAt(0) || session.user.email?.charAt(0)}
                </div>
              )}
              <span>{session.user.name || session.user.email}</span>
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg py-1 z-10">
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-600"
                  onClick={() => setShowDropdown(false)}
                >
                  Profile
                </Link>
                <Link
                  href="/invites"
                  className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-600"
                  onClick={() => setShowDropdown(false)}
                >
                  Invitations
                </Link>
                <button
                  onClick={() => signOut()}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-600"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/auth/signin"
            className="bg-indigo-600 px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
} 