import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  RefreshControl, 
  Image, 
  SafeAreaView, 
  StatusBar, 
  Modal, 
  Animated,
  Easing,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Share,
  Alert,
  FlatList,
  useWindowDimensions
} from "react-native";
import { 
  Text, 
  ActivityIndicator,
  Button,
  Icon
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseFirestore, getCurrentUser } from '../services/firebase';
import { useFavorites } from '../services/favorites';
import { 
  getCurrentLocation, 
  reverseGeocodeLatLng, 
  saveUserLocation,
  getUserSavedLocation
} from '../services/location';
import { INDIAN_STATES_AND_DISTRICTS } from '../data/indianLocations';
import { CarBrandBadge, AutoPartsRoundLogo } from '../components/BrandLogo';
import { INITIAL_SPARE_PARTS } from '../data/mockData';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSelectorModal } from '../components/LanguageSelectorModal';
import { UpdateDialogModal } from '../components/UpdateDialogModal';
import { InAppNotification, InAppNotificationData } from '../components/InAppNotification';
import { matchesCategoryFilter } from '../utils/categoryMatcher';
import { matchPartSearch } from '../utils/searchHelper';
import { Category3DIcon } from '../components/Category3DIcon';
import { BannerPartsCollage } from '../components/BannerPartsCollage';
import { subscribeToUnreadNotificationCount } from '../services/notifications';
import { 
  initializeTaxonomyDefaults, 
  INITIAL_DEFAULT_CATEGORIES, 
  INITIAL_DEFAULT_BRANDS 
} from '../services/taxonomyDefaults';

// City coordinates for real distance calculations
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'chennai': { lat: 13.0827, lng: 80.2707 },
  'coimbatore': { lat: 11.0168, lng: 76.9558 },
  'madurai': { lat: 9.9252, lng: 78.1198 },
  'trichy': { lat: 10.7905, lng: 78.7047 },
  'tiruchirappalli': { lat: 10.7905, lng: 78.7047 },
  'salem': { lat: 11.6643, lng: 78.1460 },
  'tiruppur': { lat: 11.1085, lng: 77.3411 },
  'erode': { lat: 11.3410, lng: 77.7172 },
  'vellore': { lat: 12.9165, lng: 79.1325 },
  'karur': { lat: 10.9601, lng: 78.0766 },
  'pallapatti': { lat: 10.8655, lng: 78.1065 },
  'bangalore': { lat: 12.9716, lng: 77.5946 },
  'bengaluru': { lat: 12.9716, lng: 77.5946 },
  'mumbai': { lat: 19.0760, lng: 72.8777 },
  'delhi': { lat: 28.6139, lng: 77.2090 },
  'hyderabad': { lat: 17.3850, lng: 78.4867 },
};

