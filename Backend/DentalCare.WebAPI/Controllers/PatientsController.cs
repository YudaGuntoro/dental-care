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
public sealed class PatientsController(IUnitOfWork unitOfWork) : ClinicControllerBase(unitOfWork)
{
    [HttpGet("patients")]
    public async Task<IActionResult> GetPatients([FromQuery] string? search = null)
    {
        IQueryable<Patient> query = Query<Patient>().AsNoTracking().Include(x => x.AllergyRecords);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var value = search.Trim();
            query = query.Where(x => x.FullName.Contains(value) || (x.Phone != null && x.Phone.Contains(value)));
        }
        var patients = await query.OrderBy(x => x.FullName).ToListAsync();
        foreach (var patient in patients) patient.Allergies = string.Join(Environment.NewLine, patient.AllergyRecords.Select(x => x.Allergen));
        return ApiOk(patients);
    }

    [HttpGet("patients/{id:int}/medical-record/export")]
    public async Task<IActionResult> ExportPatientMedicalRecord(int id)
    {
        var patient = await Query<Patient>().AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (patient is null) return ApiNotFound("Data pasien tidak ditemukan.");

        var visits = await Query<Appointment>().AsNoTracking()
            .Include(x => x.Treatment)
            .Where(x => x.PatientId == id && x.Status == "Completed")
            .OrderBy(x => x.ScheduledAt)
            .ThenBy(x => x.Id)
            .ToListAsync();

        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("Rekam Medis");
        sheet.Style.Font.FontName = "Arial";
        sheet.Style.Font.FontSize = 10;
        sheet.Columns("A:D").Width = 22;
        sheet.Column("A").Width = 16;
        sheet.Column("B").Width = 40;
        sheet.Column("C").Width = 28;
        sheet.Column("D").Width = 30;

        sheet.Range("A1:D1").Merge().Value = "DENTAL CARE · KLINIK GIGI";
        sheet.Range("A1:D1").Style.Font.Bold = true;
        sheet.Range("A1:D1").Style.Font.FontSize = 11;
        sheet.Range("A1:D1").Style.Font.FontColor = XLColor.FromHtml("#0F766E");
        sheet.Range("A1:D1").Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        sheet.Range("A2:D2").Merge().Value = "KARTU REKAM MEDIS PASIEN";
        sheet.Range("A2:D2").Style.Font.Bold = true;
        sheet.Range("A2:D2").Style.Font.FontSize = 16;
        sheet.Range("A2:D2").Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        sheet.Range("A3:D3").Merge().Value = $"No. RM: {patient.Id:D5}    ·    Dicetak {DateTime.Now:dd MMMM yyyy}";
        sheet.Range("A3:D3").Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        sheet.Cell("A5").Value = "Nama pasien";
        sheet.Cell("B5").Value = patient.FullName;
        sheet.Cell("C5").Value = "Tanggal lahir";
        sheet.Cell("D5").Value = patient.BirthDate?.ToString("dd/MM/yyyy") ?? "Belum diisi";
        sheet.Cell("A6").Value = "Umur";
        sheet.Cell("B6").Value = patient.BirthDate is { } birthDate ? $"{Math.Max(0, DateTime.Today.Year - birthDate.Year - (DateOnly.FromDateTime(DateTime.Today) < birthDate.AddYears(DateTime.Today.Year - birthDate.Year) ? 1 : 0))} tahun" : "Belum diisi";
        sheet.Cell("C6").Value = "Jenis kelamin";
        sheet.Cell("D6").Value = patient.Gender ?? "Belum diisi";
        sheet.Cell("A7").Value = "No. HP";
        sheet.Cell("B7").Value = patient.Phone ?? "Belum diisi";
        sheet.Cell("C7").Value = "Alergi / catatan medis";
        sheet.Cell("D7").Value = patient.MedicalNotes ?? "Belum ada catatan";
        sheet.Range("A5:D7").Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        sheet.Range("A5:D7").Style.Alignment.WrapText = true;
        foreach (var cell in new[] { "A5", "C5", "A6", "C6", "A7", "C7" })
        {
            sheet.Cell(cell).Style.Font.FontColor = XLColor.FromHtml("#475569");
            sheet.Cell(cell).Style.Font.Bold = true;
        }
        foreach (var cell in new[] { "B5", "D5", "B6", "D6", "B7", "D7" })
            sheet.Cell(cell).Style.Font.Bold = true;

        sheet.Range("A9:D9").Merge().Value = "RIWAYAT PEMERIKSAAN";
        sheet.Range("A9:D9").Style.Font.Bold = true;
        sheet.Range("A9:D9").Style.Font.FontSize = 12;
        sheet.Cell("A10").Value = "TGL.";
        sheet.Cell("B10").Value = "ANAMNESIS";
        sheet.Cell("C10").Value = "DIAGNOSIS";
        sheet.Cell("D10").Value = "TERAPI";
        var header = sheet.Range("A10:D10");
        header.Style.Fill.BackgroundColor = XLColor.FromHtml("#0F766E");
        header.Style.Font.FontColor = XLColor.White;
        header.Style.Font.Bold = true;
        header.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        header.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        header.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        header.Style.Border.InsideBorder = XLBorderStyleValues.Thin;

        var row = 11;
        foreach (var visit in visits)
        {
            sheet.Cell(row, 1).Value = visit.ScheduledAt;
            sheet.Cell(row, 1).Style.DateFormat.Format = "dd/MM/yy";
            sheet.Cell(row, 2).Value = visit.Notes ?? "";
            sheet.Cell(row, 3).Value = "Belum dicatat";
            sheet.Cell(row, 4).Value = visit.Treatment?.Name ?? "";
            sheet.Row(row).Height = 44;
            row++;
        }
        var blankRows = Math.Max(0, 8 - visits.Count);
        for (var i = 0; i < blankRows; i++, row++) sheet.Row(row).Height = 30;
        var history = sheet.Range(10, 1, row - 1, 4);
        history.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        history.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        history.Style.Alignment.WrapText = true;
        history.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        history.Style.Border.OutsideBorderColor = XLColor.FromHtml("#CBD5E1");
        history.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
        history.Style.Border.InsideBorderColor = XLColor.FromHtml("#CBD5E1");

        sheet.PageSetup.PaperSize = XLPaperSize.A4Paper;
        sheet.PageSetup.PageOrientation = XLPageOrientation.Portrait;
        sheet.PageSetup.Margins.Top = 0.35;
        sheet.PageSetup.Margins.Bottom = 0.35;
        sheet.PageSetup.Margins.Left = 0.3;
        sheet.PageSetup.Margins.Right = 0.3;
        sheet.PageSetup.FitToPages(1, 1);
        sheet.PageSetup.CenterHorizontally = true;
        sheet.PageSetup.PrintAreas.Add($"A1:D{row - 1}");
        sheet.Row(1).Height = 20;
        sheet.Row(2).Height = 28;
        sheet.Row(3).Height = 18;
        sheet.Row(10).Height = 22;

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"Rekam-Medis-{patient.Id:D5}.xlsx");
    }

    [HttpGet("patients/{id:int}/medical-record/pdf")]
    public async Task<IActionResult> ExportPatientMedicalRecordPdf(int id)
    {
        var patient = await Query<Patient>().AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (patient is null) return ApiNotFound("Data pasien tidak ditemukan.");

        var visits = await Query<Appointment>().AsNoTracking()
            .Include(x => x.Treatment)
            .Where(x => x.PatientId == id && x.Status == "Completed")
            .OrderBy(x => x.ScheduledAt)
            .ThenBy(x => x.Id)
            .ToListAsync();

        var templatePath = Path.Combine(AppContext.BaseDirectory, "Templates", "medical-record-template.pdf");
        var logoPath = Path.Combine(AppContext.BaseDirectory, "Templates", "dental-care-logo.png");
        if (!System.IO.File.Exists(templatePath) || !System.IO.File.Exists(logoPath))
            return StatusCode(500, new { message = "Template PDF rekam medis tidak ditemukan." });

        using var template = PdfReader.Open(templatePath, PdfDocumentOpenMode.Import);
        using var output = new PdfDocument();
        const int rowsPerPage = 8;
        var pageCount = Math.Max(1, (int)Math.Ceiling(visits.Count / (double)rowsPerPage));
        var today = DateTime.Today;
        var age = patient.BirthDate is { } birthDate
            ? Math.Max(0, today.Year - birthDate.Year - (DateOnly.FromDateTime(today) < birthDate.AddYears(today.Year - birthDate.Year) ? 1 : 0)) + " tahun"
            : "Belum diisi";
        var gender = patient.Gender switch
        {
            "Male" => "Laki-laki",
            "Female" => "Perempuan",
            "Laki-laki" => "Laki-laki",
            "Perempuan" => "Perempuan",
            _ => patient.Gender ?? "Belum diisi"
        };

        for (var pageIndex = 0; pageIndex < pageCount; pageIndex++)
        {
            var page = output.AddPage(template.Pages[0]);
            using var graphics = XGraphics.FromPdfPage(page, XGraphicsPdfPageOptions.Append);
            DrawMedicalRecordPage(graphics, page, logoPath, patient, visits, pageIndex, pageCount, age, gender);
        }

        using var stream = new MemoryStream();
        output.Save(stream, closeStream: false);
        return File(stream.ToArray(), "application/pdf", $"Rekam-Medis-{patient.Id:D5}.pdf");
    }
    [HttpPost("patients")]
    public async Task<IActionResult> CreatePatient(SavePatientRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName)) return ApiBadRequest("Patient name is required.");
        if (!TryParseAllergies(request.Allergies, out var allergies)) return ApiBadRequest("Setiap nama alergi maksimal 500 karakter.");
        var patient = new Patient { FullName = request.FullName.Trim(), Phone = request.Phone?.Trim(), Email = request.Email?.Trim(), Address = request.Address?.Trim(), EmergencyContact = request.EmergencyContact?.Trim(), BirthDate = request.BirthDate, Gender = request.Gender, Allergies = string.Join(Environment.NewLine, allergies), AllergyRecords = allergies.Select(x => new PatientAllergy { Allergen = x }).ToList(), MedicalNotes = request.MedicalNotes?.Trim() };
        Repository<Patient>().Add(patient);
        await SaveChangesAsync();
        return ApiCreated(patient, "Patient added.");
    }

    [HttpPut("patients/{id:int}")]
    public async Task<IActionResult> UpdatePatient(int id, SavePatientRequest request)
    {
        var patient = await Repository<Patient>().FindAsync(id);
        if (patient is null) return ApiNotFound("Patient not found.");
        if (string.IsNullOrWhiteSpace(request.FullName)) return ApiBadRequest("Patient name is required.");
        if (!TryParseAllergies(request.Allergies, out var allergies)) return ApiBadRequest("Setiap nama alergi maksimal 500 karakter.");
        patient.FullName = request.FullName.Trim(); patient.Phone = request.Phone?.Trim(); patient.Email = request.Email?.Trim(); patient.Address = request.Address?.Trim(); patient.EmergencyContact = request.EmergencyContact?.Trim(); patient.BirthDate = request.BirthDate; patient.Gender = request.Gender; patient.MedicalNotes = request.MedicalNotes?.Trim();
        var existingAllergies = await Query<PatientAllergy>().Where(x => x.PatientId == id).ToListAsync();
        Repository<PatientAllergy>().RemoveRange(existingAllergies);
        patient.Allergies = string.Join(Environment.NewLine, allergies);
        patient.AllergyRecords = allergies.Select(x => new PatientAllergy { PatientId = id, Allergen = x }).ToList();
        Repository<PatientAllergy>().AddRange(patient.AllergyRecords);
        await SaveChangesAsync();
        return ApiOk(patient, "Patient updated.");
    }

    [HttpDelete("patients/{id:int}")]
    public async Task<IActionResult> DeletePatient(int id) { var item = await Repository<Patient>().FindAsync(id); if (item is null) return ApiNotFound("Patient not found."); Repository<Patient>().Remove(item); await SaveChangesAsync(); return ApiOk(item, "Patient deleted."); }
    private static bool TryParseAllergies(string? value, out List<string> allergies)
    {
        allergies = (value ?? string.Empty)
            .Split([',', ';', '\n', '\r'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        return allergies.All(x => x.Length <= 500);
    }

    private static void DrawMedicalRecordPage(
        XGraphics graphics,
        PdfPage page,
        string logoPath,
        Patient patient,
        IReadOnlyList<Appointment> visits,
        int pageIndex,
        int pageCount,
        string age,
        string gender)
    {
        var teal = XColor.FromArgb(15, 118, 110);
        var ink = XColor.FromArgb(15, 23, 42);
        var muted = XColor.FromArgb(71, 85, 105);
        var grid = XColor.FromArgb(180, 198, 207);
        var tealBrush = new XSolidBrush(teal);
        var inkBrush = new XSolidBrush(ink);
        var mutedBrush = new XSolidBrush(muted);
        var gridPen = new XPen(grid, 0.55);
        var regular = new XFont("Arial", 8.5, XFontStyleEx.Regular);
        var small = new XFont("Arial", 7, XFontStyleEx.Regular);
        var labelFont = new XFont("Arial", 7, XFontStyleEx.Bold);
        var bold = new XFont("Arial", 9, XFontStyleEx.Bold);
        var titleFont = new XFont("Arial", 16, XFontStyleEx.Bold);
        var brandFont = new XFont("Arial", 8.5, XFontStyleEx.Bold);
        var headerFont = new XFont("Arial", 7.5, XFontStyleEx.Bold);
        var width = page.Width.Point;
        const double left = 44;
        const double contentWidth = 507;

        if (pageIndex == 0)
        {
            using var logo = XImage.FromFile(logoPath);
            graphics.DrawImage(logo, left, 31, 43, 43);
            DrawCentered(graphics, "DENTAL CARE · KLINIK GIGI", brandFont, tealBrush, 112, 23, width - 224, 14);
            DrawCentered(graphics, "KARTU REKAM MEDIS PASIEN", titleFont, tealBrush, 112, 39, width - 224, 23);
            DrawCentered(graphics, $"Dicetak {DateTime.Now.ToString("dd MMMM yyyy", System.Globalization.CultureInfo.GetCultureInfo("id-ID"))}", small, inkBrush, 112, 63, width - 224, 13);
            DrawText(graphics, "NO. RM", labelFont, mutedBrush, new XRect(width - 89, 31, 45, 11), XStringFormats.TopRight);
            DrawText(graphics, patient.Id.ToString("D5"), bold, inkBrush, new XRect(width - 89, 43, 45, 16), XStringFormats.TopRight);
            graphics.DrawLine(new XPen(teal, 1.1), left, 82, width - left, 82);

            var leftFields = new (string Key, string Value)[]
            {
                ("NAMA PASIEN", patient.FullName),
                ("UMUR", age),
                ("JENIS KELAMIN", gender)
            };
            var rightFields = new (string Key, string Value)[]
            {
                ("ALAMAT", string.IsNullOrWhiteSpace(patient.Address) ? "Belum diisi" : patient.Address),
                ("TANGGAL LAHIR", patient.BirthDate?.ToString("dd/MM/yyyy") ?? "Belum diisi"),
                ("NO. HP", patient.Phone ?? "Belum diisi")
            };
            for (var index = 0; index < leftFields.Length; index++)
            {
                var y = 94 + index * 39;
                DrawText(graphics, leftFields[index].Key, labelFont, inkBrush, new XRect(left + 2, y, 220, 10));
                DrawText(graphics, leftFields[index].Value, bold, inkBrush, new XRect(left + 2, y + 12, 220, 15));
                DrawText(graphics, rightFields[index].Key, labelFont, inkBrush, new XRect(301, y, 240, 10));
                DrawText(graphics, rightFields[index].Value, bold, inkBrush, new XRect(301, y + 12, 240, 15));
            }
            graphics.DrawLine(new XPen(XColor.FromArgb(83, 103, 126), 0.65), left, 215, width - left, 215);
            DrawText(graphics, "RIWAYAT PEMERIKSAAN", bold, inkBrush, new XRect(left, 225, 300, 18));
            DrawText(graphics, $"{visits.Count} kunjungan", small, mutedBrush, new XRect(width - 145, 226, 101, 16), XStringFormats.TopRight);
            DrawVisitTable(graphics, visits, 0, left, 245, contentWidth, 53, headerFont, regular, inkBrush, tealBrush, gridPen);
        }
        else
        {
            DrawCentered(graphics, "DENTAL CARE · KLINIK GIGI", brandFont, tealBrush, left, 29, contentWidth, 14);
            DrawCentered(graphics, "KARTU REKAM MEDIS PASIEN · RIWAYAT LANJUTAN", bold, inkBrush, left, 46, contentWidth, 16);
            DrawText(graphics, $"{patient.FullName}  ·  No. RM {patient.Id:D5}", small, mutedBrush, new XRect(left, 66, contentWidth, 13), XStringFormats.Center);
            graphics.DrawLine(new XPen(teal, 1.1), left, 86, width - left, 86);
            DrawText(graphics, "RIWAYAT PEMERIKSAAN", bold, inkBrush, new XRect(left, 98, 300, 18));
            DrawText(graphics, $"Halaman {pageIndex + 1} dari {pageCount}", small, mutedBrush, new XRect(width - 145, 99, 101, 16), XStringFormats.TopRight);
            DrawVisitTable(graphics, visits, pageIndex * 8, left, 118, contentWidth, 76, headerFont, regular, inkBrush, tealBrush, gridPen);
        }

        const double footerY = 724;
        graphics.DrawLine(new XPen(grid, 0.5), left, footerY, width - left, footerY);
        DrawText(graphics, "Dokumen rekam medis Dental Care", small, mutedBrush, new XRect(left, footerY + 6, 300, 12));
        DrawText(graphics, $"Halaman {pageIndex + 1} dari {pageCount}", small, mutedBrush, new XRect(width - 250, footerY + 6, 206, 12), XStringFormats.TopRight);
    }

    private static void DrawVisitTable(
        XGraphics graphics,
        IReadOnlyList<Appointment> visits,
        int firstVisit,
        double x,
        double y,
        double tableWidth,
        double rowHeight,
        XFont headerFont,
        XFont bodyFont,
        XBrush inkBrush,
        XBrush tealBrush,
        XPen gridPen)
    {
        var columns = new[] { 65d, 190d, 125d, tableWidth - 380d };
        var headings = new[] { "TGL.", "ANAMNESIS", "DIAGNOSIS", "TERAPI" };
        const double headerHeight = 22;
        graphics.DrawRectangle(tealBrush, x, y, tableWidth, headerHeight);
        var currentX = x;
        for (var column = 0; column < columns.Length; column++)
        {
            DrawCentered(graphics, headings[column], headerFont, XBrushes.White, currentX, y, columns[column], headerHeight);
            currentX += columns[column];
        }

        var remaining = Math.Max(0, visits.Count - firstVisit);
        var rowCount = firstVisit == 0 ? 8 : Math.Max(1, Math.Min(8, remaining));
        for (var row = 0; row < rowCount; row++)
        {
            var rowY = y + headerHeight + row * rowHeight;
            var rowValues = firstVisit + row < visits.Count
                ? new[]
                {
                    visits[firstVisit + row].ScheduledAt.ToString("dd/MM/yy"),
                    visits[firstVisit + row].Notes ?? string.Empty,
                    visits[firstVisit + row].Diagnosis ?? "Belum dicatat",
                    string.Join("\n", new[] { visits[firstVisit + row].ProcedureNotes, visits[firstVisit + row].Treatment?.Name, visits[firstVisit + row].Prescription }.Where(value => !string.IsNullOrWhiteSpace(value)))
                }
                : new[] { string.Empty, string.Empty, string.Empty, string.Empty };

            currentX = x;
            for (var column = 0; column < columns.Length; column++)
            {
                graphics.DrawRectangle(gridPen, currentX, rowY, columns[column], rowHeight);
                DrawWrappedCentered(graphics, rowValues[column], bodyFont, inkBrush, new XRect(currentX + 4, rowY + 3, columns[column] - 8, rowHeight - 6));
                currentX += columns[column];
            }
        }
    }

    private static void DrawCentered(XGraphics graphics, string text, XFont font, XBrush brush, double x, double y, double width, double height) =>
        DrawText(graphics, text, font, brush, new XRect(x, y, width, height), XStringFormats.Center);

    private static void DrawText(XGraphics graphics, string text, XFont font, XBrush brush, XRect bounds, XStringFormat? format = null) =>
        graphics.DrawString(text, font, brush, bounds, format ?? XStringFormats.TopLeft);

    private static void DrawWrappedCentered(XGraphics graphics, string text, XFont font, XBrush brush, XRect bounds)
    {
        if (string.IsNullOrWhiteSpace(text)) return;
        var lines = new List<string>();
        var current = string.Empty;
        foreach (var word in text.Split(new[] { ' ', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries))
        {
            var candidate = string.IsNullOrEmpty(current) ? word : current + " " + word;
            if (current.Length > 0 && graphics.MeasureString(candidate, font).Width > bounds.Width)
            {
                lines.Add(current);
                current = word;
            }
            else current = candidate;
        }
        if (current.Length > 0) lines.Add(current);
        var lineHeight = font.Size + 3;
        var totalHeight = lines.Count * lineHeight;
        var top = bounds.Y + Math.Max(0, (bounds.Height - totalHeight) / 2);
        for (var index = 0; index < lines.Count; index++)
            graphics.DrawString(lines[index], font, brush, new XRect(bounds.X, top + index * lineHeight, bounds.Width, lineHeight), XStringFormats.Center);
    }
}
