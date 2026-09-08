import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Icon } from 'react-native-paper';
import {
  INDIAN_STATES_AND_DISTRICTS,
  POPULAR_CITIES,
  searchIndianLocations,
  LocationSearchItem,
} from '../data/indianLocations';
import {
  getCurrentLocation,
  reverseGeocodeLatLng,
  saveUserLocation,
  getUserSavedLocation,
} from '../services/location';
import { getFirebaseFirestore } from '../services/firebase';

interface LocationSelectScreenProps {
  navigation: any;
  route: any;
}

const POPULAR_CITY_CHIPS = [
  { name: 'Chennai', state: 'Tamil Nadu' },
  { name: 'Coimbatore', state: 'Tamil Nadu' },
  { name: 'Bengaluru', state: 'Karnataka' },
  { name: 'Mumbai', state: 'Maharashtra' },
  { name: 'Delhi', state: 'Delhi' },
  { name: 'Hyderabad', state: 'Telangana' },
  { name: 'Pune', state: 'Maharashtra' },
  { name: 'Kolkata', state: 'West Bengal' },
  { name: 'Ahmedabad', state: 'Gujarat' },
  { name: 'Madurai', state: 'Tamil Nadu' },
  { name: 'Trichy', state: 'Tamil Nadu' },
  { name: 'Salem', state: 'Tamil Nadu' },
  { name: 'Karur', state: 'Tamil Nadu' },
  { name: 'Kochi', state: 'Kerala' },
  { name: 'Jaipur', state: 'Rajasthan' },
  { name: 'Lucknow', state: 'Uttar Pradesh' },
];

