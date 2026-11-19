import { ApiError } from "./api";
import { getSession } from "./auth";
import type {
  AssignmentDto,
  CourseDto,
  LoginResponse,
  Role,
  Session,
  SubmissionDto,
  UserDto,
} from "./types";

/**
 * Demo-mode mock API.
 *
 * Used when NEXT_PUBLIC_API_URL is unset/empty (the Vercel deployment).
 * All data lives in localStorage under `am_demo_db`, so the deployed site
 * works with no backend at all. The seed data and the business rules mirror
 * the real backend (Data/DbSeeder.cs and Services/AssignmentService.cs) so
 * the demo behaves exactly like the live API, including its error messages.
 *
 * NOTE: passwords are stored in plain text in the browser's localStorage.
 * That is acceptable for a throwaway demo database that only ever holds the
 * public demo accounts plus whatever the visitor creates locally, but this
 * must never be used with real credentials.
 */

const STORAGE_KEY = "am_demo_db";

type SubmissionStatus = "Submitted" | "Reviewed";

interface DemoUser {
  id: number;
  name: string;
  email: string;
  password: string;
  role: Role;
}

interface DemoCourse {
  id: number;
  name: string;
  subject: string;
  teacherId: number | null;
}

interface DemoEnrollment {
  courseId: number;
  studentId: number;
}

interface DemoAssignment {
  id: number;
  title: string;
  description: string;
  deadlineUtc: string;
  maxMarks: number;
  isPublished: boolean;
  courseId: number;
  teacherId: number;
}

interface DemoSubmission {
  id: number;
  assignmentId: number;
  studentId: number;
  answerText: string;
  submittedAtUtc: string;
  updatedAtUtc: string | null;
  status: SubmissionStatus;
  marks: number | null;
  feedback: string | null;
}

interface DemoDb {
  users: DemoUser[];
  courses: DemoCourse[];
  enrollments: DemoEnrollment[];
  assignments: DemoAssignment[];
  submissions: DemoSubmission[];
  nextIds: { user: number; course: number; assignment: number; submission: number };
}

/** Seed data identical to the backend DbSeeder (deadline: 7 days from now). */
function seedDb(): DemoDb {
  const deadline = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  ).toISOString();
  return {
    users: [
      { id: 1, name: "Admin User", email: "admin@school.com", password: "Admin123!", role: "Admin" },
      { id: 2, name: "Teacher User", email: "teacher@school.com", password: "Teacher123!", role: "Teacher" },
      { id: 3, name: "Student User", email: "student@school.com", password: "Student123!", role: "Student" },
    ],
    courses: [{ id: 1, name: "Class 10", subject: "Mathematics", teacherId: 2 }],
    enrollments: [{ courseId: 1, studentId: 3 }],
    assignments: [
      {
        id: 1,
        title: "Algebra Homework",
        description: "Solve chapter 1 exercises.",
        deadlineUtc: deadline,
        maxMarks: 10,
        isPublished: true,
        courseId: 1,
        teacherId: 2,
      },
    ],
    submissions: [],
    nextIds: { user: 4, course: 2, assignment: 2, submission: 1 },
  };
}

function loadDb(): DemoDb {
  if (typeof window === "undefined") return seedDb();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const db = seedDb();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      return db;
    }
    return JSON.parse(raw) as DemoDb;
  } catch {
    const db = seedDb();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      // Storage unavailable (private mode, quota) — keep working in memory.
    }
    return db;
  }
}

function saveDb(db: DemoDb): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Storage unavailable — the in-memory copy is still used by this page.
  }
}

/** Clear the demo database and re-seed it (used by the "Reset demo data" button). */
export function resetDemoData(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  loadDb();
}

/* ------------------------------------------------------------------ */
/* DTO mapping (same camelCase shapes as the real API)                 */
/* ------------------------------------------------------------------ */

