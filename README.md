# Dental Care

Dental Care is a clinic management application. The active project remote is `https://github.com/YudaGuntoro/dental-care.git`.

## Clinic modules

- Patient profiles and medical notes
- Appointment scheduling and completion status
- Treatment catalog with prices and durations
- Patient payment records
- Dashboard with today's appointments and payment totals
- Staff sign-in using the existing JWT authentication flow

## Stack

- Frontend: Next.js 16, React 19, TypeScript
- API: ASP.NET Core 8
- Database: MySQL 8

## Local setup

1. Create the clinic database and tables:

   ```powershell
   mysql -u root -p -e "source database/dental_care.sql"
   ```

2. Configure the API connection string. In PowerShell, set it for the current terminal:

   ```powershell
   $env:ConnectionStrings__DefaultConnection="Server=127.0.0.1;Port=3306;User ID=root;Password=YOUR_PASSWORD;Database=dental_care;SslMode=None;AllowPublicKeyRetrieval=True;"
   ```

3. Start the API:

   ```powershell
   dotnet run --project Backend\DentalCare.WebAPI\DentalCare.WebAPI.csproj
   ```

4. In another terminal, start the frontend:

   ```powershell
   Set-Location Frontend
   npm install
   $env:API_PROXY_TARGET="http://localhost:5241"
   npm run dev
   ```

5. Open `http://localhost:3000` and sign in with the demo account created by the SQL script: `admin` / `admin123`. Change the demo password before using this outside a local demo.

## API routes

- `GET|POST /api/clinic/patients`
- `PUT /api/clinic/patients/{id}`
- `GET|POST /api/clinic/appointments`
- `PUT /api/clinic/appointments/{id}/status`
- `GET|POST|PUT /api/clinic/treatments`
- `GET|POST /api/clinic/payments`

The SQL file creates only the clinic and authentication tables; it does not create or modify the source WMS database.
