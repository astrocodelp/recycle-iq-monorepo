# @recycleiq/mobile

The RecycleIQ citizen app (Expo SDK 58, Expo Router, React Native). Scan or search an item, answer at most
one question, get the bin, the reason and the nearest point. Climb the scanning leaderboard; report full bins
to the municipality with a photo. Greek or English, following the phone (changeable in Settings).

## Run it

```bash
pnpm install                       # from the repo root
cp .env.example .env               # set EXPO_PUBLIC_API_URL
pnpm --filter @recycleiq/mobile start
```

`EXPO_PUBLIC_API_URL` points at the web app (`apps/web`), which serves the API. On a real phone use your
computer's LAN address (for example `http://192.168.1.20:3000`), not `localhost`, or your Vercel URL.

The camera and location run in Expo Go. `pnpm --filter @recycleiq/mobile web` opens a browser preview.

## EAS (builds and store submission)

The EAS project id is set in `app.json` (`extra.eas.projectId`). Link your Expo account once:

```bash
npm install --global eas-cli
cd apps/mobile
eas login
eas init --id a9821faf-2522-4679-99d2-dadead1b1c98
```

Then `eas build --profile preview --platform android` gives an installable APK, and `eas build --profile production`
builds store binaries. Update `EXPO_PUBLIC_API_URL` in `eas.json` to your production web URL first.

## Privacy by design

- GPS is turned into a neighbourhood on the device (`src/lib/location.ts`); only the neighbourhood id is sent.
- The bin QR code (`recycleiq://bin/<id>`) gives the neighbourhood without any location permission.
- Scan and bin photos stay on the phone; the server receives only the item, or the bin and the problem.
- The leaderboard shows nicknames only (automatic, or one you choose in Settings).
- History is stored only on the phone; the device id is a random install id.
