# UnderItAll Unified App - Design Guidelines

## Design Approach

**Reference-Based Approach**: Drawing inspiration from Linear (clean forms, modern UI), Shopify's Polaris (admin consistency), and Intercom (chat interface), adapted for the trade-focused, premium rug pad industry.

**Design Principles**:
- Professional trade aesthetic with confident, modern sensibility
- Seamless integration between admin, storefront, and chat experiences
- Brand-first design using UnderItAll's established identity
- Accessibility and clarity for busy design professionals

---

## Core Design Elements

### A. Color Palette

**Primary Colors**:
- **Rorange** `15 87% 59%` - Primary CTAs, active states, brand accents
- **Soft Black** `231 5% 14%` - Primary text, headers
- **Felt Gray** `240 3% 42%` - Secondary text, borders, disabled states

**Neutral Backgrounds**:
- **Cream** `48 21% 95%` - Main backgrounds, cards (light mode)
- **Greige** `60 5% 88%` - Subtle backgrounds, dividers
- **White** `0 0% 100%` - Form fields, elevated surfaces

**Dark Mode** (for chat interface):
- Background: `231 10% 12%`
- Surface: `231 8% 18%`
- Text: `0 0% 95%`

### B. Typography

**Font Stack**:
- Headlines: `'Archivo', sans-serif` - 700 weight for H1/H2, 600 for H3
- Accent/Features: `'Lora', serif` - Italic, 400 weight
- Body/Forms: `'Vazirmatn', sans-serif` - 400 regular, 500 medium

**Type Scale**:
- H1: 48px/56px (forms/pages), 36px/42px (mobile)
- H2: 32px/40px, 600 weight
- H3: 20px/28px, 600 weight
- Body: 16px/24px
- Small: 14px/20px
- Caption: 12px/16px

### C. Layout System

**Spacing Primitives**: Use only `8px`, `12px`, `16px`, `24px`, `32px`, `48px` increments
- Form field gaps: `16px`
- Section padding: `32px` desktop, `24px` mobile
- Card padding: `24px`
- Component margins: `8px` (tight), `16px` (standard), `32px` (generous)

**Container Widths**:
- Admin panels: `max-w-7xl` (1280px)
- Forms: `max-w-2xl` (672px)
- Calculator: `max-w-4xl` (896px)
- Chat: Fixed `384px` width

### D. Component Library

**Form Components**:
- Input fields: `h-12`, rounded `16px`, border `Greige`, focus ring `Rorange`
- Labels: 14px, 500 weight, `Soft Black`, 8px bottom margin
- Select dropdowns: Match input styling with chevron icon
- Radio/checkbox: Custom styled with `Rorange` active state

**Buttons**:
- Primary: `bg-Rorange`, white text, rounded `16px`, py-3 px-6, 600 weight
- Secondary: `bg-Felt Gray`, white text, same sizing
- Outline: Border `Soft Black`, transparent bg, hover bg `Greige`
- Disabled: 40% opacity

**Cards**:
- Background: `White`
- Border: 1px `Greige`
- Rounded: `22px` (large cards), `16px` (standard)
- Shadow: `0 4px 12px rgba(105, 106, 109, 0.08)`

**Navigation**:
- Admin sidebar: 240px width, `Soft Black` background, white text
- Active state: `Rorange` left border (4px), subtle bg highlight
- Storefront header: Transparent overlay on hero, sticky with backdrop blur

### E. Animation Guidelines

**Minimal, Purposeful Motion**:
- Form field focus: 150ms ease-out border color transition
- Button hover: 200ms ease transform scale(1.02)
- Chat bubble entry: 300ms ease slide-up + fade
- Calculator real-time updates: Instant (no animation)
- Modal overlays: 250ms ease backdrop + scale

**No Animations**:
- Price calculations (instant feedback)
- Form validation (immediate display)
- Data table sorting
- Admin panel navigation

---

## Feature-Specific Guidelines

### 1. Wholesale Registration Form

**Layout**: Single-column centered form, `max-w-2xl`, generous vertical spacing

**Structure**:
- Hero section (100vh on desktop, auto on mobile):
  - Background: Subtle gradient `Cream` to `Greige`
  - Headline: "Join Our Trade Program" - Archivo 48px
  - Subhead: "Custom perforated rug pads for design professionals" - Lora Italic 20px
  - Visual: Abstract perforated pattern graphic (subtle, top-right)

- Form sections with clear headers:
  1. Business Information (firm name, contact)
  2. Credentials (license/certification upload)
  3. Account Setup (email, password)
  4. Terms & Preferences

**Form Field Design**:
- Full-width inputs with consistent 16px gaps
- Inline validation with checkmark/error icons
- File upload: Dashed border card, drag-drop zone
- Password strength meter: Horizontal bar below field
- Submit CTA: Full-width `Rorange` button, "Submit Application"

**Success State**: 
- Checkmark animation in `Rorange`
- "Application Submitted" message
- Next steps timeline with numbered badges

### 2. Rug Pad Calculator

**Layout**: Two-column on desktop (form left, quote preview right), stacked on mobile

