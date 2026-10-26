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
public sealed class QueueController(IUnitOfWork unitOfWork) : ClinicControllerBase(unitOfWork)
{
    [AllowAnonymous]
    [HttpGet("public-queue")]
    public async Task<IActionResult> GetPublicQueue([FromQuery] DateTime from, [FromQuery] DateTime to)
    {
        if (to <= from || to - from > TimeSpan.FromDays(1)) return ApiBadRequest("Invalid queue date range.");

        var appointments = await Query<Appointment>().AsNoTracking()
            .Where(x => x.ScheduledAt >= from && x.ScheduledAt < to)
            .OrderBy(x => x.ScheduledAt)
            .ThenBy(x => x.Id)
            .ToListAsync();
        QueuePositionStore.CurrentPositions.TryGetValue(QueuePositionStore.DateKey(from), out var currentAppointmentId);

        var entries = appointments.Where(x => x.Status == "Scheduled" || x.Status == "Completed").Select((x, index) => new
        {
            queueNumber = index + 1,
            scheduledAt = x.ScheduledAt,
            status = x.Status,
            isCurrent = x.Id == currentAppointmentId
        });
        return ApiOk(entries);
    }

    [HttpGet("queue-control")]
    public async Task<IActionResult> GetQueueControl([FromQuery] DateTime from, [FromQuery] DateTime to)
    {
        if (to <= from || to - from > TimeSpan.FromDays(1)) return ApiBadRequest("Invalid queue date range.");
        var appointments = await Query<Appointment>().AsNoTracking()
            .Where(x => x.ScheduledAt >= from && x.ScheduledAt < to)
            .OrderBy(x => x.ScheduledAt)
            .ThenBy(x => x.Id)
            .ToListAsync();
        QueuePositionStore.CurrentPositions.TryGetValue(QueuePositionStore.DateKey(from), out var currentAppointmentId);
        var entries = appointments.Where(x => x.Status == "Scheduled").Select((x, index) => new { queueNumber = index + 1, appointmentId = x.Id, scheduledAt = x.ScheduledAt, status = x.Status });
        return ApiOk(new { currentAppointmentId = currentAppointmentId == 0 ? (int?)null : currentAppointmentId, entries });
    }

    [HttpPut("queue-control")]
    public async Task<IActionResult> SetQueuePosition([FromQuery] DateTime from, [FromQuery] DateTime to, [FromBody] SetQueuePositionRequest request)
    {
        if (to <= from || to - from > TimeSpan.FromDays(1)) return ApiBadRequest("Invalid queue date range.");
        var key = QueuePositionStore.DateKey(from);
        if (!request.AppointmentId.HasValue)
        {
            QueuePositionStore.CurrentPositions.TryRemove(key, out _);
            return ApiOk(new { currentAppointmentId = (int?)null });
        }

        var isValid = await Query<Appointment>().AnyAsync(x => x.Id == request.AppointmentId.Value
            && x.ScheduledAt >= from && x.ScheduledAt < to
            && x.Status == "Scheduled");
        if (!isValid) return ApiBadRequest("Pilih nomor antrean yang masih tersedia.");
        QueuePositionStore.CurrentPositions[key] = request.AppointmentId.Value;
        return ApiOk(new { currentAppointmentId = request.AppointmentId.Value });
    }
public sealed record SetQueuePositionRequest(int? AppointmentId);
}
