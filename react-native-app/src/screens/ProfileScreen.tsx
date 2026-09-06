import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Image, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { getFirebaseAuth, getFirebaseFirestore, getCurrentUser } from '../services/firebase';
import { signOutFromGoogle } from '../services/googleAuth';
import { UserProfilePopupModal } from '../components/UserProfilePopupModal';
import { promptImageSourceDialog } from '../services/imagePickerService';
import { uploadImageToCloudinary } from '../services/cloudinary';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250';

export default function ProfileScreen({ navigation, route, user: initialUser }: any) {
  const [activeUid, setActiveUid] = useState<string | null>(initialUser?.uid || null);
  const [userEmail, setUserEmail] = useState<string>(initialUser?.email || '');
  const [displayName, setDisplayName] = useState<string>(initialUser?.displayName || 'User');
  const [displayPhotoUrl, setDisplayPhotoUrl] = useState<string>(initialUser?.photoURL || DEFAULT_AVATAR);
  const [dbUserDoc, setDbUserDoc] = useState<any>(null);

  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isPopupModalVisible, setIsPopupModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPhoto, setEditPhoto] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const SUPER_ADMIN_EMAILS = [
    'wwwautoparts2@gmail.com',
    'www.allahforgiveness877@gmail.com'
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
            setDisplayName(user.displayName || 'User');
            setDisplayPhotoUrl(user.photoURL || DEFAULT_AVATAR);

            const db = getFirebaseFirestore();
            if (db && typeof db.collection === 'function') {
              unsubscribeDb = db.collection('users').doc(user.uid).onSnapshot((doc: any) => {
                if (doc.exists) {
                  const data = doc.data();
                  setDbUserDoc(data);
                  if (data.displayName) setDisplayName(data.displayName);
                  if (data.photoURL || data.profilePhoto) {
                    setDisplayPhotoUrl(data.photoURL || data.profilePhoto);
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

  const syncUserPhotoAcrossListingsAndChats = async (uid: string, photoUrl: string) => {
    if (!uid || !photoUrl) return;
    try {
      const db = getFirebaseFirestore();
      if (!db || typeof db.collection !== 'function') return;

      // Update all spareParts listings posted by this user
      const partsSnap = await db.collection('spareParts').where('sellerId', '==', uid).get();
      if (partsSnap && !partsSnap.empty) {
        partsSnap.forEach((docSnap: any) => {
          docSnap.ref.update({
            sellerPhoto: photoUrl,
            sellerPhotoURL: photoUrl,
            sellerAvatar: photoUrl,
          }).catch(() => {});
        });
      }

      // Update chats where user is seller
      const sellerChatsSnap = await db.collection('chats').where('sellerId', '==', uid).get();
      if (sellerChatsSnap && !sellerChatsSnap.empty) {
        sellerChatsSnap.forEach((docSnap: any) => {
          docSnap.ref.update({ sellerPhoto: photoUrl }).catch(() => {});
        });
      }

      // Update chats where user is buyer
      const buyerChatsSnap = await db.collection('chats').where('buyerId', '==', uid).get();
      if (buyerChatsSnap && !buyerChatsSnap.empty) {
        buyerChatsSnap.forEach((docSnap: any) => {
          docSnap.ref.update({ buyerPhoto: photoUrl }).catch(() => {});
        });
      }
    } catch (err) {
      console.warn('syncUserPhotoAcrossListingsAndChats error:', err);
    }
  };

  const openEditModal = () => {
    setEditName(dbUserDoc?.displayName || displayName || '');
    setEditPhone(dbUserDoc?.phone || '');
    setEditLocation(dbUserDoc?.location || '');
    setEditPhoto(dbUserDoc?.photoURL || dbUserDoc?.profilePhoto || displayPhotoUrl || '');
    setIsEditProfileModalOpen(true);
  };

  const handlePickProfilePhoto = async () => {
    try {
      const selectedUri = await promptImageSourceDialog(
        'Profile Picture',
        'Choose Camera or Gallery to set your profile photo'
      );
      if (selectedUri) {
        setUploadingPhoto(true);
        const cloudinaryUrl = await uploadImageToCloudinary(selectedUri, 'profile_photos');
        if (cloudinaryUrl) {
          setEditPhoto(cloudinaryUrl);
          setDisplayPhotoUrl(cloudinaryUrl);
          
          if (activeUid) {
            const db = getFirebaseFirestore();
            if (db && typeof db.collection === 'function') {
              await db.collection('users').doc(activeUid).set({
                photoURL: cloudinaryUrl,
                profilePhoto: cloudinaryUrl,
                updatedAt: Date.now(),
              }, { merge: true });
            }
            const authUser = getCurrentUser();
            if (authUser && typeof authUser.updateProfile === 'function') {
              await authUser.updateProfile({ photoURL: cloudinaryUrl });
            }
            // Cascade update all listings and chats for activeUid
            await syncUserPhotoAcrossListingsAndChats(activeUid, cloudinaryUrl);
          }
          Alert.alert('Success', 'Profile picture updated successfully!');
        }
      }
    } catch (err: any) {
      console.warn('Profile photo pick error:', err);
      Alert.alert('Error', err.message || 'Failed to update profile photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfileDetails = async () => {
    if (!activeUid) return;
    setSavingProfile(true);
    try {
      const db = getFirebaseFirestore();
      if (db && typeof db.collection === 'function') {
        const payload: any = {
          displayName: editName.trim(),
          phone: editPhone.trim(),
          location: editLocation.trim(),
          updatedAt: Date.now(),
        };
        if (editPhoto.trim()) {
          payload.photoURL = editPhoto.trim();
          payload.profilePhoto = editPhoto.trim();
          setDisplayPhotoUrl(editPhoto.trim());
        }

        await db.collection('users').doc(activeUid).set(payload, { merge: true });

        // Update auth profile
        const authUser = getCurrentUser();
        if (authUser && typeof authUser.updateProfile === 'function') {
          const updatePayload: any = { displayName: editName.trim() };
          if (editPhoto.trim()) updatePayload.photoURL = editPhoto.trim();
          await authUser.updateProfile(updatePayload);
          setDisplayName(editName.trim());
        }

        if (editPhoto.trim()) {
          await syncUserPhotoAcrossListingsAndChats(activeUid, editPhoto.trim());
        }
      }
      setIsEditProfileModalOpen(false);
      setSavingProfile(false);
    } catch (err) {
      setSavingProfile(false);
      Alert.alert('Error', 'Failed to update profile.');
    }
  };

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
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeaderCard}>
          <TouchableOpacity 
            onPress={() => setIsPopupModalVisible(true)} 
            style={styles.avatarWrap}
            activeOpacity={0.8}
          >
            <Image source={{ uri: displayPhotoUrl }} style={styles.avatarImage} />
          </TouchableOpacity>
          <View style={styles.profileInfoWrap}>
            <TouchableOpacity onPress={() => {
              const uid = activeUid || getCurrentUser()?.uid;
              if (uid) {
                navigation.navigate('SellerProfile', { sellerId: uid, sellerName: displayName });
              }
            }}>
              <Text style={styles.profileName}>{displayName}</Text>
            </TouchableOpacity>
            <Text style={styles.profileEmail}>{userEmail}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <TouchableOpacity 
                style={[styles.editProfileBtn, { flex: 1, backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]} 
                onPress={() => {
                  const uid = activeUid || getCurrentUser()?.uid;
                  if (uid) {
                    navigation.navigate('SellerProfile', { sellerId: uid, sellerName: displayName });
                  }
                }}
              >
                <Icon source="eye-outline" size={14} color="#0066FF" />
                <Text style={[styles.editProfileBtnText, { color: '#0066FF' }]}>View Public Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Menu Options List */}
        <View style={styles.menuContainer}>
          {/* Admin Panel & Version Management Entry (STRICTLY HIDDEN for regular users) */}
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
      />

      {/* Edit Profile Details Modal */}
      <Modal
        visible={isEditProfileModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEditProfileModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalSheetTitle}>View & Edit Profile</Text>
              <TouchableOpacity onPress={() => setIsEditProfileModalOpen(false)}>
                <Icon source="close" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Full Name / Business Name</Text>
            <TextInput
              style={styles.textInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>Contact Phone Number</Text>
            <TextInput
              style={styles.textInput}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="e.g. +91 98765 43210"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Location / City</Text>
            <TextInput
              style={styles.textInput}
              value={editLocation}
              onChangeText={setEditLocation}
              placeholder="e.g. Chennai, Tamil Nadu"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>Profile Photo</Text>
            <TouchableOpacity 
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: '#EFF6FF',
                borderWidth: 1,
                borderColor: '#BFDBFE',
                borderRadius: 10,
                paddingVertical: 12,
                marginBottom: 16,
              }}
              onPress={handlePickProfilePhoto}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color="#1565FF" />
              ) : (
                <>
                  <Icon source="camera-outline" size={18} color="#1565FF" />
                  <Text style={{ color: '#1565FF', fontWeight: '700', fontSize: 14 }}>
                    {editPhoto ? 'Change Photo (Camera / Gallery)' : 'Add Photo (Camera / Gallery)'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveModalBtn, savingProfile && styles.saveModalBtnDisabled]}
              onPress={handleSaveProfileDetails}
              disabled={savingProfile}
            >
              {savingProfile ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveModalBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* User Profile Round Popup Photo Modal */}
      <UserProfilePopupModal
        visible={isPopupModalVisible}
        onDismiss={() => setIsPopupModalVisible(false)}
        userPhoto={displayPhotoUrl}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerTitleBar: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, backgroundColor: '#FFFFFF' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  
  profileHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginTop: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 16,
  },
  guestHeaderCard: {
    backgroundColor: '#F0F7FF',
    borderColor: '#BAE6FD',
  },
  guestAvatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0066FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  signInPrimaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  avatarWrap: { width: 72, height: 72, borderRadius: 36, overflow: 'hidden', borderWidth: 2, borderColor: '#F1F5F9' },
  avatarImage: { width: '100%', height: '100%' },
  profileInfoWrap: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  profileEmail: { fontSize: 13, color: '#64748B', marginBottom: 12 },
  editProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F1F5F9', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start' },
  editProfileBtnText: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  
  menuContainer: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  adminMenuItem: { backgroundColor: '#FFFDF7' },
  adminBadge: { backgroundColor: '#FDE68A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  adminBadgeText: { fontSize: 10, fontWeight: '800', color: '#92400E' },
  adminSubText: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  menuIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuItemText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0F172A' },
  divider: { backgroundColor: '#F1F5F9', height: 1, marginLeft: 64 },
  sectionGap: { height: 8, backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: '#E2E8F0', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalSheetTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, marginTop: 12 },
  textInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0F172A' },
  saveModalBtn: { backgroundColor: '#0066FF', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 24 },
  saveModalBtnDisabled: { backgroundColor: '#94A3B8' },
  saveModalBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
