# Digital Muse

Phaser-based virtual pet simulator: raise, save, battle pets with multiplayer.

## License

[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)

## Tech Stack
- Client: Phaser 3, JavaScript, Vite
- Multiplayer: Firebase (Auth, Firestore, Realtime DB)
- Saves/DB: Firebase Firestore
- Auth: Firebase Auth (Google, anonymous)
- Testing: Vitest
- Utils: UUID, dayjs, rss-parser
- Dev: Vitest for tests
- Deploy: Dockerized for DigitalOcean or similar

## Setup
1. Clone repo: `git clone <repo-url>`
2. Install: `npm install`
3. Firebase: Add `src/config/firebase.js` with your config
4. Run dev: `npm run dev`
5. Emulators: `docker-compose up`

## Features
- Pet raising (stats, timers)
- Saving (local + cloud)
- Turn-based battles
- Multiplayer sync (visits, battles)

## Deployment
- Build: `npm run build`
- Deploy: `firebase deploy` or Docker to container service

## Tests
`npm test`


open sources assets used:
https://opengameart.org/content/punch-slap-n-kick
https://opengameart.org/content/action-sounds
https://opengameart.org/content/10-book-page-flips

Software:
BMFont https://www.angelcode.com/products/bmfont/

Quiz Content: 
ChatGPT


# Docker container
Local Redis: `docker run --name digitalmuse-redis -d -p 6379:6379 redis --save 60 1 --loglevel warning`

User opens game
  ↓
StartScene checks localStorage
  ↓
No user? → AuthScene (login/register) → User created on server
  ↓
No pet? → PetCreationScene → Pet created on server
  ↓
HomeScene → Game starts with loaded pet data
  ↓
During gameplay → PetStore.saveToServer() periodically
  ↓
After battles → updateUserStats() increases rank/battlePoints