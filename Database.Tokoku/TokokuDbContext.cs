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
