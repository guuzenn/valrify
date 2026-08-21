# VLRFY v1 — Master Build Prompt

You are building **VLRFY**, a community-powered trust, reputation, and scam-risk platform for **Valorant account trading in Indonesia**.

VLRFY is not a “scammer blacklist” and must not behave like a doxxing database. The product should help users **verify identities, inspect community reports, review evidence-backed risk signals, and evaluate seller reputation before transacting**.

The core positioning is:

**VLRFY — platform reputasi dan pemeriksaan risiko untuk transaksi akun Valorant Indonesia.**

Primary tagline:

**CEK SEBELUM TRANSAKSI.**

Secondary positioning:

**Dibangun oleh komunitas, diverifikasi melalui bukti.**

Brand credit should appear subtly in appropriate areas such as the footer or About page:

**VLRFY by reyv**

Do not make the creator credit visually compete with the VLRFY brand.

---

## 1. Product Principles

VLRFY must prioritize:

1. Community usefulness.
2. Evidence-backed reporting.
3. Neutral language.
4. Transparency.
5. Privacy and responsible disclosure.
6. Anti-abuse protections.
7. Clear moderation.
8. Strong visual identity.
9. Expandable architecture.
10. A polished real-world product experience.

VLRFY should not label a person as a criminal or definitively call someone a scammer.

Avoid system fields or UI such as:

`is_scammer = true`

Instead use:

- report count
- verified report count
- unresolved cases
- linked identifiers
- dispute status
- risk label
- transaction reputation

Public-facing wording should use neutral terminology such as:

- Laporan terverifikasi
- Risiko tinggi
- Perlu perhatian
- Identitas terkait
- Bukti telah diverifikasi
- Sedang ditinjau
- Sedang disengketakan

Include a disclaimer where appropriate:

**Penilaian di VLRFY didasarkan pada laporan, bukti, dan sinyal komunitas yang tersedia. VLRFY bukan lembaga penegak hukum dan tidak menetapkan seseorang bersalah secara hukum.**

---

# 2. Initial Scope

VLRFY v1 is specifically for:

**Valorant account trading in Indonesia.**

Do not design the user-facing product around other games yet.

However, keep the architecture extensible enough so game/category support could be added later.

Primary language:

**Bahasa Indonesia.**

Do not make the interface bilingual for v1.

Technical/internal naming can remain in English.

---

# 3. Core User Problem

Before buying, selling, trading, or using a middleman for a Valorant account, users should be able to search identifiers associated with the counterparty.

Supported searchable identifiers:

- Nama
- Nomor WhatsApp
- Nomor rekening
- E-wallet identifier
- Discord username
- Nama Facebook
- Facebook profile URL
- Riot ID / Valorant username
- Other marketplace username where applicable

Users should be able to determine whether those identifiers are connected to:

- verified reports
- unresolved cases
- disputed reports
- successful community transactions
- known seller profiles
- other linked identifiers

---

# 4. Main Product Areas

Build these main areas:

## Public

- Homepage
- Global search
- Search result page
- Public seller/entity profile
- Public case/report detail
- Submit report
- Confirm successful transaction
- Claim profile
- Dispute report
- Methodology
- About
- Donate

## Logged-in User Dashboard

- Overview
- My reports
- My transaction confirmations
- My disputes
- Profiles I claim
- Notifications
- Account settings

## Verified Middleman Dashboard

- Dashboard overview
- Submit case
- Submitted case history
- Case status tracking
- Evidence upload
- Associated entities
- Reputation/source profile

Middlemen must not be able to directly mark their own cases as verified.

Their cases can carry:

**Dikirim oleh Verified Middleman**

but final moderation status is controlled by moderator/admin.

## Moderator/Admin Dashboard

- Review queue
- Case review
- Evidence viewer
- Duplicate detection
- Entity matching
- Identifier matching
- Linked identity analysis
- Merge entities
- Merge duplicate reports
- Dispute review
- User management
- Middleman verification
- Role management
- Audit logs
- Moderation history
- Platform statistics

---

# 5. Authentication

Support:

### Primary
- Google OAuth
- Email + password

Email/password accounts must require email verification.

### Optional / expandable
- Discord OAuth

Discord login can be implemented if reasonable, but Google and email/password are higher priority.

Users must log in before they can:

- submit a report
- dispute a report
- confirm a successful transaction
- claim a profile

Public search should not require login.

---

# 6. Roles

Implement RBAC with at least:

```text
USER
VERIFIED_MIDDLEMAN
MODERATOR
ADMIN
```

Permissions:

## USER

Can:

- search
- submit reports
- submit successful transaction confirmations
- dispute reports involving them
- claim profiles
- manage their own submissions

