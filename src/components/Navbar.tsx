"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const { data: session } = useSession();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <nav className="bg-gray-900 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-indigo-400 hover:text-indigo-300">
                SyncNotes
              </Link>
            </div>
          </div>
          
          {session && (
            <div className="flex items-center">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-300">
                  {session.user.name || session.user.email}
                </span>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Logout</h3>
            <p className="text-gray-300 mb-6">Are you sure you want to log out?</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600"
              >
                No, let me stay
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Yes, log me out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
} 