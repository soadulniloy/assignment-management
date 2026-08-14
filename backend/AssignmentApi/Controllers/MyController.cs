using System.Security.Claims;
using AssignmentApi.Data;
using AssignmentApi.Models;
using AssignmentApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssignmentApi.Controllers;

[ApiController]
[Route("api/my")]
[Authorize(Roles = Roles.Student)]
public class MyController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly AssignmentService _assignmentService;

    public MyController(AppDbContext db, AssignmentService assignmentService)
    {
        _db = db;
        _assignmentService = assignmentService;
    }

    [HttpGet("assignments")]
    public async Task<List<AssignmentDto>> GetMyAssignments()
    {
        var studentId = GetUserId();

        var assignments = await _db.Assignments
            .Include(a => a.Course)
            .Include(a => a.Teacher)
            .Where(a => a.IsPublished &&
                        a.Course!.StudentCourses.Any(sc => sc.StudentId == studentId))
            .OrderBy(a => a.DeadlineUtc)
            .ToListAsync();

        return assignments.Select(AssignmentDto.From).ToList();
    }

    [HttpGet("submissions")]
    public async Task<List<SubmissionDto>> GetMySubmissions()
    {
        var studentId = GetUserId();

        var submissions = await _db.Submissions
            .Include(s => s.Assignment)
            .Include(s => s.Student)
            .Where(s => s.StudentId == studentId)
            .ToListAsync();

        return submissions.Select(SubmissionDto.From).ToList();
    }

    [HttpPost("assignments/{assignmentId}/submit")]
    public async Task<IActionResult> Submit(int assignmentId, SubmitRequest request)
    {
        try
        {
            var submission = await _assignmentService.SubmitAsync(
                assignmentId,
                GetUserId(),
                request.AnswerText,
                DateTime.UtcNow
            );

            var loaded = await _db.Submissions
                .Include(s => s.Assignment)
                .Include(s => s.Student)
                .FirstAsync(s => s.Id == submission.Id);

            return Ok(SubmissionDto.From(loaded));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("submissions/{id}")]
    public async Task<IActionResult> Update(int id, SubmitRequest request)
    {
        try
        {
            var submission = await _assignmentService.UpdateAsync(
                id,
                GetUserId(),
                request.AnswerText,
                DateTime.UtcNow
            );

            var loaded = await _db.Submissions
                .Include(s => s.Assignment)
                .Include(s => s.Student)
                .FirstAsync(s => s.Id == submission.Id);

            return Ok(SubmissionDto.From(loaded));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private int GetUserId()
    {
        return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }
}