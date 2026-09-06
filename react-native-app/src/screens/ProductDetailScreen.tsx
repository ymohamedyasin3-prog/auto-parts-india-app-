import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, Linking, Image, Share, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text, Button, Card, Avatar, Divider, Chip, IconButton, useTheme } from 'react-native-paper';
import GMap from '../components/GMap';
import { EditListingModal } from '../components/EditListingModal';
import RatingModal from '../components/RatingModal';
import { ImageGalleryModal } from '../components/ImageGalleryModal';
import { UserProfilePopupModal } from '../components/UserProfilePopupModal';
import ImageView from 'react-native-image-viewing';
import { getFirebaseFirestore, getCurrentUser } from '../services/firebase';
import { useFavorites } from '../services/favorites';
import { addRecentlyViewedPart } from '../services/recentlyViewed';
import { 
  getCurrentLocation, 
  formatLocationBadgeWithDistance, 
  openLocationInExternalMaps,
  LocationCoords 
} from '../services/location';

export default function ProductDetailScreen({ route, navigation, user: initialUser }: any) {
  const { part: initialPart, partId: routePartId } = route.params || {};
  const [part, setPart] = useState<any>(initialPart || null);
  const [loadingDoc, setLoadingDoc] = useState<boolean>(!initialPart && Boolean(routePartId));
  const [userCoords, setUserCoords] = useState<LocationCoords | null>(null);
  const [liveSellerPhoto, setLiveSellerPhoto] = useState<string | null>(null);

  useEffect(() => {
    const sellerId = part?.sellerId || part?.ownerId || part?.userId;
    if (!sellerId) return;

    let unsubSeller = () => {};
    try {
      const db = getFirebaseFirestore();
      if (db && typeof db.collection === 'function') {
        unsubSeller = db.collection('users').doc(sellerId).onSnapshot((docSnap: any) => {
          if (docSnap && docSnap.exists) {
            const uData = docSnap.data();
            if (uData?.photoURL || uData?.profilePhoto) {
              setLiveSellerPhoto(uData.photoURL || uData.profilePhoto);
            }
          }
        }, () => {});
      }
    } catch (_) {}

    return () => {
      try { unsubSeller(); } catch (_) {}
    };
  }, [part?.sellerId, part?.ownerId, part?.userId]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [profilePopupVisible, setProfilePopupVisible] = useState(false);
  const [profileViewerVisible, setProfileViewerVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const user = initialUser || getCurrentUser();
  const { favorites, toggleFavorite } = useFavorites();
  const isFav = favorites.includes(part?.id);

  // Fetch device GPS coords for real distance calculation
  useEffect(() => {
    getCurrentLocation().then((coords) => {
      if (coords) setUserCoords(coords);
    });
  }, []);

  useEffect(() => {
    const targetId = initialPart?.id || routePartId;
    if (!targetId) {
      setLoadingDoc(false);
      return;
    }

    if (initialPart) {
      setPart(initialPart);
      addRecentlyViewedPart(initialPart);
    }

    let unsub = () => {};
    try {
      const db = getFirebaseFirestore();
      if (db && typeof db.collection === 'function') {
        unsub = db.collection('spareParts').doc(targetId).onSnapshot((docSnap: any) => {
          const isExisting = typeof docSnap?.exists === 'function' ? docSnap.exists() : Boolean(docSnap?.exists);
          if (isExisting) {
            const data = { id: docSnap.id, ...docSnap.data() };
            setPart(data);
            addRecentlyViewedPart(data);
          }
          setLoadingDoc(false);
        }, (err: any) => {
          console.warn('[ProductDetailScreen] Realtime sync error:', err);
          setLoadingDoc(false);
        });
      } else {
        setLoadingDoc(false);
      }
    } catch (e) {
      console.warn('[ProductDetailScreen] Realtime sync setup error:', e);
      setLoadingDoc(false);
    }
    return () => {
      try { unsub(); } catch (_) {}
    };
  }, [initialPart?.id, routePartId]);

  if (loadingDoc) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: '#FFFFFF' }]}>
        <ActivityIndicator size="large" color="#1565FF" />
        <Text variant="bodyMedium" style={{ marginTop: 12, color: '#64748B' }}>
          Loading part details...
        </Text>
      </View>
    );
  }

  if (!part) {
    return (
      <View style={styles.errorContainer}>
        <Text variant="titleMedium">Spare part details not available.</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          Go Back
        </Button>
      </View>
    );
  }

  // Determine ownership using the authenticated user's ID/UID and listing's owner/seller ID
  const currentUserId = user?.uid || user?.id || null;
  const listingOwnerId = part.ownerId || part.sellerId || part.userId || null;
  const isOwner = Boolean(currentUserId && listingOwnerId && String(currentUserId) === String(listingOwnerId));

  const distanceInfo = formatLocationBadgeWithDistance(part, userCoords);

  const handleCall = () => {
    if (part.contactPhone) {
      Alert.alert(
        'Call Seller',
        `Do you want to call ${part.contactName || 'the seller'} at ${part.contactPhone}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Call Now',
            onPress: () => Linking.openURL(`tel:${part.contactPhone}`),
          },
        ]
      );
    } else {
      Alert.alert('Contact', 'Phone number not listed for this seller.');
    }
  };

  const handleChat = async () => {
    if (!user) {
      navigation.navigate('Auth');
      return;
    }
    const currentUid = user.uid || user.id;
    const sellerUid = part.sellerId || part.userId || part.ownerId || 'seller';
    const currentName = user.displayName || user.name || user.email?.split('@')[0] || 'Buyer';
    const sellerName = part.contactName || part.sellerName || 'Verified Seller';
    const chatId = `${currentUid}_${sellerUid}_${part.id}`;
    
    try {
      const db = getFirebaseFirestore();
      if (db && typeof db.collection === 'function') {
        const chatDocRef = db.collection('chats').doc(chatId);
        await chatDocRef.set({
          id: chatId,
          partId: part.id || '',
          partTitle: part.title || 'Spare Part',
          partImageUrl: part.imageUrl || (part.imageUrls && part.imageUrls[0]) || '',
          partPrice: Number(part.price) || 0,
          buyerId: currentUid,
          buyerName: currentName,
          buyerPhoto: user.photoURL || '',
          sellerId: sellerUid,
          sellerName: sellerName,
          sellerPhoto: part.sellerPhoto || '',
          participants: [currentUid, sellerUid],
          lastMessageText: '',
          lastMessageAt: Date.now()
        }, { merge: true });
      }
    } catch (e) {
      console.warn('[ProductDetailScreen] Pre-creating chat doc:', e);
    }

    navigation.navigate('ChatRoom', { 
      chatId, 
      part: {
        id: part.id,
        title: part.title || 'Spare Part',
        imageUrl: part.imageUrl || (part.imageUrls && part.imageUrls[0]) || '',
        price: Number(part.price) || 0,
        sellerId: sellerUid,
        sellerName: sellerName,
        contactPhone: part.contactPhone || ''
      },
      chat: {
        id: chatId,
        partId: part.id || '',
        partTitle: part.title || 'Spare Part',
        partImageUrl: part.imageUrl || (part.imageUrls && part.imageUrls[0]) || '',
        partPrice: Number(part.price) || 0,
        buyerId: currentUid,
        buyerName: currentName,
        sellerId: sellerUid,
        sellerName: sellerName,
      }
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: part.title,
        message: `Check out this spare part on Auto Parts India: ${part.title} for ₹${part.price?.toLocaleString('en-IN')}`,
      });
    } catch (error) {
      console.warn('Share error:', error);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to permanently delete this listing? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              if (part.id) {
                const db = getFirebaseFirestore();
                if (db && typeof db.collection === 'function') {
                  await db.collection('spareParts').doc(part.id).delete();
                }
              }
              Alert.alert('Listing Deleted', 'Your spare part listing has been permanently deleted.');
              navigation.goBack();
            } catch (err: any) {
              console.warn('[ProductDetailScreen] Delete error:', err);
              Alert.alert('Error', err.message || 'Failed to delete listing. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const partLat = part.latitude || part.lat;
  const partLng = part.longitude || part.lng;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.imageHeader}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            setGalleryIndex(0);
            setGalleryVisible(true);
          }}
        >
          <Image 
            source={{ uri: part.imageUrl || part.images?.[0] || part.imageUrls?.[0] || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=800' }} 
            style={styles.image} 
          />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.favFab, isFav && styles.favFabActive]} 
          onPress={() => toggleFavorite(part.id)}
          activeOpacity={0.8}
        >
          <IconButton 
            icon={isFav ? "heart" : "heart-outline"} 
            iconColor={isFav ? "#EF4444" : "#475569"} 
            size={20} 
            style={{ margin: 0 }}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareFab} onPress={handleShare} activeOpacity={0.8}>
          <IconButton icon="share-variant" iconColor="#0B1220" size={20} style={{ margin: 0 }} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text variant="headlineSmall" style={styles.title}>{part.title}</Text>
        <Text variant="headlineMedium" style={styles.price}>₹{part.price?.toLocaleString('en-IN')}</Text>

        {/* Distance & Location Pill Banner */}
        <View style={styles.locationBanner}>
          <IconButton icon="map-marker-distance" size={18} iconColor="#1565FF" style={{ margin: 0 }} />
          <Text style={styles.locationBannerText}>
            {distanceInfo.text} {distanceInfo.distanceText ? `• ${distanceInfo.distanceText}` : ''}
          </Text>
        </View>

        <View style={styles.badgeRow}>
          <Chip icon="car" style={styles.chip}>{part.carBrand} {part.carModel}</Chip>
          <Chip icon="shape" style={styles.chip}>{part.category}</Chip>
          <Chip icon="checkbox-marked-circle-outline" style={styles.chip}>{part.condition || 'Used'}</Chip>
          <Chip icon="map-marker" style={styles.chip}>{part.district || part.location || 'India'}</Chip>
        </View>

        <Divider style={styles.divider} />

        <Text variant="titleMedium" style={styles.sectionTitle}>Part Specifications</Text>
        <View style={styles.specGrid}>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>Brand</Text>
            <Text style={styles.specVal}>{part.carBrand || 'N/A'}</Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>Model</Text>
            <Text style={styles.specVal}>{part.carModel || 'N/A'}</Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>Condition</Text>
            <Text style={styles.specVal}>{part.condition || 'Used'}</Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>Part No.</Text>
            <Text style={styles.specVal}>{part.partNumber || 'Original OEM'}</Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        <Text variant="titleMedium" style={styles.sectionTitle}>Description</Text>
        <Text variant="bodyMedium" style={styles.description}>
          {part.description || 'Verified auto part available for immediate purchase or pickup. Contact seller for fitment details and compatibility.'}
        </Text>

        <Divider style={styles.divider} />

        {/* Interactive Map & Seller Location Details */}
        <View style={styles.mapSectionHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Seller Location & Map</Text>
          {partLat && partLng ? (
            <TouchableOpacity 
              style={styles.openNavBtn}
              onPress={() => openLocationInExternalMaps(partLat, partLng, part.title)}
            >
              <IconButton icon="directions" size={16} iconColor="#1565FF" style={{ margin: 0 }} />
              <Text style={styles.openNavText}>Get Directions</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <GMap latitude={partLat} longitude={partLng} state={part.state} district={part.district || part.location} title={`${part.title} - ${part.location || 'India'}`} interactive={false} style={{ marginBottom: 16 }} height={135} />

        <Divider style={styles.divider} />

        <Text variant="titleMedium" style={styles.sectionTitle}>Seller Information</Text>
        <Card style={styles.sellerCard}>
          <Card.Title
            title={part.contactName || part.sellerEmail || 'Verified Parts Dealer'}
            subtitle="Tap photo to view popup"
            left={(props) => {
              const sPhoto = liveSellerPhoto || part.sellerPhotoURL || part.sellerPhoto || part.sellerAvatar || part.photoURL;
              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setProfilePopupVisible(true)}
                  style={{ position: 'relative' }}
                >
                  {sPhoto ? (
                    <Image
                      source={{ uri: sPhoto }}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        borderWidth: 2,
                        borderColor: '#1565FF',
                      }}
                    />
                  ) : (
                    <Avatar.Icon {...props} icon="account" size={48} style={{ backgroundColor: "#1565FF" }} />
                  )}
                  <View
                    style={{
                      position: 'absolute',
                      bottom: -1,
                      right: -1,
                      backgroundColor: '#1565FF',
                      borderRadius: 8,
                      width: 16,
                      height: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1.5,
                      borderColor: '#FFFFFF',
                    }}
                  >
                    <IconButton icon="magnify" size={10} iconColor="#FFFFFF" style={{ margin: 0, padding: 0 }} />
                  </View>
                </TouchableOpacity>
              );
            }}
            right={(props) => (
              <TouchableOpacity
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 8 }}
                onPress={() => {
                  const sId = part.sellerId || part.userId || part.ownerId || 'seller';
                  const sName = part.contactName || part.sellerName || part.sellerEmail || 'Automotive Seller';
                  const sLoc = part.location || part.district || part.state || 'India';
                  const sPhoto = liveSellerPhoto || part.sellerPhotoURL || part.sellerPhoto || part.sellerAvatar || part.photoURL || null;
                  navigation.navigate('SellerProfile', {
                    seller: {
                      id: sId,
                      sellerId: sId,
                      name: sName,
                      sellerName: sName,
                      location: sLoc,
                      photoURL: sPhoto,
                      profilePhoto: sPhoto,
                      phone: part.contactPhone || part.phone,
                    },
                    sellerId: sId,
                    sellerName: sName,
                  });
                }}
              >
                <Text style={{ fontSize: 12, color: '#1565FF', fontWeight: 'bold' }}>View Profile</Text>
                <IconButton {...props} icon="chevron-right" iconColor="#1565FF" />
              </TouchableOpacity>
            )}
          />
        </Card>

        {/* Action Row: Owner (Edit/Delete) vs Buyer (Chat/Call) */}
        {isOwner ? (
          <View style={styles.actionRow}>
            <Button 
              mode="contained" 
              icon="pencil" 
              onPress={() => setEditModalVisible(true)} 
              style={[styles.actionBtn, { flex: 1, marginRight: 8 }]}
              buttonColor="#4F46E5"
              textColor="#FFFFFF"
              disabled={isDeleting}
            >
              Edit Listing
            </Button>
            <Button 
              mode="contained" 
              icon="delete-outline" 
              onPress={handleDelete} 
              style={[styles.actionBtn, { flex: 1 }]}
              buttonColor="#DC2626"
              textColor="#FFFFFF"
              loading={isDeleting}
              disabled={isDeleting}
            >
              Delete Listing
            </Button>
          </View>
        ) : (
          <View style={styles.actionColumn}>
            <View style={styles.actionRow}>
              <Button 
                mode="contained" 
                icon="message-text" 
                onPress={handleChat} 
                style={[styles.actionBtn, { flex: 1, marginRight: 8 }]}
                buttonColor="#1565FF"
                textColor="#FFFFFF"
              >
                Chat
              </Button>
              <Button 
                mode="contained" 
                icon="phone" 
                onPress={handleCall} 
                style={[styles.actionBtn, { flex: 1 }]}
                buttonColor="#0B1220"
                textColor="#FFFFFF"
              >
                Call Seller
              </Button>
            </View>

            <View style={styles.secondaryActionRow}>
              <Button
                mode="outlined"
                icon="star-outline"
                onPress={() => setRatingModalVisible(true)}
                style={{ flex: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }}
                textColor="#475569"
              >
                Rate Seller
              </Button>
            </View>
          </View>
        )}
      </View>

      {/* Rating Modal */}
      <RatingModal
        isOpen={ratingModalVisible}
        onClose={() => setRatingModalVisible(false)}
        sellerId={part.sellerId || 'seller'}
        sellerName={part.contactName || part.sellerEmail || 'Auto Seller'}
        partId={part.id}
        partTitle={part.title}
        onSuccess={() => Alert.alert('Success', 'Thank you for your rating!')}
      />

      {/* Edit Listing Modal for Owner */}
      {isOwner && (
        <EditListingModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          listing={part}
          onSuccess={() => {
            setEditModalVisible(false);
          }}
        />
      )}

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        visible={galleryVisible}
        onDismiss={() => setGalleryVisible(false)}
        part={part}
        initialIndex={galleryIndex}
        onChat={handleChat}
        onCall={handleCall}
        isOwner={isOwner}
      />

      {/* User Profile Popup Modal showing only photo with tap outside / back button close */}
      <UserProfilePopupModal
        visible={profilePopupVisible}
        onDismiss={() => setProfilePopupVisible(false)}
        userPhoto={liveSellerPhoto || part.sellerPhotoURL || part.sellerPhoto || part.sellerAvatar || part.photoURL || null}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  imageHeader: {
    position: 'relative',
    height: 280,
    backgroundColor: '#F1F5F9',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  galleryBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  galleryBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 2,
  },
  favFab: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 38,
    height: 38,
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 10,
  },
  favFabActive: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
  },
  shareFab: {
    position: 'absolute',
    top: 16,
    right: 62,
    width: 38,
    height: 38,
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 10,
  },
  content: {
    padding: 16,
  },
  title: {
    fontWeight: 'bold',
    color: '#0B1220',
    marginBottom: 6,
  },
  price: {
    fontWeight: 'bold',
    color: '#1565FF',
    marginBottom: 8,
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 12,
  },
  locationBannerText: {
    color: '#1E40AF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    backgroundColor: '#F1F5F9',
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#0B1220',
    marginBottom: 8,
  },
  mapSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  openNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  openNavText: {
    color: '#1565FF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  specItem: {
    width: '50%',
    paddingVertical: 6,
  },
  specLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  specVal: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
    marginTop: 2,
  },
  description: {
    color: '#334155',
    lineHeight: 22,
  },
  sellerCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  actionColumn: {
    marginTop: 8,
  },
  secondaryActionRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  actionBtn: {
    borderRadius: 8,
    paddingVertical: 4,
  },
});
