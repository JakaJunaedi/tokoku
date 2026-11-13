# Panduan: Proses Migrasi Database dengan Entity Framework Core (`dotnet ef`)

Panduan ini mendokumentasikan alur kerja dan perintah **`dotnet ef`** untuk mengelola skema database pada proyek **Tokoku**.

---

## 1. Arsitektur Migrasi Terpisah (*Dedicated Migrations Assembly*)

Projek Tokoku memisahkan migrasi database ke dalam proyek tersendiri:

```
Tokoku/
├── Database.Tokoku/        # Berisi TokokuDbContext & konfigurasi pemetaan entitas
├── Migration.Tokoku/       # Assembly khusus penyimpanan file migrasi EF Core
├── ServiceTokoku/          # Startup project (Web API / entrypoint aplikasi)
└── Tokoku.slnx
```

### Mengapa dipisah ke `Migration.Tokoku`?
- Menjaga layer `Database.Tokoku` tetap ramping tanpa tercampur snapshot dan file migrasi yang menumpuk.
- Memungkinkan pipeline CI/CD atau tim DevOps mengeksekusi migrasi tanpa harus membangun ulang seluruh aplikasi web.

> [!IMPORTANT]
> Proyek [`Migration.Tokoku.csproj`](file:///D:/Jack/dotnet/tokoku/Migration.Tokoku/Migration.Tokoku.csproj) dikonfigurasi dengan properti:
> ```xml
> <RootNamespace>Tokoku.Migrations</RootNamespace>
> ```
> Konfigurasi ini **wajib** ada untuk mencegah konflik nama (*namespace collision*) antara nama proyek `Migration` dengan class `Microsoft.EntityFrameworkCore.Migrations.Migration` bawaan EF Core (error CS0118).

---

## 2. Prasyarat & Konfigurasi

### 2.1 Tool `dotnet-ef`
Pastikan tool command-line EF Core sudah terpasang secara global pada komputer Anda:

```bash
# Instalasi tool dotnet-ef secara global
dotnet tool install --global dotnet-ef

# Atau perbarui jika sudah pernah terpasang sebelumnya
dotnet tool update --global dotnet-ef
```

Verifikasi instalasi:
```bash
dotnet ef --version
```

### 2.2 Connection String di `ServiceTokoku`
Pastikan string koneksi database pada [`ServiceTokoku/appsettings.json`](file:///D:/Jack/dotnet/tokoku/ServiceTokoku/appsettings.json) sudah sesuai:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=tokoku_db;Username=tokoku_user;Password=your_password;Trust Server Certificate=true"
  }
}
```

### 2.3 Konfigurasi `MigrationsAssembly` di `Program.cs`
DbContext di [`ServiceTokoku/Program.cs`](file:///D:/Jack/dotnet/tokoku/ServiceTokoku/Program.cs#L11-L15) wajib mereferensikan assembly `Migration.Tokoku`:

```csharp
builder.Services.AddDbContext<TokokuDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        b => b.MigrationsAssembly("Migration.Tokoku")));
```

---

## 3. Alur Perintah Utama `dotnet ef`

Karena migrasi berada di proyek terpisah, seluruh perintah `dotnet ef` wajib menyertakan dua parameter:
- `--project Migration.Tokoku`: Menentukan tempat file migrasi disimpan.
- `--startup-project ServiceTokoku`: Menentukan startup project yang memuat konfigurasi `appsettings.json` dan dependency injection.

### 3.1 Melihat Daftar Migrasi (*Migrations List*)
Melihat status migrasi yang ada di proyek dan status penerapannya pada database:

```bash
dotnet ef migrations list --project Migration.Tokoku --startup-project ServiceTokoku
```

---

### 3.2 Membuat Migrasi Baru (*Add Migration*)
Jalankan setiap kali ada perubahan atau penambahan entity di `Model.Tokoku` dan `Database.Tokoku`:

```bash
dotnet ef migrations add <NamaMigrasi> --project Migration.Tokoku --startup-project ServiceTokoku
```

**Contoh:**
```bash
dotnet ef migrations add InitialCreate --project Migration.Tokoku --startup-project ServiceTokoku
```

File yang otomatis dihasilkan di folder [`Migration.Tokoku/Migrations`](file:///D:/Jack/dotnet/tokoku/Migration.Tokoku/Migrations):
1. `<timestamp>_<NamaMigrasi>.cs`: Berisi instruksi DDL metode `Up()` (penerapan) dan `Down()` (revert).
2. `<timestamp>_<NamaMigrasi>.Designer.cs`: Metadata skema migrasi.
3. `TokokuDbContextModelSnapshot.cs`: Snapshot kondisi model terkini dari DbContext.

---

### 3.3 Menerapkan Migrasi ke Database (*Update Database*)
Untuk mengeksekusi migrasi yang belum terpasang ke database target:

```bash
dotnet ef database update --project Migration.Tokoku --startup-project ServiceTokoku
```

Output sukses akan menampilkan pesan:
```text
Applying migration '<timestamp>_<NamaMigrasi>'.
Done.
```

---

### 3.4 Membatalkan Migrasi (*Rollback / Remove Migration*)

Terdapat dua skenario pembatalan migrasi:

#### Skenario A: Migrasi BELUM diterapkan ke database
Jika Anda baru menjalankan `migrations add` dan belum menjalankan `database update`, file migrasi dapat langsung dihapus dengan aman:

```bash
dotnet ef migrations remove --project Migration.Tokoku --startup-project ServiceTokoku
```

#### Skenario B: Migrasi SUDAH diterapkan ke database
Jika migrasi sudah terpasang di database, Anda harus mengembalikan skema database ke target migrasi sebelumnya terlebih dahulu, baru kemudian menghapus file kodenya:

```bash
# 1. Rollback skema database ke migrasi spesifik sebelumnya
dotnet ef database update <NamaMigrasiSebelumnya> --project Migration.Tokoku --startup-project ServiceTokoku

