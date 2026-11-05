# 🎨 Qalam Studio

> **Free & Open-Source Graphic Design Platform** — A modern, community-built Canva alternative designed for creating stunning social media posts, presentations, posters, logos, marketing materials, and more.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg?style=flat-square)](LICENSE)

---

## ✨ Features

- **🚀 110+ Built-in Templates**: Starters & premium designs for Instagram posts, Stories, Pitch Decks, Flyers, Resumes, Logos, Thumbnails, and Documents.
- **⚡ Instant Local-First Mode**: Open, edit, design, and export templates immediately without needing an active database connection.
- **🎯 Full Canvas Toolset**: Shapes, lines, freehand drawing, typography (with 60+ Google Fonts), stickers, gradients, and custom image uploads.
- **💾 Automatic Saving & Version History**: Works with local browser storage and seamless PostgreSQL cloud database synchronization.
- **📤 High-Resolution Export**: Export crisp PNG, JPEG, SVG, and multi-page PDF files up to 3× resolution with zero watermarks.
- **📱 Fully Responsive**: Works smoothly on desktop workstations, tablets, and mobile devices.
- **🔒 Private & Self-Hostable**: Optional username/password authentication; no tracking or paywalls.

---

## 🚀 Quick Start (Local Development)

### 1. Clone the repository
```bash
git clone https://github.com/alfurqan73518/qalamstudio1.git
cd qalamstudio1
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. All templates and editor features work out-of-the-box!

---

## 🗄️ Database Setup (Cloud & Multi-device Sync)

Qalam Studio works completely offline using browser storage. If you want multi-device cloud synchronization or user accounts:

### Option A: Neon (Recommended - Free Serverless Postgres)
1. Sign up for free at [neon.tech](https://neon.tech).
2. Create a project and copy the connection string.
3. In your `.env` (or Vercel Environment Variables), set:
   ```env
   DATABASE_URL="postgresql://user:password@ep-xyz.region.aws.neon.tech/neondb?sslmode=require"
   ```
4. Run migrations and template seed:
   ```bash
   npm run db:setup
   ```

### Option B: Supabase (Free Tier)
1. Create a project at [supabase.com](https://supabase.com).
2. Go to **Project Settings** → **Database** → **Connection string** (Transaction pooler, port 6543).
3. Set `DATABASE_URL` in your `.env`:
   ```env
   DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
   ```
4. Run `npm run db:setup`.

### Option C: Local Docker Postgres
```bash
docker run --name qalam-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=qalamstudio -p 5432:5432 -d postgres:17
```
Set in `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/qalamstudio"
```
Then run `npm run db:setup`.

---

## ☁️ Deploying to Vercel

1. Push your repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and import your `qalamstudio1` repository.
3. In **Settings** → **Environment Variables**, add:
   - `DATABASE_URL` (From your Neon or Supabase database)
4. (Optional) In Vercel **Project Settings** → **Build & Development Settings**:
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. Click **Deploy**!

---

## 🛠️ Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts local Next.js dev server on port 3000 |
| `npm run build` | Compiles production build (cross-platform) |
| `npm run db:setup` | Runs Prisma migrations and seeds 110 templates |
| `npm run db:push` | Pushes schema changes directly to Postgres |
| `npm run db:seed` | Re-seeds built-in template library into the database |
| `npm run lint` | Runs ESLint check |

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
