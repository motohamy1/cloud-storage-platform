# Design System

## Theme

The application supports a light and dark theme through `next-themes`. The current product direction is light-first, with an explicit red brand accent and dark-mode support for user preference.

## Color

- Primary background: `hsl(var(--background))`
- Primary surface: `hsl(var(--card))`
- Brand accent: `#8B0000`
- Brand highlight: `#FF6B6B`
- Muted content: `hsl(var(--muted-foreground))`
- Borders: `hsl(var(--border))`
- Dark background: `hsl(225 33% 5%)`

## Typography

Poppins is the primary UI family. Use compact product scale: body 14px/20px, labels 14px/20px, section headings 18px/20px, and larger page headings 20px/28px.

## Layout

The app uses a fixed desktop sidebar with a responsive mobile navigation, a top search and action bar, and a two-column dashboard at larger breakpoints. Cards should remain compact and use a restrained surface treatment.

## Components

- Buttons use the existing brand red and rounded action shape.
- Forms use the existing shadcn form primitives.
- File and folder surfaces use `bg-background`, subtle borders, and existing radius tokens.
- Use `file-*-light.svg` assets for the original light dashboard treatment.

## Motion

Use short ease-out transitions for hover, focus, and state changes. Respect reduced-motion preferences.
