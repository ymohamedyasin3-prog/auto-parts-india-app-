import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type FilterTabType = 'budget' | 'brand' | 'condition' | 'location' | 'sort' | 'category';

export interface FilterValues {
  minPrice: string;
  maxPrice: string;
  selectedBrand: string;
  selectedCategory: string;
  selectedCondition: string;
  selectedLocation: string;
  sortBy: 'newest' | 'price_low' | 'price_high';
}

interface FilterAndSortModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: FilterTabType;
  
  // Current values
  minPrice: string;
  maxPrice: string;
  selectedBrand: string;
  selectedCategory: string;
  selectedCondition: string;
  selectedLocation: string;
  sortBy: 'newest' | 'price_low' | 'price_high';
  
  // Options
  categoriesList: Array<{ id?: string; name: string; icon?: string; color?: string; bg?: string; description?: string }>;
  brandsList: string[];
  locationsList: string[];
  conditionsList: string[];
  onOpenLocationScreen?: () => void;
  
  onApply: (filters: FilterValues) => void;
  onReset: () => void;
}

export default function FilterAndSortModal({
  visible,
  onClose,
  initialTab = 'budget',
  minPrice,
  maxPrice,
  selectedBrand,
  selectedCategory,
  selectedCondition,
  selectedLocation,
  sortBy,
  categoriesList,
  brandsList,
  locationsList,
  conditionsList,
  onOpenLocationScreen,
  onApply,
  onReset,
}: FilterAndSortModalProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<FilterTabType>(initialTab);

  // Local Draft States
  const [draftMinPrice, setDraftMinPrice] = useState(minPrice);
  const [draftMaxPrice, setDraftMaxPrice] = useState(maxPrice);
  const [draftBrand, setDraftBrand] = useState(selectedBrand);
  const [draftCategory, setDraftCategory] = useState(selectedCategory);
  const [draftCondition, setDraftCondition] = useState(selectedCondition);
  const [draftLocation, setDraftLocation] = useState(selectedLocation);
  const [draftSortBy, setDraftSortBy] = useState(sortBy);

  // Search filter inside Brand tab
  const [brandSearchQuery, setBrandSearchQuery] = useState('');

  // Synchronize draft states when modal opens
  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
      setDraftMinPrice(minPrice);
      setDraftMaxPrice(maxPrice);
      setDraftBrand(selectedBrand);
      setDraftCategory(selectedCategory);
      setDraftCondition(selectedCondition);
      setDraftLocation(selectedLocation);
      setDraftSortBy(sortBy);
      setBrandSearchQuery('');
    }
  }, [visible, initialTab, minPrice, maxPrice, selectedBrand, selectedCategory, selectedCondition, selectedLocation, sortBy]);

  // Filtered brands for brand tab
  const filteredBrands = useMemo(() => {
    if (!brandSearchQuery.trim()) return brandsList;
    const q = brandSearchQuery.toLowerCase().trim();
    return brandsList.filter((b) => b.toLowerCase().includes(q));
  }, [brandsList, brandSearchQuery]);

  // Tab definitions
  const tabs: Array<{ id: FilterTabType; label: string; icon: string; hasActiveFilter: boolean }> = [
    {
      id: 'budget',
      label: 'By Budget',
      icon: 'currency-inr',
      hasActiveFilter: !!draftMinPrice.trim() || !!draftMaxPrice.trim(),
    },
    {
      id: 'brand',
      label: 'Car Brand',
      icon: 'car',
      hasActiveFilter: draftBrand !== 'All Brands' && draftBrand !== 'All',
    },
    {
      id: 'condition',
      label: 'Condition',
      icon: 'package-variant-closed',
      hasActiveFilter: draftCondition !== 'All Conditions',
    },
    {
      id: 'location',
      label: 'Location',
      icon: 'map-marker-outline',
      hasActiveFilter: draftLocation !== 'All India' && draftLocation !== 'All States',
    },
    {
      id: 'sort',
      label: 'Sort By',
      icon: 'swap-vertical',
      hasActiveFilter: draftSortBy !== 'newest',
    },
    {
      id: 'category',
      label: 'Category',
      icon: 'shape-outline',
      hasActiveFilter: draftCategory !== 'All Categories' && draftCategory !== 'All',
    },
  ];

  const handleClearAll = () => {
    setDraftMinPrice('');
    setDraftMaxPrice('');
    setDraftBrand('All Brands');
    setDraftCategory('All Categories');
    setDraftCondition('All Conditions');
    setDraftLocation('All India');
    setDraftSortBy('newest');
    setBrandSearchQuery('');
  };

  const handleApply = () => {
    onApply({
      minPrice: draftMinPrice.trim(),
      maxPrice: draftMaxPrice.trim(),
      selectedBrand: draftBrand,
      selectedCategory: draftCategory,
      selectedCondition: draftCondition,
      selectedLocation: draftLocation,
      sortBy: draftSortBy,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={onClose}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.sheetContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }]}
        >
          {/* Top Drag Indicator */}
          <View style={styles.dragPill} />

          {/* Modal Header */}
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Filters & Sort</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Icon source="close" size={24} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {/* Main Two-Column Split Body */}
          <View style={styles.splitBody}>
            {/* Left Column: Sidebar Navigation */}
            <View style={styles.leftSidebar}>
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <TouchableOpacity
                      key={tab.id}
                      style={[styles.tabItem, isActive && styles.tabItemActive]}
                      onPress={() => setActiveTab(tab.id)}
                      activeOpacity={0.8}
                    >
                      {isActive && <View style={styles.activeTabIndicator} />}
                      <Icon
                        source={tab.icon}
                        size={20}
                        color={isActive ? '#1565FF' : '#475569'}
                      />
                      <Text
                        style={[
                          styles.tabItemText,
                          isActive && styles.tabItemTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {tab.label}
                      </Text>
                      {tab.hasActiveFilter && !isActive && (
                        <View style={styles.filterActiveDot} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Right Column: Tab Content Details */}
            <View style={styles.rightContentPanel}>
              {/* TAB 1: BY BUDGET */}
              {activeTab === 'budget' && (
                <ScrollView showsVerticalScrollIndicator={false} style={styles.contentScroll} keyboardShouldPersistTaps="handled">
                  <Text style={styles.contentHeading}>By Budget</Text>
                  <Text style={styles.contentSubheading}>Enter your price range (₹)</Text>

                  <View style={styles.priceInputRow}>
                    <View style={styles.priceInputBox}>
                      <TextInput
                        style={styles.priceTextInput}
                        placeholder="Min Price (₹)"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        value={draftMinPrice}
                        onChangeText={setDraftMinPrice}
                      />
                    </View>
                    <Text style={styles.priceDash}>–</Text>
                    <View style={styles.priceInputBox}>
                      <TextInput
                        style={styles.priceTextInput}
                        placeholder="Max Price (₹)"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        value={draftMaxPrice}
                        onChangeText={setDraftMaxPrice}
                      />
                    </View>
                  </View>
                </ScrollView>
              )}

              {/* TAB 2: CAR BRAND */}
              {activeTab === 'brand' && (
                <View style={{ flex: 1 }}>
                  <Text style={styles.contentHeading}>Car Brand</Text>
                  <Text style={styles.contentSubheading}>Filter by vehicle manufacturer</Text>

                  <View style={styles.brandSearchBox}>
                    <Icon source="magnify" size={18} color="#64748B" />
                    <TextInput
                      style={styles.brandSearchInput}
                      placeholder="Search brands (e.g. Maruti, Tata)..."
                      placeholderTextColor="#94A3B8"
                      value={brandSearchQuery}
                      onChangeText={setBrandSearchQuery}
                      autoCapitalize="none"
                    />
                    {brandSearchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setBrandSearchQuery('')}>
                        <Icon source="close-circle" size={16} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} style={styles.optionsListScroll}>
                    {filteredBrands.map((brand) => {
                      const isSelected = draftBrand === brand;
                      return (
                        <TouchableOpacity
                          key={brand}
                          style={[styles.radioRow, isSelected && styles.radioRowActive]}
                          onPress={() => setDraftBrand(brand)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.radioTextWrap}>
                            <Icon
                              source="car"
                              size={18}
                              color={isSelected ? '#1565FF' : '#64748B'}
                            />
                            <Text style={[styles.radioLabel, isSelected && styles.radioLabelActive]}>
                              {brand}
                            </Text>
                          </View>
                          <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                            {isSelected && <View style={styles.radioInnerDot} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* TAB 3: CONDITION */}
              {activeTab === 'condition' && (
                <ScrollView showsVerticalScrollIndicator={false} style={styles.contentScroll}>
                  <Text style={styles.contentHeading}>Condition</Text>
                  <Text style={styles.contentSubheading}>Select part quality & condition</Text>

                  {conditionsList.map((cond) => {
                    const isSelected = draftCondition === cond;
                    return (
                      <TouchableOpacity
                        key={cond}
                        style={[styles.radioRow, isSelected && styles.radioRowActive]}
                        onPress={() => setDraftCondition(cond)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.radioTextWrap}>
                          <Icon
                            source={cond === 'New' ? 'sparkles' : 'package-variant-closed'}
                            size={18}
                            color={isSelected ? '#1565FF' : '#64748B'}
                          />
                          <Text style={[styles.radioLabel, isSelected && styles.radioLabelActive]}>
                            {cond}
                          </Text>
                        </View>
                        <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                          {isSelected && <View style={styles.radioInnerDot} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* TAB 4: LOCATION */}
              {activeTab === 'location' && (
                <ScrollView showsVerticalScrollIndicator={false} style={styles.contentScroll}>
                  <Text style={styles.contentHeading}>Location</Text>
                  <Text style={styles.contentSubheading}>Filter by state, district or GPS</Text>

                  {/* Open dedicated location picker screen */}
                  {onOpenLocationScreen && (
                    <TouchableOpacity
                      style={styles.openLocationScreenBtn}
                      activeOpacity={0.8}
                      onPress={() => {
                        onClose();
                        onOpenLocationScreen();
                      }}
                    >
                      <View style={styles.openLocationScreenIconCircle}>
                        <Icon source="crosshairs-gps" size={20} color="#FFFFFF" />
                      </View>
                      <View style={styles.openLocationScreenTextContainer}>
                        <Text style={styles.openLocationScreenTitle}>Choose from Location Screen</Text>
                        <Text style={styles.openLocationScreenSub}>Browse all Indian states, districts & GPS</Text>
                      </View>
                      <Icon source="chevron-right" size={20} color="#1565FF" />
                    </TouchableOpacity>
                  )}

                  <Text style={styles.locationListHeader}>Quick State Selection</Text>

                  {locationsList.map((loc) => {
                    const isSelected = draftLocation === loc;
                    return (
                      <TouchableOpacity
                        key={loc}
                        style={[styles.radioRow, isSelected && styles.radioRowActive]}
                        onPress={() => setDraftLocation(loc)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.radioTextWrap}>
                          <Icon
                            source="map-marker-outline"
                            size={18}
                            color={isSelected ? '#1565FF' : '#64748B'}
                          />
                          <Text style={[styles.radioLabel, isSelected && styles.radioLabelActive]}>
                            {loc}
                          </Text>
                        </View>
                        <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                          {isSelected && <View style={styles.radioInnerDot} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* TAB 5: SORT BY */}
              {activeTab === 'sort' && (
                <ScrollView showsVerticalScrollIndicator={false} style={styles.contentScroll}>
                  <Text style={styles.contentHeading}>Sort By</Text>
                  <Text style={styles.contentSubheading}>Order search results</Text>

                  {[
                    { id: 'newest', label: 'Latest (Newest First)', icon: 'clock-outline' },
                    { id: 'price_low', label: 'Price: Low to High', icon: 'sort-numeric-ascending' },
                    { id: 'price_high', label: 'Price: High to Low', icon: 'sort-numeric-descending' },
                  ].map((s) => {
                    const isSelected = draftSortBy === s.id;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.radioRow, isSelected && styles.radioRowActive]}
                        onPress={() => setDraftSortBy(s.id as any)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.radioTextWrap}>
                          <Icon
                            source={s.icon}
                            size={18}
                            color={isSelected ? '#1565FF' : '#64748B'}
                          />
                          <Text style={[styles.radioLabel, isSelected && styles.radioLabelActive]}>
                            {s.label}
                          </Text>
                        </View>
                        <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                          {isSelected && <View style={styles.radioInnerDot} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* TAB 6: CATEGORY */}
              {activeTab === 'category' && (
                <ScrollView showsVerticalScrollIndicator={false} style={styles.contentScroll}>
                  <Text style={styles.contentHeading}>Category</Text>
                  <Text style={styles.contentSubheading}>Filter by spare part category</Text>

                  {/* All Categories Option */}
                  <TouchableOpacity
                    style={[styles.radioRow, draftCategory === 'All Categories' && styles.radioRowActive]}
                    onPress={() => setDraftCategory('All Categories')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.radioTextWrap}>
                      <Icon
                        source="view-grid-outline"
                        size={18}
                        color={draftCategory === 'All Categories' ? '#1565FF' : '#64748B'}
                      />
                      <Text style={[styles.radioLabel, draftCategory === 'All Categories' && styles.radioLabelActive]}>
                        All Categories
                      </Text>
                    </View>
                    <View style={[styles.radioCircle, draftCategory === 'All Categories' && styles.radioCircleActive]}>
                      {draftCategory === 'All Categories' && <View style={styles.radioInnerDot} />}
                    </View>
                  </TouchableOpacity>

                  {categoriesList.map((cat) => {
                    const isSelected = draftCategory === cat.name;
                    return (
                      <TouchableOpacity
                        key={cat.id || cat.name}
                        style={[styles.radioRow, isSelected && styles.radioRowActive]}
                        onPress={() => setDraftCategory(cat.name)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.radioTextWrap}>
                          <Icon
                            source={cat.icon || 'car-cog'}
                            size={18}
                            color={isSelected ? '#1565FF' : '#64748B'}
                          />
                          <Text style={[styles.radioLabel, isSelected && styles.radioLabelActive]}>
                            {cat.name}
                          </Text>
                        </View>
                        <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                          {isSelected && <View style={styles.radioInnerDot} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>

          {/* Bottom Action Buttons */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.clearAllBtn}
              onPress={handleClearAll}
              activeOpacity={0.8}
            >
              <Text style={styles.clearAllBtnText}>Clear all</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={handleApply}
              activeOpacity={0.85}
            >
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '84%',
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 16,
  },
  dragPill: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  splitBody: {
    flex: 1,
    flexDirection: 'row',
  },
  // Left Sidebar
  leftSidebar: {
    width: '36%',
    backgroundColor: '#F8FAFC',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 14,
    gap: 10,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabItemActive: {
    backgroundColor: '#EFF6FF',
  },
  activeTabIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#1565FF',
  },
  tabItemText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
    flex: 1,
  },
  tabItemTextActive: {
    fontWeight: '700',
    color: '#1565FF',
  },
  filterActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1565FF',
  },

  // Right Content Panel
  rightContentPanel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  contentScroll: {
    flex: 1,
  },
  contentHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  contentSubheading: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 16,
  },

  // Budget Inputs
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  priceInputBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  priceTextInput: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
    padding: 0,
  },
  priceDash: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: 'bold',
  },

  // Brand Search Box
  brandSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    gap: 8,
    marginBottom: 12,
  },
  brandSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  optionsListScroll: {
    flex: 1,
  },

  // Radio Rows
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    minHeight: 46,
    backgroundColor: '#FFFFFF',
  },
  radioRowActive: {
    backgroundColor: '#EFF6FF',
  },
  radioTextWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 10,
  },
  radioLabel: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#334155',
    flex: 1,
  },
  radioLabelActive: {
    fontWeight: '700',
    color: '#1565FF',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#1565FF',
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1565FF',
  },

  // Open Location Screen Action Card
  openLocationScreenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  openLocationScreenIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1565FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openLocationScreenTextContainer: {
    flex: 1,
  },
  openLocationScreenTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1565FF',
  },
  openLocationScreenSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  locationListHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  // Bottom Footer
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  clearAllBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1565FF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearAllBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1565FF',
  },
  applyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1565FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