**Left Column - Input Form**:
- Sticky at top on scroll
- Grouped sections with subtle `Greige` backgrounds:
  - Dimensions (Width, Length with ft/in inputs)
  - Product Options (Thickness radio, Shape radio with icons)
  - Quantity stepper
  - Project Details (collapsible accordion)

**Right Column - Live Quote Preview**:
- Sticky card with prominent total price
- Hierarchy:
  - Total: 36px, `Rorange`, 700 weight
  - Breakdown: 16px list with icons (📐 dimensions, 📏 area, 💰 price/sqft)
  - Features: Lora Italic, 14px, `Felt Gray`
  - CTA: "Add to Cart" full-width `Rorange` button

**Product Variant Selection**:
- Thickness: Large radio cards (2-column grid)
  - Icons for Lite/Standard with product images
  - Active state: `Rorange` border (2px)
- Shape: 4-column grid of icon buttons
  - Rectangle, Square, Round, Free Form
  - SVG icons, 48px size

**Dimension Inputs**:
- Side-by-side width/length
- Increment/decrement buttons (± styled)
- Live validation (2-40 ft range)
- Unit display "feet" in `Felt Gray`

### 3. AI Chat Assistant

**Chat Bubble (Closed State)**:
- Fixed bottom-right: 24px from edge
- Circular: 64px diameter
- Background: `Rorange` with subtle shadow
- Icon: Message bubble in white, 24px
- Hover: Scale 1.05, deeper shadow

**Chat Window (Open State)**:
- Size: 384px width × 600px height
- Position: Bottom-right corner, 24px margins
- Border radius: `22px`
- Shadow: `0 8px 32px rgba(0, 0, 0, 0.16)`

**Chat Header**:
- Padding: 20px
- Background: `Rorange`
- Text: White, "UnderItAll Assistant", 16px 600 weight
- Minimize/close buttons: White icons, right-aligned

**Message Area**:
- Background: `White` (light mode), `231 10% 12%` (dark mode)
- Padding: 16px
- Scroll: Smooth, hide scrollbar on desktop

**Message Bubbles**:
- User messages: 
  - Right-aligned, `Rorange` background, white text
  - Rounded: `16px` with tail
- AI messages:
  - Left-aligned, `Greige` background, `Soft Black` text
  - Rounded: `16px` with tail
- Spacing: 8px between messages, 16px between conversation groups

**Product Cards in Chat**:
- Horizontal layout: Image left (80px), details right
- Border: 1px `Greige`, rounded `12px`
- Quick action buttons: "Add to Cart" small `Rorange` button
- Hover: Subtle shadow increase

**Input Field**:
- Background: `White`
- Border top: 1px `Greige`
- Height: 56px
- Placeholder: "Ask about rug pads..."
- Send button: `Rorange` circle, paper plane icon

### 4. Admin Dashboard

**Layout**: Sidebar + main content area

**Sidebar** (240px):
- Background: `Soft Black`
- Logo area: 64px height, `Rorange` accent
- Navigation items: 48px height, white text with icons
- Active: `Rorange` 4px left border + `Felt Gray` bg

**Main Content**:
- Header bar: Breadcrumbs, search, user menu
- Stats cards: 4-column grid
  - Icon in `Rorange`, large number (32px), label below
  - White background, subtle shadow
- Data tables: Zebra striping with `Cream`/`White`
- Action buttons: Top-right, `Rorange` primary

**Registration Management**:
- List view with status badges (Pending/Approved/Rejected)
- Filter tabs across top
- Approval modal: Center-aligned, 560px width, form for notes

**Calculator Analytics**:
- Charts: Line graphs for usage over time
- Color scheme: `Rorange` primary line, `Felt Gray` secondary
- Popular dimensions: Horizontal bar chart
- Export button: Outline style, top-right

---

## Responsive Behavior

**Breakpoints**:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Mobile Adaptations**:
- Calculator: Stack columns, sticky quote at bottom
- Chat: Full screen overlay (not floating window)
- Admin: Hamburger menu, collapsible sidebar
- Forms: Full-width inputs, increased touch targets (48px min)
- Typography: Scale down 1 size (H1 → 36px, Body → 14px)

---

## Images & Graphics

**Calculator Hero Section**:
- Full-width background: Close-up texture of felt rug pad (perforated pattern visible)
- Overlay: Semi-transparent `Cream` (70% opacity) for text readability
- Placement: Top of calculator page, 60vh height

**Registration Page**:
- Abstract geometric pattern: Perforated circles in `Greige` on `Cream`
- Placement: Top-right corner, decorative element (not full hero)

**Product Variant Images**:
- Felt textures for each shape (Rectangle, Round, Square, Free Form)
- Size: 720×720px, rounded `12px`
- Used in: Calculator variant selection, chat product cards

**No hero images for**: Admin dashboard, chat interface (functional focus)

---

## Accessibility Standards

- WCAG 2.1 AA minimum (all color contrasts meet 4.5:1 for text)
- Keyboard navigation: Full support, visible focus rings (`Rorange` 2px)
- Screen readers: Proper ARIA labels on all form fields and interactive elements
- Form validation: Inline errors with icons + text (not color alone)
- Touch targets: 48px minimum for mobile