# Deployment

## Web + API on Vercel, database on Neon

1. **Create the Vercel project** from this GitHub repository and set **Root Directory** to `apps/web`.
   Vercel detects Next.js and the pnpm workspace. `apps/web/vercel.json` sets the install and build
   commands; the build runs database migrations first.
2. **Add Neon** from the Vercel Marketplace (Storage → Neon) and connect it to the project. The
   integration sets `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` for Production and Preview, and
   can create a Neon branch per preview deployment.
3. **Deploy.** The build runs `pnpm db:migrate` against that environment's database, then `next build`.
4. **Seed once** per database (reference data plus synthetic demo activity):

   ```bash
   DATABASE_URL="<Neon unpooled URL>" pnpm db:seed
   ```

   To remove the demo activity later and keep only reference data: `pnpm db:seed --no-synthetic`.
   Re-running the seed never touches real activity or rule toggles made in the dashboard.
5. **Optional:** set `NEXT_PUBLIC_SITE_URL` to your public domain so bin QR codes use it.

At runtime the web app talks to Neon over its serverless HTTP driver (fast cold starts). Scripts and
migrations use a normal Postgres connection.

The dashboard currently has no login (all data is synthetic). Add authentication before connecting real data.

## Mobile app with Expo / EAS

The EAS project id is already in `apps/mobile/app.json`. Once, with your Expo account:

```bash
npm install --global eas-cli
cd apps/mobile
eas login
eas init --id a9821faf-2522-4679-99d2-dadead1b1c98   # already linked: owner stellarfirm-ai in app.json
```

Set `EXPO_PUBLIC_API_URL` in `apps/mobile/eas.json` to your Vercel URL, then:

```bash
eas build --profile preview --platform android   # installable APK for testing
eas build --profile production --platform all    # store builds
eas submit --platform ios|android
```

For development on a phone: `pnpm --filter @recycleiq/mobile start` and open it in Expo Go, with
`EXPO_PUBLIC_API_URL` set to your computer's LAN address or the Vercel preview URL.

Bin QR codes open `https://<site>/b/<bin-id>`, which links to `recycleiq://bin/<bin-id>` in the app.
For one-tap opening without the landing page, add iOS Universal Links / Android App Links for your domain.
