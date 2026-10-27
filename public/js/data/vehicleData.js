// Vehicle data module using NHTSA free API + curated popular brands list
const NHTSA_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles';

// Marcas populares curadas (respaldo cuando la API tarda o falla)
export const MARCAS_POPULARES = [
  'Acura', 'Alfa Romeo', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet',
  'Chrysler', 'Citroën', 'Dodge', 'Fiat', 'Ford', 'GMC', 'Honda',
  'Hyundai', 'Infiniti', 'Jaguar', 'Jeep', 'Kia', 'Land Rover', 'Lexus',
  'Lincoln', 'Mazda', 'Mercedes-Benz', 'Mercury', 'Mini', 'Mitsubishi',
  'Nissan', 'Oldsmobile', 'Opel', 'Peugeot', 'Pontiac', 'Porsche',
  'Ram', 'Renault', 'Seat', 'Skoda', 'Subaru', 'Suzuki', 'Tesla',
  'Toyota', 'Volkswagen', 'Volvo'
];

// Modelos comunes por marca (curado para las más populares en México/LatAm)
const MODELOS_POR_MARCA = {
  'Toyota': ['Camry', 'Corolla', 'Prius', 'RAV4', 'Highlander', 'Tacoma', 'Tundra', 'Sienna', 'Sequoia', 'Avalon', 'Venza', 'Yaris', 'Land Cruiser', '4Runner', 'Fortuner'],
  'Honda': ['Accord', 'Civic', 'CR-V', 'Fit', 'HR-V', 'Odyssey', 'Passport', 'Pilot', 'Ridgeline', 'Insight', 'City', 'Jazz'],
  'Ford': ['Explorer', 'F-150', 'Fusion', 'Mustang', 'Edge', 'Escape', 'Expedition', 'Bronco', 'Ranger', 'Focus', 'EcoSport', 'Fiesta'],
  'Chevrolet': ['Aveo', 'Camaro', 'Colorado', 'Cruze', 'Equinox', 'Silverado', 'Sonic', 'Spark', 'Suburban', 'Tahoe', 'Traverse', 'Trax', 'Malibu', 'Trailblazer'],
  'Nissan': ['Altima', 'Frontier', 'Kicks', 'Maxima', 'Murano', 'Pathfinder', 'Rogue', 'Sentra', 'Titan', 'Versa', 'X-Trail', 'March', 'NP300'],
  'Volkswagen': ['Beetle', 'Golf', 'Jetta', 'Passat', 'Polo', 'Tiguan', 'Touareg', 'Atlas', 'ID.4', 'T-Cross', 'Vento', 'Amarok'],
  'BMW': ['Serie 1', 'Serie 2', 'Serie 3', 'Serie 4', 'Serie 5', 'Serie 7', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'M3', 'M5'],
  'Mercedes-Benz': ['Clase A', 'Clase C', 'Clase E', 'Clase S', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'CLA', 'AMG GT'],
  'Audi': ['A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q5', 'Q7', 'Q8', 'TT', 'R8'],
  'Hyundai': ['Accent', 'Elantra', 'i10', 'i20', 'Kona', 'Sonata', 'Tucson', 'Santa Fe', 'Palisade', 'Venue', 'Creta'],
  'Kia': ['Forte', 'Optima', 'Picanto', 'Rio', 'Sorento', 'Sportage', 'Stinger', 'Telluride', 'Soul', 'Seltos', 'Carnival'],
  'Mazda': ['CX-3', 'CX-5', 'CX-7', 'CX-9', 'Mazda2', 'Mazda3', 'Mazda6', 'MX-5', 'BT-50'],
  'Subaru': ['Ascent', 'Crosstrek', 'Forester', 'Impreza', 'Legacy', 'Outback', 'WRX', 'BRZ'],
  'Jeep': ['Cherokee', 'Compass', 'Grand Cherokee', 'Patriot', 'Renegade', 'Wrangler', 'Gladiator'],
  'Dodge': ['Challenger', 'Charger', 'Dart', 'Durango', 'Journey', 'Ram 1500', 'Neon', 'Attitude'],
  'Ram': ['1500', '2500', '3500', 'ProMaster', 'ProMaster City'],
  'Chrysler': ['200', '300', 'Pacifica', 'Town & Country', 'Voyager'],
  'GMC': ['Acadia', 'Canyon', 'Envoy', 'Savana', 'Sierra', 'Terrain', 'Yukon'],
  'Cadillac': ['CT4', 'CT5', 'CT6', 'Escalade', 'XT4', 'XT5', 'XT6'],
  'Buick': ['Enclave', 'Encore', 'Envision', 'LaCrosse', 'Regal'],
  'Acura': ['ILX', 'MDX', 'RDX', 'RLX', 'TLX', 'NSX'],
  'Lexus': ['ES', 'GS', 'GX', 'IS', 'LC', 'LS', 'LX', 'NX', 'RX', 'UX'],
  'Infiniti': ['G35', 'G37', 'Q50', 'Q60', 'Q70', 'QX50', 'QX56', 'QX60', 'QX80'],
  'Tesla': ['Model 3', 'Model S', 'Model X', 'Model Y', 'Cybertruck'],
  'Volvo': ['S60', 'S90', 'V60', 'V90', 'XC40', 'XC60', 'XC90'],
  'Land Rover': ['Defender', 'Discovery', 'Discovery Sport', 'Freelander', 'Range Rover', 'Range Rover Evoque', 'Range Rover Sport'],
  'Jaguar': ['E-PACE', 'F-PACE', 'F-TYPE', 'I-PACE', 'XE', 'XF', 'XJ'],
  'Porsche': ['718', '911', 'Cayenne', 'Macan', 'Panamera', 'Taycan'],
  'Mitsubishi': ['Eclipse Cross', 'Galant', 'L200', 'Lancer', 'Mirage', 'Montero', 'Outlander', 'Eclipse'],
  'Suzuki': ['Alto', 'Baleno', 'Grand Vitara', 'Jimny', 'SX4', 'Swift', 'Vitara'],
  'Fiat': ['500', '500X', 'Bravo', 'Dobló', 'Ducato', 'Mobi', 'Palio', 'Punto', 'Toro'],
  'Peugeot': ['206', '207', '208', '301', '308', '3008', '408', '508', '5008'],
  'Renault': ['Clio', 'Duster', 'Fluence', 'Koleos', 'Logan', 'Megane', 'Sandero', 'Stepway', 'Kangoo'],
  'Citroën': ['Berlingo', 'C3', 'C4', 'C5', 'Xsara', 'Picasso'],
  'Seat': ['Arona', 'Ateca', 'Ibiza', 'Leon', 'Tarraco'],
  'Skoda': ['Fabia', 'Kamiq', 'Karoq', 'Kodiaq', 'Octavia', 'Rapid', 'Scala', 'Superb'],
  'Alfa Romeo': ['147', '156', '159', 'Giulia', 'Giulietta', 'Stelvio', '4C'],
  'Mini': ['Clubman', 'Convertible', 'Countryman', 'Hardtop', 'Paceman'],
  'Lincoln': ['Aviator', 'Continental', 'Corsair', 'MKX', 'MKZ', 'Nautilus', 'Navigator'],
  'Mercury': ['Cougar', 'Grand Marquis', 'Mariner', 'Milan', 'Mountaineer', 'Sable'],
  'Oldsmobile': ['Alero', 'Aurora', 'Bravada', 'Cutlass', 'Silhouette'],
  'Pontiac': ['Aztek', 'Bonneville', 'Firebird', 'G6', 'Grand Am', 'Grand Prix', 'Solstice', 'Vibe'],
  'Opel': ['Astra', 'Corsa', 'Crossland', 'Grandland', 'Insignia', 'Meriva', 'Mokka', 'Vectra'],
};