function toUserDto(u: DemoUser): UserDto {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

function toCourseDto(db: DemoDb, c: DemoCourse): CourseDto {
  const teacher = db.users.find((u) => u.id === c.teacherId);
  return {
    id: c.id,
    name: c.name,
    subject: c.subject,
    teacherId: c.teacherId,
    teacherName: teacher ? teacher.name : null,
    studentCount: db.enrollments.filter((e) => e.courseId === c.id).length,
  };
}

function toAssignmentDto(db: DemoDb, a: DemoAssignment): AssignmentDto {
  const course = db.courses.find((c) => c.id === a.courseId);
  const teacher = db.users.find((u) => u.id === a.teacherId);
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    deadlineUtc: a.deadlineUtc,
    maxMarks: a.maxMarks,
    isPublished: a.isPublished,
    courseId: a.courseId,
    courseName: course ? course.name : "Unknown course",
    teacherId: a.teacherId,
    teacherName: teacher ? teacher.name : "Unknown teacher",
  };
}

function toSubmissionDto(db: DemoDb, s: DemoSubmission): SubmissionDto {
  const assignment = db.assignments.find((a) => a.id === s.assignmentId);
  const student = db.users.find((u) => u.id === s.studentId);
  return {
    id: s.id,
    assignmentId: s.assignmentId,
    assignmentTitle: assignment ? assignment.title : "Unknown assignment",
    studentId: s.studentId,
    studentName: student ? student.name : "Unknown student",
    answerText: s.answerText,
    submittedAtUtc: s.submittedAtUtc,
    updatedAtUtc: s.updatedAtUtc,
    status: s.status,
    marks: s.marks,
    feedback: s.feedback,
  };
}

/* ------------------------------------------------------------------ */
/* Identity (the demo token is fake; the session in localStorage is    */
/* the source of truth, exactly like the real frontend stores it)      */
/* ------------------------------------------------------------------ */

function requireSession(): Session {
  const session = getSession();
  if (!session) throw new ApiError(401, "Unauthorized.");
  return session;
}

function requireRole(...roles: Role[]): Session {
  const session = requireSession();
  if (!roles.includes(session.role)) throw new ApiError(403, "Forbidden.");
  return session;
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const db = loadDb();
  const user = db.users.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase()
  );
  if (!user || user.password !== password) {
    throw new ApiError(401, "Invalid email or password.");
  }
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: `demo-token-${user.id}-${Date.now()}`,
  };
}

/* ------------------------------------------------------------------ */
/* Admin — users                                                       */
/* ------------------------------------------------------------------ */

export async function getUsers(): Promise<UserDto[]> {
  requireRole("Admin");
  const db = loadDb();
  return [...db.users]
    .sort((a, b) => a.id - b.id)
    .map(toUserDto);
}

export async function createUser(body: {
  name: string;
  email: string;
  password: string;
  role: string;
}): Promise<UserDto> {
  requireRole("Admin");
  const db = loadDb();
  if (!body.name || !body.email) {
    throw new ApiError(400, "Name and email are required.");
  }
  if (!body.password || body.password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters.");
  }
  if (body.role !== "Admin" && body.role !== "Teacher" && body.role !== "Student") {
    throw new ApiError(400, "Role must be Admin, Teacher or Student.");
  }
  if (
    db.users.some((u) => u.email.toLowerCase() === body.email.toLowerCase())
  ) {
    throw new ApiError(400, "Email already exists.");
  }
  const user: DemoUser = {
    id: db.nextIds.user++,
    name: body.name,
    email: body.email,
    password: body.password,
    role: body.role,
  };
  db.users.push(user);
  saveDb(db);
  return toUserDto(user);
}

export async function deleteUser(id: number): Promise<void> {
  requireRole("Admin");
  const db = loadDb();
  const index = db.users.findIndex((u) => u.id === id);
  if (index === -1) throw new ApiError(404, "User not found.");
  const user = db.users[index];
  if (user.role === "Teacher" && db.assignments.some((a) => a.teacherId === id)) {
    throw new ApiError(400, "Cannot delete teacher with assignments.");
  }
  // Clean up references so the demo database never holds orphaned rows
  // (the real backend only blocks the teacher-with-assignments case).
  db.enrollments = db.enrollments.filter((e) => e.studentId !== id);
  db.courses.forEach((c) => {
    if (c.teacherId === id) c.teacherId = null;
  });
  db.submissions = db.submissions.filter((s) => s.studentId !== id);
  db.users.splice(index, 1);
  saveDb(db);
}