// High-performance Product Card matching user reference layout
const AnimatedPartCard = React.memo(({ 
  item, 
  index, 
  navigation, 
  isFavorited, 
  onToggleFavorite, 
  onOpenActionMenu, 
  cardWidth,
  selectedCity 
}: any) => {
  const [imgError, setImgError] = useState(false);

  // Prioritize the actual uploaded image URL from the part item
  const rawImageUri = item.imageUrl || (Array.isArray(item.images) && item.images[0]) || (Array.isArray(item.imageUrls) && item.imageUrls[0]);

  let resolvedImageSource: any = null;
  if (!imgError && rawImageUri && typeof rawImageUri === 'string' && rawImageUri.trim().length > 0) {
    resolvedImageSource = { uri: rawImageUri.trim() };
  } else if (item.id === 'demo-part-1') {
    resolvedImageSource = require('../assets/products/headlight.jpg');
  } else if (item.id === 'demo-part-2') {
    resolvedImageSource = require('../assets/products/turbocharger.jpg');
  } else {
    resolvedImageSource = { uri: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80' };
  }

  const isVerified = Boolean(item.isVerifiedSeller || item.verified || (item.sellerRating && item.sellerRating >= 4.5) || item.id === 'demo-part-2');
  const activeFavorited = Boolean(isFavorited);

  // Calculate authentic distance dynamically based on user's selected city
  const itemCity = (item.location || item.district || '').toLowerCase();
  const selectedCityLower = (selectedCity || 'Chennai').toLowerCase();

  let distanceDisplay = item.distance || (item.id === 'demo-part-2' ? '12 km away' : '3 km away');
  if (selectedCity && selectedCity !== 'All India') {
    if (itemCity.includes(selectedCityLower) || selectedCityLower.includes(itemCity)) {
      distanceDisplay = item.distance || '4 km away';
    } else {
      const cityCoords = CITY_COORDINATES[selectedCityLower];
      const itemLat = item.lat || item.latitude;
      const itemLng = item.lng || item.longitude;
      if (cityCoords && itemLat && itemLng) {
        const R = 6371; // km
        const dLat = ((itemLat - cityCoords.lat) * Math.PI) / 180;
        const dLon = ((itemLng - cityCoords.lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((cityCoords.lat * Math.PI) / 180) *
            Math.cos((itemLat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = Math.round(R * c);
        distanceDisplay = `${d} km away`;
      }
    }
  }

  return (
    <View
      style={{
        width: cardWidth,
        marginBottom: 14,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.88}
        delayPressIn={0}
        onPress={() => navigation.navigate('ProductDetail', { part: item })}
        style={styles.card}
      >
        {/* Top Image Container */}
        <View style={styles.imageContainer}>
          {resolvedImageSource ? (
            <Image 
              source={resolvedImageSource} 
              style={styles.cardImage} 
              resizeMode="cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <View style={[styles.cardImage, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
              <Icon source="car-cog" size={32} color="#94A3B8" />
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B', marginTop: 4 }}>OEM Spare Part</Text>
            </View>
          )}

          {/* Floating High-Contrast Wishlist Button */}
          <TouchableOpacity
            style={styles.favoriteCircleButton}
            activeOpacity={0.7}
            delayPressIn={0}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={(e) => {
              e.stopPropagation?.();
              onToggleFavorite?.(item.id);
            }}
          >
            <Icon 
              source={activeFavorited ? "heart" : "heart-outline"} 
              size={18} 
              color={activeFavorited ? "#EF4444" : "#475569"} 
            />
          </TouchableOpacity>
        </View>

        {/* Card Body */}
        <View style={styles.cardContent}>
          <View style={styles.titleRow}>
            <Text numberOfLines={2} style={styles.partTitle}>
              {item.title || `${item.carBrand || ''} ${item.carModel || ''} Part`}
            </Text>
          </View>

          <Text style={styles.price}>
            ₹{Number(item.price || item.partPrice || 0).toLocaleString('en-IN')}
          </Text>

          <View style={styles.locationRow}>
            <Icon source="map-marker" size={12} color="#64748B" />
            <Text numberOfLines={1} style={styles.locationText}>
              {item.location ? `${item.location} • ${distanceDisplay}` : `Chennai • ${distanceDisplay}`}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

export default function HomeScreen({ navigation, route, user }: any) {
  const activeUser = user || getCurrentUser();
  const { favorites, toggleFavorite } = useFavorites();
  const { width: screenWidth } = useWindowDimensions();
  const { t } = useLanguage();

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(route?.params?.selectedCategory || 'All');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [selectedCity, setSelectedCity] = useState('All India');
  const [isDetectingGPS, setIsDetectingGPS] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [parts, setParts] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [topCategories, setTopCategories] = useState<any[]>([]);
  const [carBrands, setCarBrands] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedActionPart, setSelectedActionPart] = useState<any | null>(null);
  const [inAppNotification, setInAppNotification] = useState<InAppNotificationData | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateConfig, setUpdateConfig] = useState<any>(null);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  // Responsive calculations
  // 4 Columns for compact category cards as requested
  const catCardWidth = Math.floor((screenWidth - 32 - 3 * 8) / 4);
  const brandCardWidth = Math.floor((screenWidth - 32 - 4 * 8) / 5);
  const productCardWidth = Math.floor((screenWidth - 32 - 12) / 2);

  // Sync selectedCategory when passed via navigation params
  useEffect(() => {
    if (route?.params?.selectedCategory) {
      setSelectedCategory(route.params.selectedCategory);
    }
  }, [route?.params?.selectedCategory]);

  // Instant cache load on boot so categories, brands, and banners never disappear when reopening the app
  useEffect(() => {
    initializeTaxonomyDefaults().catch((e) => console.warn('Init taxonomy defaults notice:', e));

    AsyncStorage.getItem('@autoparts_firestore_topCategories').then((val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          const list = Object.values(parsed);
          if (list.length > 0) {
            list.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
            setTopCategories(list);
          }
        } catch (_) {}
      }
    }).catch(() => {});

    AsyncStorage.getItem('@autoparts_firestore_carBrands').then((val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          const list = Object.values(parsed);
          if (list.length > 0) {
            list.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
            setCarBrands(list);
          }
        } catch (_) {}
      }
    }).catch(() => {});

    AsyncStorage.getItem('@autoparts_firestore_banners').then((val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          const list = Object.values(parsed);
          if (list.length > 0) {
            list.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
            setBanners(list);
          }
        } catch (_) {}
      }
    }).catch(() => {});
  }, []);

  // Load saved location
  useEffect(() => {
    const loadSavedLocation = async () => {
      try {
        const saved = await getUserSavedLocation();
        if (saved && saved.city) {
          setSelectedCity(saved.city);
        }
      } catch (err) {
        console.warn('Error reading saved user location:', err);
      }
    };
    loadSavedLocation();
  }, []);

  // Update selected city if returned from LocationSelectScreen via route params or on screen focus
  useEffect(() => {
    if (route?.params?.selectedCity) {
      setSelectedCity(route.params.selectedCity);
    }
  }, [route?.params?.selectedCity]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      getUserSavedLocation().then((saved) => {
        if (saved && saved.city) {
          setSelectedCity(saved.city);
        }
      });
    });
    return unsubscribe;
  }, [navigation]);

  const handleSelectCity = async (
    cityName: string,
    extra?: { state?: string; district?: string; area?: string; lat?: number; lng?: number; isGPS?: boolean }
  ) => {
    setSelectedCity(cityName);
    setShowLocationModal(false);
    setLocationSearchQuery('');
    await saveUserLocation({
      city: cityName,
      district: extra?.district,
      state: extra?.state,
      area: extra?.area,
      lat: extra?.lat,
      lng: extra?.lng,
      isGPS: !!extra?.isGPS,
    });
  };

  const handleGPSDetect = async () => {
    setIsDetectingGPS(true);
    try {
      const coords = await getCurrentLocation();
      if (coords) {
        const geo = await reverseGeocodeLatLng(coords.latitude, coords.longitude);
        const chosenCity = geo.district || geo.area || geo.state || 'Chennai';
        await handleSelectCity(chosenCity, {
          state: geo.state,
          district: geo.district,
          area: geo.area,
          lat: coords.latitude,
          lng: coords.longitude,
          isGPS: true,
        });
      }
    } catch (err) {
      console.warn('GPS detection error:', err);
    } finally {
      setIsDetectingGPS(false);
    }
  };

  // Real notification unread count listener
  useEffect(() => {
    const unsub = subscribeToUnreadNotificationCount((count) => {
      setUnreadCount(count);
    });
    return () => {
      try { unsub(); } catch (_) {}
    };
  }, []);

  // Refresh notification count when returning to HomeScreen
  useEffect(() => {
    const unsubFocus = navigation?.addListener ? navigation.addListener('focus', () => {
      const unsub = subscribeToUnreadNotificationCount((count) => {
        setUnreadCount(count);
      });
      try { unsub(); } catch (_) {}
    }) : undefined;

    return () => {
      if (typeof unsubFocus === 'function') unsubFocus();
    };
  }, [navigation]);

  // Entrance Animations
  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, []);

  // Default Promotional Banners Carousel Data (4 Slides matching 4 pagination dots)
  const DEFAULT_PROMO_BANNERS = [
    {
      id: 'mega-deals',
      badge: 'MEGA DEALS',
      badgeColor: '#0066FF',
      headline1: 'UP TO',
      discount: '50% OFF',
      headline2: 'ON GENUINE PARTS',
      features: ['100% Genuine Parts', 'Best Price Guaranteed', 'Fast & Safe Delivery'],
      cta: 'SHOP NOW',
      targetCategory: 'All',
    },
    {
      id: 'turbo-performance',
      badge: 'PERFORMANCE',
      badgeColor: '#EF4444',
      headline1: 'UP TO',
      discount: '40% OFF',
      headline2: 'TURBOCHARGERS',
      features: ['Precision Balanced', 'OEM Grade Build', '1 Year Warranty'],
      cta: 'SHOP NOW',
      targetCategory: 'Engine & Parts',
    },
    {
      id: 'brakes-suspension',
      badge: 'SAFETY & COMFORT',
      badgeColor: '#10B981',
      headline1: 'UP TO',
      discount: '45% OFF',
      headline2: 'DISCS & COILOVERS',
      features: ['Ceramic Friction Pads', 'Slotted Steel Discs', 'Anti-Fade Durability'],
      cta: 'SHOP NOW',
      targetCategory: 'Suspension',
    },
    {
      id: 'body-electricals',
      badge: 'POPULAR LIGHTING',
      badgeColor: '#F59E0B',
      headline1: 'UP TO',
      discount: '35% OFF',
      headline2: 'LED HEADLIGHTS',
      features: ['Plug & Play Harness', 'High Lumen Output', 'Weather Sealed'],
      cta: 'SHOP NOW',
      targetCategory: 'Electricals',
    },
  ];

  // Dynamic promo banners from Firestore (no mock banners)
  const promoBanners = banners;
  const bannerScrollRef = useRef<ScrollView>(null);

  // Auto rotate banner carousel
  useEffect(() => {
    const total = Math.min(promoBanners.length, 4);
    if (total <= 1) return;
    const timer = setInterval(() => {
      setActiveBannerIndex((prev) => {
        const next = (prev + 1) % total;
        bannerScrollRef.current?.scrollTo({
          x: next * (screenWidth - 32),
          animated: true,
        });
        return next;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [promoBanners.length, screenWidth]);

  // Modern curated automotive categories
  const DEFAULT_CATEGORY_GRID_ITEMS = [
    { 
      id: 'All', 
      name: 'All Parts', 
      icon: 'car-multiple', 
      bg: '#EFF6FF', 
      color: '#0066FF',
    },
    { 
      id: 'Engine & Parts', 
      name: 'Engine', 
      icon: 'engine', 
      bg: '#FEF2F2', 
      color: '#DC2626',
    },
    { 
      id: 'Body Parts', 
      name: 'Body & Frame', 
      icon: 'car-door', 
      bg: '#F0F9FF', 
      color: '#0284C7',
    },
    { 
      id: 'Electricals', 
      name: 'Electricals', 
      icon: 'flash', 
      bg: '#FEFCE8', 
      color: '#D97706',
    },
    { 
      id: 'Brakes', 
      name: 'Brakes & Discs', 
      icon: 'car-brake-alert', 
      bg: '#FFF1F2', 
      color: '#E11D48',
    },
    { 
      id: 'Suspension', 
      name: 'Suspension', 
      icon: 'tune-vertical', 
      bg: '#FAF5FF', 
      color: '#9333EA',
    },
    { 
      id: 'Exhaust', 
      name: 'Exhaust', 
      icon: 'weather-windy', 
      bg: '#ECFDF5', 
      color: '#059669',
    },
    { 
      id: 'Filters', 
      name: 'Filters & Fluids', 
      icon: 'air-filter', 
      bg: '#FFF7ED', 
      color: '#EA580C',
    },
    { 
      id: 'AC & Cooling', 
      name: 'AC & Cooling', 
      icon: 'fan', 
      bg: '#F0FDFA', 
      color: '#0D9488',
    },
    { 
      id: 'More', 
      name: 'All Categories', 
      icon: 'apps', 
      bg: '#F1F5F9', 
      color: '#475569',
    },
  ];

  // Helper to map category names or custom icons to icon & colors
  const getCategoryMeta = (cat: any) => {
    const name = (cat.name || cat.title || cat.id || '').toLowerCase();
    if (name.includes('engine') || name.includes('motor')) return { icon: 'engine', bg: '#FEF2F2', color: '#DC2626' };
    if (name.includes('body') || name.includes('door') || name.includes('bumper')) return { icon: 'car-door', bg: '#F0F9FF', color: '#0284C7' };
    if (name.includes('elect') || name.includes('light') || name.includes('battery')) return { icon: 'flash', bg: '#FEFCE8', color: '#D97706' };
    if (name.includes('suspens') || name.includes('shock') || name.includes('strut')) return { icon: 'tune-vertical', bg: '#FAF5FF', color: '#9333EA' };
    if (name.includes('exhaust') || name.includes('silencer') || name.includes('pipe') || name.includes('muffler')) return { icon: 'weather-windy', bg: '#ECFDF5', color: '#059669' };
    if (name.includes('brake') || name.includes('rotor') || name.includes('disc') || name.includes('pad')) return { icon: 'car-brake-alert', bg: '#FFF1F2', color: '#E11D48' };
    if (name.includes('filter') || name.includes('oil') || name.includes('air')) return { icon: 'air-filter', bg: '#FFF7ED', color: '#EA580C' };
    if (name.includes('ac') || name.includes('cool') || name.includes('radiator')) return { icon: 'fan', bg: '#F0FDFA', color: '#0D9488' };
    if (name.includes('maruti') || name.includes('hyundai') || name.includes('tata') || name.includes('mahindra') || name.includes('toyota') || name.includes('honda') || name.includes('audi') || name.includes('bmw') || name.includes('ford') || name.includes('kia') || name.includes('volkswagen') || name.includes('skoda') || name.includes('renault') || name.includes('nissan') || name.includes('mg')) return { icon: 'car-side', bg: '#EFF6FF', color: '#0066FF' };
    if (name.includes('all')) return { icon: 'car-multiple', bg: '#EFF6FF', color: '#0066FF' };
    return { icon: 'apps', bg: '#F1F5F9', color: '#475569' };
  };

  // Dynamic category grid items derived strictly from Firestore topCategories so deletions immediately take effect
  const categoryGridItems = React.useMemo(() => {
    // 1. Always start with 'All Parts'
    const items: any[] = [
      {
        id: 'All',
        name: 'All Parts',
        icon: 'car-multiple',
        bg: '#EFF6FF',
        color: '#0066FF',
      },
    ];

    // 2. Use Firestore topCategories if loaded (so deleted categories stay deleted!)
    if (topCategories && topCategories.length > 0) {
      const activeCats = topCategories
        .filter((c) => c.active !== false && c.isActive !== false)
        .map((c) => {
          const meta = getCategoryMeta(c);
          const rawName = c.name || c.title || c.id || '';
          const displayName = rawName.length > 0 ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : rawName;
          return {
            id: c.id || rawName,
            name: displayName,
            icon: c.icon || meta.icon,
            bg: c.bg || meta.bg,
            color: c.color || meta.color,
            imageUrl: c.imageUrl || null,
            order: typeof c.order === 'number' ? c.order : 0,
          };
        });
      activeCats.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      items.push(...activeCats);
    } else {
      // Smooth initial fallback before first load
      INITIAL_DEFAULT_CATEGORIES.forEach((cat) => {
        items.push({
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          bg: cat.bg,
          color: cat.color,
          imageUrl: cat.imageUrl || null,
          order: cat.order,
        });
      });
    }

    // 3. Always append 'More' (All Categories) at the end
    items.push({
      id: 'More',
      name: 'All Categories',
      icon: 'apps',
      bg: '#F1F5F9',
      color: '#475569',
      imageUrl: undefined,
    });

    return items;
  }, [topCategories]);

  // Brand items for horizontal brand selector derived strictly from Firestore carBrands so deletions immediately take effect
  const brandList = React.useMemo(() => {
    if (carBrands && carBrands.length > 0) {
      const activeBrands = carBrands.filter((b) => b.active !== false && b.isActive !== false);
      const list = activeBrands.map((b) => ({
        id: b.id || b.name,
        name: b.name,
        imageUrl: b.imageUrl || b.logoUrl || null,
        order: typeof b.order === 'number' ? b.order : 0,
      }));
      list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      return list;
    }
    // Smooth initial fallback before first load
    return INITIAL_DEFAULT_BRANDS.map((b) => ({
      id: b.id,
      name: b.name,
      imageUrl: b.imageUrl || null,
      order: b.order,
    }));
  }, [carBrands]);

  const popularCities = [
    'All India', 'Chennai', 'Coimbatore', 'Karur', 'Pallapatti', 
    'Madurai', 'Trichy', 'Salem', 'Tiruppur', 'Erode',
    'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad'
  ];

  const allIndianDistricts = React.useMemo(() => {
    const list: string[] = [];
    INDIAN_STATES_AND_DISTRICTS.forEach((s) => {
      s.districts.forEach((d) => {
        if (!list.includes(d)) list.push(d);
      });
    });
    return list.sort((a, b) => a.localeCompare(b));
  }, []);

  const filteredLocationsList = React.useMemo(() => {
    const q = locationSearchQuery.toLowerCase().trim();
    if (!q) {
      return popularCities;
    }
    const matched = allIndianDistricts.filter((d) => d.toLowerCase().includes(q));
    const matchedStates = INDIAN_STATES_AND_DISTRICTS
      .filter((s) => s.state.toLowerCase().includes(q))
      .map((s) => s.state);
    const combined = Array.from(new Set([...matched, ...matchedStates]));
    if ('all india'.includes(q)) {
      combined.unshift('All India');
    }
    return combined.slice(0, 35);
  }, [locationSearchQuery, allIndianDistricts]);

  useEffect(() => {
    setLoading(true);
    let unsubscribeParts = () => {};
    let unsubscribeBanners = () => {};
    let unsubscribeCategories = () => {};
    let unsubscribeBrands = () => {};

    try {
      const db = getFirebaseFirestore();
      if (!db || typeof db.collection !== 'function') {
        setParts(INITIAL_SPARE_PARTS);
        setLoading(false);
        return;
      }
      
      // 1. Listen for Spare Parts
      const qParts = db.collection('spareParts').orderBy('createdAt', 'desc');
      unsubscribeParts = qParts.onSnapshot((snapshot: any) => {
        const list: any[] = [];
        snapshot.forEach((doc: any) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setParts(list.length > 0 ? list : INITIAL_SPARE_PARTS);
        setLoading(false);
        setRefreshing(false);
      }, (err: any) => {
        console.warn('Notice from parts listener:', err);
        setParts((current) => current.length > 0 ? current : INITIAL_SPARE_PARTS);
        setLoading(false);
        setRefreshing(false);
      });

      // 2. Listen for Admin Banners
      try {
        const qBanners = db.collection('banners');
        unsubscribeBanners = qBanners.onSnapshot((snapshot: any) => {
          const bannerList: any[] = [];
          snapshot.forEach((doc: any) => {
            bannerList.push({ id: doc.id, ...doc.data() });
          });
          // Sort by displayOrder or createdAt
          bannerList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setBanners(bannerList);
        }, (bErr: any) => {
          console.warn('Notice from banners listener:', bErr);
        });
      } catch (bCatch) {
        console.warn('Could not listen to banners collection:', bCatch);
      }

      // 3. Listen for Admin Categories (topCategories collection)
      try {
        const qCategories = db.collection('topCategories');
        unsubscribeCategories = qCategories.onSnapshot((snapshot: any) => {
          const catList: any[] = [];
          snapshot.forEach((doc: any) => {
            catList.push({ id: doc.id, ...doc.data() });
          });
          catList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setTopCategories(catList);
        }, (cErr: any) => {
          console.warn('Notice from categories listener:', cErr);
        });
      } catch (cCatch) {
        console.warn('Could not listen to topCategories collection:', cCatch);
      }

      // 4. Listen for Admin Car Brands (carBrands collection)
      try {
        const qBrands = db.collection('carBrands');
        unsubscribeBrands = qBrands.onSnapshot((snapshot: any) => {
          const bList: any[] = [];
          snapshot.forEach((doc: any) => {
            bList.push({ id: doc.id, ...doc.data() });
          });
          bList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setCarBrands(bList);
        }, (bErr: any) => {
          console.warn('Notice from carBrands listener:', bErr);
        });
      } catch (bCatch) {
        console.warn('Could not listen to carBrands collection:', bCatch);
      }

    } catch (queryErr) {
      console.warn('Failed to query Firestore:', queryErr);
      setParts((current) => current.length > 0 ? current : INITIAL_SPARE_PARTS);
      setLoading(false);
      setRefreshing(false);
    }

    return () => {
      try { unsubscribeParts(); } catch (_) {}
      try { unsubscribeBanners(); } catch (_) {}
      try { unsubscribeCategories(); } catch (_) {}
      try { unsubscribeBrands(); } catch (_) {}
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const db = getFirebaseFirestore();
      if (db && typeof db.collection === 'function') {
        const snap = await db.collection('spareParts').orderBy('createdAt', 'desc').get();
        const list: any[] = [];
        snap.forEach((doc: any) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        if (list.length > 0) {
          setParts(list);
        }
      }
    } catch (refreshErr) {
      console.warn('Refresh error:', refreshErr);
    } finally {
      setRefreshing(false);
    }
  };

  const strictFilteredParts = useMemo(() => {
    const scoredList: { part: any; score: number }[] = [];

    for (const part of parts) {
      // Exclude deleted listings
      if (part.isDeleted === true || part.status === 'deleted') {
        continue;
      }

      let searchScore = 0;
      if (searchQuery.trim()) {
        const searchResult = matchPartSearch(part, searchQuery);
        if (!searchResult.matches) {
          continue;
        }
        searchScore = searchResult.score;
      }

      const matchesCategory = matchesCategoryFilter(part, selectedCategory);
      if (!matchesCategory) {
        continue;
      }
      
      const matchesBrand = selectedBrand === 'All' || 
        (part.carBrand && part.carBrand.toLowerCase().includes(selectedBrand.toLowerCase())) ||
        (part.brand && part.brand.toLowerCase().includes(selectedBrand.toLowerCase()));
      if (!matchesBrand) {
        continue;
      }

      const isAllIndia = !selectedCity || selectedCity.toLowerCase() === 'all india' || selectedCity.toLowerCase() === 'all';
      const matchesCity = isAllIndia || 
        (part.location && part.location.toLowerCase().includes(selectedCity.toLowerCase())) ||
        (part.city && part.city.toLowerCase().includes(selectedCity.toLowerCase())) ||
        (part.district && part.district.toLowerCase().includes(selectedCity.toLowerCase())) ||
        (part.state && part.state.toLowerCase().includes(selectedCity.toLowerCase())) ||
        (part.area && part.area.toLowerCase().includes(selectedCity.toLowerCase()));
      if (!matchesCity) {
        continue;
      }

      const partPrice = Number(part.price || part.partPrice) || 0;
      const isAboveMin = minPrice ? partPrice >= Number(minPrice) : true;
      const isBelowMax = maxPrice ? partPrice <= Number(maxPrice) : true;
      if (!isAboveMin || !isBelowMax) {
        continue;
      }

      scoredList.push({ part, score: searchScore });
    }

    if (searchQuery.trim()) {
      // Prioritize high relevance search matches (e.g. matched in title > brand > description)
      return scoredList
        .sort((a, b) => b.score - a.score)
        .map((item) => item.part);
    }

    return scoredList.map((item) => item.part);
  }, [parts, searchQuery, selectedCategory, selectedBrand, selectedCity, minPrice, maxPrice]);

  const filteredParts = strictFilteredParts;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0066FF" />
      
      {/* Top Header - Royal Blue Bar matching user mockup */}
      <View style={styles.topHeaderWrapper}>
        <Animated.View style={[styles.headerRow, { opacity: headerFade }]}>
          {/* Location Selector Pill */}
          <View style={styles.headerLeftBrandGroup}>
            <TouchableOpacity 
              style={styles.locationPill} 
              activeOpacity={0.85}
              onPress={() => navigation.navigate('LocationSelectScreen', { currentCity: selectedCity })}
            >
              <Icon source="map-marker" size={14} color="#FFFFFF" />
              <Text style={styles.locationPillText} numberOfLines={1}>
                {selectedCity || 'All India'}
              </Text>
              <Icon source="chevron-down" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Right Controls: Language & Notification */}
          <View style={styles.headerRightGroup}>
            <TouchableOpacity 
              style={styles.langPill} 
              activeOpacity={0.8}
              onPress={() => setShowLanguageModal(true)}
            >
              <Text style={styles.langPillText}>A/அ</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.bellBtn} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Icon source="bell-outline" color="#FFFFFF" size={24} />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Search Bar & Integrated Filter Adjustments Sliders Icon */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBarBox}>
            <Icon source="magnify" size={22} color="#64748B" />
            <TextInput
              placeholder="Search spare parts, OEM numbers, car models..."
              placeholderTextColor="#94A3B8"
              onChangeText={setSearchQuery}
              onSubmitEditing={() => {
                if (searchQuery.trim()) {
                  navigation.navigate('Search', { initialQuery: searchQuery });
                }
              }}
              value={searchQuery}
              style={styles.searchInput}
              returnKeyType="search"
            />
            <TouchableOpacity 
              style={styles.filterInlineBtn} 
              activeOpacity={0.7}
              onPress={() => setShowFilterModal(true)}
            >
              <Icon source="tune-variant" color="#0F172A" size={20} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0066FF']} />
        }
      >
        {/* Responsive Promotional Banner Carousel only if admin added real banners */}
        {promoBanners.length > 0 && (
          <View style={styles.bannerOuterContainer}>
            <ScrollView
              ref={bannerScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const slideWidth = screenWidth - 32;
                const idx = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
                if (idx >= 0 && idx < promoBanners.length && idx !== activeBannerIndex) {
                  setActiveBannerIndex(idx);
                }
              }}
              contentContainerStyle={{ alignItems: 'center' }}
            >
              {promoBanners.slice(0, 4).map((curBanner, bIdx) => {
                const targetCat = curBanner.targetLink || curBanner.targetCategory || curBanner.category || '';
                const handleBannerPress = () => {
                  if (targetCat && targetCat !== 'All') {
                    setSelectedCategory(targetCat);
                  } else {
                    navigation.navigate('Search');
                  }
                };

                const badgeText = curBanner.badge || 'MEGA DEALS';
                const headline1 = curBanner.headline1 || 'UP TO';
                const discountText = curBanner.discount || '50% OFF';
                const headline2 = curBanner.headline2 || 'ON GENUINE PARTS';
                const features = Array.isArray(curBanner.features) && curBanner.features.length > 0
                  ? curBanner.features
                  : ['100% Genuine Parts', 'Best Price Guaranteed', 'Fast & Safe Delivery'];
                const ctaText = curBanner.cta || 'SHOP NOW';

                if (curBanner.imageUrl) {
                  return (
                    <TouchableOpacity
                      key={curBanner.id || `banner-${bIdx}`}
                      activeOpacity={0.92}
                      onPress={handleBannerPress}
                      style={[styles.fullImageBannerCard, { width: screenWidth - 32 }]}
                    >
                      <Image
                        source={{ uri: curBanner.imageUrl }}
                        style={styles.fullBannerImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  );
                }

                return (
                  <TouchableOpacity
                    key={curBanner.id || `banner-${bIdx}`}
                    activeOpacity={0.92}
                    onPress={handleBannerPress}
                    style={[
                      styles.megaDealBanner,
                      { width: screenWidth - 32 },
                      curBanner.backgroundColor ? { backgroundColor: curBanner.backgroundColor } : null
                    ]}
                  >
                    <View style={styles.bannerLeftContent}>
                      <View style={styles.bannerBadgePill}>
                        <Text style={styles.bannerBadgePillText}>{badgeText}</Text>
                      </View>

                      <Text style={styles.bannerSubHeadSmall}>{headline1}</Text>
                      <Text style={styles.megaDealDiscount}>{discountText}</Text>
                      <Text style={styles.megaDealHeadline}>{headline2}</Text>

                      <View style={styles.bannerFeatureList}>
                        {features.slice(0, 3).map((feat: string, fIdx: number) => (
                          <View key={`feat-${fIdx}`} style={styles.bannerFeatureItem}>
                            <Icon source="check-circle" size={12} color="#60A5FA" />
                            <Text style={styles.bannerFeatureText} numberOfLines={1}>
                              {feat}
                            </Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.shopNowBtn}>
                        <Text style={styles.shopNowBtnText}>{ctaText}</Text>
                        <Icon source="chevron-right" size={13} color="#051433" />
                      </View>
                    </View>

                    {/* Right 3D Spare Parts Collage Graphic */}
                    <View style={styles.bannerRightArt}>
                      <BannerPartsCollage />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 4 Carousel Pagination Dots matching reference */}
            <View style={styles.dotsRow}>
              {promoBanners.slice(0, 4).map((_, dotIdx) => {
                const isActive = (activeBannerIndex % 4) === dotIdx;
                return (
                  <TouchableOpacity
                    key={`banner-dot-${dotIdx}`}
                    onPress={() => {
                      setActiveBannerIndex(dotIdx);
                      bannerScrollRef.current?.scrollTo({
                        x: dotIdx * (screenWidth - 32),
                        animated: true,
                      });
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  >
                    <View 
                      style={[
                        styles.dot, 
                        isActive && styles.activeDot
                      ]} 
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Modern Categories Explorer */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Shop by Category</Text>
              <Text style={styles.sectionSubtitle}>Find verified OEM & aftermarket spare parts</Text>
            </View>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.modernCategoriesScroll}
          >
            {categoryGridItems.map((cat) => {
              const isSelected = selectedCategory.toLowerCase() === cat.id.toLowerCase() || (cat.id === 'All' && selectedCategory === 'All');
              const isMore = cat.id === 'More';
              const hasImage = Boolean(cat.imageUrl && typeof cat.imageUrl === 'string' && cat.imageUrl.trim().length > 0);

              if (hasImage) {
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.modernCatCoverCard,
                      isSelected && styles.modernCatCoverCardSelected
                    ]}
                    activeOpacity={0.85}
                    onPress={() => {
                      setSelectedCategory(isSelected && cat.id !== 'All' ? 'All' : cat.id);
                    }}
                  >
                    <View style={styles.modernCatCoverImgBox}>
                      <Image
                        source={{ uri: cat.imageUrl }}
                        style={styles.modernCatCoverImg}
                        resizeMode="cover"
                      />
                      {isSelected && (
                        <View style={styles.modernCatSelectedBadge}>
                          <Icon source="check" size={11} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <View style={[styles.modernCatCoverLabelWrap, isSelected && styles.modernCatCoverLabelWrapSelected]}>
                      <Text
                        style={[styles.modernCatCoverText, isSelected && styles.modernCatCoverTextSelected]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.modernCatCard,
                    isSelected && styles.modernCatCardSelected
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (isMore) {
                      navigation.navigate('AllCategories', { categories: categoryGridItems.filter(c => c.id !== 'More') });
                    } else {
                      setSelectedCategory(isSelected && cat.id !== 'All' ? 'All' : cat.id);
                    }
                  }}
                >
                  <View style={[styles.modernCatIconBox, { backgroundColor: cat.bg || '#EFF6FF' }, isSelected && styles.modernCatIconBoxSelected]}>
                    <Icon source={cat.icon || 'car-cog'} size={24} color={isSelected ? '#FFFFFF' : (cat.color || '#0066FF')} />
                  </View>
                  <Text style={[styles.modernCatName, isSelected && styles.modernCatNameSelected]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                  {isSelected && <View style={styles.modernCatActiveDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Official Car Brands OEM Hub */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Top Vehicle Brands</Text>
              <Text style={styles.sectionSubtitle}>Genuine OEM spare parts tailored for your make</Text>
            </View>
            {selectedBrand !== 'All' && (
              <TouchableOpacity 
                onPress={() => setSelectedBrand('All')}
                style={styles.clearBrandBtn}
              >
                <Text style={styles.clearBrandText}>Show All Makes</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.modernBrandsScroll}
          >
            {brandList.map((b) => {
              const isBrandSelected = selectedBrand.toLowerCase() === b.name.toLowerCase();
              return (
                <TouchableOpacity
                  key={b.id}
                  style={[
                    styles.modernBrandCard,
                    isBrandSelected && styles.modernBrandCardSelected
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedBrand(isBrandSelected ? 'All' : b.name);
                  }}
                >
                  <View style={styles.modernBrandLogoWrapper}>
                    <CarBrandBadge brand={b.name} imageUrl={b.imageUrl} size={42} />
                  </View>
                  <Text 
                    style={[styles.modernBrandLabel, isBrandSelected && styles.modernBrandLabelSelected]} 
                    numberOfLines={1}
                  >
                    {b.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Active Filter Indicators */}
        {(selectedCategory !== 'All' || selectedBrand !== 'All') && (
          <View style={styles.activeFiltersBar}>
            <View style={styles.activeFilterRow}>
              {selectedCategory !== 'All' && (
                <View style={styles.filterPill}>
                  <Text style={styles.filterPillText}>{selectedCategory}</Text>
                  <TouchableOpacity onPress={() => setSelectedCategory('All')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Icon source="close" size={14} color="#0066FF" />
                  </TouchableOpacity>
                </View>
              )}
              {selectedBrand !== 'All' && (
                <View style={styles.filterPill}>
                  <Text style={styles.filterPillText}>{selectedBrand}</Text>
                  <TouchableOpacity onPress={() => setSelectedBrand('All')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Icon source="close" size={14} color="#0066FF" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <TouchableOpacity 
              onPress={() => { setSelectedCategory('All'); setSelectedBrand('All'); }}
              style={styles.clearAllBtn}
            >
              <Text style={styles.clearAllBtnText}>Clear all</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Fresh Recommendations Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Fresh Recommendations</Text>
          <TouchableOpacity 
            style={styles.viewAllRow}
            onPress={() => navigation.navigate('Search', { initialCategory: selectedCategory !== 'All' ? selectedCategory : undefined })}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>View All</Text>
            <Icon source="chevron-right" size={18} color="#0066FF" />
          </TouchableOpacity>
        </View>

        {/* Fresh Recommendations 2-Column Grid matching reference */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#0066FF" />
          </View>
        ) : filteredParts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon source="car-search" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No spare parts found</Text>
            <Text style={styles.emptySubtitle}>
              Try resetting your search query or choosing another category/brand.
            </Text>
            <Button 
              mode="contained" 
              buttonColor="#0066FF"
              onPress={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setSelectedBrand('All');
                setSelectedCity('All India');
                setMinPrice('');
                setMaxPrice('');
                saveUserLocation({ city: 'All India' });
              }}
              style={{ marginTop: 14 }}
            >
              Show All Parts
            </Button>
          </View>
        ) : (
          <View style={styles.partsGrid}>
            {filteredParts.map((item, index) => (
              <AnimatedPartCard 
                key={item.id} 
                item={item} 
                index={index} 
                navigation={navigation} 
                isFavorited={favorites?.includes(item.id)}
                onToggleFavorite={toggleFavorite}
                onOpenActionMenu={setSelectedActionPart}
                selectedCity={selectedCity}
                cardWidth={productCardWidth}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} animationType="slide" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={{ flex: 1 }} 
            activeOpacity={1} 
            onPress={() => setShowFilterModal(false)} 
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Icon source="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.filterSectionTitle, { marginTop: 14 }]}>Price Range (₹)</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <TextInput
                placeholder="Min Price"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={minPrice}
                onChangeText={setMinPrice}
                style={[styles.locationSearchBox, { flex: 1, height: 44 }]}
              />
              <TextInput
                placeholder="Max Price"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={maxPrice}
                onChangeText={setMaxPrice}
                style={[styles.locationSearchBox, { flex: 1, height: 44 }]}
              />
            </View>

            <Button 
              mode="contained" 
              buttonColor="#1565FF"
              onPress={() => setShowFilterModal(false)}
              style={{ marginTop: 8 }}
            >
              Apply Filters
            </Button>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <LanguageSelectorModal
        visible={showLanguageModal}
        onDismiss={() => setShowLanguageModal(false)}
      />

      {showUpdateDialog && !!updateConfig && (
        <UpdateDialogModal
          visible={showUpdateDialog}
          versionConfig={updateConfig}
          config={updateConfig}
          onDismiss={() => setShowUpdateDialog(false)}
        />
      )}

      {inAppNotification && (
        <InAppNotification
          notification={inAppNotification}
          onClose={() => setInAppNotification(null)}
          onPress={(item) => {
            if (item?.chatId) {
              navigation.navigate('ChatRoom', { chatId: item.chatId });
            }
            setInAppNotification(null);
          }}
        />
      )}

      {/* Quick Action Bottom Modal for Product */}
      <Modal 
        visible={!!selectedActionPart} 
        animationType="fade" 
        transparent 
        onRequestClose={() => setSelectedActionPart(null)}
      >
        <TouchableOpacity 
          style={styles.actionModalOverlay} 
          activeOpacity={1} 
          onPress={() => setSelectedActionPart(null)}
        >
          <View style={styles.actionModalSheet}>
            {/* Mini preview */}
            <View style={styles.actionPartPreviewRow}>
              <Image 
                source={
                  (selectedActionPart?.imageUrl || selectedActionPart?.images?.[0] || selectedActionPart?.imageUrls?.[0])
                    ? { uri: selectedActionPart.imageUrl || selectedActionPart.images?.[0] || selectedActionPart.imageUrls?.[0] }
                    : selectedActionPart?.id === 'demo-part-1' 
                    ? require('../assets/products/headlight.jpg')
                    : selectedActionPart?.id === 'demo-part-2'
                    ? require('../assets/products/turbocharger.jpg')
                    : { uri: 'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=400&q=80' }
                }
                style={styles.actionPartThumb}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.actionPartTitle} numberOfLines={1}>{selectedActionPart?.title}</Text>
                <Text style={styles.actionPartPrice}>₹{Number(selectedActionPart?.price || 0).toLocaleString('en-IN')}</Text>
                <Text style={styles.actionPartLocation} numberOfLines={1}>
                  {selectedActionPart?.contactName || selectedActionPart?.location || 'Tamil Nadu'} • {selectedActionPart?.distance || 'Verified'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedActionPart(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon source="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.actionDivider} />

            {/* Action Buttons */}
            <TouchableOpacity 
              style={styles.actionRowBtn} 
              activeOpacity={0.7}
              onPress={() => {
                const phone = selectedActionPart?.contactPhone || '+919444183290';
                Linking.openURL(`tel:${phone}`);
                setSelectedActionPart(null);
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Icon source="phone" size={20} color="#0066FF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionRowLabel}>Call Verified Seller</Text>
                <Text style={styles.actionRowSubLabel}>{selectedActionPart?.contactPhone || '+91 94441 83290'}</Text>
              </View>
              <Icon source="chevron-right" size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionRowBtn} 
              activeOpacity={0.7}
              onPress={() => {
                const rawPhone = (selectedActionPart?.whatsappPhone || selectedActionPart?.contactPhone || '919444183290').replace(/[^0-9]/g, '');
                const msg = encodeURIComponent(`Hello, I found your "${selectedActionPart?.title}" listed on Auto Parts Hub for ₹${selectedActionPart?.price}. Is it still available?`);
                Linking.openURL(`https://wa.me/${rawPhone}?text=${msg}`);
                setSelectedActionPart(null);
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#F0FDF4' }]}>
                <Icon source="whatsapp" size={20} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionRowLabel}>Chat on WhatsApp</Text>
                <Text style={styles.actionRowSubLabel}>Instant reply & photos</Text>
              </View>
              <Icon source="chevron-right" size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionRowBtn} 
              activeOpacity={0.7}
              onPress={() => {
                const lat = selectedActionPart?.lat || selectedActionPart?.latitude;
                const lng = selectedActionPart?.lng || selectedActionPart?.longitude;
                if (lat && lng) {
                  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
                } else {
                  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((selectedActionPart?.area || '') + ' ' + (selectedActionPart?.location || '') + ' Tamil Nadu')}`);
                }
                setSelectedActionPart(null);
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Icon source="map-marker-radius" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionRowLabel}>Shop Directions & Map</Text>
                <Text style={styles.actionRowSubLabel}>{selectedActionPart?.area || selectedActionPart?.location || 'View on Google Maps'}</Text>
              </View>
              <Icon source="chevron-right" size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionRowBtn} 
              activeOpacity={0.7}
              onPress={async () => {
                try {
                  await Share.share({
                    title: selectedActionPart?.title,
                    message: `Check out ${selectedActionPart?.title} for ₹${Number(selectedActionPart?.price || 0).toLocaleString('en-IN')} available at ${selectedActionPart?.contactName || selectedActionPart?.location || 'Auto Parts Hub'}! Contact: ${selectedActionPart?.contactPhone}`,
                  });
                } catch (_) {}
                setSelectedActionPart(null);
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#F1F5F9' }]}>
                <Icon source="share-variant" size={20} color="#475569" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionRowLabel}>Share Spare Part</Text>
                <Text style={styles.actionRowSubLabel}>Send details to customer or workshop</Text>
              </View>
              <Icon source="chevron-right" size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionRowBtn} 
              activeOpacity={0.7}
              onPress={() => {
                toggleFavorite(selectedActionPart?.id);
                setSelectedActionPart(null);
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: favorites?.includes(selectedActionPart?.id) ? '#FEE2E2' : '#F1F5F9' }]}>
                <Icon 
                  source={favorites?.includes(selectedActionPart?.id) ? "heart" : "heart-outline"} 
                  size={20} 
                  color={favorites?.includes(selectedActionPart?.id) ? "#EF4444" : "#475569"} 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionRowLabel}>
                  {favorites?.includes(selectedActionPart?.id) ? 'Remove from Wishlist' : 'Save to Wishlist'}
                </Text>
                <Text style={styles.actionRowSubLabel}>Access anytime in saved items</Text>
              </View>
              <Icon source="chevron-right" size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionRowBtn} 
              activeOpacity={0.7}
              onPress={() => {
                const p = selectedActionPart;
                setSelectedActionPart(null);
                navigation.navigate('ProductDetail', { part: p });
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Icon source="information-outline" size={20} color="#0066FF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionRowLabel}>View Full OEM Specifications</Text>
                <Text style={styles.actionRowSubLabel}>Condition, warranty & compatibility</Text>
              </View>
              <Icon source="chevron-right" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeaderWrapper: {
    backgroundColor: '#0066FF',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 6,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeftBrandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 6,
  },
  headerLogoCircleContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
    maxWidth: '72%',
  },
  locationPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FDE047',
  },
  adminHeaderBtnText: {
    color: '#FDE047',
    fontSize: 11,
    fontWeight: '800',
  },
  langPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  langPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  bellBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0066FF',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  searchContainer: {
    width: '100%',
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  filterInlineBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  bannerOuterContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  fullImageBannerCard: {
    width: '100%',
    aspectRatio: 2.5,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#051433',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  fullBannerImage: {
    width: '100%',
    height: '100%',
  },
  megaDealBanner: {
    backgroundColor: '#051433',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
    height: 168,
  },
  bannerLeftContent: {
    flex: 1.25,
    paddingRight: 6,
    justifyContent: 'center',
  },
  bannerBadgePill: {
    backgroundColor: '#0066FF',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  bannerBadgePillText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bannerSubHeadSmall: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 0,
  },
  megaDealDiscount: {
    color: '#FBBF24',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 30,
  },
  megaDealHeadline: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.2,
    marginTop: 1,
    marginBottom: 2,
  },
  bannerFeatureList: {
    marginVertical: 5,
    gap: 3,
  },
  bannerFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bannerFeatureText: {
    color: '#E2E8F0',
    fontSize: 9,
    fontWeight: '700',
  },
  bannerSubFeatures: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: '600',
    marginBottom: 10,
  },
  shopNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 3,
    marginTop: 2,
  },
  shopNowBtnText: {
    color: '#051433',
    fontSize: 10.5,
    fontWeight: '900',
  },
  bannerRightArt: {
    flex: 1,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bannerGlowCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1E40AF',
    opacity: 0.6,
  },
  bannerArtImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#CBD5E1',
  },
  activeDot: {
    width: 20,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#0066FF',
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  modernCategoriesScroll: {
    paddingHorizontal: 16,
    gap: 10,
    paddingVertical: 4,
  },
  modernCatCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 84,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  modernCatCardSelected: {
    borderColor: '#0066FF',
    borderWidth: 1.5,
    backgroundColor: '#EFF6FF',
    shadowColor: '#0066FF',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  modernCatIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },
  modernCatImage: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  modernCatIconBoxSelected: {
    backgroundColor: '#0066FF',
  },
  modernCatName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  modernCatNameSelected: {
    color: '#0066FF',
    fontWeight: '800',
  },
  modernCatActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0066FF',
    marginTop: 4,
  },
  modernCatCoverCard: {
    width: 96,
    height: 114,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modernCatCoverCardSelected: {
    borderColor: '#0066FF',
    borderWidth: 2,
    shadowColor: '#0066FF',
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 4,
  },
  modernCatCoverImgBox: {
    width: '100%',
    height: 78,
    backgroundColor: '#F8FAFC',
    position: 'relative',
    overflow: 'hidden',
  },
  modernCatCoverImg: {
    width: '100%',
    height: '100%',
  },
  modernCatSelectedBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#0066FF',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernCatCoverLabelWrap: {
    height: 34,
    width: '100%',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  modernCatCoverLabelWrapSelected: {
    backgroundColor: '#EFF6FF',
  },
  modernCatCoverText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  modernCatCoverTextSelected: {
    color: '#0066FF',
    fontWeight: '800',
  },
  modernBrandsScroll: {
    paddingHorizontal: 16,
    gap: 10,
    paddingVertical: 4,
  },
  modernBrandCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    width: 86,
    height: 84,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  modernBrandCardSelected: {
    borderColor: '#0066FF',
    borderWidth: 1.5,
    backgroundColor: '#EFF6FF',
    shadowColor: '#0066FF',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  modernBrandLogoWrapper: {
    width: 52,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernBrandLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    marginTop: 4,
  },
  modernBrandLabelSelected: {
    color: '#0066FF',
    fontWeight: '800',
  },
  clearBrandBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  clearBrandText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0066FF',
  },
  activeFiltersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  activeFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0066FF',
  },
  clearAllBtn: {
    padding: 4,
  },
  clearAllBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0066FF',
  },
  partsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    height: 140,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#0066FF',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  conditionBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  conditionBadgeUsed: {
    backgroundColor: '#DCFCE7',
  },
  conditionBadgeNew: {
    backgroundColor: '#DBEAFE',
  },
  conditionBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  conditionTextUsed: {
    color: '#15803D',
  },
  conditionTextNew: {
    color: '#0066FF',
  },
  favoriteCircleButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 10,
  },
  cardContent: {
    padding: 10,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    minHeight: 34,
  },
  partTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 17,
  },
  price: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0066FF',
    marginTop: 4,
    letterSpacing: -0.3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 3,
  },
  locationText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  loaderContainer: {
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#334155',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  gpsLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    gap: 8,
  },
  gpsLocationText: {
    color: '#1565FF',
    fontWeight: '700',
    fontSize: 13,
  },
  locationSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 42,
    marginVertical: 6,
    gap: 8,
  },
  locationSearchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    paddingVertical: 0,
  },
  locationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  locationItemHighlight: {
    backgroundColor: '#EFF6FF',
  },
  locationItemText: {
    color: '#0F172A',
    fontSize: 14,
  },
  locationItemTextActive: {
    color: '#1565FF',
    fontWeight: 'bold',
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  actionModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 20,
  },
  actionPartPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  actionPartThumb: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  actionPartTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  actionPartPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0066FF',
    marginBottom: 2,
  },
  actionPartLocation: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  actionDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 8,
  },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 12,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionRowLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionRowSubLabel: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
});
