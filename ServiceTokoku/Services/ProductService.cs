using Database.Tokoku;
using Microsoft.EntityFrameworkCore;
using Model.Tokoku;

namespace ServiceTokoku.Services;

public class ProductService : IProductService
{
    private readonly TokokuDbContext _dbContext;
    private readonly ILogger<ProductService> _logger;

    public ProductService(TokokuDbContext dbContext, ILogger<ProductService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<IEnumerable<Product>> GetAllAsync()
    {
        _logger.LogDebug("Mengeksekusi query database untuk mengambil seluruh entitas produk...");
        return await _dbContext.Products
            .OrderBy(p => p.Id)
            .ToListAsync();
    }

    public async Task<Product?> GetByIdAsync(int id)
    {
        _logger.LogDebug("Mengeksekusi query database mencari produk dengan Primary Key ID={Id}...", id);
        return await _dbContext.Products.FindAsync(id);
    }

    public async Task<Product> CreateAsync(Product product)
    {
        product.CreatedAt = DateTime.UtcNow;
        _logger.LogDebug("Menambahkan entitas Product baru ke ChangeTracker DbContext...");
        _dbContext.Products.Add(product);
        await _dbContext.SaveChangesAsync();
        _logger.LogDebug("Perubahan berhasil di-commit ke PostgreSQL. Generated ID: {Id}.", product.Id);
        return product;
    }

    public async Task<Product?> UpdateAsync(int id, Product product)
    {
        var existing = await _dbContext.Products.FindAsync(id);
        if (existing is null)
        {
            return null;
        }

        existing.Name = product.Name;
        existing.Price = product.Price;
        existing.Stock = product.Stock;
        existing.Discount = product.Discount;

        _logger.LogDebug("Menyimpan pembaruan entitas ID={Id} ke PostgreSQL...", id);
        await _dbContext.SaveChangesAsync();
        return existing;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var existing = await _dbContext.Products.FindAsync(id);
        if (existing is null)
        {
            return false;
        }

        _logger.LogDebug("Menandai entitas ID={Id} untuk dihapus dari PostgreSQL...", id);
        _dbContext.Products.Remove(existing);
        await _dbContext.SaveChangesAsync();
        return true;
    }
}
