using Microsoft.EntityFrameworkCore;
using OsloEnergiAPI.Models;

namespace OsloEnergiAPI.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Property> Properties { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Property>()
            .Property(p => p.EnergyRating)
            .HasMaxLength(1);

        modelBuilder.Entity<Property>()
            .Property(p => p.Address)
            .HasMaxLength(200);

        modelBuilder.Entity<Property>()
            .Property(p => p.District)
            .HasMaxLength(100);
    }
}