import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseFirestore } from './firebase';

export interface DefaultCategoryItem {
  id: string;
  name: string;
  icon: string;
  bg: string;
  color: string;
  imageUrl?: string;
  order: number;
  active: boolean;
  subcategories?: string[];
}

export interface DefaultBrandItem {
  id: string;
  name: string;
  imageUrl?: string;
  logoUrl?: string;
  order: number;
  active: boolean;
}

export const INITIAL_DEFAULT_CATEGORIES: DefaultCategoryItem[] = [
  { 
    id: 'cat_engine', 
    name: 'Engine & Mechanical', 
    icon: 'engine', 
    bg: '#FEF2F2', 
    color: '#DC2626', 
    order: 0, 
    active: true,
    subcategories: [
      'Complete Engine Assembly',
      'Cylinder Head',
      'Piston & Connecting Rods',
      'Crankshaft & Camshaft',
      'Turbocharger / Intercooler',
      'Alternator',
      'Starter Motor',
      'Fuel Injectors / Rail',
      'Timing Belt / Chain Kit',
      'Engine Mountings',
    ]
  },
  { 
    id: 'cat_body', 
    name: 'Body & Exterior', 
    icon: 'car-door', 
    bg: '#F0F9FF', 
    color: '#0284C7', 
    order: 1, 
    active: true,
    subcategories: [
      'Front Bumper Assembly',
      'Rear Bumper Assembly',
      'Bonnet / Hood',
      'Front Grille',
      'Headlight Assembly (Pair/Single)',
      'Tail Light Assembly',
      'Fog Lamps / DRLs',
      'Side Mirror Assembly (ORVM)',
      'Front / Rear Doors',
      'Fenders / Quarter Panels',
    ]
  },
  { 
    id: 'cat_electrical', 
    name: 'Lights & Electricals', 
    icon: 'lightning-bolt', 
    bg: '#FEFCE8', 
    color: '#D97706', 
    order: 2, 
    active: true,
    subcategories: [
      'Engine Control Unit (ECU / ECM)',
      'Body Control Module (BCM)',
      'Complete Wiring Harness',
      'Instrument Cluster / Speedometer',
      'Fuse Box & Relays',
      'Key Fob / Immobilizer System',
      'Sensors (Oxygen, MAP, ABS, Cam)',
      'Car Battery',
    ]
  },
  { 
    id: 'cat_suspension', 
    name: 'Suspension & Brakes', 
    icon: 'car-brake-alert', 
    bg: '#FFF1F2', 
    color: '#E11D48', 
    order: 3, 
    active: true,
    subcategories: [
      'Front Shock Absorbers (Struts)',
      'Rear Shock Absorbers',
      'Brake Calipers (Front/Rear)',
      'Brake Disc Rotors / Drums',
      'Brake Booster & Master Cylinder',
      'ABS Pump / Module',
      'Lower Control Arms',
      'Steering Rack & Pinion Assembly',
    ]
  },
  { 
    id: 'cat_interior', 
    name: 'Interior & Wheels', 
    icon: 'car-seat', 
    bg: '#FAF5FF', 
    color: '#7C3AED', 
    order: 4, 
    active: true,
    subcategories: [
      'Complete Dashboard Assembly',
      'Steering Wheel with Airbag',
      'Airbag Module (Driver/Passenger)',
      'Seat Assembly (Front/Rear)',
      'Touchscreen Infotainment Screen',
      'AC Vents & Controls Panel',
      'Power Window Motor / Switches',
      'Alloy Wheels (Set / Single)',
      'Spare Tyre / Rim',
    ]
  },
  { 
    id: 'cat_ac', 
    name: 'Cooling & AC', 
    icon: 'fan', 
    bg: '#F0FDFA', 
    color: '#0D9488', 
    order: 5, 
    active: true,
    subcategories: [
      'AC Compressor',
      'AC Condenser',
      'Cooling Radiator',
      'Radiator Cooling Fan Assembly',
      'Intercooler',
      'Heating Core / Blower Motor',
      'Thermostat & Housing',
      'Coolant Reservoir Tank',
    ]
  },
  { 
    id: 'cat_transmission', 
    name: 'Transmission & Clutch', 
    icon: 'car-shift-pattern', 
    bg: '#EFF6FF', 
    color: '#2563EB', 
    order: 6, 
    active: true,
    subcategories: [
      'Manual Gearbox Assembly',
      'Automatic Transmission (AT/CVT/DCT)',
      'Clutch Plate & Pressure Plate',
      'Flywheel (Dual Mass / Single)',
      'Drive Shaft / Axle',
      'Differential Assembly',
    ]
  },
  { 
    id: 'cat_exhaust', 
    name: 'Exhaust & Fuel', 
    icon: 'pipe', 
    bg: '#ECFDF5', 
    color: '#059669', 
    order: 7, 
    active: true,
    subcategories: [
      'Catalytic Converter / DPF',
      'Exhaust Manifold & Muffler',
      'Fuel Tank Assembly',
      'EGR Valve',
      'Exhaust Pipe & Resonator',
      'Fuel Pump (High/Low Pressure)',
    ]
  },
];

