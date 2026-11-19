import type {
  AssignmentDto,
  CourseDto,
  LoginResponse,
  SubmissionDto,
  UserDto,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5224";

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
    post<LoginResponse>("/api/auth/login", { email, password }),

  // Admin — users
  getUsers: () => get<UserDto[]>("/api/users"),
  createUser: (body: {
    name: string;
    email: string;
    password: string;
    role: string;
  }) => post<UserDto>("/api/users", body),
  deleteUser: (id: number) => del<void>(`/api/users/${id}`),

  // Admin — courses
  getCourses: () => get<CourseDto[]>("/api/courses"),
  createCourse: (body: {
    name: string;
    subject: string;
    teacherId?: number | null;
  }) => post<CourseDto>("/api/courses", body),
  assignTeacher: (courseId: number, teacherId: number) =>
    post<{ message: string }>(`/api/courses/${courseId}/assign-teacher`, {
      teacherId,
    }),
  enrollStudent: (courseId: number, studentId: number) =>
    post<{ message: string }>(`/api/courses/${courseId}/enroll-student`, {
      studentId,
    }),
  deleteCourse: (id: number) => del<void>(`/api/courses/${id}`),

  // Teacher
  getTeacherCourses: () => get<CourseDto[]>("/api/teacher/courses"),

  // Assignments (teacher sees own, admin sees all)
  getAssignments: () => get<AssignmentDto[]>("/api/assignments"),
  createAssignment: (body: {
    title: string;
    description: string;
    deadlineUtc: string;
    maxMarks: number;
    courseId: number;
    isPublished: boolean;
  }) => post<AssignmentDto>("/api/assignments", body),
  updateAssignment: (
    id: number,
    body: {
      title: string;
      description: string;
      deadlineUtc: string;
      maxMarks: number;
      isPublished: boolean;
    }
  ) => put<AssignmentDto>(`/api/assignments/${id}`, body),
  deleteAssignment: (id: number) => del<void>(`/api/assignments/${id}`),
  publishAssignment: (id: number) =>
    post<AssignmentDto>(`/api/assignments/${id}/publish`, {}),
  getAssignmentSubmissions: (id: number) =>
    get<SubmissionDto[]>(`/api/assignments/${id}/submissions`),

  // Review (teacher / admin)
  reviewSubmission: (id: number, body: { marks: number; feedback?: string | null }) =>
    post<SubmissionDto>(`/api/submissions/${id}/review`, body),

  // Student
  getMyAssignments: () => get<AssignmentDto[]>("/api/my/assignments"),
  getMySubmissions: () => get<SubmissionDto[]>("/api/my/submissions"),
  submitAssignment: (assignmentId: number, answerText: string) =>
    post<SubmissionDto>(`/api/my/assignments/${assignmentId}/submit`, {
      answerText,
    }),
  updateSubmission: (id: number, answerText: string) =>
    put<SubmissionDto>(`/api/my/submissions/${id}`, { answerText }),
};
