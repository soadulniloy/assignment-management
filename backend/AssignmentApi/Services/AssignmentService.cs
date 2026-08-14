using AssignmentApi.Data;
using AssignmentApi.Models;
using Microsoft.EntityFrameworkCore;

namespace AssignmentApi.Services;

public class AssignmentService
{
    private readonly AppDbContext _db;

    public AssignmentService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Submission> SubmitAsync(
        int assignmentId,
        int studentId,
        string answer,
        DateTime utcNow)
    {
        var assignment = await _db.Assignments
            .Include(a => a.Course)
            .ThenInclude(c => c!.StudentCourses)
            .FirstOrDefaultAsync(a => a.Id == assignmentId);

        if (assignment is null)
            throw new InvalidOperationException("Assignment not found.");

        if (!assignment.IsPublished)
            throw new InvalidOperationException("Assignment is not published.");

        if (assignment.DeadlineUtc <= utcNow)
            throw new InvalidOperationException("Cannot submit after the deadline.");

        var isEnrolled = assignment.Course!.StudentCourses
            .Any(sc => sc.StudentId == studentId);

        if (!isEnrolled)
            throw new InvalidOperationException("You are not enrolled in this course.");

        var existing = await _db.Submissions
            .FirstOrDefaultAsync(s => s.AssignmentId == assignmentId && s.StudentId == studentId);

        if (existing is not null)
            throw new InvalidOperationException("You already submitted. Use update instead.");

        var submission = new Submission
        {
            AssignmentId = assignmentId,
            StudentId = studentId,
            AnswerText = answer,
            SubmittedAtUtc = utcNow,
            Status = SubmissionStatus.Submitted
        };

        _db.Submissions.Add(submission);
        await _db.SaveChangesAsync();

        return submission;
    }

    public async Task<Submission> UpdateAsync(
        int submissionId,
        int studentId,
        string answer,
        DateTime utcNow)
    {
        var submission = await _db.Submissions
            .Include(s => s.Assignment)
            .FirstOrDefaultAsync(s => s.Id == submissionId);

        if (submission is null)
            throw new InvalidOperationException("Submission not found.");

        if (submission.StudentId != studentId)
            throw new InvalidOperationException("You can only update your own submission.");

        if (submission.Assignment!.DeadlineUtc <= utcNow)
            throw new InvalidOperationException("Cannot update after the deadline.");

        if (submission.Status == SubmissionStatus.Reviewed)
            throw new InvalidOperationException("Cannot update a reviewed submission.");

        submission.AnswerText = answer;
        submission.UpdatedAtUtc = utcNow;

        await _db.SaveChangesAsync();

        return submission;
    }

    public async Task<Submission> ReviewAsync(
        int submissionId,
        int teacherId,
        int marks,
        string? feedback,
        bool isAdmin)
    {
        var submission = await _db.Submissions
            .Include(s => s.Assignment)
            .FirstOrDefaultAsync(s => s.Id == submissionId);

        if (submission is null)
            throw new InvalidOperationException("Submission not found.");

        if (!isAdmin && submission.Assignment!.TeacherId != teacherId)
            throw new InvalidOperationException("Only the course teacher can review this submission.");

        if (submission.Assignment is null)
            throw new InvalidOperationException("Assignment not found for this submission.");

        if (marks < 0 || marks > submission.Assignment.MaxMarks)
            throw new InvalidOperationException($"Marks must be between 0 and {submission.Assignment.MaxMarks}.");

        submission.Marks = marks;
        submission.Feedback = feedback;
        submission.Status = SubmissionStatus.Reviewed;

        await _db.SaveChangesAsync();

        return submission;
    }
}