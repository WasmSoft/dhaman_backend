# Dhaman Backend

A modular backend API for **Dhaman**, a fintech MVP designed to protect freelance payments through structured agreements, milestone-based payment contracts, protected payment flows, client portal access, delivery tracking, timeline evidence, and AI-powered dispute review.

The backend is built with **NestJS**, **Prisma**, and **PostgreSQL**, and it acts as the core business engine for the Dhaman platform. It manages authentication, clients, agreements, milestones, payments, deliveries, AI reviews, portal tokens, email invitations, dashboard analytics, and system state transitions.

> **Core Principle:**  
> Dhaman creates balanced financial protection between clients and freelancers: clients pay with confidence, and freelancers work with secured payment assurance.

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

## 📚 Table of Contents

- [Overview](#overview)
- [Project Purpose](#project-purpose)
- [Product Concept](#product-concept)
- [Backend Responsibilities](#backend-responsibilities)
- [Core Modules](#core-modules)
- [System Flow](#system-flow)
- [Agreement and Payment States](#agreement-and-payment-states)
- [API Documentation](#api-documentation)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Database and Prisma](#database-and-prisma)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Seeding the Database](#seeding-the-database)
- [Testing](#testing)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Related Repositories](#related-repositories)
- [Contributing](#contributing)
- [License](#license)

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

The backend is organized around domain-focused modules.

### Auth Module

Handles freelancer authentication.

Responsibilities include:

- Registering users
- Logging users in
- Returning authenticated user data
- Generating JWT access tokens
- Protecting private freelancer routes

Typical routes may include:

```text
POST /auth/register
POST /auth/login
GET  /auth/me
POST /auth/logout
```

---

### Users Module

Handles freelancer account information and profile-related data.

Responsibilities include:

- Reading freelancer profile
- Updating freelancer profile
- Managing user settings
- Connecting user data to agreements and clients

---

### Clients Module

Handles client records connected to freelancers.

Responsibilities include:

- Creating clients
- Updating client information
- Listing freelancer clients
- Linking clients to agreements
- Providing client summaries

Clients do not need full accounts in the MVP. They access agreements through secure portal links.

---

### Agreements Module

The central module of the system.

Responsibilities include:

- Creating agreements
- Updating agreement details
- Listing agreements
- Reading agreement details
- Sending agreement invitations
- Activating agreements after client approval
- Managing agreement lifecycle states
- Connecting agreements to clients, milestones, payments, policies, and timeline events

Agreement states include:

```text
Draft → Sent → Active → Completed / Disputed / Archived
```

---

### Agreement Policies Module

Handles rules and conditions attached to agreements.

Responsibilities include:

- Delay policies
- Cancellation policies
- Revision policies
- Acceptance rules
- Dispute review conditions
- Default freelancer policies

These policies help the system and AI review module understand what was agreed between the freelancer and the client.

---

### Milestones Module

Handles project milestones inside agreements.

Responsibilities include:

- Creating milestones
- Updating milestones
- Deleting milestones
- Reordering milestones
- Connecting milestones to payments
- Connecting milestones to acceptance criteria
- Tracking milestone progress

A milestone may include:

- Title
- Description
- Amount
- Due date
- Acceptance criteria
- Delivery expectations
- Payment connection

---

### Payments Module

Handles demo protected payment logic.

Responsibilities include:

- Creating payment records for milestones
- Tracking payment status
- Recording payment transactions
- Moving payments between controlled states
- Supporting simulated protected payment flows
- Preparing future integration with real payment providers

Payment state changes should be handled through backend services, not directly from the frontend.

---

### Client Portal Module

Handles secure client access without requiring a full client account.

Responsibilities include:

- Generating portal tokens
- Validating portal tokens
- Returning invite details
- Returning portal project details
- Allowing client agreement approval
- Allowing client change requests
- Allowing client delivery review actions

The portal token is linked to one agreement and gives the client controlled access to that agreement.

---

### Deliveries Module

Handles freelancer delivery submissions.

Responsibilities include:

- Creating deliveries for milestones
- Submitting delivery content
- Managing delivery status
- Handling delivery links and attachments
- Moving payment state to client review
- Allowing client acceptance or change requests
- Connecting delivery actions to timeline events

---

### AI Plan Module

Supports AI-assisted agreement planning.

Responsibilities include:

- Receiving project description and basic project details
- Generating suggested milestones
- Suggesting acceptance criteria
- Suggesting policy warnings
- Helping freelancers create better structured agreements

The AI plan is a support tool, not the final authority.

---

### AI Review Module

Supports AI-assisted dispute review.

Responsibilities include:

- Reading agreement terms
- Reading milestone criteria
- Reading delivery details
- Reading client objection
- Comparing dispute details with agreed scope
- Returning recommendation
- Storing AI review results

The AI review helps explain disputes, but final business decisions can still be controlled by the platform workflow.

---

### Change Requests Module

Handles requested modifications from clients or changes outside the original agreement.

Responsibilities include:

- Creating change requests
- Tracking request status
- Connecting requests to agreements or milestones
- Supporting scope change discussions
- Helping separate original agreement work from additional work

---

### Timeline Module

Tracks important events across the agreement lifecycle.

Responsibilities include recording events such as:

- Agreement created
- Agreement sent
- Client approved agreement
- Client requested changes
- Payment reserved
- Delivery submitted
- Client accepted delivery
- Client requested changes
- AI review opened
- Payment released
- Agreement completed

Timeline events provide transparency and evidence for both sides.

---

### Email and Notifications Module

Handles outbound communication.

Responsibilities include:

- Sending agreement invitations
- Sending delivery review notifications
- Sending status updates
- Logging email attempts
- Supporting email previews during development

The MVP may use services such as Resend for email delivery.

---

### Dashboard Analytics Module

Provides summarized data for the freelancer dashboard.

Responsibilities include:

- Total agreements
- Active agreements
- Pending client actions
- Payments under review
- Released payments
- Disputed payments
- Recent activity
- Dashboard summary cards

---

## 🔁 System Flow

The complete Dhaman backend workflow can be summarized as:

```text
1. Freelancer registers or logs in
2. Backend authenticates freelancer and issues JWT
3. Freelancer creates a client record
4. Freelancer creates an agreement
5. Freelancer adds milestones and acceptance criteria
6. Backend creates or updates related payment records
7. Freelancer sends invitation to the client
8. Backend generates secure portal token
9. Client opens invitation link
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

```text
Draft              → Agreement is being created by the freelancer
Sent               → Agreement invitation has been sent to the client
Change Requested   → Client requested edits before approval
Active             → Client approved and project execution started
Disputed           → A milestone or payment is under dispute
Completed          → All milestones are completed and payments released
Archived           → Agreement is no longer active
```

### Payment States

```text
Waiting            → Payment is not yet reserved
Reserved           → Payment is protected or reserved for the milestone
Client Review      → Delivery was submitted and is waiting for client review
AI Review          → Dispute is being analyzed by AI
Ready to Release   → Payment can be released
Released           → Payment has been released
On Hold            → Payment is temporarily blocked due to dispute or issue
```

### Delivery States

```text
Draft              → Delivery is being prepared
Submitted          → Delivery was submitted to the client
Accepted           → Client accepted the delivery
Changes Requested  → Client requested modifications
Disputed           → Delivery is under dispute review
```

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
- Create agreements
- Create milestones
- Send client invitations
- Test client portal routes
- Test payment workflows
- Test delivery workflows
- Trigger AI-related routes
- Inspect request and response schemas

This is the recommended place to test backend functionality directly, especially while frontend integration is still in progress for some modules.

---

## 🛠️ Technology Stack

### Backend Framework

- NestJS
- TypeScript
- Node.js

### Database and ORM

- PostgreSQL
- Neon PostgreSQL
- Prisma ORM

### Authentication and Access Control

- JWT authentication for freelancers
- Secure portal tokens for clients
- Protected routes and guards

### AI Integration

- Google Gemini API
- AI plan generation
- AI dispute review

### Email and Notifications

- Resend
- Email invitation flow
- Email logs or preview support

### Documentation and Testing

- Swagger / OpenAPI
- Jest
- Supertest
- Testing utilities

### Tooling

- ESLint
- Prettier
- Nest CLI
- Prisma CLI
- TypeScript build configuration

---

## 📂 Project Structure

The repository follows a modular NestJS backend architecture with dedicated folders for documentation, Prisma database configuration, application source code, and testing.

```text
dhaman_backend/
├── docs/                       # Internal backend module plans and implementation documentation
├── prisma/                     # Prisma schema, migrations, and database seed files
├── src/                        # Main NestJS application source code
│   ├── common/                 # Shared decorators, guards, filters, pipes, utilities, and constants
│   ├── config/                 # Application configuration and environment setup
│   ├── infrastructure/
│   │   └── prisma/             # Prisma service, database provider, and Prisma infrastructure layer
│   ├── modules/                # Domain-based backend modules
│   ├── test/                   # Source-level test helpers or module-specific test utilities
│   ├── app.controller.spec.ts  # Root controller test file
│   ├── app.controller.ts       # Root application controller
│   ├── app.module.ts           # Root NestJS module
│   ├── app.service.ts          # Root application service
│   └── main.ts                 # Application bootstrap file
├── test/                       # End-to-end tests and external test setup
├── .gitignore                  # Git ignored files and folders
├── .prettierignore             # Files ignored by Prettier
├── .prettierrc                 # Prettier formatting configuration
├── AGENTS_BACKEND.md           # Backend-specific AI agent or collaboration instructions
├── README.md                   # Project documentation
├── eslint.config.mjs           # ESLint configuration
├── nest-cli.json               # NestJS CLI configuration
├── opencode.json               # OpenCode configuration
├── package-lock.json           # Locked npm dependency versions
├── package.json                # Project dependencies, metadata, and available scripts
├── prisma.config.ts            # Prisma configuration
├── test-output-final.txt       # Test output log
├── test-output.txt             # Test output log
├── test-results.txt            # Test result log
├── test-result2.txt            # Test result log
├── test-result3.txt            # Test result log
├── tsconfig.build.json         # TypeScript build configuration
└── tsconfig.json               # TypeScript compiler configuration
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js 18+
- npm
- PostgreSQL database or Neon PostgreSQL
- Git

Optional but recommended:

- Prisma CLI
- A REST client such as Postman or Insomnia
- Access to the Swagger documentation

---

### Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/dhaman_backend.git
```

Navigate into the project directory:

```bash
cd dhaman_backend
```

Install dependencies:

```bash
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

Update the `.env` file with your database URL, JWT secret, AI key, email key, and other required configuration values.

---

### Prisma Setup

Generate Prisma client:

```bash
npx prisma generate
```

Run database migrations:

```bash
npx prisma migrate dev
```

Optional: open Prisma Studio:

```bash
npx prisma studio
```

---

### Run the Development Server

```bash
npm run start:dev
```

The backend should run locally at:

```text
http://localhost:3000
```

Swagger may be available locally at:

```text
http://localhost:3000/docs
```

---

## 📜 Available Scripts

### Start Development Server

```bash
npm run start:dev
```

### Start Production Server

```bash
npm run start:prod
```

### Build the Project

```bash
npm run build
```

### Run Linting

```bash
npm run lint
```

### Format Code

```bash
npm run format
```

### Run Tests

```bash
npm run test
```

### Run End-to-End Tests

```bash
npm run test:e2e
```

### Run Test Coverage

```bash
npm run test:cov
```

Depending on the final `package.json`, some script names may differ.

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

Run seed command if configured:

```bash
npx prisma db seed
```

Or use the project-specific seed script from `package.json` if available.

---

## 🧪 Testing

The backend includes testing support through NestJS testing tools.

Testing may cover:

- Unit tests
- Service tests
- Controller tests
- Integration tests
- End-to-end tests
- API workflow tests

Test result files may be stored in the repository for development tracking, including:

```text
test-output.txt
test-output-final.txt
test-results.txt
test-result2.txt
test-result3.txt
```

Run tests with:

```bash
npm run test
```

Run end-to-end tests with:

```bash
npm run test:e2e
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

During development, some frontend modules may still be under integration. In that case, use Swagger to directly test the backend routes:

```text
https://backend.dhaman.wasmsoft.com/docs
```

---

## 🧪 Current Functional Status

### Ready

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

### Partially Connected from Frontend

Some secondary features may already exist in the backend but may not be fully integrated in the frontend yet.

Examples may include:

- Advanced dashboard analytics
- Some payment history views
- Some AI review UI screens
- Some delivery review screens
- Some timeline visualizations
- Some settings and policy management screens

### Testable Through Swagger

Even when a frontend screen is not fully connected yet, the backend API route may already be available.

Use Swagger to test:

```text
https://backend.dhaman.wasmsoft.com/docs
```

---

## 🚢 Deployment

The backend can be deployed to any Node.js-compatible hosting platform.

Possible deployment targets include:

- Render
- Railway
- Fly.io
- DigitalOcean
- AWS
- Google Cloud
- Azure
- VPS hosting

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

```text
dhaman_landing_page   # Public product landing page
dhaman_dashboard      # Freelancer dashboard and client portal frontend
dhaman_backend        # NestJS backend API with Prisma and PostgreSQL
```

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

## 👥 Team Note

Dhaman Backend is the core system engine for a focused fintech MVP:

```text
A financial protection layer for freelance payments.
```

The goal of this repository is to provide a reliable, modular, and scalable backend API that supports structured agreements, milestone-based payments, secure client access, delivery review, payment state control, and AI-assisted dispute resolution.
