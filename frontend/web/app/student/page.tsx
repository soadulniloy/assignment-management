"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useRequireRole } from "@/lib/useSession";
import { formatDateTime, isPast } from "@/lib/format";
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
import type { AssignmentDto, SubmissionDto } from "@/lib/types";

export default function StudentPage() {
  const session = useRequireRole("Student");
  const [assignments, setAssignments] = useState<AssignmentDto[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [newAnswers, setNewAnswers] = useState<Record<number, string>>({});
  const [editAnswers, setEditAnswers] = useState<Record<number, string>>({});
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [a, s] = await Promise.all([
        api.getMyAssignments(),
        api.getMySubmissions(),
      ]);
      setAssignments(a);
      setSubmissions(s);
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

  async function handleSubmit(a: AssignmentDto) {
    const answer = (newAnswers[a.id] ?? "").trim();
    if (!answer) {
      setError("Write your answer before submitting.");
      return;
    }
    try {
      await api.submitAssignment(a.id, answer);
      setNewAnswers((prev) => ({ ...prev, [a.id]: "" }));
      showNotice(`Submitted "${a.title}".`);
      await loadAll();
    } catch (err) {
      showError(err);
    }
  }

  function startEdit(s: SubmissionDto) {
    setEditingId(s.id);
    setEditAnswers((prev) => ({ ...prev, [s.id]: s.answerText }));
  }

  async function handleUpdate(s: SubmissionDto) {
    const answer = (editAnswers[s.id] ?? "").trim();
    if (!answer) {
      setError("Write your answer before updating.");
      return;
    }
    try {
      await api.updateSubmission(s.id, answer);
      setEditingId(null);
      showNotice(`Updated your submission for "${s.assignmentTitle}".`);
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

  const submissionByAssignment = new Map(
    submissions.map((s) => [s.assignmentId, s])
  );

  return (
    <DashboardLayout session={session} title="Student Dashboard">
      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      <Card title="My assignments">
        {assignments.length === 0 && !loading ? (
          <EmptyState>
            No published assignments for your enrolled courses yet.
          </EmptyState>
        ) : (
          <div className="space-y-4">
            {assignments.map((a) => {
              const submission = submissionByAssignment.get(a.id);
              const deadlinePassed = isPast(a.deadlineUtc);
              const canUpdate =
                submission &&
                submission.status !== "Reviewed" &&
                !deadlinePassed;

              return (
                <div
                  key={a.id}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800">{a.title}</p>
                      <p className="text-sm text-slate-500">
                        {a.courseName} · Teacher: {a.teacherName} · Deadline:{" "}
                        {formatDateTime(a.deadlineUtc)} · Max marks:{" "}
                        {a.maxMarks}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {a.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {submission ? (
                        <Badge
                          tone={
                            submission.status === "Reviewed"
                              ? "green"
                              : "amber"
                          }
                        >
                          {submission.status}
                          {submission.marks !== null
                            ? ` · ${submission.marks}/${a.maxMarks}`
                            : ""}
                        </Badge>
                      ) : (
                        <Badge tone="slate">Not submitted</Badge>
                      )}
                      {deadlinePassed && (
                        <Badge tone="red">Deadline passed</Badge>
                      )}
                    </div>
                  </div>

                  {submission ? (
                    <div className="mt-4 border-t border-slate-200 pt-4">
                      {editingId === submission.id ? (
                        <div className="space-y-3">
                          <Field label="Your answer">
                            <textarea
                              rows={4}
                              value={editAnswers[submission.id] ?? ""}
                              onChange={(e) =>
                                setEditAnswers((prev) => ({
                                  ...prev,
                                  [submission.id]: e.target.value,
                                }))
                              }
                              className={inputCls}
                            />
                          </Field>
                          <div className="flex gap-2">
                            <Button onClick={() => void handleUpdate(submission)}>
                              Save update
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-slate-600">
                            <span className="font-medium text-slate-700">
                              Your answer:{" "}
                            </span>
                            {submission.answerText}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Submitted{" "}
                            {formatDateTime(submission.submittedAtUtc)}
                            {submission.updatedAtUtc
                              ? ` · Updated ${formatDateTime(submission.updatedAtUtc)}`
                              : ""}
                          </p>
                          {submission.status === "Reviewed" && (
                            <div className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-900">
                              <p>
                                <span className="font-medium">Marks: </span>
                                {submission.marks} / {a.maxMarks}
                              </p>
                              <p>
                                <span className="font-medium">Feedback: </span>
                                {submission.feedback || "No feedback given."}
                              </p>
                            </div>
                          )}
                          {canUpdate && (
                            <Button
                              variant="secondary"
                              className="mt-3"
                              onClick={() => startEdit(submission)}
                            >
                              Update submission
                            </Button>
                          )}
                          {submission.status === "Reviewed" && (
                            <p className="mt-2 text-xs text-slate-500">
                              This submission has been reviewed and can no
                              longer be updated.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 border-t border-slate-200 pt-4">
                      {deadlinePassed ? (
                        <p className="text-sm text-red-600">
                          The deadline has passed, so this assignment can no
                          longer be submitted.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          <Field label="Your answer">
                            <textarea
                              rows={4}
                              value={newAnswers[a.id] ?? ""}
                              onChange={(e) =>
                                setNewAnswers((prev) => ({
                                  ...prev,
                                  [a.id]: e.target.value,
                                }))
                              }
                              className={inputCls}
                              placeholder="Write your answer here…"
                            />
                          </Field>
                          <Button onClick={() => void handleSubmit(a)}>
                            Submit answer
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
