import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { getFirebaseAuth, getFirebaseFirestore, getCurrentUser } from '../services/firebase';
import { signOutFromGoogle } from '../services/googleAuth';
import { UserProfilePopupModal } from '../components/UserProfilePopupModal';
import { EditProfileModal } from '../components/EditProfileModal';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250';

export default function ProfileScreen({ navigation, route, user: initialUser }: any) {
  const [activeUid, setActiveUid] = useState<string | null>(initialUser?.uid || null);
  const [userEmail, setUserEmail] = useState<string>(initialUser?.email || '');
  const [displayName, setDisplayName] = useState<string>(initialUser?.displayName || 'Auto Parts India User');
  const [displayPhotoUrl, setDisplayPhotoUrl] = useState<string>(initialUser?.photoURL || DEFAULT_AVATAR);
  const [dbUserDoc, setDbUserDoc] = useState<any>(null);

  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isPopupModalVisible, setIsPopupModalVisible] = useState(false);

  const SUPER_ADMIN_EMAILS = [
    'wwwautoparts2@gmail.com',
    'www.allahforgiveness877@gmail.com',
  ];

  const isAdmin = 
    dbUserDoc?.role === 'admin' || 
    SUPER_ADMIN_EMAILS.includes(userEmail?.toLowerCase().trim());

  useEffect(() => {
    let unsubscribeAuth = () => {};
    let unsubscribeDb = () => {};

    try {
      const authInst = getFirebaseAuth();
      if (authInst && typeof authInst.onAuthStateChanged === 'function') {
        unsubscribeAuth = authInst.onAuthStateChanged((user) => {
          if (user) {
            setActiveUid(user.uid);
            setUserEmail(user.email || '');
            setDisplayName(user.displayName || 'Auto Parts India User');
            if (user.photoURL || user.profilePhoto) {
              setDisplayPhotoUrl(user.profilePhoto || user.photoURL);
            }

            const db = getFirebaseFirestore();
            if (db && typeof db.collection === 'function') {
              unsubscribeDb = db.collection('users').doc(user.uid).onSnapshot((doc: any) => {
                const exists = typeof doc?.exists === 'function' ? doc.exists() : Boolean(doc?.exists);
                if (exists) {
                  const data = typeof doc?.data === 'function' ? doc.data() : doc?.data;
                  if (data) {
                    setDbUserDoc(data);
                    if (data.displayName || data.name) setDisplayName(data.displayName || data.name);
                    const photo = data.profilePhoto || data.customPhoto || data.photoURL || data.profileImageUrl;
                    if (photo) {
                      setDisplayPhotoUrl(photo);
                    }
                  }
                }
              });
            }
          } else {
            setActiveUid(null);
            setUserEmail('');
            setDbUserDoc(null);
          }
        });
      }
    } catch (_) {}

    return () => {
      unsubscribeAuth();
      unsubscribeDb();
    };
  }, []);

  // Screen focus listener to immediately refresh profile picture when returning
  useEffect(() => {
    if (!navigation || typeof navigation.addListener !== 'function') return;
    const unsubFocus = navigation.addListener('focus', async () => {
      const current = getCurrentUser();
      if (current?.uid) {
        setActiveUid(current.uid);
        if (current.displayName) setDisplayName(current.displayName);
        if (current.email) setUserEmail(current.email);
        const curPhoto = current.profilePhoto || current.photoURL;
        if (curPhoto) setDisplayPhotoUrl(curPhoto);

        try {
          const db = getFirebaseFirestore();
          if (db && typeof db.collection === 'function') {
            const snap = await db.collection('users').doc(current.uid).get();
            const exists = typeof snap?.exists === 'function' ? snap.exists() : Boolean(snap?.exists);
            if (exists) {
              const data = typeof snap?.data === 'function' ? snap.data() : snap?.data;
              if (data) {
                setDbUserDoc(data);
                if (data.displayName || data.name) setDisplayName(data.displayName || data.name);
                const cloudPhoto = data.profilePhoto || data.customPhoto || data.photoURL || data.profileImageUrl;
                if (cloudPhoto) setDisplayPhotoUrl(cloudPhoto);
              }
            }
          }
        } catch (_) {}
      }
    });

    return unsubFocus;
  }, [navigation]);

  const handleSignOut = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOutFromGoogle();
              const authInst = getFirebaseAuth();
              if (authInst && typeof authInst.signOut === 'function') {
                await authInst.signOut();
              }
              if (navigation?.reset) {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Auth' }],
                });
              } else {
                navigation.navigate('Auth');
              }
            } catch (err: any) {
              Alert.alert('Error', 'Failed to logout.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerTitleBar}>
        <Text style={styles.headerTitle}>My Account</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileHeaderCard}>
          <TouchableOpacity 
            onPress={() => {
              const uid = activeUid || getCurrentUser()?.uid;
              if (uid) {
                navigation.navigate('SellerProfile', { sellerId: uid, sellerName: displayName });
              }
            }} 
            style={styles.avatarWrap}
            activeOpacity={0.85}
          >
            <Image 
              source={{ uri: displayPhotoUrl }} 
              style={styles.avatarImage} 
              key={displayPhotoUrl}
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.profileInfoWrap}
            activeOpacity={0.7}
            onPress={() => {
              const uid = activeUid || getCurrentUser()?.uid;
              if (uid) {
                navigation.navigate('SellerProfile', { sellerId: uid, sellerName: displayName });
              }
            }}
          >
            <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{userEmail}</Text>
            <Text style={styles.viewPublicProfileText}>View Seller Profile →</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Options List */}
        <View style={styles.menuContainer}>
          {/* Admin Panel Entry */}
          {isAdmin && (
            <>
              <TouchableOpacity 
                style={[styles.menuItem, styles.adminMenuItem]} 
                onPress={() => navigation.navigate('Admin')}
              >
                <View style={[styles.menuIconBox, { backgroundColor: '#FEF3C7' }]}>
                  <Icon source="shield-crown" size={22} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.menuItemText, { fontWeight: '700', color: '#B45309' }]}>Admin Panel</Text>
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>CONTROL</Text>
                    </View>
                  </View>
                  <Text style={styles.adminSubText}>Version Management, CMS, Users & Ads</Text>
                </View>
                <Icon source="chevron-right" size={20} color="#D97706" />
              </TouchableOpacity>
              <Divider style={styles.divider} />
            </>
          )}

          {/* Seller Store / Public Profile */}
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => {
              const uid = activeUid || getCurrentUser()?.uid;
              if (uid) {
                navigation.navigate('SellerProfile', { sellerId: uid, sellerName: displayName });
              }
            }}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#EEF2FF' }]}>
              <Icon source="store-outline" size={20} color="#4F46E5" />
            </View>
            <Text style={styles.menuItemText}>My Seller Store / Listings</Text>
            <Icon source="chevron-right" size={20} color="#CBD5E1" />
          </TouchableOpacity>

          <Divider style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('MyAdsTab')}>
            <View style={[styles.menuIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Icon source="format-list-bulleted-square" size={20} color="#0066FF" />
            </View>
            <Text style={styles.menuItemText}>My Ads</Text>
            <Icon source="chevron-right" size={20} color="#CBD5E1" />
          </TouchableOpacity>
          
          <Divider style={styles.divider} />
          
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('WishlistScreen')}>
            <View style={[styles.menuIconBox, { backgroundColor: '#FEF2F2' }]}>
              <Icon source="heart-outline" size={20} color="#DC2626" />
            </View>
            <Text style={styles.menuItemText}>Wishlist</Text>
            <Icon source="chevron-right" size={20} color="#CBD5E1" />
          </TouchableOpacity>

          <Divider style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('RecentlyViewedScreen')}>
            <View style={[styles.menuIconBox, { backgroundColor: '#F0FDF4' }]}>
              <Icon source="history" size={20} color="#16A34A" />
            </View>
            <Text style={styles.menuItemText}>Recently Viewed</Text>
            <Icon source="chevron-right" size={20} color="#CBD5E1" />
          </TouchableOpacity>

          <View style={styles.sectionGap} />

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('SettingsScreen')}>
            <View style={[styles.menuIconBox, { backgroundColor: '#F1F5F9' }]}>
              <Icon source="cog-outline" size={20} color="#475569" />
            </View>
            <Text style={styles.menuItemText}>Settings</Text>
            <Icon source="chevron-right" size={20} color="#CBD5E1" />
          </TouchableOpacity>

          <Divider style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('HelpSupportScreen')}>
            <View style={[styles.menuIconBox, { backgroundColor: '#FFFBEB' }]}>
              <Icon source="lifebuoy" size={20} color="#D97706" />
            </View>
            <Text style={styles.menuItemText}>Help & Support</Text>
            <Icon source="chevron-right" size={20} color="#CBD5E1" />
          </TouchableOpacity>

          <View style={styles.sectionGap} />

          <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
            <View style={[styles.menuIconBox, { backgroundColor: '#FEF2F2' }]}>
              <Icon source="logout" size={20} color="#DC2626" />
            </View>
            <Text style={[styles.menuItemText, { color: '#DC2626', fontWeight: '600' }]}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Profile Popup */}
      <UserProfilePopupModal
        visible={isPopupModalVisible}
        onDismiss={() => setIsPopupModalVisible(false)}
        userPhoto={displayPhotoUrl}
        userName={displayName}
      />

      {/* Edit Profile Details Modal */}
      <EditProfileModal
        visible={isEditProfileModalOpen}
        onDismiss={() => setIsEditProfileModalOpen(false)}
        initialName={displayName}
        initialPhoto={displayPhotoUrl}
        initialBio={dbUserDoc?.bio || ''}
        initialPhone={dbUserDoc?.phone || ''}
        initialLocation={dbUserDoc?.location || ''}
        onSaveSuccess={(data) => {
          setDisplayName(data.displayName);
          if (data.photoURL) setDisplayPhotoUrl(data.photoURL);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerTitleBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  avatarWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    position: 'relative',
    borderWidth: 2,
    borderColor: '#1565FF',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  profileInfoWrap: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  profileEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  viewPublicProfileText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1565FF',
    marginTop: 6,
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  adminMenuItem: {
    backgroundColor: '#FFFDF5',
  },
  adminBadge: {
    backgroundColor: '#D97706',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  adminBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  adminSubText: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 1,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
  },
  divider: {
    backgroundColor: '#F1F5F9',
    height: 1,
    marginHorizontal: 16,
  },
  sectionGap: {
    height: 8,
    backgroundColor: '#F8FAFC',
    marginVertical: 4,
  },
});
