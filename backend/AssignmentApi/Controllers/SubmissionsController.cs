using System.Security.Claims;
using AssignmentApi.Data;
using AssignmentApi.Models;
using AssignmentApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssignmentApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Teacher,Admin")]
public class SubmissionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly AssignmentService _assignmentService;

    public SubmissionsController(AppDbContext db, AssignmentService assignmentService)
    {
        _db = db;
        _assignmentService = assignmentService;
    }

    [HttpPost("{id}/review")]
    public async Task<IActionResult> Review(int id, ReviewRequest request)
    {
        try
        {
            var teacherId = GetUserId();
            var isAdmin = User.IsInRole(Roles.Admin);

            var submission = await _assignmentService.ReviewAsync(
                id,
                teacherId,
                request.Marks,
                request.Feedback,
                isAdmin
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