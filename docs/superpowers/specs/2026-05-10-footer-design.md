# Footer Component Design

## Overview

Add a full-viewport footer as the second screen below the hero section. The footer appears when users scroll down from the hero. It uses a dark navy background with a two-column layout (LINKS + SOCIALS) and a copyright bar.

## Visual Reference

Based on the Hyprland website footer layout:
- Dark navy background (`#0b1120` or similar)
- Two main columns: LINKS (left) and SOCIALS (right)
- Horizontal divider before the copyright bar
- Copyright text at the bottom

## Component: `Footer.tsx`

### Structure

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  LINKS                       SOCIALS                │
│  ────                        ───────                │
│  Blog (href)                 [icon] [icon]          │
│  Settings (href)             [icon] [icon]          │
│  ...                                                │
│                                                     │
│  ──────────────────────────────────────────────────  │
│  © 2026 遊星 Wakusei                                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Props

```typescript
interface FooterProps {
    links: FooterLink[];
    socialLinks: SocialLink[];
    copyrightText: string;
}
```

### Behavior

- Purely presentational, no interactive state
- LINKS section: vertical list of text links
- SOCIALS section: grid of icon buttons (reuses SocialLinks icon styling)
- Responsive: columns stack on mobile (< 768px)

## Config Changes

### `types/site.ts`

Add to `FooterConfig`:
```typescript
export interface FooterLink {
    name: string;
    href: string;
}

export interface FooterConfig {
    text: string;
    links: FooterLink[];
}
```

### `customize.ts`

Update `footer`:
```typescript
footer: {
    text: '© 2026 遊星 Wakusei',
    links: [
        { name: 'Blog', href: 'https://blog.wakusei.top/' },
        { name: 'Status', href: 'https://status.wakusei.top/' },
        { name: 'Testing', href: 'https://testing.wakusei.top/' },
        { name: 'GitHub', href: 'https://github.com/wakusei0413' }
    ]
}
```

## i18n Additions

Add to `src/data/i18n.ts`:
- `footer.links` — "链接" / "Links" / "リンク"
- `footer.socials` — "社交" / "Socials" / "ソーシャル"

## CSS: `src/styles/footer.css`

- `.site-footer` — full viewport height, dark background, flex layout
- `.footer-main` — two-column grid
- `.footer-links` — left column, vertical link list
- `.footer-socials` — right column, icon grid
- `.footer-bottom` — copyright bar with top border
- Responsive breakpoint at 768px

## Placement

1. **Homepage**: Add `<Footer>` inside `.blog-content` in `HomepageApp.tsx`
2. **Other pages**: Add `<Footer>` to `BaseLayout.astro` (wrapped in a client:load container or as static HTML fallback)

Since the footer is a SolidJS component and needs `siteConfig` data, it will be included in `HomepageApp.tsx` for the homepage. For other pages (404, future pages), a simplified static HTML version will be rendered in `BaseLayout.astro`.

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/Footer.tsx` | Create |
| `src/styles/footer.css` | Create |
| `src/types/site.ts` | Modify (add FooterLink, update FooterConfig) |
| `src/data/customize.ts` | Modify (add footer.links) |
| `src/data/site.ts` | Modify (update schema if Zod validation exists) |
| `src/data/i18n.ts` | Modify (add footer translations) |
| `src/components/HomepageApp.tsx` | Modify (include Footer) |
| `src/layouts/BaseLayout.astro` | Modify (include static footer for non-homepage) |
