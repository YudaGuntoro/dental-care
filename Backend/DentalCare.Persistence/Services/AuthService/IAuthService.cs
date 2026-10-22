using DentalCare.Domain.Auth;

namespace DentalCare.Persistence.Services.AuthService;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request);
}
