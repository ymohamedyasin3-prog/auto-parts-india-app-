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
    name: 'Engine', 
    icon: 'engine', 
    bg: '#FEF2F2', 
    color: '#DC2626', 
    order: 0, 
    active: true,
    subcategories: ['Cylinder Head', 'Pistons', 'Turbocharger', 'Alternator', 'Starter Motor', 'Fuel Injectors']
  },
  { 
    id: 'cat_body', 
    name: 'Body & Frame', 
    icon: 'car-door', 
    bg: '#F0F9FF', 
    color: '#0284C7', 
    order: 1, 
    active: true,
    subcategories: ['Front Bumper', 'Rear Bumper', 'Headlight Set', 'Tail Lights', 'Doors', 'Bonnet', 'Side Mirrors']
  },
  { 
    id: 'cat_electrical', 
    name: 'Electricals', 
    icon: 'flash', 
    bg: '#FEFCE8', 
    color: '#D97706', 
    order: 2, 
    active: true,
    subcategories: ['ECU / ECM', 'Wiring Harness', 'Battery', 'Sensors', 'Instrument Cluster', 'Fuse Box']
  },
  { 
    id: 'cat_brakes', 
    name: 'Brakes & Discs', 
    icon: 'car-brake-alert', 
    bg: '#FFF1F2', 
    color: '#E11D48', 
    order: 3, 
    active: true,
    subcategories: ['Brake Calipers', 'Disc Rotors', 'Brake Pads', 'ABS Module', 'Master Cylinder']
  },
  { 
    id: 'cat_suspension', 
    name: 'Suspension', 
    icon: 'tune-vertical', 
    bg: '#FAF5FF', 
    color: '#9333EA', 
    order: 4, 
    active: true,
    subcategories: ['Shock Absorbers', 'Struts', 'Control Arms', 'Coil Springs', 'Steering Rack']
  },
  { 
    id: 'cat_exhaust', 
    name: 'Exhaust', 
    icon: 'weather-windy', 
    bg: '#ECFDF5', 
    color: '#059669', 
    order: 5, 
    active: true,
    subcategories: ['Mufflers', 'Exhaust Pipes', 'Catalytic Converter', 'Headers', 'Silencers']
  },
  { 
    id: 'cat_filters', 
    name: 'Filters & Fluids', 
    icon: 'air-filter', 
    bg: '#FFF7ED', 
    color: '#EA580C', 
    order: 6, 
    active: true,
    subcategories: ['Oil Filter', 'Engine Air Filter', 'Cabin Filter', 'Fuel Filter', 'Brake Fluid']
  },
  { 
    id: 'cat_ac', 
    name: 'AC & Cooling', 
    icon: 'fan', 
    bg: '#F0FDFA', 
    color: '#0D9488', 
    order: 7, 
    active: true,
    subcategories: ['AC Compressor', 'Radiator', 'Condenser', 'Cooling Fan', 'Intercooler']
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
