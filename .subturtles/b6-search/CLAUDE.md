## Current Task
B6 complete: header search now queries posts + users with debounced dropdown results.

## End Goal with Specs
- Header search input is functional (currently just a placeholder)
- Typing in search bar queries both posts (by description) and users (by displayName) from Convex
- Results appear in a dropdown below the search input
- User results show avatar + displayName + title; clicking navigates to their profile
- Post results show author name + description snippet; clicking could scroll to or highlight that post
- Search is debounced (300ms) to avoid excessive queries
- Empty search clears results
- Green accent on active/focused search (#2e7d32)
- Build passes: `npm run build`

## Backlog
- [x] Add `searchPosts` query to `linkedin-demo/src/convex/posts.ts`: args { query: v.string() }. Filter posts where description contains the query string (case-insensitive — use `.toLowerCase()` comparison). Join author data. Return top 10 matches sorted by createdAt desc.
- [x] Add `searchUsers` query to `linkedin-demo/src/convex/users.ts`: args { query: v.string() }. Filter users where displayName contains the query string (case-insensitive). Return top 10 matches with _id, displayName, photoURL, title.
- [x] Update Header search in `linkedin-demo/src/components/header/Header.js`: Make the search input controlled (useState for searchTerm). Add a debounced query: use a `searchTerm` state + `useEffect` with 300ms setTimeout to set `debouncedTerm`. Use `useQuery(api.posts.searchPosts, debouncedTerm ? { query: debouncedTerm } : "skip")` and `useQuery(api.users.searchUsers, debouncedTerm ? { query: debouncedTerm } : "skip")`. Render results in an absolute-positioned dropdown Paper below the search div. User results: Avatar + displayName + title, onClick calls `onNavigateProfile(user._id)`. Post results: author displayName + description snippet (first 60 chars). Clicking outside closes dropdown (onBlur or click-away).
- [x] Add search dropdown styles to `linkedin-demo/src/components/header/Style.js`: Absolute positioned Paper below search input, z-index 1000, max-height 400px, overflow-y auto. Result items: flex row, padding 8px 12px, hover background #f5f5f5, cursor pointer. Section headers: "Users" and "Posts" in bold grey.
- [x] Push: `cd linkedin-demo && npx convex dev --once`
- [x] Build: `cd linkedin-demo && npm run build`
- [x] Commit: "Add search: query posts + users, results dropdown in header"

## Notes
- All paths from repo root: `/Users/Richard.Mladek/Documents/projects/agentic/`
- Run npm/convex commands from `linkedin-demo/`
- Header.js at `linkedin-demo/src/components/header/Header.js` — search input is at line ~69, inside `.header__logo` div
- Header Style.js at `linkedin-demo/src/components/header/Style.js`
- posts.ts at `linkedin-demo/src/convex/posts.ts` — add searchPosts query
- users.ts at `linkedin-demo/src/convex/users.ts` — add searchUsers query
- Header already receives `onNavigateProfile` prop for navigating to profiles
- Convex doesn't have built-in full-text search, so use collect() + filter with .toLowerCase().includes() — fine for demo scale
- Green colors: primary #2e7d32, light #66bb6a

## Loop Control
STOP
