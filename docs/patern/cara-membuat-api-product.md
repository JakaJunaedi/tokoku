# Panduan: Cara Membuat & Mengembangkan API Product (Controller & Service Pattern)

Dokumen ini menjelaskan pola (*pattern*) dan alur pembuatan API Product pada solusi **Tokoku**. Arsitektur proyek menggunakan pola *Layered Architecture* berbasis **Controller-Service Pattern** di .NET 10.

---

## 1. Arsitektur Layer

Pembangunan endpoint API di Tokoku melibatkan 3 layer utama:

1. **`Model.Tokoku`**: Menyimpan entity domain atau model data murni (*POCO*).
2. **`Database.Tokoku`**: Mengelola konfigurasi Entity Framework Core (EF Core) `TokokuDbContext` dan pemetaan skema tabel (*Fluent API*).
3. **`ServiceTokoku`**: Aplikasi API host utama yang terbagi menjadi:
   - **`Services/`**: Logika bisnis dan akses data database (`IProductService` & `ProductService`).
   - **`Controllers/`**: HTTP Request handling, validasi input, dan response formatting (`ProductsController`).
   - **`Program.cs`**: Konfigurasi Dependency Injection, Middleware, CORS, dan Controller mapping.

```
Model.Tokoku (Product Entity)
       ▲
       │
Database.Tokoku (TokokuDbContext)
       ▲
       │
ServiceTokoku/Services (IProductService & ProductService)
       ▲
       │
ServiceTokoku/Controllers (ProductsController)
       ▲
       │
Client / Frontend Tokoku (Angular)
```

---

## 2. Langkah 1: Mendefinisikan Entity di `Model.Tokoku`

