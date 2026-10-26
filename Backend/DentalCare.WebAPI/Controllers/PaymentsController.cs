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
public sealed class PaymentsController(IUnitOfWork unitOfWork) : ClinicControllerBase(unitOfWork)
{
    [HttpGet("payments")]
    public async Task<IActionResult> GetPayments()
    {
        var rows = await Query<DentalPayment>().AsNoTracking().Include(x => x.Patient).OrderByDescending(x => x.PaidAt).Take(300).ToListAsync();
        return ApiOk(rows.Select(x => { x.PatientName = x.Patient?.FullName ?? ""; return x; }));
    }

    [HttpPost("payments")]
    public async Task<IActionResult> CreatePayment(SavePaymentRequest request)
    {
        if (request.Amount <= 0) return ApiBadRequest("Payment amount must be greater than zero.");
        if (!await Query<Patient>().AnyAsync(x => x.Id == request.PatientId)) return ApiBadRequest("Select a valid patient.");
        if (request.AppointmentId.HasValue && !await Query<Appointment>().AnyAsync(x => x.Id == request.AppointmentId && x.PatientId == request.PatientId)) return ApiBadRequest("Appointment does not belong to the selected patient.");
        var payment = new DentalPayment { PatientId = request.PatientId, AppointmentId = request.AppointmentId, Amount = request.Amount, Method = request.Method, Status = "Paid", PaidAt = request.PaidAt == default ? DateTime.UtcNow : request.PaidAt };
        Repository<DentalPayment>().Add(payment); await SaveChangesAsync();
        return ApiCreated(payment, "Payment recorded.");
    }

    [HttpDelete("payments/{id:int}")]
    public async Task<IActionResult> DeletePayment(int id) { var item = await Repository<DentalPayment>().FindAsync(id); if (item is null) return ApiNotFound("Payment not found."); Repository<DentalPayment>().Remove(item); await SaveChangesAsync(); return ApiOk(item, "Payment deleted."); }

}
