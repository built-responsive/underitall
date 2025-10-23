
# UnderItAll Brand & Design System

**Version:** 2.0  
**Last Updated:** January 2025

---

## Brand DNA

### Core Values

- **WE PROMISE**: Deep commitment and truth-first transparency
- **WE CONNECT**: Elevating experience, product, and people
- **WE VENTURE**: Venturing boldly to improve, not settle

### Brand Positioning

- To-the-trade only (closed for credentialed designers)
- Elevated experience & peace of mind
- Scissorless, perforated rug pads as hero product

### Mission

**A pad for every rug.**

### Brand Essence

- **Personality:** Confident, Open, Venturous
- **Tone:** Forthright, Engaging, Unconventional
- **Archetype:** Benevolent Outlaw

---

## Target Audience: "Creator Kate"

- Interior designers, often women aged 40–55
- Creative, decisive, love exclusivity
- Prefer unique, "not for everyone" products

---

## Messaging

### Primary Headlines

- Rug pads have never been easier.
- Rug pads reinvented.
- Perforated rug pads for a scissorless install.

### Secondary Headlines

- Custom perforated rug pads. Made for designers.
- A brilliant new standard in rug pads.

### Supporting Copy

- Custom cut with perforated edges for a precise, scissorless install.
- Fast, easy, and oddly satisfying.

---

## Design Approach

**Reference-Based Approach**: Drawing inspiration from Linear (clean forms, modern UI), Shopify's Polaris (admin consistency), and Intercom (chat interface), adapted for the trade-focused, premium rug pad industry.

**Design Principles**:
- Professional trade aesthetic with confident, modern sensibility
- Seamless integration between admin, storefront, and chat experiences
- Brand-first design using UnderItAll's established identity
- Accessibility and clarity for busy design professionals

---

## Visual Identity

### Logo

- **Primary:** Felt Gray, perforated accents, modern/industrial
- **Secondary:** Cream
- **Tagline:** "CUSTOM PERFORATED RUG PADS"
- **Icon:** "UA" integration, Rorange accent

### Typography

**Font Stack**:
- **Archivo** - Headlines (700 weight for H1/H2, 600 for H3)
- **Lora Italic** - Accent text, features, and supporting copy
- **Vazirmatn** - Body text, forms, labels

**Type Scale**:
- **H1:** 48px/56px (forms/pages), 36px/42px (mobile) — Archivo 700
- **H2:** 32px/40px — Archivo 600
- **H3:** 20px/28px — Archivo 600
- **Body:** 16px/24px — Vazirmatn 400
- **Small:** 14px/20px — Vazirmatn 400
- **Caption:** 12px/16px — Vazirmatn 400
- **Accent:** Lora Italic 400

### Color Palette

| Name       | HEX     | HSL             | Usage                                |
|------------|---------|-----------------|--------------------------------------|
| Rorange    | #F2633A | 15 87% 59%      | Primary CTAs, active states, accents |
| Greige     | #E1E0DA | 60 5% 88%       | Neutral warmth, dividers, subtle bg  |
| Felt Gray  | #696A6D | 240 3% 42%      | Secondary text, borders, disabled    |
| Soft Black | #212227 | 231 5% 14%      | Primary text, headers, contrast      |
| Cream      | #F3F1E9 | 48 21% 95%      | Main backgrounds, cards (light mode) |
| White      | #FFFFFF | 0 0% 100%       | Form fields, elevated surfaces       |

**Dark Mode** (for chat interface):
- Background: `231 10% 12%`
- Surface: `231 8% 18%`
- Text: `0 0% 95%`

### Layout System

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

### Design Elements

**Border Radius:**
- Small: `11px`
- Medium/Standard: `16px`
- Large: `22px`

**Shadows:**
- Standard: `0 4px 12px rgba(105, 106, 109, 0.08)`
- Elevated: `0 8px 32px rgba(0, 0, 0, 0.16)` (chat window)

---

## Component Library

### Form Components

