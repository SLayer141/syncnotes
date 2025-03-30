# SyncNotes

A collaborative note-taking application built with Next.js, TypeScript, and PostgreSQL. SyncNotes allows teams to create, share, and manage notes within organizations.

## Features

- 🔐 **Authentication**: Secure authentication using NextAuth.js with multiple providers
- 👥 **Organizations**: Create and manage organizations with different user roles (Admin, Member, Viewer)
- 📝 **Notes Management**: 
  - Create, edit, and delete notes
  - Rich text editing
  - Share notes with specific roles
  - Track note edit history
- 👤 **User Profiles**: 
  - View user information
  - See organization memberships and roles
  - Profile picture support
- 📨 **Invitations System**: 
  - Invite users to organizations
  - Role-based invitations
  - Accept/reject invitation functionality
- 📊 **Activity Logging**: Track user actions within organizations

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/syncnotes.git
cd syncnotes
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Copy the environment variables file:
```bash
cp .env.sample .env
```

4. Update the environment variables in `.env` with your values

5. Set up the database:
```bash
npx prisma migrate dev
```

6. Start the development server:
```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:3000`

## Environment Variables

See `.env.sample` for required environment variables.

## Database Schema

The application uses the following main models:
- User
- Organization
- OrganizationMember
- Note
- NoteEdit
- ActivityLog
- Invitation

## User Roles

- **Admin**: Full access to organization settings, can manage members and notes
- **Member**: Can create and edit their own notes, view shared notes
- **Viewer**: Can only view notes shared with them

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
