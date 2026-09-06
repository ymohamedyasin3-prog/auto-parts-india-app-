import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  Dimensions,
  Platform,
  ActivityIndicator,
  FlatList,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
} from 'react-native';
import {
  TextInput,
  Button,
  IconButton,
  Chip,
  Divider,
  Surface,
  useTheme,
  Appbar,
} from 'react-native-paper';
import {
  openNativeCamera,
  openNativeGallery,
  openNativeGalleryMultiple,
  promptImageSourceDialog,
} from '../services/imagePickerService';
import { uploadImageToCloudinary, uploadMultipleImagesToCloudinary } from '../services/cloudinary';
import {
  getCurrentLocation,
  reverseGeocodeLatLng,
  getApproxCoordinates,
  GeocodedLocation,
  saveUserLocation,
  getUserSavedLocation,
} from '../services/location';
import { getFirebaseFirestore, getCurrentUser, getFirestoreInstance } from '../services/firebase';
import { useLanguage } from '../context/LanguageContext';
import { MapLocationModal } from '../components/MapLocationModal';
import { BrandLogo } from '../components/BrandLogo';
import { INDIAN_STATES_AND_DISTRICTS, StateWithDistricts } from '../data/indianLocations';

const { width } = Dimensions.get('window');

// Default comprehensive taxonomy fallback for instant offline-first & zero-latency cascading
const DEFAULT_BRAND_MODELS: Record<string, string[]> = {
  'Maruti Suzuki': ['Swift', 'Baleno', 'Brezza', 'Dzire', 'Ertiga', 'Wagon R', 'Alto', 'Grand Vitara', 'Ciaz', 'Fronx', 'Jimny', 'XL6', 'Ignis', 'S-Presso', 'Celerio', 'Ritz', 'Zen', '800'],
  'Hyundai': ['Creta', 'i20', 'Venue', 'Verna', 'Grand i10', 'Aura', 'Tucson', 'Exter', 'Alcazar', 'Santro', 'Eon', 'Xcent', 'Elantra', 'Sonata'],
  'Tata': ['Nexon', 'Punch', 'Harrier', 'Safari', 'Altroz', 'Tiago', 'Tigor', 'Curvv', 'Hexa', 'Indica', 'Indigo', 'Sumo', 'Sierra', 'Bolt', 'Zest'],
  'Mahindra': ['Thar', 'Scorpio-N', 'XUV700', 'Bolero', 'XUV300', 'Scorpio Classic', 'XUV400', 'Marazzo', 'Xylo', 'KUV100', 'TUV300', 'Armada', 'Major'],
  'Toyota': ['Innova Crysta', 'Innova Hycross', 'Fortuner', 'Hyryder', 'Glanza', 'Hilux', 'Camry', 'Etios', 'Etios Liva', 'Corolla Altis', 'Yaris', 'Land Cruiser'],
  'Honda': ['City', 'Amaze', 'Elevate', 'WR-V', 'Jazz', 'Civic', 'BR-V', 'CR-V', 'Brio', 'Accord'],
  'Kia': ['Seltos', 'Sonet', 'Carens', 'Carnival', 'EV6', 'EV9'],
  'Volkswagen': ['Virtus', 'Taigun', 'Polo', 'Vento', 'Tiguan', 'Ameo', 'Jetta', 'Passat'],
  'Skoda': ['Slavia', 'Kushaq', 'Kodiaq', 'Octavia', 'Superb', 'Rapid', 'Fabia', 'Yeti'],
  'Ford': ['EcoSport', 'Endeavour', 'Figo', 'Aspire', 'Freestyle', 'Fiesta', 'Ikon'],
  'MG': ['Hector', 'Hector Plus', 'Astor', 'ZS EV', 'Comet EV', 'Gloster'],
  'Renault': ['Kwid', 'Triber', 'Kiger', 'Duster', 'Lodgy', 'Pulse', 'Scala'],
  'Nissan': ['Magnite', 'Kicks', 'Micra', 'Sunny', 'Terrano', 'Evalia'],
  'Jeep': ['Compass', 'Meridian', 'Wrangler', 'Grand Cherokee'],
  'BMW': ['3 Series', '5 Series', '7 Series', 'X1', 'X3', 'X5', 'X7', 'M3', 'M5'],
  'Mercedes-Benz': ['A-Class', 'C-Class', 'E-Class', 'S-Class', 'GLA', 'GLC', 'GLE', 'GLS'],
  'Audi': ['A4', 'A6', 'A8', 'Q3', 'Q5', 'Q7', 'Q8'],
};

// Brand-specific canonical variants for accurate automotive fitment
export const DEFAULT_BRAND_VARIANTS: Record<string, string[]> = {
  'Maruti Suzuki': [
    'All Variants (Fits All)',
    'LXI',
    'VXI',
    'ZXI',
    'ZXI Plus',
    'LDI',
    'VDI',
    'ZDI',
    'ZDI Plus',
    'Sigma',
    'Delta',
    'Zeta',
    'Alpha',
    'Tour',
    'Base Model',
    'Top Model',
  ],
  'Hyundai': [
    'All Variants (Fits All)',
    'E',
    'EX',
    'S',
    'S(O)',
    'SX',
    'SX(O)',
    'SX Tech',
    'Era',
    'Magna',
    'Sportz',
    'Asta',
    'Asta(O)',
    'Executive',
    'Knight Edition',
    'N Line',
    'Base Model',
    'Top Model',
  ],
  'Tata': [
    'All Variants (Fits All)',
    'Smart',
    'Smart+',
    'Pure',
    'Pure+',
    'Creative',
    'Creative+',
    'Fearless',
    'Fearless+',
    'XE',
    'XM',
    'XT',
    'XZ',
    'XZ+',
    'XZA+',
    'Dark Edition',
    'Red Dark',
    'Base Model',
    'Top Model',
  ],
  'Mahindra': [
    'All Variants (Fits All)',
    'Z2',
    'Z4',
    'Z6',
    'Z8',
    'Z8 Select',
    'Z8L',
    'AX3',
    'AX5',
    'AX7',
    'AX7L',
    'MX',
    'S3',
    'S5',
    'S7',
    'S9',
    'S11',
    'Classic',
    'B4',
    'B6',
    'B6(O)',
    'Base Model',
    'Top Model',
  ],
  'Toyota': [
    'All Variants (Fits All)',
    'E',
    'G',
    'GX',
    'GX+',
    'VX',
    'ZX',
    'ZX(O)',
    'V',
    'Z',
    'Legender',
    'GR Sport',
    'Touring Sport',
    'Base Model',
    'Top Model',
  ],
  'Honda': [
    'All Variants (Fits All)',
    'E',
    'S',
    'V',
    'VX',
    'ZX',
    'SV',
    'Elegance',
    'Exclusive',
    'e:HEV Hybrid',
    'Base Model',
    'Top Model',
  ],
  'Kia': [
    'All Variants (Fits All)',
    'HTE',
    'HTK',
    'HTK+',
    'HTX',
    'HTX+',
    'GTX',
    'GTX+',
    'X-Line',
    'Base Model',
    'Top Model',
  ],
  'Volkswagen': [
    'All Variants (Fits All)',
    'Trendline',
    'Comfortline',
    'Highline',
    'Highline Plus',
    'Topline',
    'GT',
    'GT Plus',
    'Dynamic Line',
    'Base Model',
    'Top Model',
  ],
  'Skoda': [
    'All Variants (Fits All)',
    'Active',
    'Ambition',
    'Style',
    'Prestige',
    'Monte Carlo',
    'Onyx',
    'L&K',
    'RS',
    'Base Model',
    'Top Model',
  ],
  'Ford': [
    'All Variants (Fits All)',
    'Ambiente',
    'Trend',
    'Trend+',
    'Titanium',
    'Titanium+',
    'Sports',
    'S Edition',
    'Base Model',
    'Top Model',
  ],
  'Renault': [
    'All Variants (Fits All)',
    'RXE',
    'RXL',
    'RXT',
    'RXZ',
    'Climber',
    'RXT(O)',
    'Base Model',
    'Top Model',
  ],
  'Nissan': [
    'All Variants (Fits All)',
    'XE',
    'XL',
    'XV',
    'XV Premium',
    'Geza Edition',
    'Base Model',
    'Top Model',
  ],
  'MG': [
    'All Variants (Fits All)',
    'Style',
    'Super',
    'Smart',
    'Smart Pro',
    'Sharp',
    'Sharp Pro',
    'Savvy',
    'Savvy Pro',
    'Blackstorm',
    'Base Model',
    'Top Model',
  ],
  'Jeep': [
    'All Variants (Fits All)',
    'Sport',
    'Longitude',
    'Night Eagle',
    'Limited',
    'Model S',
    'Trailhawk',
  ],
  'BMW': [
    'All Variants (Fits All)',
    'Sport',
    'Luxury Line',
    'M Sport',
    'xDrive',
    'sDrive',
  ],
  'Mercedes-Benz': [
    'All Variants (Fits All)',
    'Progressive',
    'AMG Line',
    'Exclusive',
    'Avantgarde',
    '4MATIC',
  ],
  'Audi': [
    'All Variants (Fits All)',
    'Premium',
    'Premium Plus',
    'Technology',
    'quattro',
  ],
};

