using ClosedXML.Excel;
using DentalCare.Domain.Production;
using DentalCare.Persistence.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MigraDoc.DocumentObjectModel;
using MigraDoc.DocumentObjectModel.Tables;
using MigraDoc.Rendering;
using PdfSharp.Drawing;
using PdfSharp.Pdf;
using PdfSharp.Pdf.IO;

namespace DentalCare.WebAPI.Controllers;

[ApiController]
[Route("api/clinic")]
public sealed class TreatmentsController(IUnitOfWork unitOfWork) : ClinicControllerBase(unitOfWork)
{
    [HttpGet("treatments")]
    public async Task<IActionResult> GetTreatments()
    {
        var treatments = await Query<DentalTreatment>().AsNoTracking().OrderBy(x => x.Name).ToListAsync();
        var hidePrices = User.IsInRole("DOCTOR");
        return ApiOk(treatments.Select(x => new
        {
            x.Id,
            x.Name,
            x.Description,
            Price = hidePrices ? 0 : x.Price,
            x.DurationMinutes,
            x.IsActive
        }));
    }

    [HttpPost("treatments")]
    public async Task<IActionResult> CreateTreatment(SaveTreatmentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || request.Price < 0 || request.DurationMinutes < 1) return ApiBadRequest("Enter a name, non-negative price, and valid duration.");
        var treatment = new DentalTreatment { Name = request.Name.Trim(), Description = request.Description?.Trim(), Price = request.Price, DurationMinutes = request.DurationMinutes, IsActive = request.IsActive };
        Repository<DentalTreatment>().Add(treatment); await SaveChangesAsync();
        return ApiCreated(treatment, "Treatment added.");
    }

    [HttpPut("treatments/{id:int}")]
    public async Task<IActionResult> UpdateTreatment(int id, SaveTreatmentRequest request)
    {
        var treatment = await Repository<DentalTreatment>().FindAsync(id);
        if (treatment is null) return ApiNotFound("Treatment not found.");
        if (string.IsNullOrWhiteSpace(request.Name) || request.Price < 0 || request.DurationMinutes < 1) return ApiBadRequest("Enter a name, non-negative price, and valid duration.");
        treatment.Name = request.Name.Trim(); treatment.Description = request.Description?.Trim(); treatment.Price = request.Price; treatment.DurationMinutes = request.DurationMinutes; treatment.IsActive = request.IsActive;
        await SaveChangesAsync(); return ApiOk(treatment, "Treatment updated.");
    }

    [HttpDelete("treatments/{id:int}")]
    public async Task<IActionResult> DeleteTreatment(int id) { var item = await Repository<DentalTreatment>().FindAsync(id); if (item is null) return ApiNotFound("Treatment not found."); item.IsActive = false; await SaveChangesAsync(); return ApiOk(item, "Treatment deactivated."); }

}
