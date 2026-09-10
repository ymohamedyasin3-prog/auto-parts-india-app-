import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Platform,
  StatusBar,
  Keyboard,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { INITIAL_SPARE_PARTS } from '../data/mockData';
import { getFirebaseFirestore, getFirebaseAuth, getCurrentUser } from '../services/firebase';
import { subscribeToUserUnreadCounts } from '../services/notifications';
import { useFavorites } from '../services/favorites';
import { matchesCategoryFilter } from '../utils/categoryMatcher';
import { matchPartSearch, parseCreatedAt } from '../utils/searchHelper';
import { MASTER_CATEGORIES, MasterCategory } from '../constants/categories';
import { ScalePressable, FadeInSlide, FavoriteHeartButton } from '../components/animations';
import FilterAndSortModal, { FilterTabType, FilterValues } from '../components/FilterAndSortModal';
import { UserAvatar } from '../components/UserAvatar';
import { CategoryGridSkeleton, BrandListSkeleton, ListFeedSkeleton } from '../components/SkeletonLoaders';

const RECENT_SEARCHES_KEY = '@autoparts_recent_searches';

const DEFAULT_POPULAR_BRANDS = [
  'All Brands',
  'Maruti Suzuki',
  'Hyundai',
  'Tata',
  'Mahindra',
  'Toyota',
  'Honda',
  'Kia',
  'Volkswagen',
  'Skoda',
  'Ford',
  'Renault',
  'Nissan',
  'MG Motor',
  'BMW',
  'Mercedes-Benz',
  'Audi',
];

const CONDITIONS = ['All Conditions', 'New', 'Used'];

const POPULAR_STATES = [
  'All India',
  'Tamil Nadu',
  'Maharashtra',
  'Karnataka',
  'Kerala',
  'Delhi NCR',
  'Telangana',
  'Andhra Pradesh',
  'Gujarat',
  'Rajasthan',
  'Punjab',
  'Uttar Pradesh',
  'West Bengal',
];