const YEARS_RANGE = (() => {
  const years = [];
  for (let y = new Date().getFullYear() + 1; y >= 1990; y--) {
    years.push(String(y));
  }
  return years;
})();

/**
 * Obtiene modelos para una marca usando NHTSA, fallback a lista local
 */
export async function getModelos(marca) {
  // Primero intentar desde la lista local curada (más rápido)
  if (MODELOS_POR_MARCA[marca]) {
    return MODELOS_POR_MARCA[marca];
  }
  
  // Si no está en la lista local, intentar con NHTSA API
  try {
    const res = await fetch(`${NHTSA_BASE}/getmodelsformake/${encodeURIComponent(marca)}?format=json`);
    const data = await res.json();
    if (data.Results && data.Results.length > 0) {
      return data.Results.map(r => r.Model_Name).sort();
    }
  } catch (e) {
    console.warn('NHTSA API no disponible, usando lista local');
  }
  return [];
}

/**
 * Retorna el listado de años disponibles
 */
export function getAnios() {
  return YEARS_RANGE;
}

/**
 * Realiza una búsqueda rápida global en marcas y modelos populares
 */
export function searchVehiclesGlobal(query) {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase().trim();
  const results = [];
  const added = new Set();

  // 1. Buscar en Marcas
  MARCAS_POPULARES.forEach(marca => {
    if (marca.toLowerCase().includes(q)) {
      results.push({ type: 'marca', marca, title: marca, subtitle: 'Marca Automotriz' });
      added.add(`marca:${marca}`);
    }
  });

  // 2. Buscar en Modelos por Marca
  Object.keys(MODELOS_POR_MARCA).forEach(marca => {
    MODELOS_POR_MARCA[marca].forEach(modelo => {
      const full = `${marca} ${modelo}`;
      if ((modelo.toLowerCase().includes(q) || full.toLowerCase().includes(q)) && !added.has(full)) {
        results.push({ type: 'modelo', marca, modelo, title: `${marca} ${modelo}`, subtitle: `Modelo de ${marca}` });
        added.add(full);
      }
    });
  });

  return results.slice(0, 20);
}

