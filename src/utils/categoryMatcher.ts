/**
 * categoryMatcher.ts
 * High-precision, zero-confusion automotive category matcher for spare parts.
 * Disambiguates compound categories (e.g. "Suspension & Brakes", "Lights & Electricals", "Interior & Wheels")
 * and handles singular/plural stemming, admin dynamic categories, and search filters.
 */

// Comprehensive domain keywords for precision matching
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  brakes: [
    'brake', 'brakes', 'caliper', 'calipers', 'disc', 'discs', 'rotor', 'rotors',
    'pad', 'pads', 'drum', 'drums', 'booster', 'abs', 'master cylinder', 'brake shoe',
    'shoes', 'handbrake', 'brake pump', 'brake line'
  ],
  suspension: [
    'suspension', 'shock', 'shocker', 'shockers', 'absorber', 'absorbers', 'strut',
    'struts', 'spring', 'springs', 'coil', 'coils', 'arm', 'arms', 'control arm',
    'lower arm', 'upper arm', 'bush', 'bushes', 'bushing', 'bushings', 'stabilizer',
    'link', 'links', 'sway bar', 'anti roll', 'rack', 'steering rack', 'tie rod',
    'ball joint', 'ball joints', 'axle', 'axles', 'subframe', 'hub bearing'
  ],
  lights: [
    'light', 'lights', 'lamp', 'lamps', 'headlight', 'headlights', 'headlamp', 'headlamps',
    'taillight', 'taillights', 'taillamp', 'taillamps', 'tail light', 'tail lights',
    'fog', 'fog lamp', 'foglamp', 'drl', 'indicator', 'indicators', 'blinker', 'blinkers',
    'bulb', 'bulbs', 'led', 'reflector', 'reflectors', 'backlight', 'turn signal'
  ],
  electrical: [
    'electrical', 'electricals', 'electric', 'battery', 'batteries', 'alternator',
    'dynamo', 'starter', 'starter motor', 'wiring', 'harness', 'wire', 'fuse',
    'fuse box', 'fuses', 'relay', 'relays', 'ecu', 'ecm', 'bcm', 'sensor', 'sensors',
    'cluster', 'speedometer', 'meter', 'horn', 'horns', 'key fob', 'immobilizer',
    'switch', 'switches', 'power window switch', 'wiper motor'
  ],
  wheels: [
    'wheel', 'wheels', 'tyre', 'tyres', 'tire', 'tires', 'alloy', 'alloys', 'rim',
    'rims', 'spare tyre', 'spare wheel', 'hub', 'wheel cap', 'lug nut'
  ],
  interior: [
    'interior', 'seat', 'seats', 'seat cover', 'covers', 'dashboard', 'steering wheel',
    'mat', 'mats', 'floor mat', 'console', 'armrest', 'infotainment', 'stereo', 'audio',
    'speaker', 'speakers', 'music system', 'door pad', 'roof lining', 'sun visor',
    'ac vent', 'air vent', 'parcel tray'
  ],
  filters: [
    'filter', 'filters', 'oil filter', 'air filter', 'cabin filter', 'fuel filter',
    'ac filter', 'service kit', 'diesel filter', 'filter kit'
  ],
  exhaust: [
    'exhaust', 'silencer', 'silencers', 'muffler', 'mufflers', 'catalytic',
    'catalytic converter', 'tailpipe', 'dpf', 'exhaust pipe', 'manifold', 'emission'
  ],
  cooling: [
    'ac', 'cooling', 'air condition', 'compressor', 'condenser', 'radiator',
    'cooling fan', 'radiator fan', 'fan assembly', 'coolant', 'intercooler',
    'thermostat', 'blower', 'blower motor', 'heater', 'heater core', 'expansion valve'
  ],
  engine: [
    'engine', 'motor', 'piston', 'pistons', 'cylinder', 'cylinder head', 'head gasket',
    'crankshaft', 'camshaft', 'timing belt', 'timing chain', 'gasket', 'valve', 'valves',
    'engine block', 'oil pump', 'sump', 'connecting rod', 'manifold', 'spark plug',
    'engine mounting', 'engine mount', 'intake'
  ],
  turbo: [
    'turbo', 'turbocharger', 'intercooler', 'fuel injector', 'fuel injectors', 'injector',
    'injectors', 'fuel pump', 'high pressure pump', 'common rail', 'throttle body'
  ],
  transmission: [
    'transmission', 'gearbox', 'gear', 'gears', 'clutch', 'clutch plate', 'pressure plate',
    'flywheel', 'clutch kit', 'release bearing', 'shifter', 'gear lever', 'driveshaft',
    'propeller shaft', 'differential', 'cv joint'
  ],
  mirrors: [
    'mirror', 'mirrors', 'orvm', 'orvms', 'side mirror', 'side mirrors', 'rearview',
    'rearview mirror', 'door mirror', 'glass', 'windshield', 'windscreen', 'window glass'
  ],
  oils: [
    'oil', 'oils', 'engine oil', 'motor oil', 'lubricant', 'lubricants', 'brake fluid',
    'gear oil', 'coolant', 'transmission fluid', 'grease', 'synthetic oil'
  ],
  body: [
    'body', 'bumper', 'bumpers', 'bonnet', 'hood', 'fender', 'fenders', 'door',
    'doors', 'grille', 'grill', 'boot', 'boot lid', 'tailgate', 'dickey', 'dicky',
    'quarter panel', 'running board', 'fender lining', 'mudguard', 'mud flap'
  ]
};

