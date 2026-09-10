/**
 * searchHelper.ts
 * Intelligent multi-token search, auto parts synonym expansion, and relevance scoring.
 * Works seamlessly across both Web and React Native environments.
 */

export interface SearchMatchResult {
  matches: boolean;
  score: number;
}

// Common automotive parts synonyms and aliases
const COMMON_ALIASES: Record<string, string[]> = {
  // Lights
  headlight: ['headlamp', 'head lamp', 'head light', 'front light', 'drl'],
  headlights: ['headlamps', 'head lamps', 'head lights', 'front lights'],
  headlamp: ['headlight', 'head light', 'front light'],
  headlamps: ['headlights', 'head lights'],
  taillight: ['tail lamp', 'taillamp', 'tail light', 'back light', 'backlight', 'rear light'],
  taillights: ['tail lamps', 'taillamps', 'tail lights', 'back lights', 'backlights', 'rear lights'],
  taillamp: ['taillight', 'tail light', 'back light'],
  taillamps: ['taillights', 'tail lights', 'back lights'],
  backlight: ['taillight', 'tail lamp', 'tail light'],
  backlights: ['taillights', 'tail lamps', 'tail lights'],
  foglight: ['fog light', 'fog lamp', 'foglamp'],
  foglights: ['fog lights', 'fog lamps', 'foglamps'],
  indicator: ['blinker', 'turn signal', 'side light'],
  indicators: ['blinkers', 'turn signals'],

  // Body & Exterior
  bumper: ['bumber', 'front bumper', 'rear bumper'],
  bumpers: ['bumbers', 'front bumpers', 'rear bumpers'],
  bumber: ['bumper', 'front bumper', 'rear bumper'],
  bumbers: ['bumpers'],
  bonnet: ['hood', 'front hood', 'engine cover'],
  hood: ['bonnet', 'front hood'],
  fender: ['mudguard', 'mud guard', 'wing', 'quarter panel'],
  fenders: ['mudguards', 'mud guards'],
  mudguard: ['fender', 'mud guard'],
  mudguards: ['fenders', 'mud guards'],
  grille: ['grill', 'front grill', 'mesh'],
  grill: ['grille', 'front grille'],
  mirror: ['orvm', 'rearview', 'side mirror', 'door mirror', 'view mirror'],
  mirrors: ['orvms', 'side mirrors', 'door mirrors'],
  orvm: ['mirror', 'side mirror', 'door mirror', 'rearview'],
  orvms: ['mirrors', 'side mirrors'],
  dickey: ['dicky', 'dickie', 'boot', 'trunk', 'tailgate'],
  dicky: ['dickey', 'dickie', 'boot', 'trunk', 'tailgate'],
  boot: ['dickey', 'dicky', 'trunk', 'tailgate'],
  trunk: ['dickey', 'boot', 'tailgate'],
  tailgate: ['dickey', 'boot', 'trunk'],
  door: ['doors', 'gate', 'power window'],
  doors: ['door'],
  windshield: ['windscreen', 'front glass', 'glass'],
  glass: ['windshield', 'windscreen', 'window'],

  // Suspension & Steering
  shocker: ['shock', 'absorber', 'suspension', 'strut', 'spring', 'jumping rod'],
  shockers: ['shocks', 'absorbers', 'struts', 'suspension'],
  shock: ['shocker', 'absorber', 'strut', 'suspension'],
  shocks: ['shockers', 'absorbers', 'struts'],
  absorber: ['shocker', 'shock', 'strut', 'suspension'],
  absorbers: ['shockers', 'shocks', 'struts'],
  strut: ['shocker', 'shock', 'absorber', 'suspension'],
  struts: ['shockers', 'shocks', 'absorbers'],
  suspension: ['shocker', 'shock', 'strut', 'absorber', 'spring', 'arm', 'control arm'],
  steering: ['power steering', 'steering rack', 'rack', 'column'],

  // Exhaust & Engine
  silencer: ['exhaust', 'muffler', 'exhaust pipe', 'catalytic'],
  silencers: ['exhausts', 'mufflers'],
  exhaust: ['silencer', 'muffler', 'tailpipe'],
  muffler: ['silencer', 'exhaust'],
  turbo: ['turbocharger', 'intercooler'],
  turbocharger: ['turbo', 'intercooler'],
  engine: ['motor', 'cylinder', 'block', 'head', 'piston'],
  alternator: ['dynamo', 'generator'],
  starter: ['self starter', 'starter motor'],

  // Transmission & Brakes
  clutch: ['clutch plate', 'pressure plate', 'flywheel', 'clutch kit'],
  clutches: ['clutch plate', 'pressure plate'],
  gearbox: ['transmission', 'gear', 'gears'],
  transmission: ['gearbox', 'gear'],
  brake: ['break', 'caliper', 'disc', 'rotor', 'pad', 'brake shoe', 'drum'],
  brakes: ['breaks', 'calipers', 'discs', 'rotors', 'pads'],
  break: ['brake', 'disc', 'pad', 'caliper'],
  breaks: ['brakes', 'discs', 'pads'],
  disc: ['rotor', 'brake disc', 'brake plate'],
  discs: ['rotors', 'brake discs'],
  pad: ['brake pad', 'pads', 'shoes'],
  pads: ['brake pads', 'shoes'],

  // Wheels & Tyres
  tyre: ['tire', 'wheel', 'rim', 'alloy', 'alloys'],
  tyres: ['tires', 'wheels', 'rims', 'alloys'],
  tire: ['tyre', 'wheel', 'rim', 'alloy'],
  tires: ['tyres', 'wheels', 'rims'],
  wheel: ['tyre', 'tire', 'rim', 'alloy'],
  wheels: ['tyres', 'tires', 'rims', 'alloys'],
  rim: ['wheel', 'alloy', 'steel rim'],
  rims: ['wheels', 'alloys'],
  alloy: ['rim', 'alloys', 'mag wheel', 'wheel'],
  alloys: ['rims', 'alloy wheels'],

  // Cooling & AC
  ac: ['air condition', 'air conditioner', 'compressor', 'cooling', 'condenser', 'radiator'],
  compressor: ['ac compressor', 'air condition'],
  radiator: ['cooling', 'condenser', 'intercooler', 'water pump'],
  condenser: ['ac condenser', 'cooling'],

  // Electricals & Others
  battery: ['amaron', 'exide', 'accumulator'],
  batteries: ['amaron', 'exide'],
  wiper: ['wipers', 'wiper blade', 'wiper motor'],
  wipers: ['wiper', 'wiper blades'],
  horn: ['horns', 'roots horn', 'bosch horn'],
  horns: ['horn'],
  seat: ['seats', 'seat cover', 'cushion'],
  seats: ['seat', 'seat covers'],
  filter: ['air filter', 'oil filter', 'fuel filter'],
  filters: ['air filters', 'oil filters'],

  // Popular Car Brand Aliases
  maruti: ['suzuki', 'maruti suzuki', 'msil'],
  suzuki: ['maruti', 'maruti suzuki'],
  hyundai: ['hyndai', 'hundai'],
  mahindra: ['m&m'],
  chevy: ['chevrolet'],
  chevrolet: ['chevy'],
  vw: ['volkswagen'],
  volkswagen: ['vw'],
  merc: ['mercedes', 'benz', 'mercedes-benz'],
  mercedes: ['benz', 'mercedes-benz', 'merc'],
  benz: ['mercedes', 'mercedes-benz'],
  tata: ['tata motors'],
  toyota: ['tkm'],

  // Indian Cities & States synonyms & short forms
  chennai: ['madras', 'tn', 'tamil nadu', 'tamilnadu'],
  madras: ['chennai'],
  bangalore: ['bengaluru', 'blr', 'karnataka'],
  bengaluru: ['bangalore', 'blr', 'karnataka'],
  blr: ['bangalore', 'bengaluru'],
  delhi: ['new delhi', 'ncr'],
  mumbai: ['bombay', 'maharashtra'],
  bombay: ['mumbai'],
  hyderabad: ['hyd', 'telangana'],
  hyd: ['hyderabad'],
  kolkata: ['calcutta', 'west bengal'],
  calcutta: ['kolkata'],
  coimbatore: ['kovai', 'tamil nadu'],
  kovai: ['coimbatore'],
  madurai: ['tamil nadu'],
  salem: ['tamil nadu'],
  trichy: ['tiruchirappalli', 'tamil nadu'],
  tiruchirappalli: ['trichy'],
  kochi: ['cochin', 'ernakulam', 'kerala'],
  cochin: ['kochi', 'ernakulam'],
  trivandrum: ['thiruvananthapuram', 'kerala'],
  thiruvananthapuram: ['trivandrum'],
  pune: ['maharashtra'],
  ahmedabad: ['gujarat'],
  jaipur: ['rajasthan'],
  chandigarh: ['punjab', 'haryana'],
  tn: ['tamil nadu', 'tamilnadu', 'chennai'],
  tamilnadu: ['tamil nadu', 'tn']
};