export const INITIAL_DEFAULT_BRANDS: DefaultBrandItem[] = [
  { id: 'brand_maruti', name: 'Maruti Suzuki', order: 0, active: true },
  { id: 'brand_hyundai', name: 'Hyundai', order: 1, active: true },
  { id: 'brand_tata', name: 'Tata', order: 2, active: true },
  { id: 'brand_mahindra', name: 'Mahindra', order: 3, active: true },
  { id: 'brand_toyota', name: 'Toyota', order: 4, active: true },
  { id: 'brand_kia', name: 'Kia', order: 5, active: true },
  { id: 'brand_honda', name: 'Honda', order: 6, active: true },
  { id: 'brand_volkswagen', name: 'Volkswagen', order: 7, active: true },
  { id: 'brand_skoda', name: 'Skoda', order: 8, active: true },
  { id: 'brand_renault', name: 'Renault', order: 9, active: true },
  { id: 'brand_mg', name: 'MG', order: 10, active: true },
  { id: 'brand_nissan', name: 'Nissan', order: 11, active: true },
  { id: 'brand_ford', name: 'Ford', order: 12, active: true },
  { id: 'brand_bmw', name: 'BMW', order: 13, active: true },
  { id: 'brand_mercedes', name: 'Mercedes-Benz', order: 14, active: true },
  { id: 'brand_audi', name: 'Audi', order: 15, active: true },
];

const TAXONOMY_INITIALIZED_KEY = '@autoparts_taxonomy_initialized_v3';

/**
 * Initializes default categories and car brands into Firestore if they don't exist yet.
 * Once initialized, Firestore is the ONLY source of truth:
 * - If an admin deletes a category or brand, it stays deleted permanently!
 * - No hardcoded fallback will force it back!
 */
export async function initializeTaxonomyDefaults(): Promise<void> {
  try {
    const db = getFirebaseFirestore();
    if (!db) return;

    // Check if topCategories has documents in Firestore
    const catSnap = await db.collection('topCategories').get();
    if (!catSnap || catSnap.empty || catSnap.docs.length === 0) {
      for (const cat of INITIAL_DEFAULT_CATEGORIES) {
        await db.collection('topCategories').doc(cat.id).set({
          ...cat,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }, { merge: true });
      }
    }

    // Check if carBrands has documents in Firestore
    const brandSnap = await db.collection('carBrands').get();
    if (!brandSnap || brandSnap.empty || brandSnap.docs.length === 0) {
      for (const brand of INITIAL_DEFAULT_BRANDS) {
        await db.collection('carBrands').doc(brand.id).set({
          ...brand,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }, { merge: true });
      }
    }
  } catch (err) {
    console.warn('[TaxonomyDefaults] Init notice:', err);
  }
}

/**
 * Restore all default categories (useful if admin wants to reset after testing)
 */
export async function restoreDefaultCategories(): Promise<void> {
  const db = getFirebaseFirestore();
  if (!db) return;
  for (const cat of INITIAL_DEFAULT_CATEGORIES) {
    await db.collection('topCategories').doc(cat.id).set({
      ...cat,
      updatedAt: Date.now(),
    });
  }
}

/**
 * Restore all default car brands (useful if admin wants to reset after testing)
 */
export async function restoreDefaultCarBrands(): Promise<void> {
  const db = getFirebaseFirestore();
  if (!db) return;
  for (const brand of INITIAL_DEFAULT_BRANDS) {
    await db.collection('carBrands').doc(brand.id).set({
      ...brand,
      updatedAt: Date.now(),
    });
  }
}
