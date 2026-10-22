using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace DentalCare.Domain.Production;

public class Patient
{
    public int Id { get; set; }
    [Required, MaxLength(150)] public string FullName { get; set; } = string.Empty;
    [MaxLength(30)] public string? Phone { get; set; }
    [MaxLength(150)] public string? Email { get; set; }
    [MaxLength(300)] public string? Address { get; set; }
    [MaxLength(100)] public string? EmergencyContact { get; set; }
    public DateOnly? BirthDate { get; set; }
    [MaxLength(20)] public string? Gender { get; set; }
    [NotMapped] public string? Allergies { get; set; }
    [JsonIgnore] public ICollection<PatientAllergy> AllergyRecords { get; set; } = new List<PatientAllergy>();
    public string? MedicalNotes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Appointment
{
    public int Id { get; set; }
    public int PatientId { get; set; }
    public int? DoctorId { get; set; }
    public int? TreatmentId { get; set; }
    public DateTime ScheduledAt { get; set; }
    [MaxLength(30)] public string Status { get; set; } = "Scheduled";
    [MaxLength(500)] public string? Notes { get; set; }
    [MaxLength(1000)] public string? Diagnosis { get; set; }
    [MaxLength(1000)] public string? ProcedureNotes { get; set; }
    [MaxLength(1000)] public string? Prescription { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [JsonIgnore] public Patient? Patient { get; set; }
    [JsonIgnore] public DentalTreatment? Treatment { get; set; }
    [JsonIgnore] public Doctor? Doctor { get; set; }
    [JsonPropertyName("patient_name")] public string PatientName { get; set; } = string.Empty;
    [JsonPropertyName("doctor_name")] public string DoctorName { get; set; } = string.Empty;
    [JsonPropertyName("treatment_name")] public string TreatmentName { get; set; } = string.Empty;
    [JsonPropertyName("services")] public ICollection<AppointmentService> Services { get; set; } = new List<AppointmentService>();
}

public class AppointmentService
{
    public int Id { get; set; }
    public int AppointmentId { get; set; }
    public int TreatmentId { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; } = 1;
    [JsonIgnore] public Appointment? Appointment { get; set; }
    [JsonIgnore] public DentalTreatment? Treatment { get; set; }
    [JsonPropertyName("treatment_name")] public string TreatmentName { get; set; } = string.Empty;
}

public class DentalTreatment
{
    public int Id { get; set; }
    [Required, MaxLength(150)] public string Name { get; set; } = string.Empty;
    [MaxLength(500)] public string? Description { get; set; }
    public decimal Price { get; set; }
    public int DurationMinutes { get; set; } = 30;
    public bool IsActive { get; set; } = true;
}

public class DentalPayment
{
    public int Id { get; set; }
    public int PatientId { get; set; }
    public int? AppointmentId { get; set; }
    public decimal Amount { get; set; }
    [MaxLength(30)] public string Method { get; set; } = "Cash";
    [MaxLength(30)] public string Status { get; set; } = "Paid";
    public DateTime PaidAt { get; set; } = DateTime.UtcNow;
    [JsonIgnore] public Patient? Patient { get; set; }
    [JsonPropertyName("patient_name")] public string PatientName { get; set; } = string.Empty;
}

public class Doctor
{
    public int Id { get; set; }
    [Required, MaxLength(150)] public string FullName { get; set; } = string.Empty;
    [MaxLength(100)] public string? Specialty { get; set; }
    [MaxLength(30)] public string? Phone { get; set; }
    [MaxLength(150)] public string? Email { get; set; }
    [MaxLength(50)] public string? LicenseNumber { get; set; }
    [NotMapped] public string? PracticeSchedule { get; set; }
    [JsonIgnore] public ICollection<DoctorPracticeSchedule> PracticeSchedules { get; set; } = new List<DoctorPracticeSchedule>();
    public bool IsActive { get; set; } = true;
}

public class PatientAllergy
{
    public int Id { get; set; }
    public int PatientId { get; set; }
    [Required, MaxLength(500)] public string Allergen { get; set; } = string.Empty;
    [MaxLength(300)] public string? Reaction { get; set; }
    [JsonIgnore] public Patient? Patient { get; set; }
}

public class DoctorPracticeSchedule
{
    public int Id { get; set; }
    public int DoctorId { get; set; }
    public int? DayOfWeek { get; set; }
    public TimeOnly? StartTime { get; set; }
    public TimeOnly? EndTime { get; set; }
    [MaxLength(500)] public string? LegacyText { get; set; }
    public bool IsActive { get; set; } = true;
    [JsonIgnore] public Doctor? Doctor { get; set; }
}

public class FollowUp
{
    public int Id { get; set; }
    public int? AppointmentId { get; set; }
    public int? PatientId { get; set; }
    public int? TreatmentId { get; set; }
    public DateTime? LastTreatmentAt { get; set; }
    public DateTime FollowUpAt { get; set; }
    [MaxLength(30)] public string Status { get; set; } = "Pending";
    [MaxLength(500)] public string? Notes { get; set; }
    [JsonIgnore] public Patient? Patient { get; set; }
    [JsonIgnore] public DentalTreatment? Treatment { get; set; }
    [JsonIgnore] public Appointment? Appointment { get; set; }
    [JsonPropertyName("patient_name")] public string PatientName { get; set; } = string.Empty;
    [JsonPropertyName("treatment_name")] public string TreatmentName { get; set; } = string.Empty;
}

public class SavePatientRequest : Patient { }
public class SaveAppointmentRequest : Appointment { }
public class SaveTreatmentRequest : DentalTreatment { }
public class SavePaymentRequest : DentalPayment { }
public class SaveDoctorRequest : Doctor
{
    public List<SaveDoctorPracticeScheduleRequest> PracticeHours { get; set; } = [];
}
public class SaveFollowUpRequest : FollowUp { }

public sealed class SaveDoctorPracticeScheduleRequest
{
    public int DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
}

public sealed class SaveVisitRecordRequest
{
    public int? DoctorId { get; set; }
    public string? Notes { get; set; }
    public string? Diagnosis { get; set; }
    public string? ProcedureNotes { get; set; }
    public string? Prescription { get; set; }
    public List<int> TreatmentIds { get; set; } = [];
}
