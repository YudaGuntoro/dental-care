namespace DentalCare.Persistence.Services.AuthService;

public class JwtSettings
{
    public string Issuer { get; set; } = "Dental-Care";
    public string Audience { get; set; } = "Dental-Care.Frontend";
    public string SigningKey { get; set; } = "Dental-Care-Local-Development-Jwt-Signing-Key-2026-Change-Me";
    public int ExpiresHours { get; set; } = 8;
}
