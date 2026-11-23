 
<div align="center">

<a href="https://thebehaviorallab.netlify.app/">
  <img src="[YOUR_DIRECT_IMGBB_IMAGE_URL](https://i.ibb.co.com/fzB8vp9B/TBL.png)" alt="The Behavioral Lab Logo" width="190">
</a>

# THE BEHAVIORAL LAB

### A Digital Archive for Psychology, Strategy & Cognitive Training

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=600&size=18&duration=2800&pause=900&color=8B9CF7&center=true&vCenter=true&width=700&lines=Explore+the+Psychology+of+Human+Behavior.;Discover+Books+That+Expand+Your+Thinking.;Challenge+Your+Mind+with+Vantage.;22+Arcade+Drills.+Unlimited+Possibilities." alt="Animated introduction">

**Read. Understand. Think. Compete.**

An open-source psychology and strategy archive combined with a competitive cognitive-training platform. Discover knowledge, sharpen your thinking, and challenge yourself through interactive experiences.

<br>

<a href="https://thebehaviorallab.netlify.app/you">
  <img src="https://img.shields.io/badge/🌐_VISIT_LIVE_PROJECT-Explore_The_Behavioral_Lab-8B9CF7?style=for-the-badge" alt="Visit live project">
</a>

<br><br>

![Open Source](https://img.shields.io/badge/Open%20Source-Yes-22C55E?style=flat-square)
![Free](https://img.shields.io/badge/Access-Free-22C55E?style=flat-square)
![Vanilla JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-HTML-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-CSS-1572B6?style=flat-square&logo=css3&logoColor=white)
![No Build](https://img.shields.io/badge/Build-Step%20Free-06B6D4?style=flat-square)

</div>

---

## 📑 Table of Contents

- [About the Project](#-about-the-project)
- [Project Overview](#-project-overview)
- [Archive & Library](#-archive--library)
- [Reading Experience](#-reading-experience)
- [Vantage — Competitive Arena](#-vantage--competitive-arena)
- [Arcade — 22 Cognitive Drills](#-arcade--22-cognitive-drills)
- [Profile & Accounts](#-profile--accounts)
- [Admin Tooling](#-admin-tooling)
- [Design & Front-End](#-design--front-end)
- [Accessibility](#-accessibility)
- [SEO & Metadata](#-seo--metadata)
- [Project Architecture](#-project-architecture)
- [Getting Started](#-getting-started)
- [Governance & Copyright](#-governance--copyright)
- [Contributing](#-contributing)

---

## 🧠 About the Project

**The Behavioral Lab** is a free, open-source digital platform built around two complementary ideas:

1. Making psychology and strategy literature easier to discover and access.
2. Making cognitive training engaging through interactive games and competitive challenges.

The platform combines a digital book archive with **Vantage**, a competitive brain-training arena featuring timed mathematical duels and 22 arcade drills.

### Our Philosophy

- Knowledge should be accessible.
- Learning should be engaging.
- Cognitive practice should be measurable.
- Technology should remain lightweight.
- Accessibility should be built into the experience.

No paywall. No mandatory account to read. No unnecessary complexity.

---

## 🚀 Project Overview

<div align="center">

| Platform | Description |
|:---:|---|
| 📚 Archive | Psychology and strategy book collection |
| 📖 Reader | Integrated browser-based reading |
| ⚔️ Vantage | Competitive 60-second math duels |
| 🕹️ Arcade | 22 cognitive-training games |
| 👤 Profile | Personal statistics and progression |
| 🛠️ Admin | Book metadata generation |

</div>

---

## 📚 Archive & Library

A searchable digital library designed for straightforward discovery and reading.

### Core Features

- **Centralized book database:** The complete collection is maintained in one `books.json` file.
- **Live search:** Instantly search books by title or author.
- **Automatic tag filtering:** Filters are generated dynamically from the book database.
- **Five sorting methods:**
  - Default order
  - Title A–Z
  - Title Z–A
  - Newest first
  - Oldest first
- **Live result counter:** Accessible screen-reader announcements.
- **Empty-state interface:** Helpful empty results with one-click reset.
- **Randomized homepage:** Four randomly selected books per page load.
- **Skeleton loaders:** Prevent disruptive layout shifts.

### Book Database Schema

Each book entry contains:

| Property | Purpose |
|---|---|
| `title` | Book title |
| `author` | Author name |
| `category` | Book category |
| `cover` | Cover image |
| `year` | Publication year |
| `description` | Book description |
| `tags` | Search and filtering tags |
| `driveId` | Google Drive file ID |

The centralized structure makes maintaining and expanding the collection straightforward.

---

## 📖 Reading Experience

The integrated reader allows users to access available books directly from their browsers.

### Features

- Embedded Google Drive preview.
- Fullscreen reading through an iframe.
- One-click direct downloads.
- Dynamic browser document titles.
- Fullscreen state synchronized with native browser events.

### Intelligent Loading System

The reader uses staged loading states:

| Time | Interface |
|---|---|
| Initial | Loading spinner |
| 8 seconds | Slow-loading notification |
| 20 seconds | Fallback experience |

### Error Handling

Dedicated error messages cover:

- Missing Google Drive ID.
- Unknown book.
- Failed preview loading.

Each error experience provides a route back to the archive.

**Reading is free, with no mandatory account or registration.**

---

## ⚔️ Vantage — Competitive Arena

<div align="center">

### THINK FASTER. RESPOND SMARTER. COMPETE BETTER.

<img src="https://img.shields.io/badge/FORMAT-10_QUESTIONS-8B9CF7?style=for-the-badge">
<img src="https://img.shields.io/badge/TIMER-60_SECONDS-F59E0B?style=for-the-badge">
<img src="https://img.shields.io/badge/RATING-ELO_SYSTEM-22C55E?style=for-the-badge">

</div>

Vantage is the competitive brain-training environment inside The Behavioral Lab.

It combines timed mathematics, competitive progression, performance statistics, and multiple gameplay modes.

### Rated Match System

- 10 questions per match.
- 60-second time limit.
- Increasing difficulty.
- ELO-based rating adjustments.
- Accuracy-first scoring.
- Level progression.
- Competitive match history.

### Four Game Modes

| Mode | Experience |
|---|---|
| Practice | Improve your skills without competitive pressure |
| Daily Challenge | Complete the daily challenge |
| CPU Duel | Compete against the computer |
| Live Room | Compete in a live multiplayer room |

### Competitive Tiers

Progress through four rating tiers:

<div align="center">

`INITIATE` → `CHALLENGER` → `CONTENDER` → `SIGNAL`

</div>

### Streak & Progression

- Current streak tracking.
- 24-hour streak window.
- Best-streak record.
- Level progression.
- Accuracy statistics.
- Daily activity tracking.

### Match History

The latest 30 sessions are tracked with:

- Match result.
- Game mode.
- Score.
- Accuracy.
- Rating change.

---

## 🕹️ Arcade — 22 Cognitive Drills

<div align="center">

### FOUR DISCIPLINES. TWENTY-TWO CHALLENGES.

</div>

The Arcade is a collection of 22 unrated cognitive-training games.

Unlike competitive Vantage duels, arcade sessions never modify your competitive ELO rating.

### Four Disciplines

| Discipline | Focus |
|---|---|
| 🧮 Mental Math | Numerical reasoning and calculation |
| 🧠 Working Memory | Memory and information retention |
| ⚡ Reflex | Reaction and response speed |
| 🌌 Physics | Physics-based interactive challenges |

### Arcade Features

- 22 independent drills.
- Individual personal-best records.
- Separate XP progression.
- Independent arcade levels.
- Randomized daily three-game workout.
- One-click daily workout launch.
- Skill-based filters.
- Catalogue search.
- Session history sidebar.

### Arcade Statistics

The session log tracks:

- Total plays.
- Games attempted.
- Arcade level.

### Standardized Result System

Every completed drill uses a consistent results interface:

| Statistic | Description |
|---|---|
| Score | Final game score |
| Best | Personal best |
| Correct | Correct answers |
| XP | Experience earned |
| New Best | Personal-best achievement |

### Shared Game Architecture

Every arcade game mounts inside a common stage shell.

The shared interface handles:

- Score.
- Timer.
- Progress.
- Exit controls.
- Result presentation.

This creates consistency across all 22 games while keeping individual game logic modular.

---

## 👤 Profile & Accounts

A unified profile experience for competitive and arcade progression.

### Persistent Statistics

- ELO rating.
- Accuracy.
- Current streak.
- Best streak.
- Player level.
- Wins.
- Losses.
- Draws.
- Win rate.
- Daily challenge status.

### Profile Customization

- Editable display name.
- Initial-derived avatar.
- Recent session history.
- Statistics reset functionality.

The reset operation clears statistics without changing the display name or account.

### Authentication

Firebase Authentication supports:

- Email and password registration.
- Email and password sign-in.
- Google sign-in.
- Password reset.
- Protected routes.
- Return navigation through a `next` parameter.

### Local Demo Mode

A local demo fallback makes authentication functionality testable without Firebase configuration.

### Leaderboard

Compare competitive performance across players through the platform leaderboard.

---

## 🛠️ Admin Tooling

A dedicated utility for generating structured book entries.

### Book JSON Generator

Features include:

- Structured metadata input form.
- Formatted JSON generation.
- Comma-terminated output.
- Sensible defaults for optional fields.
- Required Google Drive ID validation.
- One-click clipboard copying.

### Clipboard Compatibility

The generator supports:

1. Modern Clipboard API.
2. `execCommand` fallback.

Generated entries are designed for direct insertion into `books.json`.

---

## 🎨 Design & Front-End

The Behavioral Lab uses a lightweight frontend architecture without requiring a framework or bundler.

### Technology Stack

<div align="center">

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Google Drive](https://img.shields.io/badge/Google_Drive-4285F4?style=for-the-badge&logo=googledrive&logoColor=white)

</div>

### Frontend Principles

- Handwritten HTML.
- Custom CSS.
- Vanilla JavaScript.
- No framework.
- No bundler.
- No compilation.
- No build step.

### Design System

Centralized design tokens in `root.css` manage:

- Colors.
- Spacing.
- Border radii.
- Animation timing.
- Easing functions.

### Responsive Interface

- Mobile navigation drawer.
- Fluid layouts.
- Responsive grids.
- Sticky archive filters.
- Bottom navigation on Vantage.

### Animation System

- Canvas-based signal field.
- Maximum 48 canvas nodes.
- Device-pixel-ratio-aware rendering.
- Automatic pause when the browser tab is hidden.
- IntersectionObserver-based reveals.
- Staggered animation delays.
- Reduced-motion support.

### CDN Resilience

Shared stylesheets include CDN fallback chains to improve loading reliability.

---

## ♿ Accessibility

Accessibility is considered throughout the interface.

### Implemented Accessibility Features

- Skip-to-content links on every page.
- Semantic HTML landmarks.
- ARIA labels for icon-only buttons.
- Accessible dialogs.
- Accessible filter groups.
- Screen-reader live regions.
- Visible keyboard focus states.
- Keyboard-operable menus.
- Keyboard-operable forms and filters.
- Keyboard-accessible game controls.
- Descriptive cover and avatar alt text.
- Decorative icons hidden from assistive technologies.
- Live announcements for search results, errors, and notices.

---

## 🔎 SEO & Metadata

Every page has deliberately configured metadata.

### SEO Implementation

- Individual page titles.
- Unique meta descriptions.
- Open Graph metadata.
- Twitter card metadata.
- Shared social preview image.
- Canonical URLs on indexable pages.
- Intentional `noindex` directives for reader, generator, and non-content pages.
- Section-specific browser theme colors.

### Favicon Collection

The project includes:

- ICO favicon.
- 16 × 16 PNG.
- 32 × 32 PNG.
- Apple Touch Icon.
- 512 × 512 PNG.

---

## 🏗️ Project Architecture

The project uses a predictable directory structure designed for readability and maintenance.

```text
The-Behavioral-Lab/
│
├── page/
│   └── Archive and Reader
│
├── game/
│   └── Vantage and Arcade
│
├── css/
│   └── Shared stylesheets
│
├── js/
│   └── Shared JavaScript modules
│
├── books.json
│   └── Centralized book database
│
├── root.css
│   └── Global design tokens
│
├── main.js
│   └── Archive functionality
│
├── game-common.js
│   └── Shared game logic
│
├── game-ui.js
│   └── Shared game interface
│
├── vantage-auth.js
│   └── Authentication logic
│
├── arcade.js
│   └── Arcade functionality
│
└── README.md
    └── Project documentation
```

### Developer Experience

- Zero-install development.
- Predictable file organization.
- Single-source book data.
- Clear JavaScript module separation.
- Self-documenting data structure.
- Short, readable source files.
- Static-hosting compatibility.

---

## 🚀 Getting Started

The project requires no package installation, compilation, or build process.

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
```

### 2. Navigate to the Project

```bash
cd YOUR_REPOSITORY
```

### 3. Run Locally

Open the project's entry HTML file in your browser or serve the directory using a local static server.

### 4. Deploy

Deploy the project directory to any compatible static hosting provider.

**No build command is required.**

### Firebase Configuration

Firebase-backed authentication requires valid Firebase configuration.

Without Firebase configuration, the local demo fallback can be used to test authentication functionality.

---

## ⚖️ Governance & Copyright

The Behavioral Lab follows a published copyright policy addressing:

- Book sourcing.
- Cover artwork.
- Educational use.
- Copyright ownership.
- Rights-holder takedown requests.

### Privacy & Accessibility Principles

- No analytics.
- No third-party tracking tags.
- No account required to read.
- No paywall.
- No registration barrier in the reading experience.

Rights holders can use the project's published takedown route to raise copyright concerns.

---

## 🤝 Contributing

Contributions that improve the project are welcome.

Potential areas include:

- Accessibility improvements.
- Interface refinements.
- Bug fixes.
- Performance improvements.
- Documentation.
- New cognitive-training experiences.
- Library improvements.

### Contribution Guidelines

1. Keep the architecture lightweight.
2. Prefer vanilla JavaScript.
3. Avoid unnecessary dependencies.
4. Preserve accessibility.
5. Maintain the centralized book database.
6. Test responsive layouts.
7. Keep modules readable.
8. Document meaningful changes.

---

## 🌐 Explore The Behavioral Lab

<div align="center">

### KNOWLEDGE IS THE FOUNDATION. THINKING IS THE PRACTICE.

<a href="https://thebehaviorallab.netlify.app/you">
  <img src="https://img.shields.io/badge/EXPLORE_THE_BEHAVIORAL_LAB-Visit_Live_Website-8B9CF7?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Visit The Behavioral Lab">
</a>

<br><br>

**The Behavioral Lab**

*Explore knowledge. Understand behavior. Challenge your thinking.*

<br>

![Free](https://img.shields.io/badge/Free-Forever-22C55E?style=flat-square)
![Open Source](https://img.shields.io/badge/Open-Source-8B9CF7?style=flat-square)
![Built with JavaScript](https://img.shields.io/badge/Built%20With-JavaScript-F7DF1E?style=flat-square)

<br>

**READ · THINK · TRAIN · IMPROVE**

</div>
