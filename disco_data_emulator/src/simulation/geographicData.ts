/**
 * Geographic Data Module
 *
 * Provides realistic geographic constraints for entity placement:
 * - Land/sea boundaries for the South China Sea region
 * - Ports, naval bases, and airfields
 * - Shipping lanes and patrol zones
 * - Military installation locations
 *
 * This ensures entities appear in geographically appropriate locations:
 * - Navy ships in water (oceans, seas, near ports)
 * - Army/ground units on land
 * - Air Force aircraft can be anywhere but originate from airfields
 */

// Region bounds for the contested South China Sea scenario
export const SCENARIO_BOUNDS = {
  minLat: 5.0,    // Southern bound (near Borneo)
  maxLat: 25.0,   // Northern bound (near Taiwan)
  minLon: 105.0,  // Western bound (Vietnam coast)
  maxLon: 125.0,  // Eastern bound (Philippines)
};

// Entity domain types
export type EntityDomain = 'AIR' | 'MARITIME' | 'LAND';

// Geographic zone types
export type ZoneType = 'OCEAN' | 'COASTAL' | 'PORT' | 'AIRFIELD' | 'LAND_MILITARY' | 'SHIPPING_LANE';

// Location with metadata
export interface GeoLocation {
  lat: number;
  lon: number;
  name: string;
  type: ZoneType;
  country: string;
  radius?: number; // Radius in km for area locations
}

// Polygon for land/sea boundaries (simplified)
export interface GeoPolygon {
  name: string;
  isLand: boolean;
  points: Array<{ lat: number; lon: number }>;
}

/**
 * Major ports and naval bases in the South China Sea region
 */
export const NAVAL_BASES: GeoLocation[] = [
  // China
  { lat: 18.2, lon: 109.5, name: 'Yulin Naval Base', type: 'PORT', country: 'CHINA', radius: 15 },
  { lat: 21.5, lon: 111.8, name: 'Zhanjiang Naval Base', type: 'PORT', country: 'CHINA', radius: 12 },
  { lat: 22.5, lon: 114.1, name: 'Hong Kong', type: 'PORT', country: 'CHINA', radius: 8 },
  { lat: 15.0, lon: 109.5, name: 'Woody Island (Yongxing)', type: 'PORT', country: 'CHINA', radius: 3 },
  { lat: 9.9, lon: 114.4, name: 'Fiery Cross Reef', type: 'PORT', country: 'CHINA', radius: 2 },
  { lat: 10.4, lon: 114.0, name: 'Subi Reef', type: 'PORT', country: 'CHINA', radius: 2 },
  { lat: 10.5, lon: 115.8, name: 'Mischief Reef', type: 'PORT', country: 'CHINA', radius: 2 },

  // Vietnam
  { lat: 16.1, lon: 108.2, name: 'Da Nang', type: 'PORT', country: 'VIETNAM', radius: 10 },
  { lat: 12.2, lon: 109.2, name: 'Cam Ranh Bay', type: 'PORT', country: 'VIETNAM', radius: 12 },
  { lat: 10.8, lon: 106.7, name: 'Ho Chi Minh City', type: 'PORT', country: 'VIETNAM', radius: 8 },

  // Philippines
  { lat: 14.5, lon: 120.9, name: 'Manila Bay', type: 'PORT', country: 'PHILIPPINES', radius: 10 },
  { lat: 14.8, lon: 120.3, name: 'Subic Bay', type: 'PORT', country: 'PHILIPPINES', radius: 8 },
  { lat: 9.8, lon: 118.7, name: 'Puerto Princesa', type: 'PORT', country: 'PHILIPPINES', radius: 5 },

  // Taiwan
  { lat: 22.6, lon: 120.3, name: 'Kaohsiung', type: 'PORT', country: 'TAIWAN', radius: 10 },
  { lat: 25.1, lon: 121.8, name: 'Keelung', type: 'PORT', country: 'TAIWAN', radius: 8 },

  // US/Allied Forward Bases
  { lat: 13.4, lon: 144.8, name: 'Guam Naval Base', type: 'PORT', country: 'USA', radius: 15 },
  { lat: 26.3, lon: 127.8, name: 'Okinawa', type: 'PORT', country: 'JAPAN', radius: 12 },
];

/**
 * Major airfields/air bases
 */
