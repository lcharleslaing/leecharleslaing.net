# leecharleslaing.net

Mobile-first personal website built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Local development

1. Start Docker.
2. Start local Supabase:

   ```bash
   pnpm supabase:start
   ```

3. Copy the environment template:

   ```bash
   cp .env.example .env.local
   ```

4. Run `pnpm exec supabase status` and put the local publishable key in `.env.local`.
5. Install dependencies:

   ```bash
   pnpm install
   ```

6. Start the website:

   ```bash
   pnpm start
   ```

The app runs at http://localhost:3000 and Supabase Studio at http://127.0.0.1:54323.

## Scripts

- `pnpm start` — local Next.js development server
- `pnpm build` — production build
- `pnpm serve` — run the production build locally
- `pnpm lint` — ESLint
- `pnpm typecheck` — TypeScript type check
- `pnpm supabase:start` — start local Supabase
- `pnpm supabase:stop` — stop local Supabase
- `pnpm supabase:status` — show local Supabase connection details
