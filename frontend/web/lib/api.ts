import type {
  AssignmentDto,
  CourseDto,
  LoginResponse,
  SubmissionDto,
  UserDto,
} from "./types";
import * as demo from "./demo";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5224";

/**
 * Demo mode is on when no API URL is configured (e.g. the Vercel
 * deployment). In demo mode every call is served from a mock database in
 * the browser's localStorage (lib/demo.ts) instead of the real backend.
 * Local development sets NEXT_PUBLIC_API_URL in .env.local and keeps using
 * the real API.
 */
export const DEMO_MODE = !process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("am_token");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 204) return undefined as T;

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message =
      data !== null &&
      typeof data === "object" &&
      "message" in data &&
      typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message);
  }

  return data as T;
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) });
const put = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "PUT", body: JSON.stringify(body) });
const del = <T>(path: string) => request<T>(path, { method: "DELETE" });

export const api = {
  // Auth
  login: (email: string, password: string) =>
    DEMO_MODE
      ? demo.login(email, password)
      : post<LoginResponse>("/api/auth/login", { email, password }),

  // Admin — users
  getUsers: () => (DEMO_MODE ? demo.getUsers() : get<UserDto[]>("/api/users")),
  createUser: (body: {
    name: string;
    email: string;
    password: string;
    role: string;
  }) => (DEMO_MODE ? demo.createUser(body) : post<UserDto>("/api/users", body)),
  deleteUser: (id: number) =>
    DEMO_MODE ? demo.deleteUser(id) : del<void>(`/api/users/${id}`),

  // Admin — courses
  getCourses: () =>
    DEMO_MODE ? demo.getCourses() : get<CourseDto[]>("/api/courses"),
  createCourse: (body: {
    name: string;
    subject: string;
    teacherId?: number | null;
  }) =>
    DEMO_MODE
      ? demo.createCourse(body)
      : post<CourseDto>("/api/courses", body),
  assignTeacher: (courseId: number, teacherId: number) =>
    DEMO_MODE
      ? demo.assignTeacher(courseId, teacherId)
      : post<{ message: string }>(`/api/courses/${courseId}/assign-teacher`, {
          teacherId,
        }),
  enrollStudent: (courseId: number, studentId: number) =>
    DEMO_MODE
      ? demo.enrollStudent(courseId, studentId)
      : post<{ message: string }>(`/api/courses/${courseId}/enroll-student`, {
          studentId,
        }),
  deleteCourse: (id: number) =>
    DEMO_MODE ? demo.deleteCourse(id) : del<void>(`/api/courses/${id}`),

  // Teacher
  getTeacherCourses: () =>
    DEMO_MODE
      ? demo.getTeacherCourses()
      : get<CourseDto[]>("/api/teacher/courses"),

  // Assignments (teacher sees own, admin sees all)
  getAssignments: () =>
    DEMO_MODE
      ? demo.getAssignments()
      : get<AssignmentDto[]>("/api/assignments"),
  createAssignment: (body: {
    title: string;
    description: string;
    deadlineUtc: string;
    maxMarks: number;
    courseId: number;
    isPublished: boolean;
  }) =>
    DEMO_MODE
      ? demo.createAssignment(body)
      : post<AssignmentDto>("/api/assignments", body),
  updateAssignment: (
    id: number,
    body: {
      title: string;
      description: string;
      deadlineUtc: string;
      maxMarks: number;
      isPublished: boolean;
    }
  ) =>
    DEMO_MODE
      ? demo.updateAssignment(id, body)
      : put<AssignmentDto>(`/api/assignments/${id}`, body),
  deleteAssignment: (id: number) =>
    DEMO_MODE
      ? demo.deleteAssignment(id)
      : del<void>(`/api/assignments/${id}`),
  publishAssignment: (id: number) =>
    DEMO_MODE
      ? demo.publishAssignment(id)
      : post<AssignmentDto>(`/api/assignments/${id}/publish`, {}),
  getAssignmentSubmissions: (id: number) =>
    DEMO_MODE
      ? demo.getAssignmentSubmissions(id)
      : get<SubmissionDto[]>(`/api/assignments/${id}/submissions`),

  // Review (teacher / admin)
  reviewSubmission: (id: number, body: { marks: number; feedback?: string | null }) =>
    DEMO_MODE
      ? demo.reviewSubmission(id, body)
      : post<SubmissionDto>(`/api/submissions/${id}/review`, body),

  // Student
  getMyAssignments: () =>
    DEMO_MODE
      ? demo.getMyAssignments()
      : get<AssignmentDto[]>("/api/my/assignments"),
  getMySubmissions: () =>
    DEMO_MODE
      ? demo.getMySubmissions()
      : get<SubmissionDto[]>("/api/my/submissions"),
  submitAssignment: (assignmentId: number, answerText: string) =>
    DEMO_MODE
      ? demo.submitAssignment(assignmentId, answerText)
      : post<SubmissionDto>(`/api/my/assignments/${assignmentId}/submit`, {
          answerText,
        }),
  updateSubmission: (id: number, answerText: string) =>
    DEMO_MODE
      ? demo.updateSubmission(id, answerText)
      : put<SubmissionDto>(`/api/my/submissions/${id}`, { answerText }),
};
