using System.ComponentModel.DataAnnotations;

namespace AssignmentApi.Models;

public static class Roles
{
    public const string Admin = "Admin";
    public const string Teacher = "Teacher";
    public const string Student = "Student";
}

public class User
{
    public int Id { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string Role { get; set; } = Roles.Student;

    public ICollection<StudentCourse> Enrollments { get; set; } = new List<StudentCourse>();
}

public class Course
{
    public int Id { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Subject { get; set; } = string.Empty;

    public int? TeacherId { get; set; }
    public User? Teacher { get; set; }

    public ICollection<StudentCourse> StudentCourses { get; set; } = new List<StudentCourse>();
    public ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
}

public class StudentCourse
{
    public int StudentId { get; set; }
    public User? Student { get; set; }

    public int CourseId { get; set; }
    public Course? Course { get; set; }
}

public class Assignment
{
    public int Id { get; set; }

    [Required]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    public DateTime DeadlineUtc { get; set; }

    [Range(1, 1000)]
    public int MaxMarks { get; set; }

    public bool IsPublished { get; set; }

    public int CourseId { get; set; }
    public Course? Course { get; set; }

    public int TeacherId { get; set; }
    public User? Teacher { get; set; }

    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
}

public class Submission
{
    public int Id { get; set; }

    public int AssignmentId { get; set; }
    public Assignment? Assignment { get; set; }

    public int StudentId { get; set; }
    public User? Student { get; set; }

    public string AnswerText { get; set; } = string.Empty;

    public DateTime SubmittedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }

    public string Status { get; set; } = SubmissionStatus.Submitted;

    public int? Marks { get; set; }
    public string? Feedback { get; set; }
}

public static class SubmissionStatus
{
    public const string Submitted = "Submitted";
    public const string Reviewed = "Reviewed";
}