using DentalCare.Persistence.Services.AuthService;
using Microsoft.Extensions.DependencyInjection;

namespace DentalCare.Persistence.IoC;

public static class DependencyContainer
{
    public static void AddIoCService(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
    }
}
