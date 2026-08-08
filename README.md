# ReportIt Ghana

ReportIt is a mobile app that lets citizens report local infrastructure and
sanitation issues — potholes, water leaks, broken streetlights, illegal
dumping, and more — directly to the people who can fix them, with a photo,
a location, and a live status they can follow through to resolution.

## The problem it solves

Community issues in Ghana (and many other places) often go unreported simply
because there's no easy, direct channel between a citizen who notices a
problem and the people responsible for fixing it. Reports get lost in phone
calls, social media posts, or word of mouth, with no way to track what
happened next. ReportIt gives citizens a simple way to file a report in under
a minute — with a photo and exact location attached — and gives
administrators a real-time dashboard to triage, update, and resolve them,
while the reporter automatically sees the status change and gets notified.

## Features

- **Email/password authentication** with a Firestore-backed user profile
  (name, email, role).
- **First-launch onboarding** — three short intro slides shown only once per
  device.
- **Home dashboard** — a personal greeting, quick stats (total / pending /
  in progress / resolved), and your most recent reports.
- **Report submission** — title, description, category picker, an optional
  photo (camera or gallery, uploaded to Cloudinary), and an optional GPS
  location with reverse-geocoded address.
- **My Reports** — a real-time list of your own reports with color-coded
  status badges.
- **Public map** — every report with a location plotted on an interactive
  Leaflet/OpenStreetMap map, pins color-coded by status, auto-fit to frame
  all pins, with a legend.
- **Report detail** — full report view with photo, a status timeline
  (Pending → Under Review → In Progress → Resolved, or a distinct Rejected
  end-state with the admin's reason), a small location map, and any admin
  notes.
- **Admin dashboard** — every report in the system, with status/category
  filters and text search, admin-only.
- **Admin status management** — change a report's status (including
  Rejected), write notes visible to the reporter, or delete a report
  (with a confirmation step).
- **Profile** — your name, email, role, total report count, member-since
  date, a notifications toggle, and sign out.
- **Local status-change notifications** — when one of your reports changes
  status, you get a notification on your device (no push server, no dev
  build required — works in Expo Go).

## Tech stack

- [Expo SDK 54](https://docs.expo.dev/) / React Native
- [Expo Router](https://docs.expo.dev/router/introduction/) (file-based navigation)
- TypeScript
- [NativeWind](https://www.nativewind.dev/) (Tailwind CSS for React Native)
- [Zustand](https://github.com/pmndrs/zustand) (state management)
- [Firebase](https://firebase.google.com/) — Firestore (data) + Authentication (email/password)
- [Cloudinary](https://cloudinary.com/) (unsigned image uploads — Firebase Storage is not used)
- [Leaflet](https://leafletjs.com/) + [OpenStreetMap](https://www.openstreetmap.org/) (rendered inside a WebView — no native maps module, no API key)
- `expo-notifications` (local notifications only), `expo-location`, `expo-image-picker`, `@react-native-async-storage/async-storage`

## Data model

Firestore is the app's primary datastore (see `lib/firebase.ts`). TypeScript
types live in `types/models.ts`, and typed collection references live in
`lib/firestore.ts`. **Security rules are defined in `firestore.rules` but are
not deployed automatically — they must be published manually in the Firebase
console** (Firestore Database → Rules) before the app's data access will
match what's described below.

### `users/{uid}`

One document per user, keyed by their Firebase Auth `uid`.

| Field       | Type                   | Notes                                  |
| ----------- | ---------------------- | --------------------------------------- |
| `uid`       | `string`                | Firebase Auth uid, matches the doc id   |
| `name`      | `string`                | Display name                            |
| `email`     | `string`                | Account email                           |
| `role`      | `"citizen" \| "admin"`  | Controls access per `firestore.rules`   |
| `createdAt` | `Timestamp`             | Firestore server timestamp              |

### `reports/{reportId}`

One document per citizen-submitted report.

| Field         | Type                                                                                                                       | Notes                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `id`          | `string`                                                                                                                      | Matches the doc id                                  |
| `userId`      | `string`                                                                                                                      | uid of the reporting user (report owner)            |
| `title`       | `string`                                                                                                                      | Short summary                                       |
| `description` | `string`                                                                                                                      | Full description                                    |
| `category`    | `"Potholes" \| "Water Leak" \| "Gutters" \| "Streetlights" \| "Illegal Dumping" \| "Public Facility" \| "Other"`              | Issue category                                      |
| `status`      | `"Pending" \| "Under Review" \| "In Progress" \| "Resolved" \| "Rejected"`                                                    | Only admins may change this (enforced in rules)     |
| `imageUrl`    | `string \| null`                                                                                                              | Cloudinary URL (Firebase Storage is not used)       |
| `location`    | `{ lat: number; lng: number } \| null`                                                                                       | Geographic coordinates, if provided                 |
| `address`     | `string \| null`                                                                                                              | Human-readable address, if provided                 |
| `createdAt`   | `Timestamp`                                                                                                                   | Firestore server timestamp                          |
| `updatedAt`   | `Timestamp`                                                                                                                   | Firestore server timestamp, updated on every edit   |
| `adminNotes`  | `string \| null`                                                                                                              | Only admins may set/change this (enforced in rules) |

### Access rules summary

- Any authenticated user can read all reports (needed for the public map).
- A user can create a report only with their own `userId`.
- A user can update/delete their own reports, but cannot change `status` or `adminNotes`.
- Admins (`users/{uid}.role == "admin"`) can read and update any report, including deleting it.
- A user can read/write only their own `users/{uid}` document; admins can read any user document.

## Setup

### Prerequisites

- Node.js 22
- A Firebase project with **Firestore** and **Email/Password Authentication** enabled
- A Cloudinary account with an **unsigned** upload preset
- The [Expo Go](https://expo.dev/go) app on a physical iOS or Android device (or a simulator/emulator)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your own values — `.env` is
gitignored and never committed:

```bash
cp .env.example .env
```

Keys required in `.env`:

```
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET
```

### 3. Publish the Firestore security rules

The rules in `firestore.rules` are the source of truth for this project but
are **not** deployed automatically. Copy their contents into the Firebase
console under Firestore Database → Rules and publish them before using the
app — otherwise Firestore is left on its default (test-mode) rules.

### 4. Start the app

```bash
npx expo start
```

Scan the QR code with Expo Go on iOS or Android (SDK 54). The app uses only
Expo Go–compatible native modules — no custom development build is required.

## Screenshots

_Coming soon._

<!--
| Home | Report | Map | Admin |
| ---- | ------ | --- | ----- |
| ![Home](./docs/screenshots/home.png) | ![Report](./docs/screenshots/report.png) | ![Map](./docs/screenshots/map.png) | ![Admin](./docs/screenshots/admin.png) |
-->