**Input fields:**
- Height: `h-12` (48px)
- Rounded: `16px`
- Border: `Greige` (#E1E0DA)
- Focus ring: `Rorange` (#F2633A), 2px
- Transition: 150ms ease-out

**Labels:**
- Size: 14px
- Weight: 500
- Color: `Soft Black`
- Bottom margin: 8px

**Select dropdowns:**
- Match input styling
- Chevron icon right-aligned

**Radio/Checkbox:**
- Custom styled with `Rorange` active state

### Buttons

**Primary:**
- Background: `Rorange` (#F2633A)
- Text: White
- Rounded: `16px`
- Padding: py-3 px-6
- Weight: 600
- Hover: Scale 1.02, 200ms ease

**Secondary:**
- Background: `Felt Gray` (#696A6D)
- Text: White
- Same sizing as primary

**Outline:**
- Border: `Soft Black`
- Background: Transparent
- Hover background: `Greige`

**Disabled:**
- Opacity: 40%

### Cards

**Standard:**
- Background: `White`
- Border: 1px `Greige`
- Rounded: `22px` (large cards), `16px` (standard)
- Shadow: `0 4px 12px rgba(105, 106, 109, 0.08)`
- Padding: `24px`

### Navigation

**Admin sidebar:**
- Width: 240px
- Background: `Soft Black`
- Text: White
- Active state: `Rorange` 4px left border + subtle bg highlight

**Storefront header:**
- Transparent overlay on hero
- Sticky with backdrop blur

### Animation Guidelines

**Minimal, Purposeful Motion:**
- Form field focus: 150ms ease-out border color transition
- Button hover: 200ms ease transform scale(1.02)
- Chat bubble entry: 300ms ease slide-up + fade
- Calculator real-time updates: Instant (no animation)
- Modal overlays: 250ms ease backdrop + scale

**No Animations:**
- Price calculations (instant feedback)
- Form validation (immediate display)
- Data table sorting
- Admin panel navigation

---

## Product Information

### Product Types

1. **Luxe Lite ⅛" (Thin)**
   - Thinner profile
   - Ideal for low-pile rugs
   - Lighter weight

2. **Luxe ¼" (Thick)**
   - Standard thickness
   - Best for most applications
   - Enhanced cushioning

### Key Features

- Custom cut with perforated edges
- Scissorless installation
- 100% recycled materials
- Latex-free
- Trade-only access
- Same-day shipping available

### Shapes Available

- Rectangle
- Square
- Round
- Free Form

---

## Feature-Specific Guidelines

### 1. Wholesale Registration Form

**Layout**: Single-column centered form, `max-w-2xl`, generous vertical spacing

**Structure:**
- **Hero section** (100vh on desktop, auto on mobile):
  - Background: Subtle gradient `Cream` to `Greige`
  - Headline: "Join Our Trade Program" — Archivo 48px
  - Subhead: "Custom perforated rug pads for design professionals" — Lora Italic 20px
  - Visual: Abstract perforated pattern graphic (subtle, top-right)

- **Form sections** with clear headers:
  1. Business Information (firm name, contact)
  2. Credentials (license/certification upload)
  3. Account Setup (email, password)
  4. Terms & Preferences

**Form Field Design:**
- Full-width inputs with consistent 16px gaps
- Inline validation with checkmark/error icons
- File upload: Dashed border card, drag-drop zone
- Password strength meter: Horizontal bar below field
- Submit CTA: Full-width `Rorange` button, "Submit Application"

**Success State:**
- Checkmark animation in `Rorange`
- "Application Submitted" message
- Next steps timeline with numbered badges

### 2. Rug Pad Calculator

**Layout**: Two-column on desktop (form left, quote preview right), stacked on mobile

**Left Column - Input Form:**
- Sticky at top on scroll
- Grouped sections with subtle `Greige` backgrounds:
  - Dimensions (Width, Length with ft/in inputs)
  - Product Options (Thickness radio, Shape radio with icons)
  - Quantity stepper
  - Project Details (collapsible accordion)

**Right Column - Live Quote Preview:**
- Sticky card with prominent total price
- Hierarchy:
  - Total: 36px, `Rorange`, 700 weight
  - Breakdown: 16px list with icons (📐 dimensions, 📏 area, 💰 price/sqft)
  - Features: Lora Italic, 14px, `Felt Gray`
  - CTA: "Add to Cart" full-width `Rorange` button

**Product Variant Selection:**
- **Thickness:** Large radio cards (2-column grid)
  - Icons for Lite/Standard with product images
  - Active state: `Rorange` border (2px)
- **Shape:** 4-column grid of icon buttons
  - Rectangle, Square, Round, Free Form
  - SVG icons, 48px size

**Dimension Inputs:**
- Side-by-side width/length
- Increment/decrement buttons (± styled)
- Live validation (2-40 ft range)
- Unit display "feet" in `Felt Gray`

### 3. AI Chat Assistant

**Chat Bubble (Closed State):**
- Fixed bottom-right: 24px from edge
- Circular: 64px diameter
- Background: `Rorange` with subtle shadow
- Icon: Message bubble in white, 24px
- Hover: Scale 1.05, deeper shadow

**Chat Window (Open State):**
- Size: 384px width × 600px height
- Position: Bottom-right corner, 24px margins
- Border radius: `22px`
- Shadow: `0 8px 32px rgba(0, 0, 0, 0.16)`

**Chat Header:**
- Padding: 20px
- Background: `Rorange`
- Text: White, "UnderItAll Assistant", 16px 600 weight
- Minimize/close buttons: White icons, right-aligned

**Message Area:**
- Background: `White` (light mode), `231 10% 12%` (dark mode)
- Padding: 16px
- Scroll: Smooth, hide scrollbar on desktop

**Message Bubbles:**
- **User messages:**
  - Right-aligned, `Rorange` background, white text
  - Rounded: `16px` with tail
- **AI messages:**
  - Left-aligned, `Greige` background, `Soft Black` text
  - Rounded: `16px` with tail
- Spacing: 8px between messages, 16px between conversation groups

**Product Cards in Chat:**
- Horizontal layout: Image left (80px), details right
- Border: 1px `Greige`, rounded `12px`
- Quick action buttons: "Add to Cart" small `Rorange` button
- Hover: Subtle shadow increase

**Input Field:**
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

**Main Content:**
- Header bar: Breadcrumbs, search, user menu
- Stats cards: 4-column grid
  - Icon in `Rorange`, large number (32px), label below
  - White background, subtle shadow
- Data tables: Zebra striping with `Cream`/`White`
- Action buttons: Top-right, `Rorange` primary

**Registration Management:**
- List view with status badges (Pending/Approved/Rejected)
- Filter tabs across top
- Approval modal: Center-aligned, 560px width, form for notes

**Calculator Analytics:**
- Charts: Line graphs for usage over time
- Color scheme: `Rorange` primary line, `Felt Gray` secondary
- Popular dimensions: Horizontal bar chart
- Export button: Outline style, top-right

---

## Responsive Behavior

**Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Mobile Adaptations:**
- Calculator: Stack columns, sticky quote at bottom
- Chat: Full screen overlay (not floating window)
- Admin: Hamburger menu, collapsible sidebar
- Forms: Full-width inputs, increased touch targets (48px min)
- Typography: Scale down 1 size (H1 → 36px, Body → 14px)

---

## Images & Graphics

### Calculator Hero Section
- Full-width background: Close-up texture of felt rug pad (perforated pattern visible)
- Overlay: Semi-transparent `Cream` (70% opacity) for text readability
- Placement: Top of calculator page, 60vh height

### Registration Page
- Abstract geometric pattern: Perforated circles in `Greige` on `Cream`
- Placement: Top-right corner, decorative element (not full hero)

### Product Variant Images
- Felt textures for each shape (Rectangle, Round, Square, Free Form)
- Size: 720×720px, rounded `12px`
- Used in: Calculator variant selection, chat product cards

### No Hero Images For
- Admin dashboard
- Chat interface (functional focus)

---

## Brand Assets

### Available Assets

Located in `client/public/brand/`:

- `felt-texture.jpg` — Felt texture background
- `luxe-lite.png` — Luxe Lite (⅛") product image
- `luxe-thick.png` — Luxe (¼") product image
- `uia-icon.png` — UnderItAll perforated icon
- `logo-black.png` — Full UnderItAll logo (black)
- `logo-main.png` — Main UnderItAll logo
- `rectangle.png`, `square.png`, `round.png`, `freeform.png` — Shape icons

### Usage Guidelines

- Use felt texture as background element for warmth
- Display product images for thickness selection
- Include perforated icon in branding elements
- Use logo in header/footer with proper spacing

---

## Voice & Tone

### Voice Characteristics

- **Confident** but not arrogant
- **Professional** but approachable
- **Innovative** but not gimmicky
- **Exclusive** but not elitist

### Tone in Calculator

- Clear and directive
- Helpful and informative
- Reassuring about custom orders
- Emphasize ease and convenience

---

## Accessibility Standards

- **WCAG 2.1 AA compliance** minimum
- Sufficient color contrast (4.5:1 for text)
- Keyboard navigation support with visible focus rings (`Rorange` 2px)
- Screen reader compatibility with proper ARIA labels
- Form validation: Inline errors with icons + text (not color alone)
- Touch targets: 48px minimum for mobile
- Clear focus indicators on all interactive elements

---

## Usage Guidelines

### Do's

✓ Use brand colors consistently  
✓ Maintain typography hierarchy  
✓ Keep layouts clean and spacious  
✓ Use Rorange for primary actions  
✓ Feature perforated edges imagery when possible  
✓ Follow spacing primitives (8px increments)  
✓ Ensure WCAG 2.1 AA compliance  
✓ Provide instant feedback for calculations  

### Don'ts

✗ Don't use off-brand colors  
✗ Don't overcrowd the interface  
✗ Don't use generic stock photos  
✗ Don't compromise on accessibility  
✗ Don't ignore mobile experience  
✗ Don't add unnecessary animations  
✗ Don't deviate from established border radius values  

---

## Implementation Notes

This application follows all brand guidelines:

- Uses official brand colors and typography
- Implements spacing and border radius system
- Features brand messaging in copy
- Maintains professional, trade-focused tone
- Provides seamless, elevated user experience
- Integrates brand assets appropriately
- Ensures cross-platform consistency (admin, storefront, chat)
- Prioritizes accessibility and performance
