# Dental Care Backend

Layered .NET 8 backend for the Dental Care clinic management application.

## Projects

- `DentalCare.Domain`: clinic, authentication, and API response models.
- `DentalCare.Persistence`: EF Core context, authentication, and database mappings.
- `DentalCare.WebAPI`: ASP.NET Core Web API.

## Database

Use the Dental Care MySQL database:

```text
Server=127.0.0.1;Port=3306;User ID=root;Password=YOUR_PASSWORD;Database=dental_care;SslMode=None;AllowPublicKeyRetrieval=True;
```

Initialize the clinic schema from the workspace root:

```text
database/dental_care.sql
```

## API Modules

- `POST /api/auth/login`
- `GET|POST|PUT /api/clinic/patients`
- `GET|POST|PUT /api/clinic/appointments`
- `GET|POST|PUT /api/clinic/treatments`
- `GET|POST /api/clinic/payments`

## Run

```powershell
$env:ConnectionStrings__DefaultConnection="Server=127.0.0.1;Port=3306;User ID=root;Password=YOUR_PASSWORD;Database=dental_care;SslMode=None;AllowPublicKeyRetrieval=True;"
dotnet run --project DentalCare.WebAPI\DentalCare.WebAPI.csproj --urls http://localhost:5241
```
