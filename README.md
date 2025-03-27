# SyncNotes

SyncNotes is a powerful Notes Sharing Application designed for teams and organizations. It enables seamless real-time collaboration, secure note management, and effortless organization-wide sharing. Built with Next.js, BetterAuth, Prisma, and PostgreSQL, SyncNotes ensures a smooth, secure, and efficient experience for professionals.

## Features

- 📝 Real-time collaborative note editing
- 🔒 Secure authentication with multiple options:
  - Password-based login
  - One-Time Password (OTP) verification
  - Email verification for new accounts
- 📱 Responsive design for all devices
- 🤝 Easy note sharing with team members
- ✨ Modern and intuitive user interface

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Email Service**: Resend
- **Styling**: Tailwind CSS

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/SLayer141/syncnotes.git
   cd syncnotes
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file with the following variables:
   ```
   DATABASE_URL="your-postgresql-url"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   RESEND_API_KEY="your-resend-api-key"
   ```

4. Set up the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