Cannot:

- verify reports
- see private evidence from other reports
- change risk labels
- merge identities

## VERIFIED_MIDDLEMAN

Includes USER permissions.

Additionally:

- has verified badge
- can submit structured cases
- has dedicated case panel
- their source identity can be publicly visible
- their submission can be treated as a stronger source signal

But:

**Verified middleman reports still require moderation.**

## MODERATOR

Can:

- review cases
- inspect full private evidence
- request additional information
- approve/reject cases
- redact evidence
- merge identifiers
- resolve disputes
- moderate community confirmations

## ADMIN

Full system access.

Can additionally:

- assign/revoke roles
- verify middlemen
- configure platform settings
- manage moderators
- access complete audit logs

For initial deployment, the creator can hold ADMIN and MODERATOR privileges.

---

# 7. Scam Report / Case System

A report should contain:

### Reporter

- internal user ID
- reporter type
- public anonymity preference
- verified middleman status if applicable

### Report subject

Support multiple identifiers:

- person name
- phone number
- bank account
- e-wallet
- Facebook name
- Facebook URL
- Discord username
- Riot ID
- other username

### Incident

- title
- chronology
- transaction date
- report date
- transaction value
- alleged financial loss
- transaction type
- optional middleman information

### Evidence

Support multiple files:

- chat screenshot
- payment/transfer proof
- profile screenshot
- transaction proof
- other supporting evidence

Evidence should support captions/types.

### Metadata

- status
- moderation notes
- risk impact
- dispute status
- linked reports
- linked entities
- timestamps

---

# 8. Report Workflow

Use a clear report state system.

Suggested lifecycle:

```text
SUBMITTED
↓
UNDER_REVIEW
↓
NEEDS_INFO
↓
VERIFIED
```

Alternative outcomes:

```text
REJECTED
WITHDRAWN
```

After verified publication:

```text
PUBLISHED
```

If challenged:

```text
DISPUTED
↓
DISPUTE_REVIEW
↓
UPHELD
or
RESOLVED
or
REMOVED
```

Keep workflow history.

Every moderation action should be recorded.

---

# 9. Public Reporter Privacy

Normal community reporters should be anonymous publicly by default.

Display something like:

**Dilaporkan oleh anggota komunitas**

Do not reveal their:

- real name
- email
- account ID
- personal information

Moderators can see the account behind the submission.

If the reporter is a VERIFIED_MIDDLEMAN and chooses to submit under their professional identity, public pages may display:

**Dilaporkan oleh [Middleman Name] ✓ Verified Middleman**

---

# 10. Identifier Privacy

VLRFY must be useful for exact checking while avoiding unnecessary exposure of private identifiers.

### Search

The backend should support exact search using full submitted identifiers.

Example:

A user searches:

`081234567890`

If that exact identifier exists, return the connected results.

### Display

Sensitive identifiers should generally be masked publicly.

Phone example:

```text
0812••••7890
```

Bank example:

```text
BCA
1234••••9012
```

E-wallet identifiers should follow similar treatment.

Public usernames such as:

- Riot ID
- Discord username
- Facebook profile name
- public Facebook URL

may be shown more openly where appropriate.

Do not expose:

- KTP
- full personal addresses
- identity documents
- full private banking evidence
- unredacted personal evidence

Raw evidence is moderator-only unless specifically redacted and approved for public display.

---

# 11. Entity / Seller Profile

This is a major feature.

Reports and transaction confirmations should connect to **entities** representing sellers/traders/persons.

Example public profile:

```text
reyv

COMMUNITY PROFILE

LOW RISK

34 transaksi berhasil dikonfirmasi
2 laporan
0 laporan belum terselesaikan
```

Possible fields:

- display name
- aliases
- joined date
- claimed status
- verified identity status
- risk level
- report count
- verified report count
- unresolved report count
- disputed report count
- successful transaction confirmations
- associated identifiers
- recent activity
- case timeline

Profiles may exist before they are claimed.

---

# 12. Profile Claiming

Allow a person to:

**Klaim profil ini**

Claiming means proving that a VLRFY profile represents them.

It does NOT allow them to delete reports.

Profile claiming can use appropriate identifier verification, such as:

- ownership of phone/contact
- proof of social profile ownership
- moderator-assisted verification
- account linkage

After a successful claim:

Display:

**Profil telah diklaim**

The owner can:

- manage their profile description
- confirm their own identifiers
- see reports associated with them
- submit disputes
- respond with context where moderation permits
- build reputation through legitimate transactions

They cannot:

- remove reports themselves
- alter evidence
- change moderation status
- manipulate risk signals

