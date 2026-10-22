using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DentalCare.Domain.Production;
using DentalCare.Persistence.Context;

namespace DentalCare.WebAPI.Controllers;

[ApiController]
[Route("api/customers")]
public class CustomersController : ApiControllerBase
{
    private readonly DentalCareDbContext _db;

    public CustomersController(DentalCareDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetCustomers([FromQuery] int page = 1, [FromQuery] int limit = 100, [FromQuery] string? search = null)
    {
        page = Math.Max(1, page);
        limit = Math.Clamp(limit, 1, 100);
        var query = _db.Customers.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim();
            query = query.Where(x => x.CustomerName.Contains(keyword));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(x => x.IsActive)
            .ThenBy(x => x.CustomerName)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return Ok(new
        {
            success = true,
            message = "Customers retrieved successfully.",
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

    [HttpPost]
    public async Task<IActionResult> CreateCustomer([FromBody] CreateCustomerRequest request)
    {
        try
        {
            var name = ValidateName(request.CustomerName);
            var existing = await _db.Customers.FirstOrDefaultAsync(x => x.CustomerName == name);
            if (existing is not null)
            {
                if (!existing.IsActive && request.IsActive)
                {
                    existing.IsActive = true;
                    await _db.SaveChangesAsync();
                }

                return ApiOk(existing, "Customer already registered.");
            }

            var customer = new Customer
            {
                CustomerName = name,
                IsActive = request.IsActive,
                CreatedAt = DateTime.Now
            };
            _db.Customers.Add(customer);
            await _db.SaveChangesAsync();
            return ApiCreated(customer, "Customer created successfully.");
        }
        catch (Exception ex)
        {
            return ApiBadRequest(ex);
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateCustomer(int id, [FromBody] CreateCustomerRequest request)
    {
        try
        {
            var customer = await _db.Customers.FirstOrDefaultAsync(x => x.Id == id);
            if (customer is null) return ApiNotFound("Customer was not found.");

            var name = ValidateName(request.CustomerName);
            if (await _db.Customers.AnyAsync(x => x.Id != id && x.CustomerName == name))
            {
                return ApiBadRequest("Customer name is already used.");
            }

            customer.CustomerName = name;
            customer.IsActive = request.IsActive;
            await _db.SaveChangesAsync();
            return ApiOk(customer, "Customer updated successfully.");
        }
        catch (Exception ex)
        {
            return ApiBadRequest(ex);
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteCustomer(int id)
    {
        try
        {
            var customer = await _db.Customers.FirstOrDefaultAsync(x => x.Id == id);
            if (customer is null) return ApiNotFound("Customer was not found.");
            if (await _db.StockMovements.AnyAsync(x => x.CustomerId == id))
            {
                return ApiBadRequest("Customer cannot be deleted because it is already used by stock movements.");
            }

            _db.Customers.Remove(customer);
            await _db.SaveChangesAsync();
            return ApiOk(true, "Customer deleted successfully.");
        }
        catch (Exception ex)
        {
            return ApiBadRequest(ex);
        }
    }

    private static string ValidateName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) throw new ArgumentException("Customer name is required.");
        return value.Trim();
    }
}
