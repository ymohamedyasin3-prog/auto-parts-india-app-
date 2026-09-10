export interface User {
  id: string;
  uid?: string;
  email: string;
  name: string;
  displayName?: string;
  photoURL?: string;
  profileImageUrl?: string | null;
  profilePhoto?: string;
  customPhoto?: string;
  photoDeleted?: boolean;
  phone?: string;
  state?: string;
  district?: string;
  area?: string;
  lat?: number;
  lng?: number;
  createdAt?: string | number;
  updatedAt?: string | number;
  lastLoginAt?: number;
  emailVerified?: boolean;
  isBlocked?: boolean;
  isSuperAdmin?: boolean;
  isAdmin?: boolean;
  role?: string;
  status?: string;
  online?: boolean;
  lastSeen?: number;
  fcmToken?: string;
  tokenUpdatedAt?: any;
}

export interface SparePart {
  id: string;
  title: string;
  description: string;
  price: number;
  carBrand: string; // e.g. "Maruti Suzuki"
  carModel: string; // e.g. "Swift"
  carVariant?: string; // e.g. "VXi"
  category: string; // e.g. "Engine Components"
  partName?: string; // e.g. "Pistons"
  condition: "Brand New" | "Like New" | "Used (Good)" | "For Scrap/Spares";
  location: string; // e.g. "Mumbai" (fallback/legacy or formatted)
  state?: string;   // e.g. "Maharashtra"
  district?: string; // e.g. "Mumbai"
  city?: string;
  area?: string;     // e.g. "Pallapatti", "Town Hall", etc.
  pincode?: string;
  address?: string;
  lat?: number;
  lng?: number;
  oemNumber?: string;
  partNumber?: string;
  year?: number | string;
  modelYear?: number | string;
  deliveryAvailable?: boolean;
  allIndiaShipping?: boolean;
  finalPartName?: string;
  finalCategory?: string;
  subCategory?: string;
  contactName: string;
  contactPhone: string;
  imageUrl: string;
  imageUrls?: string[];
  images?: string[];
  imagePublicIds?: string[];
  public_ids?: string[];
  ownerId?: string;
  userId?: string;
  sellerId: string;
  sellerEmail: string;
  sellerPhoto?: string;
  sellerAvatar?: string;
  sellerName?: string;
  sold?: boolean;
  featured?: boolean;
  verified?: boolean;
  approved?: boolean;
  status?: "pending" | "approved" | "rejected" | "active" | "sold";
  soldAt?: number;
  isDeleted?: boolean;
  reported?: boolean;
  isDemo?: boolean;
  createdAt: number;
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  tag?: string;
  badgeBg?: string;
  bgGradient?: string;
  imageUrl: string;
  imagePublicId?: string;
  public_id?: string;
  targetLink?: string;
  active: boolean;
  activeStatus?: boolean;
  order: number;
  orderRank?: number;
  createdAt?: number;
  updatedAt?: number;
}

