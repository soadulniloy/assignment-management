using AssignmentApi.Data;
using AssignmentApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssignmentApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = Roles.Admin)]
public class CoursesController : ControllerBase
{
    private readonly AppDbContext _db;

    public CoursesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<List<CourseDto>> GetAll()
    {
        var courses = await _db.Courses
            .Include(c => c.Teacher)
            .Include(c => c.StudentCourses)
            .OrderBy(c => c.Name)
            .ToListAsync();

        return courses.Select(CourseDto.From).ToList();
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateCourseRequest request)
    {
        if (request.TeacherId.HasValue)
        {
            var teacherExists = await _db.Users.AnyAsync(u =>
                u.Id == request.TeacherId.Value && u.Role == Roles.Teacher);

            if (!teacherExists)
                return BadRequest(new { message = "Teacher not found." });
        }

        var course = new Course
        {
            Name = request.Name,
            Subject = request.Subject,
            TeacherId = request.TeacherId
        };

        _db.Courses.Add(course);
        await _db.SaveChangesAsync();

        var created = await _db.Courses
            .Include(c => c.Teacher)
            .Include(c => c.StudentCourses)
            .FirstAsync(c => c.Id == course.Id);

        return Ok(CourseDto.From(created));
    }

    [HttpPost("{id}/assign-teacher")]
    public async Task<IActionResult> AssignTeacher(int id, AssignTeacherRequest request)
    {
        var course = await _db.Courses.FindAsync(id);

        if (course is null)
            return NotFound();

        var teacherExists = await _db.Users.AnyAsync(u =>
            u.Id == request.TeacherId && u.Role == Roles.Teacher);

        if (!teacherExists)
            return BadRequest(new { message = "Teacher not found." });

        course.TeacherId = request.TeacherId;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Teacher assigned." });
    }

    [HttpPost("{id}/enroll-student")]
    public async Task<IActionResult> EnrollStudent(int id, EnrollStudentRequest request)
    {
        var course = await _db.Courses
            .Include(c => c.StudentCourses)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (course is null)
            return NotFound();

        var student = await _db.Users.FirstOrDefaultAsync(u =>
            u.Id == request.StudentId && u.Role == Roles.Student);

        if (student is null)
            return BadRequest(new { message = "Student not found." });

        var alreadyEnrolled = course.StudentCourses
            .Any(sc => sc.StudentId == student.Id);

        if (alreadyEnrolled)
            return BadRequest(new { message = "Student is already enrolled." });

        _db.StudentCourses.Add(new StudentCourse
        {
            CourseId = course.Id,
            StudentId = student.Id
        });

        await _db.SaveChangesAsync();

        return Ok(new { message = "Student enrolled." });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var course = await _db.Courses.FindAsync(id);

        if (course is null)
            return NotFound();

        var hasAssignments = await _db.Assignments.AnyAsync(a => a.CourseId == id);

        if (hasAssignments)
            return BadRequest(new { message = "Cannot delete course with assignments." });

        _db.Courses.Remove(course);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}