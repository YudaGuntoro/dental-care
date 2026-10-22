using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace DentalCare.Domain.Production;

public enum StockMovementType
{
    IN,
    OUT
}

public class Part
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("part_number")]
    public string PartNumber { get; set; } = string.Empty;

    [JsonPropertyName("part_name")]
    public string PartName { get; set; } = string.Empty;

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.Now;

}

public class WarehouseLocation
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("location_code")]
    public string LocationCode { get; set; } = string.Empty;

    [JsonPropertyName("location_name")]
    public string LocationName { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; } = true;

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.Now;
}

public class Customer
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("customer_name")]
    public string CustomerName { get; set; } = string.Empty;

    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; } = true;

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.Now;
}

public class StockMovement
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("movement_type")]
    public StockMovementType MovementType { get; set; }

    [JsonPropertyName("part_id")]
    public int PartId { get; set; }

    [JsonPropertyName("location_id")]
    public int LocationId { get; set; }

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }

    [JsonPropertyName("customer_id")]
    public int? CustomerId { get; set; }

    [JsonPropertyName("customer_name")]
    public string? CustomerName { get; set; }

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.Now;

    [JsonIgnore]
    public Part? Part { get; set; }

    [NotMapped]
    [JsonPropertyName("location")]
    public string Location { get; set; } = string.Empty;

    [JsonIgnore]
    public WarehouseLocation? LocationRef { get; set; }

    [JsonIgnore]
    public Customer? CustomerRef { get; set; }
}

public class PicCard
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("card_uid")]
    public string CardUid { get; set; } = string.Empty;

    [JsonPropertyName("employee_no")]
    public string EmployeeNo { get; set; } = string.Empty;

    [JsonPropertyName("full_name")]
    public string FullName { get; set; } = string.Empty;

    [JsonPropertyName("department")]
    public string Department { get; set; } = "Production";

    [JsonPropertyName("shift_id")]
    public int ShiftId { get; set; }

    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; } = true;

    [JsonPropertyName("last_scanned_at")]
    public DateTime? LastScannedAt { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    [NotMapped]
    [JsonPropertyName("shift")]
    public string Shift { get; set; } = string.Empty;

    [JsonIgnore]
    public ShiftMaster? ShiftRef { get; set; }
}

public class ShiftMaster
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("shift_code")]
    public string ShiftCode { get; set; } = string.Empty;

    [JsonPropertyName("shift_name")]
    public string ShiftName { get; set; } = string.Empty;

    [JsonPropertyName("sort_order")]
    public int SortOrder { get; set; }

    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; } = true;

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.Now;
}

public class CreatePartRequest
{
    [JsonPropertyName("part_number")]
    public string PartNumber { get; set; } = string.Empty;

    [JsonPropertyName("part_name")]
    public string PartName { get; set; } = string.Empty;

    [JsonPropertyName("timestamp")]
    public DateTime? Timestamp { get; set; }
}

public class CreateLocationRequest
{
    [JsonPropertyName("location_code")]
    public string LocationCode { get; set; } = string.Empty;

    [JsonPropertyName("location_name")]
    public string LocationName { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; } = true;
}

public class CreateCustomerRequest
{
    [JsonPropertyName("customer_name")]
    public string CustomerName { get; set; } = string.Empty;

    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; } = true;
}

public class CreatePicCardRequest
{
    [JsonPropertyName("card_uid")]
    public string CardUid { get; set; } = string.Empty;

    [JsonPropertyName("employee_no")]
    public string EmployeeNo { get; set; } = string.Empty;

    [JsonPropertyName("full_name")]
    public string FullName { get; set; } = string.Empty;

    [JsonPropertyName("department")]
    public string Department { get; set; } = "Warehouse";

    [JsonPropertyName("shift_id")]
    public int ShiftId { get; set; }

    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; } = true;
}

public class CreateStockMovementRequest
{
    [JsonPropertyName("part_number")]
    public string PartNumber { get; set; } = string.Empty;

    [JsonPropertyName("part_name")]
    public string PartName { get; set; } = string.Empty;

    [JsonPropertyName("location")]
    public string Location { get; set; } = string.Empty;

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; } = 1;

    [JsonPropertyName("customer_id")]
    public int? CustomerId { get; set; }

    [JsonPropertyName("customer_name")]
    public string? CustomerName { get; set; }

    [JsonPropertyName("timestamp")]
    public DateTime? Timestamp { get; set; }
}

public class StockMovementResponse
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("movement_type")]
    public StockMovementType MovementType { get; set; }

    [JsonPropertyName("part_id")]
    public int PartId { get; set; }

    [JsonPropertyName("part_number")]
    public string PartNumber { get; set; } = string.Empty;

    [JsonPropertyName("part_name")]
    public string PartName { get; set; } = string.Empty;

    [JsonPropertyName("location_id")]
    public int LocationId { get; set; }

    [JsonPropertyName("location")]
    public string Location { get; set; } = string.Empty;

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }

    [JsonPropertyName("customer_id")]
    public int? CustomerId { get; set; }

    [JsonPropertyName("customer_name")]
    public string? CustomerName { get; set; }

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; }
}

public class ItemCheckResult
{
    [JsonPropertyName("part_name")]
    public string PartName { get; set; } = string.Empty;

    [JsonPropertyName("part_number")]
    public string PartNumber { get; set; } = string.Empty;

    [JsonPropertyName("location")]
    public string Location { get; set; } = string.Empty;

    [JsonPropertyName("stock_in_qty")]
    public int StockInQty { get; set; }

    [JsonPropertyName("stock_out_qty")]
    public int StockOutQty { get; set; }

    [JsonPropertyName("remaining_qty")]
    public int RemainingQty { get; set; }

    [JsonPropertyName("last_timestamp")]
    public DateTime LastTimestamp { get; set; }
}
