using AssignmentApi.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AssignmentApi.Data;

public static class DbSeeder
{
    public static async Task Seed(AppDbContext db)
    {
        if (await db.Users.AnyAsync())
            return;

        var hasher = new PasswordHasher<User>();

        var admin = new User
        {
            Name = "Admin User",
            Email = "admin@school.com",
            Role = Roles.Admin
        };
        admin.PasswordHash = hasher.HashPassword(admin, "Admin123!");

        var teacher = new User
        {
            Name = "Teacher User",
            Email = "teacher@school.com",
            Role = Roles.Teacher
        };
        teacher.PasswordHash = hasher.HashPassword(teacher, "Teacher123!");

        var student = new User
        {
            Name = "Student User",
            Email = "student@school.com",
            Role = Roles.Student
        };
        student.PasswordHash = hasher.HashPassword(student, "Student123!");

        var course = new Course
        {
            Name = "Class 10",
            Subject = "Mathematics",
            Teacher = teacher
        };

        var enrollment = new StudentCourse
        {
            Student = student,
            Course = course
        };

        var assignment = new Assignment
        {
            Title = "Algebra Homework",
            Description = "Solve chapter 1 exercises.",
            DeadlineUtc = DateTime.UtcNow.AddDays(7),
            MaxMarks = 10,
            IsPublished = true,
            Course = course,
            Teacher = teacher
        };

        db.Users.AddRange(admin, teacher, student);
        db.Courses.Add(course);
        db.StudentCourses.Add(enrollment);
        db.Assignments.Add(assignment);

        await db.SaveChangesAsync();
    }
}