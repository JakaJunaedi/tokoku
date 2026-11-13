# Tokoku

Aplikasi backend sederhana yang dibuat dengan ASP.NET Core dan PostgreSQL.

## Struktur project

```text
Tokoku/
├── README.md
├── Tokoku.slnx
├── ServiceTokoku/
│   ├── appsettings.json
│   ├── appsettings.example.json
│   ├── Program.cs
│   ├── ServiceTokoku.csproj
│   └── ...
├── Database.Tokoku/
│   ├── Database.Tokoku.csproj
│   └── TokokuDbContext.cs
├── Model.Tokoku/
│   ├── Model.Tokoku.csproj
│   └── Product.cs
├── Migration.Tokoku/
│   └── (untuk file migrasi EF Core)
├── FrontendTokoku/
│   └── (frontend Angular)
└── .gitignore
```

## Tujuan struktur

- `ServiceTokoku`: aplikasi API utama
- `Database.Tokoku`: EF Core / PostgreSQL context
- `Model.Tokoku`: model/domain entity
- `Migration.Tokoku`: folder khusus migrasi
- `FrontendTokoku`: frontend Angular

## Konfigurasi PostgreSQL

Salin file konfigurasi contoh ke `appsettings.json` lalu sesuaikan nilai koneksi:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=tokoku_db;Username=postgres;Password=postgres;Trust Server Certificate=true"
  }
}
```

## Menjalankan aplikasi

```bash
dotnet restore
dotnet build
dotnet run --project ServiceTokoku/ServiceTokoku.csproj
```

## Endpoint utama

- `GET /health`
- `GET /api/products`
- `POST /api/products`

> Pastikan PostgreSQL sudah aktif dan database `tokoku_db` sudah dibuat sebelumnya.
