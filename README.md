# Guppy Tracker

A phone app for iPhone and Android for managing guppy breeding: tanks, water logs, fish, breeding groups, spawns, pedigrees and IHS evaluations. Built with Expo (React Native) and Supabase.

Each breeder signs up with their own account. Every table uses row level security, so an account only ever sees its own tanks, fish and photos.

## What works so far

- Sign up, sign in and a breeder profile with your initials
- Tanks with a purpose, size and notes, each with a printable QR code label
- Scanning a tank label from the app opens that tank
- Water tests (temperature °C, pH, ammonia, nitrite, nitrate, GH, KH) and water changes, all editable
- Fish with photos, IKGH tail standard, base and cover colour codes, strain, date of birth, generation, origin, foundation flag, original breeder, sire and dam, tank and status
- Fish IDs built automatically as initials + tail standard + sex + number, e.g. `SD-A3-M-001`
- Moving fish between tanks, one at a time or several at once, with a tank history per fish
- Moving a fish into a cull tank marks it Culled; marking a for-sale fish sold marks it Sold
- Breeding groups (pair, trio or larger) with a goal, target traits, tank and start and end dates, with a warning when fish in a group are closely related
- Spawns from a group with sire, dam (or Unknown), date of birth, fry count, tank, strain and generation, suggested from the parents
- A batch log for each spawn: moves (whole batch or part), losses with a cause, sexing counts, and culls with reasons that can be marked for sale and sold
- The current fry count is worked out from the log, and picking a fry makes it a fish with its parents, birth date and the reason it was picked

Pedigree view, trait records and IHS scoring come next.

## Setup

### 1. Database

The app is already connected to the Guppy Tracker Supabase project (Canada Central). Its tables, privacy rules and photo storage come from the files in [`supabase/migrations`](supabase/migrations), applied in order.

To use a different Supabase project instead, run those files in its SQL Editor, copy `.env.example` to `.env`, and fill in that project's URL and publishable key from **Project Settings > API**.

### 2. Run the app on your phone

1. Install [Node.js](https://nodejs.org) (version 20 or newer) on your computer.
2. In this folder run:

   ```bash
   npm install
   npx expo start
   ```

3. Install **Expo Go** from the App Store or Google Play, then scan the QR code shown in the terminal.

## Development

```bash
npx tsc --noEmit   # type-check
npx eslint src     # lint
```

Screens live in `src/app` (Expo Router), shared code in `src/lib` and `src/components`, and the database schema in `supabase/migrations`.
