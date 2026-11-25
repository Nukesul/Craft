# Craft — menu site with an admin panel

A React single-page app that shows a bakery/café menu and lets the owner manage it
(categories, products, size/price variants, photos) from a protected admin panel.

**Stack:** React 19 · React Router · Tailwind CSS · Supabase (Postgres, Auth, Storage)

## Features
- Public menu grouped by category, with sticky category navigation (mobile and desktop)
- Admin panel: add / edit / delete products and categories, multiple size variants with prices, image upload
- Admin login through **Supabase Auth** (email + password); database access is protected by Row Level Security

## Run locally
```bash
npm install
cp .env.example .env      # fill in your Supabase URL and anon key
npm start
```

## Set up Supabase
1. Create a project and the tables `categories` and `products`, plus a public Storage bucket `product-images`.
2. Run [`supabase/policies.sql`](supabase/policies.sql) in the SQL editor (public read, admin-only write).
3. In *Authentication → Providers*, create one admin user and **turn off public sign-ups**.

## Security notes
- Only the public **anon** key is used in the browser. Never put a `service_role` key into a `REACT_APP_*` variable: it ends up in the bundle.
- `.env` is git-ignored; use `.env.example` as a template.

## Scripts
`npm start` · `npm run build` · `npm test`