---

# 13. Reputation System

VLRFY is not only negative-report focused.

Allow community members to confirm:

**TRANSAKSI BERHASIL**

A successful transaction confirmation can include:

- seller/entity
- date
- transaction amount
- optional screenshot/proof
- optional middleman
- short review/note

Also support:

**SAYA JUGA TERDAMPAK**

This lets another affected person connect themselves to an existing case.

Do not make this a simple anonymous upvote.

Require login and basic abuse prevention.

Potential protections:

- verified email
- account age considerations
- one confirmation per user per transaction/entity
- duplicate detection
- rate limiting
- optional proof
- moderator review for suspicious patterns
- different trust weight for verified middlemen

Do not expose an opaque “reputation score”.

Prefer interpretable metrics.

Example:

```text
28 transaksi berhasil dikonfirmasi
3 laporan terverifikasi
1 kasus belum terselesaikan
```

---

# 14. Risk Labels

Do NOT use numerical scores like:

`87/100`

Use understandable labels.

Suggested labels:

```text
TIDAK ADA LAPORAN
RISIKO RENDAH
PERLU PERHATIAN
RISIKO TINGGI
```

Do not infer “safe” simply because there are no reports.

Prefer wording such as:

**Tidak ada laporan yang ditemukan**

rather than:

**Orang ini aman**

Risk label logic must be:

- rule-based
- transparent
- explainable
- auditable

Do not use opaque AI classification for final risk decisions.

Potential inputs:

- number of verified unresolved reports
- number of independent reporters
- recency
- linked identifiers with other cases
- dispute outcomes
- verified middleman reports
- successful transaction confirmations

Design this as a configurable rules engine.

---

# 15. Risk Explanation

Whenever a risk label is displayed, provide a short explanation.

Example:

**RISIKO TINGGI**

```text
Ditemukan 3 laporan terverifikasi yang belum terselesaikan dari pelapor berbeda.
```

Another:

**PERLU PERHATIAN**

```text
Terdapat 1 laporan yang sedang dalam proses sengketa.
```

Transparency is important.

---

# 16. Linked Identity System

This is one of VLRFY's flagship features.

Identifiers should be modeled independently and connected to:

- entities
- reports
- transactions

Example:

```text
Facebook A
    │
    ├── WhatsApp X
    │
    └── BCA Y
             │
             ├── Case #0012
             └── Case #0041

Facebook B
    │
    └── BCA Y
```

The system should detect shared identifiers between cases.

Example signal:

**3 profil terhubung melalui identifier yang sama.**

Important:

A connection does NOT automatically mean all connected identities are guilty.

Use wording such as:

- Terhubung melalui nomor rekening yang sama
- Identifier digunakan pada beberapa laporan
- Hubungan ditemukan
- Perlu ditinjau

Do not say:

- Pasti orang yang sama
- Penipu yang sama

unless such identity has been manually verified.

---

# 17. Link Analysis UI

Build a visual network/graph for moderators.

Nodes may include:

- person/entity
- phone
- bank account
- Discord
- Facebook profile
- Riot ID
- report

Edges show relationships.

Example:

```text
ENTITY
    ↓ uses
PHONE
    ↓ appears_in
REPORT
```

Graph must remain readable and useful rather than decorative.

For public users, show a simplified linked identifier section.

Detailed intelligence graph is primarily for moderators.

---

# 18. Duplicate Detection

Detect potential duplicates based on:

- exact phone
- exact account number
- exact social URL
- Riot ID
- Discord
- similar names
- overlapping evidence metadata

Automatic matching should produce suggestions.

Moderators decide whether entities should actually be merged.

Example:

**Kemungkinan duplikat ditemukan**

Never silently merge people based only on fuzzy name similarity.

---

# 19. Dispute System

Every published report should provide:

**Sengketakan laporan ini**

The dispute flow should allow:

- selecting why the report is inaccurate
- submitting chronology
- uploading counter-evidence
- claiming the associated entity if necessary

Display publicly when relevant:

**Laporan sedang disengketakan**

Moderators review both sides.

Store dispute outcomes.

Possible outcomes:

```text
UPHELD
RESOLVED
REMOVED
PARTIALLY_CORRECTED
```

Maintain historical audit information internally.

---

# 20. Evidence Handling

Raw evidence must be private.

Evidence may contain:

- names
- addresses
- payment details
- chats
- personal images

Only moderators/admins should have access by default.

For public case pages, moderators can create:

- redacted screenshots
- approved excerpts
- summary descriptions

Never automatically publish raw uploads.

Use secure object storage with access control.

---

# 21. Homepage

Create a cinematic but functional landing page.

Hero idea:

