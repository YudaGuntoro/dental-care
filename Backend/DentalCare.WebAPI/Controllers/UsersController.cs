using System.Text.Json.Serialization;
using DentalCare.Domain.Auth;
using DentalCare.Persistence.Context;
using DentalCare.Persistence.Services.Shared;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentalCare.WebAPI.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController : ApiControllerBase
{
    private readonly DentalCareDbContext _db;

    public UsersController(DentalCareDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetUsers(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10,
        [FromQuery] string? search = null,
        [FromQuery] bool? isActive = null)
    {
        page = Math.Max(1, page);
        limit = Math.Clamp(limit, 1, 100);

        var query = _db.Users.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim();
            query = query.Where(x =>
                x.Username.Contains(keyword) ||
                x.FullName.Contains(keyword) ||
                (x.Email != null && x.Email.Contains(keyword)) ||
                (x.Phone != null && x.Phone.Contains(keyword)));
        }

        if (isActive.HasValue)
        {
            var status = isActive.Value ? AppUserStatus.ACTIVE : AppUserStatus.INACTIVE;
            query = query.Where(x => x.Status == status);
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(x => x.FullName)
            .ThenBy(x => x.Username)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(x => ToResponse(x))
            .ToListAsync();

        return Ok(new
        {
            success = true,
            message = "Users retrieved successfully",
            data = items,
            pagination = new
            {
                page,
                limit,
                total,
                totalPage = (int)Math.Ceiling(total / (double)limit)
            }
        });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetUser(int id)
    {
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return user is null ? ApiNotFound("User was not found.") : ApiOk(ToResponse(user));
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] UserCreateRequest request)
    {
        var validation = ValidateUser(request.FullName, request.Username, request.Role, request.Status);
        if (validation is not null)
        {
            return ApiBadRequest(validation);
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            return ApiBadRequest("Password is required.");
        }

        if (await _db.Users.AnyAsync(x => x.Username == request.Username.Trim()))
        {
            return ApiBadRequest("Username is already registered.");
        }

        var now = DateTime.Now;
        var salt = AuthPasswordHasher.CreateSalt();
        var user = new AppUser
        {
            Username = request.Username.Trim(),
            FullName = request.FullName.Trim(),
            Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim(),
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
            Role = request.Role,
            Status = request.Status,
            PasswordSalt = salt,
            PasswordHash = AuthPasswordHasher.HashPassword(request.Password, salt),
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return ApiCreated(ToResponse(user), "User created successfully.");
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UserUpdateRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == id);
        if (user is null)
        {
            return ApiNotFound("User was not found.");
        }

        var validation = ValidateUser(request.FullName, request.Username, request.Role, request.Status);
        if (validation is not null)
        {
            return ApiBadRequest(validation);
        }

        var username = request.Username.Trim();
        if (await _db.Users.AnyAsync(x => x.Id != id && x.Username == username))
        {
            return ApiBadRequest("Username is already registered.");
        }

        user.Username = username;
        user.FullName = request.FullName.Trim();
        user.Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
        user.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        user.Role = request.Role;
        user.Status = request.Status;
        user.UpdatedAt = DateTime.Now;

        await _db.SaveChangesAsync();
        return ApiOk(ToResponse(user), "User updated successfully.");
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == id);
        if (user is null)
        {
            return ApiNotFound("User was not found.");
        }

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
        return ApiOk(true, "User deleted successfully.");
    }

    private static string? ValidateUser(
        string fullName,
        string username,
        AppUserRole role,
        AppUserStatus status)
    {
        if (string.IsNullOrWhiteSpace(fullName) || string.IsNullOrWhiteSpace(username))
        {
            return "Full name and username are required.";
        }

        if (!Enum.IsDefined(role))
        {
            return "Selected role is not available.";
        }

        if (!Enum.IsDefined(status))
        {
            return "Selected status is not available.";
        }

        return null;
    }

    private static UserResponse ToResponse(AppUser user) => new()
    {
        Id = user.Id,
        Username = user.Username,
        FullName = user.FullName,
        Email = user.Email,
        Phone = user.Phone,
        Role = user.Role,
        Status = user.Status,
        LastLoginAt = user.LastLoginAt,
        CreatedAt = user.CreatedAt,
        UpdatedAt = user.UpdatedAt
    };
}

public class UserCreateRequest
{
    [JsonPropertyName("username")]
    public string Username { get; set; } = string.Empty;

    [JsonPropertyName("full_name")]
    public string FullName { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string? Email { get; set; }

    [JsonPropertyName("phone")]
    public string? Phone { get; set; }

    [JsonPropertyName("role")]
    public AppUserRole Role { get; set; } = AppUserRole.VIEWER;

    [JsonPropertyName("status")]
    public AppUserStatus Status { get; set; } = AppUserStatus.ACTIVE;

    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;
}

public class UserUpdateRequest
{
    [JsonPropertyName("username")]
    public string Username { get; set; } = string.Empty;

    [JsonPropertyName("full_name")]
    public string FullName { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string? Email { get; set; }

    [JsonPropertyName("phone")]
    public string? Phone { get; set; }

    [JsonPropertyName("role")]
    public AppUserRole Role { get; set; } = AppUserRole.VIEWER;

    [JsonPropertyName("status")]
    public AppUserStatus Status { get; set; } = AppUserStatus.ACTIVE;
}
