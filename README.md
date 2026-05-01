<div align="center">

# ⚙️ Dhaman Backend

### Modular NestJS API — Structured Payment Protection Engine for Freelance Agreements

[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white)](https://neon.tech/)
[![Passport](https://img.shields.io/badge/Passport-JWT-34E27A?logo=passport&logoColor=white)](http://www.passportjs.org/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-AI-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![Resend](https://img.shields.io/badge/Resend-Email-000000?logo=resend&logoColor=white)](https://resend.com/)
[![Swagger](https://img.shields.io/badge/Swagger-OpenAPI-85EA2D?logo=swagger&logoColor=white)](https://swagger.io/)
[![Jest](https://img.shields.io/badge/Jest-30-C21325?logo=jest&logoColor=white)](https://jestjs.io/)
[![License](https://img.shields.io/badge/License-Private-red)]()

</div>

---

> **Core Principle:**
> Dhaman creates balanced financial protection between clients and freelancers: clients pay with confidence, and freelancers work with secured payment assurance.

---

## 📚 Table of Contents

- [🚧 Current Project Status](#-current-project-status)
- [🧾 Overview](#-overview)
- [🎯 Project Purpose](#-project-purpose)
- [💡 Product Concept](#-product-concept)
- [🧠 Backend Responsibilities](#-backend-responsibilities)
- [🧩 Core Modules](#-core-modules)
- [🔁 System Flow](#-system-flow)
- [📌 Agreement and Payment States](#-agreement-and-payment-states)
- [📖 API Documentation](#-api-documentation)
- [🛠️ Technology Stack](#-technology-stack)
- [📂 Project Structure](#-project-structure)
- [🔑 Key Files](#-key-files)
- [🔐 Environment Variables](#-environment-variables)
- [🚀 Getting Started](#-getting-started)
- [📜 Available Scripts](#-available-scripts)
- [🌱 Seeding the Database](#-seeding-the-database)
- [🧪 Testing](#-testing)
- [🔌 API Integration](#-api-integration)
- [🧪 Current Functional Status](#-current-functional-status)
- [🚢 Deployment](#-deployment)
- [🗺️ Roadmap](#-roadmap)
- [🔗 Related Repositories](#-related-repositories)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 🚧 Current Project Status

The Dhaman backend is actively under development, but the core system modules and primary API flows are already implemented.

The main backend functionality is ready, including:

- Freelancer authentication
- User and profile management
- Client management
- Agreement creation and management
- Agreement policies
- Milestone creation and tracking
- Secure client portal token flow
- Client invitation flow
- Demo protected payment states
- Delivery submission flow
- AI plan and AI review modules
- Timeline events
- Dashboard analytics
- Database seeding
- Swagger API documentation

Some secondary frontend integrations may still be in progress, but the backend already exposes the available system capabilities through Swagger.

You can explore and test all available backend routes here:

**Swagger API Documentation:**
https://backend.dhaman.wasmsoft.com/docs

From Swagger, you can view all modules, routes, request bodies, responses, authentication requirements, and test the available backend functionality directly.

---

## 🧾 Overview

**Dhaman Backend** is the main API layer and business logic engine of the Dhaman MVP.

It powers the full Dhaman workflow by managing:

- Freelancer authentication
- Client records
- Project agreements
- Agreement policies
- Project milestones
- Demo protected payments
- Client portal links
- Delivery submissions
- Timeline events
- AI-powered planning and dispute review
- Email invitations and notifications
- Dashboard analytics

The backend follows a modular NestJS architecture, where each domain has its own module, service, controller, DTOs, and related logic.

This structure keeps the system organized, scalable, and easier to extend as the product grows.

---

## 🎯 Project Purpose

Freelance work often suffers from unclear agreements, delayed payments, weak documentation, and trust issues between clients and freelancers.

Common problems include:

- Clients hesitate to pay before seeing work.
- Freelancers hesitate to start without payment security.
- Agreements are often informal and scattered across messages.
- Milestone conditions are not clearly defined.
- Payment release decisions are not transparent.
- Disputes are difficult to resolve fairly.
- There is no reliable timeline of actions, approvals, and delivery evidence.

Dhaman solves these problems by creating a structured backend system that connects every project agreement to milestones, payment states, delivery evidence, client review actions, and AI-assisted dispute evaluation.

The backend makes the product more than a simple dashboard. It turns freelance work into a controlled financial workflow.

---

## 💡 Product Concept

Dhaman is not a marketplace.

It is a financial protection layer for freelance agreements.

The system allows freelancers and clients to manage freelance work through structured agreements where every payment is connected to:

- A milestone
- A clear scope
- Acceptance criteria
- A delivery submission
- Client review
- Payment state
- Timeline evidence
- AI-assisted review if a dispute happens

The main system flow is:

```text
Agreement → Milestones → Protected Payments → Delivery → Review → Release or Hold
```

This provides both sides with a clearer, safer, and more transparent workflow.

---

## 🧠 Backend Responsibilities

The backend is responsible for enforcing the main business rules of the Dhaman platform.

It handles:

- Authentication and authorization
- Freelancer account management
- Client data management
- Agreement lifecycle management
- Milestone creation and validation
- Agreement policy storage
- Client portal token generation and validation
- Delivery submission tracking
- Payment state transitions
- Timeline event creation
- AI review request handling
- Email invitation and notification logic
- Dashboard analytics aggregation
- Database persistence through Prisma
- API documentation through Swagger

The backend controls the system rules so the frontend does not directly decide sensitive workflows such as payment state transitions, agreement activation, or dispute handling.

---

## 🧩 Core Modules

The backend is organized around domain-focused modules located inside `src/modules/`.

```text
src/modules/
├── agreement-policies/      # Agreement rules, revision policies, delay rules, and default policy logic
├── agreements/              # Agreement creation, updates, status management, and invitation workflow
├── ai-plan/                 # AI-assisted agreement planning and milestone suggestions
├── ai-review/               # AI-powered dispute review and recommendation logic
├── auth/                    # Freelancer authentication, login, registration, and JWT handling
├── change-requests/         # Client or freelancer change requests related to scope or agreement updates
├── client-portal/           # Secure token-based client access, invite review, and portal actions
├── clients/                 # Client records, client details, and freelancer-client relationship management
├── dashboard-analytics/     # Dashboard summary data, statistics, and activity overview
├── deliveries/              # Milestone delivery submissions, attachments, review actions, and delivery states
├── email-notifications/     # Email invitations, notifications, and outbound communication handling
├── milestones/              # Milestone creation, acceptance criteria, ordering, and tracking
├── payments/                # Demo protected payment flow, payment states, and payment transaction records
├── settings/                # User settings, default preferences, and configurable platform options
├── timeline-events/         # Timeline records for important agreement, payment, delivery, and portal actions
└── users/                   # User profile, freelancer account data, and user-related operations
```

---

## 🔁 System Flow

The complete Dhaman backend workflow can be summarized as:

```text
1.  Freelancer registers or logs in
2.  Backend authenticates freelancer and issues JWT
3.  Freelancer creates a client record
4.  Freelancer creates an agreement
5.  Freelancer adds milestones and acceptance criteria
6.  Backend creates or updates related payment records
7.  Freelancer sends invitation to the client
8.  Backend generates secure portal token
9.  Client opens invitation link
10. Client approves agreement or requests changes
11. Agreement becomes active after approval
12. Freelancer submits milestone delivery
13. Backend moves payment to client review
14. Client accepts, requests changes, or opens dispute
15. AI review analyzes dispute if needed
16. Payment becomes ready to release, released, or placed on hold
17. Timeline records all important actions
```

This flow demonstrates the main backend value: enforcing a structured payment protection workflow.

---

## 📌 Agreement and Payment States

Clear states are essential in Dhaman because the product is based on financial workflow control.

### Agreement States

| State             | Description                                        |
| ----------------- | -------------------------------------------------- |
| Draft             | Agreement is being created by the freelancer       |
| Sent              | Agreement invitation has been sent to the client   |
| Change Requested  | Client requested edits before approval             |
| Active            | Client approved and project execution started      |
| Disputed          | A milestone or payment is under dispute            |
| Completed         | All milestones are completed and payments released  |
| Archived          | Agreement is no longer active                      |

### Payment States

| State              | Description                                              |
| ------------------- | -------------------------------------------------------- |
| Waiting             | Payment is not yet reserved                              |
| Reserved            | Payment is protected or reserved for the milestone       |
| Client Review       | Delivery was submitted and is waiting for client review   |
| AI Review           | Dispute is being analyzed by AI                           |
| Ready to Release    | Payment can be released                                  |
| Released            | Payment has been released                                |
| On Hold             | Payment is temporarily blocked due to dispute or issue   |

### Delivery States

| State              | Description                                   |
| ------------------- | --------------------------------------------- |
| Draft               | Delivery is being prepared                    |
| Submitted           | Delivery was submitted to the client          |
| Accepted            | Client accepted the delivery                  |
| Changes Requested   | Client requested modifications               |
| Disputed            | Delivery is under dispute review              |

---

## 📖 API Documentation

The backend provides Swagger documentation for exploring and testing available API routes.

Swagger is available here:

```text
https://backend.dhaman.wasmsoft.com/docs
```

Swagger allows developers and testers to:

- View all backend modules
- Inspect available endpoints
- Test authentication routes
- Create agreements, milestones, and invitations
- Test client portal routes
- Test payment and delivery workflows
- Trigger AI-related routes
- Inspect request and response schemas

This is the recommended place to test backend functionality directly, especially while frontend integration is still in progress for some modules.

---

## 🛠️ Technology Stack

### Backend Framework

| Technology          | Purpose                                   |
| ------------------- | ----------------------------------------- |
| NestJS 11           | Progressive Node.js framework             |
| TypeScript 5        | Type-safe server-side development         |
| Node.js             | Runtime environment                      |

### Database & ORM

| Technology          | Purpose                                   |
| ------------------- | ----------------------------------------- |
| PostgreSQL / Neon   | Managed PostgreSQL database               |
| Prisma 6            | Type-safe database ORM                    |

### Authentication & Access Control

| Technology          | Purpose                                   |
| ------------------- | ----------------------------------------- |
| JWT                 | Freelancer authentication                 |
| Passport.js         | Authentication middleware                 |
| Portal Tokens       | Secure client access                      |
| bcrypt              | Password hashing                          |

### AI Integration

| Technology          | Purpose                                   |
| ------------------- | ----------------------------------------- |
| Google Gemini API   | AI-assisted planning and dispute review   |

### Email & Notifications

| Technology          | Purpose                                   |
| ------------------- | ----------------------------------------- |
| Resend              | Email delivery and invitations            |

### Documentation & Testing

| Technology          | Purpose                                   |
| ------------------- | ----------------------------------------- |
| Swagger / OpenAPI   | Interactive API documentation             |
| Jest 30             | Unit and integration testing              |
| Supertest           | HTTP assertion testing                    |

### Security & Tooling

| Technology          | Purpose                                   |
| ------------------- | ----------------------------------------- |
| Helmet              | HTTP security headers                     |
| ESLint              | Code linting and quality                  |
| Prettier            | Code formatting                           |
| Nest CLI            | Scaffolding and development               |
| Prisma CLI          | Database migrations and management        |

---

## 📂 Project Structure

```text
dhaman_backend/
├── docs/                        # Internal backend module plans and implementation documentation
├── prisma/                      # Prisma schema, migrations, and database seed files
│   ├── migrations/              # Database migration history
│   ├── schema/                  # Prisma schema files
│   ├── seed.ts                  # Database seeding entry point
│   └── seed/                    # Seed data modules
├── src/                         # Main NestJS application source code
│   ├── common/                  # Shared decorators, guards, filters, pipes, utilities, and constants
│   ├── config/                  # Application configuration and environment setup
│   ├── infrastructure/
│   │   └── prisma/              # Prisma service, database provider, and Prisma infrastructure layer
│   ├── modules/                 # Domain-based backend modules
│   │   ├── agreement-policies/  # Agreement rules and policies
│   │   ├── agreements/          # Agreement lifecycle management
│   │   ├── ai-plan/             # AI-assisted agreement planning
│   │   ├── ai-review/           # AI-powered dispute review
│   │   ├── auth/                # Authentication and JWT handling
│   │   ├── change-requests/     # Change request management
│   │   ├── client-portal/       # Token-based client portal access
│   │   ├── clients/             # Client records management
│   │   ├── dashboard-analytics/ # Dashboard statistics and overview
│   │   ├── deliveries/          # Delivery submissions and review
│   │   ├── email-notifications/ # Email invitations and notifications
│   │   ├── milestones/          # Milestone creation and tracking
│   │   ├── payments/            # Payment states and transactions
│   │   ├── settings/            # User settings and preferences
│   │   ├── timeline-events/     # Timeline records and evidence
│   │   └── users/               # User profile and account management
│   ├── test/                    # Source-level test helpers
│   ├── app.controller.ts        # Root application controller
│   ├── app.module.ts            # Root NestJS module
│   ├── app.service.ts           # Root application service
│   └── main.ts                  # Application bootstrap file
├── test/                         # End-to-end tests and external test setup
├── .env                          # Environment variables (gitignored)
├── .gitignore                    # Git ignored files and folders
├── AGENTS_BACKEND.md             # Backend-specific agent instructions
├── eslint.config.mjs             # ESLint configuration
├── nest-cli.json                 # NestJS CLI configuration
├── package.json                  # Dependencies and scripts
├── prisma.config.ts              # Prisma configuration
├── tsconfig.build.json          # TypeScript build configuration
└── tsconfig.json                 # TypeScript compiler configuration
```

---

## 🔑 Key Files

| File                          | Purpose                                                 |
| ----------------------------- | ------------------------------------------------------- |
| `src/main.ts`                 | Application bootstrap, CORS, Swagger, and global pipes  |
| `src/app.module.ts`           | Root NestJS module                                       |
| `prisma/schema/`              | Prisma database schema definitions                       |
| `prisma/seed.ts`              | Database seeding entry point                             |
| `src/common/`                  | Shared guards, filters, interceptors, and pipes          |
| `src/config/`                  | Application configuration and environment setup           |
| `src/infrastructure/prisma/`  | Prisma service and database provider                     |
| `prisma.config.ts`             | Prisma configuration file                                |
| `nest-cli.json`                | NestJS CLI configuration                                 |
| `.env`                         | Environment variables (gitignored, use .env.example)      |

---

## 🔐 Environment Variables

Create a `.env` file in the root directory and configure the required environment variables.

```env
# Database
DATABASE_URL="YOUR_DATABASE_URL"

# Authentication
JWT_SECRET="YOUR_JWT_SECRET"
JWT_EXPIRES_IN="7d"

# Client Portal
CLIENT_PORTAL_TOKEN_SECRET="YOUR_CLIENT_PORTAL_TOKEN_SECRET"

# Server
PORT=8080
APP_URL="http://localhost:8080"
FRONTEND_URL="http://localhost:3032"

# Localization
DEFAULT_LOCALE="ar"

# Payment
PAYMENT_MODE="demo"

# Email
EMAIL_FROM="no-reply@your-domain.com"
RESEND_API_KEY="YOUR_RESEND_API_KEY"

# AI
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
GEMINI_MODEL="gemini-1.5-flash"
GEMINI_TIMEOUT_MS="30000"

# Storage
STORAGE_DRIVER="local"

# Logging
ENABLE_REQUEST_LOGGING="true"

# CORS
# FRONTEND_URL can be a comma-separated list of allowed origins
```

> Never commit real secrets to version control. Always use `.env` locally and `.env.example` as a template.

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- **Node.js** 18+
- **npm**
- **PostgreSQL** database or Neon PostgreSQL
- **Git**

Optional but recommended:

- Prisma CLI
- A REST client such as Postman or Insomnia
- Access to the Swagger documentation

### Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/dhaman_backend.git
```

Navigate into the project directory:

```bash
cd dhaman_backend
```

Install project dependencies:

```bash
npm install
```

Install Resend for email invitations and notifications:

```bash
npm install resend
```

Create your environment file:

```bash
cp .env.example .env
```

Update the `.env` file with your database URL, JWT secret, portal token secret, Resend API key, AI key, and other required configuration values.

### Prisma Setup

Generate Prisma client:

```bash
npx prisma generate
```

Run database migrations:

```bash
npx prisma migrate dev
```

Optional — open Prisma Studio:

```bash
npx prisma studio
```

### Run the Development Server

```bash
npm run start:dev
```

The backend should run locally at:

```text
http://localhost:8080
```

Swagger may be available locally at:

```text
http://localhost:8080/docs
```

---

## 📜 Available Scripts

| Command                    | Description                          |
| ------------------------- | ------------------------------------ |
| `npm run start:dev`       | Start development server (watch mode) |
| `npm run start:prod`     | Start production server              |
| `npm run build`           | Build the project                    |
| `npm run lint`            | Run ESLint                           |
| `npm run format`          | Format code with Prettier            |
| `npm run test`            | Run unit and integration tests        |
| `npm run test:e2e`        | Run end-to-end tests                 |
| `npm run test:cov`         | Run tests with coverage              |
| `npm run prisma:generate` | Generate Prisma client               |
| `npm run prisma:migrate`  | Run Prisma migrations                |
| `npm run prisma:studio`   | Open Prisma Studio                   |
| `npm run prisma:seed`     | Seed the database                    |

---

## 🌱 Seeding the Database

The backend includes database seeding support for development and demo data.

Seeding may create sample records such as:

- Demo freelancer user
- Demo clients
- Demo agreements
- Demo milestones
- Demo payments
- Demo deliveries
- Demo timeline events

Run seed command:

```bash
npm run prisma:seed
```

Or use the project-specific seed script from `package.json` if available.

---

## 🧪 Testing

The backend includes testing support through NestJS testing tools.

Testing coverage includes:

- Unit tests
- Service tests
- Controller tests
- Integration tests
- End-to-end tests
- API workflow tests

Run tests with:

```bash
npm run test
```

Run end-to-end tests with:

```bash
npm run test:e2e
```

Run coverage report:

```bash
npm run test:cov
```

---

## 🔌 API Integration

The backend is used by:

- `dhaman_landing_page`
- `dhaman_dashboard`
- Client portal frontend routes
- Swagger API testers

The dashboard frontend communicates with the backend for:

- Login
- Current user data
- Agreement creation
- Milestone creation
- Client invitation
- Portal access
- Delivery review
- Payment state tracking
- AI review actions
- Timeline events

During development, some frontend modules may still be under integration. Use Swagger to directly test the backend routes:

```text
https://backend.dhaman.wasmsoft.com/docs
```

---

## 🧪 Current Functional Status

### ✅ Ready

The backend already supports the main Dhaman system capabilities:

- Authentication
- User module
- Client module
- Agreement module
- Agreement policies module
- Milestone module
- Payment module
- Client portal module
- Delivery module
- AI plan module
- AI review module
- Change request module
- Timeline events module
- Email or notification logic
- Dashboard analytics
- Prisma database integration
- Database seeding
- Swagger documentation

### 🔄 Partially Connected from Frontend

Some secondary features may already exist in the backend but may not be fully integrated in the frontend yet, including:

- Advanced dashboard analytics
- Some payment history views
- Some AI review UI screens
- Some delivery review screens
- Some timeline visualizations
- Some settings and policy management screens

### 📡 Testable Through Swagger

Even when a frontend screen is not fully connected yet, the backend API route may already be available.

```text
https://backend.dhaman.wasmsoft.com/docs
```

---

## 🚢 Deployment

The backend can be deployed to any Node.js-compatible hosting platform.

Possible deployment targets include:

- **Render**
- **Railway**
- **Fly.io**
- **DigitalOcean**
- **AWS**
- **Google Cloud**
- **Azure**
- **VPS hosting**

### Production Build

```bash
npm run build
```

### Production Start

```bash
npm run start:prod
```

### Deployment Checklist

Before deploying, make sure:

- `DATABASE_URL` is configured correctly
- Prisma migrations are applied
- JWT secrets are set
- CORS is configured for frontend domains
- Swagger exposure is controlled if needed
- Email provider keys are configured
- AI provider keys are configured
- Environment variables are stored securely
- Production database is not using development seed data unless intended

---

## 🗺️ Roadmap

Planned backend improvements may include:

- Full production payment provider integration
- Real escrow or payment gateway workflow
- Stronger portal token expiration and refresh logic
- Magic link or OTP for client access
- Advanced audit logging
- More detailed notification system
- File storage integration
- Webhook support
- Role-based access control
- Multi-tenant organization support
- Real-time updates
- Advanced analytics
- Improved AI review explainability
- Production-ready dispute workflow
- Security hardening
- Rate limiting
- Background jobs and queues
- Better monitoring and logging

---

## 🔗 Related Repositories

Dhaman is organized into multiple repositories:

| Repository              | Description                                              |
| ----------------------- | -------------------------------------------------------- |
| `dhaman_landing_page`  | Public product landing page                             |
| `dhaman_dashboard`     | Freelancer dashboard and client portal frontend          |
| `dhaman_backend`        | NestJS backend API with Prisma and PostgreSQL            |

---

## 🤝 Contributing

Contributions are welcome.

Recommended contribution areas:

- Backend module improvements
- API design improvements
- Prisma schema optimization
- Authentication and authorization improvements
- Error handling
- Validation logic
- Testing coverage
- Swagger documentation
- AI prompt and review logic
- Payment workflow logic
- Timeline event consistency
- Email and notification improvements
- Deployment configuration

### Contribution Flow

Create a new branch:

```bash
git checkout -b feature/your-feature-name
```

Commit your changes:

```bash
git commit -m "feat: add improved backend module"
```

Push your branch:

```bash
git push origin feature/your-feature-name
```

Then open a Pull Request.

---

## 📄 License

This project is part of the Dhaman MVP.

License details can be added based on the final project decision.

---

<div align="center">

**Dhaman Backend** — *A financial protection layer for freelance payments.*

</div>