```text
// DATABASE REPUTASI KOMUNITAS VALORANT INDONESIA

KENALI SEBELUM
KAMU TRANSAKSI.

Cari nomor WhatsApp, rekening, Discord, Facebook,
Riot ID, atau nama sebelum melakukan transaksi akun Valorant.
```

Primary CTA:

**CEK SEKARANG**

Primary search field:

```text
Cari nomor, rekening, Discord, Facebook, Riot ID, atau nama...
```

Secondary CTA:

**LAPORKAN KASUS**

Below the hero, display platform statistics when real data exists:

```text
128
LAPORAN TERVERIFIKASI

432
IDENTIFIER TERINDEKS

86
TRANSAKSI BERHASIL DIKONFIRMASI
```

Do not show fake metrics in production.

Seed/demo mode can clearly mark sample data.

---

# 22. Search Experience

Search is the central product experience.

Search should support:

- exact identifier matching
- normalized phone matching
- normalized bank account matching
- case-insensitive username search
- alias search
- fuzzy name matching
- exact URL matching

Search result hierarchy:

### Exact Match

Highlight exact identifier matches.

Example:

```text
KECOCOKAN DITEMUKAN

WhatsApp
0812••••7890

Terhubung ke 1 profil dan 3 laporan.
```

### Related Results

Display:

- associated profiles
- reports
- linked identifiers
- successful trades

### No Result

Do not say:

**Aman.**

Say:

**Tidak ditemukan laporan atau profil yang cocok dengan pencarian ini.**

Then explain:

**Tidak adanya laporan bukan jaminan bahwa transaksi bebas risiko. Tetap verifikasi identitas dan gunakan metode transaksi yang aman.**

---

# 23. Case Detail Page

Public case page should show:

- case ID
- verification status
- report date
- incident date
- alleged loss
- incident category
- redacted chronology
- approved evidence preview if any
- linked identifiers
- associated entity
- related reports
- dispute status
- source type
- verified middleman badge if applicable

Example microcopy:

```text
CASE // VLR-00281
STATUS // BUKTI TERVERIFIKASI
```

---

# 24. Design Direction

The visual identity should feel inspired by tactical shooter interfaces and the visual energy of Valorant, but must NOT copy Riot assets, logos, compositions, or proprietary design elements directly.

The design should feel:

- tactical
- sharp
- premium
- security-oriented
- data-driven
- modern
- high contrast
- credible

Avoid:

- generic rounded SaaS design
- excessive glassmorphism
- neon cyberpunk overload
- excessive gradients
- cartoonish gaming UI
- overly futuristic HUD clutter

---

# 25. Color Palette

Use approximately this foundation:

```text
Canvas:
#ECE8E1

Ink:
#0F1923

Signal Red:
#FF4655

Soft White:
#F9F9F9

Muted:
#768079

Border:
#B8B3AC
```

Status colors:

```text
Safe / Positive:
#3FA779

Warning:
#D89B38

Danger:
#D93646
```

Do not rely only on color for state.

Pair color with:

- icons
- labels
- typography

---

# 26. Typography

Preferred direction:

### Display / Headlines

**Barlow Condensed**

Use weights around:

- 700
- 800

Headings may use uppercase.

### UI / Body

Prefer:

**Archivo**

Alternative:

**Inter**

Use clean readable typography for long content.

Typical visual hierarchy:

```text
BARLOW CONDENSED 800
KENALI SEBELUM
KAMU TRANSAKSI.

Archivo 400
Cari identitas yang akan kamu gunakan dalam transaksi sebelum melakukan pembayaran.
```

---

# 27. Geometry

Use angular geometric accents.

Examples:

- clipped corners
- diagonal cuts
- asymmetric borders
- thin tactical divider lines
- rectangular cards
- subtle index numbering

Avoid excessive rounded cards.

Common corner radius should generally be low:

```text
0–4px
```

Buttons can have clipped lower/right corners.

---

# 28. UI Microcopy Style

Use concise Bahasa Indonesia.

Examples:

```text
// PENCARIAN IDENTITAS

CEK SEKARANG

LIHAT LAPORAN

KIRIM LAPORAN

BUKTI TERVERIFIKASI

SEDANG DITINJAU

RISIKO TINGGI

IDENTIFIER TERKAIT

RIWAYAT TRANSAKSI

SENGKETAKAN LAPORAN

KLAIM PROFIL

TRANSAKSI BERHASIL
```

Decorative system text may use:

```text
CASE // VLR-0281

SOURCE // COMMUNITY

STATUS // VERIFIED

UPDATED // 21 AUG 2026
```

Keep decorative tactical microcopy secondary to usability.

