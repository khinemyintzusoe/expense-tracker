# Expense Tracker

Shared household expense + income + accounts tracker. React 19 + Vite + Tailwind, Supabase backend, deployed to Vercel via CLI.

## One-time setup

### 1. Supabase
1. Create a new project at supabase.com.
2. Open the **SQL Editor**, paste the whole of `supabase-setup.sql`, run it.
3. Copy **Project URL** and **anon public key** from Project Settings → API.
4. In this folder: copy `.env.example` to `.env` and fill both values. `.env` is git-ignored — never commit it.

### 2. Run locally
```
npm install
npm run dev
```
Sign up (each person gets their own login). First person creates the household; the second joins with the invite code shown at the bottom of the Dashboard.

### 3. GitHub
Create an empty repo named `expense-tracker` at github.com/new (no README/.gitignore — this folder already has them), then:
```
git remote add origin https://github.com/khinemyintzusoe/expense-tracker.git
git push -u origin main
```

### 4. Vercel (CLI only — do NOT enable GitHub auto-deploy)
```
npx vercel        # link: create new project "expense-tracker"
npx vercel env add VITE_SUPABASE_URL production
npx vercel env add VITE_SUPABASE_ANON_KEY production
npx vercel --prod
```

## Day-to-day
- Deploy: `npx vercel --prod`
- Recurring expenses appear in a pulsing "Due now" card on the Dashboard — one tap logs them and advances the next due date.
