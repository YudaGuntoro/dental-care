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
public sealed class AppointmentsController(IUnitOfWork unitOfWork) : ClinicControllerBase(unitOfWork)
{
    [HttpGet("appointments")]
    public async Task<IActionResult> GetAppointments([FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
    {
        IQueryable<Appointment> query = Query<Appointment>().AsNoTracking().Include(x => x.Patient).Include(x => x.Treatment).Include(x => x.Doctor).Include(x => x.Services).ThenInclude(x => x.Treatment);
        if (from.HasValue) query = query.Where(x => x.ScheduledAt >= from.Value);
        if (to.HasValue) query = query.Where(x => x.ScheduledAt < to.Value);
        var rows = await query.OrderBy(x => x.ScheduledAt).ToListAsync();
        return ApiOk(rows.Select(x => { x.PatientName = x.Patient?.FullName ?? ""; x.DoctorName = x.Doctor?.FullName ?? ""; x.TreatmentName = x.Treatment?.Name ?? "Belum ditentukan"; foreach (var service in x.Services) service.TreatmentName = service.Treatment?.Name ?? ""; return x; }));
    }

    [HttpPost("appointments")]
    public async Task<IActionResult> CreateAppointment(SaveAppointmentRequest request)
    {
        if (!await Query<Patient>().AnyAsync(x => x.Id == request.PatientId)) return ApiBadRequest("Select a valid patient.");
        if (request.ScheduledAt == default) return ApiBadRequest("Appointment date and time are required.");
        if (request.TreatmentId.HasValue && !await Query<DentalTreatment>().AnyAsync(x => x.Id == request.TreatmentId && x.IsActive)) return ApiBadRequest("Select a valid treatment.");
        if (request.DoctorId.HasValue && !await Query<Doctor>().AnyAsync(x => x.Id == request.DoctorId && x.IsActive)) return ApiBadRequest("Pilih dokter yang masih aktif.");
        var appointment = new Appointment { PatientId = request.PatientId, DoctorId = request.DoctorId, TreatmentId = request.TreatmentId, ScheduledAt = request.ScheduledAt, Status = "Scheduled", Notes = request.Notes?.Trim(), Diagnosis = request.Diagnosis?.Trim(), ProcedureNotes = request.ProcedureNotes?.Trim(), Prescription = request.Prescription?.Trim() };
        Repository<Appointment>().Add(appointment); await SaveChangesAsync();
        return ApiCreated(appointment, "Appointment scheduled.");
    }

    [HttpPut("appointments/{id:int}/status")]
    public async Task<IActionResult> UpdateAppointmentStatus(int id, [FromBody] string status)
    {
        var appointment = await Repository<Appointment>().FindAsync(id);
        if (appointment is null) return ApiNotFound("Appointment not found.");
        if (!new[] { "Scheduled", "InProgress", "Completed", "Cancelled", "NoShow" }.Contains(status)) return ApiBadRequest("Invalid appointment status.");
        appointment.Status = status; await SaveChangesAsync();
        if (status != "Scheduled") QueuePositionStore.RemoveAppointment(appointment.Id);
        return ApiOk(appointment, "Appointment status updated.");
    }

    [HttpPut("appointments/{id:int}/medical-record")]
    [Authorize(Roles = "DOCTOR,ADMIN")]
    public async Task<IActionResult> UpdateAppointmentMedicalRecord(int id, SaveVisitRecordRequest request)
    {
        var appointment = await Repository<Appointment>().FindAsync(id);
        if (appointment is null) return ApiNotFound("Kunjungan tidak ditemukan.");
        appointment.Notes = request.Notes?.Trim();
        appointment.Diagnosis = request.Diagnosis?.Trim();
        appointment.ProcedureNotes = request.ProcedureNotes?.Trim();
        appointment.Prescription = request.Prescription?.Trim();
        if (request.DoctorId.HasValue)
        {
            if (!await Query<Doctor>().AnyAsync(x => x.Id == request.DoctorId && x.IsActive)) return ApiBadRequest("Pilih dokter yang masih aktif.");
            appointment.DoctorId = request.DoctorId;
        }
        if (request.TreatmentIds.Count > 0)
        {
            var treatments = await Query<DentalTreatment>().Where(x => request.TreatmentIds.Contains(x.Id) && x.IsActive).ToListAsync();
            if (treatments.Count != request.TreatmentIds.Distinct().Count()) return ApiBadRequest("Ada layanan yang tidak valid atau sudah tidak aktif.");
            var current = await Query<AppointmentService>().Where(x => x.AppointmentId == id).ToListAsync();
            Repository<AppointmentService>().RemoveRange(current);
            Repository<AppointmentService>().AddRange(treatments.Select(x => new AppointmentService { AppointmentId = id, TreatmentId = x.Id, UnitPrice = x.Price, Quantity = 1 }));
        }
        await SaveChangesAsync();
        return ApiOk(appointment, "Rekam medis kunjungan berhasil diperbarui.");
    }

    [HttpDelete("appointments/{id:int}")]
    public async Task<IActionResult> DeleteAppointment(int id) { var item = await Repository<Appointment>().FindAsync(id); if (item is null) return ApiNotFound("Appointment not found."); Repository<Appointment>().Remove(item); await SaveChangesAsync(); QueuePositionStore.RemoveAppointment(id); return ApiOk(item, "Appointment deleted."); }

}
