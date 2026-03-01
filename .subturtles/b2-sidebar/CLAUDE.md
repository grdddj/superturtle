## Current Task
All backlog items complete. Stop loop.

## End Goal with Specs
- SidebarTop shows auth user's avatar, displayName, and real connections count from Convex (not random)
- Cover image uses green gradient matching Turtle In branding (#2e7d32)
- "Who viewed your profile" stat still cosmetic but uses a stable number (derive from user._id hash or use connections/2)
- SidebarBottom: replace "firebase", "mern-stack" etc with turtle-themed hashtags and groups
- Remove any external URLs that point to random sites (the tandsgo.com cover image URL)
- Build passes: `npm run build`

## Backlog
- [x] Update `linkedin-demo/src/components/sidebar/sidebarTop/SidebarTop.js`: Remove the random useState+useEffect for `viewed` and `connections`. Use `user?.connections ?? 0` for connections count. Use `Math.floor((user?.connections ?? 100) / 2)` for "Who viewed" (cosmetic but stable). Replace the `backgroundImage` URL with a CSS gradient: `linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)` matching the profile page cover. Show `user?.title` subtitle under the name (small grey text).
- [x] Update `linkedin-demo/src/components/sidebar/sidebarBottom/SidebarBottom.js`: Replace `sectionRecent` with turtle/tech themed tags: `["turtle-dev", "convex", "react", "typescript", "open-source", "green-tech"]`. Replace `sectionGroups` with `["Turtle In Community", "Full-Stack Builders"]`. Replace `sectionHashTags` with `["turtlein", "buildinpublic", "webdev", "startups", "productdesign", "cleancode"]`.
- [x] Build: `cd linkedin-demo && npm run build`
- [x] Commit: "Wire sidebar to auth user, turtle-themed content, green cover"

## Notes
- All paths from repo root: `/Users/Richard.Mladek/Documents/projects/agentic/`
- Run npm commands from `linkedin-demo/`
- SidebarTop at `linkedin-demo/src/components/sidebar/sidebarTop/SidebarTop.js`
- SidebarBottom at `linkedin-demo/src/components/sidebar/sidebarBottom/SidebarBottom.js`
- `useConvexUser()` is already imported in SidebarTop — it returns { displayName, photoURL, connections, followers, title, ... }
- Green colors: primary #2e7d32, dark #1b5e20

## Loop Control
STOP
