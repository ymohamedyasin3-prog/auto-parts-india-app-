import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  SafeAreaView,
  Share,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { getFirebaseAuth, getFirebaseFirestore, getCurrentUser, setCurrentAuthUser } from '../services/firebase';
import { UserProfilePopupModal } from '../components/UserProfilePopupModal';
import { EditProfileModal } from '../components/EditProfileModal';
import { EmptyListingsIllustration } from '../components/EmptyListingsIllustration';
import { ProfileSkeleton } from '../components/SkeletonLoaders';
import { openNativeCamera, openNativeGallery } from '../services/imagePickerService';
import { uploadImageToCloudinary } from '../services/cloudinary';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SellerProfileScreen({ route, navigation }: any) {
  const { seller, sellerId: paramSellerId, sellerName: paramSellerName } = route.params || {};
  const sellerId = seller?.id || paramSellerId;
  const initialSellerName = seller?.name || seller?.displayName || paramSellerName || 'Auto Parts India User';
  const initialSellerPhoto = seller?.photoURL || seller?.profilePhoto || null;
  const initialSellerLocation = seller?.location || seller?.district || 'India';

  const [sellerName, setSellerName] = useState(initialSellerName);
  const [sellerPhoto, setSellerPhoto] = useState<string | null>(initialSellerPhoto);
  const [sellerHandle, setSellerHandle] = useState<string>('autouser1');
  const [sellerLocation, setSellerLocation] = useState(initialSellerLocation);
  const [sellerBio, setSellerBio] = useState<string>('');
  const [sellerPhone, setSellerPhone] = useState<string>('');
  const [memberSinceDate, setMemberSinceDate] = useState<string>('Jan 2024');
  const [loginProvider, setLoginProvider] = useState<'Google' | 'Email' | 'Phone'>('Google');

  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  const [activeListings, setActiveListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const currentUser = getCurrentUser();
  const [resolvedUid, setResolvedUid] = useState<string | undefined>(sellerId || currentUser?.uid);
  const isOwnProfile = !sellerId || (resolvedUid && currentUser?.uid === resolvedUid);
  const targetUid = sellerId || resolvedUid || currentUser?.uid;

  // Format creation timestamp into "Mon Year" (e.g., "Jan 2024")
  const formatMemberSince = (timestampOrDateString?: any): string => {
    try {
      if (!timestampOrDateString) return 'Jan 2024';
      const date = typeof timestampOrDateString === 'number' 
        ? new Date(timestampOrDateString) 
        : new Date(timestampOrDateString);
      if (isNaN(date.getTime())) return 'Jan 2024';
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch (_) {
      return 'Jan 2024';
    }
  };

  useEffect(() => {
    const authInst = getFirebaseAuth();
    if (authInst && typeof authInst.onAuthStateChanged === 'function') {
      const unsub = authInst.onAuthStateChanged((u) => {
        if (u && !sellerId) {
          setResolvedUid(u.uid);
          if (u.displayName && !sellerName) setSellerName(u.displayName);
          if (u.photoURL && !sellerPhoto) setSellerPhoto(u.photoURL);
        }
      });
      return unsub;
    }
  }, [sellerId]);

  useEffect(() => {
    let isMounted = true;
    let unsubFollowers = () => {};
    let unsubFollowing = () => {};
    let unsubMyFollow = () => {};
    let unsubUserDoc = () => {};

    // Safety timeout: ensure skeleton disappears within 1.5s max even on slow networks
    const timer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 1500);

    const fetchSellerData = async () => {
      try {
        const activeTarget = targetUid || getCurrentUser()?.uid;
        if (!activeTarget) {
          if (isMounted) setLoading(false);
          return;
        }

        const db = getFirebaseFirestore();
        if (!db || typeof db.collection !== 'function') {
          if (isMounted) setLoading(false);
          return;
        }

        // 1. Real-time User doc listener
        try {
          unsubUserDoc = db.collection('users').doc(activeTarget).onSnapshot((userDoc: any) => {
            const exists = typeof userDoc?.exists === 'function' ? userDoc.exists() : Boolean(userDoc?.exists);
            if (exists && isMounted) {
              const userData = typeof userDoc?.data === 'function' ? userDoc.data() : userDoc?.data;
              if (userData) {
                const photo = userData.customPhoto || userData.profilePhoto || userData.photoURL || userData.profileImageUrl;
                if (photo) setSellerPhoto(photo);
                if (userData.displayName || userData.name) {
                  setSellerName(userData.displayName || userData.name);
                }
                if (userData.location) setSellerLocation(userData.location);
                if (userData.bio) setSellerBio(userData.bio);
                if (userData.phone) setSellerPhone(userData.phone);

                // Handle / Username
                if (userData.username || userData.handle) {
                  setSellerHandle(userData.username || userData.handle);
                } else if (userData.email) {
                  const prefix = userData.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
                  setSellerHandle(prefix || 'autouser1');
                } else if (userData.displayName) {
                  const prefix = userData.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '');
                  setSellerHandle(prefix || 'autouser1');
                }

                // Member Since date
                if (userData.createdAt || userData.memberSince) {
                  setMemberSinceDate(formatMemberSince(userData.createdAt || userData.memberSince));
                }

                // Login provider detection
                if (userData.provider === 'google' || userData.authProvider === 'google.com' || userData.email?.includes('@gmail.com')) {
                  setLoginProvider('Google');
                } else if (userData.phone && !userData.email) {
                  setLoginProvider('Phone');
                } else {
                  setLoginProvider('Email');
                }
              }
            }
            if (isMounted) setLoading(false);
          }, (err: any) => {
            console.warn('User doc listener error:', err);
            if (isMounted) setLoading(false);
          });
        } catch (_) {
          if (isMounted) setLoading(false);
        }

        // 2. Fetch seller listings
        try {
          const q = db.collection('spareParts').where('sellerId', '==', activeTarget);
          const listingsSnap = await q.get();
          const items: any[] = [];
          if (listingsSnap) {
            listingsSnap.forEach((d: any) => {
              const data = typeof d.data === 'function' ? d.data() : d.data;
              items.push({ id: d.id, ...data });
            });
          }

          if (isMounted) {
            setActiveListings(items.filter((it: any) => !it.sold && it.status !== 'removed'));
          }
        } catch (e) {
          console.warn('Listings fetch error:', e);
        }

        // 3. Set up real-time listener for Followers count
        try {
          unsubFollowers = db.collection('follows').where('followingId', '==', activeTarget).onSnapshot((snap: any) => {
            if (isMounted && snap) {
              setFollowersCount(snap.size || 0);
            }
          }, () => {});
        } catch (_) {}

        // 4. Set up real-time listener for Following count
        try {
          unsubFollowing = db.collection('follows').where('followerId', '==', activeTarget).onSnapshot((snap: any) => {
            if (isMounted && snap) {
              setFollowingCount(snap.size || 0);
            }
          }, () => {});
        } catch (_) {}

        // 5. Follow status for visitor
        const currentU = getCurrentUser();
        if (currentU?.uid && currentU.uid !== activeTarget) {
          try {
            unsubMyFollow = db.collection('follows').doc(`${currentU.uid}_${activeTarget}`).onSnapshot((docSnap: any) => {
              if (isMounted) {
                const exists = typeof docSnap?.exists === 'function' ? docSnap.exists() : Boolean(docSnap?.exists);
                setIsFollowing(Boolean(exists));
              }
            }, () => {});
          } catch (_) {}
        }
      } catch (err) {
        console.warn('Error fetching seller profile data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSellerData();

    return () => {
      isMounted = false;
      clearTimeout(timer);
      try { unsubUserDoc(); } catch (_) {}
      try { unsubFollowers(); } catch (_) {}
      try { unsubFollowing(); } catch (_) {}
      try { unsubMyFollow(); } catch (_) {}
    };
  }, [targetUid, resolvedUid, currentUser?.uid]);

  const handleShareProfile = async () => {
    try {
      await Share.share({
        title: `${sellerName} - Auto Parts India`,
        message: `Check out ${sellerName} (@${sellerHandle}) on Auto Parts India Marketplace!\nExplore available genuine spare parts and automotive accessories.`,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  const handleToggleFollow = async () => {
    if (!currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to follow this seller.');
      return;
    }
    if (isOwnProfile) return;

    const followId = `${currentUser.uid}_${targetUid}`;
    const previousState = isFollowing;
    const previousFollowersCount = followersCount;

    // Optimistic UI update
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
            followingId: targetUid,
            followerName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Buyer',
            followerPhoto: currentUser.photoURL || currentUser.profilePhoto || '',
            createdAt: Date.now(),
          }, { merge: true });

          try {
            await db.collection('notifications').doc(`follow_${followId}`).set({
              id: `follow_${followId}`,
              recipientId: targetUid,
              senderId: currentUser.uid,
              senderName: currentUser.displayName || currentUser.email?.split('@')[0] || 'A buyer',
              senderPhoto: currentUser.photoURL || currentUser.profilePhoto || '',
              text: `${currentUser.displayName || currentUser.email?.split('@')[0] || 'A buyer'} started following you.`,
              type: 'new_follower',
              createdAt: Date.now(),
              read: false,
            }, { merge: true });
          } catch (_) {}
        }
      }
    } catch (err: any) {
      console.warn('Follow error:', err);
      setIsFollowing(previousState);
      setFollowersCount(previousFollowersCount);
      Alert.alert('Error', 'Unable to update follow status.');
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
      sellerId: targetUid,
      sellerName: sellerName,
    };
    navigation.navigate('ChatRoom', { part: samplePart });
  };

  const handleProfilePhotoPress = () => {
    if (isOwnProfile) {
      setIsEditProfileModalOpen(true);
    } else {
      setIsPhotoViewerOpen(true);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. Top Navigation Bar (Back Arrow on Left, Share Icon on Right) */}
      <View style={styles.topNavBar}>
        <TouchableOpacity
          style={styles.navIconBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon source="arrow-left" size={26} color="#0F172A" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navIconBtn}
          onPress={handleShareProfile}
          activeOpacity={0.7}
        >
          <Icon source="share-variant-outline" size={24} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ProfileSkeleton />
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
        {/* 2. Profile Details Header Block */}
        <View style={styles.profileHeaderBlock}>
          {/* Avatar and Name/Handle Row */}
          <View style={styles.identityRow}>
            {/* Avatar on Left */}
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={handleProfilePhotoPress}
              activeOpacity={0.85}
            >
              {sellerPhoto ? (
                <Image source={{ uri: sellerPhoto }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarBlueCircle}>
                  <Icon source="account" size={46} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>

            {/* Display Name & Handle */}
            <View style={styles.nameContainer}>
              <Text style={styles.sellerDisplayName} numberOfLines={2}>
                {sellerName}
              </Text>
              <Text style={styles.sellerHandleText} numberOfLines={1}>
                @{sellerHandle}
              </Text>
            </View>
          </View>

          {/* Metadata Rows matching screenshot */}
          <View style={styles.metaListContainer}>
            {/* Row 1: Member Since */}
            <View style={styles.metaRow}>
              <View style={styles.metaIconCol}>
                <Icon source="calendar-outline" size={22} color="#0F172A" />
              </View>
              <View style={styles.metaTextCol}>
                <Text style={styles.metaTitle}>Member Since</Text>
                <Text style={styles.metaValue}>{memberSinceDate}</Text>
              </View>
            </View>

            {/* Row 2: Followers / Following */}
            <View style={styles.metaRow}>
              <View style={styles.metaIconCol}>
                <Icon source="account-group-outline" size={22} color="#0F172A" />
              </View>
              <View style={styles.followersRow}>
                <Text style={styles.metaFollowText}>{followersCount} Followers</Text>
                <View style={styles.followDivider} />
                <Text style={styles.metaFollowText}>{followingCount} Following</Text>
              </View>
            </View>

            {/* Row 3: Logged in with */}
            <View style={styles.metaRow}>
              <View style={styles.metaTextCol}>
                <Text style={styles.metaSubLabel}>User logged in with</Text>
                <View style={styles.providerRow}>
                  {loginProvider === 'Google' ? (
                    <View style={styles.googleIconBox}>
                      <Text style={styles.googleG}>G</Text>
                    </View>
                  ) : (
                    <Icon
                      source={loginProvider === 'Phone' ? 'phone' : 'email-outline'}
                      size={18}
                      color="#1565FF"
                    />
                  )}
                  <Text style={styles.providerText}>{loginProvider}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Button: Edit Profile (Own Profile) or Follow / Chat (Visitor) */}
          {isOwnProfile ? (
            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={() => setIsEditProfileModalOpen(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.editProfileBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.visitorActionsRow}>
              <TouchableOpacity
                style={[styles.visitorBtn, isFollowing ? styles.followingBtn : styles.followBtn]}
                onPress={handleToggleFollow}
                activeOpacity={0.85}
              >
                <Icon
                  source={isFollowing ? 'account-check' : 'account-plus'}
                  size={18}
                  color={isFollowing ? '#0F172A' : '#FFFFFF'}
                />
                <Text style={[styles.visitorBtnText, isFollowing && styles.followingBtnText]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.visitorBtn, styles.chatBtn]}
                onPress={handleStartChat}
                activeOpacity={0.85}
              >
                <Icon source="chat" size={18} color="#FFFFFF" />
                <Text style={styles.visitorBtnText}>Message</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 3. Gray Horizontal Divider Bar */}
        <View style={styles.sectionDividerBar} />

        {/* 4. Active Listings or Empty State */}
        <View style={styles.listingsSection}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1565FF" />
            </View>
          ) : activeListings.length === 0 ? (
            /* Empty State matching Screenshot 1 */
            <View style={styles.emptyStateCard}>
              <EmptyListingsIllustration size={170} />

              <Text style={styles.emptyHeadline}>
                {isOwnProfile ? "You haven't listed anything yet" : 'No spare parts listed yet'}
              </Text>

              <Text style={styles.emptySubtitle}>
                Let go of what you don't use anymore
              </Text>

              {isOwnProfile && (
                <TouchableOpacity
                  style={styles.startSellingBtn}
                  onPress={() => navigation.navigate('SellPart')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.startSellingBtnText}>Start Selling</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            /* Active Listings Grid */
            <View style={styles.listingsGrid}>
              <Text style={styles.listingsHeading}>
                ACTIVE SPARE PARTS ({activeListings.length})
              </Text>

              <View style={styles.gridContainer}>
                {activeListings.map((part) => (
                  <TouchableOpacity
                    key={part.id}
                    style={styles.partCard}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('ProductDetail', { part })}
                  >
                    <Image
                      source={{
                        uri:
                          part.imageUrl ||
                          part.images?.[0] ||
                          part.imageUrls?.[0] ||
                          'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=300',
                      }}
                      style={styles.partImage}
                      resizeMode="cover"
                    />
                    <View style={styles.partInfo}>
                      <Text style={styles.partPrice}>
                        ₹{Number(part.price || 0).toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.partTitle} numberOfLines={2}>
                        {part.title}
                      </Text>
                      <Text style={styles.partSub} numberOfLines={1}>
                        {part.carBrand} {part.carModel} • {part.location || 'India'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      )}

      {/* Profile Photo Viewer Popup */}
      <UserProfilePopupModal
        visible={isPhotoViewerOpen}
        onDismiss={() => setIsPhotoViewerOpen(false)}
        userPhoto={sellerPhoto}
        userName={sellerName}
      />

      {/* Edit Profile Full-Flow Modal */}
      <EditProfileModal
        visible={isEditProfileModalOpen}
        onDismiss={() => setIsEditProfileModalOpen(false)}
        initialName={sellerName}
        initialPhoto={sellerPhoto}
        initialBio={sellerBio}
        initialPhone={sellerPhone}
        initialLocation={sellerLocation}
        onSaveSuccess={(data) => {
          setSellerName(data.displayName);
          if (data.photoURL !== undefined) setSellerPhoto(data.photoURL || null);
          if (data.bio !== undefined) setSellerBio(data.bio);
          if (data.phone !== undefined) setSellerPhone(data.phone);
          if (data.location !== undefined) setSellerLocation(data.location);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  navIconBtn: {
    padding: 6,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  profileHeaderBlock: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrap: {
    width: 78,
    height: 78,
    borderRadius: 39,
    position: 'relative',
  },
  avatarImg: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  avatarBlueCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#1565FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameContainer: {
    flex: 1,
    marginLeft: 18,
  },
  sellerDisplayName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 26,
  },
  sellerHandleText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  metaListContainer: {
    marginTop: 4,
    marginBottom: 20,
    gap: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIconCol: {
    width: 32,
    alignItems: 'flex-start',
  },
  metaTextCol: {
    flex: 1,
  },
  metaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  metaValue: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 1,
  },
  followersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metaFollowText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
  },
  followDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 14,
  },
  metaSubLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 6,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  googleIconBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EA4335',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  providerText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  editProfileBtn: {
    backgroundColor: '#0055D4',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  editProfileBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  visitorActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  visitorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  followBtn: {
    backgroundColor: '#0055D4',
  },
  followingBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  chatBtn: {
    backgroundColor: '#0F172A',
  },
  visitorBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  followingBtnText: {
    color: '#0F172A',
  },
  sectionDividerBar: {
    height: 8,
    backgroundColor: '#F1F5F9',
    width: '100%',
  },
  listingsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyHeadline: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 18,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
  },
  startSellingBtn: {
    borderWidth: 1.5,
    borderColor: '#0055D4',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 40,
    marginTop: 20,
    backgroundColor: '#FFFFFF',
  },
  startSellingBtnText: {
    color: '#0055D4',
    fontSize: 15,
    fontWeight: '700',
  },
  listingsGrid: {
    width: '100%',
  },
  listingsHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  partCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  partImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#F8FAFC',
  },
  partInfo: {
    padding: 10,
  },
  partPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  partTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
    lineHeight: 18,
  },
  partSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
});
