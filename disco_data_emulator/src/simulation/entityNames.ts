/**
 * Entity Name Generator
 *
 * Generates realistic entity names based on:
 * - Domain (AIR, MARITIME, LAND)
 * - Affiliation (FRIENDLY, HOSTILE, NEUTRAL, UNKNOWN)
 * - Platform type
 * - Country/nationality
 *
 * This ensures names match the entity's domain:
 * - Navy ship names for maritime entities (USS, PLAN, etc.)
 * - Air force callsigns and aircraft designations for air entities
 * - Army unit designations for land entities
 */

import { EntityDomain } from './geographicData.js';

export type Affiliation = 'FRIENDLY' | 'HOSTILE' | 'NEUTRAL' | 'UNKNOWN';

/**
 * Platform definitions by domain and affiliation
 */
interface PlatformDef {
  type: string;
  prefix: string;
  names: string[];
  emitterTypes: Array<'RADAR' | 'COMMUNICATIONS' | 'JAMMER' | 'MISSILE'>;
  hullNumbers?: string[];
}

// =====================================================
// MARITIME PLATFORMS
// =====================================================

const FRIENDLY_MARITIME_PLATFORMS: PlatformDef[] = [
  {
    type: 'Arleigh Burke-class Destroyer',
    prefix: 'USS',
    names: ['Benfold', 'Milius', 'McCampbell', 'Halsey', 'Wayne E. Meyer', 'Stockdale', 'Chung-Hoon', 'Preble', 'Kidd', 'Pinckney'],
    hullNumbers: ['DDG-65', 'DDG-69', 'DDG-85', 'DDG-97', 'DDG-108', 'DDG-106', 'DDG-93', 'DDG-88', 'DDG-100', 'DDG-91'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS'],
  },
  {
    type: 'Ticonderoga-class Cruiser',
    prefix: 'USS',
    names: ['Shiloh', 'Antietam', 'Chancellorsville', 'Mobile Bay', 'Lake Erie'],
    hullNumbers: ['CG-67', 'CG-54', 'CG-62', 'CG-53', 'CG-70'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS', 'MISSILE'],
  },
  {
    type: 'Nimitz-class Carrier',
    prefix: 'USS',
    names: ['Ronald Reagan', 'Carl Vinson', 'Abraham Lincoln', 'Theodore Roosevelt', 'George Washington'],
    hullNumbers: ['CVN-76', 'CVN-70', 'CVN-72', 'CVN-71', 'CVN-73'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS'],
  },
  {
    type: 'Virginia-class Submarine',
    prefix: 'USS',
    names: ['Hawaii', 'North Carolina', 'California', 'Mississippi', 'Minnesota'],
    hullNumbers: ['SSN-776', 'SSN-777', 'SSN-781', 'SSN-782', 'SSN-783'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS'],
  },
  {
    type: 'Oliver Hazard Perry-class Frigate',
    prefix: 'ROCS',
    names: ['Feng Jia', 'Ji Long', 'Cheng Kung', 'Tian Dan', 'Ban Chao'],
    hullNumbers: ['PFG-1101', 'PFG-1103', 'PFG-1105', 'PFG-1110', 'PFG-1108'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS'],
  },
  {
    type: 'Kongou-class Destroyer',
    prefix: 'JS',
    names: ['Kongou', 'Kirishima', 'Myoukou', 'Choukai'],
    hullNumbers: ['DDG-173', 'DDG-174', 'DDG-175', 'DDG-176'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS', 'MISSILE'],
  },
];

const HOSTILE_MARITIME_PLATFORMS: PlatformDef[] = [
  {
    type: 'Type 055 Destroyer',
    prefix: 'PLANS',
    names: ['Nanchang', 'Lhasa', 'Dalian', 'Wuxi', 'Anshan', 'Yan\'an', 'Zunyi', 'Guiyang'],
    hullNumbers: ['101', '102', '105', '106', '103', '104', '107', '108'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS', 'MISSILE'],
  },
  {
    type: 'Type 052D Destroyer',
    prefix: 'PLANS',
    names: ['Kunming', 'Changsha', 'Hefei', 'Yinchuan', 'Xiamen', 'Guiyang', 'Nanning', 'Zibo'],
    hullNumbers: ['172', '173', '174', '175', '154', '119', '162', '163'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS', 'MISSILE'],
  },
  {
    type: 'Type 054A Frigate',
    prefix: 'PLANS',
    names: ['Xuzhou', 'Huanggang', 'Linyi', 'Handan', 'Yiyang', 'Changzhou', 'Hengyang', 'Jingzhou'],
    hullNumbers: ['530', '577', '547', '579', '548', '549', '568', '532'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS'],
  },
  {
    type: 'Type 056 Corvette',
    prefix: 'PLANS',
    names: ['Bengbu', 'Huizhou', 'Qinzhou', 'Jieyang', 'Wuzhou', 'Meizhou', 'Baise'],
    hullNumbers: ['582', '596', '597', '587', '594', '595', '585'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS'],
  },
  {
    type: 'Liaoning-class Carrier',
    prefix: 'PLANS',
    names: ['Liaoning', 'Shandong', 'Fujian'],
    hullNumbers: ['16', '17', '18'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS'],
  },
  {
    type: 'Type 093 Submarine',
    prefix: 'PLANS',
    names: ['Shang-1', 'Shang-2', 'Shang-3', 'Shang-4'],
    hullNumbers: ['409', '410', '411', '412'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS'],
  },
  {
    type: 'Type 022 Missile Boat',
    prefix: 'PLANS',
    names: ['Houbei-1', 'Houbei-2', 'Houbei-3', 'Houbei-4', 'Houbei-5'],
    hullNumbers: ['2201', '2202', '2203', '2204', '2205'],
    emitterTypes: ['RADAR', 'MISSILE'],
  },
];

const NEUTRAL_MARITIME_PLATFORMS: PlatformDef[] = [
  {
    type: 'Container Ship',
    prefix: 'MV',
    names: ['Ever Given', 'MSC Oscar', 'OOCL Hong Kong', 'COSCO Shipping', 'Maersk Alabama', 'Yang Ming Unity', 'Hapag-Lloyd Express'],
    emitterTypes: ['COMMUNICATIONS', 'RADAR'],
  },
  {
    type: 'Oil Tanker',
    prefix: 'MT',
    names: ['Seawise Giant', 'Jahre Viking', 'Knock Nevis', 'Pacific Aurora', 'Atlantic Star', 'Gulf Harmony'],
    emitterTypes: ['COMMUNICATIONS', 'RADAR'],
  },
  {
    type: 'Bulk Carrier',
    prefix: 'MV',
    names: ['Vale Brasil', 'Berge Stahl', 'China Fortune', 'Pacific Voyager', 'Sea Trader', 'Ocean Pioneer'],
    emitterTypes: ['COMMUNICATIONS', 'RADAR'],
  },
  {
    type: 'Fishing Vessel',
    prefix: 'FV',
    names: ['Lucky Dragon', 'Pacific Catch', 'Sea Harvest', 'Morning Star', 'Blue Fin', 'Ocean Spirit'],
    emitterTypes: ['COMMUNICATIONS'],
  },
];

// =====================================================
// AIR PLATFORMS
// =====================================================

const FRIENDLY_AIR_PLATFORMS: PlatformDef[] = [
  {
    type: 'F/A-18E/F Super Hornet',
    prefix: '',
    names: ['HAMMER', 'VIPER', 'KNIGHT', 'RAZOR', 'REAPER', 'DEMON', 'IRON', 'COBRA', 'PHANTOM', 'STRIKER'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS', 'JAMMER'],
  },
  {
    type: 'F-35C Lightning II',
    prefix: '',
    names: ['SHADOW', 'GHOST', 'STEALTH', 'RAPTOR', 'FALCON', 'HAWK', 'EAGLE', 'THUNDER', 'STORM', 'BLADE'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS'],
  },
  {
    type: 'E-2D Hawkeye',
    prefix: '',
    names: ['TIGERTAIL', 'CLOSEOUT', 'WALLBANGER', 'SCREWTOP', 'LIBERTY', 'OVERWATCH'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS'],
  },
  {
    type: 'EA-18G Growler',
    prefix: '',
    names: ['SPARK', 'VOLTAGE', 'ZAP', 'STATIC', 'SURGE', 'FLASH', 'ARC', 'BOLT'],
    emitterTypes: ['RADAR', 'JAMMER', 'COMMUNICATIONS'],
  },
  {
    type: 'P-8A Poseidon',
    prefix: '',
    names: ['TRIDENT', 'NEPTUNE', 'SEAWATCH', 'OVERCAST', 'MARINER', 'SEEKER'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS'],
  },
  {
    type: 'MQ-4C Triton UAV',
    prefix: '',
    names: ['TRITON-1', 'TRITON-2', 'TRITON-3', 'TRITON-4'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS'],
  },
  {
    type: 'KC-135 Stratotanker',
    prefix: '',
    names: ['TEXACO', 'SHELL', 'ARCO', 'MOBIL', 'ESSO', 'PETROL'],
    emitterTypes: ['COMMUNICATIONS'],
  },
  {
    type: 'F-16V Fighting Falcon',
    prefix: 'ROCAF',
    names: ['TIGER', 'DRAGON', 'PHOENIX', 'VIPER', 'THUNDER'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS'],
  },
  {
    type: 'F-15J Eagle',
    prefix: 'JASDF',
    names: ['SAMURAI', 'NINJA', 'SHOGUN', 'RONIN', 'KATANA'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS'],
  },
];

const HOSTILE_AIR_PLATFORMS: PlatformDef[] = [
  {
    type: 'J-20 Mighty Dragon',
    prefix: 'PLAAF',
    names: ['RED DRAGON', 'BLACK DRAGON', 'STORM DRAGON', 'IRON DRAGON', 'FIRE DRAGON'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS'],
  },
  {
    type: 'J-16 Strike Fighter',
    prefix: 'PLAAF',
    names: ['FLANKER-1', 'FLANKER-2', 'FLANKER-3', 'FLANKER-4', 'FLANKER-5'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS', 'JAMMER'],
  },
  {
    type: 'J-11B Fighter',
    prefix: 'PLAAF',
    names: ['SHENYANG-1', 'SHENYANG-2', 'SHENYANG-3', 'SHENYANG-4'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS'],
  },
  {
    type: 'H-6K Bomber',
    prefix: 'PLAAF',
    names: ['BADGER-1', 'BADGER-2', 'BADGER-3', 'BADGER-4', 'BADGER-5', 'BADGER-6'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS', 'MISSILE'],
  },
  {
    type: 'Y-8 Maritime Patrol',
    prefix: 'PLAN',
    names: ['COOT-1', 'COOT-2', 'COOT-3', 'COOT-4'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS'],
  },
  {
    type: 'KJ-500 AWACS',
    prefix: 'PLAAF',
    names: ['MAINRING-1', 'MAINRING-2', 'MAINRING-3'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS'],
  },
  {
    type: 'WZ-7 Soaring Dragon UAV',
    prefix: 'PLAAF',
    names: ['DRAGON EYE-1', 'DRAGON EYE-2', 'DRAGON EYE-3', 'DRAGON EYE-4'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS'],
  },
  {
    type: 'Z-20 Helicopter',
    prefix: 'PLAN',
    names: ['HARBIN-1', 'HARBIN-2', 'HARBIN-3', 'HARBIN-4', 'HARBIN-5'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS'],
  },
];

const NEUTRAL_AIR_PLATFORMS: PlatformDef[] = [
  {
    type: 'Boeing 777',
    prefix: '',
    names: ['CPA881', 'SIA318', 'EVA052', 'JAL066', 'ANA912', 'VNA730'],
    emitterTypes: ['COMMUNICATIONS'],
  },
  {
    type: 'Airbus A350',
    prefix: '',
    names: ['CX256', 'SQ322', 'BR891', 'JL045', 'NH802', 'VN520'],
    emitterTypes: ['COMMUNICATIONS'],
  },
];

// =====================================================
// LAND PLATFORMS
// =====================================================

const FRIENDLY_LAND_PLATFORMS: PlatformDef[] = [
  {
    type: 'AN/TPS-80 G/ATOR Radar',
    prefix: 'USMC',
    names: ['WATCHDOG-1', 'WATCHDOG-2', 'WATCHDOG-3'],
    emitterTypes: ['RADAR'],
  },
  {
    type: 'Patriot PAC-3 Battery',
    prefix: 'USA',
    names: ['PATRIOT-ALPHA', 'PATRIOT-BRAVO', 'PATRIOT-CHARLIE', 'PATRIOT-DELTA'],
    emitterTypes: ['RADAR', 'MISSILE'],
  },
  {
    type: 'AN/TPY-2 THAAD Radar',
    prefix: 'USA',
    names: ['THAAD-1', 'THAAD-2'],
    emitterTypes: ['RADAR'],
  },
  {
    type: 'Sky Bow III SAM',
    prefix: 'ROCA',
    names: ['TIEN KUNG-1', 'TIEN KUNG-2', 'TIEN KUNG-3', 'TIEN KUNG-4'],
    emitterTypes: ['RADAR', 'MISSILE'],
  },
  {
    type: 'Type 03 SAM',
    prefix: 'JGSDF',
    names: ['CHU-SAM-A', 'CHU-SAM-B', 'CHU-SAM-C'],
    emitterTypes: ['RADAR', 'MISSILE'],
  },
  {
    type: 'Mobile C2 Node',
    prefix: 'USA',
    names: ['TOC-ALPHA', 'TOC-BRAVO', 'COMMAND-1', 'COMMAND-2'],
    emitterTypes: ['COMMUNICATIONS'],
  },
];

const HOSTILE_LAND_PLATFORMS: PlatformDef[] = [
  {
    type: 'HQ-9 SAM Battery',
    prefix: 'PLA',
    names: ['RED FLAG-1', 'RED FLAG-2', 'RED FLAG-3', 'RED FLAG-4', 'RED FLAG-5'],
    emitterTypes: ['RADAR', 'MISSILE'],
  },
  {
    type: 'S-400 SAM Battery',
    prefix: 'PLA',
    names: ['GROWLER-1', 'GROWLER-2', 'GROWLER-3'],
    emitterTypes: ['RADAR', 'MISSILE'],
  },
  {
    type: 'Type 305B Radar',
    prefix: 'PLA',
    names: ['TALL KING-1', 'TALL KING-2', 'TALL KING-3', 'TALL KING-4'],
    emitterTypes: ['RADAR'],
  },
  {
    type: 'YLC-8B AESA Radar',
    prefix: 'PLA',
    names: ['DRAGON EYE-1', 'DRAGON EYE-2', 'DRAGON EYE-3'],
    emitterTypes: ['RADAR'],
  },
  {
    type: 'DF-21D ASBM TEL',
    prefix: 'PLARF',
    names: ['CARRIER KILLER-1', 'CARRIER KILLER-2', 'CARRIER KILLER-3'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS', 'MISSILE'],
  },
  {
    type: 'DF-26 IRBM TEL',
    prefix: 'PLARF',
    names: ['GUAM KILLER-1', 'GUAM KILLER-2', 'GUAM KILLER-3'],
    emitterTypes: ['RADAR', 'COMMUNICATIONS', 'MISSILE'],
  },
  {
    type: 'Coastal Defense Radar',
    prefix: 'PLA',
    names: ['SHORE WATCH-1', 'SHORE WATCH-2', 'SHORE WATCH-3', 'SHORE WATCH-4'],
    emitterTypes: ['RADAR'],
  },
  {
    type: 'C4I Node',
    prefix: 'PLA',
    names: ['COMMAND POST-A', 'COMMAND POST-B', 'COMMAND POST-C', 'COMMAND POST-D'],
    emitterTypes: ['COMMUNICATIONS'],
  },
];

const NEUTRAL_LAND_PLATFORMS: PlatformDef[] = [
  {
    type: 'Airport Surveillance Radar',
    prefix: '',
    names: ['MANILA-ASR', 'TAIPEI-ASR', 'HONG KONG-ASR', 'SINGAPORE-ASR'],
    emitterTypes: ['RADAR'],
  },
  {
    type: 'Maritime VTS Radar',
    prefix: '',
    names: ['STRAITS-VTS', 'LUZON-VTS', 'TAIWAN-VTS', 'HAINAN-VTS'],
    emitterTypes: ['RADAR'],
  },
  {
    type: 'Cell Tower',
    prefix: '',
    names: ['COMM-SITE-1', 'COMM-SITE-2', 'COMM-SITE-3', 'COMM-SITE-4'],
    emitterTypes: ['COMMUNICATIONS'],
  },
];

/**
 * Get platforms for a specific domain and affiliation
 */
function getPlatformsForDomainAndAffiliation(domain: EntityDomain, affiliation: Affiliation): PlatformDef[] {
  switch (domain) {
    case 'MARITIME':
      switch (affiliation) {
        case 'FRIENDLY':
          return FRIENDLY_MARITIME_PLATFORMS;
        case 'HOSTILE':
          return HOSTILE_MARITIME_PLATFORMS;
        case 'NEUTRAL':
          return NEUTRAL_MARITIME_PLATFORMS;
        default:
          return [...FRIENDLY_MARITIME_PLATFORMS, ...HOSTILE_MARITIME_PLATFORMS];
      }
    case 'AIR':
      switch (affiliation) {
        case 'FRIENDLY':
          return FRIENDLY_AIR_PLATFORMS;
        case 'HOSTILE':
          return HOSTILE_AIR_PLATFORMS;
        case 'NEUTRAL':
          return NEUTRAL_AIR_PLATFORMS;
        default:
          return [...FRIENDLY_AIR_PLATFORMS, ...HOSTILE_AIR_PLATFORMS];
      }
    case 'LAND':
      switch (affiliation) {
        case 'FRIENDLY':
          return FRIENDLY_LAND_PLATFORMS;
        case 'HOSTILE':
          return HOSTILE_LAND_PLATFORMS;
        case 'NEUTRAL':
          return NEUTRAL_LAND_PLATFORMS;
        default:
          return [...FRIENDLY_LAND_PLATFORMS, ...HOSTILE_LAND_PLATFORMS];
      }
    default:
      return [];
  }
}

/**
 * Generate entity name and metadata
 */
export interface EntityNameResult {
  entityName: string;       // Full display name (e.g., "USS Benfold (DDG-65)")
  platformType: string;     // Platform class (e.g., "Arleigh Burke-class Destroyer")
  callsign: string;         // Short identifier (e.g., "BENFOLD" or "HAMMER-1")
  emitterType: 'RADAR' | 'COMMUNICATIONS' | 'JAMMER' | 'MISSILE';
  nationality: string;
}

/**
 * Track used names to avoid duplicates
 */
const usedNames = new Set<string>();

/**
 * Generate a unique entity name based on domain and affiliation
 */
export function generateEntityName(
  domain: EntityDomain,
  affiliation: Affiliation
): EntityNameResult {
  const platforms = getPlatformsForDomainAndAffiliation(domain, affiliation);

  if (platforms.length === 0) {
    // Fallback for unknown combinations
    return {
      entityName: `UNKNOWN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      platformType: 'Unknown Platform',
      callsign: 'UNKNOWN',
      emitterType: 'RADAR',
      nationality: 'UNKNOWN',
    };
  }

  // Try to find an unused name
  let attempts = 0;
  const maxAttempts = 50;

  while (attempts < maxAttempts) {
    attempts++;

    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const nameIdx = Math.floor(Math.random() * platform.names.length);
    const name = platform.names[nameIdx];

    // Build the full entity name
    let entityName: string;
    let callsign: string;

    if (platform.hullNumbers && platform.hullNumbers[nameIdx]) {
      // Naval vessel with hull number
      entityName = platform.prefix
        ? `${platform.prefix} ${name} (${platform.hullNumbers[nameIdx]})`
        : `${name} (${platform.hullNumbers[nameIdx]})`;
      callsign = name.toUpperCase();
    } else if (domain === 'AIR' && !platform.prefix) {
      // Aircraft with callsign
      const flightNum = Math.floor(Math.random() * 99) + 1;
      entityName = `${name}-${flightNum}`;
      callsign = `${name}-${flightNum}`;
    } else {
      // Other platforms
      entityName = platform.prefix ? `${platform.prefix} ${name}` : name;
      callsign = name.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }

    // Check if this name is already used
    if (!usedNames.has(entityName)) {
      usedNames.add(entityName);

      // Determine nationality from prefix
      let nationality = 'UNKNOWN';
      if (platform.prefix.includes('USS') || platform.prefix.includes('USA') || platform.prefix.includes('USMC')) {
        nationality = 'USA';
      } else if (platform.prefix.includes('PLANS') || platform.prefix.includes('PLAAF') ||
                 platform.prefix.includes('PLA') || platform.prefix.includes('PLARF')) {
        nationality = 'CHINA';
      } else if (platform.prefix.includes('ROCS') || platform.prefix.includes('ROCAF') || platform.prefix.includes('ROCA')) {
        nationality = 'TAIWAN';
      } else if (platform.prefix.includes('JS') || platform.prefix.includes('JASDF') || platform.prefix.includes('JGSDF')) {
        nationality = 'JAPAN';
      } else if (platform.prefix.includes('MV') || platform.prefix.includes('MT') || platform.prefix.includes('FV')) {
        nationality = 'COMMERCIAL';
      } else if (domain === 'AIR' && affiliation === 'NEUTRAL') {
        // Commercial aircraft - use airline codes
        if (name.startsWith('CPA') || name.startsWith('CX')) nationality = 'HONG KONG';
        else if (name.startsWith('SIA') || name.startsWith('SQ')) nationality = 'SINGAPORE';
        else if (name.startsWith('EVA') || name.startsWith('BR')) nationality = 'TAIWAN';
        else if (name.startsWith('JAL') || name.startsWith('JL') || name.startsWith('ANA') || name.startsWith('NH')) nationality = 'JAPAN';
        else if (name.startsWith('VNA') || name.startsWith('VN')) nationality = 'VIETNAM';
        else nationality = 'COMMERCIAL';
      }

      return {
        entityName,
        platformType: platform.type,
        callsign,
        emitterType: platform.emitterTypes[Math.floor(Math.random() * platform.emitterTypes.length)],
        nationality,
      };
    }
  }

  // If all names are used, generate a random suffix
  const platform = platforms[Math.floor(Math.random() * platforms.length)];
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const entityName = platform.prefix
    ? `${platform.prefix} UNIT-${suffix}`
    : `UNIT-${suffix}`;

  usedNames.add(entityName);

  return {
    entityName,
    platformType: platform.type,
    callsign: `UNIT-${suffix}`,
    emitterType: platform.emitterTypes[Math.floor(Math.random() * platform.emitterTypes.length)],
    nationality: 'UNKNOWN',
  };
}

/**
 * Reset used names (for testing or scenario restart)
 */
export function resetUsedNames(): void {
  usedNames.clear();
}

/**
 * Get count of available names by domain and affiliation
 */
export function getAvailableNameCount(domain: EntityDomain, affiliation: Affiliation): number {
  const platforms = getPlatformsForDomainAndAffiliation(domain, affiliation);
  return platforms.reduce((sum, p) => sum + p.names.length, 0);
}
