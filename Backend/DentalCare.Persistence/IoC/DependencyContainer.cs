using DentalCare.Persistence.Services.AuthService;
using DentalCare.Persistence.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace DentalCare.Persistence.IoC;

public static class DependencyContainer
{
    public static void AddIoCService(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped(typeof(IRepository<>), typeof(EfRepository<>));
        services.AddScoped<IUnitOfWork, EfUnitOfWork>();
    }
}
