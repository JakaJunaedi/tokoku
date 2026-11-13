using Database.Tokoku;
using Microsoft.EntityFrameworkCore;
using Model.Tokoku;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

builder.Services.AddDbContext<TokokuDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("/api/products", async (TokokuDbContext db) =>
    await db.Products.OrderBy(p => p.Id).ToListAsync());

app.MapPost("/api/products", async (Product product, TokokuDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(product.Name))
    {
        return Results.BadRequest(new { message = "Nama produk wajib diisi." });
    }

    product.CreatedAt = DateTime.UtcNow;
    db.Products.Add(product);
    await db.SaveChangesAsync();

    return Results.Created($"/api/products/{product.Id}", product);
});

app.MapControllers();
app.Run();
