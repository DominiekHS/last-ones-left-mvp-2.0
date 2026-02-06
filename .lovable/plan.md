

# Last Ones Left — Full MVP Plan
**"Bezoek. Beleef. Bespaar. Wat ga jij doen vandaag?"**

A Dutch, mobile-first marketplace for last-minute local deals. Built with React/Vite + Lovable Cloud (Supabase).

---

## 1. Backend Setup (Lovable Cloud)

### Database Tables
- **users/profiles** — name, date of birth, email, verified status
- **merchants** — company name, email, venue type, address, city, blocked status
- **user_roles** — role-based access (consumer, merchant, admin) in a separate table for security
- **deals** — title, image URL, description, category, city, original price, discount %, start time, expiry time, checkout link, discount code, merchant ID, status (auto-derived from expiry)
- **vouchers/claims** — user ID, deal ID, discount code, claimed timestamp
- **deal_events** — tracking table for views and click-throughs with timestamps

### Auth
- Email + password authentication for both consumers and merchants
- Email verification flow
- Separate registration flows for consumers vs merchants

### Storage
- Image upload bucket for deal photos (public bucket with merchant-only upload RLS)

### Row-Level Security
- Consumers can read active deals, manage their own vouchers/profile
- Merchants can CRUD their own deals, read their own stats
- Admins can manage all deals and block merchants

---

## 2. Consumer Experience (Mobile-First)

### Homepage / Deal Feed
- Card-based grid of active deals (only deals expiring in the future)
- Each card shows: title, image, city, category badge, original price with discount, start time, urgency badges ("Laatste plekken!", "Vandaag")
- All UI text in Dutch

### Filtering & Search
- Filter by: category (bioscoop, theater, sport, museum, etc.), city/postcode, price range, start time
- Filters accessible via a sticky filter bar

### Deal Detail Page
- Full deal info: venue name, description, image, start time, expiry countdown, discount details, conditions
- CTA button behavior:
  - Not logged in → "Account aanmaken (± 1 minuut)" + disabled claim button
  - Logged in → "Claim korting / Naar afrekenen"

### Claiming a Deal
- On claim: store voucher, show discount code on screen
- Redirect button to merchant's checkout link
- Code also visible in "Mijn Vouchers"

### Consumer Profile
- "Mijn Vouchers" page listing all claimed deals with codes, status, and checkout links
- Basic profile settings (name, email, date of birth)

### Other Pages
- Share deal via link (copy URL)
- Contact/support page (simple form)

---

## 3. Merchant Experience

### Merchant Registration
- Separate signup: email, password, company name, venue type, address/city

### Deal Creation Form
- Fields: title, image upload, description, category dropdown, city, original price, discount %, start time, expiry time, checkout link, discount code
- Validation: start time must be within 24 hours, expiry ≤ start time
- Deal goes live instantly on save

### Merchant Dashboard
- List of active and expired deals
- Edit / delete deals
- Basic stats per deal: total views, total click-throughs

---

## 4. Admin Panel

### Admin Dashboard
- List view of all merchants (with block/unblock action)
- List view of all deals (with remove action)
- Simple and functional — no complex analytics

---

## 5. Design & UI

### Visual Style
- **Color palette**: white, black, yellow accents
- Clean marketplace layout with card-based design
- Youthful, fresh typography — strong visual hierarchy
- Mobile-first responsive (works on desktop too)
- No animations per your request

### Deal Card Hierarchy
- Price + discount prominently displayed
- Start time, city, category badge clearly visible
- Urgency labels: "Last spot", "Hot deal", "Binnen 24 uur"

### Language
- Entire UI in Dutch — all labels, buttons, error messages, system text

---

## 6. Tracking & Analytics (MVP)

- Log deal page views and click-through events in the database
- Display totals on merchant dashboard
- No purchase tracking (external checkout)

