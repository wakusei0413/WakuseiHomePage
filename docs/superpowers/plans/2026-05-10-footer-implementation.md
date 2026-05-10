# Footer Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-viewport footer as the second screen below the hero, with LINKS and SOCIALS columns on a dark navy background.

**Architecture:** SolidJS component (`Footer.tsx`) placed in `HomepageApp.tsx` inside the `.blog-content` section. Config-driven links via `footer.links[]` in `customize.ts`. CSS in a dedicated `footer.css` file. Theme-aware via CSS variables.

**Tech Stack:** SolidJS, Astro, TypeScript, Zod, CSS custom properties

---

### Task 1: Update TypeScript types

**Files:**
- Modify: `src/types/site.ts:63-65`

- [ ] **Step 1: Add FooterLink interface and update FooterConfig**

```typescript
// src/types/site.ts - add before FooterConfig
export interface FooterLink {
    name: string;
    href: string;
}

// Update FooterConfig (line 63-65)
export interface FooterConfig {
    text: string;
    links: FooterLink[];
}
```

- [ ] **Step 2: Run typecheck to verify**

Run: `npm run check`
Expected: PASS (no type errors)

---

### Task 2: Update Zod schema

**Files:**
- Modify: `src/data/schema.ts:74-76`

- [ ] **Step 1: Add footerLinkSchema and update footer schema**

```typescript
// src/data/schema.ts - add before siteConfigSchema
const footerLinkSchema = z.object({
    name: z.string().min(1),
    href: z.string().min(1)
});

// Update footer schema in siteConfigSchema (line 74-76)
footer: z.object({
    text: z.string().min(1),
    links: z.array(footerLinkSchema)
}),
```

- [ ] **Step 2: Run typecheck to verify**

Run: `npm run check`
Expected: PASS

---

### Task 3: Update config data

**Files:**
- Modify: `src/data/customize.ts:70-72`

- [ ] **Step 1: Add footer links to editableSiteConfig**

```typescript
// src/data/customize.ts - update footer section
footer: {
    text: '© 2026 遊星 Wakusei',
    links: [
        { name: 'Blog', href: 'https://blog.wakusei.top/' },
        { name: 'Status', href: 'https://status.wakusei.top/' },
        { name: 'Testing', href: 'https://testing.wakusei.top/' },
        { name: 'GitHub', href: 'https://github.com/wakusei0413' }
    ]
},
```

- [ ] **Step 2: Run typecheck to verify**

Run: `npm run check`
Expected: PASS

---

### Task 4: Add i18n translations

**Files:**
- Modify: `src/data/i18n.ts`

- [ ] **Step 1: Add footer translations to all locales**

```typescript
// src/data/i18n.ts - add to 'zh-CN' object
'footer.links': '链接',
'footer.socials': '社交',

// add to en object
'footer.links': 'Links',
'footer.socials': 'Socials',

// add to ja object
'footer.links': 'リンク',
'footer.socials': 'ソーシャル',
```

- [ ] **Step 2: Run typecheck to verify**

Run: `npm run check`
Expected: PASS

---

### Task 5: Create Footer CSS

**Files:**
- Create: `src/styles/footer.css`

- [ ] **Step 1: Write footer.css with full styling**

```css
/* ========================================
   Footer - Second screen below hero
   ======================================== */

.site-footer {
    min-height: 100vh;
    background-color: #0b1120;
    color: #e2e8f0;
    font-family: var(--font-ui, 'Inter', 'Noto Sans SC', sans-serif);
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 4rem 3rem;
    position: relative;
}

.site-footer a {
    color: #94a3b8;
    text-decoration: none;
    transition: color 0.2s ease;
}

.site-footer a:hover {
    color: #ffffff;
}

/* Main content area - two columns */
.footer-main {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 4rem;
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
}

/* Links column */
.footer-section-title {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 1.5rem;
}

.footer-links {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.footer-links li a {
    font-size: 1rem;
    color: #cbd5e1;
    display: inline-block;
    transition: color 0.2s ease, transform 0.2s ease;
}

.footer-links li a:hover {
    color: #ffffff;
    transform: translateX(4px);
}

/* Socials column */
.footer-socials {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.footer-social-icons {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
}

.footer-social-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #94a3b8;
    text-decoration: none;
    transition: all 0.2s ease;
    font-size: 1.25rem;
}

.footer-social-icon:hover {
    border-color: rgba(255, 255, 255, 0.3);
    color: #ffffff;
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-2px);
}

/* Divider */
.footer-divider {
    height: 1px;
    background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.1) 20%,
        rgba(255, 255, 255, 0.1) 80%,
        transparent
    );
    margin: 3rem 0;
    max-width: 1200px;
    width: 100%;
    margin-left: auto;
    margin-right: auto;
}

/* Copyright bar */
.footer-bottom {
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
}

.footer-copyright {
    font-size: 0.875rem;
    color: #64748b;
}

.footer-tagline {
    font-size: 0.875rem;
    color: #475569;
}

/* Responsive */
@media (max-width: 768px) {
    .site-footer {
        padding: 3rem 1.5rem;
    }

    .footer-main {
        grid-template-columns: 1fr;
        gap: 2.5rem;
    }

    .footer-social-icons {
        grid-template-columns: repeat(4, 1fr);
    }

    .footer-bottom {
        flex-direction: column;
        text-align: center;
    }
}

/* Light theme adjustments */
[data-theme='light'] .site-footer {
    background-color: #0f172a;
}
```