export const INDIAN_CAR_BRANDS: Record<string, string[]> = {
  "Maruti Suzuki": [
    "Swift", "Baleno", "Alto", "Brezza", "Dzire", "Ertiga", "WagonR", "Celerio", 
    "Ignis", "Fronx", "Grand Vitara", "Jimny", "XL6", "Ciaz", "S-Presso", "Eeco", 
    "Ritz", "SX4", "Zen", "Esteem"
  ],
  "Hyundai": [
    "i20", "Creta", "i10 Grand Nios", "Verna", "Venue", "Exter", "Alcazar", 
    "Tucson", "Santro", "Eon", "Elantra", "Santa Fe"
  ],
  "Tata": [
    "Nexon", "Punch", "Altroz", "Tiago", "Tigor", "Harrier", "Safari", "Curvv", 
    "Indica", "Indigo", "Sumo", "Bolt", "Zest"
  ],
  "Mahindra": [
    "Scorpio-N", "Scorpio Classic", "XUV700", "Thar", "Bolero", "Bolero Neo", 
    "XUV300", "XUV400", "XUV500", "TUV300", "Marazzo", "KUV100", "Xylo"
  ],
  "Toyota": [
    "Innova Crysta", "Innova Hycross", "Fortuner", "Glanza", "Urban Cruiser Taisor", 
    "Rumion", "Camry", "Hilux", "Etios", "Liva", "Corolla Altis", "Qualis"
  ],
  "Kia": [
    "Seltos", "Sonet", "Carens", "Carnival", "EV6"
  ],
  "Honda": [
    "City", "Amaze", "Elevate", "Jazz", "WR-V", "Brio", "Civic", "Accord", "CR-V"
  ],
  "Volkswagen": [
    "Virtus", "Taigun", "Tiguan", "Polo", "Vento", "Jetta"
  ],
  "Skoda": [
    "Slavia", "Kushaq", "Kodiaq", "Rapid", "Octavia", "Superb"
  ],
  "Renault": [
    "Kwid", "Triber", "Kiger", "Duster", "Lodgy", "Pulse"
  ],
  "Nissan": [
    "Magnite", "Sunny", "Micra", "Terrano"
  ],
  "MG (Morris Garages)": [
    "Hector", "Astor", "ZS EV", "Comet EV", "Gloster"
  ],
  "Ford": [
    "EcoSport", "Endeavour", "Figo", "Aspire", "Freestyle", "Ikon", "Fiesta"
  ],
  "Jeep": [
    "Compass", "Meridian", "Wrangler", "Grand Cherokee"
  ],
  "Force Motors": [
    "Gurkha", "Trax", "Traveller", "Force One"
  ],
  "Isuzu": [
    "D-Max", "V-Cross", "MU-X", "hi-lander"
  ],
  "BMW": [
    "3 Series", "5 Series", "7 Series", "X1", "X3", "X5", "X7", "M3", "M5"
  ],
  "Mercedes-Benz": [
    "C-Class", "E-Class", "S-Class", "GLA", "GLC", "GLE", "GLS", "G-Wagon"
  ],
  "Audi": [
    "A4", "A6", "A8", "Q3", "Q5", "Q7", "Q8", "e-tron"
  ],
  "Volvo": [
    "XC40", "XC60", "XC90", "S60", "S90"
  ],
  "Land Rover": [
    "Defender", "Range Rover Evoque", "Range Rover Sport", "Discovery", "Velar"
  ],
  "Jaguar": [
    "XE", "XF", "F-Pace", "F-Type"
  ],
  "Porsche": [
    "Macan", "Cayenne", "911", "Panamera", "Taycan"
  ]
};

export const CAR_PART_CATEGORIES = [
  "Engine & Mechanical",
  "Body & Exterior",
  "Lights & Electricals",
  "Suspension & Brakes",
  "Interior & Wheels",
  "Cooling & AC",
  "Transmission & Clutch",
  "Exhaust & Fuel"
];