/* ------------------------------------------------------------------ */
/* Admin — courses                                                     */
/* ------------------------------------------------------------------ */

export async function getCourses(): Promise<CourseDto[]> {
  requireRole("Admin");
  const db = loadDb();
  return [...db.courses]
    .sort((a, b) => a.id - b.id)
    .map((c) => toCourseDto(db, c));
}

export async function createCourse(body: {
  name: string;
  subject: string;
  teacherId?: number | null;
}): Promise<CourseDto> {
  requireRole("Admin");
  const db = loadDb();
  if (body.teacherId != null) {
    const teacher = db.users.find(
      (u) => u.id === body.teacherId && u.role === "Teacher"
    );
    if (!teacher) throw new ApiError(400, "Teacher not found.");
  }
  const course: DemoCourse = {
    id: db.nextIds.course++,
    name: body.name,
    subject: body.subject,
    teacherId: body.teacherId ?? null,
  };
  db.courses.push(course);
  saveDb(db);
  return toCourseDto(db, course);
}

export async function assignTeacher(
  courseId: number,
  teacherId: number
): Promise<{ message: string }> {
  requireRole("Admin");
  const db = loadDb();
  const course = db.courses.find((c) => c.id === courseId);
  if (!course) throw new ApiError(404, "Course not found.");
  const teacher = db.users.find(
    (u) => u.id === teacherId && u.role === "Teacher"
  );
  if (!teacher) throw new ApiError(400, "Teacher not found.");
  course.teacherId = teacherId;
  saveDb(db);
  return { message: "Teacher assigned." };
}

export async function enrollStudent(
  courseId: number,
  studentId: number
): Promise<{ message: string }> {
  requireRole("Admin");
  const db = loadDb();
  const course = db.courses.find((c) => c.id === courseId);
  if (!course) throw new ApiError(404, "Course not found.");
  const student = db.users.find(
    (u) => u.id === studentId && u.role === "Student"
  );
  if (!student) throw new ApiError(400, "Student not found.");
  if (
    db.enrollments.some(
      (e) => e.courseId === courseId && e.studentId === studentId
    )
  ) {
    throw new ApiError(400, "Student is already enrolled.");
  }
  db.enrollments.push({ courseId, studentId });
  saveDb(db);
  return { message: "Student enrolled." };
}

export async function deleteCourse(id: number): Promise<void> {
  requireRole("Admin");
  const db = loadDb();
  const index = db.courses.findIndex((c) => c.id === id);
  if (index === -1) throw new ApiError(404, "Course not found.");
  if (db.assignments.some((a) => a.courseId === id)) {
    throw new ApiError(400, "Cannot delete course with assignments.");
  }
  db.enrollments = db.enrollments.filter((e) => e.courseId !== id);
  db.courses.splice(index, 1);
  saveDb(db);
}

/* ------------------------------------------------------------------ */
/* Teacher                                                             */
/* ------------------------------------------------------------------ */

export async function getTeacherCourses(): Promise<CourseDto[]> {
  const session = requireRole("Teacher");
  const db = loadDb();
  return db.courses
    .filter((c) => c.teacherId === session.userId)
    .map((c) => toCourseDto(db, c));
}

export async function getAssignments(): Promise<AssignmentDto[]> {
  const session = requireRole("Teacher", "Admin");
  const db = loadDb();
  const list =
    session.role === "Admin"
      ? [...db.assignments]
      : db.assignments.filter((a) => a.teacherId === session.userId);
  return list
    .sort((a, b) => b.deadlineUtc.localeCompare(a.deadlineUtc))
    .map((a) => toAssignmentDto(db, a));
}