export const AIRFIELDS: GeoLocation[] = [
  // China
  { lat: 18.2, lon: 109.4, name: 'Sanya-Phoenix AFB', type: 'AIRFIELD', country: 'CHINA', radius: 8 },
  { lat: 21.2, lon: 110.4, name: 'Zhanjiang AFB', type: 'AIRFIELD', country: 'CHINA', radius: 8 },
  { lat: 23.4, lon: 113.3, name: 'Guangzhou AFB', type: 'AIRFIELD', country: 'CHINA', radius: 10 },
  { lat: 15.0, lon: 109.5, name: 'Woody Island Airstrip', type: 'AIRFIELD', country: 'CHINA', radius: 2 },
  { lat: 9.9, lon: 114.4, name: 'Fiery Cross Airstrip', type: 'AIRFIELD', country: 'CHINA', radius: 2 },

  // Vietnam
  { lat: 16.0, lon: 108.2, name: 'Da Nang AFB', type: 'AIRFIELD', country: 'VIETNAM', radius: 6 },
  { lat: 12.0, lon: 109.2, name: 'Cam Ranh AFB', type: 'AIRFIELD', country: 'VIETNAM', radius: 6 },
  { lat: 21.2, lon: 105.8, name: 'Hanoi (Noi Bai)', type: 'AIRFIELD', country: 'VIETNAM', radius: 8 },

  // Philippines
  { lat: 15.2, lon: 120.6, name: 'Clark AFB', type: 'AIRFIELD', country: 'PHILIPPINES', radius: 10 },
  { lat: 14.5, lon: 121.0, name: 'Villamor AFB', type: 'AIRFIELD', country: 'PHILIPPINES', radius: 6 },
  { lat: 9.8, lon: 118.8, name: 'Palawan AFB', type: 'AIRFIELD', country: 'PHILIPPINES', radius: 5 },

  // Taiwan
  { lat: 24.0, lon: 121.6, name: 'Hualien AFB', type: 'AIRFIELD', country: 'TAIWAN', radius: 6 },
  { lat: 23.5, lon: 120.4, name: 'Tainan AFB', type: 'AIRFIELD', country: 'TAIWAN', radius: 6 },
  { lat: 25.1, lon: 121.3, name: 'Taipei (Songshan)', type: 'AIRFIELD', country: 'TAIWAN', radius: 8 },

  // US/Allied
  { lat: 13.6, lon: 144.9, name: 'Andersen AFB (Guam)', type: 'AIRFIELD', country: 'USA', radius: 10 },
  { lat: 26.3, lon: 127.8, name: 'Kadena AFB (Okinawa)', type: 'AIRFIELD', country: 'JAPAN', radius: 12 },
];

/**
 * Land-based military installations (SAM sites, radar stations, C2 nodes)
 */
export const LAND_MILITARY_SITES: GeoLocation[] = [
  // China coastal defense
  { lat: 19.0, lon: 110.3, name: 'Hainan SAM Site Alpha', type: 'LAND_MILITARY', country: 'CHINA', radius: 3 },
  { lat: 18.5, lon: 109.8, name: 'Hainan Radar Station', type: 'LAND_MILITARY', country: 'CHINA', radius: 2 },
  { lat: 21.8, lon: 111.0, name: 'Leizhou SAM Battery', type: 'LAND_MILITARY', country: 'CHINA', radius: 3 },
  { lat: 22.8, lon: 113.5, name: 'Shenzhen C2 Node', type: 'LAND_MILITARY', country: 'CHINA', radius: 2 },
  { lat: 23.1, lon: 113.2, name: 'Guangzhou Radar', type: 'LAND_MILITARY', country: 'CHINA', radius: 2 },

  // Vietnam
  { lat: 16.5, lon: 107.6, name: 'Hue SAM Site', type: 'LAND_MILITARY', country: 'VIETNAM', radius: 3 },
  { lat: 11.9, lon: 109.0, name: 'Nha Trang Radar', type: 'LAND_MILITARY', country: 'VIETNAM', radius: 2 },
  { lat: 12.5, lon: 109.5, name: 'Cam Ranh SAM', type: 'LAND_MILITARY', country: 'VIETNAM', radius: 3 },

  // Philippines
  { lat: 14.9, lon: 120.5, name: 'Zambales Radar', type: 'LAND_MILITARY', country: 'PHILIPPINES', radius: 2 },
  { lat: 15.5, lon: 120.0, name: 'Northern Luzon C2', type: 'LAND_MILITARY', country: 'PHILIPPINES', radius: 2 },

  // Taiwan
  { lat: 24.5, lon: 121.0, name: 'Taipei SAM Network', type: 'LAND_MILITARY', country: 'TAIWAN', radius: 5 },
  { lat: 22.8, lon: 120.5, name: 'Kaohsiung Radar', type: 'LAND_MILITARY', country: 'TAIWAN', radius: 3 },
  { lat: 23.5, lon: 121.5, name: 'East Coast Surveillance', type: 'LAND_MILITARY', country: 'TAIWAN', radius: 4 },
];

