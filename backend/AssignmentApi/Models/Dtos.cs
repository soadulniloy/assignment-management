using System.ComponentModel.DataAnnotations;

namespace AssignmentApi.Models;

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password
);

public record LoginResponse(
    int UserId,
    string Name,
    string Email,
    string Role,
    string Token
);

public record CreateUserRequest(
    [Required] string Name,
    [Required, EmailAddress] string Email,
    [Required, MinLength(6)] string Password,
    [Required, RegularExpression("Admin|Teacher|Student")] string Role
);

public record UserDto(
    int Id,
    string Name,
    string Email,
    string Role
);

public record CreateCourseRequest(
    [Required] string Name,
    [Required] string Subject,
    int? TeacherId
);

public record CourseDto(
    int Id,
    string Name,
    string Subject,
    int? TeacherId,
    string? TeacherName,
    int StudentCount
)
{
    public static CourseDto From(Course course)
    {
        return new CourseDto(
            course.Id,
            course.Name,
            course.Subject,
            course.TeacherId,
            course.Teacher?.Name,
            course.StudentCourses.Count
        );
    }
}

public record AssignTeacherRequest([Required] int TeacherId);

public record EnrollStudentRequest([Required] int StudentId);

public record CreateAssignmentRequest(
    [Required] string Title,
    [Required] string Description,
    DateTime DeadlineUtc,
    [Range(1, 1000)] int MaxMarks,
    [Required] int CourseId,
    bool IsPublished
);

public record UpdateAssignmentRequest(
    [Required] string Title,
    [Required] string Description,
    DateTime DeadlineUtc,
    [Range(1, 1000)] int MaxMarks,
    bool IsPublished
);

public record AssignmentDto(
    int Id,
    string Title,
    string Description,
    DateTime DeadlineUtc,
    int MaxMarks,
    bool IsPublished,
    int CourseId,
    string CourseName,
    int TeacherId,
    string TeacherName
)
{
    public static AssignmentDto From(Assignment assignment)
    {
        return new AssignmentDto(
            assignment.Id,
            assignment.Title,
            assignment.Description,
            assignment.DeadlineUtc,
            assignment.MaxMarks,
            assignment.IsPublished,
            assignment.CourseId,
            assignment.Course?.Name ?? string.Empty,
            assignment.TeacherId,
            assignment.Teacher?.Name ?? string.Empty
        );
    }
}

public record SubmitRequest(
    [Required, MinLength(1)] string AnswerText
);

public record ReviewRequest(
    [Range(0, 1000)] int Marks,
    string? Feedback
);

public record SubmissionDto(
    int Id,
    int AssignmentId,
    string AssignmentTitle,
    int StudentId,
    string StudentName,
    string AnswerText,
    DateTime SubmittedAtUtc,
    DateTime? UpdatedAtUtc,
    string Status,
    int? Marks,
    string? Feedback
)
{
    public static SubmissionDto From(Submission submission)
    {
        return new SubmissionDto(
            submission.Id,
            submission.AssignmentId,
            submission.Assignment?.Title ?? string.Empty,
            submission.StudentId,
            submission.Student?.Name ?? string.Empty,
            submission.AnswerText,
            submission.SubmittedAtUtc,
            submission.UpdatedAtUtc,
            submission.Status,
            submission.Marks,
            submission.Feedback
        );
    }
}