- [ ] **Step 2: Import footer.css in BaseLayout.astro**

Add to `src/layouts/BaseLayout.astro` after the other CSS imports (line 8):
```astro
import '../styles/footer.css';
```

- [ ] **Step 3: Run typecheck to verify**

Run: `npm run check`
Expected: PASS

---

### Task 6: Create Footer component

**Files:**
- Create: `src/components/Footer.tsx`

- [ ] **Step 1: Write Footer.tsx component**

```typescript
import type { FooterLink, SocialLink } from '../types/site';
import { Icon } from './Icon';

interface FooterProps {
    links: FooterLink[];
    socialLinks: SocialLink[];
    copyrightText: string;
}

export function Footer(props: FooterProps) {
    return (
        <footer class="site-footer">
            <div class="footer-main">
                <div class="footer-links-section">
                    <h3 class="footer-section-title">Links</h3>
                    <ul class="footer-links">
                        {props.links.map((link) => (
                            <li>
                                <a href={link.href} target="_blank" rel="noopener noreferrer">
                                    {link.name}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>

                <div class="footer-socials">
                    <h3 class="footer-section-title">Socials</h3>
                    <div class="footer-social-icons">
                        {props.socialLinks.map((link) => (
                            <a
                                href={link.url}
                                class="footer-social-icon"
                                aria-label={link.name}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={link.name}
                            >
                                {link.icon ? <Icon name={link.icon} size="1.25rem" /> : link.name.charAt(0)}
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            <div class="footer-divider"></div>

            <div class="footer-bottom">
                <span class="footer-copyright">{props.copyrightText}</span>
                <span class="footer-tagline">Stay hydrated</span>
            </div>
        </footer>
    );
}
```

- [ ] **Step 2: Run typecheck to verify**

Run: `npm run check`
Expected: PASS

---

### Task 7: Integrate Footer into HomepageApp

**Files:**
- Modify: `src/components/HomepageApp.tsx:253-259`

- [ ] **Step 1: Import Footer component**

Add to imports at the top of `HomepageApp.tsx`:
```typescript
import { Footer } from './Footer';
```

- [ ] **Step 2: Replace blog-content placeholder with Footer**

Replace lines 253-259:
```tsx
<div class="blog-content">
    <Footer
        links={siteConfig.footer.links}
        socialLinks={siteConfig.socialLinks.links}
        copyrightText={siteConfig.footer.text}
    />
</div>
```

- [ ] **Step 3: Run typecheck to verify**

Run: `npm run check`
Expected: PASS

---

### Task 8: Update blog-content CSS

**Files:**
- Modify: `src/styles/layout.css` (append at end)

- [ ] **Step 1: Add blog-content styling for second screen**

```css
/* ===== Blog Content / Second Screen ===== */
.blog-content {
    min-height: 100vh;
    position: relative;
    z-index: var(--z-content, 50);
}
```

- [ ] **Step 2: Run typecheck and lint to verify**

Run: `npm run check && npm run lint`
Expected: PASS

---

### Task 9: Run full verification

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 2: Run format check**

Run: `npm run format:check`
Expected: PASS

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: PASS, output in `dist/`

- [ ] **Step 5: Run dev server and visually verify**

Run: `npm run dev`
Open http://localhost:4321, scroll down to see the footer

---

### Task 10: Commit changes

- [ ] **Step 1: Stage and commit all changes**

```bash
git add src/types/site.ts src/data/schema.ts src/data/customize.ts src/data/i18n.ts src/styles/footer.css src/components/Footer.tsx src/components/HomepageApp.tsx src/layouts/BaseLayout.astro src/styles/layout.css
git commit -m "feat: add footer component as second screen with links and socials"
```