/**
 * Major shipping lanes
 */
export const SHIPPING_LANES: Array<{
  name: string;
  waypoints: Array<{ lat: number; lon: number }>;
  width: number; // Width in km
}> = [
  {
    name: 'Strait of Malacca to Hong Kong',
    waypoints: [
      { lat: 1.3, lon: 104.0 },   // Singapore
      { lat: 5.0, lon: 105.0 },   // Entry to SCS
      { lat: 10.0, lon: 110.0 },  // Central SCS
      { lat: 15.0, lon: 113.0 },  // Northern SCS
      { lat: 22.5, lon: 114.1 },  // Hong Kong
    ],
    width: 50,
  },
  {
    name: 'Taiwan Strait',
    waypoints: [
      { lat: 22.5, lon: 118.0 },  // South entrance
      { lat: 24.0, lon: 119.0 },  // Central
      { lat: 25.5, lon: 120.0 },  // North entrance
    ],
    width: 30,
  },
  {
    name: 'Luzon Strait',
    waypoints: [
      { lat: 18.0, lon: 120.0 },  // Philippines side
      { lat: 20.0, lon: 121.5 },  // Central passage
      { lat: 22.0, lon: 122.0 },  // Taiwan side
    ],
    width: 60,
  },
  {
    name: 'Spratly Islands Patrol',
    waypoints: [
      { lat: 8.0, lon: 112.0 },
      { lat: 10.0, lon: 114.0 },
      { lat: 12.0, lon: 116.0 },
      { lat: 10.0, lon: 118.0 },
      { lat: 8.0, lon: 115.0 },
    ],
    width: 40,
  },
];

/**
 * Open ocean zones (safe for maritime traffic)
 */
export const OCEAN_ZONES: GeoLocation[] = [
  { lat: 12.0, lon: 112.0, name: 'Central South China Sea', type: 'OCEAN', country: 'INTERNATIONAL', radius: 200 },
  { lat: 8.0, lon: 110.0, name: 'Southern SCS', type: 'OCEAN', country: 'INTERNATIONAL', radius: 150 },
  { lat: 16.0, lon: 115.0, name: 'Northern SCS', type: 'OCEAN', country: 'INTERNATIONAL', radius: 150 },
  { lat: 18.0, lon: 118.0, name: 'Philippine Sea West', type: 'OCEAN', country: 'INTERNATIONAL', radius: 100 },
  { lat: 20.0, lon: 125.0, name: 'Philippine Sea', type: 'OCEAN', country: 'INTERNATIONAL', radius: 200 },
];

/**
 * Simplified land polygons (approximate bounding boxes for major landmasses)
 * Used to ensure ships don't spawn on land
 */
export const LAND_MASSES: GeoPolygon[] = [
  {
    name: 'Hainan Island',
    isLand: true,
    points: [
      { lat: 18.2, lon: 108.6 },
      { lat: 20.2, lon: 108.6 },
      { lat: 20.2, lon: 111.0 },
      { lat: 18.2, lon: 111.0 },
    ],
  },
  {
    name: 'Vietnam Coast',
    isLand: true,
    points: [
      { lat: 8.5, lon: 104.0 },
      { lat: 23.5, lon: 104.0 },
      { lat: 23.5, lon: 108.5 },
      { lat: 8.5, lon: 108.5 },
    ],
  },
  {
    name: 'China Mainland Coast',
    isLand: true,
    points: [
      { lat: 20.0, lon: 108.5 },
      { lat: 25.0, lon: 108.5 },
      { lat: 25.0, lon: 122.0 },
      { lat: 20.0, lon: 122.0 },
    ],
  },
  {
    name: 'Taiwan',
    isLand: true,
    points: [
      { lat: 21.9, lon: 120.0 },
      { lat: 25.3, lon: 120.0 },
      { lat: 25.3, lon: 122.0 },
      { lat: 21.9, lon: 122.0 },
    ],
  },
  {
    name: 'Philippines (Luzon)',
    isLand: true,
    points: [
      { lat: 13.5, lon: 119.5 },
      { lat: 18.5, lon: 119.5 },
      { lat: 18.5, lon: 122.5 },
      { lat: 13.5, lon: 122.5 },
    ],
  },
  {
    name: 'Philippines (Palawan)',
    isLand: true,
    points: [
      { lat: 8.5, lon: 117.0 },
      { lat: 12.5, lon: 117.0 },
      { lat: 12.5, lon: 119.5 },
      { lat: 8.5, lon: 119.5 },
    ],
  },
  {
    name: 'Borneo (North)',
    isLand: true,
    points: [
      { lat: 4.0, lon: 108.0 },
      { lat: 7.5, lon: 108.0 },
      { lat: 7.5, lon: 119.0 },
      { lat: 4.0, lon: 119.0 },
    ],
  },
];

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export function isPointInPolygon(lat: number, lon: number, polygon: GeoPolygon): boolean {
  const points = polygon.points;
  let inside = false;

  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].lon, yi = points[i].lat;
    const xj = points[j].lon, yj = points[j].lat;

    const intersect = ((yi > lat) !== (yj > lat))
        && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Check if a point is on land
 */