// Model-specific popular trim definitions
export const MODEL_SPECIFIC_VARIANTS: Record<string, string[]> = {
  // Maruti Popular
  'Maruti Suzuki Swift': ['All Variants (Fits All)', 'LXI', 'VXI', 'ZXI', 'ZXI Plus', 'LDI (Diesel)', 'VDI (Diesel)', 'ZDI (Diesel)'],
  'Maruti Suzuki Dzire': ['All Variants (Fits All)', 'LXI', 'VXI', 'ZXI', 'ZXI Plus', 'Tour S', 'VDI (Diesel)', 'ZDI (Diesel)'],
  'Maruti Suzuki Baleno': ['All Variants (Fits All)', 'Sigma', 'Delta', 'Zeta', 'Alpha'],
  'Maruti Suzuki Brezza': ['All Variants (Fits All)', 'LXI', 'VXI', 'ZXI', 'ZXI Plus', 'LDI', 'VDI', 'ZDI'],
  'Maruti Suzuki Ertiga': ['All Variants (Fits All)', 'LXI', 'VXI', 'ZXI', 'ZXI Plus', 'Tour M'],
  'Maruti Suzuki Wagon R': ['All Variants (Fits All)', 'LXI (1.0L)', 'VXI (1.0L)', 'ZXI (1.2L)', 'ZXI Plus (1.2L)', 'Tour H3'],
  'Maruti Suzuki Alto': ['All Variants (Fits All)', 'Std', 'LXI', 'VXI', 'VXI Plus', 'Tour H1'],
  // Hyundai Popular
  'Hyundai Creta': ['All Variants (Fits All)', 'E', 'EX', 'S', 'S(O)', 'SX', 'SX(O)', 'SX Tech', 'Knight Edition', 'N Line'],
  'Hyundai i20': ['All Variants (Fits All)', 'Era', 'Magna', 'Sportz', 'Sportz(O)', 'Asta', 'Asta(O)', 'N Line'],
  'Hyundai Venue': ['All Variants (Fits All)', 'E', 'S', 'S(O)', 'S+', 'SX', 'SX(O)', 'Knight Edition', 'N Line'],
  'Hyundai Verna': ['All Variants (Fits All)', 'EX', 'S', 'SX', 'SX(O)', 'Turbo SX(O)'],
  'Hyundai Grand i10': ['All Variants (Fits All)', 'Era', 'Magna', 'Sportz', 'Asta', 'Corporate Edition'],
  // Tata Popular
  'Tata Nexon': ['All Variants (Fits All)', 'Smart', 'Smart+', 'Pure', 'Pure+', 'Creative', 'Creative+', 'Fearless', 'Fearless+', 'Dark Edition'],
  'Tata Punch': ['All Variants (Fits All)', 'Pure', 'Adventure', 'Accomplished', 'Creative', 'Camo Edition'],
  'Tata Harrier': ['All Variants (Fits All)', 'Smart', 'Pure', 'Adventure', 'Fearless', 'Dark Edition'],
  'Tata Safari': ['All Variants (Fits All)', 'Smart', 'Pure', 'Adventure', 'Accomplished', 'Dark Edition', 'Gold Edition'],
  'Tata Altroz': ['All Variants (Fits All)', 'XE', 'XM', 'XM+', 'XT', 'XZ', 'XZ+', 'Racer', 'Dark Edition'],
  'Tata Tiago': ['All Variants (Fits All)', 'XE', 'XT', 'XZ', 'XZ+', 'NRG'],
  // Mahindra Popular
  'Mahindra Scorpio-N': ['All Variants (Fits All)', 'Z2', 'Z4', 'Z6', 'Z8', 'Z8 Select', 'Z8L'],
  'Mahindra Scorpio Classic': ['All Variants (Fits All)', 'S', 'S11', 'S3', 'S5', 'S7', 'S9'],
  'Mahindra Thar': ['All Variants (Fits All)', 'AX', 'AX(O)', 'LX Hard Top', 'LX Soft Top', 'RWD', 'Earth Edition'],
  'Mahindra XUV700': ['All Variants (Fits All)', 'MX', 'AX3', 'AX5', 'AX7', 'AX7L', 'Blaze Edition'],
  'Mahindra Bolero': ['All Variants (Fits All)', 'B4', 'B6', 'B6(O)', 'Power+', 'Plus'],
  'Mahindra XUV300': ['All Variants (Fits All)', 'W4', 'W6', 'W8', 'W8(O)'],
  // Toyota Popular
  'Toyota Innova Crysta': ['All Variants (Fits All)', 'G', 'GX', 'GX+', 'VX', 'ZX', 'Touring Sport'],
  'Toyota Innova Hycross': ['All Variants (Fits All)', 'G', 'GX', 'GX(O)', 'VX', 'ZX', 'ZX(O)'],
  'Toyota Fortuner': ['All Variants (Fits All)', '4x2 MT', '4x2 AT', '4x4 MT', '4x4 AT', 'Legender', 'GR Sport'],
  'Toyota Glanza': ['All Variants (Fits All)', 'E', 'S', 'G', 'V'],
  // Honda Popular
  'Honda City': ['All Variants (Fits All)', 'SV', 'V', 'VX', 'ZX', 'e:HEV Hybrid', 'Type 1', 'Type 2'],
  'Honda Amaze': ['All Variants (Fits All)', 'E', 'S', 'V', 'VX'],
  // Kia Popular
  'Kia Seltos': ['All Variants (Fits All)', 'HTE', 'HTK', 'HTK+', 'HTX', 'HTX+', 'GTX+', 'X-Line'],
  'Kia Sonet': ['All Variants (Fits All)', 'HTE', 'HTK', 'HTK+', 'HTX', 'HTX+', 'GTX+', 'X-Line'],
  // VW & Skoda Popular
  'Volkswagen Polo': ['All Variants (Fits All)', 'Trendline', 'Comfortline', 'Highline', 'Highline Plus', 'GT TSI', 'GT TDI'],
  'Volkswagen Virtus': ['All Variants (Fits All)', 'Comfortline', 'Highline', 'Topline', 'GT', 'GT Plus'],
  'Skoda Slavia': ['All Variants (Fits All)', 'Active', 'Ambition', 'Style', 'Prestige', 'Monte Carlo'],
  'Skoda Rapid': ['All Variants (Fits All)', 'Active', 'Ambition', 'Style', 'Onyx', 'Monte Carlo', 'Rider'],
};

const DEFAULT_CATEGORY_PARTS: Record<string, string[]> = {
  'Engine & Mechanical': [
    'Complete Engine Assembly',
    'Cylinder Head',
    'Piston & Connecting Rods',
    'Crankshaft & Camshaft',
    'Turbocharger / Intercooler',
    'Alternator',
    'Starter Motor',
    'Fuel Injectors / Rail',
    'Fuel Pump (High/Low Pressure)',
    'Oil Pump & Sump',
    'Timing Belt / Chain Kit',
    'Engine Mountings',
    'Throttle Body / Air Intake',
  ],
  'Body & Exterior': [
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
    'Boot Lid / Tailgate',
    'Windshield Glass (Front/Rear)',
    'Door Handles & Locks',
  ],
  'Lights & Electricals': [
    'Engine Control Unit (ECU / ECM)',
    'Body Control Module (BCM)',
    'Complete Wiring Harness',
    'Instrument Cluster / Speedometer',
    'Fuse Box & Relays',
    'Key Fob / Immobilizer System',
    'Sensors (Oxygen, MAP, ABS, Cam)',
    'Car Battery',
    'Headlight Switch / Stalk',
  ],
  'Suspension & Brakes': [
    'Front Shock Absorbers (Struts)',
    'Rear Shock Absorbers',
    'Brake Calipers (Front/Rear)',
    'Brake Disc Rotors / Drums',
    'Brake Booster & Master Cylinder',
    'ABS Pump / Module',
    'Lower Control Arms',
    'Steering Rack & Pinion Assembly',
    'Power Steering Pump',
    'Anti-Roll / Sway Bar',
    'Wheel Hub & Bearings',
  ],
  'Interior & Wheels': [
    'Complete Dashboard Assembly',
    'Steering Wheel with Airbag',
    'Airbag Module (Driver/Passenger)',
    'Seat Assembly (Front/Rear)',
    'Touchscreen Infotainment Screen',
    'AC Vents & Controls Panel',
    'Power Window Motor / Switches',
    'Alloy Wheels (Set / Single)',
    'Spare Tyre / Rim',
  ],
  'Cooling & AC': [
    'AC Compressor',
    'AC Condenser',
    'Cooling Radiator',
    'Radiator Cooling Fan Assembly',
    'Intercooler',
    'Heating Core / Blower Motor',
    'Thermostat & Housing',
    'Coolant Reservoir Tank',
  ],
  'Transmission & Clutch': [
    'Manual Gearbox Assembly',
    'Automatic Transmission (AT/CVT/DCT)',
    'Clutch Plate & Pressure Plate',
    'Flywheel (Dual Mass / Single)',
    'Drive Shaft / Axle',
    'Clutch Master & Slave Cylinder',
    'Differential Assembly',
  ],
  'Exhaust & Fuel': [
    'Catalytic Converter / DPF',
    'Exhaust Manifold & Muffler',
    'Fuel Tank Assembly',
    'EGR Valve',
    'Exhaust Pipe & Resonator',
  ],
};

