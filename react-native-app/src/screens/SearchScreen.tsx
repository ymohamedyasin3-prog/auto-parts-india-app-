import React, { useState, useMemo } from 'react';
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
  StatusBar
} from 'react-native';
import { Icon, Surface, Chip, useTheme, ActivityIndicator, Appbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { INITIAL_SPARE_PARTS } from '../data/mockData';
import { getFirebaseFirestore } from '../services/firebase';
import { useFavorites } from '../services/favorites';
import { matchesCategoryFilter } from '../utils/categoryMatcher';
import { matchPartSearch, parseCreatedAt } from '../utils/searchHelper';
import { getOptimizedImageUrl } from '../services/cloudinary';

export default function SearchScreen({ navigation, route, user }: any) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const [searchQuery, setSearchQuery] = useState(route?.params?.initialQuery || '');
  const [selectedCategory, setSelectedCategory] = useState(route?.params?.initialCategory || route?.params?.selectedCategory || 'All Categories');
  const [selectedBrand, setSelectedBrand] = useState(route?.params?.initialBrand || 'All Brands');
  const [selectedCondition, setSelectedCondition] = useState('All Conditions');
  const [selectedState, setSelectedState] = useState('All States');
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high'>('newest');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [parts, setParts] = useState<any[]>(INITIAL_SPARE_PARTS);
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { favorites, toggleFavorite } = useFavorites();

  const defaultCategories = [
    'All Categories',
    'Engine & Mechanical',
    'Body & Exterior',
    'Lights & Electricals',
    'Suspension & Brakes',
    'Interior & Wheels',
    'Wiring & Harnesses'
  ];

  // Fetch top categories dynamically from Firestore
  React.useEffect(() => {
    try {
      const db = getFirebaseFirestore();
      if (db && typeof db.collection === 'function') {
        const unsub = db.collection('topCategories')
          .orderBy('order', 'asc')
          .onSnapshot((snapshot: any) => {
            const names: string[] = [];
            snapshot.forEach((doc: any) => {
              const data = doc.data();
              if (data.isActive !== false && data.name) {
                names.push(data.name);
              }
            });
            setDynamicCategories(names);
          }, () => {});
        return () => unsub?.();
      }
    } catch (_) {}
  }, []);

  const categories = useMemo(() => {
    const combined = ['All Categories', ...dynamicCategories];
    defaultCategories.forEach((cat) => {
      if (!combined.includes(cat)) {
        combined.push(cat);
      }
    });
    return Array.from(new Set(combined));
  }, [dynamicCategories]);

  const popularBrands = [
    'All Brands',
    'Maruti Suzuki',
    'Hyundai',
    'Tata',
    'Mahindra',
    'Toyota',
    'Honda',
    'Kia',
    'Volkswagen',
    'Ford',
    'Renault',
    'Nissan',
    'Skoda',
    'MG Motor',
    'BMW',
    'Mercedes-Benz',
    'Audi'
  ];

  const conditions = ['All Conditions', 'New', 'Used'];
  const states = [
    'All States',
    'Tamil Nadu',
    'Maharashtra',
    'Karnataka',
    'Delhi',
    'Telangana',
    'Kerala',
    'Gujarat',
    'Rajasthan',
    'Punjab',
    'Uttar Pradesh'
  ];

  React.useEffect(() => {
    try {
      const db = getFirebaseFirestore();
      if (db && typeof db.collection === 'function') {
        const unsub = db.collection('spareParts').onSnapshot((snapshot: any) => {
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
        }, () => {
          setParts((current) => current.length > 0 ? current : INITIAL_SPARE_PARTS);
        });
        return () => unsub?.();
      }
    } catch (_) {
      setParts((current) => current.length > 0 ? current : INITIAL_SPARE_PARTS);
    }
  }, []);

  const activeFiltersCount = [
    selectedCategory !== 'All Categories',
    selectedBrand !== 'All Brands',
    selectedCondition !== 'All Conditions',
    selectedState !== 'All States',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All Categories');
    setSelectedBrand('All Brands');
    setSelectedCondition('All Conditions');
    setSelectedState('All States');
    setSortBy('newest');
  };

  const filteredParts = useMemo(() => {
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
      if (selectedState !== 'All States') {
        const stateLower = selectedState.toLowerCase();
        const matchesState = 
          (part.state && part.state.toLowerCase().includes(stateLower)) ||
          (part.location && part.location.toLowerCase().includes(stateLower)) ||
          (part.district && part.district.toLowerCase().includes(stateLower));
        if (!matchesState) {
          continue;
        }
      }

      scoredList.push({ part, score: searchScore });
    }

    return scoredList.sort((a, b) => {
      // If user typed a search query and hasn't explicitly chosen price sort, prioritize search relevance!
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
    }).map(item => item.part);
  }, [parts, searchQuery, selectedCategory, selectedBrand, selectedCondition, selectedState, sortBy]);

  const renderPartItem = ({ item }: { item: any }) => {
    const isFav = favorites.includes(item.id);
    const primaryUri = item.imageUrl || item.images?.[0] || item.imageUrls?.[0] || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=400';
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        delayPressIn={0}
        onPress={() => navigation.navigate('ProductDetail', { part: item })}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: primaryUri }}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <View style={[
            styles.badgeContainer,
            (item.condition || '').toLowerCase().includes('new') ? styles.badgeNew : styles.badgeUsed
          ]}>
            <Text style={styles.badgeText}>
              {(item.condition || '').toLowerCase().includes('new') ? '✨ NEW' : 'USED'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.favBtn}
            activeOpacity={0.7}
            delayPressIn={0}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={(e) => {
              e.stopPropagation();
              toggleFavorite(item.id);
            }}
          >
            <View style={styles.favoriteCircle}>
              <Icon
                source={isFav ? 'heart' : 'heart-outline'}
                color={isFav ? '#EF4444' : '#334155'}
                size={18}
              />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardPrice}>₹{(item.price || 0).toLocaleString('en-IN')}</Text>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          
          <View style={styles.tagRow}>
            <View style={styles.brandTag}>
              <Text style={styles.brandTagText}>{item.carBrand} {item.carModel}</Text>
            </View>
          </View>

          <View style={styles.locationRow}>
            <Icon source="map-marker" size={13} color="#64748B" />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.location || item.state || 'All India'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1220" />
      
      {/* Top Search Header */}
      <View style={styles.header}>
        <Appbar.BackAction color="#FFFFFF" onPress={() => navigation.goBack()} />
        <View style={styles.searchBarContainer}>
          <Icon source="magnify" color="#94A3B8" size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search spare parts, brands, models..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon source="close-circle" color="#94A3B8" size={18} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, activeFiltersCount > 0 && styles.filterBtnActive]}
          onPress={() => setIsFilterModalOpen(true)}
        >
          <Icon
            source="tune-variant"
            color={activeFiltersCount > 0 ? '#FFFFFF' : '#0F172A'}
            size={20}
          />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Categories quick horizontal pill list */}
      <View style={styles.categoriesBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.pillsScroll}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.pill, isSelected && styles.pillActive]}
                activeOpacity={0.75}
                delayPressIn={0}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                  {cat === 'All Categories' ? 'All Categories' : cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results Count & Sort Bar */}
      <View style={styles.subHeader}>
        <Text style={styles.resultCountText}>
          {filteredParts.length} {filteredParts.length === 1 ? 'part found' : 'parts found'}
        </Text>
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort:</Text>
          <TouchableOpacity
            style={[styles.sortBtn, sortBy === 'newest' && styles.sortBtnActive]}
            activeOpacity={0.75}
            delayPressIn={0}
            onPress={() => setSortBy('newest')}
          >
            <Text style={[styles.sortBtnText, sortBy === 'newest' && styles.sortBtnTextActive]}>Latest</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortBtn, sortBy === 'price_low' && styles.sortBtnActive]}
            activeOpacity={0.75}
            delayPressIn={0}
            onPress={() => setSortBy('price_low')}
          >
            <Text style={[styles.sortBtnText, sortBy === 'price_low' && styles.sortBtnTextActive]}>Price: Low</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortBtn, sortBy === 'price_high' && styles.sortBtnActive]}
            activeOpacity={0.75}
            delayPressIn={0}
            onPress={() => setSortBy('price_high')}
          >
            <Text style={[styles.sortBtnText, sortBy === 'price_high' && styles.sortBtnTextActive]}>High</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Parts List */}
      {filteredParts.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon source="car-off" size={48} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No matching spare parts</Text>
          <Text style={styles.emptySubtitle}>Try changing your search terms or filters</Text>
          <TouchableOpacity style={styles.resetBtn} activeOpacity={0.75} delayPressIn={0} onPress={resetFilters}>
            <Text style={styles.resetBtnText}>Reset All Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredParts}
          renderItem={renderPartItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={isFilterModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFilterModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Spare Parts</Text>
              <TouchableOpacity onPress={() => setIsFilterModalOpen(false)}>
                <Icon source="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {/* Brand Section */}
              <Text style={styles.filterSectionTitle}>Car Brand</Text>
              <View style={styles.filterOptionsGrid}>
                {popularBrands.map((brand) => (
                  <TouchableOpacity
                    key={brand}
                    style={[styles.filterChip, selectedBrand === brand && styles.filterChipActive]}
                    onPress={() => setSelectedBrand(brand)}
                  >
                    <Text style={[styles.filterChipText, selectedBrand === brand && styles.filterChipTextActive]}>
                      {brand}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Condition Section */}
              <Text style={styles.filterSectionTitle}>Condition</Text>
              <View style={styles.filterOptionsGrid}>
                {conditions.map((cond) => (
                  <TouchableOpacity
                    key={cond}
                    style={[styles.filterChip, selectedCondition === cond && styles.filterChipActive]}
                    onPress={() => setSelectedCondition(cond)}
                  >
                    <Text style={[styles.filterChipText, selectedCondition === cond && styles.filterChipTextActive]}>
                      {cond}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Location State Section */}
              <Text style={styles.filterSectionTitle}>Location / State</Text>
              <View style={styles.filterOptionsGrid}>
                {states.map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.filterChip, selectedState === st && styles.filterChipActive]}
                    onPress={() => setSelectedState(st)}
                  >
                    <Text style={[styles.filterChipText, selectedState === st && styles.filterChipTextActive]}>
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalResetBtn} onPress={resetFilters}>
                <Text style={styles.modalResetText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={() => setIsFilterModalOpen(false)}
              >
                <Text style={styles.modalApplyText}>Apply Filters ({filteredParts.length})</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0B1220',
    gap: 8,
  },
  backBtn: {
    padding: 6,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 0,
  },
  filterBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: '#1565FF',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  categoriesBar: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  pillsScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
  },
  pillActive: {
    backgroundColor: '#1565FF',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
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
    backgroundColor: '#1565FF',
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
    paddingHorizontal: 8,
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 4,
    maxWidth: '48.5%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 134,
    backgroundColor: '#F1F5F9',
    position: 'relative',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeNew: {
    backgroundColor: '#10B981',
  },
  badgeUsed: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  favBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 10,
  },
  favoriteCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2.5,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardContent: {
    padding: 10,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1565FF',
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 17,
    minHeight: 34,
  },
  tagRow: {
    marginTop: 6,
  },
  brandTag: {
    backgroundColor: '#EFF6FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  brandTagText: {
    color: '#1565FF',
    fontSize: 10,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 2,
  },
  locationText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  resetBtn: {
    marginTop: 16,
    backgroundColor: '#1565FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  modalScroll: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 12,
    marginBottom: 8,
  },
  filterOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
    backgroundColor: '#EFF6FF',
    borderColor: '#1565FF',
  },
  filterChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#1565FF',
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  modalResetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalResetText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
  modalApplyBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1565FF',
    alignItems: 'center',
  },
  modalApplyText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
