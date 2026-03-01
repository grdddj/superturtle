## Current Task
Backlog complete for B4 (Network page). Awaiting next task assignment.

## End Goal with Specs
- "My Network" tab renders a Network component (not "Coming soon")
- Lists all users from Convex (query api.users.listAllUsers)
- Each user card shows: avatar, displayName, title, location, Connect button (cosmetic)
- Clicking a user card navigates to their profile
- Green branding (#2e7d32)
- Build passes: `npm run build`

## Backlog
- [x] Add `listAllUsers` query to `linkedin-demo/src/convex/users.ts`: no args, returns all users from the users table. Include _id, displayName, photoURL, title, location, connections.
- [x] Create `linkedin-demo/src/components/network/Network.js`: Import `useQuery` from `convex/react`, `api` from convex. Query `api.users.listAllUsers`. Render a grid of user cards. Each card is a Paper with: Avatar (user.photoURL), displayName (bold), title (grey subtitle), location (small grey), a "Connect" Button (green outlined, cosmetic — no mutation). Clicking the card area (not the button) calls `onViewProfile(user._id)`. Accept `onViewProfile` as prop.
- [x] Create `linkedin-demo/src/components/network/Style.js`: Material-UI makeStyles. Grid layout (2 columns on desktop, 1 on mobile). Card styling: white Paper, padding 16px, flex row with avatar left and info right. Connect button: green outlined (#2e7d32), borderRadius 16, textTransform none.
- [x] Wire in App.js: Import Network. When `activeTab === "network"`, render `<Network onViewProfile={onViewProfile} />` instead of the "Coming soon" Paper. The `onViewProfile` function already exists in App.js.
- [x] Push: `cd linkedin-demo && npx convex dev --once`
- [x] Build: `cd linkedin-demo && npm run build`
- [x] Commit: "Add Network page: list all users, connect button, click-to-profile"

## Notes
- All paths from repo root: `/Users/Richard.Mladek/Documents/projects/agentic/`
- Run npm/convex commands from `linkedin-demo/`
- users.ts at `linkedin-demo/src/convex/users.ts` — already has getUser, getFeaturedUser, getCurrentUser
- App.js at `linkedin-demo/src/App.js` — uses activeTab state, has onViewProfile handler
- Header.js tabItems already includes `{ key: "network", icon: GroupIcon }`
- Green colors: primary #2e7d32, light #66bb6a

## Loop Control
STOP