// Words to ignore during tokenization
const STOP_WORDS = new Set(['and', '&', 'or', 'the', 'for', 'with', 'in', 'of', 'to', 'a', 'an', 'part', 'parts', 'auto', 'car', 'cars']);

/**
 * Normalizes a word to its base singular form.
 */
function getBaseWord(word: string): string {
  if (!word || word.length < 3) return word;
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y'; // batteries -> battery
  if (word.endsWith('es') && (word.endsWith('shes') || word.endsWith('ches') || word.endsWith('xes'))) {
    return word.slice(0, -2); // bushes -> bush
  }
  if (word.endsWith('s') && !word.endsWith('ss')) {
    return word.slice(0, -1); // filters -> filter, brakes -> brake
  }
  return word;
}

/**
 * Normalizes text by removing special punctuation and converting to lowercase base tokens.
 */
function cleanTokens(str: string): string[] {
  if (!str) return [];
  const words = str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

  const result: string[] = [];
  for (const w of words) {
    result.push(w);
    const base = getBaseWord(w);
    if (base !== w) {
      result.push(base);
    }
  }
  return result;
}

/**
 * Finds the primary domain for a given category name (e.g. "Brakes" -> "brakes", "Suspension & Steering" -> "suspension")
 */
function findDomain(categoryName: string): string | null {
  const norm = categoryName.toLowerCase();
  if (norm.includes('brake')) return 'brakes';
  if (norm.includes('suspension') || norm.includes('steering')) return 'suspension';
  if (norm.includes('light') || norm.includes('lamp') || norm.includes('indicator')) return 'lights';
  if (norm.includes('electric') || norm.includes('battery')) return 'electrical';
  if (norm.includes('wheel') || norm.includes('tyre') || norm.includes('tire') || norm.includes('alloy') || norm.includes('rim')) return 'wheels';
  if (norm.includes('filter')) return 'filters';
  if (norm.includes('exhaust') || norm.includes('silencer') || norm.includes('muffler')) return 'exhaust';
  if (norm.includes('ac') || norm.includes('cooling') || norm.includes('radiator')) return 'cooling';
  if (norm.includes('mirror') || norm.includes('glass') || norm.includes('windshield')) return 'mirrors';
  if (norm.includes('oil') || norm.includes('fluid') || norm.includes('lubricant')) return 'oils';
  if (norm.includes('turbo') || norm.includes('injector') || norm.includes('fuel')) return 'turbo';
  if (norm.includes('transmission') || norm.includes('clutch') || norm.includes('gear')) return 'transmission';
  if (norm.includes('engine') || norm.includes('motor') || norm.includes('piston')) return 'engine';
  if (norm.includes('interior') || norm.includes('seat') || norm.includes('mat')) return 'interior';
  if (norm.includes('body') || norm.includes('bumper') || norm.includes('fender') || norm.includes('door') || norm.includes('grille')) return 'body';
  return null;
}

/**
 * Checks if a spare part matches a given category filter with zero confusion.
 * 
 * @param part The spare part object containing category, title, subCategory, description, etc.
 * @param selectedCategory The category name (from Home tabs, Admin categories, or search filters).
 * @returns boolean
 */
