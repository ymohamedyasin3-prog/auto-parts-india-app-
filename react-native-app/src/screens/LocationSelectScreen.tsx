import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
  searchIndianLocations,
} from '../data/indianLocations';
import {
  getCurrentLocation,
  reverseGeocodeLatLng,
  saveUserLocation,
  getUserSavedLocation,
} from '../services/location';
import { getFirebaseFirestore } from '../services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LocationSelectScreenProps {
  navigation: any;
  route: any;
}

interface StateItem {
  key: string;
  state: string;
  displayName: string;
  districts: string[];
}

export default function LocationSelectScreen({ navigation, route }: LocationSelectScreenProps) {
  const currentCity = route?.params?.currentCity || 'All India';
  const [selectedCity, setSelectedCity] = useState<string>(currentCity);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDetectingGPS, setIsDetectingGPS] = useState<boolean>(false);
  const [selectedStateForDrilldown, setSelectedStateForDrilldown] = useState<StateItem | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const searchScrollViewRef = useRef<FlatList>(null);

  // Whenever drilldown state changes, scroll to top
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [selectedStateForDrilldown, searchQuery]);

  // Load saved user location and sync admin locations
  React.useEffect(() => {
    getUserSavedLocation().then((saved) => {
      if (saved && saved.city) {
        setSelectedCity(saved.city);
      }
    });

    // Immediate local storage fallback for instant reactivity
    AsyncStorage.getItem('taxonomy_locations').then((cachedLocs) => {
      if (cachedLocs) {
        try {
          const parsed = JSON.parse(cachedLocs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAdminTaxonomyLocations(parsed);
          }
        } catch (_) {}
      }
    }).catch(() => {});

    AsyncStorage.getItem('config_locations').then((cachedConfig) => {
      if (cachedConfig) {
        try {
          const parsed = JSON.parse(cachedConfig);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAdminLocations((prev) => Array.from(new Set([...prev, ...parsed])));
          }
        } catch (_) {}
      }
    }).catch(() => {});

    const db = getFirebaseFirestore();
    if (!db) return;

    let unsubConfig = () => {};
    let unsubTaxonomy = () => {};
    let unsubDistricts = () => {};
    let unsubStates = () => {};

    try {
      if (typeof db.doc === 'function') {
        const configRef = db.doc('config/locations');
        if (typeof configRef.onSnapshot === 'function') {
          unsubConfig = configRef.onSnapshot((docSnap: any) => {
            if (docSnap && docSnap.exists) {
              const data = typeof docSnap.data === 'function' ? docSnap.data() : docSnap.data;
              const list = Array.isArray(data?.list) ? data.list : Array.isArray(data?.locations) ? data.locations : [];
              if (list.length > 0) {
                setAdminLocations((prev) => Array.from(new Set([...prev, ...list])));
              }
            }
          });
        }

        const taxRef = db.doc('taxonomy/data');
        if (typeof taxRef.onSnapshot === 'function') {
          unsubTaxonomy = taxRef.onSnapshot((docSnap: any) => {
            if (docSnap && docSnap.exists) {
              const data = typeof docSnap.data === 'function' ? docSnap.data() : docSnap.data;
              if (data?.locations && Array.isArray(data.locations)) {
                setAdminTaxonomyLocations(data.locations);
                const locNames: string[] = [];
                data.locations.forEach((item: any) => {
                  if (item.state && item.state.trim()) locNames.push(item.state.trim());
                  if (Array.isArray(item.districts)) {
                    item.districts.forEach((d: string) => {
                      if (d && d.trim()) locNames.push(d.trim());
                    });
                  }
                });
                setAdminLocations((prev) => Array.from(new Set([...prev, ...locNames])));
              }
            }
          });
        }

        // Also listen to taxonomy/districts
        const distRef = db.doc('taxonomy/districts');
        if (typeof distRef.onSnapshot === 'function') {
          unsubDistricts = distRef.onSnapshot((docSnap: any) => {
            if (docSnap && docSnap.exists) {
              const data = typeof docSnap.data === 'function' ? docSnap.data() : docSnap.data;
              const map = data?.map || {};
              const taxLocs: { state: string; districts: string[] }[] = [];
              Object.keys(map).forEach((st) => {
                taxLocs.push({ state: st, districts: map[st] || [] });
              });
              if (taxLocs.length > 0) {
                setAdminTaxonomyLocations((prev) => {
                  const combined = [...prev];
                  taxLocs.forEach((tl) => {
                    const idx = combined.findIndex((c) => c.state.toLowerCase() === tl.state.toLowerCase());
                    if (idx >= 0) {
                      combined[idx] = {
                        state: combined[idx].state,
                        districts: Array.from(new Set([...(combined[idx].districts || []), ...(tl.districts || [])])),
                      };
                    } else {
                      combined.push(tl);
                    }
                  });
                  return combined;
                });
              }
            }
          });
        }

        // Also listen to taxonomy/states
        const statesRef = db.doc('taxonomy/states');
        if (typeof statesRef.onSnapshot === 'function') {
          unsubStates = statesRef.onSnapshot((docSnap: any) => {
            if (docSnap && docSnap.exists) {
              const data = typeof docSnap.data === 'function' ? docSnap.data() : docSnap.data;
              const list = data?.list || [];
              if (Array.isArray(list) && list.length > 0) {
                setAdminTaxonomyLocations((prev) => {
                  const combined = [...prev];
                  list.forEach((st: string) => {
                    if (!combined.some((c) => c.state.toLowerCase() === st.toLowerCase())) {
                      combined.push({ state: st, districts: [] });
                    }
                  });
                  return combined;
                });
              }
            }
          });
        }
      }
    } catch (e: any) {
      console.warn('Failed to load admin locations', e);
    }

    return () => {
      unsubConfig();
      unsubTaxonomy();
      unsubDistricts();
      unsubStates();
    };
  }, []);

  // Handle selection of a location
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

      if (typeof route?.params?.onSelect === 'function') {
        try {
          route.params.onSelect(cityToSave, details);
        } catch (_) {}
      }

      if (route?.params?.returnScreen) {
        navigation.navigate(route.params.returnScreen, {
          selectedLocation: cityToSave,
          selectedCity: cityToSave,
          initialState: cityToSave,
          locationDetails: details,
          ...(route?.params?.returnParams || {}),
        });
      } else if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('MainTabs', {
          screen: 'HomeTab',
          params: { selectedCity: cityToSave },
        });
      }
    },
    [navigation, route]
  );

  // GPS Auto-detect handler
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

  // Build sorted list of states with aliases matching screenshot (e.g. Pondicherry, Uttaranchal)
  const allStates = useMemo(() => {
    const statesMap = new Map<string, StateItem>();

    INDIAN_STATES_AND_DISTRICTS.forEach((item) => {
      let displayName = item.state;
      if (item.state.toLowerCase() === 'puducherry') {
        displayName = 'Pondicherry';
      } else if (item.state.toLowerCase() === 'uttarakhand') {
        displayName = 'Uttaranchal';
      } else if (item.state.toLowerCase() === 'delhi (nct)') {
        displayName = 'Delhi';
      }

      statesMap.set(displayName.toLowerCase(), {
        key: item.state,
        state: item.state,
        displayName,
        districts: [...item.districts].sort((a, b) => a.localeCompare(b)),
      });
    });

    // Merge admin taxonomy additions
    adminTaxonomyLocations.forEach((item) => {
      if (!item.state) return;
      const key = item.state.toLowerCase();
      if (statesMap.has(key)) {
        const existing = statesMap.get(key)!;
        const currentDistrictsSet = new Set(existing.districts.map((d) => d.toLowerCase()));
        if (Array.isArray(item.districts)) {
          item.districts.forEach((d) => {
            if (d && !currentDistrictsSet.has(d.toLowerCase())) {
              existing.districts.push(d);
              currentDistrictsSet.add(d.toLowerCase());
            }
          });
          existing.districts.sort((a, b) => a.localeCompare(b));
        }
      } else {
        statesMap.set(key, {
          key: item.state,
          state: item.state,
          displayName: item.state,
          districts: Array.isArray(item.districts) ? [...item.districts].sort((a, b) => a.localeCompare(b)) : [],
        });
      }
    });

    return Array.from(statesMap.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [adminTaxonomyLocations]);

  // Real-time search results across standard Indian locations + all admin added states and districts
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const cleanQuery = searchQuery.trim().toLowerCase();
    const matches: Array<{
      id: string;
      name: string;
      state: string;
      type: 'state' | 'district' | 'city';
      score: number;
    }> = [];

    const seenKeys = new Set<string>();

    // 1. Search through allStates (contains all states & all districts, including all admin additions)
    allStates.forEach((stateItem) => {
      const stateNameLower = stateItem.displayName.toLowerCase();
      // Match state name
      if (stateNameLower.includes(cleanQuery)) {
        const key = `state_${stateNameLower}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          const isPrefix = stateNameLower.startsWith(cleanQuery);
          matches.push({
            id: `state_${stateItem.key}`,
            name: stateItem.displayName,
            state: 'State',
            type: 'state',
            score: isPrefix ? 100 : 50,
          });
        }
      }

      // Match district names in this state
      stateItem.districts.forEach((dist) => {
        const distLower = dist.toLowerCase().trim();
        if (distLower.includes(cleanQuery)) {
          const key = `dist_${distLower}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            const isPrefix = distLower.startsWith(cleanQuery);
            matches.push({
              id: `dist_${stateItem.key}_${distLower}`,
              name: dist,
              state: stateItem.displayName,
              type: 'district',
              score: isPrefix ? 90 : 40,
            });
          }
        }
      });
    });

    // 2. Search through base Indian locations utility (in case of aliases/extra cities)
    const baseResults = searchIndianLocations(searchQuery);
    baseResults.forEach((b: any) => {
      const bNameLower = b.name.toLowerCase().trim();
      const key = `dist_${bNameLower}`;
      const keyAlt = `${b.type || 'loc'}_${bNameLower}`;
      if (!seenKeys.has(key) && !seenKeys.has(keyAlt)) {
        seenKeys.add(keyAlt);
        const isPrefix = bNameLower.startsWith(cleanQuery);
        matches.push({
          id: b.id || `base_${bNameLower}`,
          name: b.name,
          state: b.state || 'City / Region',
          type: b.type || 'city',
          score: isPrefix ? 80 : 30,
        });
      }
    });

    // 3. Search through adminLocations strings list
    adminLocations.forEach((loc) => {
      if (!loc) return;
      const locLower = loc.toLowerCase().trim();
      if (locLower.includes(cleanQuery)) {
        const key = `dist_${locLower}`;
        const keyAlt = `admin_${locLower}`;
        if (!seenKeys.has(key) && !seenKeys.has(keyAlt)) {
          seenKeys.add(keyAlt);
          const isPrefix = locLower.startsWith(cleanQuery);
          matches.push({
            id: `admin_${locLower.replace(/[^a-z0-9]/g, '_')}`,
            name: loc,
            state: 'City / Region',
            type: 'city',
            score: isPrefix ? 85 : 35,
          });
        }
      }
    });

    // Sort by score descending, then alphabetical
    matches.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name);
    });

    return matches;
  }, [searchQuery, allStates, adminLocations]);

  // Current active drilldown state dynamically resolved from allStates (reactive to admin additions)
  const activeDrilldownState = useMemo(() => {
    if (!selectedStateForDrilldown) return null;
    return (
      allStates.find(
        (s) =>
          s.state.toLowerCase() === selectedStateForDrilldown.state.toLowerCase() ||
          s.displayName.toLowerCase() === selectedStateForDrilldown.displayName.toLowerCase()
      ) || selectedStateForDrilldown
    );
  }, [selectedStateForDrilldown, allStates]);

  // Header Back/Close action
  const handleHeaderBack = () => {
    if (selectedStateForDrilldown) {
      setSelectedStateForDrilldown(null);
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Clean Top Header matching demo image */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={handleHeaderBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Icon
            source={activeDrilldownState ? 'arrow-left' : 'close'}
            size={24}
            color="#000000"
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {activeDrilldownState ? activeDrilldownState.displayName : 'Location'}
        </Text>
      </View>

      {/* Search Input matching demo image */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBox}>
          <Icon source="magnify" size={20} color="#475569" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search city, area or neighbourhood"
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
              <Icon source="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 1. When Search is active: Filtered List */}
      {searchQuery.trim().length > 0 ? (
        <FlatList
          ref={searchScrollViewRef}
          data={searchResults}
          keyExtractor={(item) => item.id || item.name}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon source="map-marker-off-outline" size={40} color="#94A3B8" />
              <Text style={styles.emptyText}>No matching locations found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.locationRow}
              activeOpacity={0.6}
              onPress={() =>
                handleSelect(item.name, {
                  state: item.state,
                  district: item.type === 'district' ? item.name : undefined,
                })
              }
            >
              <View style={styles.locationTextWrap}>
                <Text style={styles.locationNameText}>{item.name}</Text>
                {item.state && item.state !== 'City / Region' && (
                  <Text style={styles.locationSubText}>{item.state}</Text>
                )}
              </View>
              <Icon source="chevron-right" size={22} color="#000000" />
            </TouchableOpacity>
          )}
        />
      ) : activeDrilldownState ? (
        /* 2. When State is selected: Districts / Cities of that state */
        <ScrollView
          ref={scrollViewRef}
          style={styles.flex1}
          contentContainerStyle={styles.listContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Option: Choose entire state */}
          <TouchableOpacity
            style={[styles.locationRow, styles.allStateRow]}
            activeOpacity={0.6}
            onPress={() =>
              handleSelect(activeDrilldownState.displayName, {
                state: activeDrilldownState.state,
              })
            }
          >
            <View style={styles.locationTextWrap}>
              <Text style={[styles.locationNameText, styles.allStateText]}>
                All {activeDrilldownState.displayName}
              </Text>
            </View>
            <Icon source="chevron-right" size={22} color="#000000" />
          </TouchableOpacity>
          <View style={styles.separator} />

          {/* List of districts in the state */}
          {activeDrilldownState.districts.map((district) => (
            <React.Fragment key={district}>
              <TouchableOpacity
                style={styles.locationRow}
                activeOpacity={0.6}
                onPress={() =>
                  handleSelect(district, {
                    state: activeDrilldownState.state,
                    district,
                  })
                }
              >
                <Text style={styles.locationNameText}>{district}</Text>
                <Icon source="chevron-right" size={22} color="#000000" />
              </TouchableOpacity>
              <View style={styles.separator} />
            </React.Fragment>
          ))}
        </ScrollView>
      ) : (
        /* 3. Root View: All States matching demo image directly */
        <ScrollView
          ref={scrollViewRef}
          style={styles.flex1}
          contentContainerStyle={styles.listContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Quick Actions: Auto-detect GPS & All India */}
          <TouchableOpacity
            style={styles.locationRow}
            activeOpacity={0.6}
            onPress={handleGPSDetect}
            disabled={isDetectingGPS}
          >
            <View style={styles.rowLeftGroup}>
              <Icon source="crosshairs-gps" size={20} color="#0066FF" />
              <View style={styles.locationTextWrap}>
                <Text style={[styles.locationNameText, { color: '#0066FF', fontWeight: '500' }]}>
                  {isDetectingGPS ? 'Detecting current location...' : 'Use current location'}
                </Text>
              </View>
            </View>
            {isDetectingGPS ? (
              <ActivityIndicator size="small" color="#0066FF" />
            ) : (
              <Icon source="chevron-right" size={22} color="#000000" />
            )}
          </TouchableOpacity>
          <View style={styles.separator} />

          <TouchableOpacity
            style={styles.locationRow}
            activeOpacity={0.6}
            onPress={() => handleSelect('All India')}
          >
            <View style={styles.rowLeftGroup}>
              <Icon source="earth" size={20} color="#475569" />
              <View style={styles.locationTextWrap}>
                <Text style={[styles.locationNameText, { fontWeight: '500' }]}>
                  All India
                </Text>
              </View>
            </View>
            <Icon source="chevron-right" size={22} color="#000000" />
          </TouchableOpacity>
          <View style={styles.separator} />

          {/* Alphabetical list of States as in demo image */}
          {allStates.map((item) => (
            <React.Fragment key={item.displayName}>
              <TouchableOpacity
                style={styles.locationRow}
                activeOpacity={0.6}
                onPress={() => setSelectedStateForDrilldown(item)}
              >
                <Text style={styles.locationNameText}>{item.displayName}</Text>
                <Icon source="chevron-right" size={22} color="#000000" />
              </TouchableOpacity>
              <View style={styles.separator} />
            </React.Fragment>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flex1: {
    flex: 1,
  },
  // Top Header Bar
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 14 : 8,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  headerIconBtn: {
    padding: 4,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  // Search Box
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    marginLeft: 8,
    marginRight: 4,
    paddingVertical: 0,
  },
  // Location Row Items
  listContainer: {
    paddingBottom: 36,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
  },
  rowLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  locationTextWrap: {
    flex: 1,
  },
  locationNameText: {
    fontSize: 15,
    color: '#000000',
    fontWeight: '400',
  },
  locationSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  allStateRow: {
    backgroundColor: '#F8FAFC',
  },
  allStateText: {
    fontWeight: '600',
    color: '#0066FF',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F1F5F9',
    marginLeft: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748B',
  },
});