---

# 29. Landing vs Application UI

Use two related UI modes.

## Public landing pages

More cinematic:

- large typography
- whitespace
- bold sections
- editorial composition
- strong imagery/geometry
- tactical accents

## Dashboard / intelligence UI

More data-heavy:

- tables
- filters
- statuses
- compact panels
- relationship graph
- activity logs

They must still feel like the same design system.

---

# 30. Responsive Design

Design mobile-first enough for Indonesian users.

Many users will access VLRFY from phones while actively trading through:

- WhatsApp
- Facebook
- Discord

Search, profile checking, and reporting must work extremely well on mobile.

Prioritize:

- large search input
- easy copy/paste
- upload screenshots from phone
- readable risk labels
- simple report workflow

---

# 31. Suggested Technology Stack

Preferred:

### Frontend

```text
Next.js
TypeScript
App Router
React
Tailwind CSS
```

Use a clean component architecture.

Use shadcn/ui only where appropriate, but restyle heavily enough that the site does not look like default shadcn.

### Backend

```text
NestJS
TypeScript
REST API
```

### Database

```text
PostgreSQL
```

ORM:

```text
Prisma
```

or another strong typed ORM if justified.

### Cache / rate limiting

```text
Redis
```

### File storage

S3-compatible object storage.

Possible providers later:

- Cloudflare R2
- AWS S3
- Supabase Storage

Abstract storage behind a service.

---

# 32. Suggested Monorepo

Prefer a monorepo.

Example:

```text
vlrfy/

apps/
  web/
  api/

packages/
  ui/
  config/
  types/
  validation/

docs/
```

Use pnpm workspaces or Turborepo if helpful.

Avoid unnecessary infrastructure complexity.

---

# 33. Suggested Core Database Entities

Design a robust relational schema around:

```text
User
UserRole
Session
OAuthAccount

Entity
EntityAlias
EntityClaim

Identifier
EntityIdentifier

Report
ReportIdentifier
ReportEvidence
ReportStatusHistory

Dispute
DisputeEvidence

TransactionConfirmation

MiddlemanProfile

ModerationAction
AuditLog

Notification
```

Potential `Identifier.type` values:

```text
PHONE
BANK_ACCOUNT
EWALLET
DISCORD
FACEBOOK_NAME
FACEBOOK_URL
RIOT_ID
PERSON_NAME
OTHER
```

Identifiers should support normalized values separately from display values.

Example:

```text
rawValue
normalizedValue
maskedValue
type
```

Consider hashing sensitive normalized identifiers for exact lookup where appropriate while still allowing secure moderator access.

Do not over-engineer encryption initially, but design for secure storage.

---

# 34. Entity Relationship Model

Conceptually:

```text
Entity
  has many Identifiers

Report
  references many Identifiers

Report
  may reference an Entity

Entity
  has many Reports

Entity
  has many TransactionConfirmations

User
  creates Reports

User
  creates TransactionConfirmations

User
  may claim Entity
```

Because the same identifier may appear across multiple entities/reports, model relations correctly instead of embedding identifier arrays as JSON.

---

# 35. Search Normalization

Implement normalization helpers.

### Indonesian phone numbers

Treat forms such as:

```text
08123456789
628123456789
+628123456789
```

as potentially equivalent.

Normalize internally.

### Bank account

Strip:

- spaces
- hyphens

Keep bank provider metadata where known.

### URLs

Normalize Facebook URLs.

### Usernames

Trim spaces and normalize casing as appropriate.

Preserve original display value.

---

# 36. Security Requirements

Implement baseline protections:

- CSRF protection where applicable
- secure cookies
- strong password hashing
- rate limiting
- upload size limits
- MIME validation
- file extension validation
- signed file URLs
- server-side validation
- authorization guards
- sanitized text rendering
- SQL injection protections through ORM
- XSS prevention
- audit logs
- brute force protection
- email verification

Report submission and successful transaction confirmation should have anti-spam protections.

Prepare architecture for CAPTCHA if necessary.

---

# 37. Abuse Prevention

The platform itself can be abused for:

- revenge reports
- fake allegations
- harassment
- sockpuppet reputation boosting
- mass reporting
- identity impersonation

Implement safeguards:

- reports do not immediately publish
- moderator review required
- evidence required
- rate limits
- reporter history
- duplicate detection
- dispute mechanism
- audit log
- abnormal submission detection

Avoid automatic public accusations based only on community votes.

---

# 38. Moderation Philosophy

Moderators verify that evidence supports what is displayed.

Moderators are not asked to make legal judgments.

Separate:

```text
Evidence exists
```

from:

```text
Legal guilt
```

