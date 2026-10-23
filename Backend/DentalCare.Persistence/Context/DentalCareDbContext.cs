using DentalCare.Domain.Auth;
using DentalCare.Domain.Production;
using Microsoft.EntityFrameworkCore;

namespace DentalCare.Persistence.Context;

public class DentalCareDbContext : DbContext
{
    public DentalCareDbContext(DbContextOptions<DentalCareDbContext> options) : base(options)
    {
    }

    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<DentalTreatment> DentalTreatments => Set<DentalTreatment>();
    public DbSet<DentalPayment> DentalPayments => Set<DentalPayment>();
    public DbSet<AppointmentService> AppointmentServices => Set<AppointmentService>();
    public DbSet<Doctor> Doctors => Set<Doctor>();
    public DbSet<FollowUp> FollowUps => Set<FollowUp>();
    public DbSet<PatientAllergy> PatientAllergies => Set<PatientAllergy>();
    public DbSet<DoctorPracticeSchedule> DoctorPracticeSchedules => Set<DoctorPracticeSchedule>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Username).HasColumnName("username").HasMaxLength(80).IsRequired();
            entity.Property(x => x.FullName).HasColumnName("full_name").HasMaxLength(150).IsRequired();
            entity.Property(x => x.Email).HasColumnName("email").HasMaxLength(150);
            entity.Property(x => x.Phone).HasColumnName("phone").HasMaxLength(50);
            entity.Property(x => x.Role).HasColumnName("role").HasConversion<string>().HasMaxLength(30);
            entity.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(30);
            entity.Property(x => x.PasswordHash).HasColumnName("password_hash").HasMaxLength(255).IsRequired();
            entity.Property(x => x.PasswordSalt).HasColumnName("password_salt").HasMaxLength(255).IsRequired();
            entity.Property(x => x.LastLoginAt).HasColumnName("last_login_at");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            entity.HasIndex(x => x.Username).IsUnique();
            entity.HasIndex(x => x.Email).IsUnique();
        });

        modelBuilder.Entity<Patient>(entity =>
        {
            entity.ToTable("patients");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.FullName).HasColumnName("full_name").HasMaxLength(150).IsRequired();
            entity.Property(x => x.Phone).HasColumnName("phone").HasMaxLength(30);
            entity.Property(x => x.Email).HasColumnName("email").HasMaxLength(150);
            entity.Property(x => x.Address).HasColumnName("address").HasMaxLength(300);
            entity.Property(x => x.EmergencyContact).HasColumnName("emergency_contact").HasMaxLength(100);
            entity.Property(x => x.BirthDate).HasColumnName("birth_date");
            entity.Property(x => x.Gender).HasColumnName("gender").HasMaxLength(20);
            entity.Ignore(x => x.Allergies);
            entity.Property(x => x.MedicalNotes).HasColumnName("medical_notes").HasColumnType("text");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.HasIndex(x => x.FullName);
            entity.HasIndex(x => x.Phone);
        });

        modelBuilder.Entity<PatientAllergy>(entity =>
        {
            entity.ToTable("patient_allergies");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.PatientId).HasColumnName("patient_id");
            entity.Property(x => x.Allergen).HasColumnName("allergen").HasMaxLength(500).IsRequired();
            entity.Property(x => x.Reaction).HasColumnName("reaction").HasMaxLength(300);
            entity.HasOne(x => x.Patient).WithMany(x => x.AllergyRecords).HasForeignKey(x => x.PatientId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(x => new { x.PatientId, x.Allergen }).IsUnique();
        });

        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.ToTable("appointments");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.PatientId).HasColumnName("patient_id");
            entity.Property(x => x.DoctorId).HasColumnName("doctor_id");
            entity.Property(x => x.TreatmentId).HasColumnName("treatment_id");
            entity.Property(x => x.ScheduledAt).HasColumnName("scheduled_at");
            entity.Property(x => x.Status).HasColumnName("status").HasMaxLength(30).IsRequired();
            entity.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
            entity.Property(x => x.Diagnosis).HasColumnName("diagnosis").HasMaxLength(1000);
            entity.Property(x => x.ProcedureNotes).HasColumnName("procedure_notes").HasMaxLength(1000);
            entity.Property(x => x.Prescription).HasColumnName("prescription").HasMaxLength(1000);
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.HasOne(x => x.Patient).WithMany().HasForeignKey(x => x.PatientId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Treatment).WithMany().HasForeignKey(x => x.TreatmentId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Doctor).WithMany().HasForeignKey(x => x.DoctorId).OnDelete(DeleteBehavior.SetNull);
            entity.Ignore(x => x.PatientName);
            entity.Ignore(x => x.DoctorName);
            entity.Ignore(x => x.TreatmentName);
            entity.HasIndex(x => x.ScheduledAt);
            entity.HasIndex(x => x.Status);
        });

        modelBuilder.Entity<AppointmentService>(entity =>
        {
            entity.ToTable("appointment_services");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.AppointmentId).HasColumnName("appointment_id");
            entity.Property(x => x.TreatmentId).HasColumnName("treatment_id");
            entity.Property(x => x.UnitPrice).HasColumnName("unit_price").HasPrecision(12, 2);
            entity.Property(x => x.Quantity).HasColumnName("quantity");
            entity.HasOne(x => x.Appointment).WithMany(x => x.Services).HasForeignKey(x => x.AppointmentId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Treatment).WithMany().HasForeignKey(x => x.TreatmentId).OnDelete(DeleteBehavior.Restrict);
            entity.Ignore(x => x.TreatmentName);
            entity.HasIndex(x => new { x.AppointmentId, x.TreatmentId }).IsUnique();
        });

        modelBuilder.Entity<DentalTreatment>(entity =>
        {
            entity.ToTable("dental_treatments");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
            entity.Property(x => x.Description).HasColumnName("description").HasMaxLength(500);
            entity.Property(x => x.Price).HasColumnName("price").HasPrecision(12, 2);
            entity.Property(x => x.DurationMinutes).HasColumnName("duration_minutes");
            entity.Property(x => x.IsActive).HasColumnName("is_active");
            entity.HasIndex(x => x.Name).IsUnique();
        });

        modelBuilder.Entity<DentalPayment>(entity =>
        {
            entity.ToTable("dental_payments");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.PatientId).HasColumnName("patient_id");
            entity.Property(x => x.AppointmentId).HasColumnName("appointment_id");
            entity.Property(x => x.Amount).HasColumnName("amount").HasPrecision(12, 2);
            entity.Property(x => x.Method).HasColumnName("method").HasMaxLength(30).IsRequired();
            entity.Property(x => x.Status).HasColumnName("status").HasMaxLength(30).IsRequired();
            entity.Property(x => x.PaidAt).HasColumnName("paid_at");
            entity.HasOne(x => x.Patient).WithMany().HasForeignKey(x => x.PatientId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Appointment>().WithMany().HasForeignKey(x => x.AppointmentId).OnDelete(DeleteBehavior.Restrict);
            entity.Ignore(x => x.PatientName);
            entity.HasIndex(x => x.PaidAt);
        });

        modelBuilder.Entity<Doctor>(entity =>
        {
            entity.ToTable("doctors");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.FullName).HasColumnName("full_name").HasMaxLength(150).IsRequired();
            entity.Property(x => x.Specialty).HasColumnName("specialty").HasMaxLength(100);
            entity.Property(x => x.Phone).HasColumnName("phone").HasMaxLength(30);
            entity.Property(x => x.Email).HasColumnName("email").HasMaxLength(150);
            entity.Property(x => x.LicenseNumber).HasColumnName("license_number").HasMaxLength(50);
            entity.Ignore(x => x.PracticeSchedule);
            entity.Property(x => x.IsActive).HasColumnName("is_active");
            entity.HasIndex(x => x.FullName);
        });

        modelBuilder.Entity<DoctorPracticeSchedule>(entity =>
        {
            entity.ToTable("doctor_practice_schedules");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.DoctorId).HasColumnName("doctor_id");
            entity.Property(x => x.DayOfWeek).HasColumnName("day_of_week");
            entity.Property(x => x.StartTime).HasColumnName("start_time").HasColumnType("time");
            entity.Property(x => x.EndTime).HasColumnName("end_time").HasColumnType("time");
            entity.Property(x => x.LegacyText).HasColumnName("legacy_text").HasMaxLength(500);
            entity.Property(x => x.IsActive).HasColumnName("is_active");
            entity.HasOne(x => x.Doctor).WithMany(x => x.PracticeSchedules).HasForeignKey(x => x.DoctorId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(x => new { x.DoctorId, x.DayOfWeek, x.StartTime }).IsUnique();
        });

        modelBuilder.Entity<FollowUp>(entity =>
        {
            entity.ToTable("follow_ups");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.AppointmentId).HasColumnName("appointment_id");
            entity.Property(x => x.PatientId).HasColumnName("patient_id");
            entity.Property(x => x.TreatmentId).HasColumnName("treatment_id");
            entity.Property(x => x.LastTreatmentAt).HasColumnName("last_treatment_at");
            entity.Property(x => x.FollowUpAt).HasColumnName("follow_up_at");
            entity.Property(x => x.Status).HasColumnName("status").HasMaxLength(30).IsRequired();
            entity.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
            entity.HasOne(x => x.Patient).WithMany().HasForeignKey(x => x.PatientId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Treatment).WithMany().HasForeignKey(x => x.TreatmentId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Appointment).WithMany().HasForeignKey(x => x.AppointmentId).OnDelete(DeleteBehavior.Restrict);
            entity.Ignore(x => x.PatientName);
            entity.Ignore(x => x.TreatmentName);
            entity.HasIndex(x => x.FollowUpAt);
            entity.HasIndex(x => x.Status);
        });

    }
}
