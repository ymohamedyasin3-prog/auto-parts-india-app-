/**
 * searchHelper.ts
 * Intelligent multi-token search and relevance scoring for auto spare parts.
 * Supports ad Title, Description, Brand, Model, Part Name, Category, OEM Numbers, and Locations.
 */

const COMMON_ALIASES: Record<string, string[]> = {
  headlight: ['headlamp', 'head lamp', 'head light'],
  headlamp: ['headlight', 'head light'],
  taillight: ['tail lamp', 'taillamp', 'tail light', 'back light'],
  taillamp: ['taillight', 'tail light'],
  backlight: ['taillight', 'tail lamp', 'tail light'],
  bumber: ['bumper'],
  bumper: ['bumber'],
  shocker: ['shock', 'absorber', 'suspension', 'strut'],
  shock: ['shocker', 'absorber'],
  mirror: ['orvm', 'rearview', 'side mirror'],
  orvm: ['mirror', 'side mirror'],
  dickey: ['boot', 'trunk', 'tailgate'],
  boot: ['dickey', 'trunk', 'tailgate'],
  silencer: ['exhaust', 'muffler'],
  exhaust: ['silencer', 'muffler'],
  clutch: ['clutch plate', 'pressure plate'],
  brake: ['break', 'caliper', 'disc', 'rotor', 'pad'],
  break: ['brake'],
  tyre: ['tire', 'wheel', 'rim'],
  tire: ['tyre', 'wheel', 'rim'],
  ac: ['air condition', 'compressor', 'cooling', 'condenser'],
  battery: ['amarom', 'exide'],
};

function checkAliases(token: string, text: string): boolean {
  const aliases = COMMON_ALIASES[token];
  if (aliases && aliases.length > 0) {
    return aliases.some((a) => text.includes(a));
  }
  return false;
}

export interface SearchMatchResult {
  matches: boolean;
  score: number;
}

/**
 * Evaluates whether a listing matches the search query across Title, Description,
 * Brand, Model, Part Name, OEM number, and Location, and computes a relevance score.
 */
export function matchPartSearch(part: any, rawQuery: string): SearchMatchResult {
  if (!rawQuery || !rawQuery.trim()) {
    return { matches: true, score: 0 };
  }

  const query = rawQuery.trim().toLowerCase();
  const tokens = query.split(/\s+/).filter((t) => t.length > 0);

  const title = (part.title || '').toLowerCase();
  const description = (part.description || '').toLowerCase();
  const brand = (part.carBrand || part.brand || '').toLowerCase();
  const model = (part.carModel || part.model || '').toLowerCase();
  const partName = (part.partName || part.finalPartName || '').toLowerCase();
  const category = (part.category || part.finalCategory || part.subCategory || '').toLowerCase();
  const location = (
    part.location ||
    part.city ||
    part.district ||
    part.state ||
    part.area ||
    ''
  ).toLowerCase();
  const numbers = (part.oemNumber || part.partNumber || '').toLowerCase();

  const fullContent = `${title} ${brand} ${model} ${partName} ${category} ${numbers} ${description} ${location}`;

  // Every token entered by the user must be found somewhere in the item's info
  for (const token of tokens) {
    const found = fullContent.includes(token) || checkAliases(token, fullContent);
    if (!found) {
      return { matches: false, score: 0 };
    }
  }

  // --- Compute Relevance Score ---
  let score = 10;

  // 1. Exact full query in title gives the highest relevance boost
  if (title.includes(query)) {
    score += 150;
  } else {
    for (const t of tokens) {
      if (title.includes(t)) score += 40;
    }
  }

  // 2. Exact match in brand / model
  if (brand.includes(query) || model.includes(query)) {
    score += 100;
  } else {
    for (const t of tokens) {
      if (brand.includes(t)) score += 30;
      if (model.includes(t)) score += 30;
    }
  }

  // 3. Exact match in partName
  if (partName.includes(query)) {
    score += 80;
  } else {
    for (const t of tokens) {
      if (partName.includes(t)) score += 25;
    }
  }

  // 4. Exact match in OEM or Part Number
  if (numbers.includes(query)) {
    score += 90;
  }

  // 5. Match in Description
  if (description.includes(query)) {
    score += 45;
  } else {
    for (const t of tokens) {
      if (description.includes(t)) score += 15;
    }
  }

  // 6. Match in category
  if (category.includes(query)) {
    score += 35;
  }

  return { matches: true, score };
}
