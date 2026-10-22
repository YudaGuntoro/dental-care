using ClosedXML.Excel;
using Microsoft.VisualBasic.FileIO;
using DentalCare.Domain.Production;
using DentalCare.Persistence.Context;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentalCare.WebAPI.Controllers;

[ApiController]
[Route("api/parts")]
public class PartsController : ApiControllerBase
{
    private readonly DentalCareDbContext _db;

    public PartsController(DentalCareDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetParts([FromQuery] int page = 1, [FromQuery] int limit = 10, [FromQuery] string? search = null)
    {
        page = Math.Max(1, page);
        limit = Math.Clamp(limit, 1, 100);

        var query = _db.Parts.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim();
            query = query.Where(x =>
                x.PartNumber.Contains(keyword) ||
                x.PartName.Contains(keyword));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(x => x.Timestamp)
            .ThenBy(x => x.PartNumber)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(x => new Part
            {
                Id = x.Id,
                PartNumber = x.PartNumber,
                PartName = x.PartName,
                Timestamp = x.Timestamp
            })
            .ToListAsync();

        return Ok(new
        {
            success = true,
            message = "Parts retrieved successfully",
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
    public async Task<IActionResult> GetPart(int id)
    {
        var part = await _db.Parts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return part is null ? ApiNotFound("Part was not found.") : ApiOk(part);
    }

    [HttpPost]
    public async Task<IActionResult> CreatePart([FromBody] CreatePartRequest request)
    {
        try
        {
            ValidatePart(request);
            var partNumber = request.PartNumber.Trim();
            if (await _db.Parts.AnyAsync(x => x.PartNumber == partNumber))
            {
                throw new InvalidOperationException("Part number is already used.");
            }

            var part = new Part
            {
                PartNumber = partNumber,
                PartName = request.PartName.Trim(),
                Timestamp = request.Timestamp ?? DateTime.Now
            };

            _db.Parts.Add(part);
            await _db.SaveChangesAsync();
            return ApiCreated(part, "Part created successfully.");
        }
        catch (Exception ex)
        {
            return ApiBadRequest(ex);
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdatePart(int id, [FromBody] CreatePartRequest request)
    {
        try
        {
            ValidatePart(request);
            var part = await _db.Parts.FirstOrDefaultAsync(x => x.Id == id);
            if (part is null)
            {
                return ApiNotFound("Part was not found.");
            }

            var partNumber = request.PartNumber.Trim();
            if (await _db.Parts.AnyAsync(x => x.Id != id && x.PartNumber == partNumber))
            {
                throw new InvalidOperationException("Part number is already used.");
            }

            part.PartNumber = partNumber;
            part.PartName = request.PartName.Trim();
            part.Timestamp = request.Timestamp ?? DateTime.Now;

            await _db.SaveChangesAsync();
            return ApiOk(part, "Part updated successfully.");
        }
        catch (Exception ex)
        {
            return ApiBadRequest(ex);
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeletePart(int id)
    {
        try
        {
            var part = await _db.Parts.FirstOrDefaultAsync(x => x.Id == id);
            if (part is null)
            {
                return ApiNotFound("Part was not found.");
            }

            if (await _db.StockMovements.AnyAsync(x => x.PartId == id))
            {
                throw new InvalidOperationException("Part cannot be deleted because it is already used by stock movements.");
            }

            _db.Parts.Remove(part);
            await _db.SaveChangesAsync();
            return ApiOk(true, "Part deleted successfully.");
        }
        catch (Exception ex)
        {
            return ApiBadRequest(ex);
        }
    }

    [HttpGet("import-template")]
    public IActionResult DownloadImportTemplate()
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("Part Master");
        var navy = XLColor.FromHtml("#184F8F");
        var ink = XLColor.FromHtml("#142B49");
        var muted = XLColor.FromHtml("#64748B");
        var border = XLColor.FromHtml("#DBE5F0");
        sheet.Style.Font.FontName = "Calibri";
        sheet.Style.Font.FontSize = 11;
        sheet.Style.Font.FontColor = ink;
        sheet.ShowGridLines = false;
        sheet.TabColor = navy;
        sheet.Column(1).Width = 30;
        sheet.Column(2).Width = 52;
        sheet.Column(3).Width = 4;
        sheet.Columns(4, 7).Width = 12;
        sheet.Rows(1, 25).Height = 25;
        sheet.Row(1).Height = 34;
        sheet.Cell("A1").Value = "Part Number";
        sheet.Cell("B1").Value = "Part Name";
        var header = sheet.Range("A1:B1");
        header.Style.Fill.BackgroundColor = navy;
        header.Style.Font.FontColor = XLColor.White;
        header.Style.Font.Bold = true;
        header.Style.Font.FontSize = 12;
        header.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        sheet.Range("A2:B5001").Style.NumberFormat.Format = "@";
        for (var row = 2; row <= 25; row++)
        {
            var range = sheet.Range(row, 1, row, 2);
            range.Style.Fill.BackgroundColor = XLColor.FromHtml(row % 2 == 0 ? "#F1F6FC" : "#FFFFFF");
            range.Style.Border.BottomBorder = XLBorderStyleValues.Hair;
            range.Style.Border.BottomBorderColor = border;
            range.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        }
        sheet.Range("A1:B25").Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        sheet.Range("A1:B25").Style.Border.OutsideBorderColor = border;
        sheet.Range("D1:G2").Merge().Value = "WMS-Toho  /  PART MASTER";
        sheet.Range("D1:G2").Style.Fill.BackgroundColor = navy;
        sheet.Range("D1:G2").Style.Font.FontColor = XLColor.White;
        sheet.Range("D1:G2").Style.Font.Bold = true;
        sheet.Range("D1:G2").Style.Font.FontSize = 14;
        sheet.Range("D1:G2").Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        void Note(int row, string title, string text)
        {
            var heading = sheet.Range(row, 4, row, 7).Merge();
            heading.Value = title;
            heading.Style.Font.Bold = true;
            heading.Style.Font.FontColor = navy;
            var body = sheet.Range(row + 1, 4, row + 2, 7).Merge();
            body.Value = text;
            body.Style.Alignment.WrapText = true;
            body.Style.Alignment.Vertical = XLAlignmentVerticalValues.Top;
            body.Style.Font.FontColor = muted;
        }
        Note(4, "01  FILL YOUR DATA", "Start at row 2. One part per row. Keep the two column headers unchanged.");
        Note(8, "02  REQUIRED FIELDS", "Part Number: unique, max 80 characters. Part Name: max 200 characters. Both fields are required.");
        Note(12, "03  LOCATION", "No standard location is required. Enter the location when recording stock in.");
        Note(16, "04  SAVE & IMPORT", "Save as .xlsx, then upload in Master Data > Part > Import. Up to 5,000 parts / 5 MB.");
        Note(20, "NEED AN EXAMPLE?", "See the Example sheet. It is a reference only; only the first worksheet is imported.");
        sheet.SheetView.FreezeRows(1);
        sheet.SheetView.ZoomScale = 90;
        sheet.PageSetup.PageOrientation = XLPageOrientation.Landscape;
        sheet.PageSetup.FitToPages(1, 1);
        sheet.PageSetup.PrintAreas.Add("A1:G25");
        sheet.PageSetup.Header.Left.AddText("WMS-Toho | Part Master Import");
        var example = workbook.Worksheets.Add("Example");
        example.ShowGridLines = false;
        example.TabColor = XLColor.FromHtml("#94A3B8");
        example.Column(1).Width = 30;
        example.Column(2).Width = 52;
        example.Range("A1:B1").Merge().Value = "REFERENCE ONLY - enter your data on the Part Master sheet";
        example.Range("A1:B1").Style.Font.Bold = true;
        example.Range("A1:B1").Style.Font.FontColor = navy;
        example.Row(1).Height = 30;
        example.Cell("A3").Value = "Part Number";
        example.Cell("B3").Value = "Part Name";
        example.Range("A3:B3").Style.Fill.BackgroundColor = navy;
        example.Range("A3:B3").Style.Font.FontColor = XLColor.White;
        example.Range("A3:B3").Style.Font.Bold = true;
        example.Cell("A4").Value = "PRT-0001";
        example.Cell("B4").Value = "Aluminium Frame 1200mm";
        example.Cell("A5").Value = "00001234";
        example.Cell("B5").Value = "Corner Bracket Set";
        example.Cell("A7").Value = "Keep leading zeros in part numbers.";
        example.Columns().Style.Font.FontName = "Calibri";
        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Part-Master-Template.xlsx");
    }

    [HttpPost("import")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> ImportParts(IFormFile file)
    {
        try
        {
            if (file.Length == 0 || file.Length > 5 * 1024 * 1024)
                throw new ArgumentException("Select a non-empty Excel or CSV file up to 5 MB.");

            var rows = new List<(int Number, string[] Values)>();
            using var stream = file.OpenReadStream();
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (extension == ".xlsx")
            {
                using var workbook = new XLWorkbook(stream);
                var sheet = workbook.Worksheets.First();
                var lastRow = sheet.LastRowUsed()?.RowNumber() ?? 0;
                if (lastRow > 5001) throw new ArgumentException("Import up to 5,000 parts at a time.");
                for (var row = 1; row <= lastRow; row++)
                    rows.Add((row, new[] { sheet.Cell(row, 1).GetFormattedString(), sheet.Cell(row, 2).GetFormattedString() }));
            }
            else if (extension == ".csv")
            {
                // Detect the delimiter from the header, so punctuation in part names stays intact.
                using var reader = new StreamReader(stream);
                var csv = await reader.ReadToEndAsync();
                var header = csv.Split('\n', 2)[0];
                using var parser = new TextFieldParser(new StringReader(csv));
                parser.SetDelimiters(header.Contains(';') && !header.Contains(',') ? ";" : ",");
                parser.HasFieldsEnclosedInQuotes = true;
                while (!parser.EndOfData)
                {
                    var rowNumber = (int)parser.LineNumber;
                    rows.Add((rowNumber, parser.ReadFields() ?? Array.Empty<string>()));
                    if (rows.Count > 5001) throw new ArgumentException("Import up to 5,000 parts at a time.");
                }
            }
            else throw new ArgumentException("Only .xlsx and .csv files are supported.");

            static string Header(string value) => new(value.ToLowerInvariant().Where(char.IsLetterOrDigit).ToArray());
            if (rows.Count == 0 || rows[0].Values.Length < 2 ||
                !(new[] { "lotnumber", "partnumber", "partlotnumber" }).Contains(Header(rows[0].Values[0])) ||
                Header(rows[0].Values[1]) != "partname")
                throw new ArgumentException("Use the template: first column Part Number, second column Part Name.");

            var parts = new List<Part>();
            var numbers = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var row in rows.Skip(1))
            {
                if (row.Values.All(string.IsNullOrWhiteSpace)) continue;
                var request = new CreatePartRequest
                {
                    PartNumber = row.Values.ElementAtOrDefault(0)?.Trim() ?? "",
                    PartName = row.Values.ElementAtOrDefault(1)?.Trim() ?? ""
                };
                try { ValidatePart(request); }
                catch (ArgumentException ex) { throw new ArgumentException($"Row {row.Number}: {ex.Message}"); }
                if (!numbers.Add(request.PartNumber))
                    throw new ArgumentException($"Row {row.Number}: duplicate part number '{request.PartNumber}' in the file.");
                parts.Add(new Part { PartNumber = request.PartNumber, PartName = request.PartName, Timestamp = DateTime.Now });
            }
            if (parts.Count == 0) throw new ArgumentException("The file contains no parts to import.");

            var requestedNumbers = parts.Select(x => x.PartNumber).ToList();
            var existing = await _db.Parts.Where(x => requestedNumbers.Contains(x.PartNumber)).Select(x => x.PartNumber).ToListAsync();
            if (existing.Count > 0)
                throw new ArgumentException($"Part numbers already registered: {string.Join(", ", existing.Take(10))}. No parts were imported.");

            _db.Parts.AddRange(parts);
            await _db.SaveChangesAsync();
            return ApiOk(new { imported = parts.Count }, $"{parts.Count} parts imported successfully.");
        }
        catch (Exception ex) { return ApiBadRequest(ex); }
    }

    private static void ValidatePart(CreatePartRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.PartNumber) ||
            string.IsNullOrWhiteSpace(request.PartName))
        {
            throw new ArgumentException("Part Number and Part Name are required.");
        }
        if (request.PartNumber.Trim().Length > 80 || request.PartName.Trim().Length > 200)
            throw new ArgumentException("Part Number must be at most 80 characters and Part Name at most 200 characters.");
    }

}
