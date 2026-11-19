"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useRequireRole } from "@/lib/useSession";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  inputCls,
} from "@/components/ui";
import type { CourseDto, UserDto } from "@/lib/types";

export default function AdminPage() {
  const session = useRequireRole("Admin");
  const [users, setUsers] = useState<UserDto[]>([]);
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState("Student");

  const [courseName, setCourseName] = useState("");
  const [courseSubject, setCourseSubject] = useState("");
  const [courseTeacherId, setCourseTeacherId] = useState("");

  const [assignTeacher, setAssignTeacher] = useState<Record<number, string>>(
    {}
  );
  const [enrollStudent, setEnrollStudent] = useState<Record<number, string>>(
    {}
  );

  const loadAll = useCallback(async () => {
    try {
      const [u, c] = await Promise.all([api.getUsers(), api.getCourses()]);
      setUsers(u);
      setCourses(c);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) void loadAll();
  }, [session, loadAll]);

  function showError(err: unknown) {
    setNotice("");
    setError(err instanceof ApiError ? err.message : "Something went wrong.");
  }

  function showNotice(message: string) {
    setError("");
    setNotice(message);
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createUser({
        name: userName.trim(),
        email: userEmail.trim(),
        password: userPassword,
        role: userRole,
      });
      setUserName("");
      setUserEmail("");
      setUserPassword("");
      showNotice("User created.");
      await loadAll();
    } catch (err) {
      showError(err);
    }
  }

  async function handleDeleteUser(user: UserDto) {
    if (!window.confirm(`Delete user ${user.name} (${user.email})?`)) return;
    try {
      await api.deleteUser(user.id);
      showNotice("User deleted.");
      await loadAll();
    } catch (err) {
      showError(err);
    }
  }

  async function handleCreateCourse(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createCourse({
        name: courseName.trim(),
        subject: courseSubject.trim(),
        teacherId: courseTeacherId ? Number(courseTeacherId) : null,
      });
      setCourseName("");
      setCourseSubject("");
      setCourseTeacherId("");
      showNotice("Course created.");
      await loadAll();
    } catch (err) {
      showError(err);
    }
  }

  async function handleAssignTeacher(course: CourseDto) {
    const teacherId = assignTeacher[course.id];
    if (!teacherId) return;
    try {
      await api.assignTeacher(course.id, Number(teacherId));
      showNotice(`Teacher assigned to ${course.name}.`);
      await loadAll();
    } catch (err) {
      showError(err);
    }
  }

  async function handleEnrollStudent(course: CourseDto) {
    const studentId = enrollStudent[course.id];
    if (!studentId) return;
    try {
      await api.enrollStudent(course.id, Number(studentId));
      showNotice(`Student enrolled in ${course.name}.`);
      await loadAll();
    } catch (err) {
      showError(err);
    }
  }

  async function handleDeleteCourse(course: CourseDto) {
    if (!window.confirm(`Delete course ${course.name}?`)) return;
    try {
      await api.deleteCourse(course.id);
      showNotice("Course deleted.");
      await loadAll();
    } catch (err) {
      showError(err);
    }
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  const teachers = users.filter((u) => u.role === "Teacher");
  const students = users.filter((u) => u.role === "Student");

  return (
    <DashboardLayout session={session} title="Admin Dashboard">
      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      <Card title="Users">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Email</th>
                <th className="py-2 pr-4 font-medium">Role</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4">{u.name}</td>
                  <td className="py-2 pr-4">{u.email}</td>
                  <td className="py-2 pr-4">
                    <Badge
                      tone={
                        u.role === "Admin"
                          ? "indigo"
                          : u.role === "Teacher"
                            ? "green"
                            : "slate"
                      }
                    >
                      {u.role}
                    </Badge>
                  </td>
                  <td className="py-2">
                    <Button
                      variant="danger"
                      onClick={() => void handleDeleteUser(u)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && !loading && (
            <EmptyState>No users yet.</EmptyState>
          )}
        </div>

        <form
          onSubmit={handleCreateUser}
          className="mt-6 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2 lg:grid-cols-5"
        >
          <Field label="Name">
            <input
              required
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className={inputCls}
              placeholder="Full name"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              required
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className={inputCls}
              placeholder="user@school.com"
            />
          </Field>
          <Field label="Password" hint="At least 6 characters.">
            <input
              type="password"
              required
              minLength={6}
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Role">
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className={inputCls}
            >
              <option value="Student">Student</option>
              <option value="Teacher">Teacher</option>
              <option value="Admin">Admin</option>
            </select>
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Create user
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Courses">
        <div className="space-y-4">
          {courses.map((course) => (
            <div
              key={course.id}
              className="rounded-lg border border-slate-200 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-800">{course.name}</p>
                  <p className="text-sm text-slate-500">
                    {course.subject} · Teacher:{" "}
                    {course.teacherName ?? "Not assigned"} ·{" "}
                    {course.studentCount} student
                    {course.studentCount === 1 ? "" : "s"} enrolled
                  </p>
                </div>
                <Button
                  variant="danger"
                  onClick={() => void handleDeleteCourse(course)}
                >
                  Delete
                </Button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="flex gap-2">
                  <select
                    value={assignTeacher[course.id] ?? ""}
                    onChange={(e) =>
                      setAssignTeacher((prev) => ({
                        ...prev,
                        [course.id]: e.target.value,
                      }))
                    }
                    className={inputCls}
                    aria-label={`Assign a teacher to ${course.name}`}
                  >
                    <option value="">Select a teacher…</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="secondary"
                    disabled={!assignTeacher[course.id]}
                    onClick={() => void handleAssignTeacher(course)}
                  >
                    Assign teacher
                  </Button>
                </div>
                <div className="flex gap-2">
                  <select
                    value={enrollStudent[course.id] ?? ""}
                    onChange={(e) =>
                      setEnrollStudent((prev) => ({
                        ...prev,
                        [course.id]: e.target.value,
                      }))
                    }
                    className={inputCls}
                    aria-label={`Enroll a student in ${course.name}`}
                  >
                    <option value="">Select a student…</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="secondary"
                    disabled={!enrollStudent[course.id]}
                    onClick={() => void handleEnrollStudent(course)}
                  >
                    Enroll student
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {courses.length === 0 && !loading && (
            <EmptyState>No courses yet.</EmptyState>
          )}
        </div>

        <form
          onSubmit={handleCreateCourse}
          className="mt-6 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Field label="Course name">
            <input
              required
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              className={inputCls}
              placeholder="Class 10 - Mathematics"
            />
          </Field>
          <Field label="Subject">
            <input
              required
              value={courseSubject}
              onChange={(e) => setCourseSubject(e.target.value)}
              className={inputCls}
              placeholder="Mathematics"
            />
          </Field>
          <Field label="Teacher (optional)">
            <select
              value={courseTeacherId}
              onChange={(e) => setCourseTeacherId(e.target.value)}
              className={inputCls}
            >
              <option value="">No teacher yet</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Create course
            </Button>
          </div>
        </form>
      </Card>
    </DashboardLayout>
  );
}