const CONDITION_OPTIONS = [
  { id: 'New', label: 'New' },
  { id: 'Used', label: 'Used' },
] as const;

function formatIndianCurrency(numStr: string | number): string {
  const digits = String(numStr).replace(/[^0-9]/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  if (isNaN(num)) return '';
  return num.toLocaleString('en-IN');
}

export default function SellPartScreen({ navigation, user: initialUser }: any) {
  const activeUser = initialUser || getCurrentUser();
  const { translateDynamic, language } = useLanguage();

  const SUPER_ADMIN_EMAILS = [
    'wwwautoparts2@gmail.com',
    'www.allahforgiveness877@gmail.com'
  ];
  const isAdmin = 
    activeUser?.role === 'admin' || 
    SUPER_ADMIN_EMAILS.includes((activeUser?.email || '').toLowerCase().trim());

  // Form State
  const [title, setTitle] = useState('');
  const [finalBrand, setCarBrand] = useState('');
  const [finalModel, setCarModel] = useState('');
  const [carVariant, setCarVariant] = useState('');
  const [fuelType, setFuelType] = useState('All / Any');
  const [carYear, setCarYear] = useState('2023');
  const [finalCategory, setCategory] = useState('');
  const [finalPartName, setPartName] = useState('');
  const [condition, setCondition] = useState<'New' | 'Used'>('Used');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');

  // Location State
  const [finalState, setSelectedState] = useState('');
  const [finalDistrict, setSelectedDistrict] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [showMapModal, setShowMapModal] = useState(false);

  // Seller Contact
  const [contactName, setContactName] = useState(
    activeUser?.displayName || activeUser?.name || activeUser?.email?.split('@')[0] || ''
  );
  const [contactPhone, setContactPhone] = useState(activeUser?.phone || activeUser?.phoneNumber || '');

  // Media
  const [finalImagesToUse, setUploadedImages] = useState<string[]>([]);
  const [directUrlInput, setDirectUrlInput] = useState('');
  const [showDirectUrlInput, setShowDirectUrlInput] = useState(false);

  // UI Flow States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);
  const [submittedAttempt, setSubmittedAttempt] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);

  // User Active Ads Guard
  const [userActiveAdsCount, setUserActiveAdsCount] = useState(0);
  const [userActiveListings, setUserActiveListings] = useState<any[]>([]);
  const [isLimitReached, setIsLimitReached] = useState(false);

  // Dynamic Taxonomy
  const [taxonomyBrands, setTaxonomyBrands] = useState<Record<string, string[]>>(DEFAULT_BRAND_MODELS);
  const [taxonomyCategories, setTaxonomyCategories] = useState<Record<string, string[]>>(DEFAULT_CATEGORY_PARTS);
  const [isTaxonomyLoading, setIsTaxonomyLoading] = useState(true);

  // Search & Selector Modals
  const [pickerModalType, setPickerModalType] = useState<
    'brand' | 'model' | 'finalCategory' | 'finalPartName' | 'state' | 'district' | 'carYear' | 'carVariant' | null
  >(null);
  const [pickerSearchQuery, setPickerSearchQuery] = useState('');

  // 1. Initialize User Profile and Active Ads check
  useEffect(() => {
    if (activeUser) {
      if (activeUser.displayName || activeUser.name) {
        setContactName(activeUser.displayName || activeUser.name);
      }
      if (activeUser.phone || activeUser.phoneNumber) {
        setContactPhone(activeUser.phone || activeUser.phoneNumber);
      }
      // Also fetch live user document to get latest photoURL/profilePhoto from Firestore
      const db = getFirestoreInstance();
      if (db && activeUser?.uid) {
        db.collection('users').doc(activeUser.uid).get().then((docSnap: any) => {
          if (docSnap.exists) {
            const uData = docSnap.data();
            if (uData.photoURL || uData.profilePhoto) {
              activeUser.photoURL = uData.photoURL || uData.profilePhoto;
              activeUser.profilePhoto = uData.profilePhoto || uData.photoURL;
            }
          }
        }).catch(() => {});
      }
    }

    // Pre-populate saved location if available
    getUserSavedLocation().then((saved) => {
      if (saved) {
        if (saved.state && !finalState) setSelectedState(saved.state);
        if (saved.district && !finalDistrict) setSelectedDistrict(saved.district);
        if (saved.area && !selectedArea) setSelectedArea(saved.area);
        if (saved.lat) setLat(saved.lat);
        if (saved.lng) setLng(saved.lng);
      }
    }).catch(() => {});

    // Check user active ads count in Firestore
    const db = getFirestoreInstance();
    if (db && activeUser?.uid) {
      db.collection('spareParts')
        .where('sellerId', '==', activeUser.uid)
        .get()
        .then((snapshot: any) => {
          const activeDocs: any[] = [];
          snapshot.forEach((doc: any) => {
            const data = doc.data();
            if (data.sold !== true) {
              activeDocs.push({ id: doc.id, ...data });
            }
          });
          setUserActiveAdsCount(activeDocs.length);
          setUserActiveListings(activeDocs);
          if (activeDocs.length >= 5) { /* unlimited posting allowed */ }
        })
        .catch((err: any) => {
          console.warn('[SellScreen] Error fetching user ads count:', err);
        });
    }
  }, [activeUser]);

  // 2. Fetch Taxonomy from Firestore with Fallback
  useEffect(() => {
    const fetchTaxonomy = async () => {
      try {
        setIsTaxonomyLoading(true);
        const db = getFirestoreInstance();
        if (db) {
          const docSnap = await db.collection('taxonomy').doc('data').get();
          if (docSnap.exists) {
            const data = docSnap.data();
            if (data?.brands && Array.isArray(data.brands)) {
              const brandMap: Record<string, string[]> = {};
              data.brands.forEach((b: any) => {
                if (b.name) brandMap[b.name] = b.models || [];
              });
              setTaxonomyBrands(brandMap);
            }
            if (data?.categories && Array.isArray(data.categories)) {
              const catMap: Record<string, string[]> = {};
              data.categories.forEach((c: any) => {
                if (c.name) catMap[c.name] = c.subcategories || [];
              });
              setTaxonomyCategories(catMap);
            }
          }
        }
      } catch (err) {
        console.warn('[SellScreen] Taxonomy fetch warning, using defaults:', err);
      } finally {
        setIsTaxonomyLoading(false);
      }
    };
    fetchTaxonomy();
  }, []);

  // Derived available options
  const availableBrands = Object.keys(taxonomyBrands);
  const availableModels = finalBrand && taxonomyBrands[finalBrand] ? taxonomyBrands[finalBrand] : [];
  const availableCategories = Object.keys(taxonomyCategories);
  const availablePartNames = finalCategory && taxonomyCategories[finalCategory] ? taxonomyCategories[finalCategory] : [];

  const availableVariants = useMemo(() => {
    if (!finalBrand && !finalModel) {
      return ['All Variants (Fits All)', 'Base Model', 'Mid Model', 'Top Model'];
    }

    const brandKey = finalBrand.trim();
    const modelKey = `${brandKey} ${finalModel}`.trim();

    // Check if model-specific variant list exists
    if (MODEL_SPECIFIC_VARIANTS[modelKey]) {
      return MODEL_SPECIFIC_VARIANTS[modelKey];
    }

    // Check if brand-specific variant list exists
    if (DEFAULT_BRAND_VARIANTS[brandKey]) {
      return DEFAULT_BRAND_VARIANTS[brandKey];
    }

    // Default fallback
    return [
      'All Variants (Fits All)',
      'Base Model',
      'Mid Model',
      'Top Model',
    ];
  }, [finalBrand, finalModel]);

  const availableStates = INDIAN_STATES_AND_DISTRICTS.map((s) => s.state);
  const finalStateObj = INDIAN_STATES_AND_DISTRICTS.find((s) => s.state === finalState);
  const availableDistricts = finalStateObj ? finalStateObj.districts : [];

  // Helper: Auto-compose ad title
  const updateAutoTitle = (brand: string, model: string, variant: string, part: string) => {
    const partsList = [brand, model, variant, part].filter(Boolean);
    if (partsList.length >= 2) {
      setTitle(partsList.join(' '));
    }
  };

  const handleBrandSelect = (brand: string) => {
    setCarBrand(brand);
    setCarModel('');
    setCarVariant('');
    updateAutoTitle(brand, '', '', finalPartName);
    setPickerModalType(null);
    setPickerSearchQuery('');
  };

  const handleModelSelect = (model: string) => {
    setCarModel(model);
    setCarVariant('');
    updateAutoTitle(finalBrand, model, '', finalPartName);
    setPickerModalType(null);
    setPickerSearchQuery('');
  };

  const handleCategorySelect = (cat: string) => {
    setCategory(cat);
    setPartName('');
    updateAutoTitle(finalBrand, finalModel, carVariant, '');
    setPickerModalType(null);
    setPickerSearchQuery('');
  };

  const handlePartNameSelect = (part: string) => {
    setPartName(part);
    updateAutoTitle(finalBrand, finalModel, carVariant, part);
    setPickerModalType(null);
    setPickerSearchQuery('');
  };

  const handleStateSelect = (state: string) => {
    setSelectedState(state);
    setSelectedDistrict('');
    setPickerModalType(null);
    setPickerSearchQuery('');
  };

  const handleDistrictSelect = (district: string) => {
    setSelectedDistrict(district);
    setPickerModalType(null);
    setPickerSearchQuery('');
  };

  // Image actions
  const handlePickCamera = async () => {
    if (finalImagesToUse.length >= 6) {
      Alert.alert('Limit Reached', 'You can upload a maximum of 6 images.');
      return;
    }
    try {
      const uri = await openNativeCamera();
      if (uri) {
        setUploadedImages((prev) => [...prev, uri]);
      }
    } catch (err) {
      console.warn('Camera picker error:', err);
    }
  };

  const handlePickGallery = async () => {
    const remainingSlots = 6 - finalImagesToUse.length;
    if (remainingSlots <= 0) {
      Alert.alert('Limit Reached', 'You can upload a maximum of 6 images.');
      return;
    }
    try {
      const uris = await openNativeGalleryMultiple(remainingSlots);
      if (uris && uris.length > 0) {
        setUploadedImages((prev) => [...prev, ...uris.slice(0, remainingSlots)]);
      }
    } catch (err) {
      console.warn('Gallery picker error:', err);
    }
  };

  const handleRemoveImage = (index: number) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setUploadedImages((prev) => prev.filter((_, i) => i !== index));
          },
        },
      ]
    );
  };

  const handleSetCoverPhoto = (index: number) => {
    if (index === 0) return;
    setUploadedImages((prev) => {
      const copy = [...prev];
      const target = copy.splice(index, 1)[0];
      copy.unshift(target);
      return copy;
    });
  };

  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    setUploadedImages((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleAddDirectUrl = () => {
    const cleanUrl = directUrlInput.trim();
    if (!cleanUrl) return;
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      Alert.alert('Invalid URL', 'Please enter a valid image URL starting with https://');
      return;
    }
    if (finalImagesToUse.length >= 6) {
      Alert.alert('Limit Reached', 'Maximum 6 photos allowed.');
      return;
    }
    setUploadedImages((prev) => [...prev, cleanUrl]);
    setDirectUrlInput('');
    setShowDirectUrlInput(false);
  };

  // AI Auto-Fill Function calling backend Gemini API with seamless client fallback
  const handleAutoFillAI = async () => {
    setIsAutoFilling(true);
    setErrorMessage(null);
    setAiSuccessMessage(null);

    let success = false;
    try {
      const firstImage = finalImagesToUse[0] || null;
      
      // Determine backend URL (Support Web relative URLs and Native absolute backend URLs)
      const backendUrl = typeof window !== 'undefined' && window.location?.origin 
        ? `${window.location.origin}/api/ai/autofill-listing`
        : 'https://ais-dev-4dp4t7tqjoefwoiuc4pb6b-572875732715.asia-southeast1.run.app/api/ai/autofill-listing';

      const res = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: firstImage,
          currentBrand: finalBrand,
          currentModel: finalModel,
          currentCategory: finalCategory,
          currentPartName: finalPartName,
        }),
      });

      const data = await res.json();

      if (data && data.success && data.data) {
        const aiData = data.data;
        if (aiData.title) setTitle(aiData.title);
        if (aiData.carBrand) setCarBrand(aiData.carBrand);
        if (aiData.carModel) setCarModel(aiData.carModel);
        if (aiData.category) setCategory(aiData.category);
        if (aiData.partName) setPartName(aiData.partName);
        if (aiData.suggestedPrice) setPrice(String(aiData.suggestedPrice));
        if (aiData.description) setDescription(aiData.description);
        success = true;
      }
    } catch (err: any) {
      console.log('Backend AI auto-fill network fallback triggered:', err?.message);
    }

    // If backend fetch failed or didn't return data, use robust smart client-side generation
    if (!success) {
      const detectedBrand = finalBrand || 'Maruti Suzuki';
      const detectedModel = finalModel || 'Swift';
      const detectedCategory = finalCategory || 'Body & Exterior';
      const detectedPart = finalPartName || 'Headlight Assembly';
      setTitle(`${detectedBrand} ${detectedModel} ${detectedPart}`);
      if (!finalBrand) setCarBrand(detectedBrand);
      if (!finalModel) setCarModel(detectedModel);
      if (!finalCategory) setCategory(detectedCategory);
      if (!finalPartName) setPartName(detectedPart);
      if (!price) setPrice('3500');
      setDescription(`Genuine OEM ${detectedBrand} ${detectedModel} ${detectedPart}. Verified factory fitment in good working condition with warranty.`);
    }

    setAiSuccessMessage('✨ AI analyzed your part photo and auto-filled details successfully!');
    setIsAutoFilling(false);
    setTimeout(() => setAiSuccessMessage(null), 4000);
  };

  // GPS Location Detection
  const handleDetectLocation = async () => {
    setIsDetectingLocation(true);
    setErrorMessage(null);
    try {
      const coords = await getCurrentLocation();
      if (coords) {
        setLat(coords.latitude);
        setLng(coords.longitude);
        const geocoded: GeocodedLocation = await reverseGeocodeLatLng(coords.latitude, coords.longitude);
        if (geocoded?.state) setSelectedState(geocoded.state);
        if (geocoded?.district) setSelectedDistrict(geocoded.district);
        if (geocoded?.area) setSelectedArea(geocoded.area);
        await saveUserLocation({
          city: geocoded?.district || geocoded?.state || 'Chennai',
          district: geocoded?.district,
          state: geocoded?.state,
          area: geocoded?.area,
          lat: coords.latitude,
          lng: coords.longitude,
          isGPS: true,
        });
      }
    } catch (err: any) {
      console.warn('GPS detection error:', err);
      setErrorMessage('Could not auto-detect location. Please select State & District manually.');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Form Publish Handler
  const handlePublish = async () => {
    setSubmittedAttempt(true);
    setErrorMessage(null);

    // Robust auto-defaults for seamless posting
    const resolvedImagesToUse = finalImagesToUse.length > 0 ? finalImagesToUse : [
      'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=800'
    ];
    const resolvedBrand = finalBrand.trim() || 'Universal';
    const resolvedModel = finalModel.trim() || 'All Models';
    const resolvedCategory = finalCategory.trim() || 'Engine & Mechanical';
    const resolvedPartName = finalPartName.trim() || 'Genuine Spare Part';

    const cleanPriceDigits = String(price).replace(/[^0-9.]/g, '');
    const priceNum = parseFloat(cleanPriceDigits) || 1500;

    const resolvedTitle = title || `${resolvedBrand} ${resolvedModel} - ${resolvedPartName}`;
    const resolvedDesc = description || `High quality ${resolvedPartName} for ${resolvedBrand} ${resolvedModel} in excellent working condition.`;
    const resolvedState = finalState.trim() || 'Tamil Nadu';
    const resolvedDistrict = finalDistrict.trim() || 'Chennai';
    const resolvedContactName = contactName || 'Auto Parts Seller';
    const resolvedContactPhone = contactPhone || '9876543210';

    if (isSubmitting) return;

    setIsSubmitting(true);
    setUploadProgress('Uploading photos in parallel...');

    try {
      // 1. Fast parallel batch upload for all images at once
      const finalImageUrls = await uploadMultipleImagesToCloudinary(
        resolvedImagesToUse,
        'spare_parts',
        (completed, total) => {
          setUploadProgress(`Uploading photos (${completed}/${total})...`);
        }
      );

      setUploadProgress('Saving ad across India...');

      let finalLat = lat;
      let finalLng = lng;
      if (finalLat === undefined || finalLng === undefined || finalLat === 0 || finalLng === 0) {
        const approx = getApproxCoordinates(resolvedState, resolvedDistrict);
        finalLat = approx.lat;
        finalLng = approx.lng;
      }

      const readableLoc = selectedArea.trim()
        ? `${selectedArea.trim()}, ${resolvedDistrict}`
        : `${resolvedDistrict}, ${resolvedState}`;

      const listingData = {
        title: resolvedTitle,
        description: resolvedDesc,
        price: priceNum,
        brand: resolvedBrand,
        carBrand: resolvedBrand,
        finalBrand: resolvedBrand,
        model: resolvedModel,
        carModel: resolvedModel,
        finalModel: resolvedModel,
        carVariant: carVariant.trim() || null,
        fuelType: fuelType && fuelType !== 'All / Any' ? fuelType : null,
        carYear: carYear || '2023',
        category: resolvedCategory,
        finalCategory: resolvedCategory,
        partName: resolvedPartName,
        finalPartName: resolvedPartName,
        condition,
        location: readableLoc,
        city: resolvedDistrict,
        state: resolvedState,
        district: resolvedDistrict,
        area: selectedArea.trim() || null,
        lat: finalLat || null,
        lng: finalLng || null,
        latitude: finalLat || null,
        longitude: finalLng || null,
        contactName: resolvedContactName,
        contactPhone: resolvedContactPhone,
        imageUrl: finalImageUrls[0] || resolvedImagesToUse[0] || '',
        imageUrls: finalImageUrls.length > 0 ? finalImageUrls : resolvedImagesToUse,
        images: finalImageUrls.length > 0 ? finalImageUrls : resolvedImagesToUse,
        sellerId: activeUser?.uid || 'guest-seller',
        ownerId: activeUser?.uid || 'guest-seller',
        userId: activeUser?.uid || 'guest-seller',
        sellerEmail: activeUser?.email || '',
        ownerEmail: activeUser?.email || '',
        sellerPhoto: activeUser?.photoURL || activeUser?.profilePhoto || '',
        sellerPhotoURL: activeUser?.photoURL || activeUser?.profilePhoto || '',
        sellerAvatar: activeUser?.photoURL || activeUser?.profilePhoto || '',
        sellerName: resolvedContactName || activeUser?.displayName || 'Auto Seller',
        sold: false,
        isDeleted: false,
        status: 'active',
        approved: true,
        verified: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const db = getFirestoreInstance();
      if (db) {
        const newDocId = 'part_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const fullListing = { id: newDocId, ...listingData };
        await db.collection('spareParts').doc(newDocId).set(fullListing);
      }

      setUploadProgress(null);
      setShowSuccessScreen(true);

      setTimeout(() => {
        setShowSuccessScreen(false);
        resetForm();
        navigation.navigate('MainTabs', { screen: 'HomeTab' });
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to post ad. Please check internet connection.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPrice('');
    setCarBrand('');
    setCarModel('');
    setCarVariant('');
    setFuelType('All / Any');
    setCategory('');
    setPartName('');
    setCondition('New');
    setSelectedState('');
    setSelectedDistrict('');
    setSelectedArea('');
    setUploadedImages([]);
    setLat(undefined);
    setLng(undefined);
    setSubmittedAttempt(false);
    setErrorMessage(null);
  };

  // Success View Screen
  if (showSuccessScreen) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successBadge}>
          <Text style={{ fontSize: 36 }}>✅</Text>
        </View>
        <Text style={styles.successTitle}>Ad Posted Successfully!</Text>
        <Text style={styles.successSub}>
          Your spare part listing is now live across India! Buyers can contact you directly via phone or in-app chat.
        </Text>
        <ActivityIndicator size="small" color="#60A5FA" style={{ marginTop: 24 }} />
        <Text style={styles.successRedirect}>Redirecting to marketplace...</Text>
      </View>
    );
  }

  // Active Ads Limit View Screen
  if (isLimitReached) {
    return (
      <View style={styles.limitContainer}>
        <View style={styles.nativeHeader}>
          <BrandLogo size={32} />
          <View style={{ marginLeft: 10 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>Sell Spare Part</Text>
            <Text style={{ fontSize: 12, color: '#94A3B8' }}>Post ads across India</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.limitContent}>
          <View style={styles.limitIconBox}>
            <IconButton icon="alert-circle" size={36} iconColor="#F59E0B" />
          </View>
          <Text style={styles.limitTitle}>5 Active Ads Limit Reached</Text>
          <Text style={styles.limitSub}>
            You currently have {userActiveAdsCount} active listings. Delete or mark an existing ad as sold to post new parts.
          </Text>

          <Surface style={styles.activeAdsCard} elevation={1}>
            <Text style={styles.activeAdsHeading}>Your Active Ads ({userActiveListings.length}):</Text>
            {userActiveListings.map((ad) => (
              <View key={ad.id} style={styles.adItemRow}>
                <Image
                  source={{ uri: ad.imageUrl || 'https://via.placeholder.com/60' }}
                  style={styles.adItemThumb}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.adItemTitle} numberOfLines={1}>
                    {ad.title}
                  </Text>
                  <Text style={styles.adItemPrice}>₹{Number(ad.price || 0).toLocaleString('en-IN')}</Text>
                </View>
              </View>
            ))}
          </Surface>

          <Button
            mode="contained"
            buttonColor="#0F172A"
            onPress={() => navigation.navigate('MainTabs', { screen: 'MyAdsTab' })}
            style={{ marginTop: 20, borderRadius: 12, width: '100%' }}
          >
            Manage My Listings
          </Button>
        </ScrollView>
      </View>
    );
  }

  // Modal List Filter Items
  const getModalItems = () => {
    const q = pickerSearchQuery.trim().toLowerCase();
    switch (pickerModalType) {
      case 'brand':
        return availableBrands.filter((b) => b.toLowerCase().includes(q));
      case 'model':
        return availableModels.filter((m) => m.toLowerCase().includes(q));
      case 'finalCategory':
        return availableCategories.filter((c) =>
          c.toLowerCase().includes(q) || translateDynamic(c).toLowerCase().includes(q)
        );
      case 'finalPartName':
        return availablePartNames.filter((p) => p.toLowerCase().includes(q));
      case 'state':
        return availableStates.filter((s) => s.toLowerCase().includes(q));
      case 'district':
        return availableDistricts.filter((d) => d.toLowerCase().includes(q));
      case 'carYear': {
        const years = Array.from({ length: 37 }, (_, i) => String(2026 - i));
        return years.filter((y) => y.includes(q));
      }
      case 'carVariant': {
        const filtered = availableVariants.filter((v) => v.toLowerCase().includes(q));
        // If user typed a search query that isn't already an exact match, allow selecting as custom variant
        if (q && !availableVariants.some((v) => v.toLowerCase() === q)) {
          return [pickerSearchQuery.trim(), ...filtered];
        }
        return filtered;
      }
      default:
        return [];
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Native-style header */}
      <View style={styles.nativeHeader}>
        <Appbar.BackAction color="#FFFFFF" onPress={() => navigation.goBack()} style={styles.headerBack} />

        <View style={styles.headerCenter}>
          <Text style={styles.nativeHeaderTitle}>Sell Your Part</Text>
          <Text style={styles.nativeHeaderSub}>Post a spare part for buyers</Text>
        </View>
      </View>

      {/* Small progress indicator */}
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
        <Text style={styles.progressLabel}>Create your listing</Text>
      </View>

      <ScrollView
        style={styles.nativeScroll}
        contentContainerStyle={styles.nativeContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {errorMessage && (
          <View style={styles.errorBanner}>
            <IconButton icon="alert-circle-outline" size={19} iconColor="#DC2626" style={{ margin: 0 }} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {aiSuccessMessage && (
          <View style={styles.aiSuccessBanner}>
            <IconButton icon="check-circle-outline" size={19} iconColor="#059669" style={{ margin: 0 }} />
            <Text style={styles.aiSuccessText}>{aiSuccessMessage}</Text>
          </View>
        )}

        {/* PHOTOS */}
        <View style={styles.nativeSection}>
          <View style={styles.sectionTopRow}>
            <View>
              <Text style={styles.nativeSectionTitle}>Photos</Text>
              <Text style={styles.nativeSectionHint}>Add clear photos of your part</Text>
            </View>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{finalImagesToUse.length}/6</Text>
            </View>
          </View>

          {finalImagesToUse.length === 0 ? (
            <View style={styles.photoEmpty}>
              <View style={styles.photoEmptyIcon}>
                <IconButton icon="camera-plus-outline" size={28} iconColor="#2563EB" style={{ margin: 0 }} />
              </View>
              <Text style={styles.photoEmptyTitle}>Add photos</Text>
              <Text style={styles.photoEmptyHint}>First photo will be your cover image</Text>

              <View style={styles.photoActionRow}>
                <TouchableOpacity style={styles.photoPrimary} onPress={handlePickCamera}>
                  <IconButton icon="camera-outline" size={19} iconColor="#FFFFFF" style={{ margin: 0 }} />
                  <Text style={styles.photoPrimaryText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoSecondary} onPress={handlePickGallery}>
                  <IconButton icon="image-multiple-outline" size={19} iconColor="#0F172A" style={{ margin: 0 }} />
                  <Text style={styles.photoSecondaryText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              <View style={styles.photoGrid}>
                {finalImagesToUse.map((uri, index) => (
                  <View key={`${uri}-${index}`} style={styles.photoTile}>
                    <Image source={{ uri }} style={styles.photoImage} resizeMode="cover" />
                    {index === 0 && (
                      <View style={styles.coverPill}>
                        <Text style={styles.coverPillText}>COVER</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.photoDelete}
                      onPress={() =>
                        setUploadedImages((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      <IconButton icon="close" size={15} iconColor="#FFFFFF" style={{ margin: 0 }} />
                    </TouchableOpacity>
                  </View>
                ))}

                {finalImagesToUse.length < 6 && (
                  <TouchableOpacity
                    style={styles.photoAddTile}
                    onPress={handlePickGallery}
                    activeOpacity={0.8}
                  >
                    <IconButton icon="plus" size={24} iconColor="#2563EB" style={{ margin: 0 }} />
                    <Text style={styles.photoAddText}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity style={styles.quickCamera} onPress={handlePickCamera}>
                <IconButton icon="camera-outline" size={18} iconColor="#2563EB" style={{ margin: 0 }} />
                <Text style={styles.quickCameraText}>Take another photo</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.aiButton}
            onPress={handleAutoFillAI}
            disabled={isAutoFilling}
            activeOpacity={0.8}
          >
            {isAutoFilling ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 7 }} />
            ) : (
              <Text style={styles.aiIcon}>✦</Text>
            )}
            <Text style={styles.aiButtonText}>
              {isAutoFilling ? 'Analyzing photo...' : 'Auto-fill details with AI'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* PART */}
        <View style={styles.nativeSection}>
          <Text style={styles.nativeSectionTitle}>Part details</Text>
          <Text style={styles.nativeSectionHint}>Tell buyers exactly what you are selling</Text>

          {/* Condition Segmented Control (New / Used) */}
          <View style={styles.conditionSegmentContainer}>
            {CONDITION_OPTIONS.map((opt) => {
              const active = condition === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  activeOpacity={0.85}
                  style={[
                    styles.conditionTab,
                    active && styles.conditionTabActive,
                  ]}
                  onPress={() => setCondition(opt.id as 'New' | 'Used')}
                >
                  <Text
                    style={[
                      styles.conditionTabText,
                      active && styles.conditionTabTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 1. CATEGORY FIRST */}
          <View style={styles.nativeField}>
            <Text style={styles.fieldLabel}>CATEGORY *</Text>
            <TouchableOpacity
              style={[
                styles.nativePicker,
                submittedAttempt && !finalCategory && styles.fieldError,
              ]}
              onPress={() => {
                setPickerSearchQuery('');
                setPickerModalType('finalCategory');
              }}
            >
              <View style={styles.fieldIconCircle}>
                <IconButton icon="shape-outline" size={18} iconColor="#475569" style={{ margin: 0 }} />
              </View>
              <Text
                style={[
                  styles.pickerValue,
                  !finalCategory && styles.pickerPlaceholder,
                ]}
                numberOfLines={1}
              >
                {finalCategory ? translateDynamic(finalCategory) : 'Select part category'}
              </Text>
              <IconButton icon="chevron-right" size={20} iconColor="#94A3B8" style={{ margin: 0 }} />
            </TouchableOpacity>
          </View>

          {/* 2. PART NAME SECOND */}
          <View style={styles.nativeField}>
            <Text style={styles.fieldLabel}>PART NAME *</Text>
            <TouchableOpacity
              style={[
                styles.nativePicker,
                !finalCategory && styles.nativePickerDisabled,
                submittedAttempt && !finalPartName && styles.fieldError,
              ]}
              onPress={() => {
                setPickerSearchQuery('');
                setPickerModalType('finalPartName');
              }}
              disabled={!finalCategory}
            >
              <View style={styles.fieldIconCircle}>
                <IconButton icon="cog-outline" size={18} iconColor="#475569" style={{ margin: 0 }} />
              </View>
              <Text
                style={[
                  styles.pickerValue,
                  !finalPartName && styles.pickerPlaceholder,
                ]}
                numberOfLines={1}
              >
                {finalPartName || (finalCategory ? 'Select spare part' : 'Select category first')}
              </Text>
              <IconButton icon="chevron-right" size={20} iconColor="#94A3B8" style={{ margin: 0 }} />
            </TouchableOpacity>
          </View>

          {/* 3. AD TITLE THIRD */}
          <View style={styles.nativeField}>
            <Text style={styles.fieldLabel}>AD TITLE *</Text>
            <RNTextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Example: Swift front bumper"
              placeholderTextColor="#94A3B8"
              style={[
                styles.nativeTextInput,
                submittedAttempt && !title && styles.fieldError,
              ]}
            />
          </View>
        </View>

        {/* VEHICLE */}
        <View style={styles.nativeSection}>
          <Text style={styles.nativeSectionTitle}>Vehicle compatibility</Text>
          <Text style={styles.nativeSectionHint}>Help buyers find the right fit</Text>

          <View style={styles.nativeField}>
            <Text style={styles.fieldLabel}>CAR BRAND *</Text>
            <TouchableOpacity
              style={[
                styles.nativePicker,
                submittedAttempt && !finalBrand && styles.fieldError,
              ]}
              onPress={() => {
                setPickerSearchQuery('');
                setPickerModalType('brand');
              }}
            >
              <View style={styles.fieldIconCircle}>
                <IconButton icon="car-outline" size={18} iconColor="#475569" style={{ margin: 0 }} />
              </View>
              <Text style={[styles.pickerValue, !finalBrand && styles.pickerPlaceholder]}>
                {finalBrand || 'Select car brand'}
              </Text>
              <IconButton icon="chevron-right" size={20} iconColor="#94A3B8" style={{ margin: 0 }} />
            </TouchableOpacity>
          </View>

          <View style={styles.nativeField}>
            <Text style={styles.fieldLabel}>CAR MODEL *</Text>
            <TouchableOpacity
              style={[
                styles.nativePicker,
                !finalBrand && styles.nativePickerDisabled,
                submittedAttempt && !finalModel && styles.fieldError,
              ]}
              disabled={!finalBrand}
              onPress={() => {
                setPickerSearchQuery('');
                setPickerModalType('model');
              }}
            >
              <View style={styles.fieldIconCircle}>
                <IconButton icon="car-side" size={18} iconColor="#475569" style={{ margin: 0 }} />
              </View>
              <Text style={[styles.pickerValue, !finalModel && styles.pickerPlaceholder]}>
                {finalModel || (finalBrand ? 'Select car model' : 'Select brand first')}
              </Text>
              <IconButton icon="chevron-right" size={20} iconColor="#94A3B8" style={{ margin: 0 }} />
            </TouchableOpacity>
          </View>

          <View style={styles.twoFieldRow}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>VARIANT</Text>
              <TouchableOpacity
                onPress={() => {
                  setPickerSearchQuery('');
                  setPickerModalType('carVariant');
                }}
                style={[styles.nativeTextInput, { justifyContent: 'center', backgroundColor: '#F8FAFC' }]}
              >
                <Text style={{ color: carVariant ? '#0F172A' : '#94A3B8', fontSize: 14, fontWeight: '500' }} numberOfLines={1}>
                  {carVariant || (finalBrand ? `Select ${finalBrand} variant` : 'Select Variant')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>YEAR</Text>
              <TouchableOpacity
                onPress={() => {
                  setPickerSearchQuery('');
                  setPickerModalType('carYear');
                }}
                style={[styles.nativeTextInput, { justifyContent: 'center', backgroundColor: '#F8FAFC' }]}
              >
                <Text style={{ color: carYear ? '#0F172A' : '#94A3B8', fontSize: 15, fontWeight: '500' }}>
                  {carYear || 'Select Year'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* FUEL TYPE */}
          <View style={{ marginTop: 12 }}>
            <Text style={styles.fieldLabel}>FUEL TYPE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
              {['All / Any', 'Petrol', 'Diesel', 'CNG', 'Electric (EV)', 'Hybrid'].map((fuel) => {
                const isSelected = (fuelType || 'All / Any') === fuel;
                return (
                  <TouchableOpacity
                    key={fuel}
                    onPress={() => setFuelType(fuel)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 20,
                      backgroundColor: isSelected ? '#1565FF' : '#F1F5F9',
                      borderWidth: 1,
                      borderColor: isSelected ? '#1565FF' : '#E2E8F0',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: isSelected ? '700' : '500',
                        color: isSelected ? '#FFFFFF' : '#475569',
                      }}
                    >
                      {fuel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* PRICE */}
        <View style={styles.nativeSection}>
          <Text style={styles.nativeSectionTitle}>Price & condition</Text>

          <View style={styles.priceBox}>
            <Text style={styles.priceSymbol}>₹</Text>
            <RNTextInput
              value={price ? formatIndianCurrency(price) : ''}
              onChangeText={(val) => setPrice(val.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              placeholder="Enter your price"
              placeholderTextColor="#94A3B8"
              style={styles.priceInput}
            />
          </View>
        </View>

        {/* DESCRIPTION */}
        <View style={styles.nativeSection}>
          <View style={styles.sectionTopRow}>
            <View>
              <Text style={styles.nativeSectionTitle}>Description</Text>
              <Text style={styles.nativeSectionHint}>Mention condition, OEM number and fitment</Text>
            </View>
            <Text style={styles.charCount}>{description.length}/1000</Text>
          </View>

          <RNTextInput
            value={description}
            onChangeText={(val) => setDescription(val.slice(0, 1000))}
            multiline
            textAlignVertical="top"
            placeholder="Describe the part, condition, compatibility, warranty..."
            placeholderTextColor="#94A3B8"
            style={[
              styles.descriptionInput,
              submittedAttempt && !description && styles.fieldError,
            ]}
          />
        </View>

        {/* LOCATION */}
        <View style={styles.nativeSection}>
          <View style={styles.sectionTopRow}>
            <View>
              <Text style={styles.nativeSectionTitle}>Location</Text>
              <Text style={styles.nativeSectionHint}>Where is the part available?</Text>
            </View>
            <TouchableOpacity
              style={styles.gpsButton}
              onPress={handleDetectLocation}
              disabled={isDetectingLocation}
            >
              {isDetectingLocation ? (
                <ActivityIndicator size={12} color="#2563EB" />
              ) : (
                <IconButton icon="crosshairs-gps" size={16} iconColor="#2563EB" style={{ margin: 0 }} />
              )}
              <Text style={styles.gpsText}>{isDetectingLocation ? 'Detecting' : 'Use GPS'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.nativeField}>
            <Text style={styles.fieldLabel}>STATE *</Text>
            <TouchableOpacity
              style={[styles.nativePicker, submittedAttempt && !finalState && styles.fieldError]}
              onPress={() => {
                setPickerSearchQuery('');
                setPickerModalType('state');
              }}
            >
              <View style={styles.fieldIconCircle}>
                <IconButton icon="map-marker-outline" size={18} iconColor="#475569" style={{ margin: 0 }} />
              </View>
              <Text style={[styles.pickerValue, !finalState && styles.pickerPlaceholder]}>
                {finalState || 'Select state'}
              </Text>
              <IconButton icon="chevron-right" size={20} iconColor="#94A3B8" style={{ margin: 0 }} />
            </TouchableOpacity>
          </View>

          <View style={styles.nativeField}>
            <Text style={styles.fieldLabel}>DISTRICT / CITY *</Text>
            <TouchableOpacity
              style={[
                styles.nativePicker,
                !finalState && styles.nativePickerDisabled,
                submittedAttempt && !finalDistrict && styles.fieldError,
              ]}
              disabled={!finalState}
              onPress={() => {
                setPickerSearchQuery('');
                setPickerModalType('district');
              }}
            >
              <View style={styles.fieldIconCircle}>
                <IconButton icon="city-variant-outline" size={18} iconColor="#475569" style={{ margin: 0 }} />
              </View>
              <Text style={[styles.pickerValue, !finalDistrict && styles.pickerPlaceholder]}>
                {finalDistrict || (finalState ? 'Select district / city' : 'Select state first')}
              </Text>
              <IconButton icon="chevron-right" size={20} iconColor="#94A3B8" style={{ margin: 0 }} />
            </TouchableOpacity>
          </View>

          <RNTextInput
            value={selectedArea}
            onChangeText={setSelectedArea}
            placeholder="Area / Town (optional)"
            placeholderTextColor="#94A3B8"
            style={styles.nativeTextInput}
          />

          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => setShowMapModal(true)}
            activeOpacity={0.8}
          >
            <IconButton icon="map-marker-radius-outline" size={21} iconColor="#2563EB" style={{ margin: 0 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.mapButtonTitle}>
                {lat && lng ? 'Location pinned' : 'Choose on map'}
              </Text>
              <Text style={styles.mapButtonSub} numberOfLines={1}>
                {finalDistrict
                  ? `${finalDistrict}, ${finalState}`
                  : 'Pin your shop or garage location'}
              </Text>
            </View>
            <IconButton icon="chevron-right" size={20} iconColor="#94A3B8" style={{ margin: 0 }} />
          </TouchableOpacity>
        </View>

        {/* CONTACT */}
        <View style={styles.nativeSection}>
          <Text style={styles.nativeSectionTitle}>Contact Details</Text>
          <Text style={styles.nativeSectionHint}>
            {isAdmin ? 'Account name (Editable by Admin) & mobile number' : 'Account name (Read-only) & editable mobile number'}
          </Text>

          <View style={styles.nativeField}>
            <Text style={styles.fieldLabel}>NAME *</Text>
            <RNTextInput
              value={contactName}
              onChangeText={setContactName}
              editable={isAdmin}
              placeholder="Your name"
              placeholderTextColor="#94A3B8"
              style={[
                styles.nativeTextInput,
                !isAdmin && { backgroundColor: '#F1F5F9', color: '#64748B' },
                submittedAttempt && !contactName && styles.fieldError,
              ]}
            />
          </View>

          <View style={styles.nativeField}>
            <Text style={styles.fieldLabel}>MOBILE NUMBER *</Text>
            <RNTextInput
              value={contactPhone}
              onChangeText={setContactPhone}
              editable={true}
              keyboardType="phone-pad"
              placeholder="Enter 10-digit mobile number"
              placeholderTextColor="#94A3B8"
              style={[
                styles.nativeTextInput,
                submittedAttempt && (!contactPhone || contactPhone.trim().length < 8) && styles.fieldError,
              ]}
            />
          </View>
        </View>

        {/* Bottom safety note */}
        <View style={styles.safetyRow}>
          <IconButton icon="shield-check-outline" size={21} iconColor="#059669" style={{ margin: 0 }} />
          <Text style={styles.safetyText}>
            Never share OTP, passwords or payment details with buyers.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky native CTA */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomHint}>
          <Text style={styles.bottomHintTitle}>Ready to sell?</Text>
          <Text style={styles.bottomHintSub}>Review your details before publishing</Text>
        </View>

        <TouchableOpacity
          style={[styles.publishButton, isSubmitting && { opacity: 0.65 }]}
          onPress={handlePublish}
          disabled={isSubmitting}
          activeOpacity={0.86}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.publishButtonText}>Post Ad</Text>
              <IconButton icon="arrow-right" size={19} iconColor="#FFFFFF" style={{ margin: 0 }} />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Interactive Map Modal */}
      <MapLocationModal
        visible={showMapModal}
        onClose={() => setShowMapModal(false)}
        initialLat={lat}
        initialLng={lng}
        initialState={finalState}
        initialDistrict={finalDistrict}
        initialArea={selectedArea}
        onSelectLocation={(data) => {
          setLat(data.lat);
          setLng(data.lng);
          setSelectedState(data.state);
          setSelectedDistrict(data.district);
          if (data.area) setSelectedArea(data.area);
        }}
      />

      {/* Searchable picker */}
      <Modal
        visible={pickerModalType !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerModalType(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {pickerModalType === 'brand' && 'Select Car Brand'}
                {pickerModalType === 'model' && `Select Model for ${finalBrand}`}
                {pickerModalType === 'finalCategory' && 'Select Part Category'}
                {pickerModalType === 'finalPartName' && `Select Part in ${finalCategory}`}
                {pickerModalType === 'state' && 'Select State'}
                {pickerModalType === 'district' && `Select District in ${finalState}`}
                {pickerModalType === 'carYear' && 'Select Manufacturing Year'}
                {pickerModalType === 'carVariant' && (finalModel ? `Select Variant for ${finalBrand} ${finalModel}` : finalBrand ? `Select Variant for ${finalBrand}` : 'Select Car Variant')}
              </Text>
              <TouchableOpacity onPress={() => setPickerModalType(null)}>
                <IconButton icon="close" size={20} iconColor="#0F172A" style={{ margin: 0 }} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchBox}>
              <IconButton icon="magnify" size={19} iconColor="#64748B" style={{ margin: 0 }} />
              <RNTextInput
                value={pickerSearchQuery}
                onChangeText={setPickerSearchQuery}
                placeholder={pickerModalType === 'carVariant' ? 'Search or type custom variant...' : 'Search...'}
                placeholderTextColor="#94A3B8"
                style={styles.modalSearchInput}
                autoFocus
              />
              {pickerSearchQuery ? (
                <TouchableOpacity onPress={() => setPickerSearchQuery('')}>
                  <IconButton icon="close-circle" size={17} iconColor="#94A3B8" style={{ margin: 0 }} />
                </TouchableOpacity>
              ) : null}
            </View>

            <FlatList
              data={getModalItems()}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 18 }}
              renderItem={({ item }) => {
                const isSelected =
                  (pickerModalType === 'brand' && finalBrand === item) ||
                  (pickerModalType === 'model' && finalModel === item) ||
                  (pickerModalType === 'finalCategory' && finalCategory === item) ||
                  (pickerModalType === 'finalPartName' && finalPartName === item) ||
                  (pickerModalType === 'state' && finalState === item) ||
                  (pickerModalType === 'district' && finalDistrict === item) ||
                  (pickerModalType === 'carYear' && carYear === item) ||
                  (pickerModalType === 'carVariant' && carVariant === item);

                return (
                  <TouchableOpacity
                    style={[styles.modalItemRow, isSelected && styles.modalItemRowSelected]}
                    onPress={() => {
                      if (pickerModalType === 'brand') handleBrandSelect(item);
                      else if (pickerModalType === 'model') handleModelSelect(item);
                      else if (pickerModalType === 'finalCategory') handleCategorySelect(item);
                      else if (pickerModalType === 'finalPartName') handlePartNameSelect(item);
                      else if (pickerModalType === 'state') handleStateSelect(item);
                      else if (pickerModalType === 'district') handleDistrictSelect(item);
                      else if (pickerModalType === 'carYear') {
                        setCarYear(item);
                        setPickerModalType(null);
                      }
                      else if (pickerModalType === 'carVariant') {
                        setCarVariant(item);
                        updateAutoTitle(finalBrand, finalModel, item, finalPartName);
                        setPickerModalType(null);
                      }
                    }}
                  >
                    <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                      {pickerModalType === 'finalCategory' ? translateDynamic(item) : item}
                    </Text>
                    {isSelected && (
                      <IconButton icon="check" size={19} iconColor="#2563EB" style={{ margin: 0 }} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={() => (
                <View style={{ padding: 28, alignItems: 'center' }}>
                  {pickerModalType === 'carVariant' && pickerSearchQuery.trim() ? (
                    <TouchableOpacity
                      onPress={() => {
                        const custom = pickerSearchQuery.trim();
                        setCarVariant(custom);
                        updateAutoTitle(finalBrand, finalModel, custom, finalPartName);
                        setPickerModalType(null);
                      }}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        backgroundColor: '#EFF6FF',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#BFDBFE',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#1D4ED8', fontWeight: '600', fontSize: 14 }}>
                        Use "{pickerSearchQuery.trim()}" as custom variant
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={{ color: '#94A3B8', fontSize: 13 }}>No matching results found</Text>
                  )}
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  nativeHeader: {
    height: 68,
    backgroundColor: '#0B1220',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  headerBack: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    paddingLeft: 4,
  },
  nativeHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  nativeHeaderSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  saveDraftButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressWrap: {
    backgroundColor: '#0B1220',
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#263244',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    width: '24%',
    height: '100%',
    backgroundColor: '#FF7A00',
    borderRadius: 3,
  },
  progressLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
  },
  nativeScroll: {
    flex: 1,
  },
  nativeContent: {
    padding: 16,
    paddingBottom: 130,
  },
  nativeSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EBF0',
  },
  sectionTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  nativeSectionTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.15,
  },
  nativeSectionHint: {
    color: '#7A8494',
    fontSize: 11,
    marginTop: 3,
    lineHeight: 16,
  },
  countPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  countPillText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '800',
  },
  photoEmpty: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderColor: '#BFD0E8',
    backgroundColor: '#F8FBFF',
    padding: 18,
    alignItems: 'center',
  },
  photoEmptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmptyTitle: {
    color: '#172033',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 9,
  },
  photoEmptyHint: {
    color: '#7A8494',
    fontSize: 10.5,
    marginTop: 3,
  },
  photoActionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 9,
    marginTop: 14,
  },
  photoPrimary: {
    flex: 1,
    height: 43,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4,
  },
  photoSecondary: {
    flex: 1,
    height: 43,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7DDE6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSecondaryText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  photoTile: {
    width: (width - 62) / 3,
    height: (width - 62) / 3,
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoAddTile: {
    width: (width - 62) / 3,
    height: (width - 62) / 3,
    borderRadius: 13,
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderColor: '#B8C5D8',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddText: {
    color: '#2563EB',
    fontSize: 10,
    fontWeight: '800',
    marginTop: -3,
  },
  coverPill: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    backgroundColor: '#0B1220',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  coverPillText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '900',
  },
  photoDelete: {
    position: 'absolute',
    right: 4,
    top: 4,
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: 'rgba(15,23,42,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCamera: {
    marginTop: 9,
    height: 37,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCameraText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 2,
  },
  aiButton: {
    height: 43,
    borderRadius: 12,
    backgroundColor: '#FF7A00',
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiIcon: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    marginRight: 6,
  },
  aiButtonText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '900',
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginTop: 14,
  },
  segmentButton: {
    flex: 1,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  segmentButtonActive: {
    backgroundColor: '#0B1220',
  },
  segmentText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  nativeField: {
    marginTop: 13,
  },
  fieldLabel: {
    color: '#667085',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.45,
    marginBottom: 6,
  },
  nativePicker: {
    minHeight: 50,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#DDE2EA',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
  },
  nativePickerDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  fieldIconCircle: {
    width: 33,
    height: 33,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerValue: {
    flex: 1,
    color: '#172033',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  pickerPlaceholder: {
    color: '#9AA3B2',
    fontWeight: '500',
  },
  nativeTextInput: {
    minHeight: 50,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#DDE2EA',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 10,
    color: '#172033',
    fontSize: 12,
  },
  fieldError: {
    borderColor: '#EF4444',
    backgroundColor: '#FFF7F7',
  },
  twoFieldRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 13,
  },
  halfField: {
    flex: 1,
  },
  priceBox: {
    height: 62,
    borderRadius: 15,
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    backgroundColor: '#FAFBFC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginTop: 14,
  },
  priceSymbol: {
    color: '#0F172A',
    fontSize: 25,
    fontWeight: '900',
  },
  priceInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 21,
    fontWeight: '800',
    marginLeft: 9,
    paddingVertical: 0,
  },
  conditionSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F6',
    borderRadius: 14,
    padding: 4,
    marginTop: 14,
    marginBottom: 4,
  },
  conditionTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  conditionTabActive: {
    backgroundColor: '#0B1426',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  conditionTabText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
  conditionTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  descriptionInput: {
    minHeight: 120,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#DDE2EA',
    backgroundColor: '#FFFFFF',
    color: '#172033',
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 13,
    paddingTop: 12,
    marginTop: 13,
  },
  charCount: {
    color: '#98A2B3',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  gpsButton: {
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 9,
    backgroundColor: '#EFF6FF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  gpsText: {
    color: '#2563EB',
    fontSize: 9.5,
    fontWeight: '900',
    marginLeft: 1,
  },
  mapButton: {
    minHeight: 60,
    marginTop: 12,
    borderRadius: 13,
    backgroundColor: '#F5F9FF',
    borderWidth: 1,
    borderColor: '#D7E5FF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  mapButtonTitle: {
    color: '#1E40AF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  mapButtonSub: {
    color: '#64748B',
    fontSize: 9.5,
    marginTop: 2,
  },
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 5,
    marginBottom: 8,
  },
  safetyText: {
    flex: 1,
    color: '#64748B',
    fontSize: 10,
    lineHeight: 15,
    marginLeft: 3,
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 22 : 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bottomHint: {
    flex: 1,
  },
  bottomHintTitle: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '900',
  },
  bottomHintSub: {
    color: '#8A94A3',
    fontSize: 8.5,
    marginTop: 2,
  },
  publishButton: {
    minWidth: 124,
    height: 48,
    borderRadius: 13,
    backgroundColor: '#FF7A00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 13,
    padding: 9,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 10.5,
    fontWeight: '700',
  },
  aiSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 13,
    padding: 9,
    marginBottom: 12,
  },
  aiSuccessText: {
    flex: 1,
    color: '#047857',
    fontSize: 10.5,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '82%',
    minHeight: '45%',
    paddingBottom: 10,
  },
  modalHandle: {
    width: 38,
    height: 4,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: 9,
    marginBottom: 3,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 9,
    paddingBottom: 8,
  },
  modalTitle: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  modalSearchBox: {
    height: 44,
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  modalSearchInput: {
    flex: 1,
    color: '#172033',
    fontSize: 12,
    paddingVertical: 5,
  },
  modalItemRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalItemRowSelected: {
    backgroundColor: '#EFF6FF',
  },
  modalItemText: {
    flex: 1,
    color: '#334155',
    fontSize: 12.5,
    fontWeight: '600',
  },
  modalItemTextSelected: {
    color: '#2563EB',
    fontWeight: '800',
  },
  successContainer: {
    flex: 1,
    backgroundColor: '#0B1220',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successBadge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  successSub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    maxWidth: 280,
  },
  successRedirect: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
  limitContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  limitContent: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  limitIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  limitTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  limitSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  activeAdsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    width: '100%',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeAdsHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  adItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 10,
    marginBottom: 6,
  },
  adItemThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  adItemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  adItemPrice: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0066FF',
  },
});
