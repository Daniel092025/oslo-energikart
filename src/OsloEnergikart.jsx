import { useState, useEffect, useRef } from "react";

// ─── API CONFIG ───────────────────────────────────────────────────────────────
// Replace these with your real backend endpoints when ready
const API_BASE = "http://localhost:5000/api";
const ENDPOINTS = {
  properties: `${API_BASE}/properties`,       // GET → list of properties with coords + energy rating
  districts: `${API_BASE}/districts`,         // GET → GeoJSON district boundaries
  stats: `${API_BASE}/stats`,                 // GET → { total, forSale }
};

// ─── MOCK DATA (remove when backend is connected) ─────────────────────────────
const MOCK_STATS = { total: 356, forSale: 43 };

const MOCK_DISTRICTS = [
  "Alna", "Bjerke", "Frogner", "Gamle Oslo", "Grorud",
  "Grünerløkka", "Nordre Aker", "Nordstrand", "Sagene",
  "St. Hanshaugen", "Stovner", "Søndre Nordstrand",
  "Ullern", "Vestre Aker", "Østensjø"
];

const MOCK_PROPERTIES = Array.from({ length: 120 }, (_, i) => {
  const size = Math.floor(30 + Math.random() * 150);
  return {
    id: i,
    lat: 59.91 + (Math.random() - 0.5) * 0.18,
    lng: 10.75 + (Math.random() - 0.5) * 0.28,
    rating: ["A", "B", "C", "D", "E", "F", "G"][Math.floor(Math.random() * 7)],
    address: `Testgate ${i + 1}`,
    bruksenhet: String(Math.floor(Math.random() * 200)).padStart(3, "0"),
    district: MOCK_DISTRICTS[Math.floor(Math.random() * MOCK_DISTRICTS.length)],
    forSale: Math.random() > 0.85,
    sqmPrice: Math.floor(60000 + Math.random() * 60000),
    oppvarming: ["Elektrisk", "Varmepumpe", "Fjernvarme", "Gass"][Math.floor(Math.random() * 4)],
    byggeaar: Math.floor(1900 + Math.random() * 123),
    material: ["Tre", "Betong", "Murverk", "Stål"][Math.floor(Math.random() * 4)],
    kategori: ["Boligblokk", "Enebolig", "Rekkehus", "Leilighet"][Math.floor(Math.random() * 4)],
    energibehov: Math.floor(80 + Math.random() * 280),
    storrelse: size,
    pris: parseFloat((1.2 + Math.random() * 8).toFixed(2)),
    type: ["Hus", "Leilighet", "Tomannsbolig"][Math.floor(Math.random() * 3)],
  };
});

// ─── ENERGY COLORS ────────────────────────────────────────────────────────────
const RATING_COLOR = {
  A: "#22c55e",
  B: "#4ade80",
  C: "#a3e635",
  D: "#facc15",
  E: "#fb923c",
  F: "#ef4444",
  G: "#b91c1c",
};

const RATING_GROUP_COLOR = {
  "A-B": "#22c55e",
  C: "#a3e635",
  D: "#facc15",
  E: "#fb923c",
  "F-G": "#ef4444",
};

function getRatingColor(r) {
  return RATING_COLOR[r] ?? "#888";
}

