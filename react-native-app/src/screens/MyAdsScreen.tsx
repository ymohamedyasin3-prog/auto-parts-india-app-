import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Platform,
  Dimensions,
} from 'react-native';
import { Icon, Surface, Badge } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFirebaseFirestore, getCurrentUser, getFirebaseAuth } from '../services/firebase';
import { useLanguage } from '../context/LanguageContext';
import { EditListingModal } from '../components/EditListingModal';
import { getOptimizedImageUrl, deleteMultipleImagesFromCloudinary } from '../services/cloudinary';
import { ListFeedSkeleton } from '../components/SkeletonLoaders';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export default function MyAdsScreen({ navigation, user: initialUser }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'active' | 'sold' | 'expired'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myParts, setMyParts] = useState<any[]>([]);

  // Edit Modal State
  const [selectedPartToEdit, setSelectedPartToEdit] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState(() => initialUser || getCurrentUser());

  useEffect(() => {
    const authInst = getFirebaseAuth();
    if (authInst && typeof authInst.onAuthStateChanged === 'function') {
      const unsub = authInst.onAuthStateChanged((usr) => {
        if (usr) setCurrentUser(usr);
      });
      return () => unsub();
    }
  }, []);

  const currentUid = currentUser?.uid || currentUser?.id || null;
  const currentEmail = (currentUser?.email || '').toLowerCase();

  // 1. Real-time Firestore Listener for User's Listings
  useEffect(() => {
    setLoading(true);
    let unsubscribe = () => {};

    try {
      const db = getFirebaseFirestore();
      if (db && typeof db.collection === 'function') {
        unsubscribe = db.collection('spareParts').onSnapshot(
          (snapshot: any) => {
            const list: any[] = [];
            snapshot.forEach((doc: any) => {
              const data = doc.data();
              list.push({ id: doc.id, ...data });
            });

            // Filter parts belonging to the logged-in user
            const userListings = list.filter((part: any) => {
              if (part.isDeleted) return false;
              const sellerId = part.sellerId || part.userId || part.ownerId;
              const sellerEmail = (part.sellerEmail || part.ownerEmail || '').toLowerCase();

              const matchesId = currentUid && sellerId && (sellerId === currentUid || String(sellerId) === String(currentUid));
              const matchesEmail = currentEmail && sellerEmail && (sellerEmail === currentEmail);

              return Boolean(matchesId || matchesEmail);
            });

            // Sort by most recently updated/created first
            userListings.sort((a, b) => {
              const timeA = a.updatedAt || a.createdAt || 0;
              const timeB = b.updatedAt || b.createdAt || 0;
              return timeB - timeA;
            });

            setMyParts(userListings);
            setLoading(false);
          },
          (error: any) => {
            console.warn('[MyAdsScreen] Firestore snapshot error:', error);
            setLoading(false);
          }
        );
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.warn('[MyAdsScreen] Error setting up listener:', err);
      setLoading(false);
    }

    return () => {
      try {
        unsubscribe();
      } catch (_) {}
    };
  }, [currentUid, currentEmail]);

  // 2. Manual Refresh Handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const db = getFirebaseFirestore();
      if (db && typeof db.collection === 'function') {
        const snap = await db.collection('spareParts').get();
        const list: any[] = [];
        snap.forEach((doc: any) => {
          const data = doc.data();
          if (!data.isDeleted) {
            const sellerId = data.sellerId || data.userId || data.ownerId;
            const sellerEmail = (data.sellerEmail || data.ownerEmail || '').toLowerCase();
            const matchesId = currentUid && sellerId && (sellerId === currentUid || String(sellerId) === String(currentUid));
            const matchesEmail = currentEmail && sellerEmail && (sellerEmail === currentEmail);
            if (matchesId || matchesEmail) {
              list.push({ id: doc.id, ...data });
            }
          }
        });
        list.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
        setMyParts(list);
      }
    } catch (e) {
      console.warn('[MyAdsScreen] Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  }, [currentUid, currentEmail]);

  // 3. Category & Tab Filtering
  const now = Date.now();
  const activeAds = useMemo(() => {
    return myParts.filter((p) => {
      const isSold = p.sold === true || p.status === 'sold';
      const created = p.createdAt || now;
      const isExpired = now - created > NINETY_DAYS_MS;
      return !isSold && !isExpired;
    });
  }, [myParts, now]);

  const soldAds = useMemo(() => {
    return myParts.filter((p) => p.sold === true || p.status === 'sold');
  }, [myParts]);

  const expiredAds = useMemo(() => {
    return myParts.filter((p) => {
      const isSold = p.sold === true || p.status === 'sold';
      const created = p.createdAt || now;
      const isExpired = now - created > NINETY_DAYS_MS;
      return !isSold && isExpired;
    });
  }, [myParts, now]);

  // Filter based on selected tab and search query
  const filteredAds = useMemo(() => {
    let list = activeTab === 'active' ? activeAds : activeTab === 'sold' ? soldAds : expiredAds;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        return (
          p.title?.toLowerCase().includes(q) ||
          p.carBrand?.toLowerCase().includes(q) ||
          p.carModel?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.location?.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [activeTab, activeAds, soldAds, expiredAds, searchQuery]);

  // 4. Action: Toggle Sold / Active
  const handleToggleSold = (part: any) => {
    const isCurrentlySold = part.sold === true || part.status === 'sold';
    const actionText = isCurrentlySold ? 'Mark as Active' : 'Mark as Sold';
    const message = isCurrentlySold
      ? 'This spare part will be reactivated and visible to buyers in the marketplace feed.'
      : 'This spare part will be marked as SOLD OUT and will not accept new purchase chats.';

    Alert.alert(actionText, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: actionText,
        style: isCurrentlySold ? 'default' : 'destructive',
        onPress: async () => {
          try {
            // Optimistic update
            setMyParts((prev) =>
              prev.map((p) =>
                p.id === part.id
                  ? { ...p, sold: !isCurrentlySold, status: !isCurrentlySold ? 'sold' : 'active' }
                  : p
              )
            );
            const db = getFirebaseFirestore();
            if (db && typeof db.collection === 'function') {
              await db.collection('spareParts').doc(part.id).update({
                sold: !isCurrentlySold,
                status: !isCurrentlySold ? 'sold' : 'active',
                updatedAt: Date.now(),
              });
              showSuccessToast(isCurrentlySold ? 'Listing marked as Active!' : 'Listing marked as Sold!');
            }
          } catch (err: any) {
            Alert.alert('Error', 'Failed to update status. Please try again.');
          }
        },
      },
    ]);
  };

  // 5. Action: Renew / Reactivate Expired Ad
  const handleRenewExpired = (part: any) => {
    Alert.alert(
      'Renew Listing',
      'Reactivate this listing for another 90 days? It will appear back at the top of the feed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Renew for 90 Days',
          onPress: async () => {
            try {
              setMyParts((prev) =>
                prev.map((p) =>
                  p.id === part.id
                    ? { ...p, sold: false, status: 'active', createdAt: Date.now() }
                    : p
                )
              );
              const db = getFirebaseFirestore();
              if (db && typeof db.collection === 'function') {
                await db.collection('spareParts').doc(part.id).update({
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  sold: false,
                  status: 'active',
                });
                showSuccessToast('Listing renewed for 90 days!');
              }
            } catch (err: any) {
              Alert.alert('Error', 'Failed to renew listing. Please try again.');
            }
          },
        },
      ]
    );
  };

  // 6. Action: Delete Ad
  const handleDeleteListing = (part: any) => {
    Alert.alert(
      'Delete Listing',
      `Are you sure you want to permanently delete "${part.title || 'this listing'}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              // Optimistic deletion
              setMyParts((prev) => prev.filter((p) => p.id !== part.id));
              const db = getFirebaseFirestore();
              if (db && typeof db.collection === 'function') {
                await db.collection('spareParts').doc(part.id).delete();
                await db.collection('parts').doc(part.id).delete().catch(() => null);
                showSuccessToast('Listing permanently deleted.');
              }

              // Auto-delete all images of this listing from Cloudinary
              const allImages = (part.images || part.imageUrls || [part.imageUrl, part.image]).filter(Boolean);
              if (allImages.length > 0) {
                deleteMultipleImagesFromCloudinary(allImages);
              }
            } catch (err: any) {
              Alert.alert('Error', 'Failed to delete listing. Please try again.');
            }
          },
        },
      ]
    );
  };

  // 7. Success Banner Toast
  const showSuccessToast = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => {
      setActionSuccessMessage(null);
    }, 3000);
  };

  // 8. Format INR Currency
  const formatPrice = (price: any) => {
    const num = Number(price) || 0;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  // 9. Format Date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (_) {
      return '';
    }
  };

  // 10. Render Empty State
  const renderEmptyState = () => {
    if (loading) return null;

    if (!currentUser) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Icon source="account-lock-outline" size={44} color="#0066FF" />
          </View>
          <Text style={styles.emptyTitle}>Sign In Required</Text>
          <Text style={styles.emptySubtitle}>
            Please sign in to view, edit, and manage all your uploaded auto spare parts ads.
          </Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Auth')}
          >
            <Icon source="login" size={18} color="#FFFFFF" />
            <Text style={styles.emptyActionBtnText}>Sign In to Account</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (searchQuery.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Icon source="file-search-outline" size={40} color="#64748B" />
          </View>
          <Text style={styles.emptyTitle}>No Ads Found</Text>
          <Text style={styles.emptySubtitle}>
            No listings matched "{searchQuery}". Try clearing your search query.
          </Text>
          <TouchableOpacity
            style={styles.clearSearchBtn}
            activeOpacity={0.8}
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearSearchBtnText}>Clear Search</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeTab === 'active') {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Icon source="tag-outline" size={44} color="#0066FF" />
          </View>
          <Text style={styles.emptyTitle}>No Active Ads</Text>
          <Text style={styles.emptySubtitle}>
            You do not have any active ads right now. Post high-quality spare parts to reach verified buyers across India.
          </Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            activeOpacity={0.85}
            onPress={() => {
              if (navigation?.navigate) {
                navigation.navigate('MainTabs', { screen: 'SellTab' });
              }
            }}
          >
            <Icon source="plus-circle" size={18} color="#FFFFFF" />
            <Text style={styles.emptyActionBtnText}>Post a Spare Part</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeTab === 'sold') {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: '#FEE2E2' }]}>
            <Icon source="check-decagram-outline" size={44} color="#DC2626" />
          </View>
          <Text style={styles.emptyTitle}>No Sold Ads</Text>
          <Text style={styles.emptySubtitle}>
            You have not marked any automobile parts as sold yet. When a part is purchased, mark it as sold to track your deals!
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconCircle, { backgroundColor: '#FEF3C7' }]}>
          <Icon source="clock-alert-outline" size={44} color="#D97706" />
        </View>
        <Text style={styles.emptyTitle}>No Expired Ads</Text>
        <Text style={styles.emptySubtitle}>
          All your uploaded ads remain fresh and fully active for 90 days. Expired ads will appear here for one-click renewal.
        </Text>
      </View>
    );
  };

  // 11. Render Single Ad Item
  const renderAdItem = ({ item }: { item: any }) => {
    const isSold = item.sold === true || item.status === 'sold';
    const isExpired = !isSold && now - (item.createdAt || now) > NINETY_DAYS_MS;
    const rawUrl = item.imageUrl || (item.images && item.images[0]) || '';
    const imageUrl = rawUrl ? getOptimizedImageUrl(rawUrl, 300, 300) : '';

    return (
      <Surface style={styles.adCard} elevation={1}>
        {/* Card Main Body (Clickable to view Product Detail) */}
        <TouchableOpacity
          activeOpacity={0.75}
          style={styles.cardHeaderArea}
          onPress={() => navigation.navigate('ProductDetail', { part: item })}
        >
          {/* Thumbnail with Status Overlay */}
          <View style={styles.imageWrapper}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.adImage} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Icon source="car-wrench" size={28} color="#94A3B8" />
              </View>
            )}

            {isSold && (
              <View style={styles.soldBadgeOverlay}>
                <Text style={styles.soldBadgeText}>SOLD</Text>
              </View>
            )}

            {isExpired && !isSold && (
              <View style={styles.expiredBadgeOverlay}>
                <Text style={styles.expiredBadgeText}>EXPIRED</Text>
              </View>
            )}
          </View>

          {/* Ad Info */}
          <View style={styles.adInfoArea}>
            <View>
              <Text style={styles.adBrandTag} numberOfLines={1}>
                {item.carBrand || 'Auto'} {item.carModel ? `· ${item.carModel}` : ''}
              </Text>
              <Text style={styles.adTitle} numberOfLines={2}>
                {item.title || 'Automobile Spare Part'}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.adPrice}>{formatPrice(item.price || item.partPrice)}</Text>
              {item.condition && (
                <View style={[
                  styles.conditionPill,
                  item.condition.toLowerCase().includes('new') ? styles.pillNew : styles.pillUsed
                ]}>
                  <Text style={[
                    styles.conditionText,
                    item.condition.toLowerCase().includes('new') ? styles.textNew : styles.textUsed
                  ]}>
                    {item.condition.toLowerCase().includes('new') ? '✨ NEW' : 'USED'}
                  </Text>
                </View>
              )}
            </View>

            {/* Location & Date */}
            <View style={styles.subMetaRow}>
              <View style={styles.locationWrap}>
                <Icon source="map-marker-outline" size={12} color="#64748B" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.location || item.district || 'India'}
                </Text>
              </View>
              <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
            </View>

            {/* Views Metric Badge (Visible only to seller in My Ads) */}
            <View style={styles.adMetricsRow}>
              <View style={styles.viewsBadge}>
                <Icon source="eye-outline" size={13} color="#0066FF" />
                <Text style={styles.viewsBadgeText}>{item.views || item.viewCount || 0} Views</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Action Buttons Toolbar */}
        <View style={styles.cardActionsToolbar}>
          {activeTab === 'active' && (
            <>
              <TouchableOpacity
                style={styles.actionBtnOutline}
                activeOpacity={0.7}
                onPress={() => {
                  navigation.navigate('EditListing', {
                    part: item,
                    onUpdated: (updatedPart: any) => {
                      setMyParts((prev) =>
                        prev.map((p) => (p.id === updatedPart.id ? { ...p, ...updatedPart } : p))
                      );
                      showSuccessToast('Listing updated successfully!');
                    },
                  });
                }}
              >
                <Icon source="pencil-outline" size={15} color="#0066FF" />
                <Text style={styles.actionBtnOutlineText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnPrimary}
                activeOpacity={0.7}
                onPress={() => handleToggleSold(item)}
              >
                <Icon source="check-circle-outline" size={15} color="#FFFFFF" />
                <Text style={styles.actionBtnPrimaryText}>Mark Sold</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnDelete}
                activeOpacity={0.7}
                onPress={() => handleDeleteListing(item)}
              >
                <Icon source="trash-can-outline" size={16} color="#DC2626" />
              </TouchableOpacity>
            </>
          )}

          {activeTab === 'sold' && (
            <>
              <View style={styles.soldStatusPill}>
                <Icon source="check-decagram" size={14} color="#DC2626" />
                <Text style={styles.soldStatusPillText}>Sold Out</Text>
              </View>

              <TouchableOpacity
                style={styles.actionBtnOutline}
                activeOpacity={0.7}
                onPress={() => {
                  navigation.navigate('EditListing', {
                    part: item,
                    onUpdated: (updatedPart: any) => {
                      setMyParts((prev) =>
                        prev.map((p) => (p.id === updatedPart.id ? { ...p, ...updatedPart } : p))
                      );
                      showSuccessToast('Listing updated successfully!');
                    },
                  });
                }}
              >
                <Icon source="pencil-outline" size={15} color="#0066FF" />
                <Text style={styles.actionBtnOutlineText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnSuccess}
                activeOpacity={0.7}
                onPress={() => handleToggleSold(item)}
              >
                <Icon source="refresh" size={15} color="#FFFFFF" />
                <Text style={styles.actionBtnSuccessText}>Mark Active</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnDelete}
                activeOpacity={0.7}
                onPress={() => handleDeleteListing(item)}
              >
                <Icon source="trash-can-outline" size={16} color="#DC2626" />
              </TouchableOpacity>
            </>
          )}

          {activeTab === 'expired' && (
            <>
              <View style={styles.expiredStatusPill}>
                <Icon source="clock-alert" size={14} color="#D97706" />
                <Text style={styles.expiredStatusPillText}>Expired</Text>
              </View>

              <TouchableOpacity
                style={styles.actionBtnPrimary}
                activeOpacity={0.7}
                onPress={() => handleRenewExpired(item)}
              >
                <Icon source="autorenew" size={15} color="#FFFFFF" />
                <Text style={styles.actionBtnPrimaryText}>Renew (90 Days)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnDelete}
                activeOpacity={0.7}
                onPress={() => handleDeleteListing(item)}
              >
                <Icon source="trash-can-outline" size={16} color="#DC2626" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </Surface>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 1. TOP HEADER */}
      <View style={styles.headerBar}>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>My Ads</Text>
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>{myParts.length}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.postNewAdBtn}
          activeOpacity={0.85}
          onPress={() => {
            if (navigation?.navigate) {
              navigation.navigate('MainTabs', { screen: 'SellTab' });
            }
          }}
        >
          <Icon source="plus" size={16} color="#FFFFFF" />
          <Text style={styles.postNewAdBtnText}>+ Post Part</Text>
        </TouchableOpacity>
      </View>

      {/* 2. SUCCESS FEEDBACK TOAST */}
      {actionSuccessMessage && (
        <View style={styles.successToast}>
          <Icon source="check-circle" size={16} color="#16A34A" />
          <Text style={styles.successToastText}>{actionSuccessMessage}</Text>
        </View>
      )}

      {/* 3. SEGMENTED TABS (Active, Sold, Expired) */}
      <View style={styles.tabSegmentsContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'active' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('active')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentBtnText, activeTab === 'active' && styles.segmentBtnTextActive]}>
            Active
          </Text>
          <View style={[styles.segmentCountPill, activeTab === 'active' && styles.segmentCountPillActive]}>
            <Text style={[styles.segmentCountText, activeTab === 'active' && styles.segmentCountTextActive]}>
              {activeAds.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'sold' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('sold')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentBtnText, activeTab === 'sold' && styles.segmentBtnTextActive]}>
            Sold
          </Text>
          <View style={[styles.segmentCountPill, activeTab === 'sold' && styles.segmentCountPillActive]}>
            <Text style={[styles.segmentCountText, activeTab === 'sold' && styles.segmentCountTextActive]}>
              {soldAds.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'expired' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('expired')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentBtnText, activeTab === 'expired' && styles.segmentBtnTextActive]}>
            Expired
          </Text>
          <View style={[styles.segmentCountPill, activeTab === 'expired' && styles.segmentCountPillActive]}>
            <Text style={[styles.segmentCountText, activeTab === 'expired' && styles.segmentCountTextActive]}>
              {expiredAds.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 4. SEARCH WITHIN MY ADS */}
      {myParts.length > 0 && (
        <View style={styles.searchBarWrap}>
          <Icon source="magnify" size={18} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search within ${activeTab} ads...`}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon source="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 5. ADS LIST */}
      {loading ? (
        <ListFeedSkeleton count={4} />
      ) : (
        <FlatList
          data={filteredAds}
          keyExtractor={(item) => item.id}
          renderItem={renderAdItem}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={[
            styles.listContent,
            filteredAds.length === 0 && { flex: 1, justifyContent: 'center' },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0066FF']}
              tintColor="#0066FF"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* 6. EDIT LISTING MODAL */}
      {isEditModalOpen && (
        <EditListingModal
          visible={isEditModalOpen}
          listing={selectedPartToEdit}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedPartToEdit(null);
          }}
          onSuccess={() => {
            showSuccessToast('Listing updated successfully!');
            onRefresh();
          }}
        />
      )}
    </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  totalBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  totalBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0066FF',
  },
  postNewAdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0066FF',
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 10,
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  postNewAdBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  successToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  successToastText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
  },
  tabSegmentsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  segmentBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
  },
  segmentCountPill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  segmentCountPillActive: {
    backgroundColor: '#334155',
  },
  segmentCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  segmentCountTextActive: {
    color: '#FFFFFF',
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  adCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeaderArea: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  imageWrapper: {
    width: 84,
    height: 84,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    position: 'relative',
  },
  adImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldBadgeOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldBadgeText: {
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.5,
  },
  expiredBadgeOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiredBadgeText: {
    backgroundColor: '#D97706',
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.5,
  },
  adInfoArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  adBrandTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0066FF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  adTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
    lineHeight: 17,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  adPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  conditionPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pillNew: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  pillUsed: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  conditionText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  textNew: {
    color: '#059669',
  },
  textUsed: {
    color: '#475569',
  },
  subMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  locationWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  locationText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  dateText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  adMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  viewsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  viewsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0066FF',
  },
  cardActionsToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  actionBtnOutlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0066FF',
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#0066FF',
  },
  actionBtnPrimaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionBtnSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#16A34A',
  },
  actionBtnSuccessText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionBtnDelete: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    marginLeft: 'auto',
  },
  soldStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  soldStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    textTransform: 'uppercase',
  },
  expiredStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  expiredStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0066FF',
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  clearSearchBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  clearSearchBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
});
