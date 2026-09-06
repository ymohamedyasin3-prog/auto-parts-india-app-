import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  FlatList,
  Modal,
  TextInput as RNTextInput,
  Switch,
  Platform,
  Dimensions,
} from 'react-native';
import { Text, Icon, Button, TextInput, Chip, Surface, IconButton, Appbar } from 'react-native-paper';
import { launchImageLibrary } from 'react-native-image-picker';
import EditListingModal from '../components/EditListingModal';
import { AdminTaxonomyCMS } from '../components/AdminTaxonomyCMS';
import { getFirebaseFirestore, getCurrentUser } from '../services/firebase';
import { uploadImageToCloudinary } from '../services/cloudinary';
import { promptImageSourceDialog } from '../services/imagePickerService';

const { width } = Dimensions.get('window');

export default function AdminScreen({ navigation }: any) {
  // Navigation tabs
  const [tab, setTab] = useState<'overview' | 'listings' | 'users' | 'banners' | 'topCategories' | 'taxonomy' | 'announcements' | 'version'>('overview');

  // Core Data States
  const [listings, setListings] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [topCategories, setTopCategories] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [listingFilter, setListingFilter] = useState<'all' | 'active' | 'pending' | 'featured' | 'verified' | 'sold' | 'reported' | 'trash'>('all');
  const [selectedPartIds, setSelectedPartIds] = useState<string[]>([]);

  // Listing Edit / Detail Modals
  const [selectedListing, setSelectedListing] = useState<any | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // User Edit Modal State
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserDistrict, setEditUserDistrict] = useState('');
  const [editUserState, setEditUserState] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  // Banner Add / Edit Modal State
  const [bannerModalVisible, setBannerModalVisible] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any | null>(null);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerTag, setBannerTag] = useState('Special Offer');
  const [bannerTargetLink, setBannerTargetLink] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [bannerActive, setBannerActive] = useState(true);
  const [bannerOrder, setBannerOrder] = useState('0');
  const [savingBanner, setSavingBanner] = useState(false);
  const [uploadingBannerImage, setUploadingBannerImage] = useState(false);

  // Top Category Add / Edit Modal State
  const [topCategoryModalVisible, setTopCategoryModalVisible] = useState(false);
  const [editingTopCategory, setEditingTopCategory] = useState<any | null>(null);
  const [topCategoryName, setTopCategoryName] = useState('');
  const [topCategoryIcon, setTopCategoryIcon] = useState('car-cog');
  const [topCategoryImageUrl, setTopCategoryImageUrl] = useState('');
  const [topCategoryOrder, setTopCategoryOrder] = useState('0');
  const [topCategoryActive, setTopCategoryActive] = useState(true);
  const [savingTopCategory, setSavingTopCategory] = useState(false);
  const [uploadingTopCatImage, setUploadingTopCatImage] = useState(false);

  // Announcement Form State
  const [annTitle, setAnnTitle] = useState('');
  const [annText, setAnnText] = useState('');
  const [annPriority, setAnnPriority] = useState('normal');
  const [sendingAnn, setSendingAnn] = useState(false);

  // Version Config State
  const [latestVersion, setLatestVersion] = useState('1.0.0');
  const [minVersion, setMinVersion] = useState('1.0.0');
  const [forceUpdate, setForceUpdate] = useState(false);
  const [apkUrl, setApkUrl] = useState('https://autopartsindia.app/download/app-latest.apk');
  const [releaseNotes, setReleaseNotes] = useState('• Performance improvements and speed enhancements\n• Real-time chat & push notifications\n• Bug fixes and UI refinements');
  const [releaseDate, setReleaseDate] = useState('2026-08-29');
  const [savingVersion, setSavingVersion] = useState(false);
  const [loadingVersion, setLoadingVersion] = useState(false);

  // Super Admin Email
  const SUPER_ADMIN_EMAILS = [
    'wwwautoparts2@gmail.com',
    'www.allahforgiveness877@gmail.com'
  ];

  const currentUser = getCurrentUser();
  const userEmail = (currentUser?.email || '').trim().toLowerCase();
  const isAuthorizedAdmin = SUPER_ADMIN_EMAILS.includes(userEmail);

  if (!isAuthorizedAdmin) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Icon source="shield-alert" size={40} color="#EF4444" />
        </View>
        <Text style={{ color: '#0F172A', fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 8 }}>
          Restricted Admin Access
        </Text>
        <Text style={{ color: '#64748B', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24, maxWidth: 320 }}>
          This Admin Console is strictly restricted to authorized administrator (<Text style={{ color: '#1565FF', fontWeight: 'bold' }}>wwwautoparts2@gmail.com</Text>). Current account: <Text style={{ color: '#DC2626' }}>{currentUser?.email || 'Guest / Not logged in'}</Text>.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: '#1565FF', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('MainTabs', { screen: 'HomeTab' });
            }
          }}
        >
          <Icon source="arrow-left" size={18} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Go Back to Marketplace</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // -------------------------------------------------------------
  // Real-time Firestore Listeners
  // -------------------------------------------------------------
  useEffect(() => {
    let unsubListings = () => {};
    let unsubBanners = () => {};
    let unsubUsers = () => {};
    let unsubAnnouncements = () => {};

    try {
      const db = getFirebaseFirestore();
      if (!db || typeof db.collection !== 'function') {
        setLoading(false);
        return;
      }

      // 1. Listen to Listings
      const qListings = db.collection('spareParts').orderBy('createdAt', 'desc');
      unsubListings = qListings.onSnapshot(
        (snap: any) => {
          const list: any[] = [];
          snap.forEach((d: any) => list.push({ id: d.id, ...d.data() }));
          setListings(list);
          setLoading(false);
        },
        (err: any) => {
          console.warn('[Admin] Listings snapshot error:', err);
          setLoading(false);
        }
      );

      // 2. Listen to Banners
      const qBanners = db.collection('banners').orderBy('order', 'asc');
      unsubBanners = qBanners.onSnapshot(
        (snap: any) => {
          const list: any[] = [];
          snap.forEach((d: any) => list.push({ id: d.id, ...d.data() }));
          list.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
          setBanners(list);
        },
        (err: any) => {
          console.warn('[Admin] Banners snapshot error:', err);
        }
      );

      // 2b. Listen to Top Categories
      let unsubTopCategories = () => {};
      const qTopCat = db.collection('topCategories');
      unsubTopCategories = qTopCat.onSnapshot(
        (snap: any) => {
          const list: any[] = [];
          snap.forEach((d: any) => list.push({ id: d.id, ...d.data() }));
          list.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
          setTopCategories(list);
        },
        (err: any) => {
          console.warn('[Admin] TopCategories snapshot error:', err);
        }
      );

      // 3. Listen to Users
      const qUsers = db.collection('users');
      unsubUsers = qUsers.onSnapshot(
        (snap: any) => {
          const list: any[] = [];
          snap.forEach((d: any) => list.push({ id: d.id, ...d.data() }));
          setUsers(list);
        },
        (err: any) => {
          console.warn('[Admin] Users snapshot error:', err);
        }
      );

      // 4. Listen to Announcements
      const qAnn = db.collection('announcements').orderBy('createdAt', 'desc');
      unsubAnnouncements = qAnn.onSnapshot(
        (snap: any) => {
          const list: any[] = [];
          snap.forEach((d: any) => list.push({ id: d.id, ...d.data() }));
          setAnnouncements(list);
        },
        (err: any) => {
          console.warn('[Admin] Announcements snapshot error:', err);
        }
      );

      loadVersionConfig();
    } catch (e) {
      console.warn('[Admin] Listeners init error:', e);
      setLoading(false);
    }

    return () => {
      try { unsubListings(); } catch (_) {}
      try { unsubBanners(); } catch (_) {}
      try { unsubUsers(); } catch (_) {}
      try { unsubAnnouncements(); } catch (_) {}
    };
  }, []);

  const loadVersionConfig = async () => {
    try {
      setLoadingVersion(true);
      const db = getFirebaseFirestore();
      if (!db) return;
      const snap = await db.collection('app_version').doc('config').get();
      if (snap.exists) {
        const data = snap.data();
        if (data.latestVersion) setLatestVersion(data.latestVersion);
        if (data.minimumSupportedVersion) setMinVersion(data.minimumSupportedVersion);
        if (typeof data.forceUpdate === 'boolean') setForceUpdate(data.forceUpdate);
        if (data.apkDownloadUrl) setApkUrl(data.apkDownloadUrl);
        if (data.releaseNotes) setReleaseNotes(data.releaseNotes);
        if (data.releaseDate) setReleaseDate(data.releaseDate);
      }
    } catch (err) {
      console.warn('[Admin] Failed to load version config:', err);
    } finally {
      setLoadingVersion(false);
    }
  };

  // -------------------------------------------------------------
  // Listing Action Handlers
  // -------------------------------------------------------------
  const handleToggleApprove = async (item: any) => {
    try {
      const db = getFirebaseFirestore();
      if (!db) return;
      const newStatus = item.approved === false;
      await db.collection('spareParts').doc(item.id).update({
        approved: newStatus,
        verified: newStatus,
        status: newStatus ? 'approved' : 'pending',
        updatedAt: Date.now(),
      });
      Alert.alert('Status Updated', `Listing is now ${newStatus ? 'Approved' : 'Pending Approval'}`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update approval');
    }
  };

  const handleToggleFeatured = async (item: any) => {
    try {
      const db = getFirebaseFirestore();
      if (!db) return;
      const newFeatured = !item.featured;
      await db.collection('spareParts').doc(item.id).update({
        featured: newFeatured,
        updatedAt: Date.now(),
      });
      Alert.alert('Featured Status', `Listing is ${newFeatured ? 'marked as Featured ⭐' : 'removed from Featured'}`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update featured status');
    }
  };

  const handleToggleSold = async (item: any) => {
    try {
      const db = getFirebaseFirestore();
      if (!db) return;
      const newSold = !item.sold;
      await db.collection('spareParts').doc(item.id).update({
        sold: newSold,
        updatedAt: Date.now(),
      });
      Alert.alert('Inventory Status', `Listing is marked as ${newSold ? 'SOLD' : 'AVAILABLE'}`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update sold status');
    }
  };

  const handleToggleSoftDelete = async (item: any) => {
    try {
      const db = getFirebaseFirestore();
      if (!db) return;
      const isDeleted = !item.isDeleted;
      await db.collection('spareParts').doc(item.id).update({
        isDeleted,
        updatedAt: Date.now(),
      });
      Alert.alert(isDeleted ? 'Moved to Trash' : 'Restored', isDeleted ? 'Listing moved to Trash.' : 'Listing restored to marketplace.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update trash status');
    }
  };

  const handleDeleteListing = (id: string, title: string) => {
    Alert.alert(
      'Permanent Deletion',
      `Are you sure you want to permanently delete "${title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = getFirebaseFirestore();
              if (!db) return;
              await db.collection('spareParts').doc(id).delete();
              setSelectedPartIds((prev) => prev.filter((pId) => pId !== id));
              Alert.alert('Deleted', 'Listing permanently removed from database.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete listing.');
            }
          },
        },
      ]
    );
  };

  const handleBulkDelete = () => {
    if (selectedPartIds.length === 0) return;
    Alert.alert(
      'Bulk Delete',
      `Permanently delete ${selectedPartIds.length} selected listings? This action cannot be reversed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Delete (${selectedPartIds.length})`,
          style: 'destructive',
          onPress: async () => {
            try {
              const db = getFirebaseFirestore();
              if (!db) return;
              for (const id of selectedPartIds) {
                await db.collection('spareParts').doc(id).delete();
              }
              setSelectedPartIds([]);
              Alert.alert('Bulk Deleted', `${selectedPartIds.length} listings deleted.`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Bulk delete failed.');
            }
          },
        },
      ]
    );
  };

  // -------------------------------------------------------------
  // User Management Actions
  // -------------------------------------------------------------
  const handleToggleBlockUser = (user: any) => {
    if (SUPER_ADMIN_EMAILS.includes(user.email)) {
      Alert.alert('Protected Account', 'Super Admin accounts cannot be suspended or blocked.');
      return;
    }

    const currentlyBlocked = Boolean(user.isBlocked);
    Alert.alert(
      currentlyBlocked ? 'Unblock User' : 'Suspend / Block User',
      `Are you sure you want to ${currentlyBlocked ? 'unblock' : 'suspend'} ${user.name || user.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: currentlyBlocked ? 'Unblock' : 'Suspend',
          style: currentlyBlocked ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const db = getFirebaseFirestore();
              if (!db) return;
              await db.collection('users').doc(user.id).update({
                isBlocked: !currentlyBlocked,
                updatedAt: Date.now(),
              });
              Alert.alert('User Updated', `User account ${currentlyBlocked ? 'unblocked' : 'suspended'}.`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to update user block status.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteUser = (user: any) => {
    if (SUPER_ADMIN_EMAILS.includes(user.email)) {
      Alert.alert('Protected Account', 'Super Admin accounts cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete User Account',
      `Are you sure you want to permanently delete ${user.name || user.email}? All account data will be wiped.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = getFirebaseFirestore();
              if (!db) return;
              await db.collection('users').doc(user.id).delete();
              Alert.alert('Deleted', 'User account permanently deleted.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete user account.');
            }
          },
        },
      ]
    );
  };

  const handleOpenEditUser = (user: any) => {
    setEditingUser(user);
    setEditUserName(user.name || user.displayName || '');
    setEditUserPhone(user.phone || '');
    setEditUserDistrict(user.district || '');
    setEditUserState(user.state || '');
  };

  const handleSaveUserEdit = async () => {
    if (!editingUser) return;
    setSavingUser(true);
    try {
      const db = getFirebaseFirestore();
      if (!db) return;
      await db.collection('users').doc(editingUser.id).update({
        name: editUserName.trim(),
        displayName: editUserName.trim(),
        phone: editUserPhone.trim(),
        district: editUserDistrict.trim(),
        state: editUserState.trim(),
        updatedAt: Date.now(),
      });
      Alert.alert('Success', 'User profile updated successfully!');
      setEditingUser(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update user profile.');
    } finally {
      setSavingUser(false);
    }
  };

  // -------------------------------------------------------------
  // Banner Actions
  // -------------------------------------------------------------
  const handleOpenAddBanner = () => {
    setEditingBanner(null);
    setBannerTitle('');
    setBannerSubtitle('');
    setBannerTag('Special Offer');
    setBannerTargetLink('');
    setBannerImageUrl('');
    setBannerActive(true);
    setBannerOrder(String(banners.length));
    setBannerModalVisible(true);
  };

  const handleOpenEditBanner = (banner: any) => {
    setEditingBanner(banner);
    setBannerTitle(banner.title || '');
    setBannerSubtitle(banner.subtitle || '');
    setBannerTag(banner.tag || 'Special Offer');
    setBannerTargetLink(banner.targetLink || '');
    setBannerImageUrl(banner.imageUrl || '');
    setBannerActive(banner.active !== false);
    setBannerOrder(String(typeof banner.order === 'number' ? banner.order : 0));
    setBannerModalVisible(true);
  };

  const handlePickBannerImage = async () => {
    try {
      const selectedUri = await promptImageSourceDialog(
        'Banner Image',
        'Choose Camera or Gallery for banner image'
      );
      if (selectedUri) {
        setUploadingBannerImage(true);
        const uploadedUrl = await uploadImageToCloudinary(selectedUri, 'banners');
        if (uploadedUrl) {
          setBannerImageUrl(uploadedUrl);
        }
      }
    } catch (err: any) {
      console.warn('[Admin] Banner image pick error:', err);
      Alert.alert('Error', err.message || 'Failed to upload banner image.');
    } finally {
      setUploadingBannerImage(false);
    }
  };

  const handleSaveBanner = async () => {
    if (!bannerTitle.trim()) {
      Alert.alert('Validation', 'Please enter a banner title.');
      return;
    }
    if (!bannerImageUrl.trim()) {
      Alert.alert('Validation', 'Please select or upload a banner image.');
      return;
    }

    setSavingBanner(true);
    try {
      const db = getFirebaseFirestore();
      if (!db) return;

      const payload = {
        title: bannerTitle.trim(),
        subtitle: bannerSubtitle.trim(),
        tag: bannerTag.trim(),
        targetLink: bannerTargetLink.trim(),
        imageUrl: bannerImageUrl.trim(),
        active: bannerActive,
        activeStatus: bannerActive,
        order: parseInt(bannerOrder, 10) || 0,
        updatedAt: Date.now(),
      };

      if (editingBanner) {
        await db.collection('banners').doc(editingBanner.id).update(payload);
        Alert.alert('Success', 'Banner updated successfully!');
      } else {
        await db.collection('banners').add({
          ...payload,
          createdAt: Date.now(),
        });
        Alert.alert('Success', 'New banner created successfully!');
      }
      setBannerModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save banner.');
    } finally {
      setSavingBanner(false);
    }
  };

  const handleToggleBannerActive = async (banner: any) => {
    try {
      const db = getFirebaseFirestore();
      if (!db) return;
      const newActive = banner.active === false;
      await db.collection('banners').doc(banner.id).update({
        active: newActive,
        activeStatus: newActive,
        updatedAt: Date.now(),
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to toggle banner status.');
    }
  };

  const handleDeleteBanner = (banner: any) => {
    Alert.alert('Delete Banner', `Permanently delete "${banner.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const db = getFirebaseFirestore();
            if (!db) return;
            await db.collection('banners').doc(banner.id).delete();
            Alert.alert('Deleted', 'Banner deleted successfully.');
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete banner.');
          }
        },
      },
    ]);
  };

  // -------------------------------------------------------------
  // Top Categories Actions
  // -------------------------------------------------------------
  const handleOpenAddTopCategory = () => {
    setEditingTopCategory(null);
    setTopCategoryName('');
    setTopCategoryIcon('car-cog');
    setTopCategoryImageUrl('');
    setTopCategoryActive(true);
    setTopCategoryOrder(String(topCategories.length));
    setTopCategoryModalVisible(true);
  };

  const handleOpenEditTopCategory = (cat: any) => {
    setEditingTopCategory(cat);
    setTopCategoryName(cat.name || '');
    setTopCategoryIcon(cat.icon || 'car-cog');
    setTopCategoryImageUrl(cat.imageUrl || '');
    setTopCategoryActive(cat.active !== false);
    setTopCategoryOrder(String(typeof cat.order === 'number' ? cat.order : 0));
    setTopCategoryModalVisible(true);
  };

  const handlePickTopCatImage = async () => {
    try {
      const res = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
      if (res.assets && res.assets[0]?.uri) {
        setUploadingTopCatImage(true);
        const uploadedUrl = await uploadImageToCloudinary(res.assets[0].uri, 'categories');
        if (uploadedUrl) {
          setTopCategoryImageUrl(uploadedUrl);
          Alert.alert('Success', 'Category image uploaded successfully!');
        } else {
          Alert.alert('Upload Failed', 'Failed to upload category image. Please check your network.');
        }
      }
    } catch (err: any) {
      console.warn('[Admin] Top Category image pick error:', err);
      Alert.alert('Error', err?.message || 'Could not pick or upload image.');
    } finally {
      setUploadingTopCatImage(false);
    }
  };

  const handleSaveTopCategory = async () => {
    if (!topCategoryName.trim()) {
      Alert.alert('Validation', 'Please enter a category name.');
      return;
    }

    setSavingTopCategory(true);
    try {
      const db = getFirebaseFirestore();
      if (!db) return;

      const payload = {
        name: topCategoryName.trim(),
        icon: topCategoryIcon.trim() || 'car-cog',
        imageUrl: topCategoryImageUrl.trim(),
        active: topCategoryActive,
        order: parseInt(topCategoryOrder, 10) || 0,
        updatedAt: Date.now(),
      };

      if (editingTopCategory) {
        await db.collection('topCategories').doc(editingTopCategory.id).update(payload);
        Alert.alert('Success', 'Top Category updated successfully!');
      } else {
        await db.collection('topCategories').add({
          ...payload,
          createdAt: Date.now(),
        });
        Alert.alert('Success', 'New Top Category created successfully!');
      }
      setTopCategoryModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save Top Category.');
    } finally {
      setSavingTopCategory(false);
    }
  };

  const handleToggleTopCategoryActive = async (cat: any) => {
    try {
      const db = getFirebaseFirestore();
      if (!db) return;
      const newActive = cat.active === false;
      await db.collection('topCategories').doc(cat.id).update({
        active: newActive,
        updatedAt: Date.now(),
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to toggle category status.');
    }
  };

  const handleDeleteTopCategory = (cat: any) => {
    Alert.alert('Delete Category', `Permanently delete "${cat.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const db = getFirebaseFirestore();
            if (!db) return;
            await db.collection('topCategories').doc(cat.id).delete();
            Alert.alert('Deleted', 'Top Category deleted successfully.');
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete category.');
          }
        },
      },
    ]);
  };

  // -------------------------------------------------------------
  // Announcements Broadcast Actions
  // -------------------------------------------------------------
  const handleSendAnnouncement = async () => {
    if (!annTitle.trim() || !annText.trim()) {
      Alert.alert('Validation', 'Please provide both Title and Announcement Message.');
      return;
    }

    setSendingAnn(true);
    try {
      const db = getFirebaseFirestore();
      if (!db) return;

      const annDoc = {
        title: annTitle.trim(),
        text: annText.trim(),
        message: annText.trim(),
        priority: annPriority,
        createdAt: Date.now(),
        author: 'Super Admin',
      };

      await db.collection('announcements').add(annDoc);

      await db.collection('notifications').add({
        title: `📢 ${annTitle.trim()}`,
        message: annText.trim(),
        type: 'broadcast',
        isBroadcast: true,
        createdAt: Date.now(),
        read: false,
      });

      setAnnTitle('');
      setAnnText('');
      Alert.alert('Broadcast Sent', 'Announcement broadcast successfully to all marketplace users!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send announcement.');
    } finally {
      setSendingAnn(false);
    }
  };

  const handleDeleteAnnouncement = (ann: any) => {
    Alert.alert('Delete Announcement', `Delete announcement "${ann.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const db = getFirebaseFirestore();
            if (!db) return;
            await db.collection('announcements').doc(ann.id).delete();
            Alert.alert('Deleted', 'Announcement deleted.');
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete announcement.');
          }
        },
      },
    ]);
  };

  // -------------------------------------------------------------
  // App Version & OTA Update Actions
  // -------------------------------------------------------------
  const handleSaveVersionConfig = async () => {
    if (!latestVersion.trim() || !minVersion.trim()) {
      Alert.alert('Validation', 'Latest Version and Minimum Supported Version are required.');
      return;
    }
    if (!apkUrl.trim() || (!apkUrl.startsWith('http://') && !apkUrl.startsWith('https://'))) {
      Alert.alert('Validation', 'Please provide a valid HTTP or HTTPS APK download URL.');
      return;
    }

    setSavingVersion(true);
    try {
      const db = getFirebaseFirestore();
      if (!db) return;

      const payload = {
        latestVersion: latestVersion.trim(),
        minimumSupportedVersion: minVersion.trim(),
        forceUpdate,
        apkDownloadUrl: apkUrl.trim(),
        playStoreUrl: apkUrl.trim(),
        releaseNotes: releaseNotes.trim(),
        releaseDate: releaseDate.trim(),
        updatedAt: Date.now(),
        updatedBy: getCurrentUser()?.email || 'admin@autoparts.com',
      };

      await db.collection('app_version').doc('config').set(payload);
      Alert.alert('Success', 'App update configuration saved! All mobile devices will receive OTA prompts.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save version configuration.');
    } finally {
      setSavingVersion(false);
    }
  };

  // -------------------------------------------------------------
  // Filtered Listings & Users
  // -------------------------------------------------------------
  const listingCounts = useMemo(() => {
    return {
      all: listings.filter((p) => !p.isDeleted).length,
      active: listings.filter((p) => !p.isDeleted && !p.sold && p.approved !== false).length,
      pending: listings.filter((p) => !p.isDeleted && (p.approved === false || p.status === 'pending')).length,
      featured: listings.filter((p) => !p.isDeleted && p.featured).length,
      verified: listings.filter((p) => !p.isDeleted && p.verified).length,
      sold: listings.filter((p) => !p.isDeleted && p.sold).length,
      trash: listings.filter((p) => p.isDeleted).length,
    };
  }, [listings]);

  const totalMarketplaceValue = useMemo(() => {
    return listings
      .filter((p) => !p.isDeleted)
      .reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);
  }, [listings]);

  const filteredListings = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    return listings.filter((p) => {
      if (listingFilter === 'all' && p.isDeleted) return false;
      if (listingFilter === 'active' && (p.isDeleted || p.sold || p.approved === false)) return false;
      if (listingFilter === 'sold' && (p.isDeleted || !p.sold)) return false;
      if (listingFilter === 'pending' && (p.isDeleted || (p.approved !== false && p.status !== 'pending'))) return false;
      if (listingFilter === 'featured' && (p.isDeleted || !p.featured)) return false;
      if (listingFilter === 'verified' && (p.isDeleted || !p.verified)) return false;
      if (listingFilter === 'trash' && !p.isDeleted) return false;

      if (!query) return true;
      return (
        (p.title || '').toLowerCase().includes(query) ||
        (p.carBrand || '').toLowerCase().includes(query) ||
        (p.carModel || '').toLowerCase().includes(query) ||
        (p.category || '').toLowerCase().includes(query) ||
        (p.contactName || '').toLowerCase().includes(query) ||
        (p.sellerEmail || '').toLowerCase().includes(query) ||
        (p.location || '').toLowerCase().includes(query) ||
        (p.district || '').toLowerCase().includes(query) ||
        (p.state || '').toLowerCase().includes(query)
      );
    });
  }, [listings, listingFilter, searchTerm]);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    return users.filter((u) => {
      if (!query) return true;
      return (
        (u.name || '').toLowerCase().includes(query) ||
        (u.displayName || '').toLowerCase().includes(query) ||
        (u.email || '').toLowerCase().includes(query) ||
        (u.phone || '').includes(query) ||
        (u.district || '').toLowerCase().includes(query) ||
        (u.state || '').toLowerCase().includes(query)
      );
    });
  }, [users, searchTerm]);

  const isAllSelected = useMemo(() => {
    if (filteredListings.length === 0) return false;
    return filteredListings.every((p) => selectedPartIds.includes(p.id));
  }, [filteredListings, selectedPartIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedPartIds([]);
    } else {
      setSelectedPartIds(filteredListings.map((p) => p.id));
    }
  };

  const toggleSelectPart = (id: string) => {
    setSelectedPartIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // -------------------------------------------------------------
  // Render Listing Card (Native Marketplace Admin Card)
  // -------------------------------------------------------------
  const renderListingCard = ({ item }: { item: any }) => {
    const isSelected = selectedPartIds.includes(item.id);
    const imgUri =
      (item.imageUrls && item.imageUrls[0]) ||
      item.imageUrl ||
      'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=300';

    return (
      <View
        style={[
          styles.nativeListingCard,
          isSelected && styles.selectedListingCard,
          item.isDeleted && styles.trashListingCard,
        ]}
      >
        {/* Top Header Row */}
        <View style={styles.cardHeaderRow}>
          <TouchableOpacity
            style={styles.checkboxTouch}
            onPress={() => toggleSelectPart(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon
              source={isSelected ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
              size={22}
              color={isSelected ? '#1565FF' : '#94A3B8'}
            />
          </TouchableOpacity>

          <View style={styles.thumbWrap}>
            <Image source={{ uri: imgUri }} style={styles.thumbImage} resizeMode="cover" />
            {item.sold && (
              <View style={styles.soldBadgeOverlay}>
                <Text style={styles.soldBadgeText}>SOLD</Text>
              </View>
            )}
            {item.featured && (
              <View style={styles.featuredBadgeOverlay}>
                <Text style={styles.featuredBadgeText}>★ FEATURED</Text>
              </View>
            )}
          </View>

          <View style={styles.cardInfoCol}>
            <View style={styles.priceRow}>
              <Text style={styles.cardPrice}>₹{Number(item.price || 0).toLocaleString('en-IN')}</Text>
              <View
                style={[
                  styles.statusTagPill,
                  {
                    backgroundColor:
                      item.approved !== false ? '#E6F4EA' : '#FEF3C7',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusTagText,
                    {
                      color: item.approved !== false ? '#137333' : '#B45309',
                    },
                  ]}
                >
                  {item.approved !== false ? 'Approved' : 'Pending'}
                </Text>
              </View>
            </View>

            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>

            <View style={styles.vehiclePillRow}>
              <Text style={styles.vehiclePillText}>
                {item.carBrand} {item.carModel} • {item.category}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Icon source="map-marker" size={13} color="#64748B" />
              <Text style={styles.metaLocationText} numberOfLines={1}>
                {[item.district, item.state].filter(Boolean).join(', ') || item.location || 'India'}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Icon source="account" size={13} color="#64748B" />
              <Text style={styles.metaSellerText} numberOfLines={1}>
                {item.contactName || item.sellerName || 'Seller'}
                {item.contactPhone ? ` • 📞 ${item.contactPhone}` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Controls Toolbar */}
        <View style={styles.cardActionToolbar}>
          <TouchableOpacity
            style={[
              styles.toolBtn,
              { backgroundColor: item.approved !== false ? '#F1F5F9' : '#DCFCE7' },
            ]}
            onPress={() => handleToggleApprove(item)}
          >
            <Icon
              source={item.approved !== false ? 'close-circle-outline' : 'check-decagram'}
              size={15}
              color={item.approved !== false ? '#64748B' : '#15803D'}
            />
            <Text
              style={[
                styles.toolBtnText,
                { color: item.approved !== false ? '#475569' : '#15803D' },
              ]}
            >
              {item.approved !== false ? 'Unapprove' : 'Approve'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toolBtn,
              { backgroundColor: item.featured ? '#FEF9C3' : '#F1F5F9' },
            ]}
            onPress={() => handleToggleFeatured(item)}
          >
            <Icon
              source={item.featured ? 'star' : 'star-outline'}
              size={15}
              color={item.featured ? '#A16207' : '#64748B'}
            />
            <Text
              style={[
                styles.toolBtnText,
                { color: item.featured ? '#A16207' : '#475569' },
              ]}
            >
              {item.featured ? 'Featured' : 'Feature'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toolBtn,
              { backgroundColor: item.sold ? '#E2E8F0' : '#E0F2FE' },
            ]}
            onPress={() => handleToggleSold(item)}
          >
            <Icon
              source={item.sold ? 'cart-arrow-up' : 'cart-check'}
              size={15}
              color={item.sold ? '#475569' : '#0369A1'}
            />
            <Text
              style={[
                styles.toolBtnText,
                { color: item.sold ? '#475569' : '#0369A1' },
              ]}
            >
              {item.sold ? 'Available' : 'Sold'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolBtn, { backgroundColor: '#F1F5F9' }]}
            onPress={() => {
              setSelectedListing(item);
              setEditModalVisible(true);
            }}
          >
            <Icon source="pencil-outline" size={15} color="#1565FF" />
            <Text style={[styles.toolBtnText, { color: '#1565FF' }]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolBtn, { backgroundColor: '#FEE2E2' }]}
            onPress={() => handleDeleteListing(item.id, item.title)}
          >
            <Icon source="trash-can-outline" size={15} color="#DC2626" />
            <Text style={[styles.toolBtnText, { color: '#DC2626' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 1. OLX-Style Admin Top Header */}
      <View style={styles.adminTopHeader}>
        <View style={styles.headerLeftCol}>
          <View style={styles.adminBadgeRow}>
            <View style={styles.crownCircle}>
              <Icon source="shield-crown" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.adminMainTitle}>ADMIN CONSOLE</Text>
            <View style={styles.livePulsePill}>
              <View style={styles.pulseDot} />
              <Text style={styles.pulseText}>LIVE CLOUD</Text>
            </View>
          </View>
          <Text style={styles.adminSubTitle}>Auto Parts Marketplace Management System</Text>
        </View>

        <View style={styles.exitBtn}>
          <Appbar.BackAction size={20} color="#0F172A" onPress={() => (navigation ? navigation.goBack() : null)} style={{ margin: 0, padding: 0 }} />
          <Text style={styles.exitBtnText}>Exit</Text>
        </View>
      </View>

      {/* 2. Top Navigation Tabs (OLX Style Horizontal Pills) */}
      <View style={styles.tabBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          {[
            { id: 'overview', label: 'Dashboard', icon: 'view-dashboard-outline' },
            { id: 'listings', label: `Listings (${listings.length})`, icon: 'car-multiple' },
            { id: 'users', label: `Users (${users.length})`, icon: 'account-group-outline' },
            { id: 'banners', label: `Banners (${banners.length})`, icon: 'image-multiple-outline' },
            { id: 'topCategories', label: `Top Categories (${topCategories.length})`, icon: 'grid-large' },
            { id: 'taxonomy', label: 'Taxonomy CMS', icon: 'shape-outline' },
            { id: 'announcements', label: `Broadcast (${announcements.length})`, icon: 'bullhorn-outline' },
            { id: 'version', label: 'App Update', icon: 'cellphone-arrow-down' },
          ].map((t) => {
            const isActive = tab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.nativeTabPill, isActive && styles.nativeTabPillActive]}
                onPress={() => {
                  setTab(t.id as any);
                  setSearchTerm('');
                }}
                activeOpacity={0.75}
              >
                <Icon
                  source={t.icon}
                  size={16}
                  color={isActive ? '#FFFFFF' : '#475569'}
                />
                <Text style={[styles.nativeTabPillText, isActive && styles.nativeTabPillTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Main Dynamic Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1565FF" />
          <Text style={styles.loadingText}>Syncing Marketplace Cloud Database...</Text>
        </View>
      ) : tab === 'overview' ? (
        /* TAB 0: DASHBOARD OVERVIEW METRICS */
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.overviewScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Metrics Bento Grid */}
          <Text style={styles.sectionHeaderTitle}>MARKETPLACE METRICS</Text>

          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { borderLeftColor: '#1565FF' }]}>
              <View style={styles.metricIconWrap}>
                <Icon source="tag-multiple" size={22} color="#1565FF" />
              </View>
              <Text style={styles.metricValue}>{listings.length}</Text>
              <Text style={styles.metricLabel}>Total Ad Listings</Text>
            </View>

            <View style={[styles.metricCard, { borderLeftColor: '#10B981' }]}>
              <View style={styles.metricIconWrap}>
                <Icon source="check-decagram" size={22} color="#10B981" />
              </View>
              <Text style={styles.metricValue}>{listingCounts.active}</Text>
              <Text style={styles.metricLabel}>Active on Live Store</Text>
            </View>

            <View style={[styles.metricCard, { borderLeftColor: '#3B82F6' }]}>
              <View style={styles.metricIconWrap}>
                <Icon source="account-multiple" size={22} color="#3B82F6" />
              </View>
              <Text style={styles.metricValue}>{users.length}</Text>
              <Text style={styles.metricLabel}>Registered Sellers/Users</Text>
            </View>

            <View style={[styles.metricCard, { borderLeftColor: '#F59E0B' }]}>
              <View style={styles.metricIconWrap}>
                <Icon source="currency-inr" size={22} color="#F59E0B" />
              </View>
              <Text style={styles.metricValue}>
                ₹{(totalMarketplaceValue / 100000).toFixed(1)}L
              </Text>
              <Text style={styles.metricLabel}>Total Catalog Value</Text>
            </View>
          </View>

          {/* Quick Actions Panel */}
          <Text style={[styles.sectionHeaderTitle, { marginTop: 24 }]}>QUICK SHORTCUTS</Text>
          <View style={styles.shortcutsGrid}>
            <TouchableOpacity
              style={styles.shortcutBtn}
              onPress={() => setTab('listings')}
              activeOpacity={0.8}
            >
              <View style={[styles.shortcutIconCircle, { backgroundColor: '#E0F2FE' }]}>
                <Icon source="car-cog" size={22} color="#0369A1" />
              </View>
              <Text style={styles.shortcutTitle}>Moderate Listings</Text>
              <Text style={styles.shortcutSub}>{listingCounts.pending} pending approval</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutBtn}
              onPress={() => setTab('banners')}
              activeOpacity={0.8}
            >
              <View style={[styles.shortcutIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Icon source="bullhorn" size={22} color="#B45309" />
              </View>
              <Text style={styles.shortcutTitle}>Promo Banners</Text>
              <Text style={styles.shortcutSub}>{banners.length} carousel slides</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutBtn}
              onPress={() => setTab('taxonomy')}
              activeOpacity={0.8}
            >
              <View style={[styles.shortcutIconCircle, { backgroundColor: '#DCFCE7' }]}>
                <Icon source="shape" size={22} color="#15803D" />
              </View>
              <Text style={styles.shortcutTitle}>Car Brands & Parts</Text>
              <Text style={styles.shortcutSub}>Manage taxonomy CMS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutBtn}
              onPress={() => setTab('version')}
              activeOpacity={0.8}
            >
              <View style={[styles.shortcutIconCircle, { backgroundColor: '#F3E8FF' }]}>
                <Icon source="cellphone-arrow-down" size={22} color="#7E22CE" />
              </View>
              <Text style={styles.shortcutTitle}>App Version v{latestVersion}</Text>
              <Text style={styles.shortcutSub}>OTA update control</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Listings Snapshot */}
          <View style={styles.recentSnapshotCard}>
            <View style={styles.snapshotHeader}>
              <Text style={styles.snapshotTitle}>Recent Listings</Text>
              <TouchableOpacity onPress={() => setTab('listings')}>
                <Text style={styles.viewAllText}>View All ({listings.length}) →</Text>
              </TouchableOpacity>
            </View>

            {listings.slice(0, 4).map((item) => (
              <View key={item.id} style={styles.snapshotItemRow}>
                <Image
                  source={{ uri: item.imageUrl || (item.imageUrls && item.imageUrls[0]) || 'https://via.placeholder.com/60' }}
                  style={styles.snapshotThumb}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.snapshotItemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.snapshotItemSub}>
                    {item.carBrand} • ₹{Number(item.price || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.snapshotStatusPill,
                    { backgroundColor: item.sold ? '#FEE2E2' : '#DCFCE7' },
                  ]}
                >
                  <Text
                    style={[
                      styles.snapshotStatusText,
                      { color: item.sold ? '#B91C1C' : '#15803D' },
                    ]}
                  >
                    {item.sold ? 'Sold' : 'Active'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : tab === 'listings' ? (
        /* TAB 1: LISTINGS MODERATION */
        <View style={{ flex: 1 }}>
          {/* Sub Filters Row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterScrollContent}
          >
            {[
              { id: 'all', label: 'All', count: listingCounts.all },
              { id: 'active', label: 'Active', count: listingCounts.active },
              { id: 'pending', label: 'Pending', count: listingCounts.pending },
              { id: 'featured', label: 'Featured', count: listingCounts.featured },
              { id: 'verified', label: 'Verified', count: listingCounts.verified },
              { id: 'sold', label: 'Sold', count: listingCounts.sold },
              { id: 'trash', label: 'Trash', count: listingCounts.trash },
            ].map((f) => {
              const isSelected = listingFilter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterChip, isSelected && styles.filterChipActive]}
                  onPress={() => {
                    setListingFilter(f.id as any);
                    setSelectedPartIds([]);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                    {f.label} ({f.count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Search Input Bar */}
          <View style={styles.searchBarBox}>
            <View style={styles.searchInnerWrap}>
              <Icon source="magnify" size={20} color="#64748B" />
              <RNTextInput
                placeholder="Search title, brand, model, district, seller..."
                placeholderTextColor="#94A3B8"
                value={searchTerm}
                onChangeText={setSearchTerm}
                style={styles.searchInputField}
              />
              {searchTerm ? (
                <TouchableOpacity onPress={() => setSearchTerm('')}>
                  <Icon source="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Bulk Selection Bar */}
          {filteredListings.length > 0 && (
            <View style={styles.bulkActionBar}>
              <TouchableOpacity
                style={styles.bulkSelectBtn}
                onPress={toggleSelectAll}
                activeOpacity={0.7}
              >
                <Icon
                  source={isAllSelected ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                  size={20}
                  color="#1565FF"
                />
                <Text style={styles.bulkSelectText}>
                  {isAllSelected ? 'Deselect All' : `Select All (${filteredListings.length})`}
                </Text>
              </TouchableOpacity>

              {selectedPartIds.length > 0 && (
                <TouchableOpacity
                  style={styles.bulkDeleteBtn}
                  onPress={handleBulkDelete}
                  activeOpacity={0.8}
                >
                  <Icon source="delete-sweep" size={16} color="#FFFFFF" />
                  <Text style={styles.bulkDeleteText}>Delete Selected ({selectedPartIds.length})</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Listings FlatList */}
          <FlatList
            data={filteredListings}
            keyExtractor={(item) => item.id}
            renderItem={renderListingCard}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Icon source="tag-off-outline" size={48} color="#94A3B8" />
                <Text style={styles.emptyText}>No listings found matching filter.</Text>
              </View>
            }
          />
        </View>
      ) : tab === 'users' ? (
        /* TAB 2: USERS MANAGEMENT */
        <View style={{ flex: 1 }}>
          {/* User Count Status Bar */}
          <View style={styles.userBannerBar}>
            <View style={styles.userBannerIconWrap}>
              <Icon source="account-group" size={20} color="#1565FF" />
            </View>
            <Text style={styles.userBannerText}>
              Total Registered Users: <Text style={{ fontWeight: '800', color: '#0F172A' }}>{users.length}</Text>
            </Text>
          </View>

          {/* Search Input Bar */}
          <View style={styles.searchBarBox}>
            <View style={styles.searchInnerWrap}>
              <Icon source="magnify" size={20} color="#64748B" />
              <RNTextInput
                placeholder="Search user name, email, phone, district..."
                placeholderTextColor="#94A3B8"
                value={searchTerm}
                onChangeText={setSearchTerm}
                style={styles.searchInputField}
              />
              {searchTerm ? (
                <TouchableOpacity onPress={() => setSearchTerm('')}>
                  <Icon source="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isSuper = SUPER_ADMIN_EMAILS.includes(item.email);
              const isBlocked = Boolean(item.isBlocked);

              return (
                <View style={[styles.nativeUserCard, isBlocked && styles.blockedUserCard]}>
                  <View style={styles.userAvatarWrap}>
                    <Icon
                      source={isSuper ? 'shield-crown' : 'account'}
                      size={24}
                      color={isSuper ? '#EAB308' : '#1565FF'}
                    />
                  </View>

                  <View style={styles.userInfoCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.userName} numberOfLines={1}>
                        {item.name || item.displayName || 'Marketplace User'}
                      </Text>
                      {isSuper && (
                        <View style={styles.superAdminPill}>
                          <Text style={styles.superAdminPillText}>SUPER ADMIN</Text>
                        </View>
                      )}
                      {isBlocked && (
                        <View style={styles.suspendedPill}>
                          <Text style={styles.suspendedPillText}>SUSPENDED</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.userMetaText}>✉️ {item.email || 'No email'}</Text>
                    {item.phone && <Text style={styles.userMetaText}>📞 {item.phone}</Text>}
                    {(item.district || item.state) && (
                      <Text style={styles.userMetaText}>
                        📍 {[item.district, item.state].filter(Boolean).join(', ')}
                      </Text>
                    )}
                  </View>

                  <View style={styles.userActionsCol}>
                    {!isSuper && (
                      <>
                        <TouchableOpacity
                          style={[
                            styles.userActionIconBtn,
                            { backgroundColor: isBlocked ? '#DCFCE7' : '#FEE2E2' },
                          ]}
                          onPress={() => handleToggleBlockUser(item)}
                        >
                          <Icon
                            source={isBlocked ? 'check-circle' : 'cancel'}
                            size={16}
                            color={isBlocked ? '#15803D' : '#DC2626'}
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.userActionIconBtn, { backgroundColor: '#F1F5F9' }]}
                          onPress={() => handleOpenEditUser(item)}
                        >
                          <Icon source="pencil-outline" size={16} color="#1565FF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.userActionIconBtn, { backgroundColor: '#FEE2E2' }]}
                          onPress={() => handleDeleteUser(item)}
                        >
                          <Icon source="trash-can-outline" size={16} color="#DC2626" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Icon source="account-off" size={48} color="#94A3B8" />
                <Text style={styles.emptyText}>No users matched your query.</Text>
              </View>
            }
          />
        </View>
      ) : tab === 'banners' ? (
        /* TAB 3: BANNERS MANAGEMENT */
        <View style={{ flex: 1 }}>
          <View style={styles.bannerHeaderRow}>
            <View>
              <Text style={styles.sectionHeaderTitle}>Hero Promotional Banners</Text>
              <Text style={styles.sectionHeaderSubtitle}>
                Active marketplace slides shown on mobile home screen
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addBannerNativeBtn}
              onPress={handleOpenAddBanner}
              activeOpacity={0.85}
            >
              <Icon source="plus" size={16} color="#FFFFFF" />
              <Text style={styles.addBannerBtnText}>Add Banner</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.listContent}>
            {banners.map((b, idx) => (
              <View key={b.id || idx} style={styles.nativeBannerCard}>
                <View style={styles.bannerImageWrap}>
                  {b.imageUrl ? (
                    <Image source={{ uri: b.imageUrl }} style={styles.bannerCardImg} resizeMode="cover" />
                  ) : (
                    <View style={[styles.bannerCardImg, { backgroundColor: '#1565FF' }]} />
                  )}

                  <View style={styles.bannerTagOverlay}>
                    <View style={styles.bannerOrderBadge}>
                      <Text style={styles.bannerOrderText}>#{b.order || idx + 1}</Text>
                    </View>
                    <View
                      style={[
                        styles.bannerStatusBadge,
                        { backgroundColor: b.active !== false ? '#10B981' : '#64748B' },
                      ]}
                    >
                      <Text style={styles.bannerStatusText}>
                        {b.active !== false ? 'ACTIVE' : 'DISABLED'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.bannerBodyContent}>
                  <Text style={styles.bannerTitleText}>{b.title}</Text>
                  {b.subtitle ? <Text style={styles.bannerSubText}>{b.subtitle}</Text> : null}
                  {b.targetLink ? (
                    <Text style={styles.bannerTargetLinkText}>Action: {b.targetLink}</Text>
                  ) : null}

                  {/* Actions Bar */}
                  <View style={styles.bannerActionsBar}>
                    <TouchableOpacity
                      style={[
                        styles.bannerActionBtn,
                        { backgroundColor: b.active !== false ? '#DCFCE7' : '#F1F5F9' },
                      ]}
                      onPress={() => handleToggleBannerActive(b)}
                    >
                      <Icon
                        source={b.active !== false ? 'eye' : 'eye-off'}
                        size={14}
                        color={b.active !== false ? '#15803D' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.bannerActionBtnText,
                          { color: b.active !== false ? '#15803D' : '#64748B' },
                        ]}
                      >
                        {b.active !== false ? 'Active' : 'Disabled'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.bannerActionBtn, { backgroundColor: '#F1F5F9' }]}
                      onPress={() => handleOpenEditBanner(b)}
                    >
                      <Icon source="pencil-outline" size={14} color="#1565FF" />
                      <Text style={[styles.bannerActionBtnText, { color: '#1565FF' }]}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.bannerActionBtn, { backgroundColor: '#FEE2E2' }]}
                      onPress={() => handleDeleteBanner(b)}
                    >
                      <Icon source="trash-can-outline" size={14} color="#DC2626" />
                      <Text style={[styles.bannerActionBtnText, { color: '#DC2626' }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            {banners.length === 0 && (
              <View style={styles.centerContainer}>
                <Icon source="image-broken-variant" size={48} color="#94A3B8" />
                <Text style={styles.emptyText}>No banners configured yet.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : tab === 'topCategories' ? (
        /* TAB 3B: TOP CATEGORIES MANAGEMENT */
        <View style={{ flex: 1 }}>
          <View style={styles.bannerHeaderRow}>
            <View>
              <Text style={styles.sectionHeaderTitle}>TOP HOME CATEGORIES</Text>
              <Text style={styles.sectionHeaderSubtitle}>
                {topCategories.length} categories on home screen grid
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addBannerNativeBtn}
              onPress={handleOpenAddTopCategory}
            >
              <Icon source="plus-circle" size={16} color="#FFFFFF" />
              <Text style={styles.addBannerBtnText}>Add Category</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContent}>
            {topCategories.map((cat, index) => (
              <View key={cat.id || index} style={styles.nativeCategoryAdminCard}>
                <View style={styles.categoryAdminIconWrap}>
                  {cat.imageUrl ? (
                    <Image
                      source={{ uri: cat.imageUrl }}
                      style={styles.categoryAdminImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <Icon source={cat.icon || 'car-cog'} size={28} color="#1565FF" />
                  )}
                </View>

                <View style={styles.categoryAdminInfoCol}>
                  <View style={styles.categoryAdminNameRow}>
                    <Text style={styles.categoryAdminNameText}>{cat.name}</Text>
                    <View
                      style={[
                        styles.catStatusPill,
                        { backgroundColor: cat.active !== false ? '#DCFCE7' : '#F1F5F9' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.catStatusText,
                          { color: cat.active !== false ? '#15803D' : '#64748B' },
                        ]}
                      >
                        {cat.active !== false ? 'Active' : 'Hidden'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.categoryAdminMetaText}>
                    Icon: {cat.icon || 'car-cog'} • Order: {cat.order || 0}
                  </Text>
                  {cat.imageUrl ? (
                    <Text style={styles.categoryAdminImageBadge} numberOfLines={1}>
                      Custom Image Photo Attached
                    </Text>
                  ) : null}

                  <View style={styles.categoryAdminActionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.bannerActionBtn,
                        { backgroundColor: cat.active !== false ? '#DCFCE7' : '#F1F5F9' },
                      ]}
                      onPress={() => handleToggleTopCategoryActive(cat)}
                    >
                      <Icon
                        source={cat.active !== false ? 'check-circle' : 'eye-off'}
                        size={14}
                        color={cat.active !== false ? '#15803D' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.bannerActionBtnText,
                          { color: cat.active !== false ? '#15803D' : '#64748B' },
                        ]}
                      >
                        {cat.active !== false ? 'Active' : 'Disabled'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.bannerActionBtn, { backgroundColor: '#F1F5F9' }]}
                      onPress={() => handleOpenEditTopCategory(cat)}
                    >
                      <Icon source="pencil-outline" size={14} color="#1565FF" />
                      <Text style={[styles.bannerActionBtnText, { color: '#1565FF' }]}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.bannerActionBtn, { backgroundColor: '#FEE2E2' }]}
                      onPress={() => handleDeleteTopCategory(cat)}
                    >
                      <Icon source="trash-can-outline" size={14} color="#DC2626" />
                      <Text style={[styles.bannerActionBtnText, { color: '#DC2626' }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            {topCategories.length === 0 && (
              <View style={styles.centerContainer}>
                <Icon source="shape-outline" size={48} color="#94A3B8" />
                <Text style={styles.emptyText}>No top categories configured yet.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : tab === 'taxonomy' ? (
        /* TAB 4: TAXONOMY CMS */
        <AdminTaxonomyCMS />
      ) : tab === 'announcements' ? (
        /* TAB 5: BROADCAST ANNOUNCEMENTS */
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContent}>
          {/* New Broadcast Form Card */}
          <View style={styles.nativeFormCard}>
            <View style={styles.formHeaderRow}>
              <View style={styles.formIconCircle}>
                <Icon source="bullhorn" size={20} color="#1565FF" />
              </View>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.formTitle}>Broadcast Push Announcement</Text>
                <Text style={styles.formSubtitle}>
                  Instantly sends notification banner to all active app users
                </Text>
              </View>
            </View>

            <TextInput
              label="Notification Title (e.g. Clearance Sale Today)"
              value={annTitle}
              onChangeText={setAnnTitle}
              mode="outlined"
              outlineColor="#E2E8F0"
              activeOutlineColor="#1565FF"
              style={styles.formInput}
            />

            <TextInput
              label="Notification Message..."
              value={annText}
              onChangeText={setAnnText}
              mode="outlined"
              multiline
              numberOfLines={3}
              outlineColor="#E2E8F0"
              activeOutlineColor="#1565FF"
              style={[styles.formInput, { minHeight: 80, marginTop: 10 }]}
            />

            <TouchableOpacity
              style={styles.nativePrimarySubmitBtn}
              onPress={handleSendAnnouncement}
              disabled={sendingAnn}
              activeOpacity={0.85}
            >
              {sendingAnn ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon source="send" size={16} color="#FFFFFF" />
                  <Text style={styles.primarySubmitBtnText}>Broadcast To All App Users</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Past Announcements History */}
          <Text style={[styles.sectionHeaderTitle, { marginTop: 24, marginBottom: 12 }]}>
            BROADCAST HISTORY ({announcements.length})
          </Text>

          {announcements.map((ann) => (
            <View key={ann.id} style={styles.annItemCard}>
              <View style={styles.annHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.annItemTitle}>{ann.title}</Text>
                  <Text style={styles.annItemDate}>
                    {ann.createdAt ? new Date(ann.createdAt).toLocaleString() : 'Recent'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.annDeleteBtn}
                  onPress={() => handleDeleteAnnouncement(ann)}
                >
                  <Icon source="trash-can-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
              <Text style={styles.annItemText}>{ann.text || ann.message}</Text>
            </View>
          ))}

          {announcements.length === 0 && (
            <View style={styles.centerContainer}>
              <Icon source="bell-sleep-outline" size={40} color="#94A3B8" />
              <Text style={styles.emptyText}>No broadcast announcements sent yet.</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        /* TAB 6: APP UPDATE OTA MANAGER */
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContent}>
          <View style={styles.nativeFormCard}>
            <View style={styles.formHeaderRow}>
              <View style={styles.formIconCircle}>
                <Icon source="cellphone-arrow-down" size={20} color="#1565FF" />
              </View>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.formTitle}>OTA & App Update Configuration</Text>
                <Text style={styles.formSubtitle}>
                  Manage mandatory APK updates and prompt dialogue for all Android devices
                </Text>
              </View>
            </View>

            <View style={styles.rowInputs}>
              <TextInput
                label="Latest Version"
                value={latestVersion}
                onChangeText={setLatestVersion}
                mode="outlined"
                outlineColor="#E2E8F0"
                activeOutlineColor="#1565FF"
                style={[styles.formInput, { flex: 1, marginRight: 6 }]}
              />
              <TextInput
                label="Min Version"
                value={minVersion}
                onChangeText={setMinVersion}
                mode="outlined"
                outlineColor="#E2E8F0"
                activeOutlineColor="#1565FF"
                style={[styles.formInput, { flex: 1, marginLeft: 6 }]}
              />
            </View>

            <View style={styles.switchNativeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Force Update (Block Older Versions)</Text>
                <Text style={styles.switchSubLabel}>
                  Users cannot skip the update until they install the latest APK
                </Text>
              </View>
              <Switch
                value={forceUpdate}
                onValueChange={setForceUpdate}
                trackColor={{ false: '#CBD5E1', true: '#DC2626' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <TextInput
              label="APK Download URL / Play Store Link"
              value={apkUrl}
              onChangeText={setApkUrl}
              mode="outlined"
              outlineColor="#E2E8F0"
              activeOutlineColor="#1565FF"
              style={[styles.formInput, { marginTop: 10 }]}
            />

            <TextInput
              label="Release Date (YYYY-MM-DD)"
              value={releaseDate}
              onChangeText={setReleaseDate}
              mode="outlined"
              outlineColor="#E2E8F0"
              activeOutlineColor="#1565FF"
              style={[styles.formInput, { marginTop: 10 }]}
            />

            <TextInput
              label="Changelog / Release Notes"
              value={releaseNotes}
              onChangeText={setReleaseNotes}
              mode="outlined"
              multiline
              numberOfLines={4}
              outlineColor="#E2E8F0"
              activeOutlineColor="#1565FF"
              style={[styles.formInput, { minHeight: 80, marginTop: 10 }]}
            />

            <TouchableOpacity
              style={styles.nativePrimarySubmitBtn}
              onPress={handleSaveVersionConfig}
              disabled={savingVersion}
              activeOpacity={0.85}
            >
              {savingVersion ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon source="cloud-upload" size={16} color="#FFFFFF" />
                  <Text style={styles.primarySubmitBtnText}>Save Update Configuration</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: Edit Listing Modal */}
      {/* ------------------------------------------------------------- */}
      {selectedListing && (
        <EditListingModal
          visible={editModalVisible}
          onClose={() => {
            setEditModalVisible(false);
            setSelectedListing(null);
          }}
          listing={selectedListing}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: Edit User Profile Modal */}
      {/* ------------------------------------------------------------- */}
      <Modal
        visible={Boolean(editingUser)}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingUser(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitleText}>Edit User Profile</Text>
              <IconButton icon="close" size={20} onPress={() => setEditingUser(null)} />
            </View>

            <TextInput
              label="Full Name"
              value={editUserName}
              onChangeText={setEditUserName}
              mode="outlined"
              outlineColor="#E2E8F0"
              activeOutlineColor="#1565FF"
              style={styles.modalInput}
            />

            <TextInput
              label="Phone Number"
              value={editUserPhone}
              onChangeText={setEditUserPhone}
              mode="outlined"
              keyboardType="phone-pad"
              outlineColor="#E2E8F0"
              activeOutlineColor="#1565FF"
              style={styles.modalInput}
            />

            <TextInput
              label="District / City"
              value={editUserDistrict}
              onChangeText={setEditUserDistrict}
              mode="outlined"
              outlineColor="#E2E8F0"
              activeOutlineColor="#1565FF"
              style={styles.modalInput}
            />

            <TextInput
              label="State"
              value={editUserState}
              onChangeText={setEditUserState}
              mode="outlined"
              outlineColor="#E2E8F0"
              activeOutlineColor="#1565FF"
              style={styles.modalInput}
            />

            <View style={styles.modalBtnRow}>
              <Button onPress={() => setEditingUser(null)}>Cancel</Button>
              <Button
                mode="contained"
                buttonColor="#1565FF"
                textColor="#FFFFFF"
                onPress={handleSaveUserEdit}
                loading={savingUser}
                disabled={savingUser}
              >
                Save Profile
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: Add / Edit Banner Modal */}
      {/* ------------------------------------------------------------- */}
      <Modal
        visible={bannerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBannerModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitleText}>
                {editingBanner ? 'Edit Promotional Banner' : 'Create New Banner'}
              </Text>
              <IconButton icon="close" size={20} onPress={() => setBannerModalVisible(false)} />
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <TextInput
                label="Banner Title *"
                value={bannerTitle}
                onChangeText={setBannerTitle}
                mode="outlined"
                outlineColor="#E2E8F0"
                activeOutlineColor="#1565FF"
                style={styles.modalInput}
              />

              <TextInput
                label="Subtitle / Description"
                value={bannerSubtitle}
                onChangeText={setBannerSubtitle}
                mode="outlined"
                outlineColor="#E2E8F0"
                activeOutlineColor="#1565FF"
                style={styles.modalInput}
              />

              <TextInput
                label="Tag Badge (e.g. Special Offer, 20% Off)"
                value={bannerTag}
                onChangeText={setBannerTag}
                mode="outlined"
                outlineColor="#E2E8F0"
                activeOutlineColor="#1565FF"
                style={styles.modalInput}
              />

              <TextInput
                label="Target Action / Link"
                value={bannerTargetLink}
                onChangeText={setBannerTargetLink}
                mode="outlined"
                outlineColor="#E2E8F0"
                activeOutlineColor="#1565FF"
                style={styles.modalInput}
              />

              <TextInput
                label="Display Order (0, 1, 2...)"
                value={bannerOrder}
                onChangeText={setBannerOrder}
                mode="outlined"
                keyboardType="numeric"
                outlineColor="#E2E8F0"
                activeOutlineColor="#1565FF"
                style={styles.modalInput}
              />

              {/* Banner Image Picker */}
              <View style={styles.bannerPickerBox}>
                <Text style={styles.bannerPickerLabel}>Banner Image * (16:9 ratio recommended)</Text>
                {bannerImageUrl ? (
                  <Image source={{ uri: bannerImageUrl }} style={styles.previewBannerImg} resizeMode="cover" />
                ) : null}

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <Button
                    mode="outlined"
                    icon="camera"
                    onPress={handlePickBannerImage}
                    loading={uploadingBannerImage}
                    disabled={uploadingBannerImage}
                    style={{ flex: 1 }}
                  >
                    Upload Photo
                  </Button>
                </View>

                <TextInput
                  label="Or Direct Image URL"
                  value={bannerImageUrl}
                  onChangeText={setBannerImageUrl}
                  mode="outlined"
                  outlineColor="#E2E8F0"
                  activeOutlineColor="#1565FF"
                  style={[styles.modalInput, { marginTop: 8 }]}
                />
              </View>

              <View style={[styles.switchNativeRow, { marginVertical: 8 }]}>
                <Text style={styles.switchLabel}>Active in Carousel</Text>
                <Switch
                  value={bannerActive}
                  onValueChange={setBannerActive}
                  trackColor={{ false: '#CBD5E1', true: '#10B981' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <Button onPress={() => setBannerModalVisible(false)}>Cancel</Button>
              <Button
                mode="contained"
                buttonColor="#1565FF"
                textColor="#FFFFFF"
                onPress={handleSaveBanner}
                loading={savingBanner}
                disabled={savingBanner}
              >
                Save Banner
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3B: Add / Edit Top Category Modal */}
      {/* ------------------------------------------------------------- */}
      <Modal
        visible={topCategoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTopCategoryModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitleText}>
                {editingTopCategory ? 'Edit Top Category' : 'Add New Top Category'}
              </Text>
              <IconButton icon="close" size={20} onPress={() => setTopCategoryModalVisible(false)} />
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              <TextInput
                label="Category Display Name *"
                value={topCategoryName}
                onChangeText={setTopCategoryName}
                mode="outlined"
                outlineColor="#E2E8F0"
                activeOutlineColor="#1565FF"
                style={styles.modalInput}
                placeholder="e.g. Engine & Motors"
              />

              <TextInput
                label="Vector Icon Name (Material Community Icon)"
                value={topCategoryIcon}
                onChangeText={setTopCategoryIcon}
                mode="outlined"
                outlineColor="#E2E8F0"
                activeOutlineColor="#1565FF"
                style={styles.modalInput}
                placeholder="e.g. car-cog, lightning-bolt, car-seat"
              />

              <TextInput
                label="Display Order (0, 1, 2...)"
                value={topCategoryOrder}
                onChangeText={setTopCategoryOrder}
                mode="outlined"
                keyboardType="numeric"
                outlineColor="#E2E8F0"
                activeOutlineColor="#1565FF"
                style={styles.modalInput}
              />

              {/* Photo Image Upload for Category */}
              <View style={styles.bannerPickerBox}>
                <Text style={styles.bannerPickerLabel}>Category Photo Image (Optional)</Text>
                {topCategoryImageUrl ? (
                  <Image
                    source={{ uri: topCategoryImageUrl }}
                    style={styles.previewCatImg}
                    resizeMode="cover"
                  />
                ) : null}

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <Button
                    mode="outlined"
                    icon="camera"
                    onPress={handlePickTopCatImage}
                    loading={uploadingTopCatImage}
                    disabled={uploadingTopCatImage}
                    style={{ flex: 1 }}
                  >
                    Upload Category Photo
                  </Button>
                </View>

                <TextInput
                  label="Or Direct Image URL"
                  value={topCategoryImageUrl}
                  onChangeText={setTopCategoryImageUrl}
                  mode="outlined"
                  outlineColor="#E2E8F0"
                  activeOutlineColor="#1565FF"
                  style={[styles.modalInput, { marginTop: 8 }]}
                  placeholder="https://..."
                />
              </View>

              <View style={[styles.switchNativeRow, { marginVertical: 8 }]}>
                <Text style={styles.switchLabel}>Show on Home Screen</Text>
                <Switch
                  value={topCategoryActive}
                  onValueChange={setTopCategoryActive}
                  trackColor={{ false: '#CBD5E1', true: '#10B981' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <Button onPress={() => setTopCategoryModalVisible(false)}>Cancel</Button>
              <Button
                mode="contained"
                buttonColor="#1565FF"
                textColor="#FFFFFF"
                onPress={handleSaveTopCategory}
                loading={savingTopCategory}
                disabled={savingTopCategory}
              >
                Save Category
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// -------------------------------------------------------------
// Native Marketplace Admin Stylesheet
// -------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  adminTopHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 14,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeftCol: {
    flex: 1,
  },
  adminBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  crownCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1565FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  adminMainTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  livePulsePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
    gap: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  pulseText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  adminSubTitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  exitBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  tabBarContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabScrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  nativeTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  nativeTabPillActive: {
    backgroundColor: '#1565FF',
    borderColor: '#1565FF',
  },
  nativeTabPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  nativeTabPillTextActive: {
    color: '#FFFFFF',
  },
  overviewScroll: {
    padding: 12,
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: (width - 34) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  metricIconWrap: {
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  shortcutBtn: {
    width: (width - 34) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  shortcutIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  shortcutTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  shortcutSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  recentSnapshotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  snapshotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  snapshotTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1565FF',
  },
  snapshotItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  snapshotThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  snapshotItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  snapshotItemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  snapshotStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  snapshotStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  filterScroll: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterScrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#1565FF',
    borderColor: '#1565FF',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  searchBarBox: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchInnerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInputField: {
    flex: 1,
    height: 38,
    fontSize: 13,
    color: '#0F172A',
    marginLeft: 6,
  },
  bulkActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
  },
  bulkSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bulkSelectText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1565FF',
  },
  bulkDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  bulkDeleteText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  listContent: {
    padding: 12,
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
  },
  nativeListingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  selectedListingCard: {
    borderColor: '#1565FF',
    backgroundColor: '#F0F7FF',
  },
  trashListingCard: {
    opacity: 0.75,
    backgroundColor: '#FEF2F2',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxTouch: {
    paddingTop: 4,
    paddingRight: 6,
  },
  thumbWrap: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  soldBadgeOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soldBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  featuredBadgeOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#FEF08A',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  featuredBadgeText: {
    color: '#854D0E',
    fontSize: 8,
    fontWeight: '900',
  },
  cardInfoCol: {
    flex: 1,
    marginLeft: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  statusTagPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  vehiclePillRow: {
    marginTop: 4,
  },
  vehiclePillText: {
    fontSize: 11,
    color: '#1565FF',
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  metaLocationText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  metaSellerText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  cardActionToolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  toolBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  userBannerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  userBannerIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  userBannerText: {
    fontSize: 13,
    color: '#475569',
  },
  nativeUserCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  blockedUserCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  userAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfoCol: {
    flex: 1,
    marginLeft: 10,
  },
  userName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  superAdminPill: {
    backgroundColor: '#FEF08A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  superAdminPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#854D0E',
  },
  suspendedPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  suspendedPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#DC2626',
  },
  userMetaText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  userActionsCol: {
    flexDirection: 'row',
    gap: 6,
  },
  userActionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionHeaderSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  addBannerNativeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1565FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  addBannerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  nativeBannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  bannerImageWrap: {
    aspectRatio: 2.8 / 1,
    width: '100%',
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  bannerCardImg: {
    width: '100%',
    height: '100%',
  },
  bannerTagOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bannerOrderBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bannerOrderText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  bannerStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bannerStatusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  bannerBodyContent: {
    padding: 12,
  },
  bannerTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  bannerSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  bannerTargetLinkText: {
    fontSize: 11,
    color: '#1565FF',
    marginTop: 4,
  },
  bannerActionsBar: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  bannerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  bannerActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  nativeFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  formIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  formSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
  },
  nativePrimarySubmitBtn: {
    backgroundColor: '#1565FF',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  primarySubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  annItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  annHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  annItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  annItemDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  annDeleteBtn: {
    padding: 4,
  },
  annItemText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  switchNativeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  switchLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  switchSubLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalInput: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  bannerPickerBox: {
    marginVertical: 8,
  },
  bannerPickerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  previewBannerImg: {
    width: '100%',
    aspectRatio: 2.8 / 1,
    borderRadius: 8,
    marginBottom: 6,
  },
  previewCatImg: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  nativeCategoryAdminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  categoryAdminIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  categoryAdminImg: {
    width: '100%',
    height: '100%',
  },
  categoryAdminInfoCol: {
    flex: 1,
    marginLeft: 12,
  },
  categoryAdminNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryAdminNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  catStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  catStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  categoryAdminMetaText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  categoryAdminImageBadge: {
    fontSize: 10,
    color: '#1565FF',
    fontWeight: '700',
    marginTop: 2,
  },
  categoryAdminActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
});
