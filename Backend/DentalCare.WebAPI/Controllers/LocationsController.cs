using DentalCare.Domain.Production;
using DentalCare.Persistence.Context;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentalCare.WebAPI.Controllers;

[ApiController]
[Route("api/locations")]
public class LocationsController : ApiControllerBase
{
    private readonly DentalCareDbContext _db;

    public LocationsController(DentalCareDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetLocations([FromQuery] int page = 1, [FromQuery] int limit = 10, [FromQuery] string? search = null)
    {
        page = Math.Max(1, page);
        limit = Math.Clamp(limit, 1, 100);

        var query = _db.Locations.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim();
            query = query.Where(x =>
                x.LocationCode.Contains(keyword) ||
                x.LocationName.Contains(keyword) ||
                (x.Description != null && x.Description.Contains(keyword)));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(x => x.IsActive)
            .ThenBy(x => x.LocationCode)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return Ok(new
        {
            success = true,
            message = "Locations retrieved successfully",
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
    public async Task<IActionResult> GetLocation(int id)
    {
        var location = await _db.Locations.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return location is null ? ApiNotFound("Location was not found.") : ApiOk(location);
    }

    [HttpPost]
    public async Task<IActionResult> CreateLocation([FromBody] CreateLocationRequest request)
    {
        try
        {
            ValidateLocation(request);
            var locationCode = request.LocationCode.Trim();
            if (await _db.Locations.AnyAsync(x => x.LocationCode == locationCode))
            {
                throw new InvalidOperationException("Location code is already used.");
            }

            var location = new WarehouseLocation
            {
                LocationCode = locationCode,
                LocationName = request.LocationName.Trim(),
                Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
                IsActive = request.IsActive,
                CreatedAt = DateTime.Now
            };

            _db.Locations.Add(location);
            await _db.SaveChangesAsync();
            return ApiCreated(location, "Location created successfully.");
        }
        catch (Exception ex)
        {
            return ApiBadRequest(ex);
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateLocation(int id, [FromBody] CreateLocationRequest request)
    {
        try
        {
            ValidateLocation(request);
            var location = await _db.Locations.FirstOrDefaultAsync(x => x.Id == id);
            if (location is null)
            {
                return ApiNotFound("Location was not found.");
            }

            var locationCode = request.LocationCode.Trim();
            if (await _db.Locations.AnyAsync(x => x.Id != id && x.LocationCode == locationCode))
            {
                throw new InvalidOperationException("Location code is already used.");
            }

            location.LocationCode = locationCode;
            location.LocationName = request.LocationName.Trim();
            location.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
            location.IsActive = request.IsActive;

            await _db.SaveChangesAsync();
            return ApiOk(location, "Location updated successfully.");
        }
        catch (Exception ex)
        {
            return ApiBadRequest(ex);
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteLocation(int id)
    {
        try
        {
            var location = await _db.Locations.FirstOrDefaultAsync(x => x.Id == id);
            if (location is null)
            {
                return ApiNotFound("Location was not found.");
            }

            if (await _db.StockMovements.AnyAsync(x => x.LocationId == id))
            {
                throw new InvalidOperationException("Location cannot be deleted because it is already used by stock movements.");
            }

            _db.Locations.Remove(location);
            await _db.SaveChangesAsync();
            return ApiOk(true, "Location deleted successfully.");
        }
        catch (Exception ex)
        {
            return ApiBadRequest(ex);
        }
    }

    private static void ValidateLocation(CreateLocationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.LocationCode) ||
            string.IsNullOrWhiteSpace(request.LocationName))
        {
            throw new ArgumentException("Location Code and Location Name are required.");
        }
    }
}