export default function SearchScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState(route?.params?.initialQuery || '');
  const [selectedCategory, setSelectedCategory] = useState(
    route?.params?.initialCategory || route?.params?.selectedCategory || 'All Categories'
  );
  const [selectedBrand, setSelectedBrand] = useState(route?.params?.initialBrand || 'All Brands');
  const [selectedCondition, setSelectedCondition] = useState('All Conditions');
  const [selectedLocation, setSelectedLocation] = useState(route?.params?.initialState || 'All India');
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high'>('newest');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  // Modals state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterModalInitialTab, setFilterModalInitialTab] = useState<FilterTabType>('budget');
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isConditionModalOpen, setIsConditionModalOpen] = useState(false);
  const [isFilterApplied, setIsFilterApplied] = useState<boolean>(
    !!route?.params?.initialQuery ||
    !!route?.params?.initialCategory ||
    !!route?.params?.selectedCategory ||
    !!route?.params?.initialBrand ||
    !!route?.params?.selectedBrand
  );

  // Brand modal search query
  const [brandSearchInput, setBrandSearchInput] = useState('');

  // Recent Searches (Real user search history only)
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Firestore dynamic Categories and Brands
  const [firestoreCategories, setFirestoreCategories] = useState<any[]>([]);
  const [firestoreBrands, setFirestoreBrands] = useState<any[]>([]);

  // Parts & Favorites
  const [parts, setParts] = useState<any[]>(INITIAL_SPARE_PARTS);
  const [loading, setLoading] = useState<boolean>(true);
  const { favorites, toggleFavorite } = useFavorites();

  const favoritedIdsSet = useMemo(() => {
    return new Set((favorites || []).map((f: any) => typeof f === 'string' ? f : (f?.id || f?.partId)).filter(Boolean));
  }, [favorites]);

  // Unread badge counts for bottom navigation bar
  const [unreadCounts, setUnreadCounts] = useState({ unreadChats: 0, unreadNotifications: 0, totalUnread: 0 });

  useEffect(() => {
    let unsubAuth = () => {};
    let unsubListener = () => {};

    try {
      const auth = getFirebaseAuth();
      if (auth && typeof auth.onAuthStateChanged === 'function') {
        unsubAuth = auth.onAuthStateChanged((user: any) => {
          const uid = user?.uid || user?.id;
          unsubListener();
          if (uid) {
            unsubListener = subscribeToUserUnreadCounts(uid, (counts) => {
              setUnreadCounts(counts);
            });
          } else {
            setUnreadCounts({ unreadChats: 0, unreadNotifications: 0, totalUnread: 0 });
          }
        });
      } else {
        const user = getCurrentUser();
        const uid = user?.uid || user?.id;
        if (uid) {
          unsubListener = subscribeToUserUnreadCounts(uid, (counts) => {
            setUnreadCounts(counts);
          });
        }
      }
    } catch (_) {}

    return () => {
      try { unsubAuth(); } catch (_) {}
      try { unsubListener(); } catch (_) {}
    };
  }, []);

  // Load Recent Searches from AsyncStorage (Real data only)
  useEffect(() => {
    AsyncStorage.getItem(RECENT_SEARCHES_KEY)
      .then((val) => {
        if (val) {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) {
              setRecentSearches(parsed);
              return;
            }
          } catch (_) {}
        }
        setRecentSearches([]);
      })
      .catch(() => {
        setRecentSearches([]);
      });
  }, []);

  // Synchronize route params updates when navigating back from other screens
  useEffect(() => {
    const locParam = route?.params?.selectedLocation || route?.params?.selectedCity || route?.params?.initialState;
    if (locParam && locParam !== selectedLocation) {
      setSelectedLocation(locParam);
    }
    const catParam = route?.params?.initialCategory || route?.params?.selectedCategory;
    if (catParam && catParam !== selectedCategory) {
      setSelectedCategory(catParam);
    }
    const brandParam = route?.params?.initialBrand || route?.params?.selectedBrand;
    if (brandParam && brandParam !== selectedBrand) {
      setSelectedBrand(brandParam);
    }
    const queryParam = route?.params?.initialQuery;
    if (typeof queryParam === 'string' && queryParam !== searchQuery) {
      setSearchQuery(queryParam);
    }
  }, [
    route?.params?.selectedLocation,
    route?.params?.selectedCity,
    route?.params?.initialState,
    route?.params?.initialCategory,
    route?.params?.selectedCategory,
    route?.params?.initialBrand,
    route?.params?.selectedBrand,
    route?.params?.initialQuery,
  ]);

  // Save query to Recent Searches
  const addRecentSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 8);
      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  // Remove individual recent search
  const removeRecentSearch = (itemToRemove: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item !== itemToRemove);
      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  // Clear all recent searches
  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    AsyncStorage.removeItem(RECENT_SEARCHES_KEY).catch(() => {});
  };

  // Real-time Firestore sync for spare parts, dynamic categories & brands
  useEffect(() => {
    try {
      const db = getFirebaseFirestore();
      if (db && typeof db.collection === 'function') {
        // 1. Sync Spare Parts
        const unsubParts = db.collection('spareParts').limit(80).onSnapshot(
          (snapshot: any) => {
            const list: any[] = [];
            snapshot.forEach((doc: any) => {
              const data = doc.data ? doc.data() : doc;
              if (data && (data.isDeleted === true || data.status === 'deleted')) {
                return;
              }
              list.push({ id: doc.id, ...data });
            });
            list.sort((a, b) => parseCreatedAt(b.createdAt) - parseCreatedAt(a.createdAt));
            setParts(list.length > 0 ? list : INITIAL_SPARE_PARTS);
            setLoading(false);
          },
          () => {
            setParts((current) => (current.length > 0 ? current : INITIAL_SPARE_PARTS));
            setLoading(false);
          }
        );

        // 2. Sync Dynamic Categories from Admin Panel
        const unsubCats = db.collection('topCategories').onSnapshot(
          (snapshot: any) => {
            const list: any[] = [];
            snapshot.forEach((doc: any) => {
              const data = doc.data ? doc.data() : doc;
              if (data && data.isActive !== false && data.active !== false) {
                list.push({ id: doc.id, ...data });
              }
            });
            list.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
            setFirestoreCategories(list);
          },
          () => {}
        );

        // 3. Sync Dynamic Car Brands from Admin Panel
        const unsubBrands = db.collection('carBrands').onSnapshot(
          (snapshot: any) => {
            const list: any[] = [];
            snapshot.forEach((doc: any) => {
              const data = doc.data ? doc.data() : doc;
              if (data && data.isActive !== false && data.active !== false) {
                list.push({ id: doc.id, ...data });
              }
            });
            list.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
            setFirestoreBrands(list);
          },
          () => {}
        );

        return () => {
          unsubParts?.();
          unsubCats?.();
          unsubBrands?.();
        };
      }
    } catch (_) {
      setParts((current) => (current.length > 0 ? current : INITIAL_SPARE_PARTS));
    }
  }, []);

  // Combined Dynamic Categories (combines MASTER_CATEGORIES with any newly added admin categories)
  const dynamicCategoriesList = useMemo(() => {
    const list: MasterCategory[] = [];
    const seenNames = new Set<string>();

    // 1. If Firestore categories exist, process them
    if (firestoreCategories && firestoreCategories.length > 0) {
      firestoreCategories.forEach((fc) => {
        const name = (fc.name || fc.title || fc.id || '').trim();
        if (!name || seenNames.has(name.toLowerCase())) return;
        seenNames.add(name.toLowerCase());

        // Find matching MasterCategory for 3D graphic if available
        const matchedMaster = MASTER_CATEGORIES.find(
          (mc) => mc.name.toLowerCase() === name.toLowerCase() || mc.id.toLowerCase() === name.toLowerCase()
        );

        list.push({
          id: fc.id || name,
          name: name,
          icon: fc.icon || matchedMaster?.icon || 'car-cog',
          bg: fc.bg || matchedMaster?.bg || '#F0F9FF',
          color: fc.color || matchedMaster?.color || '#0284C7',
          description: fc.description || matchedMaster?.description || 'Genuine replacement spare parts',
          popularParts: fc.popularParts || matchedMaster?.popularParts || ['OEM Part', 'Spare Part'],
          imageUrl: fc.imageUrl || matchedMaster?.imageUrl || undefined,
        });
      });
    }

    // 2. Add any default MASTER_CATEGORIES that were not in Firestore
    MASTER_CATEGORIES.forEach((mc) => {
      if (!seenNames.has(mc.name.toLowerCase())) {
        seenNames.add(mc.name.toLowerCase());
        list.push(mc);
      }
    });

    return list;
  }, [firestoreCategories]);

  // Combined Dynamic Brands (combines DEFAULT_POPULAR_BRANDS with any newly added admin brands)
  const dynamicBrandsList = useMemo(() => {
    const brandsSet = new Set<string>(DEFAULT_POPULAR_BRANDS);
    if (firestoreBrands && firestoreBrands.length > 0) {
      firestoreBrands.forEach((fb) => {
        const name = (fb.name || fb.title || fb.id || '').trim();
        if (name) {
          brandsSet.add(name);
        }
      });
    }
    return Array.from(brandsSet);
  }, [firestoreBrands]);

  // Count active filters
  const activeFiltersCount = [
    selectedCategory && selectedCategory !== 'All Categories' && selectedCategory !== 'All',
    selectedBrand && selectedBrand !== 'All Brands' && selectedBrand !== 'All',
    selectedCondition && selectedCondition !== 'All Conditions' && selectedCondition !== 'All',
    selectedLocation && selectedLocation !== 'All India' && selectedLocation !== 'All States' && selectedLocation !== 'All',
    !!minPrice.trim() || !!maxPrice.trim(),
    sortBy !== 'newest',
  ].filter(Boolean).length;

  const isSearchActive = searchQuery.trim().length > 0 || activeFiltersCount > 0 || isFilterApplied;

  const resetFilters = () => {
    setSearchQuery('');
    setMinPrice('');
    setMaxPrice('');
    setSelectedCategory('All Categories');
    setSelectedBrand('All Brands');
    setSelectedCondition('All Conditions');
    setSelectedLocation('All India');
    setSortBy('newest');
    setIsFilterApplied(false);
  };

  const openFilterModal = (tab: FilterTabType = 'budget') => {
    setFilterModalInitialTab(tab);
    setIsFilterModalOpen(true);
  };

  const handleApplyFilters = (filters: FilterValues) => {
    setMinPrice(filters.minPrice);
    setMaxPrice(filters.maxPrice);
    setSelectedBrand(filters.selectedBrand);
    setSelectedCategory(filters.selectedCategory);
    setSelectedCondition(filters.selectedCondition);
    setSelectedLocation(filters.selectedLocation);
    setSortBy(filters.sortBy);
    setIsFilterApplied(true);
  };

  const handleSearchSubmit = () => {
    Keyboard.dismiss();
    setIsFilterApplied(true);
    if (searchQuery.trim()) {
      addRecentSearch(searchQuery);
    }
  };

  const handleSelectRecentSearch = (term: string) => {
    setSearchQuery(term);
    addRecentSearch(term);
    setIsFilterApplied(true);
    Keyboard.dismiss();
  };

  const handleSelectCategory = (catName: string) => {
    setSelectedCategory(catName);
    setIsCategoryModalOpen(false);
    setIsFilterApplied(true);
  };

  const handleSelectBrand = (brandName: string) => {
    setSelectedBrand(brandName);
    setIsBrandModalOpen(false);
    setIsFilterApplied(true);
  };

  const handleSelectLocation = (locName: string) => {
    setSelectedLocation(locName);
    setIsLocationModalOpen(false);
    setIsFilterApplied(true);
  };

  const handleSelectCondition = (condName: string) => {
    setSelectedCondition(condName);
    setIsConditionModalOpen(false);
    setIsFilterApplied(true);
  };

  // Filtered Parts Memo
  const filteredParts = useMemo(() => {
    const scoredList: { part: any; score: number }[] = [];

    for (const part of parts) {
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

      if (selectedCategory !== 'All Categories' && selectedCategory !== 'All') {
        if (!matchesCategoryFilter(part, selectedCategory)) {
          continue;
        }
      }

      if (selectedBrand !== 'All Brands' && selectedBrand !== 'All') {
        const brandLower = selectedBrand.toLowerCase().trim();
        const partBrand = (part.brand || part.carBrand || part.make || '').toString().toLowerCase().trim();
        const partTitle = (part.title || part.name || '').toString().toLowerCase().trim();
        const partModel = (part.carModel || part.model || '').toString().toLowerCase().trim();
        const brandMatched =
          partBrand === brandLower ||
          (partBrand && (partBrand.includes(brandLower) || brandLower.includes(partBrand))) ||
          partTitle.includes(brandLower) ||
          partModel.includes(brandLower);

        if (!brandMatched) {
          continue;
        }
      }

      if (selectedCondition !== 'All Conditions') {
        const isNewSelected = selectedCondition === 'New';
        const isPartNew = (part.condition || '').toLowerCase().includes('new');
        if (isNewSelected && !isPartNew) continue;
        if (!isNewSelected && isPartNew) continue;
      }

      if (selectedLocation !== 'All India' && selectedLocation !== 'All States') {
        const locLower = selectedLocation.toLowerCase().trim();
        const partLoc = [
          part.state,
          part.location,
          part.district,
          part.city,
          part.area,
          part.sellerCity,
          part.sellerDistrict,
          part.sellerState
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!partLoc.includes(locLower)) {
          continue;
        }
      }

      // Filter by Price Range (minPrice & maxPrice)
      if (minPrice.trim()) {
        const minVal = Number(minPrice);
        const itemPrice = Number(part.price || part.partPrice) || 0;
        if (!isNaN(minVal) && itemPrice < minVal) {
          continue;
        }
      }

      if (maxPrice.trim()) {
        const maxVal = Number(maxPrice);
        const itemPrice = Number(part.price || part.partPrice) || 0;
        if (!isNaN(maxVal) && itemPrice > maxVal) {
          continue;
        }
      }

      scoredList.push({ part, score: searchScore });
    }

    return scoredList
      .sort((a, b) => {
        if (searchQuery.trim() && sortBy === 'newest') {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
        }
        if (sortBy === 'price_low') {
          return (Number(a.part.price || a.part.partPrice) || 0) - (Number(b.part.price || b.part.partPrice) || 0);
        }
        if (sortBy === 'price_high') {
          return (Number(b.part.price || b.part.partPrice) || 0) - (Number(a.part.price || a.part.partPrice) || 0);
        }
        return parseCreatedAt(b.part.createdAt) - parseCreatedAt(a.part.createdAt);
      })
      .map((item) => item.part);
  }, [parts, searchQuery, selectedCategory, selectedBrand, selectedCondition, selectedLocation, minPrice, maxPrice, sortBy]);

  // Helper to format created time into friendly string
  const formatTimeAgo = (createdAtVal: any) => {
    const millis = parseCreatedAt(createdAtVal);
    if (!millis) return 'Recently';
    const diffSec = Math.floor((Date.now() - millis) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}mo ago`;
  };

  // Render Product Card in Search Results (Modern Reference Layout: Left Image, Right Info)
  const renderPartItem = ({ item }: { item: any }) => {
    const isFav = favoritedIdsSet.has(item.id);
    const primaryUri =
      item.imageUrl ||
      item.images?.[0] ||
      item.imageUrls?.[0] ||
      'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=400';
    const isNew = (item.condition || '').toLowerCase().includes('new');
    const imageCount = (item.images?.length || item.imageUrls?.length || (item.imageUrl ? 1 : 0)) || 1;
    const timeAgoStr = formatTimeAgo(item.createdAt);
    const brandModelStr = `${item.carBrand || item.brand || 'Universal'}${item.carModel || item.model ? ' ' + (item.carModel || item.model) : ''}`;
    const locationStr = item.location || item.district || item.state || 'All India';

    return (
      <ScalePressable
        style={styles.card}
        scaleTo={0.98}
        onPress={() => {
          if (searchQuery.trim()) {
            addRecentSearch(searchQuery);
          }
          navigation.navigate('ProductDetail', { part: item });
        }}
      >
        {/* Left Side: Large Square Image with Badges */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: primaryUri }} style={styles.cardImage} resizeMode="cover" />
          
          {/* Condition Badge (e.g. NEW / USED) */}
          <View style={[styles.badgeContainer, isNew ? styles.badgeNew : styles.badgeUsed]}>
            <Text style={styles.badgeText}>{isNew ? 'NEW' : 'USED'}</Text>
          </View>

          {/* Image Count Pill at bottom */}
          {imageCount > 1 && (
            <View style={styles.imageCountBadge}>
              <Icon source="camera" size={10} color="#FFFFFF" />
              <Text style={styles.imageCountText}>{imageCount}</Text>
            </View>
          )}
        </View>

        {/* Right Side: Price, Heart, Title, Brand Tag, Location & Time */}
        <View style={styles.cardContent}>
          {/* Top Row: Price on Left, Heart Favorite on Right */}
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardPrice}>₹{(item.price || 0).toLocaleString('en-IN')}</Text>
            <TouchableOpacity
              style={styles.favCircleBtn}
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation?.();
                toggleFavorite(item.id);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon
                source={isFav ? "heart" : "heart-outline"}
                size={18}
                color={isFav ? "#EF4444" : "#94A3B8"}
              />
            </TouchableOpacity>
          </View>

          {/* Part Title */}
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Description Snippet if available */}
          {Boolean(item.description) && (
            <Text style={styles.cardDescription} numberOfLines={1}>
              {item.description}
            </Text>
          )}

          {/* Brand & Model Chip */}
          <View style={styles.tagRow}>
            <View style={styles.brandTag}>
              <Icon source="car-side" size={11} color="#0066FF" />
              <Text style={styles.brandTagText} numberOfLines={1}>
                {brandModelStr}
              </Text>
            </View>
          </View>

          {/* Footer Row: Location & Timestamp */}
          <View style={styles.cardFooterRow}>
            <View style={styles.locationCol}>
              <Icon source="map-marker-outline" size={12} color="#64748B" />
              <Text style={styles.locationText} numberOfLines={1}>
                {locationStr}
              </Text>
            </View>

            <View style={styles.timeCol}>
              <Icon source="clock-outline" size={11} color="#94A3B8" />
              <Text style={styles.timeText} numberOfLines={1}>
                {timeAgoStr}
              </Text>
            </View>
          </View>
        </View>
      </ScalePressable>
    );
  };

  // Filtered brands for Brand Modal
  const filteredBrandsForModal = useMemo(() => {
    if (!brandSearchInput.trim()) return dynamicBrandsList;
    return dynamicBrandsList.filter((b) => b.toLowerCase().includes(brandSearchInput.toLowerCase().trim()));
  }, [brandSearchInput, dynamicBrandsList]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1220" />

      {/* TOP UNIFIED SEARCH ROW - Matching Royal Primary Blue (#0066FF) */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon source="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.searchBarContainer}>
          <Icon source="magnify" color="#64748B" size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search spare parts, headlights, bumper..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon source="close-circle" color="#94A3B8" size={18} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterBtn, activeFiltersCount > 0 && styles.filterBtnActive]}
          activeOpacity={0.75}
          onPress={() => openFilterModal('budget')}
        >
          <Icon source="tune-variant" color={activeFiltersCount > 0 ? '#0066FF' : '#FFFFFF'} size={20} />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* MAIN CONTENT AREA */}
      {!isSearchActive ? (
        /* DISCOVERY / LANDING VIEW (Reference Image UI Layout) */
        <ScrollView
          style={styles.discoveryScroll}
          contentContainerStyle={styles.discoveryScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. QUICK 2x2 FILTER TILES */}
          <View style={styles.tilesGrid}>
            {/* Tile 1: Select Brand */}
            <ScalePressable
              scaleTo={0.96}
              style={styles.tileCard}
              onPress={() => openFilterModal('brand')}
            >
              <View style={styles.tileIconCircle}>
                <Icon source="car" size={22} color="#0284C7" />
              </View>
              <View style={styles.tileTextContainer}>
                <Text style={styles.tileTitle}>Select Brand</Text>
                <Text style={styles.tileSubtitle} numberOfLines={1}>
                  {selectedBrand !== 'All Brands' ? selectedBrand : 'e.g. Maruti, Hyundai'}
                </Text>
              </View>
              <Icon source="chevron-right" size={20} color="#94A3B8" />
            </ScalePressable>

            {/* Tile 2: Select Category */}
            <ScalePressable
              scaleTo={0.96}
              style={styles.tileCard}
              onPress={() => openFilterModal('category')}
            >
              <View style={[styles.tileIconCircle, { backgroundColor: '#FDF4FF' }]}>
                <Icon source="view-grid-outline" size={22} color="#A855F7" />
              </View>
              <View style={styles.tileTextContainer}>
                <Text style={styles.tileTitle}>Select Category</Text>
                <Text style={styles.tileSubtitle} numberOfLines={1}>
                  {selectedCategory !== 'All Categories' ? selectedCategory : 'e.g. Engine, Body Parts'}
                </Text>
              </View>
              <Icon source="chevron-right" size={20} color="#94A3B8" />
            </ScalePressable>

            {/* Tile 3: Select Location */}
            <ScalePressable
              scaleTo={0.96}
              style={styles.tileCard}
              onPress={() => {
                navigation.navigate('LocationSelectScreen', {
                  returnScreen: 'Search',
                  currentCity: selectedLocation,
                });
              }}
            >
              <View style={[styles.tileIconCircle, { backgroundColor: '#FEF2F2' }]}>
                <Icon source="map-marker-outline" size={22} color="#EF4444" />
              </View>
              <View style={styles.tileTextContainer}>
                <Text style={styles.tileTitle}>Select Location</Text>
                <Text style={styles.tileSubtitle} numberOfLines={1}>
                  {selectedLocation !== 'All India' ? selectedLocation : 'All India'}
                </Text>
              </View>
              <Icon source="chevron-right" size={20} color="#94A3B8" />
            </ScalePressable>

            {/* Tile 4: Condition */}
            <ScalePressable
              scaleTo={0.96}
              style={styles.tileCard}
              onPress={() => openFilterModal('condition')}
            >
              <View style={[styles.tileIconCircle, { backgroundColor: '#ECFDF5' }]}>
                <Icon source="tag-outline" size={22} color="#10B981" />
              </View>
              <View style={styles.tileTextContainer}>
                <Text style={styles.tileTitle}>Condition</Text>
                <Text style={styles.tileSubtitle} numberOfLines={1}>
                  {selectedCondition !== 'All Conditions' ? selectedCondition : 'New / Used'}
                </Text>
              </View>
              <Icon source="chevron-right" size={20} color="#94A3B8" />
            </ScalePressable>
          </View>

          {/* 2. RECENT SEARCHES */}
          {recentSearches.length > 0 && (
            <View style={styles.recentSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>Recent Searches</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={clearAllRecentSearches}>
                  <Text style={styles.clearAllText}>Clear All</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.recentListContainer}>
                {recentSearches.map((item, index) => (
                  <View key={`${item}-${index}`} style={styles.recentItemRow}>
                    <TouchableOpacity
                      style={styles.recentItemTouchable}
                      activeOpacity={0.7}
                      onPress={() => handleSelectRecentSearch(item)}
                    >
                      <Icon source="clock-outline" size={18} color="#64748B" />
                      <Text style={styles.recentItemText} numberOfLines={1}>
                        {item}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.recentItemDeleteBtn}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      onPress={() => removeRecentSearch(item)}
                    >
                      <Icon source="close" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 3. POPULAR CATEGORIES (Dynamically synced from Firestore + Master Categories) */}
          <View style={styles.popularCatSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Popular Categories</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('AllCategories')}
              >
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.categoriesGrid}>
              {dynamicCategoriesList.map((cat: MasterCategory) => (
                <TouchableOpacity
                  key={cat.id || cat.name}
                  style={styles.categoryCard}
                  activeOpacity={0.75}
                  onPress={() => handleSelectCategory(cat.name)}
                >
                  <View style={styles.categoryImageContainer}>
                    {cat.imageUrl ? (
                      <Image source={{ uri: cat.imageUrl }} style={styles.categoryImage} resizeMode="contain" />
                    ) : (
                      <View style={[styles.categoryIconFallback, { backgroundColor: cat.bg || '#F0F9FF' }]}>
                        <Icon source={cat.icon || 'car-cog'} size={28} color={cat.color || '#0284C7'} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.categoryCardTitle} numberOfLines={2}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        /* LIVE RESULTS VIEW */
        <View style={styles.resultsContainer}>
          {/* Active Filter Chips Bar */}
          {(activeFiltersCount > 0 || (isFilterApplied && !!searchQuery.trim())) && (
            <View style={styles.activeChipsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeChipsScroll}>
                {!!searchQuery.trim() && (
                  <View style={styles.activeChip}>
                    <Text style={styles.activeChipText}>🔍 "{searchQuery}"</Text>
                    <TouchableOpacity
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      onPress={() => setSearchQuery('')}
                    >
                      <Icon source="close-circle" size={16} color="#0066FF" />
                    </TouchableOpacity>
                  </View>
                )}

                {(!!minPrice.trim() || !!maxPrice.trim()) && (
                  <View style={styles.activeChip}>
                    <Text style={styles.activeChipText}>
                      💰 {minPrice ? `₹${Number(minPrice).toLocaleString('en-IN')}` : '₹0'} – {maxPrice ? `₹${Number(maxPrice).toLocaleString('en-IN')}` : 'Any'}
                    </Text>
                    <TouchableOpacity
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      onPress={() => { setMinPrice(''); setMaxPrice(''); }}
                    >
                      <Icon source="close-circle" size={16} color="#0066FF" />
                    </TouchableOpacity>
                  </View>
                )}

                {selectedCategory && selectedCategory !== 'All Categories' && selectedCategory !== 'All' ? (
                  <View style={styles.activeChip}>
                    <Text style={styles.activeChipText}>🗂️ {selectedCategory}</Text>
                    <TouchableOpacity
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      onPress={() => setSelectedCategory('All Categories')}
                    >
                      <Icon source="close-circle" size={16} color="#0066FF" />
                    </TouchableOpacity>
                  </View>
                ) : null}

                {selectedBrand && selectedBrand !== 'All Brands' && selectedBrand !== 'All' ? (
                  <View style={styles.activeChip}>
                    <Text style={styles.activeChipText}>🚗 {selectedBrand}</Text>
                    <TouchableOpacity
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      onPress={() => setSelectedBrand('All Brands')}
                    >
                      <Icon source="close-circle" size={16} color="#0066FF" />
                    </TouchableOpacity>
                  </View>
                ) : null}

                {selectedCondition && selectedCondition !== 'All Conditions' && selectedCondition !== 'All' ? (
                  <View style={styles.activeChip}>
                    <Text style={styles.activeChipText}>🏷️ {selectedCondition}</Text>
                    <TouchableOpacity
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      onPress={() => setSelectedCondition('All Conditions')}
                    >
                      <Icon source="close-circle" size={16} color="#0066FF" />
                    </TouchableOpacity>
                  </View>
                ) : null}

                {selectedLocation && selectedLocation !== 'All India' && selectedLocation !== 'All States' && selectedLocation !== 'All' ? (
                  <View style={styles.activeChip}>
                    <Text style={styles.activeChipText}>📍 {selectedLocation}</Text>
                    <TouchableOpacity
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      onPress={() => setSelectedLocation('All India')}
                    >
                      <Icon source="close-circle" size={16} color="#0066FF" />
                    </TouchableOpacity>
                  </View>
                ) : null}

                <TouchableOpacity style={styles.clearAllFiltersBtn} onPress={resetFilters}>
                  <Text style={styles.clearAllFiltersText}>Reset All</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}

          {/* Results Summary and Sorting */}
          <View style={styles.subHeader}>
            <Text style={styles.resultCountText}>
              {filteredParts.length} {filteredParts.length === 1 ? 'part found' : 'parts found'}
            </Text>
            <View style={styles.sortRow}>
              <Text style={styles.sortLabel}>Sort:</Text>
              <TouchableOpacity
                style={[styles.sortBtn, sortBy === 'newest' && styles.sortBtnActive]}
                activeOpacity={0.75}
                onPress={() => setSortBy('newest')}
              >
                <Text style={[styles.sortBtnText, sortBy === 'newest' && styles.sortBtnTextActive]}>Latest</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortBtn, sortBy === 'price_low' && styles.sortBtnActive]}
                activeOpacity={0.75}
                onPress={() => setSortBy('price_low')}
              >
                <Text style={[styles.sortBtnText, sortBy === 'price_low' && styles.sortBtnTextActive]}>Price: Low</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortBtn, sortBy === 'price_high' && styles.sortBtnActive]}
                activeOpacity={0.75}
                onPress={() => setSortBy('price_high')}
              >
                <Text style={[styles.sortBtnText, sortBy === 'price_high' && styles.sortBtnTextActive]}>High</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Parts List */}
          {loading ? (
            <ListFeedSkeleton count={5} />
          ) : filteredParts.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Icon source="car-off" size={42} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No matching spare parts</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search terms or clearing some filters to see available listings.
              </Text>
              <TouchableOpacity style={styles.resetBtn} activeOpacity={0.75} onPress={resetFilters}>
                <Text style={styles.resetBtnText}>Clear All Filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredParts}
              renderItem={renderPartItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}

      {/* Bottom Navigation Bar when search results are shown */}
      {isSearchActive && (
        <View
          style={[
            styles.bottomNavBar,
            {
              paddingBottom: insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 16 : 8),
              height: 58 + (insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 16 : 8)),
            },
          ]}
        >
          {/* 1. Home Tab */}
          <TouchableOpacity
            style={styles.bottomTabItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('MainTabs', { screen: 'HomeTab' })}
          >
            <Icon source="home-outline" size={24} color="#64748B" />
            <Text style={styles.bottomTabLabel}>Home</Text>
          </TouchableOpacity>

          {/* 2. Chats Tab */}
          <TouchableOpacity
            style={styles.bottomTabItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('MainTabs', { screen: 'ChatsTab' })}
          >
            <View style={{ position: 'relative' }}>
              <Icon source="comment-processing-outline" size={23} color="#64748B" />
              {unreadCounts.unreadChats > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>
                    {unreadCounts.unreadChats > 99 ? '99+' : unreadCounts.unreadChats}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.bottomTabLabel}>Chats</Text>
          </TouchableOpacity>

          {/* 3. SELL Button (Elevated) */}
          <ScalePressable
            scaleTo={0.92}
            style={styles.customSellButtonTouch}
            onPress={() => navigation.navigate('SellPart')}
          >
            <View style={styles.sellButtonCircle}>
              <Icon source="plus" color="#FFFFFF" size={30} />
            </View>
            <Text style={styles.sellButtonLabel}>SELL</Text>
          </ScalePressable>

          {/* 4. My Ads Tab */}
          <TouchableOpacity
            style={styles.bottomTabItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('MainTabs', { screen: 'MyAdsTab' })}
          >
            <Icon source="clipboard-text-outline" size={23} color="#64748B" />
            <Text style={styles.bottomTabLabel}>My Ads</Text>
          </TouchableOpacity>

          {/* 5. Profile Tab */}
          <TouchableOpacity
            style={styles.bottomTabItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('MainTabs', { screen: 'ProfileTab' })}
          >
            <UserAvatar size={24} borderWidth={1} borderColor="#94A3B8" />
            <Text style={styles.bottomTabLabel}>Profile</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ================= MODERN TWO-COLUMN FILTER & SORT MODAL ================= */}
      <FilterAndSortModal
        visible={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        initialTab={filterModalInitialTab}
        minPrice={minPrice}
        maxPrice={maxPrice}
        selectedBrand={selectedBrand}
        selectedCategory={selectedCategory}
        selectedCondition={selectedCondition}
        selectedLocation={selectedLocation}
        sortBy={sortBy}
        categoriesList={dynamicCategoriesList}
        brandsList={dynamicBrandsList}
        locationsList={POPULAR_STATES}
        conditionsList={CONDITIONS}
        onOpenLocationScreen={() => {
          navigation.navigate('LocationSelectScreen', {
            returnScreen: 'Search',
            currentCity: selectedLocation,
          });
        }}
        onApply={handleApplyFilters}
        onReset={resetFilters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  // Top Unified Bar - Matching Home Screen Royal Blue
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#0066FF',
    gap: 10,
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  backBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  filterBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0066FF',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Discovery / Landing Layout
  discoveryScroll: {
    flex: 1,
  },
  discoveryScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 36,
  },

  // 1. Quick 2x2 Filter Tiles
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  tileCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  tileIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  tileTextContainer: {
    flex: 1,
  },
  tileTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  tileSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },

  // 2. Recent Searches
  recentSection: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  clearAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0066FF',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0066FF',
  },
  recentListContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  recentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  recentItemTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recentItemText: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  recentItemDeleteBtn: {
    padding: 4,
  },

  // 3. Popular Categories
  popularCatSection: {
    marginBottom: 20,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  categoryCard: {
    width: '23%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryImageContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryImage: {
    width: 44,
    height: 44,
  },
  categoryIconFallback: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryCardTitle: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 13,
  },

  // LIVE RESULTS VIEW
  resultsContainer: {
    flex: 1,
  },
  activeChipsContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  activeChipsScroll: {
    paddingHorizontal: 12,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  activeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0066FF',
  },
  clearAllFiltersBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  clearAllFiltersText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  resultCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  sortBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  sortBtnActive: {
    backgroundColor: '#0066FF',
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  sortBtnTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 28,
  },

  // Modern Reference Card (Horizontal Layout: Left Image, Right Details)
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  imageContainer: {
    position: 'relative',
    width: 120,
    height: 126,
    backgroundColor: '#E2E8F0',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  badgeContainer: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeNew: {
    backgroundColor: '#16A34A',
  },
  badgeUsed: {
    backgroundColor: '#D97706',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  imageCountBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  imageCountText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  cardContent: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0066FF',
  },
  favCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 17,
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginBottom: 4,
  },
  tagRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  brandTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
    maxWidth: '90%',
  },
  brandTagText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  locationCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
    marginRight: 6,
  },
  locationText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  timeCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  timeText: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  resetBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 12,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  modalScroll: {
    maxHeight: 380,
  },
  modalOptionsList: {
    paddingBottom: 12,
  },
  modalOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalOptionItemActive: {
    backgroundColor: '#F0F9FF',
  },
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  modalOptionTextActive: {
    fontWeight: '700',
    color: '#0284C7',
  },
  modalOptionSubtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  // Full Filter Modal specific styles
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 8,
  },
  filterOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  filterChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalResetBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalResetText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 14,
  },
  modalApplyBtn: {
    flex: 2,
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalApplyText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // Bottom Navigation Bar
  bottomNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    paddingTop: 6,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  bottomTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomTabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  customSellButtonTouch: {
    top: -16,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  sellButtonCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0066FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  sellButtonLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0066FF',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    lineHeight: Platform.OS === 'android' ? 14 : undefined,
  },
});
