
import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Linking, TouchableOpacity, Image, ActivityIndicator, FlatList, Alert, Platform, Dimensions, SafeAreaView } from 'react-native';
import { Text, Surface, Button, Icon, ActivityIndicator as PaperActivityIndicator } from 'react-native-paper';
import { getFirebaseAuth, getFirebaseFirestore, getCurrentUser } from '../services/firebase';
import ImageView from 'react-native-image-viewing';
import { UserProfilePopupModal } from '../components/UserProfilePopupModal';
import { openNativeCamera, openNativeGallery } from '../services/imagePickerService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SellerProfileScreen({ route, navigation }: any) {
  const { seller, sellerId: paramSellerId, sellerName: paramSellerName } = route.params || {};
  const sellerId = seller?.id || paramSellerId;
  const initialSellerName = seller?.name || paramSellerName || 'Automotive Seller';
  const initialSellerPhoto = seller?.photoURL || seller?.profilePhoto || null;
  const initialSellerLocation = seller?.location || seller?.district || 'India';

  const [sellerName, setSellerName] = useState(initialSellerName);
  const [sellerPhoto, setSellerPhoto] = useState<string | null>(initialSellerPhoto);
  const [sellerLocation, setSellerLocation] = useState(initialSellerLocation);
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);

  const [activeListings, setActiveListings] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const currentUser = getCurrentUser();
  const isOwnProfile = currentUser?.uid === sellerId;

  useEffect(() => {
    if (!sellerId) return;

    let isMounted = true;
    const fetchSellerData = async () => {
      setLoading(true);
      try {
        const db = getFirebaseFirestore();
        if (!db || typeof db.collection !== 'function') return;

        // 1. Fetch user doc for up-to-date profile picture & details
        try {
          const userDoc = await db.collection('users').doc(sellerId).get();
          const exists = typeof (userDoc as any).exists === 'function' ? (userDoc as any).exists() : Boolean(userDoc.exists);
          if (exists && isMounted) {
            const userData = userDoc.data();
            if (userData?.photoURL || userData?.profilePhoto) {
              setSellerPhoto(userData.photoURL || userData.profilePhoto);
            }
            if (userData?.displayName || userData?.name) {
              setSellerName(userData.displayName || userData.name);
            }
            if (userData?.location) {
              setSellerLocation(userData.location);
            }
          }
        } catch (_) {}

        // 2. Fetch seller listings
        const q = db.collection('spareParts').where('sellerId', '==', sellerId);
        const listingsSnap = await q.get();
        const items: any[] = [];
        listingsSnap.forEach((d: any) => {
          items.push({ id: d.id, ...d.data() });
        });

        // 3. Fetch followers & following counts
        const followersQ = db.collection('follows').where('followingId', '==', sellerId);
        const followingQ = db.collection('follows').where('followerId', '==', sellerId);
        const reviewsQ = db.collection('sellerReviews').where('sellerId', '==', sellerId);
        const [followersSnap, followingSnap, reviewsSnap] = await Promise.all([
          followersQ.get(),
          followingQ.get(),
          reviewsQ.get()
        ]);

        // 4. Check follow status if logged in
        let followingStatus = false;
        if (currentUser?.uid && currentUser.uid !== sellerId) {
          const followDoc = await db.collection('follows').doc(`${currentUser.uid}_${sellerId}`).get();
          followingStatus = typeof (followDoc as any).exists === 'function' ? (followDoc as any).exists() : Boolean(followDoc.exists);
        }

        if (isMounted) {
          setActiveListings(items.filter((it: any) => !it.sold));
          const revs: any[] = [];
          if (reviewsSnap) {
            reviewsSnap.forEach((d: any) => revs.push({id: d.id, ...d.data()}));
          }
          setReviews(revs);
          setFollowersCount(followersSnap.size);
          setFollowingCount(followingSnap.size);
          setIsFollowing(followingStatus);
        }
      } catch (err) {
        console.warn('Error fetching seller profile in RN:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSellerData();

    return () => {
      isMounted = false;
    };
  }, [sellerId, currentUser?.uid]);

  const handleToggleFollow = async () => {
    if (!currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to follow this seller.');
      return;
    }
    if (isOwnProfile) return;

    setFollowLoading(true);
    const followId = `${currentUser.uid}_${sellerId}`;
    const previousState = isFollowing;

    // Optimistic UI update for instant snappy feedback
    setIsFollowing(!previousState);
    setFollowersCount(prev => previousState ? Math.max(0, prev - 1) : prev + 1);

    try {
      const db = getFirebaseFirestore();
      if (db && typeof db.collection === 'function') {
        if (previousState) {
          await db.collection('follows').doc(followId).delete();
        } else {
          await db.collection('follows').doc(followId).set({
            id: followId,
            followerId: currentUser.uid,
            followingId: sellerId,
            followerName: currentUser.displayName || 'Buyer',
            createdAt: Date.now(),
          }, { merge: true });
        }
      }
    } catch (err: any) {
      console.warn('Follow update sync warning:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUpdateProfilePhoto = async () => {
    if (!currentUser || !isOwnProfile) return;
    Alert.alert(
      'Update Profile Picture',
      'Choose source for your new profile picture:',
      [
        {
          text: 'Take Photo (Camera)',
          onPress: async () => {
            const uri = await openNativeCamera();
            if (uri) {
              await saveNewPhoto(uri);
            }
          }
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const uri = await openNativeGallery();
            if (uri) {
              await saveNewPhoto(uri);
            }
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const saveNewPhoto = async (uri: string) => {
    setSellerPhoto(uri);
    try {
      const db = getFirebaseFirestore();
      if (db && currentUser?.uid) {
        await db.collection('users').doc(currentUser.uid).set({
          photoURL: uri,
          profilePhoto: uri,
          updatedAt: Date.now()
        }, { merge: true });
        Alert.alert('Success', 'Profile picture updated successfully!');
      }
    } catch (err: any) {
      console.warn('Failed to save profile photo to Firestore:', err);
    }
  };

  const handleStartChat = () => {
    if (!currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to message this seller.');
      return;
    }
    const samplePart = activeListings[0] || {
      id: 'general',
      title: 'Direct Seller Inquiry',
      price: 0,
      imageUrl: '',
      sellerId: sellerId,
      sellerName: sellerName,
    };
    navigation.navigate('ChatRoom', { part: samplePart });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* 1. Compact Header Card */}
      <Surface style={styles.headerCard} elevation={1}>
        <View style={styles.profileRow}>
          {/* Max 64px avatar with social media popup tap capability or native camera/gallery upload if own profile */}
          <TouchableOpacity 
            style={styles.avatarWrap} 
            activeOpacity={0.8}
            onPress={() => {
              if (isOwnProfile) {
                handleUpdateProfilePhoto();
              } else {
                setIsProfilePopupOpen(true);
              }
            }}
          >
            {sellerPhoto ? (
              <Image source={{ uri: sellerPhoto }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>
                  {(sellerName || 'S').slice(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.avatarZoomBadge}>
              <Icon source={isOwnProfile ? "camera" : "magnify"} size={12} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Streamlined single column info */}
          <View style={styles.infoCol}>
            <View style={styles.nameRow}>
              <Text variant="titleMedium" style={styles.sellerName} numberOfLines={1}>
                {sellerName}
              </Text>
              <Icon source="check-circle" size={16} color="#1565FF" />
            </View>
            <View style={styles.metaRow}>
              <Icon source="calendar-outline" size={14} color="#64748B" />
              <Text style={styles.metaText}>Verified Auto Seller</Text>
            </View>
          </View>
        </View>

        {/* 2. Social Metrics Row: Followers, Following, Active Listings */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricNumber}>{followersCount}</Text>
            <Text style={styles.metricLabel}>Followers</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricNumber}>{followingCount}</Text>
            <Text style={styles.metricLabel}>Following</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricNumber, { color: '#1565FF' }]}>{activeListings.length}</Text>
            <Text style={styles.metricLabel}>Active Parts</Text>
          </View>
        </View>

        {/* 3. Dynamic Action Buttons Row */}
        {isOwnProfile ? (
          <View style={styles.actionRow}>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('SellPart')}
              buttonColor="#1565FF"
              textColor="#FFFFFF"
              style={styles.actionBtn}
              icon="plus-box-outline"
              compact
            >
              Post New Ad
            </Button>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('MyAdsTab')}
              textColor="#0F172A"
              style={[styles.actionBtn, { borderColor: '#CBD5E1' }]}
              icon="format-list-bulleted-square"
              compact
            >
              My Ads
            </Button>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <Button
              mode={isFollowing ? 'outlined' : 'contained'}
              onPress={handleToggleFollow}
              loading={followLoading}
              buttonColor={isFollowing ? undefined : '#1565FF'}
              textColor={isFollowing ? '#0F172A' : '#FFFFFF'}
              style={styles.actionBtn}
              icon={isFollowing ? 'account-check' : 'account-plus'}
              compact
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
            <Button
              mode="contained"
              onPress={handleStartChat}
              buttonColor="#0B1220"
              textColor="#FFFFFF"
              style={styles.actionBtn}
              icon="chat"
              compact
            >
              Chat
            </Button>
          </View>
        )}
      </Surface>

      {/* 4. Active Listings Feed directly under action bar */}
      <View style={styles.listingsSection}>
        <Text variant="titleSmall" style={styles.sectionHeading}>
          ACTIVE LISTINGS ({activeListings.length})
        </Text>

        {loading ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#1565FF" />
          </View>
        ) : activeListings.length === 0 ? (
          <Surface style={styles.emptyCard} elevation={0}>
            <Icon source="package-variant-closed" size={32} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No active spare parts listed</Text>
            <Text style={styles.emptySub}>Follow this seller to get notified about future parts.</Text>
          </Surface>
        ) : (
          <View style={styles.grid}>
            {activeListings.map((part) => (
              <TouchableOpacity
                key={part.id}
                style={styles.partCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('ProductDetail', { part })}
              >
                <Image
                  source={{ uri: part.imageUrl || part.images?.[0] || part.imageUrls?.[0] || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=300' }}
                  style={styles.partImage}
                  resizeMode="cover"
                />
                <View style={styles.partInfo}>
                  <Text style={styles.partTitle} numberOfLines={2}>{part.title}</Text>
                  <Text style={styles.partBrand} numberOfLines={1}>{part.carBrand} {part.carModel}</Text>
                  <Text style={styles.partPrice}>₹{Number(part.price || 0).toLocaleString('en-IN')}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* User Profile Popup Modal showing only photo with tap outside / back button close */}
      <UserProfilePopupModal
        visible={isProfilePopupOpen}
        onDismiss={() => setIsProfilePopupOpen(false)}
        userPhoto={sellerPhoto}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerCard: {
    margin: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    position: 'relative',
    borderWidth: 2,
    borderColor: '#1565FF',
    backgroundColor: '#0B1220',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
  },
  avatarZoomBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#1565FF',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 24 : 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  viewerCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerTitleWrap: {
    alignItems: 'center',
  },
  viewerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewerSubTitle: {
    color: '#94A3B8',
    fontSize: 12,
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  infoCol: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerName: {
    fontWeight: 'bold',
    color: '#0F172A',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 3,
  },
  metaDot: {
    color: '#CBD5E1',
    marginHorizontal: 4,
    fontSize: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    marginTop: 1,
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
  },
  listingsSection: {
    paddingHorizontal: 12,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#334155',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  partCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  partImage: {
    width: '100%',
    aspectRatio: 1.15,
    backgroundColor: '#F1F5F9',
  },
  partInfo: {
    padding: 8,
  },
  partTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0F172A',
    lineHeight: 15,
  },
  partBrand: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  partPrice: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1565FF',
    marginTop: 4,
  },
  reviewCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
});