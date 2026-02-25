📄 PAIRUP — Modern MERN Dating Platform
💘 PairUp – Full-Stack Swipe-to-Match Dating Platform

PairUp is a production-ready Tinder-style dating application built using the MERN stack.
It features real-time chat, swipe-based matching, admin moderation tools, analytics dashboards, and automated safety enforcement systems.

This project demonstrates full-stack architecture, real-time systems, and scalable moderation design.

🚀 Tech Stack
Frontend

Next.js (App Router)

React

Tailwind CSS

Recharts

Socket.io Client

Backend

Node.js

Express.js

MongoDB + Mongoose

JWT Authentication

Role-Based Access Control

Socket.io

Nodemailer

🔐 Core Features
👤 Authentication

JWT-based login & signup

Role-based access (User / Admin)

Protected routes

Password reset

💘 Swipe-to-Match System

Right swipe = Like

Real-time like notifications

Accept / Decline flow

Automatic match creation

Duplicate prevention

💬 Real-Time Chat

Socket.io integration

Online/offline status

Match-restricted messaging

Message persistence

Admin message moderation

🚨 Safety & Moderation

Report system

Admin review panel

Auto-ban after multiple reports

Email notifications on ban

AI-based keyword flagging

Flagged content dashboard

📊 Admin Analytics Dashboard

Total users, matches, likes, messages

Growth charts (daily users, matches, messages)

Match rate calculation

Gender distribution

Top locations

Engagement metrics

🛡 Admin Controls

Ban / Unban users

Delete users

Monitor conversations

Review reports

Auto-ban enforcement

Email notification system

🧠 Architecture Highlights

Match-based chat restriction system

MongoDB aggregation pipelines for analytics

Real-time notification architecture

Auto moderation logic

Clean separation of concerns (controllers, routes, middleware)

Scalable admin monitoring structure

📸 Screenshots

(Add screenshots here)

Swipe Cards

Real-Time Chat

Admin Dashboard

Analytics Charts

Report Moderation Panel

⚙ Installation
1️⃣ Clone repository
git clone https://github.com/yourusername/pairup.git
2️⃣ Backend Setup
cd backend
npm install
npm run dev

Create .env:

MONGO_URI=your_mongo_uri
JWT_SECRET=your_secret
EMAIL_USER=your_email
EMAIL_PASS=your_password
3️⃣ Frontend Setup
cd frontend
npm install
npm run dev
🌱 Future Improvements

AI-based toxicity detection

Push notifications

Premium subscription model

Swipe limits

Deployment on AWS / Vercel / Render

Microservice-based chat scaling

🎯 What This Project Demonstrates

Full-stack application architecture

Real-time communication systems

Advanced MongoDB aggregation usage

Role-based admin systems

Moderation and safety enforcement logic

Production-level thinking