# Design Spec: Navigation Bar Redesign (Full-width Top Bar)

## 1. Goal
Transform the existing floating "capsule" dock into a full-width navigation bar "hung" at the top of the right-side content area, as per user visual request.

## 2. Architecture & Components
### 2.1 CSS Changes (src/styles/dock.css)
- **.nav-dock**: 
    - Change position from absolute top-right to full-width top.
    - Remove ight: 20px; top: 20px;.
    - Set 	op: 0; left: 0; right: 0;.
    - Set width: 100%; (relative to its parent container).
    - Set order-radius: 0;.
    - Adjust ackground: Darker semi-transparent glass (gba(0, 0, 0, 0.4) in dark mode).
    - Adjust order: Remove all borders except order-bottom.
    - Set justify-content: flex-end; to keep items on the right.
- **.nav-dock-item**:
    - Ensure margins/padding align with a bar-style layout.

### 2.2 Component Changes (src/components/NavigationDock.tsx)
- Ensure the container correctly hosts the flex layout for right-aligned items.
- Verify if any JS-based positioning (like the popup) needs adjustment due to the layout change.

## 3. Visual Design (Aesthetics)
- **Glassmorphism**: Maintain high blur (40px) but increase darkness for a "solid" bar feel.
- **Hung Effect**: The bar should look like it's part of the viewport's top edge.

## 4. Responsive Strategy
- Only apply the full-width bar to the desktop view (screen width > 900px).
- Existing mobile styles (hidden or sidebar) remain untouched to avoid breaking the mobile UX.

## 5. Verification Plan
- **Visual Check**: Open in browser, verify bar spans the width of the right panel and items are right-aligned.
- **Interaction Check**: Hover effects (magnify) should still work smoothly.
- **Theme Check**: Verify light/dark mode transitions still look integrated.