export function matchesCategoryFilter(part: any, selectedCategory: string): boolean {
  if (!selectedCategory) return true;
  
  const catTrimmed = selectedCategory.trim();
  if (
    catTrimmed === '' ||
    catTrimmed.toLowerCase() === 'all' ||
    catTrimmed.toLowerCase() === 'all categories' ||
    catTrimmed.toLowerCase() === 'more'
  ) {
    return true;
  }

  if (!part) return false;

  const partCategory = (part.category || part.finalCategory || '').toLowerCase().trim();
  const partSubCategory = (part.subCategory || part.subcategory || part.partName || part.finalPartName || '').toLowerCase().trim();
  const partTitle = (part.title || part.name || '').toLowerCase().trim();
  const partDescription = (part.description || '').toLowerCase().trim();
  const targetCategory = catTrimmed.toLowerCase();

  // 1. Direct EXACT match on category
  if (partCategory === targetCategory) return true;

  // 2. Direct EXACT match on subcategory / part name
  if (partSubCategory === targetCategory) return true;

  // 3. Domain Disambiguation for Compound Categories
  // e.g. seller saved under "Suspension & Brakes" or "Lights & Electricals" or "Interior & Wheels"
  const targetDomain = findDomain(targetCategory);
  if (targetDomain && DOMAIN_KEYWORDS[targetDomain]) {
    const domainKeywords = DOMAIN_KEYWORDS[targetDomain];
    const searchableText = `${partSubCategory} ${partTitle} ${partDescription} ${partCategory}`;
    const partTokens = new Set(cleanTokens(searchableText));

    // Check if the part has strong keywords belonging to the target domain
    const hasTargetDomainKeyword = domainKeywords.some((kw) => {
      if (kw.includes(' ')) {
        return searchableText.includes(kw);
      }
      return partTokens.has(kw) || partTokens.has(getBaseWord(kw));
    });

    // Check contrasting compound categories
    // A. "Suspension & Brakes" compound disambiguation:
    if (partCategory.includes('suspension') && partCategory.includes('brake')) {
      if (targetDomain === 'brakes') {
        return hasTargetDomainKeyword;
      }
      if (targetDomain === 'suspension') {
        return hasTargetDomainKeyword;
      }
    }

    // B. "Lights & Electricals" compound disambiguation:
    if ((partCategory.includes('light') || partCategory.includes('lamp')) && (partCategory.includes('electric') || partCategory.includes('battery'))) {
      if (targetDomain === 'lights') {
        return hasTargetDomainKeyword;
      }
      if (targetDomain === 'electrical') {
        return hasTargetDomainKeyword;
      }
    }

    // C. "Interior & Wheels" compound disambiguation:
    if (partCategory.includes('interior') && (partCategory.includes('wheel') || partCategory.includes('tyre') || partCategory.includes('tire'))) {
      if (targetDomain === 'wheels') {
        return hasTargetDomainKeyword;
      }
      if (targetDomain === 'interior') {
        return hasTargetDomainKeyword;
      }
    }

    // D. "Body & Exterior" vs "Mirrors & Glass" disambiguation:
    if (partCategory.includes('body') || partCategory.includes('exterior')) {
      if (targetDomain === 'mirrors') {
        return hasTargetDomainKeyword;
      }
      if (targetDomain === 'body') {
        // If it's specifically a mirror or glass, don't show under pure Body unless no specific keywords
        if (DOMAIN_KEYWORDS.mirrors.some(mkw => partTokens.has(mkw))) {
          return false;
        }
      }
    }

    // E. General domain match: If the part explicitly matches target domain keywords
    if (hasTargetDomainKeyword) {
      return true;
    }
  }

  // 4. Substring Match only when NOT a conflicting compound category
  const isCompoundCategory = partCategory.includes('&') || partCategory.includes(' and ') || partCategory.includes('/');
  if (!isCompoundCategory) {
    if (partCategory && targetCategory.includes(partCategory)) return true;
    if (partCategory && partCategory.includes(targetCategory)) return true;
    if (partSubCategory && (partSubCategory.includes(targetCategory) || targetCategory.includes(partSubCategory))) {
      return true;
    }
  }

  // 5. Fallback Token Matching
  const targetTokens = cleanTokens(targetCategory);
  if (targetTokens.length === 0) return true;

  const combinedPartText = `${partCategory} ${partSubCategory} ${partTitle}`;
  const partTokens = new Set(cleanTokens(combinedPartText));

  for (const token of targetTokens) {
    const baseToken = getBaseWord(token);
    if (partTokens.has(token) || partTokens.has(baseToken)) {
      return true;
    }
    if (partCategory.includes(token) || partCategory.includes(baseToken)) {
      return true;
    }
    if (partSubCategory.includes(token) || partSubCategory.includes(baseToken)) {
      return true;
    }
    if (partTitle.includes(token) || partTitle.includes(baseToken)) {
      return true;
    }
  }

  return false;
}