export default function LocationSelectScreen({ navigation, route }: LocationSelectScreenProps) {
  const currentCity = route?.params?.currentCity || 'All India';
  const [selectedCity, setSelectedCity] = useState<string>(currentCity);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDetectingGPS, setIsDetectingGPS] = useState<boolean>(false);
  const [expandedState, setExpandedState] = useState<string | null>(null);
  const [adminLocations, setAdminLocations] = useState<string[]>([]);

  // Load saved location on mount
  React.useEffect(() => {
    getUserSavedLocation().then((saved) => {
      if (saved && saved.city) {
        setSelectedCity(saved.city);
      }
    });

    const db = getFirebaseFirestore();
    if (db && typeof db.doc === 'function') {
      db.doc('config/locations').get().then((docSnap: any) => {
        if (docSnap && docSnap.exists) {
          const data = typeof docSnap.data === 'function' ? docSnap.data() : docSnap.data;
          if (data && Array.isArray(data.list)) {
            setAdminLocations(data.list);
          }
        }
      }).catch((e: any) => console.warn('Failed to load admin locations', e));
    }
  }, []);

  // Handle selecting a location
  const handleSelect = useCallback(
    async (
      name: string,
      details?: { state?: string; district?: string; isGPS?: boolean; lat?: number; lng?: number }
    ) => {
      const cityToSave = name === 'All India' ? 'All India' : name;
      setSelectedCity(cityToSave);

      await saveUserLocation({
        city: cityToSave,
        state: details?.state,
        district: details?.district,
        isGPS: details?.isGPS ?? false,
        lat: details?.lat,
        lng: details?.lng,
      });

      // Navigate back and pass param to Home
      navigation.navigate('MainTabs', {
        screen: 'HomeTab',
        params: { selectedCity: cityToSave },
      });
    },
    [navigation]
  );

  // Handle GPS detection
  const handleGPSDetect = async () => {
    setIsDetectingGPS(true);
    try {
      const coords = await getCurrentLocation();
      if (!coords) {
        Alert.alert(
          'Location Permission Required',
          'Please allow location access in your device settings to auto-detect your location.'
        );
        return;
      }

      const geo = await reverseGeocodeLatLng(coords.latitude, coords.longitude);
      const chosenName = geo.district || geo.area || geo.state || 'Chennai';

      await handleSelect(chosenName, {
        state: geo.state,
        district: geo.district,
        isGPS: true,
        lat: coords.latitude,
        lng: coords.longitude,
      });
    } catch (err: any) {
      Alert.alert(
        'GPS Detection Notice',
        'Could not detect precise location. Please search and select your district or city manually.'
      );
    } finally {
      setIsDetectingGPS(false);
    }
  };

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const baseResults = searchIndianLocations(searchQuery);
    
    // Add matching admin locations
    const cleanQuery = searchQuery.trim().toLowerCase();
    const adminMatches = adminLocations
      .filter((loc) => loc.toLowerCase().includes(cleanQuery))
      .map((loc) => ({
        id: `admin_${loc.toLowerCase().replace(/\s+/g, '_')}`,
        name: loc,
        state: 'Custom Location',
        type: 'city' as const,
        isPopular: true
      }));
      
    // Deduplicate by name
    const existingNames = new Set(baseResults.map(r => r.name.toLowerCase()));
    const uniqueAdminMatches = adminMatches.filter(m => !existingNames.has(m.name.toLowerCase()));
    
    return [...uniqueAdminMatches, ...baseResults];
  }, [searchQuery, adminLocations]);

  // Toggle state expansion
  const toggleStateExpand = (stateName: string) => {
    setExpandedState((prev) => (prev === stateName ? null : stateName));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Icon source="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Select Location</Text>
          <Text style={styles.headerSub}>Find spare parts near your city or district</Text>
        </View>

        {selectedCity !== 'All India' && (
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => handleSelect('All India')}
            activeOpacity={0.7}
          >
            <Text style={styles.resetBtnText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Input Box */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon source="magnify" size={22} color="#0066FF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search district, city or state in India..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="words"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon source="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Conditional Content: Search Results vs Browsing View */}
      {searchQuery.trim().length > 0 ? (
        // Search Results List
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Icon source="map-marker-question-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No matching locations found</Text>
              <Text style={styles.emptySub}>
                Try searching for another Indian district, city, or state name.
              </Text>
              <TouchableOpacity
                style={styles.emptyResetBtn}
                onPress={() => handleSelect('All India')}
              >
                <Text style={styles.emptyResetBtnText}>Select All India</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const isSelected = selectedCity.toLowerCase() === item.name.toLowerCase();
            return (
              <TouchableOpacity
                style={[styles.resultItem, isSelected && styles.resultItemActive]}
                activeOpacity={0.7}
                onPress={() =>
                  handleSelect(item.name, {
                    state: item.state,
                    district: item.type === 'district' ? item.name : undefined,
                  })
                }
              >
                <View style={styles.resultIconBox}>
                  <Icon
                    source={
                      item.type === 'state'
                        ? 'map-outline'
                        : item.type === 'all'
                        ? 'earth'
                        : 'map-marker'
                    }
                    size={20}
                    color={isSelected ? '#0066FF' : '#64748B'}
                  />
                </View>
                <View style={styles.resultTextWrap}>
                  <Text style={[styles.resultTitle, isSelected && styles.resultTitleActive]}>
                    {item.name}
                  </Text>
                  <Text style={styles.resultSub}>
                    {item.type === 'state' ? 'State' : item.state}
                  </Text>
                </View>
                {isSelected && <Icon source="check-circle" size={20} color="#0066FF" />}
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        // Default Browsing List
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Use Current GPS Location Button */}
          <TouchableOpacity
            style={styles.gpsCard}
            onPress={handleGPSDetect}
            disabled={isDetectingGPS}
            activeOpacity={0.8}
          >
            <View style={styles.gpsIconCircle}>
              {isDetectingGPS ? (
                <ActivityIndicator size="small" color="#0066FF" />
              ) : (
                <Icon source="crosshairs-gps" size={22} color="#0066FF" />
              )}
            </View>
            <View style={styles.gpsTextWrap}>
              <Text style={styles.gpsTitle}>Use Current Location</Text>
              <Text style={styles.gpsSub}>
                {isDetectingGPS ? 'Detecting via device GPS...' : 'Auto-detect your location via GPS'}
              </Text>
            </View>
            <Icon source="chevron-right" size={20} color="#94A3B8" />
          </TouchableOpacity>

          {/* 2. All India (Pan-India) Option */}
          <TouchableOpacity
            style={[
              styles.allIndiaCard,
              selectedCity === 'All India' && styles.allIndiaCardActive,
            ]}
            onPress={() => handleSelect('All India')}
            activeOpacity={0.8}
          >
            <View style={styles.allIndiaIconBox}>
              <Icon source="earth" size={24} color="#0066FF" />
            </View>
            <View style={styles.allIndiaTextWrap}>
              <Text style={styles.allIndiaTitle}>All India (Pan India)</Text>
              <Text style={styles.allIndiaSub}>Browse auto parts available across all of India</Text>
            </View>
            {selectedCity === 'All India' ? (
              <Icon source="check-circle" size={22} color="#0066FF" />
            ) : (
              <Icon source="chevron-right" size={20} color="#CBD5E1" />
            )}
          </TouchableOpacity>

          {/* 3. Popular Cities in India */}
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>POPULAR CITIES</Text>
              <Text style={styles.sectionCount}>Top Auto Hubs</Text>
            </View>

            <View style={styles.chipsGrid}>
              {POPULAR_CITY_CHIPS.map((item) => {
                const isSelected = selectedCity.toLowerCase() === item.name.toLowerCase();
                return (
                  <TouchableOpacity
                    key={item.name}
                    style={[styles.cityChip, isSelected && styles.cityChipActive]}
                    onPress={() => handleSelect(item.name, { state: item.state })}
                    activeOpacity={0.75}
                  >
                    <Icon
                      source="map-marker-outline"
                      size={15}
                      color={isSelected ? '#0066FF' : '#64748B'}
                    />
                    <Text style={[styles.cityChipText, isSelected && styles.cityChipTextActive]}>
                      {item.name}
                    </Text>
                    {isSelected && (
                      <View style={{ marginLeft: 2 }}>
                        <Icon source="check" size={14} color="#0066FF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 4. All Indian States & Districts (28 States & 8 UTs) */}
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>EXPLORE BY STATE</Text>
              <Text style={styles.sectionCount}>28 States & 8 UTs</Text>
            </View>

            {INDIAN_STATES_AND_DISTRICTS.map((item) => {
              const isExpanded = expandedState === item.state;
              const isStateSelected = selectedCity.toLowerCase() === item.state.toLowerCase();
              return (
                <View key={item.state} style={styles.stateCard}>
                  <TouchableOpacity
                    style={styles.stateHeader}
                    onPress={() => toggleStateExpand(item.state)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.stateHeaderLeft}>
                      <View style={styles.stateIconCircle}>
                        <Icon source="map-marker-radius" size={18} color="#0066FF" />
                      </View>
                      <View>
                        <Text style={styles.stateName}>{item.state}</Text>
                        <Text style={styles.districtCount}>
                          {item.districts.length} Districts
                        </Text>
                      </View>
                    </View>

                    <View style={styles.stateHeaderRight}>
                      {isStateSelected && (
                        <View style={styles.selectedBadge}>
                          <Text style={styles.selectedBadgeText}>Selected</Text>
                        </View>
                      )}
                      <Icon
                        source={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#64748B"
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Expanded Districts List */}
                  {isExpanded && (
                    <View style={styles.districtListWrap}>
                      {/* Option to select entire state */}
                      <TouchableOpacity
                        style={[
                          styles.districtItem,
                          isStateSelected && styles.districtItemActive,
                        ]}
                        onPress={() => handleSelect(item.state, { state: item.state })}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.districtText,
                            { fontWeight: '700', color: isStateSelected ? '#0066FF' : '#0F172A' },
                          ]}
                        >
                          All of {item.state} (Entire State)
                        </Text>
                        {isStateSelected && <Icon source="check" size={16} color="#0066FF" />}
                      </TouchableOpacity>

                      {/* Districts in this state */}
                      {item.districts.map((dist) => {
                        const isDistrictSelected =
                          selectedCity.toLowerCase() === dist.toLowerCase();
                        return (
                          <TouchableOpacity
                            key={dist}
                            style={[
                              styles.districtItem,
                              isDistrictSelected && styles.districtItemActive,
                            ]}
                            onPress={() =>
                              handleSelect(dist, { state: item.state, district: dist })
                            }
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.districtText,
                                isDistrictSelected && styles.districtTextActive,
                              ]}
                            >
                              {dist}
                            </Text>
                            {isDistrictSelected && (
                              <Icon source="check" size={16} color="#0066FF" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 6,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  resetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0066FF',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    marginLeft: 8,
    marginRight: 4,
    paddingVertical: 0,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  gpsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    marginBottom: 12,
  },
  gpsIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  gpsTextWrap: {
    flex: 1,
  },
  gpsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0066FF',
  },
  gpsSub: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 2,
  },
  allIndiaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  allIndiaCardActive: {
    borderColor: '#0066FF',
    backgroundColor: '#F0F7FF',
  },
  allIndiaIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  allIndiaTextWrap: {
    flex: 1,
  },
  allIndiaTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  allIndiaSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  sectionWrap: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  cityChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#0066FF',
  },
  cityChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  cityChipTextActive: {
    color: '#0066FF',
    fontWeight: '700',
  },
  stateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  stateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  stateHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  stateIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stateName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  districtCount: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  stateHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  selectedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0066FF',
  },
  districtListWrap: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FAFCFF',
  },
  districtItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  districtItemActive: {
    backgroundColor: '#EFF6FF',
  },
  districtText: {
    fontSize: 13,
    color: '#334155',
  },
  districtTextActive: {
    color: '#0066FF',
    fontWeight: '700',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resultItemActive: {
    borderColor: '#0066FF',
    backgroundColor: '#F0F7FF',
  },
  resultIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultTextWrap: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  resultTitleActive: {
    color: '#0066FF',
  },
  resultSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 16,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyResetBtn: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#0066FF',
    borderRadius: 10,
  },
  emptyResetBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
