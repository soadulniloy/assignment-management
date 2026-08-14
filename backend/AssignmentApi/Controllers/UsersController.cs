using AssignmentApi.Data;
using AssignmentApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssignmentApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = Roles.Admin)]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;

    public UsersController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<List<UserDto>> GetAll()
    {
        return await _db.Users
            .OrderBy(u => u.Name)
            .Select(u => new UserDto(u.Id, u.Name, u.Email, u.Role))
            .ToListAsync();
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateUserRequest request)
    {
        var exists = await _db.Users.AnyAsync(u => u.Email == request.Email);

        if (exists)
            return BadRequest(new { message = "Email already exists." });

        var user = new User
        {
            Name = request.Name,
            Email = request.Email,
            Role = request.Role
        };

        user.PasswordHash = new PasswordHasher<User>().HashPassword(user, request.Password);

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return Ok(new UserDto(user.Id, user.Name, user.Email, user.Role));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var user = await _db.Users.FindAsync(id);

        if (user is null)
            return NotFound();

        var hasAssignments = await _db.Assignments.AnyAsync(a => a.TeacherId == id);

        if (hasAssignments)
            return BadRequest(new { message = "Cannot delete teacher with assignments." });

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}