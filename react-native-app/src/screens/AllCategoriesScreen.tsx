import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  useWindowDimensions,
  Platform,
  Image,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { getFirebaseFirestore } from '../services/firebase';
import { MASTER_CATEGORIES, MasterCategory } from '../constants/categories';

export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  bg: string;
  color: string;
  description: string;
  popularParts: string[];
  imageUrl?: string;
}

export const ALL_AUTOMOTIVE_CATEGORIES: CategoryItem[] = MASTER_CATEGORIES;

export default function AllCategoriesScreen({ navigation, route }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [firestoreCategories, setFirestoreCategories] = useState<any[]>([]);
  const { width: screenWidth } = useWindowDimensions();

  useEffect(() => {
    try {
      const db = getFirebaseFirestore();
      if (db && typeof db.collection === 'function') {
        const unsubscribe = db.collection('topCategories').onSnapshot((snapshot: any) => {
          const list: any[] = [];
          snapshot.forEach((doc: any) => {
            list.push({ id: doc.id, ...doc.data() });
          });
          list.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
          setFirestoreCategories(list);
        }, (err: any) => {
          console.warn('AllCategoriesScreen topCategories listener error:', err);
        });
        return () => unsubscribe();
      }
    } catch (e) {
      console.warn('Error connecting to Firestore in AllCategoriesScreen:', e);
    }
  }, []);

  const combinedCategories = useMemo(() => {
    // 1. If Firestore categories are loaded, they are the ONLY source of truth so deletions stay deleted!
    if (firestoreCategories && firestoreCategories.length > 0) {
      const list: CategoryItem[] = [];
      firestoreCategories.forEach((c: any) => {
        if (c.active === false || c.isActive === false) return;
        const rawName = c.name || c.title || c.id || '';
        const displayName = rawName.length > 0 ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : rawName;
        list.push({
          id: c.id || displayName,
          name: displayName,
          icon: c.icon || 'car-cog',
          bg: c.bg || '#F0F9FF',
          color: c.color || '#0066FF',
          description: c.description || c.subtitle || 'Verified automotive spare parts & OEM components',
          popularParts: c.popularParts || c.subcategories || ['OEM Part', 'Spare Part', 'Accessory'],
          imageUrl: c.imageUrl || undefined,
        });
      });
      return list;
    }

    // 2. Fallback only if Firestore is not yet loaded
    const map = new Map<string, CategoryItem>();
    ALL_AUTOMOTIVE_CATEGORIES.forEach(c => {
      map.set(c.name.toLowerCase().trim(), c);
    });
    return Array.from(map.values());
  }, [firestoreCategories]);

  // Filter categories based on search input
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return combinedCategories;
    return combinedCategories.filter((c) => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchDesc = c.description.toLowerCase().includes(q);
      const matchParts = c.popularParts.some((p) => p.toLowerCase().includes(q));
      return matchName || matchDesc || matchParts;
    });
  }, [searchQuery, combinedCategories]);

  const handleCategorySelect = (category: CategoryItem) => {
    // Navigate back to HomeTab with the selected category filter
    if (navigation?.navigate) {
      navigation.navigate('MainTabs', {
        screen: 'HomeTab',
        params: { selectedCategory: category.id },
      });
    }
  };

  const renderCategoryCard = ({ item }: { item: CategoryItem }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => handleCategorySelect(item)}
      >
        {/* Left Colorful Modern Icon Box */}
        <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.categoryImage}
              resizeMode="cover"
            />
          ) : (
            <Icon source={item.icon} size={28} color={item.color} />
          )}
        </View>

        {/* Center Content */}
        <View style={styles.cardInfo}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.categoryTitle}>{item.name}</Text>
            <Icon source="chevron-right" size={18} color="#94A3B8" />
          </View>

          <Text style={styles.categoryDesc} numberOfLines={2}>
            {item.description}
          </Text>

          {/* Popular Parts Tags */}
          <View style={styles.tagsRow}>
            {item.popularParts.slice(0, 3).map((part, pIdx) => (
              <View key={`part-${pIdx}`} style={styles.partTag}>
                <Text style={styles.partTagText}>{part}</Text>
              </View>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Modern Clean Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => {
            if (navigation?.canGoBack && navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('MainTabs', { screen: 'HomeTab' });
            }
          }}
        >
          <Icon source="arrow-left" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>All Categories</Text>
        </View>
      </View>

      {/* Category Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon source="magnify" size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories, parts (e.g. Brakes, Turbo, Lights)..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon source="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories List */}
      <FlatList
        data={filteredCategories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategoryCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <Icon source="car-wrench" size={36} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No matching categories</Text>
            <Text style={styles.emptySub}>
              Try searching with another keyword like "Engine", "Brake", "Light" or "Filter"
            </Text>
          </View>
        }
      />
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 14,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  categoryDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 16,
    fontWeight: '500',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  partTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  partTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
