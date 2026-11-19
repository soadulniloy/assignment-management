# Assignment & Submission Management System

A role-based Assignment & Submission Management System for schools and colleges. Admins manage users and courses, teachers create and grade assignments, and students view and submit their work securely.

![.NET 10](https://img.shields.io/badge/.NET-10.0-512BD4)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)
![Docker](https://img.shields.io/badge/Docker-PostgreSQL-2496ED)
![JWT](https://img.shields.io/badge/Auth-JWT-black)

> **Status:** the backend API and the Next.js frontend are both in this repo. The frontend is live at https://assignment-management-black.vercel.app and runs in demo mode (built-in mock data in the browser) — login works there with the demo accounts below. The API is not deployed anywhere yet; run it locally (see [Setup](#setup)) — the API at http://localhost:5224, the frontend at http://localhost:3000.

## Overview

The system provides separate dashboards and permissions for three roles:

| Role | What they do |
|---|---|
| **Admin** | Manage users, courses, teacher assignments, and student enrollment |
| **Teacher** | Create, publish, and grade assignments for assigned courses |
| **Student** | View published assignments, submit answers, update submissions before deadlines, and view grades and feedback |

The backend uses JWT authentication and strict role-based authorization, with business rules enforced at the API/service level.

## Features

### Admin

- Create Admin, Teacher, and Student accounts
- Create courses/subjects
- Assign teachers to courses
- Enroll students in courses
- View users and courses

### Teacher

- Create assignments for assigned courses
- Set assignment deadlines and maximum marks
- Publish assignments
- View student submissions
- Grade submissions and provide written feedback
- Marks are validated against the assignment's maximum marks
- Teachers can only manage assignments for their assigned courses

### Student

- View published assignments for enrolled courses
- Submit text-based answers
- Update submissions before the deadline
- Submission updates are blocked after teacher review
- View marks and teacher feedback after grading

### Security & Validation

- JWT-based authentication
- Role-based authorization
- Protected backend API endpoints
- Students cannot submit after the deadline
- Students cannot update submissions after the deadline
- Students cannot update reviewed submissions
- Teachers cannot assign marks above the maximum marks
- Teachers cannot grade submissions outside their assigned courses

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript (App Router), Tailwind CSS |
| Backend | ASP.NET Core Web API |
| Language | C# (.NET 10) |
| ORM | Entity Framework Core |
| Database | PostgreSQL 16 |
| Database Runtime | Docker |
| Authentication | JWT |
| API Documentation | Swagger / OpenAPI |
| Testing | xUnit (EF Core InMemory test database) |

## Project Structure

```text
assignment-management/
├── backend/
│   ├── AssignmentApi/            # ASP.NET Core Web API (.NET 10)
│   │   ├── Controllers/          # Auth, Users, Courses, Teacher, Assignments, Submissions
│   │   ├── Data/                 # AppDbContext, DbSeeder
│   │   ├── Models/               # Entities, DTOs
│   │   ├── Services/             # AuthService, AssignmentService
│   │   └── Program.cs
│   └── AssignmentApi.Tests/      # xUnit tests
├── frontend/
│   ├── web/                      # Next.js app (App Router, TypeScript, Tailwind)
│   │   ├── app/                  # login, admin, teacher, student
│   │   ├── components/
│   │   └── lib/
│   └── assignment-ui             # leftover broken submodule pointer from the initial commit — ignore it
├── docker-compose.yml            # PostgreSQL 16 on port 5433
└── README.md
```

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download) (the API targets `net10.0`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL)
- Node.js 18+ and npm — for the frontend

Verify:

```bash
dotnet --version
docker --version
```

## Setup

### Step 1: Clone the repository

```bash
git clone https://github.com/soadulniloy/assignment-management.git
cd assignment-management
```

### Step 2: Start PostgreSQL

From the project root (where `docker-compose.yml` is):

```bash
docker compose up -d
docker compose ps
```

PostgreSQL runs in Docker, exposed on port **5433** (database `assignment_db`).

To stop it:

```bash
docker compose down
```

### Step 3: Start the backend

In a new terminal:

```bash
cd backend/AssignmentApi
dotnet restore
dotnet run
```

The API will be available at:

- API: **http://localhost:5224**
- Swagger UI: **http://localhost:5224/swagger**

On startup, EF Core initializes the database (`EnsureCreated`) and the seeder creates the demo users and sample data.

### Step 4: Start the frontend

In a new terminal:

```bash
cd frontend/web
cp .env.example .env.local   # already contains NEXT_PUBLIC_API_URL=http://localhost:5224
npm install
npm run dev
```

The frontend will be available at http://localhost:3000. Log in with any of the demo accounts above. When the API is deployed, set `NEXT_PUBLIC_API_URL` in `.env.local` (or on Vercel) to the live API URL.

## Demo mode

When `NEXT_PUBLIC_API_URL` is not set, the frontend runs entirely in the browser against built-in mock data (stored in localStorage, seeded with the same demo accounts and sample assignment as the API). The deployed site uses demo mode, so login, dashboards, submissions and grading all work without a backend. Data is per-browser only, and a "Reset demo data" button restores the seed. Set `NEXT_PUBLIC_API_URL` to a live API URL to use the real backend instead.

## Running Unit Tests

```bash
cd backend/AssignmentApi.Tests
dotnet test
```

The tests use the EF Core InMemory provider and cover the important business rules:

- Submission deadline validation
- Submission update permissions
- Teacher authorization
- Maximum marks validation
- Reviewed submission restrictions

## Demo Credentials

The database is automatically seeded with demo accounts (local development and evaluation only):

| Role | Email | Password |
|---|---|---|
| Admin | admin@school.com | Admin123! |
| Teacher | teacher@school.com | Teacher123! |
| Student | student@school.com | Student123! |

## Application Flow

```text
                    ┌──────────────────┐
                    │      Login       │
                    └────────┬─────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
          ┌──────────┐ ┌───────────┐ ┌───────────┐
          │  Admin   │ │  Teacher  │ │  Student  │
          └────┬─────┘ └─────┬─────┘ └─────┬─────┘
               │             │             │
               ▼             ▼             ▼
        Manage Users    Create/Grade    View/Submit
        Manage Courses   Assignments     Assignments
        Enroll Students  Review Work     View Grades
```

## Business Rules

### Assignment Rules

- Assignments belong to a specific course.
- Teachers can only create assignments for courses assigned to them.
- Assignments can be published by teachers.
- Each assignment has a deadline and maximum marks.

### Submission Rules

- Only enrolled students can access the relevant assignments.
- Students can submit answers before the deadline.
- Empty submissions are rejected.
- Students can update submissions before the deadline.
- Students cannot update submissions after the deadline.
- Students cannot update submissions after teacher review.

### Grading Rules

- Only the teacher responsible for the course can review submissions.
- Marks cannot exceed the assignment's maximum marks.
- Reviewed submissions contain marks and optional feedback.

## Authentication & Authorization

The application uses JWT tokens for authentication. After a successful login:

1. The backend validates the user's credentials.
2. A JWT token is generated.
3. The frontend (or API client) stores the authenticated session.
4. Requests to protected API endpoints include the JWT.
5. Backend authorization verifies the user's role.
6. Unauthorized users are denied access.

Roles: **Admin**, **Teacher**, **Student** — each role can access only the operations its authorization rules permit.

## Database Design

Main entities:

```text
User
 │
 ├── Admin
 ├── Teacher
 └── Student
       │
       ▼
   Enrollment
       │
       ▼
     Course
       │
       ▼
   Assignment
       │
       ▼
   Submission
```

A Course represents a class/subject combination, e.g. `Class 10 - Mathematics`, `Class 10 - Physics`, `Class 9 - English`. A course is assigned to one teacher and can contain multiple enrolled students.

## Assumptions & Design Decisions

- **Course structure:** a Course is a class + subject combination (e.g. Class 10 - Mathematics). This keeps the teacher/student/course/assignment relationships simple.
- **Submission format:** for the MVP, student submissions are text-only. File uploads and attachments are not implemented.
- **Teacher assignment:** each course is assigned to exactly one teacher.
- **Submission updates:** students may update a submission before the deadline as long as the teacher has not reviewed it. Once the status becomes Reviewed, it is locked.
- **Database initialization:** the dev environment uses EF Core `EnsureCreated()` + a custom database seeder + PostgreSQL in Docker, so the database and demo data are ready without manual migration commands.

## Environment Configuration

Backend configuration lives in:

- `backend/AssignmentApi/appsettings.json`
- `backend/AssignmentApi/appsettings.Development.json`

The frontend provides `frontend/web/.env.example` (copy to `.env.local`, e.g. `NEXT_PUBLIC_API_URL=http://localhost:5224`). Leave the variable unset to run the frontend in demo mode.

Do not commit real production secrets. Production secrets, JWT signing keys, and database credentials should come from secure environment-specific configuration.

## API Documentation

Once the backend is running, Swagger/OpenAPI docs are at **http://localhost:5224/swagger** — use them to inspect and test the endpoints during development.

## Known Limitations

- No file attachment support for assignment submissions
- No pagination for large data tables
- No advanced filtering or search
- No email or push notifications
- Text-only assignment submissions
- Basic authentication/session handling on the frontend
- The application is an MVP and is not yet configured for production deployment

## Future Improvements

- File and document submission support
- Assignment search and filtering
- Pagination and server-side data loading
- Email notifications
- Push notifications
- Assignment analytics
- Student performance dashboards
- Teacher grading history
- Password reset functionality
- Refresh tokens
- Production database migrations
- Audit logging
- Improved frontend component architecture
- Dark mode
- Mobile-focused UI improvements

## Development Commands

```bash
# Backend
cd backend/AssignmentApi
dotnet restore
dotnet build
dotnet run

# Backend tests
cd backend/AssignmentApi.Tests
dotnet test

# Docker database
docker compose up -d
docker compose ps
docker compose down

# Frontend
cd frontend/web
npm install
npm run dev
npm run build
npm start
```

## License

This project is developed for educational, demonstration, and evaluation purposes.
