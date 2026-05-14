# TodoFeed

Orbit-themed, mobile-first, and highly interactive task management application. ORBIT focuses on clean CRUD operations with a beautiful dark-mode aesthetic, gesture-driven interactions, and a seamless guest-to-account experience. 

## Project Description
ORBIT provides an intuitive and gamified way to manage daily tasks. Instead of standard lists, tasks orbit an oval path. Users can swipe to complete tasks (with satisfying banish animations), long-press and drag them to the edge to delete, or double-tap to edit. The application features a fully working full-stack architecture, utilizing Supabase for authentication and a RESTful API.

## Live Demo
🚀 **[Click here to view the live application](https://todofeed.vercel.app/)**

## Tech Stack Used
- **Frontend**: Next.js (React), Tailwind CSS, Framer Motion (for high-fidelity animations)
- **Backend**: Next.js API Routes (RESTful HTTP API)
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Validation**: Zod (for frontend and backend data integrity)

## Prerequisites
Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- npm (or yarn/pnpm)
- A Supabase Project (free tier is sufficient)

## Step-by-Step Local Setup Instructions

1. **Clone the repository** (if using git) or download the project folder.
2. **Navigate to the project directory**:
   ```bash
   cd your-project-root
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```

## Database Initialisation (Seeding)

To make the app work, you need to set up the database using Supabase.

1. Go to [Supabase](https://supabase.com) and create a new project.
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Open the file `supabase/schema.sql` found in this project.
4. Copy its entire contents and paste it into the Supabase SQL Editor.
5. Click **Run** to execute the SQL. This will create all necessary tables, constraints, and Row Level Security (RLS) policies.
6. Make sure to enable **Anonymous Sign-ins** in the Authentication settings of Supabase if you want to support guest login.

## Environment Variables Configuration

You need to connect your local app to your Supabase project.

1. Create a `.env.local` file in the root of the project.
2. Add the following environment variables to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
````

3. In your Supabase dashboard, go to **Project Settings -> API**.
4. Replace the placeholder values with your actual Supabase credentials:

   * `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL.
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase `anon` / `public` key.
   * `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase `service_role` key (keep this secret!).

## Running the Application (Frontend and Backend)

Because this project uses Next.js, both the frontend and backend are run together via the Next.js development server.

1. **Start the development server**:
   ```bash
   npm run dev
   ```
2. **Access the application**: Open your browser and navigate to `http://localhost:3000`.

The RESTful API is accessible via `http://localhost:3000/api/tasks`. The frontend seamlessly communicates with this local API.
