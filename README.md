Assignment & Submission Management System

A role-based Assignment & Submission Management System designed for schools and colleges. The system allows administrators to manage users and courses, teachers to create and grade assignments, and students to view and submit their work securely.

1. Project Overview

The system provides separate dashboards and permissions for:

Admin — Manage users, courses, teacher assignments, and student enrollment.

Teacher — Create, publish, and grade assignments for assigned courses.

Student — View published assignments, submit answers, update submissions before deadlines, and view grades and feedback.

The backend uses JWT authentication and strict role-based authorization, with business rules enforced at the API/service level.

2. Main Features

Admin Dashboard

Create Admin, Teacher, and Student accounts.

Create courses/subjects.

Assign teachers to courses.

Enroll students in courses.

View users and courses.

Teacher Dashboard

Create assignments for assigned courses.

Set assignment deadlines and maximum marks.

Publish assignments.

View student submissions.

Grade submissions.

Provide written feedback.

Marks are validated against the assignment's maximum marks.

Teachers can only manage assignments for their assigned courses.

Student Dashboard

View published assignments for enrolled courses.

Submit text-based answers.

Update submissions before the deadline.

Submission updates are blocked after teacher review.

View marks and teacher feedback after grading.

Security & Validation

JWT-based authentication.

Role-based authorization.

Protected backend API endpoints.

Students cannot submit after the deadline.

Students cannot update submissions after the deadline.

Students cannot update reviewed submissions.

Teachers cannot assign marks above the maximum marks.

Teachers cannot grade submissions outside their assigned courses.

3. Technology Stack

Layer

Technology

Frontend

Next.js, React, TypeScript

Frontend Architecture

Next.js App Router

Styling

CSS / Tailwind CSS

Backend

ASP.NET Core Web API

Language

C#

ORM

Entity Framework Core

Database

PostgreSQL

Database Runtime

Docker

Authentication

JWT

API Documentation

Swagger / OpenAPI

Testing

xUnit

Test Database

EF Core InMemory

4. Project Structure

assignment-management/
├── backend/
│   ├── AssignmentApi/
│   │   ├── Controllers/
│   │   ├── Data/
│   │   ├── Models/
│   │   ├── Services/
│   │   └── Program.cs
│   │
│   └── AssignmentApi.Tests/
│
├── frontend/
│   └── assignment-ui/
│       ├── app/
│       │   ├── admin/
│       │   ├── teacher/
│       │   ├── student/
│       │   ├── login/
│       │   └── ...
│       ├── lib/
│       └── .env.example
│
├── docker-compose.yml
└── README.md

5. Prerequisites

Make sure the following are installed:

.NET SDK 8.0 or later

Node.js 18.x or later

npm

Docker Desktop

Verify the installations:

dotnet --version
node --version
npm --version
docker --version

6. Setup Instructions

Step 1: Clone the Repository

git clone <your-repository-url>
cd assignment-management

Replace <your-repository-url> with the repository URL.

Step 2: Start PostgreSQL

Open a terminal in the project root where docker-compose.yml is located:

docker compose up -d

PostgreSQL will run inside Docker and be exposed on port 5433.

Check the container:

docker compose ps

To stop the database:

docker compose down

Step 3: Start the Backend

Open a new terminal:

cd backend/AssignmentApi
dotnet restore
dotnet run

The API will be available at:

http://localhost:5000

Swagger UI:

http://localhost:5000/swagger

During development, Entity Framework Core initializes the database and the custom database seeder creates the demo users and sample data.

Step 4: Configure the Frontend

Open another terminal:

cd frontend/assignment-ui

Copy the environment template:

copy .env.example .env.local

On macOS/Linux:

cp .env.example .env.local

Configure the backend API URL in .env.local according to the value expected by the frontend.

Example:

NEXT_PUBLIC_API_URL=http://localhost:5000

Step 5: Install Frontend Dependencies

npm install

Step 6: Start the Frontend

npm run dev

The frontend will be available at:

http://localhost:3000

7. Running Unit Tests

Navigate to the test project:

cd backend/AssignmentApi.Tests
dotnet test