export async function createAssignment(body: {
  title: string;
  description: string;
  deadlineUtc: string;
  maxMarks: number;
  courseId: number;
  isPublished: boolean;
}): Promise<AssignmentDto> {
  const session = requireRole("Teacher");
  const db = loadDb();
  const course = db.courses.find((c) => c.id === body.courseId);
  if (!course) throw new ApiError(400, "Course not found.");
  if (course.teacherId !== session.userId) {
    throw new ApiError(
      400,
      "Only the assigned teacher can create assignments for this course."
    );
  }
  if (body.maxMarks < 1 || body.maxMarks > 1000) {
    throw new ApiError(400, "Maximum marks must be between 1 and 1000.");
  }
  const assignment: DemoAssignment = {
    id: db.nextIds.assignment++,
    title: body.title,
    description: body.description,
    deadlineUtc: body.deadlineUtc,
    maxMarks: body.maxMarks,
    courseId: body.courseId,
    teacherId: session.userId,
    isPublished: body.isPublished,
  };
  db.assignments.push(assignment);
  saveDb(db);
  return toAssignmentDto(db, assignment);
}

export async function updateAssignment(
  id: number,
  body: {
    title: string;
    description: string;
    deadlineUtc: string;
    maxMarks: number;
    isPublished: boolean;
  }
): Promise<AssignmentDto> {
  const session = requireRole("Teacher");
  const db = loadDb();
  const assignment = db.assignments.find((a) => a.id === id);
  if (!assignment) throw new ApiError(404, "Assignment not found.");
  if (assignment.teacherId !== session.userId) {
    throw new ApiError(400, "You can only update your own assignments.");
  }
  if (body.maxMarks < 1 || body.maxMarks > 1000) {
    throw new ApiError(400, "Maximum marks must be between 1 and 1000.");
  }
  assignment.title = body.title;
  assignment.description = body.description;
  assignment.deadlineUtc = body.deadlineUtc;
  assignment.maxMarks = body.maxMarks;
  assignment.isPublished = body.isPublished;
  saveDb(db);
  return toAssignmentDto(db, assignment);
}

export async function deleteAssignment(id: number): Promise<void> {
  const session = requireRole("Teacher");
  const db = loadDb();
  const index = db.assignments.findIndex((a) => a.id === id);
  if (index === -1) throw new ApiError(404, "Assignment not found.");
  if (db.assignments[index].teacherId !== session.userId) {
    throw new ApiError(400, "You can only delete your own assignments.");
  }
  db.submissions = db.submissions.filter((s) => s.assignmentId !== id);
  db.assignments.splice(index, 1);
  saveDb(db);
}

export async function publishAssignment(id: number): Promise<AssignmentDto> {
  const session = requireRole("Teacher");
  const db = loadDb();
  const assignment = db.assignments.find((a) => a.id === id);
  if (!assignment) throw new ApiError(404, "Assignment not found.");
  if (assignment.teacherId !== session.userId) {
    throw new ApiError(400, "You can only publish your own assignments.");
  }
  assignment.isPublished = true;
  saveDb(db);
  return toAssignmentDto(db, assignment);
}

export async function getAssignmentSubmissions(
  id: number
): Promise<SubmissionDto[]> {
  const session = requireRole("Teacher", "Admin");
  const db = loadDb();
  const assignment = db.assignments.find((a) => a.id === id);
  if (!assignment) throw new ApiError(404, "Assignment not found.");
  if (session.role !== "Admin" && assignment.teacherId !== session.userId) {
    throw new ApiError(
      400,
      "You can only view submissions for your own assignments."
    );
  }
  return db.submissions
    .filter((s) => s.assignmentId === id)
    .map((s) => toSubmissionDto(db, s));
}

/* ------------------------------------------------------------------ */
/* Review                                                              */
/* ------------------------------------------------------------------ */

