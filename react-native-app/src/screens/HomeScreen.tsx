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
import { requestNotificationPermission, saveFcmTokenToFirestore } from '../services/fcm';
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
import { subscribeToUnreadNotificationCount } from '../services/notifications';
import { getOptimizedImageUrl } from '../services/cloudinary';
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

// Memoized Part Card
const PartCard = React.memo(({ item, navigation, cardWidth, isFavorited, toggleFavorite, selectedCity }: any) => {
  const [imgError, setImgError] = useState(false);

  let resolvedImageSource = null;
  if (imgError) {
    resolvedImageSource = { uri: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=400&q=80' };
  } else if (item.imageUrl && typeof item.imageUrl === 'string' && item.imageUrl.startsWith('http')) {
    resolvedImageSource = { uri: getOptimizedImageUrl(item.imageUrl, 400, 300) };
  } else if (item.image && typeof item.image === 'string' && item.image.startsWith('http')) {
    resolvedImageSource = { uri: getOptimizedImageUrl(item.image, 400, 300) };
  } else if (item.id === 'demo-part-1') {
    resolvedImageSource = require('../assets/products/headlight.jpg');
  } else if (item.id === 'demo-part-2') {
    resolvedImageSource = require('../assets/products/turbocharger.jpg');
  } else {
    resolvedImageSource = { uri: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=400&q=80' };
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

          {/* Condition Badge */}
          {item.condition && (
            <View style={[styles.conditionBadge, item.condition.toLowerCase() === 'brand new' ? styles.badgeNew : styles.badgeUsed]}>
              <Text style={styles.conditionText}>
                {item.condition.toUpperCase()}
              </Text>
            </View>
          )}

          {/* Favorite Heart Button */}
          <TouchableOpacity
            style={styles.favoriteButton}
            activeOpacity={0.8}
            onPress={() => toggleFavorite(item)}
          >
            <Icon
              source={activeFavorited ? "heart" : "heart-outline"}
              size={18}
              color={activeFavorited ? "#EF4444" : "#FFFFFF"}
            />
          </TouchableOpacity>
        </View>

        {/* Content Box */}
        <View style={styles.cardContent}>
          <Text numberOfLines={1} style={styles.partTitle}>
            {item.title || item.partTitle || item.name}
          </Text>

          <Text style={styles.categorySubText} numberOfLines={1}>
            {item.carModel ? `${item.carModel}` : item.category || 'Auto Part'}
          </Text>

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

  // Responsive calculations
  // 4 Columns for compact category cards as requested
  const catCardWidth = Math.floor((screenWidth - 32 - 3 * 8) / 4);
  const brandCardWidth = Math.floor((screenWidth - 32 - 4 * 8) / 5);
  const productCardWidth = Math.floor((screenWidth - 32 - 12) / 2);

  // Prompt Notification Permission & Ensure FCM Token on Launch
  useEffect(() => {
    const initNotifications = async () => {
      try {
        await requestNotificationPermission();
        const currentU = getCurrentUser();
        const uid = currentU?.uid || currentU?.id;
        if (uid) {
          await saveFcmTokenToFirestore(uid);
        }
      } catch (err) {
        console.warn('[HomeScreen] Init notifications error:', err);
      }
    };
    initNotifications();
  }, []);

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

  // Load saved location on boot
  useEffect(() => {
    getUserSavedLocation().then((saved) => {
      if (saved && saved.city) {
        setSelectedCity(saved.city);
      }
    });
  }, []);

  // Refresh saved location when screen comes to focus
  useEffect(() => {
    const unsubscribe = navigation?.addListener('focus', () => {
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

  // Fetch Parts from Firestore
  const fetchParts = useCallback(() => {
    setLoading(true);
    try {
      const db = getFirebaseFirestore();
      if (!db || typeof db.collection !== 'function') {
        setParts(INITIAL_SPARE_PARTS);
        setLoading(false);
        setRefreshing(false);
        return () => {};
      }

      const unsubscribe = db.collection('parts').onSnapshot(
        (snapshot: any) => {
          const partsList: any[] = [];
          if (snapshot && typeof snapshot.forEach === 'function') {
            snapshot.forEach((doc: any) => {
              const data = doc.data ? doc.data() : doc;
              partsList.push({ id: doc.id, ...data });
            });
          }
          if (partsList.length === 0) {
            setParts(INITIAL_SPARE_PARTS);
          } else {
            partsList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            setParts(partsList);
          }
          setLoading(false);
          setRefreshing(false);
        },
        (error: any) => {
          console.warn('[HomeScreen] Firestore parts snapshot error, fallback to initial parts:', error);
          setParts(INITIAL_SPARE_PARTS);
          setLoading(false);
          setRefreshing(false);
        }
      );

      return unsubscribe;
    } catch (e) {
      console.warn('[HomeScreen] Exception fetching parts:', e);
      setParts(INITIAL_SPARE_PARTS);
      setLoading(false);
      setRefreshing(false);
      return () => {};
    }
  }, []);

  // Fetch Firestore Top Categories & Car Brands & Banners
  useEffect(() => {
    try {
      const db = getFirebaseFirestore();
      if (!db || typeof db.collection !== 'function') return;

      const unsubCats = db.collection('topCategories').onSnapshot((snap: any) => {
        const catList: any[] = [];
        if (snap && typeof snap.forEach === 'function') {
          snap.forEach((doc: any) => {
            const data = doc.data ? doc.data() : doc;
            catList.push({ id: doc.id, ...data });
          });
        }
        if (catList.length > 0) {
          catList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setTopCategories(catList);
        }
      }, (err: any) => console.warn('Categories sync error:', err));

      const unsubBrands = db.collection('carBrands').onSnapshot((snap: any) => {
        const brandList: any[] = [];
        if (snap && typeof snap.forEach === 'function') {
          snap.forEach((doc: any) => {
            const data = doc.data ? doc.data() : doc;
            brandList.push({ id: doc.id, ...data });
          });
        }
        if (brandList.length > 0) {
          brandList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setCarBrands(brandList);
        }
      }, (err: any) => console.warn('Car brands sync error:', err));

      const unsubBanners = db.collection('banners').onSnapshot((snap: any) => {
        const bannerList: any[] = [];
        if (snap && typeof snap.forEach === 'function') {
          snap.forEach((doc: any) => {
            const data = doc.data ? doc.data() : doc;
            bannerList.push({ id: doc.id, ...data });
          });
        }
        if (bannerList.length > 0) {
          bannerList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setBanners(bannerList);
        }
      }, (err: any) => console.warn('Banners sync error:', err));

      return () => {
        try { unsubCats(); } catch (_) {}
        try { unsubBrands(); } catch (_) {}
        try { unsubBanners(); } catch (_) {}
      };
    } catch (e) {
      console.warn('Metadata listener setup error:', e);
    }
  }, []);

  useEffect(() => {
    const unsub = fetchParts();
    return () => {
      try {
        if (typeof unsub === 'function') unsub();
      } catch (_) {}
    };
  }, [fetchParts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchParts();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Download Auto Parts India App to buy and sell verified car spare parts! https://autoparts.in',
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  // Filter Parts Based on Search, Category, Brand, Price and Location
  const filteredParts = useMemo(() => {
    return parts.filter((part) => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const matchesSearch = matchPartSearch(part, searchQuery.trim());
        if (!matchesSearch) return false;
      }

      // 2. Category filter
      if (selectedCategory && selectedCategory !== 'All') {
        const matchesCat = matchesCategoryFilter(part, selectedCategory);
        if (!matchesCat) return false;
      }

      // 3. Brand filter
      if (selectedBrand && selectedBrand !== 'All') {
        const brandLower = selectedBrand.toLowerCase();
        const partBrand = (part.brand || part.carBrand || part.make || '').toString().toLowerCase();
        const partTitle = (part.title || part.name || '').toString().toLowerCase();
        const partModel = (part.carModel || part.model || '').toString().toLowerCase();
        if (!partBrand.includes(brandLower) && !partTitle.includes(brandLower) && !partModel.includes(brandLower)) {
          return false;
        }
      }

      // 4. Price filter
      const price = Number(part.price || part.partPrice || 0);
      if (minPrice && price < Number(minPrice)) return false;
      if (maxPrice && price > Number(maxPrice)) return false;

      // 5. City filter
      if (selectedCity && selectedCity !== 'All India') {
        const cityLower = selectedCity.toLowerCase();
        const partLoc = (part.location || part.district || part.city || part.state || '').toString().toLowerCase();
        if (!partLoc.includes(cityLower)) {
          // Allow nationwide shipping parts or parts without strict location
          const canShip = Boolean(part.deliveryAvailable || part.allIndiaShipping);
          if (!canShip && !partLoc.includes(cityLower)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [parts, searchQuery, selectedCategory, selectedBrand, minPrice, maxPrice, selectedCity]);

  // Display Categories
  const displayCategories = useMemo(() => {
    if (topCategories.length > 0) return topCategories;
    return INITIAL_DEFAULT_CATEGORIES;
  }, [topCategories]);

  // Display Brands
  const displayBrands = useMemo(() => {
    if (carBrands.length > 0) return carBrands;
    return INITIAL_DEFAULT_BRANDS;
  }, [carBrands]);

  // Display Banners
  const displayBanners = useMemo(() => {
    if (banners.length > 0) return banners;
    return DEFAULT_PROMO_BANNERS;
  }, [banners]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1220" />

      {/* TOP HEADER - Clean Search & Location Controls (Without Logo) */}
      <View style={styles.topBar}>
        {/* Left: Location Selector */}
        <TouchableOpacity 
          style={styles.locationButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('LocationSelectScreen')}
        >
          <Icon source="map-marker" size={18} color="#0066FF" />
          <View style={styles.locationTextWrapper}>
            <Text style={styles.locationTitle} numberOfLines={1}>
              {selectedCity || 'All India'}
            </Text>
            <Icon source="chevron-down" size={14} color="#94A3B8" />
          </View>
        </TouchableOpacity>

        {/* Right: Notification & Saved Parts Icons */}
        <View style={styles.headerActionRow}>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('WishlistScreen')}
          >
            <Icon source="heart-outline" size={22} color="#FFFFFF" />
            {favorites.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{favorites.length > 9 ? '9+' : favorites.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Icon source="bell-outline" size={22} color="#FFFFFF" />
            {unreadCount > 0 && (
              <View style={styles.badgeRed}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* SEARCH BAR ROW */}
      <View style={styles.searchBarRow}>
        <TouchableOpacity
          style={styles.searchBox}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Search')}
        >
          <Icon source="magnify" size={20} color="#94A3B8" />
          <Text style={styles.searchPlaceholder}>
            Search spare parts, headlights, bumper...
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterBtn}
          activeOpacity={0.8}
          onPress={() => setShowFilterModal(true)}
        >
          <Icon source="tune-variant" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* MAIN SCROLLABLE FEED */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0066FF"
            colors={['#0066FF']}
          />
        }
      >
        {/* 1. TOP CATEGORIES (4-Column Grid) */}
        <View style={styles.sectionHeaderRow}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Top Categories
          </Text>
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => navigation.navigate('AllCategories')}
          >
            <Text style={styles.seeAllText}>See All →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.categoriesGrid}>
          {displayCategories.slice(0, 8).map((cat: any) => {
            const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
            return (
              <TouchableOpacity
                key={cat.id || cat.name}
                activeOpacity={0.8}
                style={[styles.categoryCard, { width: catCardWidth }, isSelected && styles.categoryCardActive]}
                onPress={() => {
                  setSelectedCategory(isSelected ? 'All' : cat.name);
                }}
              >
                <View style={[styles.categoryIconCircle, isSelected && styles.categoryIconCircleActive]}>
                  <Category3DIcon categoryName={cat.name} iconUrl={cat.iconUrl} size={28} />
                </View>
                <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelActive]} numberOfLines={2}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 3. POPULAR CAR BRANDS */}
        <View style={styles.sectionHeaderRow}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Popular Brands
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.brandsScroll}
        >
          {displayBrands.map((brand: any) => {
            const isSelected = selectedBrand.toLowerCase() === brand.name.toLowerCase();
            return (
              <TouchableOpacity
                key={brand.id || brand.name}
                activeOpacity={0.8}
                style={[styles.brandPill, isSelected && styles.brandPillActive]}
                onPress={() => {
                  setSelectedBrand(isSelected ? 'All' : brand.name);
                }}
              >
                <CarBrandBadge brandName={brand.name} logoUrl={brand.logoUrl} size={24} />
                <Text style={[styles.brandNameText, isSelected && styles.brandNameTextActive]}>
                  {brand.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 4. VERIFIED SPARE PARTS FEED */}
        <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {selectedCategory !== 'All' ? `${selectedCategory} Parts` : 'Fresh Recommendations'}
          </Text>
          <Text style={styles.partsCountText}>{filteredParts.length} Parts</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#0066FF" size="large" />
            <Text style={styles.loadingText}>Loading spare parts...</Text>
          </View>
        ) : filteredParts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Icon source="car-off" size={48} color="#64748B" />
            <Text style={styles.emptyTitle}>No Spare Parts Found</Text>
            <Text style={styles.emptySubtitle}>
              No parts match your current category or location filter. Try clearing filters.
            </Text>
            <Button
              mode="contained"
              onPress={() => {
                setSelectedCategory('All');
                setSelectedBrand('All');
                setSelectedCity('All India');
              }}
              style={styles.resetBtn}
            >
              Reset Filters
            </Button>
          </View>
        ) : (
          <View style={styles.partsGrid}>
            {filteredParts.map((item: any) => (
              <PartCard
                key={item.id}
                item={item}
                navigation={navigation}
                cardWidth={productCardWidth}
                isFavorited={favorites.some((f: any) => f.id === item.id)}
                toggleFavorite={toggleFavorite}
                selectedCity={selectedCity}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* FILTER MODAL */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContainer}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={styles.modalTitle}>Filter Spare Parts</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Icon source="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.filterLabel}>Price Range (₹)</Text>
              <View style={styles.priceInputRow}>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Min Price"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  value={minPrice}
                  onChangeText={setMinPrice}
                />
                <Text style={{ color: '#94A3B8' }}>—</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Max Price"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                />
              </View>

              <Text style={[styles.filterLabel, { marginTop: 16 }]}>Category</Text>
              <View style={styles.modalPillWrap}>
                {['All', ...displayCategories.map((c) => c.name)].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.modalPill, selectedCategory === cat && styles.modalPillActive]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={[styles.modalPillText, selectedCategory === cat && styles.modalPillTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalClearBtn}
                onPress={() => {
                  setMinPrice('');
                  setMaxPrice('');
                  setSelectedCategory('All');
                  setSelectedBrand('All');
                  setShowFilterModal(false);
                }}
              >
                <Text style={styles.modalClearText}>Clear All</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.modalApplyText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F1E36',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  locationTextWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    maxWidth: 160,
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0F1E36',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#0066FF',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeRed: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1E36',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    gap: 8,
  },
  searchPlaceholder: {
    color: '#94A3B8',
    fontSize: 13,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0066FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  seeAllText: {
    color: '#0066FF',
    fontWeight: '700',
    fontSize: 13,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
  },
  categoryCard: {
    backgroundColor: '#0F1E36',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  categoryCardActive: {
    borderColor: '#0066FF',
    backgroundColor: 'rgba(0, 102, 255, 0.15)',
  },
  categoryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryIconCircleActive: {
    backgroundColor: '#0066FF',
  },
  categoryLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
  categoryLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  brandsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F1E36',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  brandPillActive: {
    backgroundColor: '#0066FF',
    borderColor: '#0066FF',
  },
  brandNameText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  brandNameTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  partsCountText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  partsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#0F1E36',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  imageContainer: {
    height: 120,
    backgroundColor: '#1E293B',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  conditionBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeNew: {
    backgroundColor: '#10B981',
  },
  badgeUsed: {
    backgroundColor: '#64748B',
  },
  conditionText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  favoriteButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: 10,
  },
  partTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 2,
  },
  categorySubText: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 6,
  },
  price: {
    color: '#38BDF8',
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    color: '#64748B',
    fontSize: 11,
  },
  loadingBox: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 10,
    fontSize: 13,
  },
  emptyBox: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
    marginTop: 12,
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    maxWidth: 260,
  },
  resetBtn: {
    backgroundColor: '#0066FF',
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  filterModalContainer: {
    backgroundColor: '#0F1E36',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E3A5F',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
  },
  filterLabel: {
    color: '#E2E8F0',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 8,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInput: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalPillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalPillActive: {
    backgroundColor: '#0066FF',
    borderColor: '#0066FF',
  },
  modalPillText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  modalPillTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E3A5F',
  },
  modalClearBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  modalClearText: {
    color: '#94A3B8',
    fontWeight: '700',
  },
  modalApplyBtn: {
    flex: 2,
    backgroundColor: '#0066FF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalApplyText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
