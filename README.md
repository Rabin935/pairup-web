# PairUp Frontend

<p align="center">
  <img src="app/public/images/pairuplogo.png" alt="PairUp logo" width="110" />
</p>

<p align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Outfit&weight=700&size=24&duration=2600&pause=900&color=7C3AED&center=true&vCenter=true&width=760&lines=Modern+dating+app+frontend+with+real-time+chat;Swipe.+Match.+Chat.+Manage.;Built+with+Next.js%2C+React%2C+Tailwind+CSS+and+Socket.IO" alt="Animated intro for PairUp Frontend" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js 16 badge" />
  <img src="https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white" alt="React 19 badge" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-0EA5E9?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS badge" />
  <img src="https://img.shields.io/badge/Socket.IO-Real--Time-111827?style=for-the-badge&logo=socketdotio" alt="Socket.IO badge" />
</p>

<p align="center">
  <img src="https://media.giphy.com/media/qgQUggAC3Pfv687qPC/giphy.gif" alt="Animated coding scene" width="760" />
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Microsoft-Teams-Animated-Emojis/master/Emojis/Objects/Laptop.png" alt="Laptop sticker" width="72" />
  <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Microsoft-Teams-Animated-Emojis/master/Emojis/Objects/Mobile%20Phone.png" alt="Mobile phone sticker" width="72" />
  <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Microsoft-Teams-Animated-Emojis/master/Emojis/Travel%20and%20places/Rocket.png" alt="Rocket sticker" width="72" />
</p>

PairUp is a modern **frontend for a dating and matching app**.

In simple terms: a user creates an account, completes a profile, browses people in a swipe deck, sends likes or invites, chats in real time, and manages their own account settings. Admins get separate screens for users, reports, flagged content, messages, and analytics.

> This repository contains the **frontend app only**. It expects a backend API and Socket.IO server to be available.

## What This Project Does

- Lets users sign up, log in, and reset passwords
- Guides users to complete their profile before using discovery
- Shows a swipe-style discover experience for browsing people
- Supports invitations, likes, and real-time messaging
- Gives users profile stats, gallery controls, privacy settings, and block tools
- Includes admin dashboards for analytics and moderation

## Main Features

<details>
<summary><strong>User Side</strong></summary>

- Authentication flow with login, register, forgot password, and reset password
- Protected routes for signed-in users
- Public landing page and authenticated dashboard flow
- Discover page with swipe cards using `react-tinder-card`
- Profile completion gate before discovery unlocks
- User profile page with photo gallery, thumbnail picker, and activity stats
- Messaging UI with:
  - pending requests
  - new matches
  - conversation list
  - unread counts
  - live updates through Socket.IO
- Search, settings, sidebar navigation, and theme toggle
- Privacy, notification, password, block user, and delete account settings

</details>

<details>
<summary><strong>Admin Side</strong></summary>

- Admin analytics dashboard with charts powered by `recharts`
- Admin user management pages
- Admin reports page
- Admin flagged content page
- Admin messages page
- Admin route protection helpers

</details>

<details>
<summary><strong>Simple Product Walkthrough</strong></summary>

1. A user lands on PairUp and creates an account.
2. They fill in their profile, photos, interests, and preferences.
3. They open Discover and swipe through other profiles.
4. Likes, invites, and matches appear in the messaging area.
5. When a conversation starts, chat updates in real time.
6. Users can later manage privacy, notifications, and blocked accounts.
7. Admins can monitor platform activity from a separate dashboard.

</details>

## Tech Stack

| Area | Tools |
| --- | --- |
| Framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Forms & Validation | React Hook Form, Zod, Hookform Resolvers |
| Networking | Axios |
| Real-time | Socket.IO Client |
| UI & Icons | Lucide React, React Spring |
| Charts | Recharts |
| Testing | Jest, Supertest |

## Folder Overview

<details>
<summary><strong>Project Structure</strong></summary>

```text
app/
  (auth)/              auth pages and auth form components
  admin/               admin dashboard and moderation pages
  dashboard/           public marketing / landing experience
  profile/             user profile screens and profile modal
  settings/            account, privacy, and notification settings
  sidebar/             discover, message, search, home, create
  _components/         shared app-level UI pieces

components/            reusable route and layout helpers
context/               auth context
lib/                   api clients, auth helpers, hooks, actions
__tests__/             unit and integration tests
```

</details>

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create your environment file

Create a `.env.local` file in the project root.

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

You can also override specific endpoints if your backend uses different paths:

```env
NEXT_PUBLIC_USERS_ENDPOINT=/api/users/discover?includePrevious=false
NEXT_PUBLIC_MATCHES_ENDPOINT=/api/conversations
NEXT_PUBLIC_CONVERSATION_START_ENDPOINT=/api/conversations
NEXT_PUBLIC_NEW_MATCHES_ENDPOINT=/api/matches
NEXT_PUBLIC_LIKE_REQUESTS_ENDPOINT=/api/likes/pending
NEXT_PUBLIC_INVITE_REQUESTS_ENDPOINT=/api/invites/pending
NEXT_PUBLIC_LIKE_RESPOND_ENDPOINT=/api/likes
NEXT_PUBLIC_INVITE_RESPOND_ENDPOINT=/api/invites
NEXT_PUBLIC_NOTIFICATIONS_ENDPOINT=/api/notifications
NEXT_PUBLIC_NOTIFICATIONS_MARK_READ_ENDPOINT=/api/notifications/read
NEXT_PUBLIC_POST_LIKE_NOTIFICATIONS_ENDPOINT=/api/users/me/post-like-notifications
```

### 3. Start the frontend

```bash
npm run dev
```

Open `http://localhost:3000`.

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm test
npm run test:watch
npm run test:coverage
npm run test:unit
npm run test:integration
```

## Testing

The project already includes test folders for both unit and integration coverage:

- `__tests__/unit`
- `__tests__/integration`

## Why This README Is Different

This README is written to be easy to understand for someone opening the repo for the first time:

- simple explanation of the project
- clear feature summary
- quick setup steps
- collapsible sections for easier reading
- animated visuals to make the project page feel more alive

## Notes

- This app stores auth data in local storage for the current frontend flow.
- Several screens expect a working backend with authentication, user, match, chat, and admin endpoints.
- If the backend is not running, some pages will load but API-driven features will not work fully.

---

<p align="center">
  Built for learning, UI experimentation, and real-world app flow practice with Next.js.
</p>
