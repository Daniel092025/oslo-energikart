using OsloEnergiAPI.Models;

namespace OsloEnergiAPI.Data;

public static class DataSeeder
{
    public static void Seed(AppDbContext context)
    {
        if (context.Properties.Any()) return; // Don't seed if data exists

        var districts = new[] {
            "Alna", "Bjerke", "Frogner", "Gamle Oslo", "Grorud",
            "Grünerløkka", "Nordre Aker", "Nordstrand", "Sagene",
            "St. Hanshaugen", "Stovner", "Søndre Nordstrand",
            "Ullern", "Vestre Aker", "Østensjø"
        };

        var ratings = new[] { "A", "B", "C", "D", "E", "F", "G" };
        var materials = new[] { "Tre", "Betong", "Murverk", "Stål" };
        var categories = new[] { "Boligblokk", "Enebolig", "Rekkehus", "Leilighet" };
        var types = new[] { "Hus", "Leilighet", "Tomannsbolig" };
        var random = new Random(42);

        var properties = Enumerable.Range(1, 120).Select(i => new Property
        {
            Address = $"Testgate {i}",
            District = districts[random.Next(districts.Length)],
            EnergyRating = ratings[random.Next(ratings.Length)],
            EnergyNeed = random.Next(80, 360),
            Size = random.Next(30, 180),
            Category = categories[random.Next(categories.Length)],
            Material = materials[random.Next(materials.Length)],
            BuildYear = random.Next(1900, 2024),
            ForSale = random.NextDouble() > 0.85,
            Price = Math.Round((decimal)(1.2 + random.NextDouble() * 8), 2),
            SqmPrice = random.Next(60000, 120000),
            Lat = 59.91 + (random.NextDouble() - 0.5) * 0.18,
            Lng = 10.75 + (random.NextDouble() - 0.5) * 0.28
        }).ToList();

        context.Properties.AddRange(properties);
        context.SaveChanges();
    }
}