Class entity berada di proyek [`Model.Tokoku`](file:///D:/Jack/dotnet/tokoku/Model.Tokoku).

File: [`Model.Tokoku/Product.cs`](file:///D:/Jack/dotnet/tokoku/Model.Tokoku/Product.cs)

```csharp
namespace Model.Tokoku;

public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Stock { get; set; } = 0;
    public decimal Discount { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
```

---

## 3. Langkah 2: Mendaftarkan Entity ke `TokokuDbContext`

Daftarkan `DbSet<Product>` dan konfigurasi skemanya di dalam [`Database.Tokoku/TokokuDbContext.cs`](file:///D:/Jack/dotnet/tokoku/Database.Tokoku/TokokuDbContext.cs).

```csharp
using Microsoft.EntityFrameworkCore;
using Model.Tokoku;

namespace Database.Tokoku;

public class TokokuDbContext : DbContext
{
    public TokokuDbContext(DbContextOptions<TokokuDbContext> options)
        : base(options)
    {
    }

    public DbSet<Product> Products => Set<Product>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(p => p.Id);

            entity.Property(p => p.Name)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(p => p.Price)
                .HasPrecision(18, 2);

            entity.Property(p => p.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
        });
    }
}
```

---

## 4. Langkah 3: Membuat Service Layer (`ServiceTokoku/Services`)

Service layer berfungsi memisahkan logika bisnis dan interaksi database dari Controller.

### 4.1 Interface: `IProductService.cs`
File: [`ServiceTokoku/Services/IProductService.cs`](file:///D:/Jack/dotnet/tokoku/ServiceTokoku/Services/IProductService.cs)

```csharp
using Model.Tokoku;

namespace ServiceTokoku.Services;

public interface IProductService
{
    Task<IEnumerable<Product>> GetAllAsync();
    Task<Product?> GetByIdAsync(int id);
    Task<Product> CreateAsync(Product product);
    Task<Product?> UpdateAsync(int id, Product product);
    Task<bool> DeleteAsync(int id);
}
```

### 4.2 Implementasi: `ProductService.cs`
File: [`ServiceTokoku/Services/ProductService.cs`](file:///D:/Jack/dotnet/tokoku/ServiceTokoku/Services/ProductService.cs)

```csharp
using Database.Tokoku;
using Microsoft.EntityFrameworkCore;
using Model.Tokoku;

namespace ServiceTokoku.Services;

public class ProductService : IProductService
{
    private readonly TokokuDbContext _dbContext;

    public ProductService(TokokuDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IEnumerable<Product>> GetAllAsync()
    {
        return await _dbContext.Products
            .OrderBy(p => p.Id)
            .ToListAsync();
    }

    public async Task<Product?> GetByIdAsync(int id)
    {
        return await _dbContext.Products.FindAsync(id);
    }

    public async Task<Product> CreateAsync(Product product)
    {
        product.CreatedAt = DateTime.UtcNow;
        _dbContext.Products.Add(product);
        await _dbContext.SaveChangesAsync();
        return product;
    }

    public async Task<Product?> UpdateAsync(int id, Product product)
    {
        var existing = await _dbContext.Products.FindAsync(id);
        if (existing is null) return null;

        existing.Name = product.Name;
        existing.Price = product.Price;

        await _dbContext.SaveChangesAsync();
        return existing;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var existing = await _dbContext.Products.FindAsync(id);
        if (existing is null) return false;

        _dbContext.Products.Remove(existing);
        await _dbContext.SaveChangesAsync();
        return true;
    }
}
```

---

## 5. Langkah 4: Membuat Controller Layer (`ServiceTokoku/Controllers`)

Controller bertugas menangani request HTTP, validasi, dan response status code.

File: [`ServiceTokoku/Controllers/ProductsController.cs`](file:///D:/Jack/dotnet/tokoku/ServiceTokoku/Controllers/ProductsController.cs)

```csharp
using Microsoft.AspNetCore.Mvc;
using Model.Tokoku;
using ServiceTokoku.Services;

namespace ServiceTokoku.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;

    public ProductsController(IProductService productService)
    {
        _productService = productService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var products = await _productService.GetAllAsync();
        return Ok(products);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var product = await _productService.GetByIdAsync(id);
        if (product is null)
        {
            return NotFound(new { message = $"Produk dengan ID {id} tidak ditemukan." });
        }
        return Ok(product);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Product product)
    {
        if (string.IsNullOrWhiteSpace(product.Name))
        {
            return BadRequest(new { message = "Nama produk wajib diisi." });
        }
        if (product.Price < 0)
        {
            return BadRequest(new { message = "Harga produk tidak boleh bernilai negatif." });
        }

        var created = await _productService.CreateAsync(product);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] Product product)
    {
        if (string.IsNullOrWhiteSpace(product.Name))
        {
            return BadRequest(new { message = "Nama produk wajib diisi." });
        }
        if (product.Price < 0)
        {
            return BadRequest(new { message = "Harga produk tidak boleh bernilai negatif." });
        }

        var updated = await _productService.UpdateAsync(id, product);
        if (updated is null)
        {
            return NotFound(new { message = $"Produk dengan ID {id} tidak ditemukan." });
        }
        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _productService.DeleteAsync(id);
        if (!deleted)
        {
            return NotFound(new { message = $"Produk dengan ID {id} tidak ditemukan." });
        }
        return NoContent();
    }
}
```

---

## 6. Langkah 5: Registrasi Dependency Injection di `Program.cs`

Daftarkan service, controller, CORS, dan mapping controller di [`ServiceTokoku/Program.cs`](file:///D:/Jack/dotnet/tokoku/ServiceTokoku/Program.cs):

```csharp
using Database.Tokoku;
using Microsoft.EntityFrameworkCore;
using ServiceTokoku.Services;

var builder = WebApplication.CreateBuilder(args);

// Register Controllers
builder.Services.AddControllers();

// Register Application Service
builder.Services.AddScoped<IProductService, ProductService>();

// Register CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Register DbContext
builder.Services.AddDbContext<TokokuDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        b => b.MigrationsAssembly("Migration.Tokoku")));

var app = builder.Build();

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");

// Map Controllers
app.MapControllers();

app.Run();
```

---

## 7. Pengujian Endpoint

Jalankan backend:
```bash
dotnet run --project ServiceTokoku/ServiceTokoku.csproj
```

Uji melalui terminal (PowerShell):
```powershell
# 1. Health check
Invoke-RestMethod -Uri "http://localhost:5242/health"

# 2. Tambah produk baru (POST)
$body = @{ name = "Keyboard Mechanical"; price = 750000 } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5242/api/products" -Method Post -ContentType "application/json" -Body $body

# 3. Ambil seluruh produk (GET)
Invoke-RestMethod -Uri "http://localhost:5242/api/products"

# 4. Ambil produk berdasarkan ID (GET By ID)
Invoke-RestMethod -Uri "http://localhost:5242/api/products/1"

# 5. Ubah produk (PUT)
$updateBody = @{ name = "Keyboard Mechanical RGB"; price = 850000 } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5242/api/products/1" -Method Put -ContentType "application/json" -Body $updateBody

# 6. Hapus produk (DELETE)
Invoke-RestMethod -Uri "http://localhost:5242/api/products/1" -Method Delete
```
