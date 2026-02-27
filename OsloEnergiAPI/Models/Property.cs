namespace OsloEnergiAPI.Models;

public class Property
{
    public int Id { get; set; }
    public string Address { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string EnergyRating { get; set; } = string.Empty;
    public int EnergyNeed { get; set; }        
    public int Size { get; set; }              
    public string Category { get; set; } = string.Empty;
    public string Material { get; set; } = string.Empty;
    public int BuildYear { get; set; }
    public bool ForSale { get; set; }
    public decimal Price { get; set; }        
    public int SqmPrice { get; set; }          
    public double Lat { get; set; }
    public double Lng { get; set; }
}