# (Opsional) Jika ingin me-revert semua migrasi ke kondisi database kosong:
# dotnet ef database update 0 --project Migration.Tokoku --startup-project ServiceTokoku

# 2. Hapus file migrasi terakhir
dotnet ef migrations remove --project Migration.Tokoku --startup-project ServiceTokoku
```

---

### 3.5 Menghasilkan Script SQL Manual (*Script Migration*)
Bila database produksi dikelola oleh DBA dan tidak mengizinkan akses langsung `dotnet ef database update`, Anda dapat mengekspor seluruh migrasi ke file script SQL:

```bash
# Menghasilkan script SQL dari awal hingga migrasi terkini
dotnet ef migrations script --project Migration.Tokoku --startup-project ServiceTokoku -o migration.sql

# Menghasilkan script idempotent (aman dijalankan berulang kali)
dotnet ef migrations script --idempotent --project Migration.Tokoku --startup-project ServiceTokoku -o migration.sql
```

---

## 4. Riwayat & Catatan Migrasi Database (*Generated Migration Log*)

Seluruh perubahan skema tabel di Tokoku dilakukan murni melalui generator EF Core CLI (`dotnet ef migrations add`), tanpa penulisan manual file migrasi.

### 4.1 `InitialCreate`
- **Tujuan**: Inisialisasi awal skema tabel `Products` (kolom: `Id`, `Name`, `Price`, `CreatedAt`).
- **Perintah generate**:
  ```bash
  dotnet ef migrations add InitialCreate --project Migration.Tokoku --startup-project ServiceTokoku
  ```

### 4.2 `AddStockToProduct`
- **Tujuan**: Menambahkan kolom `Stock` (integer, default `0`) pada tabel `Products`.
- **Perintah generate**:
  ```bash
  dotnet ef migrations add AddStockToProduct --project Migration.Tokoku --startup-project ServiceTokoku
  ```
- **File hasil generate**: [`Migration.Tokoku/Migrations/20261113212811_AddStockToProduct.cs`](file:///D:/Jack/dotnet/tokoku/Migration.Tokoku/Migrations/20261113212811_AddStockToProduct.cs)
- **Cuplikan DDL hasil generate otomatis**:
  ```csharp
  protected override void Up(MigrationBuilder migrationBuilder)
  {
      migrationBuilder.AddColumn<int>(
          name: "Stock",
          table: "Products",
          type: "integer",
          nullable: false,
          defaultValue: 0);
  }

  protected override void Down(MigrationBuilder migrationBuilder)
  {
      migrationBuilder.DropColumn(
          name: "Stock",
          table: "Products");
  }
  ```
- **Penerapan ke database**:
  ```bash
  dotnet ef database update --project Migration.Tokoku --startup-project ServiceTokoku
  ```
- **Verifikasi Skema Tabel Terkini di PostgreSQL**:
  ```text
   column_name |        data_type         |  column_default   
  -------------+--------------------------+-------------------
   Id          | integer                  | 
   Price       | numeric                  | 
   CreatedAt   | timestamp with time zone | CURRENT_TIMESTAMP
   Stock       | integer                  | 0
   Name        | character varying        | 
  ```

### 4.3 `AddDiscountToProduct`
- **Tujuan**: Menambahkan kolom `Discount` (numeric, default `0.0`) pada tabel `Products`.
- **Perintah generate**:
  ```bash
  dotnet ef migrations add AddDiscountToProduct --project Migration.Tokoku --startup-project ServiceTokoku
  ```
- **File hasil generate**: [`Migration.Tokoku/Migrations/20261113213823_AddDiscountToProduct.cs`](file:///D:/Jack/dotnet/tokoku/Migration.Tokoku/Migrations/20261113213823_AddDiscountToProduct.cs)
- **Cuplikan DDL hasil generate otomatis**:
  ```csharp
  protected override void Up(MigrationBuilder migrationBuilder)
  {
      migrationBuilder.AddColumn<decimal>(
          name: "Discount",
          table: "Products",
          type: "numeric",
          nullable: false,
          defaultValue: 0m);
  }

  protected override void Down(MigrationBuilder migrationBuilder)
  {
      migrationBuilder.DropColumn(
          name: "Discount",
          table: "Products");
  }
  ```
- **Penerapan ke database**:
  ```bash
  dotnet ef database update --project Migration.Tokoku --startup-project ServiceTokoku
  ```
- **Verifikasi Skema Tabel Terkini di PostgreSQL**:
  ```text
   column_name |        data_type         |  column_default   
  -------------+--------------------------+-------------------
   Id          | integer                  | 
   Price       | numeric                  | 
   CreatedAt   | timestamp with time zone | CURRENT_TIMESTAMP
   Stock       | integer                  | 0
   Discount    | numeric                  | 0.0
   Name        | character varying        | 
  ```

