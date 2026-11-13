using Database.Tokoku;
using Microsoft.EntityFrameworkCore;
using Model.Tokoku;

namespace ServiceTokoku.Services;

public class CategoryService : ICategoryService
{
    private readonly TokokuDbContext _dbContext;
    private readonly ILogger<CategoryService> _logger;

    public CategoryService(TokokuDbContext dbContext, ILogger<CategoryService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<IEnumerable<Category>> GetAllAsync()
    {
        _logger.LogDebug("Mengeksekusi query database untuk mengambil seluruh data kategori...");
        return await _dbContext.Set<Category>()
            .OrderBy(c => c.Id)
            .ToListAsync();
    }

    public async Task<Category?> GetByIdAsync(int id)
    {
        _logger.LogDebug("Mengeksekusi query database mencari kategori dengan ID={Id}...", id);
        return await _dbContext.Set<Category>().FindAsync(id);
    }

    public async Task<Category> CreateAsync(Category category)
    {
        category.CreatedAt = DateTime.UtcNow;
        _logger.LogDebug("Menambahkan entitas Category baru ke ChangeTracker DbContext...");
        _dbContext.Set<Category>().Add(category);
        await _dbContext.SaveChangesAsync();
        _logger.LogDebug("Kategori berhasil disimpan ke database. Generated ID: {Id}.", category.Id);
        return category;
    }

    public async Task<Category?> UpdateAsync(int id, Category category)
    {
        var existing = await _dbContext.Set<Category>().FindAsync(id);
        if (existing is null)
        {
            return null;
        }

        existing.Name = category.Name;
        existing.Description = category.Description;

        _logger.LogDebug("Menyimpan pembaruan kategori ID={Id} ke database...", id);
        await _dbContext.SaveChangesAsync();
        return existing;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var existing = await _dbContext.Set<Category>().FindAsync(id);
        if (existing is null)
        {
            return false;
        }

        _logger.LogDebug("Menghapus kategori ID={Id} dari database...", id);
        _dbContext.Set<Category>().Remove(existing);
        await _dbContext.SaveChangesAsync();
        return true;
    }
}