Moderation notes should allow structured reasoning.

Example:

```text
Payment proof verified.
Recipient bank account matches report.
Conversation screenshot shows agreed transaction.
Seller stopped responding after payment.
```

Public summary must remain neutral.

---

# 39. Verified Middleman System

Allow ADMIN to grant:

```text
VERIFIED_MIDDLEMAN
```

A middleman profile can contain:

- display name
- profile image
- description
- social links
- verification date
- number of cases submitted
- successful transaction confirmations
- status

Public badge:

**Verified Middleman**

Do not imply that VLRFY guarantees transactions performed by them.

Include an appropriate disclaimer.

---

# 40. Donation

VLRFY v1 is not subscription-based.

Support a simple:

**Dukung VLRFY**

page.

Do not build payment integration unless necessary.

Initially this can link to configured donation channels.

Keep donation configuration environment-driven.

---

# 41. Seed Data

Create realistic but clearly fictional development seed data.

Do NOT use random real people, real phone numbers, or real bank accounts.

Seed:

- users
- verified middleman
- entities
- reports
- disputes
- successful transactions
- linked identifiers
- different risk states

Make it easy to later replace seed data with manually curated real cases.

---

# 42. Public Statistics

Possible metrics:

- total published reports
- total identifiers indexed
- total successful transaction confirmations
- total alleged losses in verified reports

Only include monetary losses from reports that meet the configured verification requirement.

Avoid misleading totals.

---

# 43. Logging

Implement structured logs.

Keep security-sensitive data out of logs.

Track moderation actions separately through AuditLog.

Examples:

```text
REPORT_VERIFIED
REPORT_REJECTED
REPORT_REDACTED
ENTITY_MERGED
ENTITY_CLAIM_APPROVED
ROLE_ASSIGNED
DISPUTE_RESOLVED
```

---

# 44. Notifications

Basic notification system.

Notify users when:

- report status changes
- moderator requests more information
- dispute receives update
- profile claim changes
- transaction confirmation is reviewed

Email can be added later.

Build internal notification architecture first.

---

# 45. SEO

Public cases and entity profiles should be indexable only after moderation approval.

Avoid indexing:

- raw identifiers
- private dashboard
- unverified reports
- evidence URLs
- dispute documents

Use sensible metadata.

Public masked sensitive identifiers should not appear unnecessarily in SEO descriptions.

---

# 46. Accessibility

Do not sacrifice usability for tactical aesthetics.

Ensure:

- accessible contrast
- keyboard navigation
- focus states
- form labels
- screen reader labels
- status is not conveyed by color alone

---

# 47. MVP Priority

Prioritize this order.

### Phase 1 — Foundation

- monorepo
- frontend
- backend
- database
- auth
- RBAC
- base design system

### Phase 2 — Core Search

- identifiers
- entities
- normalization
- global search
- profile results

### Phase 3 — Reporting

- report form
- evidence upload
- moderation queue
- report statuses

### Phase 4 — Public Case System

- public case pages
- masking
- profile linkage
- risk labels

### Phase 5 — Reputation

- successful transactions
- entity profile
- profile claiming

### Phase 6 — Trust Infrastructure

- disputes
- verified middlemen
- linked identifiers
- duplicate detection

### Phase 7 — Intelligence

- graph visualization
- richer moderator tooling
- analytics

Do not attempt to build every advanced feature simultaneously before the base flow works.

---

# 48. MVP Critical User Flow

The most important flow must work end-to-end:

```text
User opens VLRFY

↓

Searches WhatsApp / bank / Discord / Facebook / Riot ID

↓

System normalizes query

↓

Finds exact or related identifier

↓

Displays entity + report summary

↓

User sees risk label with explanation

↓

User opens profile/case

↓

User can inspect verified public information
```

Second most important:

```text
User logs in

↓

Submits report

↓

Uploads evidence

↓

Moderator reviews

↓

Moderator verifies/redacts

↓

Case is published

↓

Search immediately connects identifier to case
```

---

# 49. Design System Components

Create reusable components such as:

```text
TacticalButton
SectionLabel
RiskBadge
StatusBadge
MetricCard
SearchBar
IdentifierChip
CaseCard
EntityCard
EvidenceCard
Timeline
ReportStatusTimeline
LinkedIdentifierList
ProfileClaimBadge
VerifiedMiddlemanBadge
DataTable
EmptyState
Modal
Drawer
Toast
```

Naming can change if better conventions exist.

---

# 50. Risk Badge Examples

Create distinct visuals for:

### No Reports

```text
TIDAK ADA LAPORAN
```

Neutral.

### Low Risk

```text
RISIKO RENDAH
```

Green.