export const CAR_SPARE_PARTS_BY_CATEGORY: Record<string, string[]> = {
  "Engine & Mechanical": [
    "Complete Engine Assembly",
    "Cylinder Head",
    "Piston & Connecting Rods",
    "Crankshaft & Camshaft",
    "Turbocharger / Intercooler",
    "Alternator",
    "Starter Motor",
    "Fuel Injectors / Rail",
    "Fuel Pump (High/Low Pressure)",
    "Oil Pump & Sump",
    "Timing Belt / Chain Kit",
    "Engine Mountings",
    "Throttle Body / Air Intake"
  ],
  "Body & Exterior": [
    "Front Bumper Assembly",
    "Rear Bumper Assembly",
    "Bonnet / Hood",
    "Front Grille",
    "Headlight Assembly (Pair/Single)",
    "Tail Light Assembly",
    "Fog Lamps / DRLs",
    "Side Mirror Assembly (ORVM)",
    "Front / Rear Doors",
    "Fenders / Quarter Panels",
    "Boot Lid / Tailgate",
    "Windshield Glass (Front/Rear)",
    "Door Handles & Locks"
  ],
  "Lights & Electricals": [
    "Engine Control Unit (ECU / ECM)",
    "Body Control Module (BCM)",
    "Complete Wiring Harness",
    "Instrument Cluster / Speedometer",
    "Fuse Box & Relays",
    "Key Fob / Immobilizer System",
    "Sensors (Oxygen, MAP, ABS, Cam)",
    "Car Battery",
    "Headlight Switch / Stalk"
  ],
  "Suspension & Brakes": [
    "Front Shock Absorbers (Struts)",
    "Rear Shock Absorbers",
    "Brake Calipers (Front/Rear)",
    "Brake Disc Rotors / Drums",
    "Brake Booster & Master Cylinder",
    "ABS Pump / Module",
    "Lower Control Arms",
    "Steering Rack & Pinion Assembly",
    "Power Steering Pump",
    "Anti-Roll / Sway Bar",
    "Wheel Hub & Bearings"
  ],
  "Interior & Wheels": [
    "Complete Dashboard Assembly",
    "Steering Wheel with Airbag",
    "Airbag Module (Driver/Passenger)",
    "Seat Assembly (Front/Rear)",
    "Touchscreen Infotainment Screen",
    "AC Vents & Controls Panel",
    "Power Window Motor / Switches",
    "Alloy Wheels (Set / Single)",
    "Spare Tyre / Rim"
  ],
  "Cooling & AC": [
    "AC Compressor",
    "AC Condenser",
    "Cooling Radiator",
    "Radiator Cooling Fan Assembly",
    "Intercooler",
    "Heating Core / Blower Motor",
    "Thermostat & Housing",
    "Coolant Reservoir Tank"
  ],
  "Transmission & Clutch": [
    "Manual Gearbox Assembly",
    "Automatic Transmission (AT/CVT/DCT)",
    "Clutch Plate & Pressure Plate",
    "Flywheel (Dual Mass / Single)",
    "Drive Shaft / Axle",
    "Clutch Master & Slave Cylinder",
    "Differential Assembly"
  ],
  "Exhaust & Fuel": [
    "Catalytic Converter / DPF",
    "Exhaust Manifold & Muffler",
    "Fuel Tank Assembly",
    "EGR Valve",
    "Exhaust Pipe & Resonator"
  ]
};

