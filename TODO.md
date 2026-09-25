# Task Progress: Red Rose Theme & Dark Mode

✅ 1. Install next-themes dependency
✅ 2. Update tailwind.config.ts with new brand colors (red rose)
✅ 3. Add CSS custom properties to app/globals.css for shadcn dark mode
✅ 4. Create components/providers.tsx with ThemeProvider
✅ 5. Update app/layout.tsx to use ThemeProvider
✅ 6. Add theme toggle to components/Header.tsx (and MobileNavigation)
✅ 7. Test and verify light/dark toggle with red rose accents

**Dark mode complete.** Toggle lives in the header (desktop) and mobile nav sheet; the palette tokens (light-100..400, dark-100..200) map to CSS variables so both themes work.

# Platform Upgrade Roadmap

Tracked separately:

- ✅ P0 correctness (search, query/sort, sharing schema, middleware, error states)
- ✅ Folders, trash, starred, quota, share links, bulk select/move/delete
- ✅ Password reset, upload progress + retry, in-browser previews, dark mode
- ⬜ Email verification (needs an email provider)
- ⬜ Version history, AI features, tests + security hardening