// ─── LEAFLET LOADER ───────────────────────────────────────────────────────────
// Dynamically loads Leaflet from CDN so no npm install needed
function useLeaflet(mapRef, setMap) {
  useEffect(() => {
    if (window.L) { initMap(); return; }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = initMap;
    document.head.appendChild(script);

    function initMap() {
      if (!mapRef.current || mapRef.current._leaflet_id) return;
      const L = window.L;
      const map = L.map(mapRef.current, { zoomControl: false }).setView([59.913, 10.752], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      L.control.zoom({ position: "topleft" }).addTo(map);
      setMap(map);
    }
  }, []);
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function OsloEnergikart() {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const markersRef = useRef([]);

  const [properties, setProperties] = useState([]);
  const [stats, setStats] = useState(MOCK_STATS);
  const [districts] = useState(MOCK_DISTRICTS);

  const [searchQuery, setSearchQuery] = useState("");
  const [saleFilter, setSaleFilter] = useState("all"); // "all" | "forSale" | "notForSale"
  const [selectedRatings, setSelectedRatings] = useState(new Set(["A","B","C","D","E","F","G"]));
  const [maxPrice, setMaxPrice] = useState(120000);
  const [selectedDistrict, setSelectedDistrict] = useState("Alle bydeler");
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [districtSearch, setDistrictSearch] = useState("");

  // Load data — swap mock for real fetch when backend is ready
  useEffect(() => {
    // Real fetch would be:
    // fetch(ENDPOINTS.properties).then(r => r.json()).then(setProperties);
    // fetch(ENDPOINTS.stats).then(r => r.json()).then(setStats);
    setProperties(MOCK_PROPERTIES);
  }, []);

  useLeaflet(mapRef, setMap);

  // Render markers whenever filter/map/data changes
  useEffect(() => {
    if (!map || !window.L) return;
    const L = window.L;

    // Clear old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    const filtered = properties.filter(p => {
      if (saleFilter === "forSale" && !p.forSale) return false;
      if (saleFilter === "notForSale" && p.forSale) return false;
      if (!selectedRatings.has(p.rating)) return false;
      if (p.sqmPrice > maxPrice) return false;
      if (selectedDistrict !== "Alle bydeler" && p.district !== selectedDistrict) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!p.address.toLowerCase().includes(q) && !p.district.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    filtered.forEach(p => {
      const size = p.forSale ? 18 : 11;
      const color = getRatingColor(p.rating);
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:${size}px;height:${size}px;border-radius:50%;
          background:${color};border:2px solid rgba(255,255,255,0.8);
          box-shadow:0 1px 4px rgba(0,0,0,0.35);
          transition: transform 0.15s;
        "></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([p.lat, p.lng], { icon })
        .addTo(map)
        .on("click", () => setSelectedProperty(p));

      markersRef.current.push(marker);
    });
  }, [map, properties, saleFilter, selectedRatings, maxPrice, selectedDistrict, searchQuery]);

  const filteredDistricts = ["Alle bydeler", ...districts].filter(d =>
    d.toLowerCase().includes(districtSearch.toLowerCase())
  );

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif", height: "100vh", display: "flex", flexDirection: "column", background: "#f0f2f5" }}>

      {/* ── SEARCH BAR ── */}
      <div style={{
        position: "relative", zIndex: 1000, background: "#fff",
        borderBottom: "1px solid #e2e8f0", padding: "10px 16px",
        display: "flex", alignItems: "center", gap: 10,
        boxShadow: "0 1px 6px rgba(0,0,0,0.08)"
      }}>
        <svg width="16" height="16" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Søk etter adresse, bydel eller bruksenhetsnummer..."
          style={{
            border: "none", outline: "none", width: "100%",
            fontSize: 14, color: "#1e293b", background: "transparent"
          }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")}
            style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18, lineHeight: 1 }}>
            ×
          </button>
        )}
      </div>

      {/* ── MAIN AREA ── */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>

        {/* MAP */}
        <div ref={mapRef} style={{ position: "absolute", inset: 0, zIndex: 1 }} />

        {/* SIDEBAR */}
        <div style={{
          position: "absolute", top: 12, left: 12, bottom: 12,
          width: 280, zIndex: 500,
          background: "rgba(255,255,255,0.97)",
          borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.13)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.3px" }}>
              Oslo Energikart
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              Energimerking og energibehov
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <StatCard icon="🏠" label="Eiendommer" value={stats.total} color="#3b82f6" />
              <StatCard icon="📈" label="Til salgs" value={stats.forSale} color="#10b981" />
            </div>
          </div>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>

            {/* Filter */}
            <Section title="Filtre">
              {/* Sale filter */}
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Salsstatus</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
                {[
                  { value: "all",        label: "Vis alt" },
                  { value: "forSale",    label: "Vis kun til salgs" },
                  { value: "notForSale", label: "Ikke til salgs" },
                ].map(({ value, label }) => (
                  <label key={value} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#334155" }}>
                    <input
                      type="radio"
                      name="saleFilter"
                      value={value}
                      checked={saleFilter === value}
                      onChange={() => setSaleFilter(value)}
                      style={{ accentColor: "#3b82f6", width: 14, height: 14 }}
                    />
                    {label}
                  </label>
                ))}
              </div>

              {/* Rating filter */}
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Energimerke</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {Object.entries(RATING_COLOR).map(([rating, color]) => (
                  <label key={rating} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={selectedRatings.has(rating)}
                      onChange={e => {
                        const next = new Set(selectedRatings);
                        e.target.checked ? next.add(rating) : next.delete(rating);
                        setSelectedRatings(next);
                      }}
                      style={{ accentColor: color, width: 13, height: 13 }}
                    />
                    <span style={{ color, fontWeight: 700 }}>{rating}</span>
                  </label>
                ))}
              </div>

              {/* Price filter */}
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Prisgrense</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#334155", marginBottom: 4 }}>
                <span>Maks kr/m²</span>
                <span style={{ fontWeight: 600 }}>{maxPrice.toLocaleString("nb-NO")}</span>
              </div>
              <input
                type="range"
                min={60000}
                max={120000}
                step={5000}
                value={maxPrice}
                onChange={e => setMaxPrice(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#3b82f6" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                <span>60 000</span>
                <span>120 000</span>
              </div>
            </Section>

            {/* Legend */}
            <Section title="⚡ Energimerke fargekode">
              {Object.entries(RATING_GROUP_COLOR).map(([label, color]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#475569" }}>
                    {label}: {label === "A-B" ? "Svært god" : label === "C" ? "God" : label === "D" ? "Gjennomsnitt" : label === "E" ? "Dårlig" : "Svært dårlig"}
                  </span>
                </div>
              ))}
              <div style={{ marginTop: 8, padding: "6px 8px", background: "#f8fafc", borderRadius: 6, fontSize: 11, color: "#64748b" }}>
                Større sirkler = Eiendommer til salgs
              </div>
            </Section>

            {/* Districts */}
            <Section title="Bydeler">
              <input
                value={districtSearch}
                onChange={e => setDistrictSearch(e.target.value)}
                placeholder="Filtrer bydeler..."
                style={{
                  width: "100%", border: "1px solid #e2e8f0", borderRadius: 6,
                  padding: "6px 8px", fontSize: 12, marginBottom: 8,
                  outline: "none", color: "#334155", boxSizing: "border-box"
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {filteredDistricts.map(d => (
                  <button key={d} onClick={() => setSelectedDistrict(d)}
                    style={{
                      textAlign: "left", border: "none", borderRadius: 6,
                      padding: "6px 8px", fontSize: 12, cursor: "pointer",
                      background: selectedDistrict === d ? "#eff6ff" : "transparent",
                      color: selectedDistrict === d ? "#2563eb" : "#475569",
                      fontWeight: selectedDistrict === d ? 600 : 400,
                      transition: "background 0.15s",
                    }}>
                    {d}
                  </button>
                ))}
              </div>
            </Section>
          </div>

          {/* Footer */}
          <div style={{ padding: "10px 18px", borderTop: "1px solid #f1f5f9", fontSize: 10, color: "#94a3b8", lineHeight: 1.5 }}>
            <strong>Datakilde:</strong> Mock data basert på Enova og Geonorge struktur.
            I produksjon ville dette vært ekte data fra offentlige API-er.
          </div>
        </div>

        {/* PROPERTY POPUP */}
        {selectedProperty && (
          <div style={{
            position: "absolute", bottom: 24, right: 24, zIndex: 600,
            background: "#fff", borderRadius: 12, width: 280,
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            animation: "fadeIn 0.2s ease", overflow: "hidden"
          }}>
            {/* Header */}
            <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, paddingRight: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{selectedProperty.address}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                    {selectedProperty.district} • Bruksenhet: {selectedProperty.bruksenhet}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {selectedProperty.forSale && (
                    <span style={{ background: "#22c55e", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20 }}>
                      Til salgs
                    </span>
                  )}
                  <button onClick={() => setSelectedProperty(null)}
                    style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", fontSize: 20, lineHeight: 1, padding: 0 }}>
                    ×
                  </button>
                </div>
              </div>
            </div>

            <div style={{ padding: "12px 16px" }}>
              {/* Energimerke + Oppvarming */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <InfoBox label="Energimerke">
                  <span style={{ fontWeight: 700, fontSize: 16, color: getRatingColor(selectedProperty.rating) }}>
                    {selectedProperty.rating}
                  </span>
                </InfoBox>
                <InfoBox label="Oppvarming">
                  <span style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>{selectedProperty.oppvarming}</span>
                </InfoBox>
              </div>

              {/* Byggeår + Material */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <InfoBox label="Byggeår">
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{selectedProperty.byggeaar}</span>
                </InfoBox>
                <InfoBox label="Material">
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{selectedProperty.material}</span>
                </InfoBox>
              </div>

              {/* Key stats */}
              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10, marginBottom: 10 }}>
                <DataRow label="Kategori" value={selectedProperty.kategori} bold />
                <DataRow label="Energibehov" value={`${selectedProperty.energibehov} kWh/m²/år`} bold />
                <DataRow label="Størrelse" value={`${selectedProperty.storrelse} m²`} bold />
              </div>

              {/* Pris per m² + total pris */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                <InfoBox label="Pris per m²">
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
                    {selectedProperty.sqmPrice.toLocaleString("nb-NO")} kr
                  </span>
                </InfoBox>
                <InfoBox label="Totalpris">
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
                    {selectedProperty.pris} mill kr
                  </span>
                </InfoBox>
              </div>

              {/* Type */}
              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
                <DataRow label="Type" value={selectedProperty.type} bold />
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
      `}</style>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      flex: 1, padding: "10px 12px", background: "#f8fafc",
      borderRadius: 8, borderLeft: `3px solid ${color}`
    }}>
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>{icon} {label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{value}</div>
    </div>
  );
}

function InfoBox({ label, children }) {
  return (
    <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 10px" }}>
      <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 3 }}>{label}</div>
      {children}
    </div>
  );
}

function DataRow({ label, value, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
      <span style={{ fontSize: 12, color: "#64748b" }}>{label}</span>
      <span style={{ fontSize: 12, color: "#0f172a", fontWeight: bold ? 600 : 400 }}>{value}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}
