<div align="center">
  <img src="https://img.shields.io/badge/Valor-Fitness-000000?style=for-the-badge&logo=dumbbell&logoColor=white" alt="Valor Fitness Logo" />
  <br />
  <h1>Valor Fitness - Gym Management Ecosystem</h1>
  <p>
    <strong>A unified digital experience for gym owners, staff, and athletes.</strong>
  </p>

  <p>
    <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native" />
    <img src="https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
    <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  </p>
  <p>
    <img src="https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white" alt="Fastify" />
    <img src="https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white" alt="Prisma" />
    <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  </p>
</div>

<hr />

## About Valor Fitness

Valor Fitness is a comprehensive, single-tenant gym management platform designed to replace fragmented legacy systems. It bridges the gap between what athletes experience on the gym floor and how owners operate their business behind the scenes. 

The ecosystem consists of three main components:
1. **The Native Mobile App (iOS & Android)**: A beautifully crafted app for members to check in, track attendance, and manage their training.
2. **The Web Dashboard**: A powerful administrative portal for owners and staff to manage memberships, process payments, and monitor gym capacity.
3. **The Core API**: A high-performance, secure backend powering both clients simultaneously.

---

## Key Features

### For Athletes & Members
| Feature | Description |
| :--- | :--- |
| **Native Mobile Experience** | Access your gym from anywhere with a lightning-fast iOS & Android app. |
| **QR Code Check-ins** | Ditch the plastic card. Scan your unique digital code at the front desk. |
| **Attendance Tracking** | Visualize your consistency and view your historical check-in records. |
| **Plan Management** | View active memberships, check upcoming renewals, and handle billing securely. |
| **Dynamic Theming** | Personalize the app with Minimal, Glassmorphism, or Claymorphism UI themes, plus full Dark Mode support. |

### For Owners & Staff
| Feature | Description |
| :--- | :--- |
| **Role-Based Access** | Distinct permission tiers for Owners, Admins, Staff, and Members. |
| **Real-Time Dashboard** | Monitor live gym capacity, daily check-ins, and active memberships at a glance. |
| **Member Management** | Effortlessly onboard new members, suspend accounts, and upgrade tiers. |
| **Point of Sale (POS)** | Manage inventory for supplements and gear, and process orders directly at the front desk. |
| **Financial Insights** | Track revenue, monitor failed payments, and export actionable operational reports. |
| **WebAuthn / Passkeys** | State-of-the-art, passwordless authentication using biometric sensors (FaceID/TouchID). |

---

## Architecture & Stack

Valor Fitness is built as a modern, type-safe monorepo to ensure seamless data flow between the server and the clients.

* **Backend API (`apps/api`)**: Built for speed and reliability using Fastify. Data is modeled and persisted using Prisma ORM against a PostgreSQL database. Heavy operations and caching are backed by Redis.
* **Staff Dashboard (`apps/web`)**: A highly responsive Single Page Application built with React, Vite, Redux Toolkit, and styled with Tailwind CSS.
* **Member App (`apps/native`)**: A cross-platform mobile application built using React Native and Expo, utilizing Reanimated for fluid micro-interactions.
* **Shared Contract (`packages/shared`)**: A centralized source of truth for DTOs (Data Transfer Objects), enums, and TypeScript interfaces, ensuring the frontend and backend are always perfectly in sync.

---

## Credits

**Made by:** [nishant0320](https://github.com/nishant0320)  
**Maintainer / Contributor:** [nishur31](https://github.com/nishur31)  

---

<div align="center">
  <p><i>Empowering gyms to train harder and manage smarter.</i></p>
</div>
