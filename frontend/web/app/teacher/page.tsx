"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useRequireRole } from "@/lib/useSession";
import {
  formatDateTime,
  isPast,
  localInputToUtcIso,
  toLocalInputValue,
} from "@/lib/format";
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
import type { AssignmentDto, CourseDto, SubmissionDto } from "@/lib/types";

export default function TeacherPage() {
  const session = useRequireRole("Teacher");
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [assignments, setAssignments] = useState<AssignmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Create form
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [maxMarks, setMaxMarks] = useState("100");
  const [isPublished, setIsPublished] = useState(false);

  // Edit form
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editMaxMarks, setEditMaxMarks] = useState("100");
  const [editIsPublished, setEditIsPublished] = useState(false);

  // Submissions
  const [openAssignmentId, setOpenAssignmentId] = useState<number | null>(
    null
  );
  const [submissions, setSubmissions] = useState<SubmissionDto[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [reviewInputs, setReviewInputs] = useState<
    Record<number, { marks: string; feedback: string }>
  >({});

  const loadAll = useCallback(async () => {
    try {
      const [c, a] = await Promise.all([
        api.getTeacherCourses(),
        api.getAssignments(),
      ]);
      setCourses(c);
      setAssignments(a);
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createAssignment({
        title: title.trim(),
        description: description.trim(),
        deadlineUtc: localInputToUtcIso(deadline),
        maxMarks: Number(maxMarks),
        courseId: Number(courseId),
        isPublished,
      });
      setTitle("");
      setDescription("");
      setDeadline("");
      setMaxMarks("100");
      setIsPublished(false);
      showNotice("Assignment created.");
      await loadAll();
    } catch (err) {
      showError(err);
    }
  }

  function startEdit(a: AssignmentDto) {
    setEditingId(a.id);
    setEditTitle(a.title);
    setEditDescription(a.description);
    setEditDeadline(toLocalInputValue(a.deadlineUtc));
    setEditMaxMarks(String(a.maxMarks));
    setEditIsPublished(a.isPublished);
  }

  async function handleUpdate(e: React.FormEvent, id: number) {
    e.preventDefault();
    try {
      await api.updateAssignment(id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        deadlineUtc: localInputToUtcIso(editDeadline),
        maxMarks: Number(editMaxMarks),
        isPublished: editIsPublished,
      });
      setEditingId(null);
      showNotice("Assignment updated.");
      await loadAll();
    } catch (err) {
      showError(err);
    }
  }

  async function handlePublish(a: AssignmentDto) {
    try {
      await api.publishAssignment(a.id);
      showNotice(`"${a.title}" published.`);
      await loadAll();
    } catch (err) {
      showError(err);
    }
  }

  async function handleDelete(a: AssignmentDto) {
    if (!window.confirm(`Delete assignment "${a.title}"?`)) return;
    try {
      await api.deleteAssignment(a.id);
      if (openAssignmentId === a.id) setOpenAssignmentId(null);
      showNotice("Assignment deleted.");
      await loadAll();
    } catch (err) {
      showError(err);
    }
  }

  async function toggleSubmissions(a: AssignmentDto) {
    if (openAssignmentId === a.id) {
      setOpenAssignmentId(null);
      return;
    }
    setOpenAssignmentId(a.id);
    setSubmissionsLoading(true);
    try {
      const list = await api.getAssignmentSubmissions(a.id);
      setSubmissions(list);
    } catch (err) {
      showError(err);
    } finally {
      setSubmissionsLoading(false);
    }
  }

  async function handleReview(
    submission: SubmissionDto,
    assignment: AssignmentDto
  ) {
    const input = reviewInputs[submission.id] ?? { marks: "", feedback: "" };
    const marks = Number(input.marks);
    if (Number.isNaN(marks) || marks < 0 || marks > assignment.maxMarks) {
      setError(`Marks must be between 0 and ${assignment.maxMarks}.`);
      return;
    }
    try {
      await api.reviewSubmission(submission.id, {
        marks,
        feedback: input.feedback.trim() || null,
      });
      showNotice(`Submission from ${submission.studentName} graded.`);
      const list = await api.getAssignmentSubmissions(assignment.id);
      setSubmissions(list);
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

  return (
    <DashboardLayout session={session} title="Teacher Dashboard">
      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      <Card title="My courses">
        {courses.length === 0 && !loading ? (
          <EmptyState>
            No courses assigned to you yet. Ask an admin to assign a course.
          </EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <p className="font-semibold text-slate-800">{c.name}</p>
                <p className="text-sm text-slate-500">
                  {c.subject} · {c.studentCount} student
                  {c.studentCount === 1 ? "" : "s"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Create assignment">
        {courses.length === 0 ? (
          <EmptyState>
            You need an assigned course before you can create an assignment.
          </EmptyState>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Course">
                <select
                  required
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select a course…</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Title">
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputCls}
                  placeholder="Assignment title"
                />
              </Field>
              <Field label="Deadline">
                <input
                  type="datetime-local"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Maximum marks" hint="Between 1 and 1000.">
                <input
                  type="number"
                  required
                  min={1}
                  max={1000}
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Description">
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputCls}
                placeholder="What should students do?"
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="h-4 w-4 accent-indigo-600"
              />
              Publish immediately (students can see it right away)
            </label>
            <Button type="submit">Create assignment</Button>
          </form>
        )}
      </Card>

      <Card title="My assignments">
        {assignments.length === 0 && !loading ? (
          <EmptyState>No assignments yet.</EmptyState>
        ) : (
          <div className="space-y-4">
            {assignments.map((a) => (
              <div
                key={a.id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800">{a.title}</p>
                    <p className="text-sm text-slate-500">
                      {a.courseName} · Deadline: {formatDateTime(a.deadlineUtc)}{" "}
                      · Max marks: {a.maxMarks}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {a.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={a.isPublished ? "green" : "amber"}>
                      {a.isPublished ? "Published" : "Draft"}
                    </Badge>
                    {isPast(a.deadlineUtc) && (
                      <Badge tone="red">Deadline passed</Badge>
                    )}
                  </div>
                </div>

                {editingId === a.id ? (
                  <form
                    onSubmit={(e) => void handleUpdate(e, a.id)}
                    className="mt-4 space-y-4 border-t border-slate-200 pt-4"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Title">
                        <input
                          required
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Deadline">
                        <input
                          type="datetime-local"
                          required
                          value={editDeadline}
                          onChange={(e) => setEditDeadline(e.target.value)}
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Maximum marks">
                        <input
                          type="number"
                          required
                          min={1}
                          max={1000}
                          value={editMaxMarks}
                          onChange={(e) => setEditMaxMarks(e.target.value)}
                          className={inputCls}
                        />
                      </Field>
                      <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={editIsPublished}
                          onChange={(e) =>
                            setEditIsPublished(e.target.checked)
                          }
                          className="h-4 w-4 accent-indigo-600"
                        />
                        Published
                      </label>
                    </div>
                    <Field label="Description">
                      <textarea
                        required
                        rows={3}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                    <div className="flex gap-2">
                      <Button type="submit">Save changes</Button>
                      <Button
                        variant="secondary"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => void toggleSubmissions(a)}
                    >
                      {openAssignmentId === a.id
                        ? "Hide submissions"
                        : "View submissions"}
                    </Button>
                    {!a.isPublished && (
                      <Button onClick={() => void handlePublish(a)}>
                        Publish
                      </Button>
                    )}
                    <Button variant="secondary" onClick={() => startEdit(a)}>
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => void handleDelete(a)}
                    >
                      Delete
                    </Button>
                  </div>
                )}

                {openAssignmentId === a.id && (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    {submissionsLoading ? (
                      <p className="text-sm text-slate-500">Loading…</p>
                    ) : submissions.length === 0 ? (
                      <EmptyState>No submissions yet.</EmptyState>
                    ) : (
                      <ul className="space-y-4">
                        {submissions.map((s) => (
                          <li
                            key={s.id}
                            className="rounded-lg bg-slate-50 p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-medium text-slate-800">
                                {s.studentName}
                              </p>
                              <Badge
                                tone={
                                  s.status === "Reviewed" ? "green" : "amber"
                                }
                              >
                                {s.status}
                                {s.marks !== null ? ` · ${s.marks} marks` : ""}
                              </Badge>
                            </div>
                            <p className="mt-1 text-sm text-slate-600">
                              {s.answerText}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              Submitted {formatDateTime(s.submittedAtUtc)}
                              {s.updatedAtUtc
                                ? ` · Updated ${formatDateTime(s.updatedAtUtc)}`
                                : ""}
                            </p>
                            {s.status === "Reviewed" ? (
                              <p className="mt-2 text-sm text-slate-700">
                                <span className="font-medium">Feedback: </span>
                                {s.feedback || "No feedback given."}
                              </p>
                            ) : (
                              <div className="mt-3 grid gap-3 sm:grid-cols-[140px_1fr_auto] sm:items-end">
                                <Field label={`Marks (max ${a.maxMarks})`}>
                                  <input
                                    type="number"
                                    min={0}
                                    max={a.maxMarks}
                                    value={
                                      reviewInputs[s.id]?.marks ?? ""
                                    }
                                    onChange={(e) =>
                                      setReviewInputs((prev) => ({
                                        ...prev,
                                        [s.id]: {
                                          marks: e.target.value,
                                          feedback:
                                            prev[s.id]?.feedback ?? "",
                                        },
                                      }))
                                    }
                                    className={inputCls}
                                    placeholder="0"
                                  />
                                </Field>
                                <Field label="Feedback (optional)">
                                  <input
                                    value={
                                      reviewInputs[s.id]?.feedback ?? ""
                                    }
                                    onChange={(e) =>
                                      setReviewInputs((prev) => ({
                                        ...prev,
                                        [s.id]: {
                                          marks: prev[s.id]?.marks ?? "",
                                          feedback: e.target.value,
                                        },
                                      }))
                                    }
                                    className={inputCls}
                                    placeholder="Write feedback for the student"
                                  />
                                </Field>
                                <Button
                                  onClick={() => void handleReview(s, a)}
                                >
                                  Grade
                                </Button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