export const DEFAULT_MODEL_VARIANTS: Record<string, string[]> = {
  "Swift": ["LXi", "VXi", "ZXi", "ZXi+", "VXi AMT", "ZXi AMT", "ZXi+ AMT", "CNG VXi", "CNG ZXi"],
  "Baleno": ["Sigma", "Delta", "Zeta", "Alpha", "Delta AMT", "Zeta AMT", "Alpha AMT", "CNG Delta"],
  "Brezza": ["LXi", "VXi", "ZXi", "ZXi+", "VXi AT", "ZXi AT", "ZXi+ AT", "CNG VXi"],
  "Dzire": ["LXi", "VXi", "ZXi", "ZXi+", "VXi AMT", "ZXi AMT", "CNG VXi"],
  "Creta": ["E", "EX", "S", "S(O)", "SX", "SX Tech", "SX(O)", "1.5 Turbo DCT", "1.5 Diesel AT"],
  "i20": ["Era", "Magna", "Sportz", "Asta", "Asta (O)", "N Line N6", "N Line N8"],
  "Venue": ["E", "S", "S+", "S(O)", "SX", "SX(O)", "N Line N6", "N Line N8"],
  "Nexon": ["Smart", "Smart+", "Pure", "Creative", "Creative+", "Fearless", "Fearless+", "EV Empowered"],
  "Punch": ["Pure", "Adventure", "Accomplished", "Creative", "CNG Pure", "CNG Adventure"],
  "Harrier": ["Smart", "Pure", "Adventure", "Fearless", "Dark Edition"],
  "Safari": ["Smart", "Pure", "Adventure", "Accomplished", "Dark Edition"],
  "Scorpio-N": ["Z2", "Z4", "Z6", "Z8", "Z8 Select", "Z8L", "Z8L 4x4 MT", "Z8L 4x4 AT"],
  "Thar": ["AX(O) Convertible", "AX(O) Hard Top", "LX Hard Top 4x4 Petrol", "LX Hard Top 4x4 Diesel", "RWD Diesel"],
  "XUV700": ["MX", "AX3", "AX5", "AX7", "AX7 Luxury Pack", "AX7L AWD"],
  "Bolero": ["B4", "B6", "B6(O)"],
  "Fortuner": ["2.7 Petrol MT", "2.7 Petrol AT", "2.8 Diesel 4x2 MT", "2.8 Diesel 4x2 AT", "2.8 Diesel 4x4 MT", "2.8 Diesel 4x4 AT", "Legender 4x2 AT", "Legender 4x4 AT"],
  "Innova Crysta": ["GX 7STR", "GX 8STR", "VX 7STR", "ZX 7STR", "GX+"],
  "City": ["SV", "V", "VX", "ZX", "e:HEV Hybrid"],
  "Amaze": ["E", "S", "VX", "VX CVT"],
  "Seltos": ["HTE", "HTK", "HTK+", "HTX", "HTX+", "GTX+", "X-Line"],
  "Sonet": ["HTE", "HTK", "HTK+", "HTX", "HTX+", "GTX+", "X-Line"],
  "Virtus": ["Highline", "Topline", "GT", "GT Plus"],
  "Polo": ["Trendline", "Comfortline", "Highline", "Highline Plus", "GT TSI"],
  "Slavia": ["Active", "Ambition", "Style", "Monte Carlo"]
};

export const POPULAR_LOCATIONS = [
  "All India",
  "Mumbai",
  "Delhi NCR",
  "Bangalore",
  "Chennai",
  "Hyderabad",
  "Pune",
  "Kolkata",
  "Ahmedabad",
  "Kochi"
];

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: number;
  status?: "pending" | "sent" | "delivered" | "read" | "failed";
  imageUrl?: string;
  senderName?: string;
  senderAvatar?: string;
  isDeleted?: boolean;
  deletedFor?: string[];
}

export interface Chat {
  id: string;
  partId: string;
  partTitle: string;
  partImageUrl: string;
  partPrice: number;
  buyerId: string;
  buyerName: string;
  buyerPhoto?: string;
  sellerId: string;
  sellerName: string;
  sellerPhoto?: string;
  lastMessageText: string;
  lastMessageAt: number;
  lastSenderId?: string;
  lastMessage?: string;
  updatedAt?: number;
  clearedAt?: Record<string, number>;
  hiddenFor?: string[];
}

export interface SellerReview {
  id: string;
  sellerId: string;
  buyerId: string;
  buyerName: string;
  buyerPhoto?: string;
  buyerAvatar?: string;
  rating: number; // 1-5
  comment: string;
  partId?: string;
  partTitle?: string;
  createdAt: number;
}

export interface Notification {
  id: string; // `${chatId}_${recipientId}`
  chatId: string;
  recipientId: string;
  senderId: string;
  text: string;
  createdAt: number;
  read: boolean;
  partTitle: string;
  partPrice: number;
  partImageUrl: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
}

export interface Announcement {
  id: string;
  title: string;
  text: string;
  createdAt: number;
  authorEmail?: string;
  type?: "broadcast" | "update" | "alert";
  isRead?: boolean;
}

export interface AppVersionConfig {
  latestVersion: string;
  minimumSupportedVersion: string;
  forceUpdate: boolean;
  apkDownloadUrl: string;
  releaseNotes: string;
  releaseDate: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  followerName?: string;
  createdAt: number;
}



export interface TopCategory {
  id: string;
  name: string;
  icon: string;
  iconColor: string;
  isActive: boolean;
  order: number;
  createdAt?: any;
}