The tests use the EF Core InMemory provider and cover important business rules including:

Submission deadline validation.

Submission update permissions.

Teacher authorization.

Maximum marks validation.

Reviewed submission restrictions.

8. Demo Credentials

The database is automatically seeded with demo accounts.

Role

Email

Password

Admin

admin@school.com

Admin123!

Teacher

teacher@school.com

Teacher123!

Student

student@school.com

Student123!

These credentials are intended for local development and evaluation only.

9. Application Flow

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

10. Business Rules

Assignment Rules

Assignments belong to a specific course.

Teachers can only create assignments for courses assigned to them.

Assignments can be published by teachers.

Each assignment has a deadline and maximum marks.

Submission Rules

Only enrolled students can access the relevant assignments.

Students can submit answers before the deadline.

Empty submissions are rejected.

Students can update submissions before the deadline.

Students cannot update submissions after the deadline.

Students cannot update submissions after teacher review.

Grading Rules

Only the teacher responsible for the course can review submissions.

Marks cannot exceed the assignment's maximum marks.

Reviewed submissions contain marks and optional feedback.

11. Authentication & Authorization

The application uses JWT tokens for authentication.

After successful login:

The backend validates the user's credentials.

A JWT token is generated.

The frontend stores the authenticated session.

Requests to protected API endpoints include the JWT.

Backend authorization verifies the user's role.

Unauthorized users are denied access.

The main roles are:

Admin
Teacher
Student

Each role has access only to the operations permitted by the system's authorization rules.

12. Database Design

The main entities include:

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

A Course represents a class/subject combination, for example:

Class 10 - Mathematics
Class 10 - Physics
Class 9 - English

A course is assigned to one teacher and can contain multiple enrolled students.

13. Assumptions & Design Decisions

Course Structure

A Course represents a combination of class and subject, such as:

Class 10 - Mathematics

This simplifies the relationship between teachers, students, courses, and assignments.

Submission Format

For the MVP, student submissions are text-only.

File uploads and attachments are not implemented.

Teacher Assignment

Each course is assigned to exactly one teacher.

Submission Updates

Students may update a submission before the deadline as long as the teacher has not reviewed it.

Once the submission status becomes Reviewed, it becomes locked.

Database Initialization

The development environment uses:

EF Core EnsureCreated()

A custom database seeder

PostgreSQL running through Docker

This allows the application to initialize the database and demo data without requiring manual migration commands.

14. Environment Configuration

The frontend provides:

frontend/assignment-ui/.env.example

Create a local environment file:

frontend/assignment-ui/.env.local

Do not commit real production secrets to the repository.

Backend configuration is managed through:

backend/AssignmentApi/appsettings.json

Production secrets, JWT signing keys, and database credentials should be supplied through secure environment-specific configuration.

15. API Documentation

Once the backend is running, Swagger/OpenAPI documentation is available at:

http://localhost:5000/swagger

Swagger can be used to inspect and test the available API endpoints during development.

16. Known Limitations

No file attachment support for assignment submissions.

No pagination for large data tables.

No advanced filtering or search.

No email notifications.

No push notifications.

Text-only assignment submissions.

Basic authentication/session handling on the frontend.

The application is intended as an MVP and is not yet configured for production deployment.

17. Future Improvements

Potential future enhancements include:

File and document submission support.

Assignment search and filtering.

Pagination and server-side data loading.

Email notifications.

Push notifications.

Assignment analytics.

Student performance dashboards.

Teacher grading history.

Password reset functionality.

Refresh tokens.

Production database migrations.

Audit logging.

Improved frontend component architecture.

Dark mode.

Mobile-focused UI improvements.

18. Development Commands

Backend

cd backend/AssignmentApi
dotnet restore
dotnet build
dotnet run

Backend Tests

cd backend/AssignmentApi.Tests
dotnet test

Frontend

cd frontend/assignment-ui
npm install
npm run dev

Production Frontend Build

npm run build
npm start

Docker Database

docker compose up -d
docker compose ps
docker compose down

19. License

This project is developed for educational, demonstration, and evaluation purposes.