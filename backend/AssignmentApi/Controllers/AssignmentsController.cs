using System.Security.Claims;
using AssignmentApi.Data;
using AssignmentApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssignmentApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Teacher,Admin")]
public class AssignmentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AssignmentsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<List<AssignmentDto>> GetAll()
    {
        var userId = GetUserId();
        var isAdmin = IsAdmin();

        var query = _db.Assignments
            .Include(a => a.Course)
            .Include(a => a.Teacher)
            .AsQueryable();

        if (!isAdmin)
        {
            query = query.Where(a => a.TeacherId == userId);
        }

        var assignments = await query
            .OrderByDescending(a => a.DeadlineUtc)
            .ToListAsync();

        return assignments.Select(AssignmentDto.From).ToList();
    }

    [HttpPost]
    [Authorize(Roles = Roles.Teacher)]
    public async Task<IActionResult> Create(CreateAssignmentRequest request)
    {
        var userId = GetUserId();

        var course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == request.CourseId);

        if (course is null)
            return BadRequest(new { message = "Course not found." });

        if (course.TeacherId != userId)
            return BadRequest(new { message = "Only the assigned teacher can create assignments for this course." });

        var assignment = new Assignment
        {
            Title = request.Title,
            Description = request.Description,
            DeadlineUtc = request.DeadlineUtc,
            MaxMarks = request.MaxMarks,
            CourseId = request.CourseId,
            TeacherId = userId,
            IsPublished = request.IsPublished
        };

        _db.Assignments.Add(assignment);
        await _db.SaveChangesAsync();

        var created = await _db.Assignments
            .Include(a => a.Course)
            .Include(a => a.Teacher)
            .FirstAsync(a => a.Id == assignment.Id);

        return Ok(AssignmentDto.From(created));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = Roles.Teacher)]
    public async Task<IActionResult> Update(int id, UpdateAssignmentRequest request)
    {
        var userId = GetUserId();

        var assignment = await _db.Assignments.FirstOrDefaultAsync(a => a.Id == id);

        if (assignment is null)
            return NotFound();

        if (assignment.TeacherId != userId)
            return BadRequest(new { message = "You can only update your own assignments." });

        assignment.Title = request.Title;
        assignment.Description = request.Description;
        assignment.DeadlineUtc = request.DeadlineUtc;
        assignment.MaxMarks = request.MaxMarks;
        assignment.IsPublished = request.IsPublished;

        await _db.SaveChangesAsync();

        var updated = await _db.Assignments
            .Include(a => a.Course)
            .Include(a => a.Teacher)
            .FirstAsync(a => a.Id == id);

        return Ok(AssignmentDto.From(updated));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = Roles.Teacher)]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = GetUserId();

        var assignment = await _db.Assignments.FirstOrDefaultAsync(a => a.Id == id);

        if (assignment is null)
            return NotFound();

        if (assignment.TeacherId != userId)
            return BadRequest(new { message = "You can only delete your own assignments." });

        _db.Assignments.Remove(assignment);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("{id}/publish")]
    [Authorize(Roles = Roles.Teacher)]
    public async Task<IActionResult> Publish(int id)
    {
        var userId = GetUserId();

        var assignment = await _db.Assignments.FirstOrDefaultAsync(a => a.Id == id);

        if (assignment is null)
            return NotFound();

        if (assignment.TeacherId != userId)
            return BadRequest(new { message = "You can only publish your own assignments." });

        assignment.IsPublished = true;
        await _db.SaveChangesAsync();

        var updated = await _db.Assignments
            .Include(a => a.Course)
            .Include(a => a.Teacher)
            .FirstAsync(a => a.Id == id);

        return Ok(AssignmentDto.From(updated));
    }

    [HttpGet("{id}/submissions")]
    public async Task<IActionResult> GetSubmissions(int id)
    {
        var userId = GetUserId();
        var isAdmin = IsAdmin();

        var assignment = await _db.Assignments.FirstOrDefaultAsync(a => a.Id == id);

        if (assignment is null)
            return NotFound();

        if (!isAdmin && assignment.TeacherId != userId)
            return BadRequest(new { message = "You can only view submissions for your own assignments." });

        var submissions = await _db.Submissions
            .Include(s => s.Assignment)
            .Include(s => s.Student)
            .Where(s => s.AssignmentId == id)
            .ToListAsync();

        return Ok(submissions.Select(SubmissionDto.From).ToList());
    }

    private int GetUserId()
    {
        return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }

    private bool IsAdmin()
    {
        return User.IsInRole(Roles.Admin);
    }
}