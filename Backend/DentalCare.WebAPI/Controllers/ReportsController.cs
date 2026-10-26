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
public sealed class ReportsController(IUnitOfWork unitOfWork) : ClinicControllerBase(unitOfWork)
{
    [HttpGet("reports/daily")]
    public async Task<IActionResult> GetDailyReport([FromQuery] DateOnly? date = null)
    {
        var reportDate = date ?? DateOnly.FromDateTime(DateTime.Today);
        var from = reportDate.ToDateTime(TimeOnly.MinValue);
        var to = from.AddDays(1);
        var payments = await Query<DentalPayment>().AsNoTracking()
            .Include(x => x.Patient)
            .Where(x => x.PaidAt >= from && x.PaidAt < to)
            .OrderBy(x => x.PaidAt)
            .Select(x => new { x.Id, x.PatientId, PatientName = x.Patient!.FullName, x.Amount, x.Method, x.Status, x.PaidAt })
            .ToListAsync();
        var appointments = await Query<Appointment>().AsNoTracking()
            .Include(x => x.Patient).Include(x => x.Doctor).Include(x => x.Treatment)
            .Where(x => x.ScheduledAt >= from && x.ScheduledAt < to)
            .OrderBy(x => x.ScheduledAt)
            .Select(x => new { x.Id, x.PatientId, PatientName = x.Patient!.FullName, Phone = x.Patient.Phone, DoctorName = x.Doctor == null ? "" : x.Doctor.FullName, TreatmentName = x.Treatment == null ? "" : x.Treatment.Name, x.ScheduledAt, x.Status })
            .ToListAsync();
        return ApiOk(new { date = reportDate.ToString("yyyy-MM-dd"), totalRevenue = payments.Where(x => x.Status == "Paid").Sum(x => x.Amount), payments, arrivals = appointments });
    }

