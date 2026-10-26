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
public sealed class DoctorsController(IUnitOfWork unitOfWork) : ClinicControllerBase(unitOfWork)
{
    [HttpGet("doctors")]
    public async Task<IActionResult> GetDoctors()
    {
        var doctors = await Query<Doctor>().AsNoTracking().Include(x => x.PracticeSchedules).OrderBy(x => x.FullName).ToListAsync();
        foreach (var doctor in doctors) doctor.PracticeSchedule = FormatPracticeHours(doctor.PracticeSchedules);
        return ApiOk(doctors);
    }

    [HttpPost("doctors")]
    public async Task<IActionResult> CreateDoctor(SaveDoctorRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName)) return ApiBadRequest("Doctor name is required.");
        if (!TryBuildPracticeHours(request.PracticeHours, out var hours)) return ApiBadRequest("Jadwal praktik tidak valid.");
        var doctor = new Doctor { FullName = request.FullName.Trim(), Specialty = request.Specialty?.Trim(), Phone = request.Phone?.Trim(), Email = request.Email?.Trim(), LicenseNumber = request.LicenseNumber?.Trim(), PracticeSchedules = hours, IsActive = request.IsActive };
        doctor.PracticeSchedule = FormatPracticeHours(hours);
        Repository<Doctor>().Add(doctor); await SaveChangesAsync();
        return ApiCreated(doctor, "Doctor added.");
    }

    [HttpPut("doctors/{id:int}")]
    public async Task<IActionResult> UpdateDoctor(int id, SaveDoctorRequest request)
    {
        var doctor = await Query<Doctor>().Include(x => x.PracticeSchedules).FirstOrDefaultAsync(x => x.Id == id);
        if (doctor is null) return ApiNotFound("Doctor not found.");
        if (string.IsNullOrWhiteSpace(request.FullName)) return ApiBadRequest("Doctor name is required.");
        if (!TryBuildPracticeHours(request.PracticeHours, out var hours)) return ApiBadRequest("Jadwal praktik tidak valid.");
        doctor.FullName = request.FullName.Trim(); doctor.Specialty = request.Specialty?.Trim(); doctor.Phone = request.Phone?.Trim(); doctor.Email = request.Email?.Trim(); doctor.LicenseNumber = request.LicenseNumber?.Trim(); doctor.PracticeSchedule = FormatPracticeHours(hours); doctor.IsActive = request.IsActive;
        Repository<DoctorPracticeSchedule>().RemoveRange(doctor.PracticeSchedules);
        doctor.PracticeSchedules = hours;
        await SaveChangesAsync(); return ApiOk(doctor, "Doctor updated.");
    }

    [HttpDelete("doctors/{id:int}")]
    public async Task<IActionResult> DeleteDoctor(int id) { var item = await Repository<Doctor>().FindAsync(id); if (item is null) return ApiNotFound("Doctor not found."); item.IsActive = false; await SaveChangesAsync(); return ApiOk(item, "Doctor deactivated."); }
    private static bool TryBuildPracticeHours(IReadOnlyCollection<SaveDoctorPracticeScheduleRequest>? requests, out List<DoctorPracticeSchedule> hours)
    {
        hours = [];
        if (requests is null) return true;
        if (requests.Any(x => x.DayOfWeek is < 1 or > 7 || x.StartTime >= x.EndTime)) return false;
        if (requests.GroupBy(x => new { x.DayOfWeek, x.StartTime }).Any(x => x.Count() > 1)) return false;
        hours = requests.Select(x => new DoctorPracticeSchedule { DayOfWeek = x.DayOfWeek, StartTime = x.StartTime, EndTime = x.EndTime, IsActive = true }).ToList();
        return true;
    }

    private static string FormatPracticeHours(IEnumerable<DoctorPracticeSchedule> hours)
    {
        var days = new[] { "", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu" };
        return string.Join("; ", hours.OrderBy(x => x.DayOfWeek ?? 8).ThenBy(x => x.StartTime)
            .Select(x => x.DayOfWeek is >= 1 and <= 7 && x.StartTime.HasValue && x.EndTime.HasValue
                ? $"{days[x.DayOfWeek.Value]} {x.StartTime:HH\\:mm}–{x.EndTime:HH\\:mm}"
                : x.LegacyText)
            .Where(x => !string.IsNullOrWhiteSpace(x)));
    }
}
