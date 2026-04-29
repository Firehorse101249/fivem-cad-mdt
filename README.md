This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Supabase Security and RLS

This CAD/MDT uses Supabase Row Level Security to protect public database rows. Run `supabase/rls-policies.sql` in the Supabase SQL Editor to create the starter tables, helper function, indexes, and policies.

Normal browser code should only use the Supabase anon key. The Supabase service-role key bypasses RLS and has full database access, so it must stay server-only in environment variable `SUPABASE_SERVICE_ROLE_KEY`. Do not expose it through any `NEXT_PUBLIC_` variable.

Roles are stored in `public.profiles.role` with starter roles: `admin`, `dispatch`, `officer`, and `civilian`. Admin actions go through protected `app/api/admin/...` API routes. Those routes authenticate the current user, check `public.profiles.role = 'admin'`, and only then use the server-only Supabase admin client.

To create the first admin, create or invite a Supabase Auth user, copy their Auth user UUID, then run this in the Supabase SQL Editor:

```sql
insert into public.profiles (id, email, role, display_name)
values ('USER_UUID_HERE', 'admin@example.com', 'admin', 'Server Admin')
on conflict (id) do update
set role = 'admin',
    email = excluded.email,
    display_name = excluded.display_name;
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
