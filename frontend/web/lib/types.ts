export type Role = "Admin" | "Teacher" | "Student";

export interface LoginResponse {
  userId: number;
  name: string;
  email: string;
  role: Role;
  token: string;
}

export interface Session {
  userId: number;
  name: string;
  email: string;
  role: Role;
}

export interface UserDto {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface CourseDto {
  id: number;
  name: string;
  subject: string;
  teacherId: number | null;
  teacherName: string | null;
  studentCount: number;
}

export interface AssignmentDto {
  id: number;
  title: string;
  description: string;
  deadlineUtc: string;
  maxMarks: number;
  isPublished: boolean;
  courseId: number;
  courseName: string;
  teacherId: number;
  teacherName: string;
}

export interface SubmissionDto {
  id: number;
  assignmentId: number;
  assignmentTitle: string;
  studentId: number;
  studentName: string;
  answerText: string;
  submittedAtUtc: string;
  updatedAtUtc: string | null;
  status: "Submitted" | "Reviewed";
  marks: number | null;
  feedback: string | null;
}