    [HttpGet("reports/daily/export")]
    public async Task<IActionResult> ExportDailyReport([FromQuery] DateOnly? date = null)
    {
        var reportDate = date ?? DateOnly.FromDateTime(DateTime.Today);
        var from = reportDate.ToDateTime(TimeOnly.MinValue);
        var to = from.AddDays(1);
        var payments = await Query<DentalPayment>().AsNoTracking().Include(x => x.Patient)
            .Where(x => x.PaidAt >= from && x.PaidAt < to).OrderBy(x => x.PaidAt).ToListAsync();
        var arrivals = await Query<Appointment>().AsNoTracking().Include(x => x.Patient).Include(x => x.Doctor).Include(x => x.Treatment)
            .Where(x => x.ScheduledAt >= from && x.ScheduledAt < to).OrderBy(x => x.ScheduledAt).ToListAsync();

        using var workbook = new XLWorkbook();
        var teal = XLColor.FromHtml("#0F766E");
        var dark = XLColor.FromHtml("#12343B");
        var paleTeal = XLColor.FromHtml("#E6F4F1");
        var light = XLColor.FromHtml("#F4F7F8");
        var border = XLColor.FromHtml("#D9E3E7");
        var muted = XLColor.FromHtml("#52636B");

        var finance = workbook.Worksheets.Add("Keuangan");
        finance.Style.Font.FontName = "Aptos";
        finance.Style.Font.FontSize = 10;
        finance.Column(1).Width = 7; finance.Column(2).Width = 21; finance.Column(3).Width = 14;
        finance.Column(4).Width = 30; finance.Column(5).Width = 20; finance.Column(6).Width = 16; finance.Column(7).Width = 21;
        finance.Range("A1:G1").Merge().Value = "DENTAL CARE  |  LAPORAN HARIAN";
        finance.Range("A1:G1").Style.Font.Bold = true; finance.Range("A1:G1").Style.Font.FontSize = 18;
        finance.Range("A1:G1").Style.Font.FontColor = XLColor.White; finance.Range("A1:G1").Style.Fill.BackgroundColor = dark;
        finance.Range("A1:G1").Style.Alignment.Vertical = XLAlignmentVerticalValues.Center; finance.Row(1).Height = 36;
        finance.Range("A2:G2").Merge().Value = $"LAPORAN KEUANGAN  •  {reportDate.ToString("dd MMMM yyyy", System.Globalization.CultureInfo.GetCultureInfo("id-ID"))}";
        finance.Range("A2:G2").Style.Font.FontColor = muted; finance.Range("A2:G2").Style.Font.Bold = true; finance.Row(2).Height = 24;
        finance.Range("A4:C4").Merge().Value = "TOTAL PENDAPATAN LUNAS";
        finance.Range("D4:E4").Merge().Value = "JUMLAH TRANSAKSI";
        finance.Range("F4:G4").Merge().Value = "DICETAK";
        finance.Range("A4:G4").Style.Font.FontSize = 9; finance.Range("A4:G4").Style.Font.Bold = true;
        finance.Range("A4:G4").Style.Font.FontColor = muted; finance.Range("A4:G4").Style.Fill.BackgroundColor = light;
        finance.Range("A5:C5").Merge().Value = payments.Where(x => x.Status == "Paid").Sum(x => x.Amount);
        finance.Range("A5:C5").Style.NumberFormat.Format = "[$Rp-421] #,##0";
        finance.Range("D5:E5").Merge().Value = payments.Count;
        finance.Range("F5:G5").Merge().Value = DateTime.Now.ToString("dd/MM/yyyy HH:mm");
        finance.Range("A5:G5").Style.Font.Bold = true; finance.Range("A5:G5").Style.Font.FontSize = 14;
        finance.Range("A5:G5").Style.Font.FontColor = dark; finance.Range("A5:G5").Style.Fill.BackgroundColor = paleTeal; finance.Row(5).Height = 28;
        var financeHeaders = new[] { "No.", "Waktu", "No. Transaksi", "Nama Pasien", "Metode", "Status", "Jumlah" };
        for (var col = 1; col <= financeHeaders.Length; col++) finance.Cell(7, col).Value = financeHeaders[col - 1];
        var financeHeader = finance.Range(7, 1, 7, 7); financeHeader.Style.Fill.BackgroundColor = teal;
        financeHeader.Style.Font.FontColor = XLColor.White; financeHeader.Style.Font.Bold = true;
        financeHeader.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center; financeHeader.Style.Border.BottomBorder = XLBorderStyleValues.Medium; finance.Row(7).Height = 25;
        for (var index = 0; index < payments.Count; index++)
        {
            var payment = payments[index]; var row = index + 8;
            finance.Cell(row, 1).Value = index + 1; finance.Cell(row, 2).Value = payment.PaidAt; finance.Cell(row, 2).Style.DateFormat.Format = "dd MMM yyyy, HH:mm";
            finance.Cell(row, 3).Value = $"DC-{payment.Id:D6}"; finance.Cell(row, 4).Value = payment.Patient?.FullName ?? "";
            finance.Cell(row, 5).Value = payment.Method; finance.Cell(row, 6).Value = payment.Status == "Paid" ? "Lunas" : payment.Status;
            finance.Cell(row, 7).Value = payment.Amount; finance.Cell(row, 7).Style.NumberFormat.Format = "[$Rp-421] #,##0";
            if (index % 2 == 1) finance.Range(row, 1, row, 7).Style.Fill.BackgroundColor = light;
        }
        var financeEnd = Math.Max(8, payments.Count + 7);
        finance.Range(7, 1, financeEnd, 7).Style.Border.InsideBorder = XLBorderStyleValues.Thin;
        finance.Range(7, 1, financeEnd, 7).Style.Border.InsideBorderColor = border;
        finance.Range(7, 1, financeEnd, 7).Style.Border.BottomBorder = XLBorderStyleValues.Thin;
        finance.Range(7, 1, financeEnd, 7).Style.Border.BottomBorderColor = border;
        finance.Range(7, 1, financeEnd, 7).Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        finance.Range(7, 1, financeEnd, 7).SetAutoFilter(); finance.SheetView.FreezeRows(7);
        finance.PageSetup.PaperSize = XLPaperSize.A4Paper; finance.PageSetup.PageOrientation = XLPageOrientation.Landscape;
        finance.PageSetup.FitToPages(1, 0); finance.PageSetup.SetRowsToRepeatAtTop(1, 7);

        var arrivalsSheet = workbook.Worksheets.Add("Kedatangan Pasien");
        arrivalsSheet.Style.Font.FontName = "Aptos"; arrivalsSheet.Style.Font.FontSize = 10;
        var widths = new[] { 7d, 21d, 14d, 30d, 20d, 25d, 30d, 22d };
        for (var col = 1; col <= widths.Length; col++) arrivalsSheet.Column(col).Width = widths[col - 1];
        arrivalsSheet.Range("A1:H1").Merge().Value = "DENTAL CARE  |  LAPORAN HARIAN";
        arrivalsSheet.Range("A1:H1").Style.Font.Bold = true; arrivalsSheet.Range("A1:H1").Style.Font.FontSize = 18;
        arrivalsSheet.Range("A1:H1").Style.Font.FontColor = XLColor.White; arrivalsSheet.Range("A1:H1").Style.Fill.BackgroundColor = dark;
        arrivalsSheet.Range("A1:H1").Style.Alignment.Vertical = XLAlignmentVerticalValues.Center; arrivalsSheet.Row(1).Height = 36;
        arrivalsSheet.Range("A2:H2").Merge().Value = $"DAFTAR KEDATANGAN PASIEN  •  {reportDate.ToString("dd MMMM yyyy", System.Globalization.CultureInfo.GetCultureInfo("id-ID"))}";
        arrivalsSheet.Range("A2:H2").Style.Font.FontColor = muted; arrivalsSheet.Range("A2:H2").Style.Font.Bold = true; arrivalsSheet.Row(2).Height = 24;
        arrivalsSheet.Range("A4:C4").Merge().Value = "JUMLAH KUNJUNGAN";
        arrivalsSheet.Range("D4:F4").Merge().Value = "SELESAI DIPERIKSA";
        arrivalsSheet.Range("G4:H4").Merge().Value = "TIDAK HADIR";
        arrivalsSheet.Range("A4:H4").Style.Font.FontSize = 9; arrivalsSheet.Range("A4:H4").Style.Font.Bold = true;
        arrivalsSheet.Range("A4:H4").Style.Font.FontColor = muted; arrivalsSheet.Range("A4:H4").Style.Fill.BackgroundColor = light;
        arrivalsSheet.Range("A5:C5").Merge().Value = arrivals.Count;
        arrivalsSheet.Range("D5:F5").Merge().Value = arrivals.Count(x => x.Status == "Completed");
        arrivalsSheet.Range("G5:H5").Merge().Value = arrivals.Count(x => x.Status == "NoShow");
        arrivalsSheet.Range("A5:H5").Style.Font.Bold = true; arrivalsSheet.Range("A5:H5").Style.Font.FontSize = 14;
        arrivalsSheet.Range("A5:H5").Style.Font.FontColor = dark; arrivalsSheet.Range("A5:H5").Style.Fill.BackgroundColor = paleTeal; arrivalsSheet.Row(5).Height = 28;
        var arrivalHeaders = new[] { "No.", "Waktu", "No. Pasien", "Nama Pasien", "Telepon", "Dokter", "Perawatan", "Status" };
        for (var col = 1; col <= arrivalHeaders.Length; col++) arrivalsSheet.Cell(7, col).Value = arrivalHeaders[col - 1];
        var arrivalHeader = arrivalsSheet.Range(7, 1, 7, 8); arrivalHeader.Style.Fill.BackgroundColor = teal;
        arrivalHeader.Style.Font.FontColor = XLColor.White; arrivalHeader.Style.Font.Bold = true;
        arrivalHeader.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center; arrivalHeader.Style.Border.BottomBorder = XLBorderStyleValues.Medium; arrivalsSheet.Row(7).Height = 25;
        var statusLabels = new Dictionary<string, string> { ["Scheduled"] = "Terjadwal", ["InProgress"] = "Sedang diperiksa", ["Completed"] = "Selesai", ["Cancelled"] = "Dibatalkan", ["NoShow"] = "Tidak hadir" };
        for (var index = 0; index < arrivals.Count; index++)
        {
            var appointment = arrivals[index]; var row = index + 8;
            arrivalsSheet.Cell(row, 1).Value = index + 1; arrivalsSheet.Cell(row, 2).Value = appointment.ScheduledAt; arrivalsSheet.Cell(row, 2).Style.DateFormat.Format = "dd MMM yyyy, HH:mm";
            arrivalsSheet.Cell(row, 3).Value = $"PS-{appointment.PatientId:D5}"; arrivalsSheet.Cell(row, 4).Value = appointment.Patient?.FullName ?? "";
            arrivalsSheet.Cell(row, 5).Value = appointment.Patient?.Phone ?? ""; arrivalsSheet.Cell(row, 6).Value = appointment.Doctor?.FullName ?? "Belum dipilih";
            arrivalsSheet.Cell(row, 7).Value = appointment.Treatment?.Name ?? "Belum ditentukan";
            arrivalsSheet.Cell(row, 8).Value = statusLabels.GetValueOrDefault(appointment.Status, appointment.Status);
            if (index % 2 == 1) arrivalsSheet.Range(row, 1, row, 8).Style.Fill.BackgroundColor = light;
        }
        var arrivalsEnd = Math.Max(8, arrivals.Count + 7);
        arrivalsSheet.Range(7, 1, arrivalsEnd, 8).Style.Border.InsideBorder = XLBorderStyleValues.Thin;
        arrivalsSheet.Range(7, 1, arrivalsEnd, 8).Style.Border.InsideBorderColor = border;
        arrivalsSheet.Range(7, 1, arrivalsEnd, 8).Style.Border.BottomBorder = XLBorderStyleValues.Thin;
        arrivalsSheet.Range(7, 1, arrivalsEnd, 8).Style.Border.BottomBorderColor = border;
        arrivalsSheet.Range(7, 1, arrivalsEnd, 8).Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        arrivalsSheet.Range(7, 1, arrivalsEnd, 8).SetAutoFilter(); arrivalsSheet.SheetView.FreezeRows(7);
        arrivalsSheet.PageSetup.PaperSize = XLPaperSize.A4Paper; arrivalsSheet.PageSetup.PageOrientation = XLPageOrientation.Landscape;
        arrivalsSheet.PageSetup.FitToPages(1, 0); arrivalsSheet.PageSetup.SetRowsToRepeatAtTop(1, 7);

        using var stream = new MemoryStream(); workbook.SaveAs(stream);
        return File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"Laporan-Harian-{reportDate:yyyy-MM-dd}.xlsx");
    }

}
