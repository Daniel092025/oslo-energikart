using CsvHelper;
using CsvHelper.Configuration;
using System.Globalization;
using OsloEnergiAPI.Data;
using OsloEnergiAPI.Models;

namespace OsloEnergiAPI.Services;

public class EnergyDataService
{
    private readonly AppDbContext _context;
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly ILogger<EnergyDataService> _logger;

    public EnergyDataService(
        AppDbContext context,
        HttpClient httpClient,
        IConfiguration config,
        ILogger<EnergyDataService> logger)
    {
        _context = context;
        _httpClient = httpClient;
        _config = config;
        _logger = logger;
    }

    public async Task SyncDataAsync()
    {
        // ─── Her skal den "Ordentlige" APIen inn, tar dette bort nå key kommer inn. ───────────────────────
        // -----Koden -----
        // var apiKey = _config["EnergyApi:ApiKey"];
        // var url = _config["EnergyApi:Url"];
        // _httpClient.DefaultRequestHeaders.Add("X-API-Key", apiKey);
        // var response = await _httpClient.GetAsync(url);
        // var csvContent = await response.Content.ReadAsStringAsync();
        // var properties = ParseCsv(csvContent);
        // await SaveToDatabase(properties);

        // ─── MOCK DATA (fjerner dette etter ordentlig data kommer inn) ────────────────────
        _logger.LogInformation("EnergyDataService: Using mock data — real API not configured yet");
        await Task.CompletedTask;
    }

    private List<Property> ParseCsv(string csvContent)
    {
        var config = new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = true,
            Delimiter = ";", // Hvis CSV bruker semikolon, fjern hvis ikke
            MissingFieldFound = null,
        };

        using var reader = new StringReader(csvContent);
        using var csv = new CsvReader(reader, config);

        // ── Mapping til  CSV columns til Property model ──
        // Justerer dette til å passe CSV headers
        return csv.GetRecords<CsvPropertyRecord>()
            .Select(r => new Property
            {
                Address = r.Adresse ?? "",
                District = r.Bydel ?? "",
                EnergyRating = r.Energikarakter ?? "G",
                EnergyNeed = int.TryParse(r.Energibehov, out var en) ? en : 0,
                Size = int.TryParse(r.Areal, out var size) ? size : 0,
                BuildYear = int.TryParse(r.Byggeaar, out var by) ? by : 0,
                Category = r.Kategori ?? "",
                Material = r.Material ?? "",
                ForSale = false,
                Price = 0,
                SqmPrice = 0,
                Lat = double.TryParse(r.Lat, NumberStyles.Any, CultureInfo.InvariantCulture, out var lat) ? lat : 0,
                Lng = double.TryParse(r.Lng, NumberStyles.Any, CultureInfo.InvariantCulture, out var lng) ? lng : 0,
            })
            .Where(p => p.Lat != 0 && p.Lng != 0)
            .ToList();
    }

    private async Task SaveToDatabase(List<Property> properties)
    {
        // Clear old data and replace with fresh import
        _context.Properties.RemoveRange(_context.Properties);
        await _context.SaveChangesAsync();

        await _context.Properties.AddRangeAsync(properties);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Saved {Count} properties to database", properties.Count);
    }
}

// ── Også justere dette til å passe CSV headers  ──
public class CsvPropertyRecord
{
    public string? Adresse { get; set; }
    public string? Bydel { get; set; }
    public string? Energikarakter { get; set; }
    public string? Energibehov { get; set; }
    public string? Areal { get; set; }
    public string? Byggeaar { get; set; }
    public string? Kategori { get; set; }
    public string? Material { get; set; }
    public string? Lat { get; set; }
    public string? Lng { get; set; }
}