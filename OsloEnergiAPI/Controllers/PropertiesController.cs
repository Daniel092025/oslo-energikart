using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OsloEnergiAPI.Data;
using OsloEnergiAPI.Models;

namespace OsloEnergiAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PropertiesController : ControllerBase
{
    private readonly AppDbContext _context;

    public PropertiesController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/properties
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Property>>> GetProperties()
    {
        return await _context.Properties.ToListAsync();
    }

    // GET: api/properties/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Property>> GetProperty(int id)
    {
        var property = await _context.Properties.FindAsync(id);
        if (property == null) return NotFound();
        return property;
    }

    // GET: api/properties/district/Sagene
    [HttpGet("district/{district}")]
    public async Task<ActionResult<IEnumerable<Property>>> GetByDistrict(string district)
    {
        return await _context.Properties
            .Where(p => p.District == district)
            .ToListAsync();
    }

    // GET: api/properties/stats
    [HttpGet("stats")]
    public async Task<ActionResult> GetStats()
    {
        var total = await _context.Properties.CountAsync();
        var forSale = await _context.Properties.CountAsync(p => p.ForSale);
        return Ok(new { total, forSale });
    }
}

// Then run `dotnet run` and open your browser at: http://localhost:5000/swagger //