/**
 * Normalizes singular/plural form of a single token.
 */
function getPluralVariants(token: string): string[] {
  const variants: string[] = [token];
  if (token.length > 3) {
    if (token.endsWith('es')) {
      variants.push(token.slice(0, -2));
    } else if (token.endsWith('s')) {
      variants.push(token.slice(0, -1));
    } else {
      variants.push(token + 's');
      variants.push(token + 'es');
    }
  }
  return variants;
}

/**
 * Checks if token or its synonyms/aliases appear in the searchable text.
 */
function checkAliases(token: string, text: string): boolean {
  const variants = getPluralVariants(token);

  for (const v of variants) {
    const aliases = COMMON_ALIASES[v];
    if (aliases && aliases.length > 0) {
      if (aliases.some((a) => text.includes(a))) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Checks if any word inside the given text starts with the target token.
 * Highly effective for single alphabet and partial typing (e.g. "b" -> "bumper", "c" -> "chennai").
 */
function hasWordStartingWith(text: string, token: string): boolean {
  if (!text || !token) return false;
  const words = text.split(/[\s,\-_/().:]+/);
  return words.some((w) => w.startsWith(token));
}

/**
 * Safe timestamp converter for sorting and freshness checks.
 */
export function parseCreatedAt(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const num = Number(val);
    if (!isNaN(num) && num > 0) return num;
    const parsed = Date.parse(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  if (typeof val?.toMillis === 'function') return val.toMillis();
  if (typeof val?.seconds === 'number') return val.seconds * 1000;
  return 0;
}

/**
 * Evaluates whether a listing matches the search query across:
 * Title, Description, Brand, Model, Variant, Part Name, Category, OEM Numbers, and ALL Location fields (city, district, state, area, pincode).
 * Supports prefix matching on every word (so typing "b" or "che" or "sw" immediately surfaces "Bumper", "Chennai", "Swift" with top score).
 * Computes a weighted relevance score for high-quality ranking.
 */
export function matchPartSearch(part: any, rawQuery: string): SearchMatchResult {
  if (!rawQuery || !rawQuery.trim()) {
    return { matches: true, score: 0 };
  }

  const query = rawQuery.trim().toLowerCase();
  // Split on spaces, commas, dashes, slashes
  const tokens = query.split(/[\s,\-_/]+/).filter((t) => t.length > 0);
  if (tokens.length === 0) {
    return { matches: true, score: 0 };
  }

  const title = (part.title || part.name || '').toLowerCase();
  
  // Aggregate all possible description and detail fields
  const descriptionParts = [
    part.description,
    part.desc,
    part.details,
    part.specifications,
    part.specification,
    part.notes,
    part.features,
    part.conditionNotes,
    part.compatibleModels,
    part.compatibility,
    part.condition
  ]
    .filter(Boolean)
    .map((s) => String(s).trim().toLowerCase());
  const description = Array.from(new Set(descriptionParts)).join(' ');

  const brand = (part.carBrand || part.brand || part.make || '').toLowerCase();
  const model = (part.carModel || part.model || '').toLowerCase();
  const variant = (part.carVariant || part.variant || part.fuelType || '').toLowerCase();
  const partName = (part.partName || part.finalPartName || part.selectedPart || part.part || '').toLowerCase();
  const category = (part.category || part.finalCategory || part.subCategory || part.subcategory || '').toLowerCase();
  const numbers = (part.oemNumber || part.partNumber || '').toLowerCase();
  const year = (part.year || part.modelYear || '').toString().toLowerCase();
  const seller = (part.sellerName || part.contactName || '').toLowerCase();

  // Combine ALL location fields without shadowing
  const locationParts = [
    part.location,
    part.city,
    part.district,
    part.state,
    part.area,
    part.pincode,
    part.address,
    part.sellerCity,
    part.sellerDistrict,
    part.sellerState,
    part.sellerLocation
  ]
    .filter(Boolean)
    .map((s) => String(s).trim().toLowerCase());
  const location = Array.from(new Set(locationParts)).join(' ');

  const fullContent = `${title} ${brand} ${model} ${variant} ${partName} ${category} ${numbers} ${year} ${description} ${location} ${seller}`;
  const collapsedContent = fullContent.replace(/[\s\-_]/g, '');

  // Every token entered by the user must match somewhere in the item or via synonym/plural/space collapse/prefix
  for (const token of tokens) {
    let found =
      fullContent.includes(token) ||
      hasWordStartingWith(fullContent, token) ||
      checkAliases(token, fullContent);

    if (!found) {
      const variants = getPluralVariants(token);
      for (const v of variants) {
        if (fullContent.includes(v)) {
          found = true;
          break;
        }
      }
    }

    if (!found) {
      // Check collapsed string, e.g. "wagonr" in "wagon r", or "i20" in "i 20", "xuv500" in "xuv 500"
      const collapsedToken = token.replace(/[\s\-_]/g, '');
      if (collapsedToken.length >= 2 && collapsedContent.includes(collapsedToken)) {
        found = true;
      }
    }

    if (!found) {
      return { matches: false, score: 0 };
    }
  }

  // --- Compute Weighted Relevance Score ---
  let score = 10;

  // 1. Exact full query in title gives the highest relevance boost
  if (title.includes(query)) {
    score += 300;
  }
  // 2. Exact match in partName
  if (partName.includes(query)) {
    score += 260;
  }
  // 3. Exact match in brand / model
  if (brand.includes(query) || model.includes(query)) {
    score += 220;
  }
  // 4. Exact match in location (city / district / state / area)
  if (location.includes(query)) {
    score += 200;
  }
  // 5. Match in OEM or Part Number
  if (numbers && numbers.includes(query)) {
    score += 180;
  }
  // 6. Match in category
  if (category.includes(query)) {
    score += 120;
  }
  // 7. Match in Description
  if (description.includes(query)) {
    score += 140;
  }

  // Word Prefix Matching Boost (CRITICAL for single alphabet and partial typing like "b", "c", "sw", "che")
  for (const t of tokens) {
    if (hasWordStartingWith(partName, t)) {
      score += 180;
    }
    if (hasWordStartingWith(title, t)) {
      score += 160;
    }
    if (hasWordStartingWith(brand, t) || hasWordStartingWith(model, t)) {
      score += 140;
    }
    if (hasWordStartingWith(location, t)) {
      score += 130;
    }
    if (hasWordStartingWith(category, t)) {
      score += 80;
    }
    if (hasWordStartingWith(description, t)) {
      score += 80;
    }

    // Substring matches per token
    if (partName.includes(t)) score += 50;
    if (title.includes(t)) score += 40;
    if (brand.includes(t)) score += 35;
    if (model.includes(t)) score += 35;
    if (location.includes(t)) score += 30;
    if (description.includes(t)) score += 30;
    if (category.includes(t)) score += 20;
  }

  // Slight boost for listings with images and verified details
  if (part.imageUrl || (part.images && part.images.length > 0)) {
    score += 10;
  }

  return { matches: true, score };
}