### Caution

```text
PERLU PERHATIAN
```

Amber.

### High Risk

```text
RISIKO TINGGI
```

Red.

### Disputed

```text
SEDANG DISENGKETAKAN
```

Use a visually distinct state.

---

# 51. Homepage Sections

Suggested structure:

```text
Navbar

Hero + Search

Platform statistics

How VLRFY works

Recent verified cases

Why check first

Community reputation

Verified middlemen

Submit report CTA

Methodology / transparency

Donation CTA

Footer
```

Keep homepage concise enough that search remains the focus.

---

# 52. Navigation

Suggested desktop nav:

```text
VLRFY

CEK
LAPORAN
REPUTASI
METODOLOGI

[MASUK]
[LAPORKAN]
```

After login:

```text
Dashboard
```

Mobile navigation should be simple.

---

# 53. Branding

Logo should primarily be text-based:

**VLRFY**

Possible visual treatments:

```text
VLRFY
```

or:

```text
VLRFY//
```

Do not use Valorant's official logo.

Potential brand signature:

```text
VLRFY
BY REYV
```

Use the creator credit sparingly.

---

# 54. Copywriting Tone

Tone:

- direct
- calm
- protective
- credible
- community-focused

Avoid sensational wording such as:

- PENIPU!!!
- HATI-HATI SCAMMER
- ORANG INI BAHAYA
- BLACKLIST

Prefer:

- Ditemukan laporan terverifikasi
- Periksa informasi sebelum melanjutkan transaksi
- Identifier ini muncul dalam beberapa laporan
- Transaksi memiliki sinyal risiko

---

# 55. Example Hero Copy

Use this as initial direction:

```text
// PLATFORM REPUTASI KOMUNITAS VALORANT INDONESIA

CEK SEBELUM
TRANSAKSI.

Cari nomor WhatsApp, rekening, Discord, Facebook,
Riot ID, atau nama sebelum membeli, menjual,
atau menukar akun Valorant.

[ Cari identitas... ] [ CEK SEKARANG ]

[LAPORKAN KASUS]
```

Alternate large headline:

```text
KENALI SEBELUM
KAMU TRANSAKSI.
```

Choose the one that produces the strongest composition.

---

# 56. Example Search Result

```text
KECOCOKAN DITEMUKAN

reyv

PERLU PERHATIAN

1 laporan terverifikasi
14 transaksi berhasil dikonfirmasi
1 laporan sedang disengketakan

IDENTIFIER TERKAIT

WhatsApp
0812••••7890

Discord
reyv

Riot ID
reyv#1234

[LIHAT PROFIL]
```

---

# 57. Example High Risk Result

```text
RISIKO TINGGI

Ditemukan 3 laporan terverifikasi yang belum terselesaikan
dari pelapor berbeda.

3
LAPORAN TERVERIFIKASI

Rp4.750.000
TOTAL KERUGIAN DILAPORKAN

2
IDENTIFIER TERHUBUNG

[LIHAT LAPORAN]
```

---

# 58. Code Quality

Use:

- strict TypeScript
- clear folder boundaries
- strong DTO/schema validation
- reusable domain services
- avoid giant components
- avoid duplicated business logic
- meaningful naming
- database migrations
- environment validation
- linting
- formatting

Do not add unnecessary abstractions purely for architectural aesthetics.

---

# 59. Testing

Add tests for critical domain logic.

At minimum:

- identifier normalization
- sensitive identifier masking
- risk rules
- RBAC
- report status transitions
- entity matching
- search matching

Add integration tests for major API flows where reasonable.

---

# 60. Documentation

Create:

```text
README.md
docs/architecture.md
docs/product-rules.md
docs/risk-methodology.md
docs/moderation.md
```

README should include:

- what VLRFY is
- stack
- setup
- environment variables
- migrations
- seed
- development commands

---

# 61. Environment Configuration

Prepare environment variables for:

```text
DATABASE_URL
REDIS_URL

AUTH_SECRET

GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET

STORAGE_ENDPOINT
STORAGE_BUCKET
STORAGE_ACCESS_KEY
STORAGE_SECRET_KEY

PUBLIC_APP_URL
```

Do not hardcode credentials.

---

# 62. Development Approach

Before coding extensively:

1. Inspect the repository.
2. Decide the cleanest architecture.
3. Write a short implementation plan.
4. Establish the data model.
5. Establish design tokens.
6. Build foundation.
7. Implement one end-to-end critical flow.
8. Verify it works.
9. Continue incrementally.

Do not generate dozens of incomplete pages before the core product works.

---

# 63. First Deliverable

For the first implementation milestone, deliver a functional vertical slice containing:

### Public

- homepage
- VLRFY navigation
- hero search
- search results
- entity profile
- report detail

### Authentication

- Google auth
- email/password
- verified email workflow where practical

### Core Data

- users
- entities
- identifiers
- reports
- evidence metadata
- transactions

### Reporting

- authenticated report submission
- evidence upload
- report status

### Admin

- admin login
- review queue
- basic report verification
- publish/reject

### Design

A polished VLRFY visual system matching this specification.

The first vertical slice should demonstrate:

```text
submit report
→ moderate
→ publish
→ search identifier
→ view result
```

before advanced features are added.

---

# 64. Important Constraints

Do not:

- scrape Facebook automatically
- build automated crawlers for private/social content
- publish KTP or raw personal documents
- expose raw evidence publicly
- call users criminals
- automatically mark someone guilty
- automatically merge fuzzy identities
- create opaque AI risk judgments
- use fake production metrics
- copy Riot/Valorant assets
- make the UI look like a generic SaaS dashboard

---

# 65. Long-Term Vision

Architect VLRFY so it could eventually become:

**trust infrastructure for digital trading in Indonesia.**

Potential future expansion:

```text
Valorant
↓
Gaming accounts
↓
Digital goods
↓
Broader peer-to-peer online trading
```

But do NOT let this future scope distract from making the initial Valorant Indonesia experience excellent.

---

# 66. Definition of Success

VLRFY v1 is successful when a real Valorant trader in Indonesia can:

1. Open the website from their phone.
2. Paste a phone number or payment identifier.
3. Immediately understand whether relevant reports exist.
4. Inspect the evidence-backed public context.
5. Understand why a risk label appears.
6. Submit their own report safely.
7. Build positive reputation from successful transactions.
8. Challenge inaccurate reports fairly.

And a moderator can:

1. Review incoming reports.
2. Inspect raw evidence securely.
3. Match identifiers.
4. detect linked cases.
5. redact sensitive information.
6. verify or reject reports.
7. handle disputes.
8. maintain a transparent audit trail.

The experience should feel like a real community product, not a portfolio demo.

**Build VLRFY with that standard.**

---

# 67. Product Amendment — Published Scam Identifiers

Effective 21 August 2026, this amendment is part of the VLRFY master specification and supersedes earlier masking guidance where the two conflict.

VLRFY should take product inspiration from the community reporting flow of [Steam User Indonesia Report (SUIR)](https://steamuser.com/suir): users can search transaction identifiers, submit a complete fraud report, and rely on admin/moderator validation before publication. SUIR is a UX and workflow reference only. Do not scrape, copy, or import its data.

## Public identifier policy

For a report that has passed moderation and reached `PUBLISHED` status, identifiers directly tied to the reported counterparty may be displayed in full so users can compare the exact data before transferring money or trading.

This policy applies especially to:

- bank account numbers
- e-wallet numbers
- WhatsApp or phone numbers
- Discord usernames
- Riot IDs
- Facebook names and profile URLs
- other transaction usernames submitted as part of the verified report

Full public display is allowed only when:

1. the identifier is attached to a specific report;
2. the report has supporting evidence available to moderators;
3. an admin or moderator has explicitly approved publication;
4. the identifier belongs to the reported transaction counterparty rather than the reporter;
5. the public page clearly describes the data as community-reported and admin-reviewed, not a legal finding of guilt.

## Data that must remain private

Never expose identifiers or evidence from reports in `SUBMITTED`, `UNDER_REVIEW`, `NEEDS_INFO`, `REJECTED`, `WITHDRAWN`, or any other non-public state.

The following remain private regardless of report status:

- raw evidence files
- unredacted chat screenshots or documents
- reporter identity and contact details
- account emails
- passwords, tokens, cookies, OTPs, and authentication data
- KTP, passports, payment cards, CVV, and unrelated personal documents
- identifiers belonging to victims or unrelated third parties

## Safety and correction requirements

- Full identifiers must not be inserted into SEO descriptions or other unnecessary metadata.
- Public pages must retain neutral wording and the existing legal disclaimer.
- Every publication must remain traceable through the moderation audit trail.
- Dispute, correction, delisting, and identifier-removal workflows must be supported before production scale.
- Admins must be able to remove an incorrectly linked identifier without deleting unrelated valid reports.
- Exact matching may link reports to an existing profile, but fuzzy identity merging still requires human review.
- Masking remains the safe default anywhere the publication requirements above are not satisfied.

## Implementation direction

The next implementation pass should update the domain masking policy, public API projections, entity and case pages, search results, moderation controls, documentation, and automated tests together. Do not implement this as a global “disable masking” switch.
