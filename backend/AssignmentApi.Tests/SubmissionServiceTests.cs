using AssignmentApi.Data;
using AssignmentApi.Models;
using AssignmentApi.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

public class SubmissionServiceTests
{
    private static AppDbContext CreateContext(string databaseName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;

        return new AppDbContext(options);
    }

    private static async Task<(AppDbContext db, int assignmentId, int studentId, int teacherId)> SeedAsync(
        string databaseName,
        DateTime deadlineUtc,
        int maxMarks = 10)
    {
        var db = CreateContext(databaseName);

        var teacher = new User
        {
            Name = "Teacher",
            Email = $"teacher-{databaseName}@test.com",
            Role = Roles.Teacher,
            PasswordHash = "x"
        };

        var student = new User
        {
            Name = "Student",
            Email = $"student-{databaseName}@test.com",
            Role = Roles.Student,
            PasswordHash = "x"
        };

        var course = new Course
        {
            Name = "Course",
            Subject = "Math",
            Teacher = teacher
        };

        var assignment = new Assignment
        {
            Title = "Assignment",
            Description = "Description",
            DeadlineUtc = deadlineUtc,
            MaxMarks = maxMarks,
            IsPublished = true,
            Course = course,
            Teacher = teacher
        };

        db.AddRange(teacher, student, course, assignment);

        db.StudentCourses.Add(new StudentCourse
        {
            Student = student,
            Course = course
        });

        await db.SaveChangesAsync();

        return (db, assignment.Id, student.Id, teacher.Id);
    }

    [Fact]
    public async Task Submit_BeforeDeadline_CreatesSubmission()
    {
        var deadline = new DateTime(2030, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var (db, assignmentId, studentId, _) = await SeedAsync(
            nameof(Submit_BeforeDeadline_CreatesSubmission),
            deadline
        );

        var service = new AssignmentService(db);

        var result = await service.SubmitAsync(
            assignmentId,
            studentId,
            "My answer",
            new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        );

        Assert.Equal(SubmissionStatus.Submitted, result.Status);
        Assert.Equal("My answer", result.AnswerText);
    }

    [Fact]
    public async Task Submit_AfterDeadline_ThrowsException()
    {
        var deadline = new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var (db, assignmentId, studentId, _) = await SeedAsync(
            nameof(Submit_AfterDeadline_ThrowsException),
            deadline
        );

        var service = new AssignmentService(db);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.SubmitAsync(
                assignmentId,
                studentId,
                "My answer",
                new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            )
        );
    }

    [Fact]
    public async Task Update_AfterDeadline_ThrowsException()
    {
        var deadline = new DateTime(2030, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var (db, assignmentId, studentId, _) = await SeedAsync(
            nameof(Update_AfterDeadline_ThrowsException),
            deadline
        );

        db.Submissions.Add(new Submission
        {
            AssignmentId = assignmentId,
            StudentId = studentId,
            AnswerText = "Old answer",
            SubmittedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            Status = SubmissionStatus.Submitted
        });

        await db.SaveChangesAsync();

        var service = new AssignmentService(db);
        var submission = await db.Submissions.FirstAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.UpdateAsync(
                submission.Id,
                studentId,
                "New answer",
                new DateTime(2031, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            )
        );
    }

    [Fact]
    public async Task Update_ReviewedSubmission_ThrowsException()
    {
        var deadline = new DateTime(2030, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var (db, assignmentId, studentId, _) = await SeedAsync(
            nameof(Update_ReviewedSubmission_ThrowsException),
            deadline
        );

        db.Submissions.Add(new Submission
        {
            AssignmentId = assignmentId,
            StudentId = studentId,
            AnswerText = "Old answer",
            SubmittedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            Status = SubmissionStatus.Reviewed
        });

        await db.SaveChangesAsync();

        var service = new AssignmentService(db);
        var submission = await db.Submissions.FirstAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.UpdateAsync(
                submission.Id,
                studentId,
                "New answer",
                new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc)
            )
        );
    }

    [Fact]
    public async Task Review_MarksGreaterThanMax_ThrowsException()
    {
        var deadline = new DateTime(2030, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var (db, assignmentId, studentId, teacherId) = await SeedAsync(
            nameof(Review_MarksGreaterThanMax_ThrowsException),
            deadline,
            maxMarks: 10
        );

        db.Submissions.Add(new Submission
        {
            AssignmentId = assignmentId,
            StudentId = studentId,
            AnswerText = "Answer",
            SubmittedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            Status = SubmissionStatus.Submitted
        });

        await db.SaveChangesAsync();

        var service = new AssignmentService(db);
        var submission = await db.Submissions.FirstAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.ReviewAsync(
                submission.Id,
                teacherId,
                20,
                "Good",
                false
            )
        );
    }

    [Fact]
    public async Task Review_NotOwnerTeacher_ThrowsException()
    {
        var deadline = new DateTime(2030, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var (db, assignmentId, studentId, teacherId) = await SeedAsync(
            nameof(Review_NotOwnerTeacher_ThrowsException),
            deadline
        );

        db.Submissions.Add(new Submission
        {
            AssignmentId = assignmentId,
            StudentId = studentId,
            AnswerText = "Answer",
            SubmittedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            Status = SubmissionStatus.Submitted
        });

        await db.SaveChangesAsync();

        var service = new AssignmentService(db);
        var submission = await db.Submissions.FirstAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.ReviewAsync(
                submission.Id,
                teacherId + 999,
                5,
                "Good",
                false
            )
        );
    }
}