export async function reviewSubmission(
  id: number,
  body: { marks: number; feedback?: string | null }
): Promise<SubmissionDto> {
  const session = requireRole("Teacher", "Admin");
  const db = loadDb();
  const submission = db.submissions.find((s) => s.id === id);
  if (!submission) throw new ApiError(404, "Submission not found.");
  const assignment = db.assignments.find(
    (a) => a.id === submission.assignmentId
  );
  if (!assignment) throw new ApiError(404, "Assignment not found.");
  if (session.role !== "Admin" && assignment.teacherId !== session.userId) {
    throw new ApiError(
      400,
      "Only the course teacher can review this submission."
    );
  }
  if (body.marks < 0 || body.marks > assignment.maxMarks) {
    throw new ApiError(
      400,
      `Marks must be between 0 and ${assignment.maxMarks}.`
    );
  }
  submission.marks = body.marks;
  submission.feedback = body.feedback ?? null;
  submission.status = "Reviewed";
  saveDb(db);
  return toSubmissionDto(db, submission);
}

/* ------------------------------------------------------------------ */
/* Student                                                             */
/* ------------------------------------------------------------------ */

export async function getMyAssignments(): Promise<AssignmentDto[]> {
  const session = requireRole("Student");
  const db = loadDb();
  return db.assignments
    .filter(
      (a) =>
        a.isPublished &&
        db.enrollments.some(
          (e) => e.courseId === a.courseId && e.studentId === session.userId
        )
    )
    .sort((a, b) => a.deadlineUtc.localeCompare(b.deadlineUtc))
    .map((a) => toAssignmentDto(db, a));
}

export async function getMySubmissions(): Promise<SubmissionDto[]> {
  const session = requireRole("Student");
  const db = loadDb();
  return db.submissions
    .filter((s) => s.studentId === session.userId)
    .map((s) => toSubmissionDto(db, s));
}

export async function submitAssignment(
  assignmentId: number,
  answerText: string
): Promise<SubmissionDto> {
  const session = requireRole("Student");
  const db = loadDb();
  const assignment = db.assignments.find((a) => a.id === assignmentId);
  if (!assignment) throw new ApiError(404, "Assignment not found.");
  if (!assignment.isPublished) {
    throw new ApiError(400, "Assignment is not published.");
  }
  if (new Date(assignment.deadlineUtc).getTime() <= Date.now()) {
    throw new ApiError(400, "Cannot submit after the deadline.");
  }
  if (
    !db.enrollments.some(
      (e) => e.courseId === assignment.courseId && e.studentId === session.userId
    )
  ) {
    throw new ApiError(400, "You are not enrolled in this course.");
  }
  if (
    db.submissions.some(
      (s) => s.assignmentId === assignmentId && s.studentId === session.userId
    )
  ) {
    throw new ApiError(400, "You already submitted. Use update instead.");
  }
  const now = new Date().toISOString();
  const submission: DemoSubmission = {
    id: db.nextIds.submission++,
    assignmentId,
    studentId: session.userId,
    answerText,
    submittedAtUtc: now,
    updatedAtUtc: null,
    status: "Submitted",
    marks: null,
    feedback: null,
  };
  db.submissions.push(submission);
  saveDb(db);
  return toSubmissionDto(db, submission);
}

export async function updateSubmission(
  id: number,
  answerText: string
): Promise<SubmissionDto> {
  const session = requireRole("Student");
  const db = loadDb();
  const submission = db.submissions.find((s) => s.id === id);
  if (!submission) throw new ApiError(404, "Submission not found.");
  if (submission.studentId !== session.userId) {
    throw new ApiError(400, "You can only update your own submission.");
  }
  const assignment = db.assignments.find(
    (a) => a.id === submission.assignmentId
  );
  if (assignment && new Date(assignment.deadlineUtc).getTime() <= Date.now()) {
    throw new ApiError(400, "Cannot update after the deadline.");
  }
  if (submission.status === "Reviewed") {
    throw new ApiError(400, "Cannot update a reviewed submission.");
  }
  submission.answerText = answerText;
  submission.updatedAtUtc = new Date().toISOString();
  saveDb(db);
  return toSubmissionDto(db, submission);
}
