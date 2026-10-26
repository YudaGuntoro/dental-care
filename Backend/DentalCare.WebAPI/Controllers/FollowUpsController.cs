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
public sealed class FollowUpsController(IUnitOfWork unitOfWork) : ClinicControllerBase(unitOfWork)
{
    [HttpGet("follow-ups")]
    public async Task<IActionResult> GetFollowUps()
    {
        var rows = await Query<FollowUp>().AsNoTracking().Include(x => x.Patient).Include(x => x.Treatment)
            .Include(x => x.Appointment!).ThenInclude(x => x!.Patient)
            .Include(x => x.Appointment!).ThenInclude(x => x!.Treatment)
            .OrderBy(x => x.FollowUpAt).ToListAsync();
        return ApiOk(rows.Select(x => new
        {
            x.Id,
            x.AppointmentId,
            patientId = x.Appointment?.PatientId ?? x.PatientId,
            treatmentId = x.Appointment?.TreatmentId ?? x.TreatmentId,
            patient_name = x.Appointment?.Patient?.FullName ?? x.Patient?.FullName ?? "",
            treatment_name = x.Appointment?.Treatment?.Name ?? x.Treatment?.Name ?? "Perawatan tidak dipilih",
            lastTreatmentAt = x.Appointment?.ScheduledAt ?? x.LastTreatmentAt,
            x.FollowUpAt,
            x.Status,
            x.Notes
        }));
    }

    [HttpPost("follow-ups")]
    public async Task<IActionResult> CreateFollowUp(SaveFollowUpRequest request)
    {
        var appointment = await Query<Appointment>().AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.AppointmentId && x.Status == "Completed");
        if (appointment is null) return ApiBadRequest("Pilih kunjungan selesai yang valid.");
        if (request.FollowUpAt == default || request.FollowUpAt <= appointment.ScheduledAt) return ApiBadRequest("Jadwal tindak lanjut harus setelah kunjungan terakhir.");
        var followUp = new FollowUp { AppointmentId = appointment.Id, FollowUpAt = request.FollowUpAt, Status = "Pending", Notes = request.Notes?.Trim() };
        Repository<FollowUp>().Add(followUp); await SaveChangesAsync(); return ApiCreated(followUp, "Tindak lanjut berhasil ditambahkan.");
    }

    [HttpPut("follow-ups/{id:int}/status")]
    public async Task<IActionResult> UpdateFollowUpStatus(int id, [FromBody] string status)
    {
        var followUp = await Repository<FollowUp>().FindAsync(id);
        if (followUp is null) return ApiNotFound("Follow-up not found.");
        if (!new[] { "Pending", "Completed", "Cancelled" }.Contains(status)) return ApiBadRequest("Invalid follow-up status.");
        followUp.Status = status; await SaveChangesAsync(); return ApiOk(followUp, "Follow-up status updated.");
    }

}
