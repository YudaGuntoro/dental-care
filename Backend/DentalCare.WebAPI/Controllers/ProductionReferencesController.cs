using DentalCare.Persistence.Context;
using DentalCare.Domain.Production;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentalCare.WebAPI.Controllers;

[ApiController]
[Route("api/production")]
public class ProductionReferencesController : ApiControllerBase
{
    private readonly DentalCareDbContext _db;

    public ProductionReferencesController(DentalCareDbContext db) => _db = db;

    [HttpGet("pic-cards")]
    public async Task<IActionResult> PicCards()
    {
        var items = await _db.PicCards.AsNoTracking()
            .Include(x => x.ShiftRef)
            .OrderBy(x => x.FullName)
            .Select(x => new PicCard
            {
                Id = x.Id,
                CardUid = x.CardUid,
                EmployeeNo = x.EmployeeNo,
                FullName = x.FullName,
                Department = x.Department,
                ShiftId = x.ShiftId,
                Shift = x.ShiftRef!.ShiftName,
                IsActive = x.IsActive,
                LastScannedAt = x.LastScannedAt,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync();

        return ApiOk(items);
    }

    [HttpPost("pic-cards")]
    public async Task<IActionResult> CreatePicCard([FromBody] CreatePicCardRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CardUid) ||
            string.IsNullOrWhiteSpace(request.EmployeeNo) ||
            string.IsNullOrWhiteSpace(request.FullName))
        {
            return ApiBadRequest("Card UID, employee number, and staff name are required.");
        }

        var cardUid = request.CardUid.Trim();
        var employeeNo = request.EmployeeNo.Trim();
        var fullName = request.FullName.Trim();
        var department = string.IsNullOrWhiteSpace(request.Department)
            ? "Warehouse"
            : request.Department.Trim();

        var shiftExists = await _db.ShiftMasters.AnyAsync(x => x.Id == request.ShiftId && x.IsActive);
        if (!shiftExists)
        {
            return ApiBadRequest("Selected shift is not available.");
        }

        var duplicateCard = await _db.PicCards.AnyAsync(x => x.CardUid == cardUid);
        if (duplicateCard)
        {
            return ApiBadRequest("Card UID is already registered.");
        }

        var duplicateEmployee = await _db.PicCards.AnyAsync(x => x.EmployeeNo == employeeNo);
        if (duplicateEmployee)
        {
            return ApiBadRequest("Employee number is already registered.");
        }

        var card = new PicCard
        {
            CardUid = cardUid,
            EmployeeNo = employeeNo,
            FullName = fullName,
            Department = department,
            ShiftId = request.ShiftId,
            IsActive = request.IsActive,
            CreatedAt = DateTime.Now
        };

        _db.PicCards.Add(card);
        await _db.SaveChangesAsync();

        var created = await _db.PicCards.AsNoTracking()
            .Include(x => x.ShiftRef)
            .Where(x => x.Id == card.Id)
            .Select(x => new PicCard
            {
                Id = x.Id,
                CardUid = x.CardUid,
                EmployeeNo = x.EmployeeNo,
                FullName = x.FullName,
                Department = x.Department,
                ShiftId = x.ShiftId,
                Shift = x.ShiftRef!.ShiftName,
                IsActive = x.IsActive,
                LastScannedAt = x.LastScannedAt,
                CreatedAt = x.CreatedAt
            })
            .FirstAsync();

        return ApiCreated(created, "Staff card created successfully.");
    }

    [HttpPut("pic-cards/{id:int}")]
    public async Task<IActionResult> UpdatePicCard(int id, [FromBody] CreatePicCardRequest request)
    {
        var card = await _db.PicCards.FirstOrDefaultAsync(x => x.Id == id);
        if (card is null)
        {
            return ApiNotFound("Staff card was not found.");
        }

        if (string.IsNullOrWhiteSpace(request.CardUid) ||
            string.IsNullOrWhiteSpace(request.EmployeeNo) ||
            string.IsNullOrWhiteSpace(request.FullName))
        {
            return ApiBadRequest("Card UID, employee number, and staff name are required.");
        }

        var cardUid = request.CardUid.Trim();
        var employeeNo = request.EmployeeNo.Trim();
        var fullName = request.FullName.Trim();
        var department = string.IsNullOrWhiteSpace(request.Department)
            ? "Warehouse"
            : request.Department.Trim();

        var shiftExists = await _db.ShiftMasters.AnyAsync(x => x.Id == request.ShiftId && x.IsActive);
        if (!shiftExists)
        {
            return ApiBadRequest("Selected shift is not available.");
        }

        var duplicateCard = await _db.PicCards.AnyAsync(x => x.Id != id && x.CardUid == cardUid);
        if (duplicateCard)
        {
            return ApiBadRequest("Card UID is already registered.");
        }

        var duplicateEmployee = await _db.PicCards.AnyAsync(x => x.Id != id && x.EmployeeNo == employeeNo);
        if (duplicateEmployee)
        {
            return ApiBadRequest("Employee number is already registered.");
        }

        card.CardUid = cardUid;
        card.EmployeeNo = employeeNo;
        card.FullName = fullName;
        card.Department = department;
        card.ShiftId = request.ShiftId;
        card.IsActive = request.IsActive;

        await _db.SaveChangesAsync();

        var updated = await _db.PicCards.AsNoTracking()
            .Include(x => x.ShiftRef)
            .Where(x => x.Id == card.Id)
            .Select(x => new PicCard
            {
                Id = x.Id,
                CardUid = x.CardUid,
                EmployeeNo = x.EmployeeNo,
                FullName = x.FullName,
                Department = x.Department,
                ShiftId = x.ShiftId,
                Shift = x.ShiftRef!.ShiftName,
                IsActive = x.IsActive,
                LastScannedAt = x.LastScannedAt,
                CreatedAt = x.CreatedAt
            })
            .FirstAsync();

        return ApiOk(updated, "Staff card updated successfully.");
    }

    [HttpDelete("pic-cards/{id:int}")]
    public async Task<IActionResult> DeletePicCard(int id)
    {
        var card = await _db.PicCards.FirstOrDefaultAsync(x => x.Id == id);
        if (card is null)
        {
            return ApiNotFound("Staff card was not found.");
        }

        _db.PicCards.Remove(card);
        await _db.SaveChangesAsync();
        return ApiOk(true, "Staff card deleted successfully.");
    }

    [HttpGet("shift-masters")]
    public async Task<IActionResult> ShiftMasters()
    {
        return ApiOk(await _db.ShiftMasters.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.ShiftName)
            .ToListAsync());
    }
}
