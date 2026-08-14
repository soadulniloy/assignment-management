using System.Security.Claims;
using AssignmentApi.Data;
using AssignmentApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssignmentApi.Controllers;

[ApiController]
[Route("api/teacher")]
[Authorize(Roles = Roles.Teacher)]
public class TeacherController : ControllerBase
{
    private readonly AppDbContext _db;

    public TeacherController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("courses")]
    public async Task<List<CourseDto>> MyCourses()
    {
        var teacherId = GetUserId();

        var courses = await _db.Courses
            .Include(c => c.Teacher)
            .Include(c => c.StudentCourses)
            .Where(c => c.TeacherId == teacherId)
            .ToListAsync();

        return courses.Select(CourseDto.From).ToList();
    }

    private int GetUserId()
    {
        return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}