export function isOnLand(lat: number, lon: number): boolean {
  for (const landmass of LAND_MASSES) {
    if (isPointInPolygon(lat, lon, landmass)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a point is in water (not on any landmass)
 */
export function isInWater(lat: number, lon: number): boolean {
  return !isOnLand(lat, lon);
}

/**
 * Calculate distance between two points in km (Haversine formula)
 */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get a random point within a radius of a location
 */
export function getRandomPointNear(location: GeoLocation, maxRadius?: number): { lat: number; lon: number } {
  const radius = maxRadius ?? location.radius ?? 10;
  const radiusDeg = radius / 111; // Approximate km to degrees

  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radiusDeg;

  return {
    lat: location.lat + distance * Math.cos(angle),
    lon: location.lon + distance * Math.sin(angle),
  };
}

/**
 * Get a random location for an entity based on its domain
 */
export function getLocationForDomain(domain: EntityDomain, affiliation: 'FRIENDLY' | 'HOSTILE' | 'NEUTRAL'): {
  lat: number;
  lon: number;
  nearLocation?: string;
} {
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    attempts++;

    if (domain === 'MARITIME') {
      // Ships must be in water
      const locationSource = Math.random();

      if (locationSource < 0.3) {
        // Near a port/naval base
        const bases = affiliation === 'HOSTILE'
          ? NAVAL_BASES.filter(b => b.country === 'CHINA')
          : affiliation === 'FRIENDLY'
            ? NAVAL_BASES.filter(b => ['USA', 'JAPAN', 'TAIWAN', 'PHILIPPINES'].includes(b.country))
            : NAVAL_BASES; // Neutral can be anywhere

        const base = bases[Math.floor(Math.random() * bases.length)];
        const point = getRandomPointNear(base, 30); // Within 30km of port

        if (isInWater(point.lat, point.lon)) {
          return { ...point, nearLocation: base.name };
        }
      } else if (locationSource < 0.6) {
        // Along a shipping lane
        const lane = SHIPPING_LANES[Math.floor(Math.random() * SHIPPING_LANES.length)];
        const segmentIdx = Math.floor(Math.random() * (lane.waypoints.length - 1));
        const start = lane.waypoints[segmentIdx];
        const end = lane.waypoints[segmentIdx + 1];

        const t = Math.random();
        const lat = start.lat + t * (end.lat - start.lat);
        const lon = start.lon + t * (end.lon - start.lon);

        // Add some lateral offset
        const offset = (Math.random() - 0.5) * (lane.width / 111);

        const point = { lat: lat + offset, lon: lon + offset };
        if (isInWater(point.lat, point.lon)) {
          return { ...point, nearLocation: lane.name };
        }
      } else {
        // Open ocean
        const zone = OCEAN_ZONES[Math.floor(Math.random() * OCEAN_ZONES.length)];
        const point = getRandomPointNear(zone);

        if (isInWater(point.lat, point.lon)) {
          return { ...point, nearLocation: zone.name };
        }
      }
    } else if (domain === 'LAND') {
      // Land units must be on land
      const sites = affiliation === 'HOSTILE'
        ? LAND_MILITARY_SITES.filter(s => ['CHINA', 'VIETNAM'].includes(s.country))
        : affiliation === 'FRIENDLY'
          ? LAND_MILITARY_SITES.filter(s => ['USA', 'JAPAN', 'TAIWAN', 'PHILIPPINES'].includes(s.country))
          : LAND_MILITARY_SITES;

      if (sites.length === 0) continue;

      const site = sites[Math.floor(Math.random() * sites.length)];
      const point = getRandomPointNear(site, 20);

      if (isOnLand(point.lat, point.lon)) {
        return { ...point, nearLocation: site.name };
      }
    } else if (domain === 'AIR') {
      // Aircraft can be anywhere, but often near airfields or over ocean
      const locationSource = Math.random();

      if (locationSource < 0.4) {
        // Near an airfield
        const airfields = affiliation === 'HOSTILE'
          ? AIRFIELDS.filter(a => a.country === 'CHINA')
          : affiliation === 'FRIENDLY'
            ? AIRFIELDS.filter(a => ['USA', 'JAPAN', 'TAIWAN', 'PHILIPPINES'].includes(a.country))
            : AIRFIELDS;

        const airfield = airfields[Math.floor(Math.random() * airfields.length)];
        const point = getRandomPointNear(airfield, 100); // Aircraft can be 100km from base

        return { ...point, nearLocation: airfield.name };
      } else {
        // Flying over ocean or patrol area
        const zone = OCEAN_ZONES[Math.floor(Math.random() * OCEAN_ZONES.length)];
        const point = getRandomPointNear(zone);
        return { ...point, nearLocation: zone.name };
      }
    }
  }

  // Fallback: return a point in the central South China Sea
  return {
    lat: 12.0 + (Math.random() - 0.5) * 5,
    lon: 114.0 + (Math.random() - 0.5) * 5,
    nearLocation: 'Central South China Sea',
  };
}

/**
 * Get appropriate altitude for entity domain
 */
export function getAltitudeForDomain(domain: EntityDomain, platformType?: string): number {
  switch (domain) {
    case 'AIR':
      // Aircraft altitude varies by type
      if (platformType?.includes('UAV') || platformType?.includes('Drone')) {
        return 3000 + Math.random() * 5000; // 3,000-8,000m
      } else if (platformType?.includes('Fighter') || platformType?.includes('Strike')) {
        return 8000 + Math.random() * 7000; // 8,000-15,000m
      } else if (platformType?.includes('Bomber')) {
        return 10000 + Math.random() * 5000; // 10,000-15,000m
      } else if (platformType?.includes('Helicopter')) {
        return 100 + Math.random() * 1500; // 100-1,600m
      } else if (platformType?.includes('Tanker') || platformType?.includes('AWACS')) {
        return 8000 + Math.random() * 4000; // 8,000-12,000m
      }
      return 5000 + Math.random() * 10000; // Default: 5,000-15,000m

    case 'MARITIME':
      return 0; // Sea level

    case 'LAND':
      return 0; // Ground level (could add terrain elevation later)

    default:
      return 0;
  }
}

/**
 * Get appropriate speed for entity domain (in knots)
 */
export function getSpeedForDomain(domain: EntityDomain, platformType?: string): number {
  switch (domain) {
    case 'AIR':
      if (platformType?.includes('Helicopter')) {
        return 80 + Math.random() * 80; // 80-160 knots
      } else if (platformType?.includes('UAV') || platformType?.includes('Drone')) {
        return 100 + Math.random() * 150; // 100-250 knots
      } else if (platformType?.includes('Fighter') || platformType?.includes('Strike')) {
        return 400 + Math.random() * 300; // 400-700 knots (cruise)
      } else if (platformType?.includes('Bomber')) {
        return 400 + Math.random() * 200; // 400-600 knots
      }
      return 300 + Math.random() * 300; // Default: 300-600 knots

    case 'MARITIME':
      if (platformType?.includes('Cargo') || platformType?.includes('Tanker')) {
        return 12 + Math.random() * 8; // 12-20 knots
      } else if (platformType?.includes('Patrol') || platformType?.includes('Corvette')) {
        return 15 + Math.random() * 15; // 15-30 knots
      } else if (platformType?.includes('Destroyer') || platformType?.includes('Frigate')) {
        return 18 + Math.random() * 12; // 18-30 knots
      } else if (platformType?.includes('Carrier') || platformType?.includes('Cruiser')) {
        return 20 + Math.random() * 15; // 20-35 knots
      }
      return 15 + Math.random() * 15; // Default: 15-30 knots

    case 'LAND':
      // Land units are mostly stationary or slow-moving
      if (platformType?.includes('Mobile') || platformType?.includes('TEL')) {
        return Math.random() * 30; // 0-30 knots (usually stationary)
      }
      return 0; // Stationary

    default:
      return 0;
  }
}
