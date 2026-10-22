using DentalCare.Domain.Production;
using DentalCare.Persistence.Context;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentalCare.WebAPI.Controllers;

[ApiController]
[Route("api/stock-movements")]
public class StockMovementsController : ApiControllerBase
{
    private readonly DentalCareDbContext _db;

    public StockMovementsController(DentalCareDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetMovements(
        [FromQuery] StockMovementType? type,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10,
        [FromQuery] string? search = null,
        [FromQuery] DateTime? date = null)
    {
        page = Math.Max(1, page);
        limit = Math.Clamp(limit, 1, 100);

        IQueryable<StockMovement> query = _db.StockMovements.AsNoTracking().Include(x => x.CustomerRef);
        if (type.HasValue)
        {
            query = query.Where(x => x.MovementType == type.Value);
        }

        if (date.HasValue)
        {
            var startDate = date.Value.Date;
            var endDate = startDate.AddDays(1);
            query = query.Where(x => x.Timestamp >= startDate && x.Timestamp < endDate);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim();
            query = query.Where(x =>
                x.Part!.PartNumber.Contains(keyword) ||
                x.Part.PartName.Contains(keyword) ||
                x.LocationRef!.LocationCode.Contains(keyword) ||
                x.LocationRef.LocationName.Contains(keyword));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(x => x.Timestamp)
            .ThenByDescending(x => x.Id)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(x => new StockMovementResponse
            {
                Id = x.Id,
                MovementType = x.MovementType,
                PartId = x.PartId,
                PartNumber = x.Part!.PartNumber,
                PartName = x.Part.PartName,
                LocationId = x.LocationId,
                Location = x.LocationRef!.LocationCode,
                Quantity = x.Quantity,
                CustomerId = x.CustomerId,
                CustomerName = x.CustomerRef != null ? x.CustomerRef.CustomerName : x.CustomerName,
                Timestamp = x.Timestamp
            })
            .ToListAsync();

        return Ok(new
        {
            success = true,
            message = "Stock movements retrieved successfully",
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

    [HttpGet("item-check")]
    public async Task<IActionResult> ItemCheck(
        [FromQuery] string? partName,
        [FromQuery] string? partNumber,
        [FromQuery] string? location)
    {
        if (string.IsNullOrWhiteSpace(partName) &&
            string.IsNullOrWhiteSpace(partNumber) &&
            string.IsNullOrWhiteSpace(location))
        {
            return ApiOk(Array.Empty<ItemCheckResult>(), "Enter Part Name or scan QR to check stock.");
        }

        var query = _db.StockMovements.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(partName))
        {
            var keyword = partName.Trim();
            query = query.Where(x => x.Part!.PartName.Contains(keyword));
        }

        if (!string.IsNullOrWhiteSpace(partNumber))
        {
            var keyword = partNumber.Trim();
            query = query.Where(x => x.Part!.PartNumber == keyword);
        }

        if (!string.IsNullOrWhiteSpace(location))
        {
            var keyword = location.Trim();
            query = query.Where(x => x.LocationRef!.LocationCode == keyword);
        }

        var rows = await query
            .GroupBy(x => new { x.Part!.PartName, x.Part.PartNumber, x.LocationRef!.LocationCode })
            .Select(group => new ItemCheckResult
            {
                PartName = group.Key.PartName,
                PartNumber = group.Key.PartNumber,
                Location = group.Key.LocationCode,
                StockInQty = group.Where(x => x.MovementType == StockMovementType.IN).Sum(x => x.Quantity),
                StockOutQty = group.Where(x => x.MovementType == StockMovementType.OUT).Sum(x => x.Quantity),
                RemainingQty = group.Sum(x => x.MovementType == StockMovementType.IN ? x.Quantity : -x.Quantity),
                LastTimestamp = group.Max(x => x.Timestamp)
            })
            .Where(x => x.RemainingQty != 0)
            .OrderBy(x => x.PartName)
            .ThenBy(x => x.PartNumber)
            .ThenBy(x => x.Location)
            .ToListAsync();

        return ApiOk(rows, "Item stock retrieved successfully.");
    }

    [HttpGet("stock-opname/export")]
    public async Task<IActionResult> ExportStockOpname([FromQuery] string? partName = null)
    {
        var rows = await GetStockOpnameRows(partName);
        var generatedAt = DateTime.Now;

        using var workbook = new XLWorkbook();
        workbook.Properties.Author = "Dental Care";
        workbook.Properties.Title = "Stock Opname";
        workbook.Properties.Subject = "Warehouse stock opname export";
        workbook.Properties.Created = generatedAt;

        var worksheet = workbook.Worksheets.Add("Stock Opname");
        BuildStockOpnameSheet(worksheet, rows, generatedAt, partName);

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);

        var fileName = $"Stock-Opname-{generatedAt:yyyyMMdd-HHmm}.xlsx";
        return File(
            stream.ToArray(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            fileName
        );
    }

    [HttpPost("in")]
    public Task<IActionResult> CreateStockIn([FromBody] CreateStockMovementRequest request) =>
        CreateMovement(StockMovementType.IN, request);

    [HttpPost("out")]
    public Task<IActionResult> CreateStockOut([FromBody] CreateStockMovementRequest request) =>
        CreateMovement(StockMovementType.OUT, request);

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteMovement(int id)
    {
        var movement = await _db.StockMovements
            .Include(x => x.Part)
            .Include(x => x.LocationRef)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (movement is null)
        {
            return ApiNotFound("Stock movement was not found.");
        }

        if (movement.MovementType == StockMovementType.IN)
        {
            var hasStockOut = await _db.StockMovements.AnyAsync(x =>
                x.MovementType == StockMovementType.OUT &&
                x.PartId == movement.PartId &&
                x.LocationId == movement.LocationId);

            if (hasStockOut)
            {
                var partNumber = movement.Part?.PartNumber ?? "this part";
                var location = movement.LocationRef?.LocationCode ?? "this location";
                return ApiBadRequest($"Cannot delete stock in for {partNumber} at {location} because stock out already exists. Delete the related stock out records first.");
            }
        }

        _db.StockMovements.Remove(movement);
        await _db.SaveChangesAsync();
        return ApiOk(true, "Stock movement deleted successfully.");
    }

    private async Task<IActionResult> CreateMovement(StockMovementType type, CreateStockMovementRequest request)
    {
        try
        {
            ValidateMovement(request);
            var timestamp = request.Timestamp ?? DateTime.Now;
            var location = await ResolveLocation(request.Location);
            var part = await ResolvePart(type, request, timestamp);
            var customer = await ResolveCustomer(request);

            var movement = new StockMovement
            {
                MovementType = type,
                PartId = part.Id,
                LocationId = location.Id,
                Quantity = request.Quantity,
                CustomerId = customer?.Id,
                CustomerName = null,
                Timestamp = timestamp
            };

            _db.StockMovements.Add(movement);
            await _db.SaveChangesAsync();
            movement.LocationRef = location;
            movement.CustomerRef = customer;
            return ApiCreated(ToResponse(movement, part), type == StockMovementType.IN ? "Stock in recorded successfully." : "Stock out recorded successfully.");
        }
        catch (Exception ex)
        {
            return ApiBadRequest(ex);
        }
    }

    private async Task<List<StockOpnameExportRow>> GetStockOpnameRows(string? partName)
    {
        var query = _db.StockMovements.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(partName))
        {
            var keyword = partName.Trim();
            query = query.Where(x =>
                x.Part!.PartName.Contains(keyword) ||
                x.Part.PartNumber.Contains(keyword));
        }

        return await query
            .GroupBy(x => new { x.Part!.PartNumber, x.Part.PartName, x.LocationRef!.LocationCode })
            .Select(group => new StockOpnameExportRow
            {
                PartNumber = group.Key.PartNumber,
                PartName = group.Key.PartName,
                Location = group.Key.LocationCode,
                StockInQty = group.Where(x => x.MovementType == StockMovementType.IN).Sum(x => x.Quantity),
                StockOutQty = group.Where(x => x.MovementType == StockMovementType.OUT).Sum(x => x.Quantity),
                SystemQty = group.Sum(x => x.MovementType == StockMovementType.IN ? x.Quantity : -x.Quantity),
                LastMovementAt = group.Max(x => x.Timestamp)
            })
            .Where(x => x.SystemQty != 0)
            .OrderBy(x => x.Location)
            .ThenBy(x => x.PartName)
            .ThenBy(x => x.PartNumber)
            .ToListAsync();
    }

    private static void BuildStockOpnameSheet(
        IXLWorksheet worksheet,
        IReadOnlyList<StockOpnameExportRow> rows,
        DateTime generatedAt,
        string? partName
    )
    {
        var ink = XLColor.FromHtml("#111827");
        var steel = XLColor.FromHtml("#1F4E79");
        var steelDark = XLColor.FromHtml("#17365D");
        var excelGreen = XLColor.FromHtml("#107C41");
        var softGreen = XLColor.FromHtml("#E7F4ED");
        var softBlue = XLColor.FromHtml("#EAF2F8");
        var softGray = XLColor.FromHtml("#F8FAFC");
        var slate = XLColor.FromHtml("#64748B");
        var border = XLColor.FromHtml("#D7DEE8");
        var caution = XLColor.FromHtml("#FFF7ED");

        worksheet.Style.Font.FontName = "Aptos";
        worksheet.Style.Font.FontSize = 10;
        worksheet.ShowGridLines = false;

        worksheet.Range("A1:K3").Merge();
        worksheet.Range("A1:K3").Style.Fill.BackgroundColor = steelDark;
        worksheet.Range("A1:K3").Style.Font.FontColor = XLColor.White;
        worksheet.Range("A1:K3").Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        worksheet.Cell("A1").Value = "STOCK OPNAME CONTROL SHEET";
        worksheet.Cell("A1").Style.Font.Bold = true;
        worksheet.Cell("A1").Style.Font.FontSize = 22;
        worksheet.Cell("A1").Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        worksheet.Range("A4:K4").Merge();
        worksheet.Cell("A4").Value = "Dental Care | Warehouse Operation";
        worksheet.Cell("A4").Style.Font.FontColor = slate;
        worksheet.Cell("A4").Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        worksheet.Cell("A4").Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

        worksheet.Range("A6:B6").Merge().Value = "Generated At";
        worksheet.Range("C6:E6").Merge().Value = generatedAt;
        worksheet.Cell("C6").Style.DateFormat.Format = "dd mmm yyyy, hh:mm";
        worksheet.Range("A7:B7").Merge().Value = "Filter";
        worksheet.Range("C7:E7").Merge().Value = string.IsNullOrWhiteSpace(partName) ? "All Parts" : partName.Trim();
        worksheet.Range("A6:B7").Style.Font.Bold = true;
        worksheet.Range("A6:B7").Style.Font.FontColor = steelDark;
        worksheet.Range("A6:E7").Style.Fill.BackgroundColor = softGray;
        worksheet.Range("A6:E7").Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        worksheet.Range("A6:E7").Style.Border.InsideBorder = XLBorderStyleValues.Thin;
        worksheet.Range("A6:E7").Style.Border.OutsideBorderColor = border;
        worksheet.Range("A6:E7").Style.Border.InsideBorderColor = border;
        worksheet.Range("C6:E7").Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;

        worksheet.Range("G6:H7").Merge().Value = "TOTAL SKU";
        worksheet.Range("I6:I7").Merge().Value = rows.Count;
        worksheet.Range("J6:J7").Merge().Value = "SYSTEM QTY";
        worksheet.Range("K6:K7").Merge().Value = rows.Sum(x => x.SystemQty);
        worksheet.Range("G6:K7").Style.Fill.BackgroundColor = softBlue;
        worksheet.Range("G6:K7").Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        worksheet.Range("G6:K7").Style.Border.InsideBorder = XLBorderStyleValues.Thin;
        worksheet.Range("G6:K7").Style.Border.OutsideBorderColor = border;
        worksheet.Range("G6:K7").Style.Border.InsideBorderColor = border;
        worksheet.Range("G6:H7").Style.Font.FontColor = steelDark;
        worksheet.Range("G6:H7").Style.Font.Bold = true;
        worksheet.Range("G6:H7").Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        worksheet.Range("J6:J7").Style.Font.FontColor = steelDark;
        worksheet.Range("J6:J7").Style.Font.Bold = true;
        worksheet.Range("J6:J7").Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        worksheet.Range("I6:I7").Style.Font.Bold = true;
        worksheet.Range("I6:I7").Style.Font.FontSize = 16;
        worksheet.Range("I6:I7").Style.Font.FontColor = ink;
        worksheet.Range("I6:I7").Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        worksheet.Range("K6:K7").Style.Font.Bold = true;
        worksheet.Range("K6:K7").Style.Font.FontSize = 16;
        worksheet.Range("K6:K7").Style.Font.FontColor = ink;
        worksheet.Range("K6:K7").Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        worksheet.Range("G6:K7").Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

        worksheet.Range("A9:K9").Merge();
        worksheet.Cell("A9").Value = "Fill Actual Qty during physical count. Difference is calculated automatically.";
        worksheet.Cell("A9").Style.Fill.BackgroundColor = caution;
        worksheet.Cell("A9").Style.Font.FontColor = XLColor.FromHtml("#9A3412");
        worksheet.Cell("A9").Style.Font.Bold = true;
        worksheet.Cell("A9").Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        worksheet.Cell("A9").Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        worksheet.Cell("A9").Style.Border.OutsideBorderColor = XLColor.FromHtml("#FED7AA");

        var headerRow = 11;
        var headers = new[]
        {
            "No",
            "Part Number",
            "Part Name",
            "Location",
            "Stock In",
            "Stock Out",
            "System Qty",
            "Actual Qty",
            "Difference",
            "Remarks",
            "Last Movement"
        };

        for (var index = 0; index < headers.Length; index++)
        {
            worksheet.Cell(headerRow, index + 1).Value = headers[index];
        }

        var headerRange = worksheet.Range(headerRow, 1, headerRow, headers.Length);
        headerRange.Style.Fill.BackgroundColor = steel;
        headerRange.Style.Font.FontColor = XLColor.White;
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        headerRange.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        headerRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        headerRange.Style.Border.OutsideBorderColor = steelDark;

        for (var index = 0; index < rows.Count; index++)
        {
            var rowNumber = headerRow + index + 1;
            var row = rows[index];
            worksheet.Cell(rowNumber, 1).Value = index + 1;
            worksheet.Cell(rowNumber, 2).Value = row.PartNumber;
            worksheet.Cell(rowNumber, 3).Value = row.PartName;
            worksheet.Cell(rowNumber, 4).Value = row.Location;
            worksheet.Cell(rowNumber, 5).Value = row.StockInQty;
            worksheet.Cell(rowNumber, 6).Value = row.StockOutQty;
            worksheet.Cell(rowNumber, 7).Value = row.SystemQty;
            worksheet.Cell(rowNumber, 8).Value = string.Empty;
            worksheet.Cell(rowNumber, 9).FormulaA1 = $"=H{rowNumber}-G{rowNumber}";
            worksheet.Cell(rowNumber, 10).Value = string.Empty;
            worksheet.Cell(rowNumber, 11).Value = row.LastMovementAt;
            worksheet.Cell(rowNumber, 11).Style.DateFormat.Format = "dd mmm yyyy, hh:mm";
        }

        var lastRow = Math.Max(headerRow + rows.Count, headerRow + 1);
        var tableRange = worksheet.Range(headerRow, 1, lastRow, headers.Length);
        var table = tableRange.CreateTable("StockOpnameTable");
        table.Theme = XLTableTheme.TableStyleMedium4;
        table.ShowAutoFilter = true;

        var bodyRange = worksheet.Range(headerRow + 1, 1, lastRow, headers.Length);
        bodyRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        bodyRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
        bodyRange.Style.Border.OutsideBorderColor = border;
        bodyRange.Style.Border.InsideBorderColor = border;
        bodyRange.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        bodyRange.Style.Font.FontColor = ink;
        worksheet.Range(headerRow + 1, 5, lastRow, 9).Style.NumberFormat.Format = "#,##0";
        worksheet.Range(headerRow + 1, 1, lastRow, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        worksheet.Range(headerRow + 1, 5, lastRow, 9).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
        worksheet.Range(headerRow + 1, 8, lastRow, 8).Style.Fill.BackgroundColor = softGreen;
        worksheet.Range(headerRow + 1, 8, lastRow, 8).Style.Font.FontColor = excelGreen;
        worksheet.Range(headerRow + 1, 8, lastRow, 8).Style.Font.Bold = true;
        worksheet.Range(headerRow + 1, 10, lastRow, 10).Style.Fill.BackgroundColor = softGray;

        var diffRange = worksheet.Range(headerRow + 1, 9, lastRow, 9);
        diffRange.AddConditionalFormat().WhenGreaterThan(0).Fill.SetBackgroundColor(XLColor.FromHtml("#DCFCE7"));
        diffRange.AddConditionalFormat().WhenGreaterThan(0).Font.SetFontColor(XLColor.FromHtml("#166534"));
        diffRange.AddConditionalFormat().WhenLessThan(0).Fill.SetBackgroundColor(XLColor.FromHtml("#FEE2E2"));
        diffRange.AddConditionalFormat().WhenLessThan(0).Font.SetFontColor(XLColor.FromHtml("#991B1B"));
        diffRange.AddConditionalFormat().WhenEquals(0).Fill.SetBackgroundColor(XLColor.FromHtml("#F1F5F9"));
        diffRange.AddConditionalFormat().WhenEquals(0).Font.SetFontColor(slate);

        worksheet.SheetView.FreezeRows(headerRow);
        worksheet.SheetView.ZoomScale = 90;
        worksheet.Columns().AdjustToContents();
        worksheet.Column(1).Width = 6;
        worksheet.Column(2).Width = 24;
        worksheet.Column(3).Width = 38;
        worksheet.Column(4).Width = 18;
        worksheet.Column(8).Width = 14;
        worksheet.Column(10).Width = 32;
        worksheet.Column(11).Width = 20;
        worksheet.Row(1).Height = 42;
        worksheet.Row(4).Height = 22;
        worksheet.Row(9).Height = 24;
        worksheet.Row(headerRow).Height = 26;
        worksheet.Rows(headerRow + 1, lastRow).Height = 22;

        worksheet.PageSetup.PageOrientation = XLPageOrientation.Landscape;
        worksheet.PageSetup.PaperSize = XLPaperSize.A4Paper;
        worksheet.PageSetup.Margins.Top = 0.35;
        worksheet.PageSetup.Margins.Bottom = 0.35;
        worksheet.PageSetup.Margins.Left = 0.25;
        worksheet.PageSetup.Margins.Right = 0.25;
        worksheet.PageSetup.FitToPages(1, 0);
        worksheet.PageSetup.CenterHorizontally = true;
        worksheet.PageSetup.Header.Center.AddText("Dental Care Stock Opname");
        worksheet.PageSetup.Footer.Right.AddText("Page &P of &N");
    }

    private async Task<Part> ResolvePart(StockMovementType type, CreateStockMovementRequest request, DateTime timestamp)
    {
        var partNumber = request.PartNumber.Trim();
        var part = await _db.Parts.FirstOrDefaultAsync(x => x.PartNumber == partNumber);
        if (part is null)
        {
            if (type != StockMovementType.IN)
            {
                throw new InvalidOperationException("Part must be registered before stock out.");
            }

            part = new Part
            {
                PartNumber = partNumber,
                PartName = request.PartName.Trim(),
                Timestamp = timestamp
            };
            _db.Parts.Add(part);
            await _db.SaveChangesAsync();
            return part;
        }

        if (type == StockMovementType.IN)
        {
            part.PartName = request.PartName.Trim();
            part.Timestamp = timestamp;
        }

        return part;
    }

    private async Task<WarehouseLocation> ResolveLocation(string locationCode)
    {
        var code = locationCode.Trim();
        var location = await _db.Locations.FirstOrDefaultAsync(x => x.LocationCode == code);
        if (location is not null)
        {
            return location;
        }

        location = new WarehouseLocation
        {
            LocationCode = code,
            LocationName = code,
            IsActive = true,
            CreatedAt = DateTime.Now
        };
        _db.Locations.Add(location);
        await _db.SaveChangesAsync();
        return location;
    }

    private static StockMovementResponse ToResponse(StockMovement movement, Part part)
    {
        return new StockMovementResponse
        {
            Id = movement.Id,
            MovementType = movement.MovementType,
            PartId = movement.PartId,
            PartNumber = part.PartNumber,
            PartName = part.PartName,
            LocationId = movement.LocationId,
            Location = movement.LocationRef?.LocationCode ?? string.Empty,
            Quantity = movement.Quantity,
            CustomerId = movement.CustomerId,
            CustomerName = movement.CustomerRef?.CustomerName ?? movement.CustomerName,
            Timestamp = movement.Timestamp
        };
    }

    private async Task<Customer?> ResolveCustomer(CreateStockMovementRequest request)
    {
        if (request.CustomerId is null && string.IsNullOrWhiteSpace(request.CustomerName))
        {
            return null;
        }

        if (request.CustomerId is not null)
        {
            var selected = await _db.Customers.FirstOrDefaultAsync(x => x.Id == request.CustomerId && x.IsActive);
            if (selected is null)
            {
                throw new ArgumentException("Selected customer is not available.");
            }

            return selected;
        }

        var name = request.CustomerName!.Trim();
        var customer = await _db.Customers.FirstOrDefaultAsync(x => x.CustomerName == name);
        if (customer is not null)
        {
            if (!customer.IsActive) throw new ArgumentException("Selected customer is inactive.");
            return customer;
        }

        customer = new Customer { CustomerName = name, IsActive = true, CreatedAt = DateTime.Now };
        _db.Customers.Add(customer);
        await _db.SaveChangesAsync();
        return customer;
    }

    private static void ValidateMovement(CreateStockMovementRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.PartNumber) ||
            string.IsNullOrWhiteSpace(request.PartName) ||
            string.IsNullOrWhiteSpace(request.Location))
        {
            throw new ArgumentException("Part Number, Part Name, and Location are required.");
        }

        if (request.Quantity <= 0)
        {
            throw new ArgumentException("Quantity must be greater than zero.");
        }
    }

    private sealed class StockOpnameExportRow
    {
        public string PartNumber { get; set; } = string.Empty;
        public string PartName { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public int StockInQty { get; set; }
        public int StockOutQty { get; set; }
        public int SystemQty { get; set; }
        public DateTime LastMovementAt { get; set; }
    }
}
