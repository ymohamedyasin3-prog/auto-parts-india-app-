import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { getFirebaseFirestore, getCurrentUser } from '../services/firebase';
import useFavorites from '../services/favorites';

export default function WishlistScreen({ navigation }: any) {
  const { favorites, toggleFavorite } = useFavorites();
  const [allParts, setAllParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let unsubParts = () => {};
    try {
      const db = getFirebaseFirestore();
      if (db) {
        unsubParts = db.collection('spareParts')
          .onSnapshot((partsSnap: any) => {
            const items: any[] = [];
            partsSnap.forEach((docSnap: any) => {
              items.push({ id: docSnap.id, ...docSnap.data() });
            });
            if (isMounted) {
              setAllParts(items);
              setLoading(false);
            }
          }, () => {
            if (isMounted) setLoading(false);
          });
      } else {
        setLoading(false);
      }
    } catch (_) {
      if (isMounted) setLoading(false);
    }
    return () => {
      isMounted = false;
      unsubParts?.();
    };
  }, []);

  const savedParts = allParts.filter(p => favorites.includes(p.id) && !p.isDeleted && p.status !== 'deleted');

  const handleRemoveFavorite = async (partId: string) => {
    await toggleFavorite(partId);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#0066FF" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={savedParts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Icon source="heart-outline" size={32} color="#64748B" />
            </View>
            <Text style={styles.emptyTitle}>No Saved Parts</Text>
            <Text style={styles.emptySubtitle}>Items you favorite will appear here.</Text>
            <TouchableOpacity style={styles.emptyActionBtn} onPress={() => navigation.navigate('MainTabs', { screen: 'HomeTab' })}>
              <Text style={styles.emptyActionBtnText}>Browse Marketplace</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.adCard}
            onPress={() => navigation.navigate('ProductDetail', { part: item, partId: item.id })}
            activeOpacity={0.9}
          >
            <View style={styles.cardHeaderArea}>
              <View style={styles.imageWrapper}>
                {item.imageUrl || item.imageUrls?.[0] ? (
                  <Image source={{ uri: item.imageUrl || item.imageUrls?.[0] }} style={styles.adImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Icon source="camera-outline" size={24} color="#94A3B8" />
                  </View>
                )}
              </View>
              <View style={styles.adInfoArea}>
                <Text style={styles.adBrandTag} numberOfLines={1}>
                  {item.carBrand} {item.carModel}
                </Text>
                <Text style={styles.adTitle} numberOfLines={2}>
                  {item.partName || item.title}
                </Text>
                <View style={styles.metaRow}>
                  <Text style={styles.adPrice}>₹{Number(item.price || item.partPrice || 0).toLocaleString('en-IN')}</Text>
                  <View style={styles.conditionPill}>
                    <Text style={styles.conditionText}>{item.condition || 'Used'}</Text>
                  </View>
                </View>
                <View style={styles.subMetaRow}>
                  <View style={styles.locationWrap}>
                    <Icon source="map-marker-outline" size={12} color="#64748B" />
                    <Text style={styles.locationText} numberOfLines={1}>{item.district || item.state || 'India'}</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.cardActionsToolbar}>
              <TouchableOpacity 
                style={styles.actionBtnOutline}
                onPress={() => handleRemoveFavorite(item.id)}
              >
                <Icon source="heart-off-outline" size={16} color="#DC2626" />
                <Text style={[styles.actionBtnOutlineText, { color: '#DC2626' }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  listContent: { padding: 16 },
  adCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeaderArea: { flexDirection: 'row', padding: 12, gap: 12 },
  imageWrapper: { width: 90, height: 90, borderRadius: 10, overflow: 'hidden', backgroundColor: '#F1F5F9' },
  adImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  adInfoArea: { flex: 1, justifyContent: 'space-between' },
  adBrandTag: { fontSize: 11, fontWeight: '700', color: '#1565FF', textTransform: 'uppercase', marginBottom: 2 },
  adTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  adPrice: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  conditionPill: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  conditionText: { fontSize: 10, fontWeight: '700', color: '#475569' },
  subMetaRow: { flexDirection: 'row', alignItems: 'center' },
  locationWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  locationText: { fontSize: 11, color: '#64748B' },
  cardActionsToolbar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'flex-end',
    backgroundColor: '#FAFAFA',
  },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  actionBtnOutlineText: { fontSize: 12, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 20 },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 20 },
  emptyActionBtn: { backgroundColor: '#1565FF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  emptyActionBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
