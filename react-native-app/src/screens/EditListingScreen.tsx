import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  SafeAreaView,
  StatusBar,
  Modal,
  Switch,
  Dimensions,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { promptImageSourceDialog } from '../services/imagePickerService';
import {
  uploadMultipleImagesToCloudinary,
  deleteMultipleImagesFromCloudinary,
} from '../services/cloudinary';
import { getFirebaseFirestore, getCurrentUser, getFirestoreInstance } from '../services/firebase';
import { Category3DIcon } from '../components/Category3DIcon';
import { BrandLogo } from '../components/BrandLogo';
import {
  DEFAULT_BRAND_MODELS,
  DEFAULT_BRAND_VARIANTS,
  MODEL_SPECIFIC_VARIANTS,
  DEFAULT_CATEGORY_PARTS,
} from './SellPartScreen';

const { width, height } = Dimensions.get('window');

// Canonical automotive categories matching SellPartScreen & reference UI
const REAL_CATEGORIES = [
  'Engine & Mechanical',
  'Body & Exterior',
  'Lights & Electricals',
  'Suspension & Brakes',
  'Interior & Wheels',
  'Cooling & AC',
  'Transmission & Clutch',
  'Exhaust & Fuel',
];

const FUEL_TYPES = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid', 'All / Any'];

const YEARS = Array.from({ length: 27 }, (_, i) => String(2026 - i));

const CONDITION_OPTIONS = [
  { id: 'Used', label: 'Used / OEM', desc: 'Pre-owned genuine or verified spare part' },
  { id: 'Brand New', label: 'Brand New', desc: 'Fresh in box / uninstalled original part' },
];

export default function EditListingScreen({ navigation, route }: any) {
  const part = route?.params?.part;
  const onUpdated = route?.params?.onUpdated;

  if (!part) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.errorCenter}>
          <Icon source="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>No listing selected to edit.</Text>
          <TouchableOpacity
            style={styles.goBackBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.goBackBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Extract initial photos safely
  const initialImages: string[] = useMemo(() => {
    const arr: string[] = [];
    if (Array.isArray(part.images) && part.images.length > 0) {
      part.images.forEach((img: any) => {
        if (typeof img === 'string' && img.trim()) arr.push(img.trim());
      });
    } else if (Array.isArray(part.imageUrls) && part.imageUrls.length > 0) {
      part.imageUrls.forEach((img: any) => {
        if (typeof img === 'string' && img.trim()) arr.push(img.trim());
      });
    } else if (part.imageUrl && typeof part.imageUrl === 'string') {
      arr.push(part.imageUrl.trim());
    } else if (part.image && typeof part.image === 'string') {
      arr.push(part.image.trim());
    }
    return arr;
  }, [part]);

  // Form States
  const [images, setImages] = useState<string[]>(initialImages);
  const [title, setTitle] = useState(part.title || part.name || part.partTitle || '');
  const [price, setPrice] = useState(
    part.price !== undefined && part.price !== null ? String(part.price) : ''
  );

  // Specifications (Matching SellScreen)
  const [category, setCategory] = useState<string>(part.category || 'Body & Exterior');
  const [condition, setCondition] = useState<string>(part.condition || 'Used / OEM');
  const [brand, setBrand] = useState<string>(part.carBrand || part.brand || 'Maruti Suzuki');
  const [model, setModel] = useState<string>(part.carModel || part.model || 'Swift');
  const [variant, setVariant] = useState<string>(part.carVariant || part.variant || '');
  const [carYear, setCarYear] = useState<string>(part.carYear ? String(part.carYear) : '2023');
  const [fuelType, setFuelType] = useState<string>(part.fuelType || 'Petrol');
  const [description, setDescription] = useState<string>(part.description || '');

  // Locked Location & Contact from ad post
  const lockedLocation =
    part.location ||
    (part.district && part.state ? `${part.district}, ${part.state}` : '') ||
    part.district ||
    part.city ||
    part.state ||
    'Begambur, Dindigul';

  // Modal Sheet States
  const [activeSheet, setActiveSheet] = useState<
    'category' | 'condition' | 'brand' | 'model' | 'variant' | 'year' | 'fuel' | 'description' | null
  >(null);
  const [sheetSearchQuery, setSheetSearchQuery] = useState('');
  const [tempDescInput, setTempDescInput] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  // Dynamic Categories & Brands from Admin Panel (Firestore)
  const [topCategories, setTopCategories] = useState<any[]>([]);
  const [carBrands, setCarBrands] = useState<any[]>([]);

  useEffect(() => {
    try {
      const db = getFirebaseFirestore();
      if (!db || typeof db.collection !== 'function') return;

      const unsubCats = db.collection('topCategories').onSnapshot(
        (snap: any) => {
          const catList: any[] = [];
          if (snap && typeof snap.forEach === 'function') {
            snap.forEach((doc: any) => {
              const data = doc.data ? doc.data() : doc;
              catList.push({ id: doc.id, ...data });
            });
          }
          catList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setTopCategories(catList);
        },
        (err: any) => console.warn('Categories sync error in EditListing:', err)
      );

      const unsubBrands = db.collection('carBrands').onSnapshot(
        (snap: any) => {
          const brandList: any[] = [];
          if (snap && typeof snap.forEach === 'function') {
            snap.forEach((doc: any) => {
              const data = doc.data ? doc.data() : doc;
              brandList.push({ id: doc.id, ...data });
            });
          }
          brandList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setCarBrands(brandList);
        },
        (err: any) => console.warn('Brands sync error in EditListing:', err)
      );

      return () => {
        try { unsubCats(); } catch (_) {}
        try { unsubBrands(); } catch (_) {}
      };
    } catch (_) {}
  }, []);

  // Available Categories (Admin CMS priority with HD 3D fallback)
  const availableCategories = useMemo(() => {
    if (topCategories && topCategories.length > 0) {
      const activeList = topCategories.filter(
        (c: any) => c.active !== false && c.id !== 'More' && c.name?.toLowerCase() !== 'more'
      );
      if (activeList.length > 0) {
        return activeList.map((c: any) => ({
          name: c.name || c.title,
          imageUrl: c.imageUrl,
          iconUrl: c.iconUrl || c.imageUrl,
          icon: c.icon || 'car-cog',
        }));
      }
    }
    return REAL_CATEGORIES.map((catName) => ({
      name: catName,
      imageUrl: undefined,
      iconUrl: undefined,
      icon: 'car-cog',
    }));
  }, [topCategories]);

  // Available Brands (Admin CMS priority with default fallback)
  const availableBrands = useMemo(() => {
    if (carBrands && carBrands.length > 0) {
      const activeList = carBrands.filter((b: any) => b.active !== false);
      const list = activeList.map((b: any) => b.name || b.title);
      if (brand && !list.some((x: string) => x.toLowerCase() === brand.toLowerCase())) {
        list.unshift(brand);
      }
      return list;
    }
    const list = Object.keys(DEFAULT_BRAND_MODELS);
    if (brand && !list.includes(brand)) list.unshift(brand);
    return list;
  }, [carBrands, brand]);

  const selectedCategoryItem = useMemo(() => {
    return availableCategories.find(
      (c) => c.name.toLowerCase() === category.toLowerCase()
    );
  }, [availableCategories, category]);

  const selectedBrandCustomLogo = useMemo(() => {
    const bDoc = carBrands.find(
      (cb) => (cb.name || cb.title)?.toLowerCase() === brand.toLowerCase()
    );
    return bDoc?.imageUrl || bDoc?.logoUrl || null;
  }, [carBrands, brand]);

  const availableModels = useMemo(() => {
    if (!brand) return [];
    return DEFAULT_BRAND_MODELS[brand] || [];
  }, [brand]);

  const availableVariants = useMemo(() => {
    if (!brand) return [];
    const modelKey = `${brand} ${model}`.trim();
    if (MODEL_SPECIFIC_VARIANTS[modelKey]) {
      return MODEL_SPECIFIC_VARIANTS[modelKey];
    }
    return (
      DEFAULT_BRAND_VARIANTS[brand] || [
        'All Variants (Fits All)',
        'Base Model',
        'VXI / SX',
        'ZXI / Top Model',
      ]
    );
  }, [brand, model]);

  // Handle Photo Picker
  const handleAddPhoto = async () => {
    if (images.length >= 6) {
      Alert.alert('Limit Reached', 'You can upload up to 6 photos per listing.');
      return;
    }
    try {
      const selected: any = await promptImageSourceDialog();
      const uri = typeof selected === 'string' ? selected : selected?.uri;
      if (uri) {
        setImages((prev) => (prev.length < 6 ? [...prev, uri] : prev));
      }
    } catch (err) {
      console.warn('[EditListingScreen] image pick error:', err);
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Submit Listing Update
  const handleSaveListing = async () => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a title for your spare part.');
      return;
    }
    const cleanPrice = price.replace(/[^0-9.]/g, '');
    const numPrice = parseFloat(cleanPrice);
    if (!cleanPrice || isNaN(numPrice) || numPrice <= 0) {
      Alert.alert('Price Required', 'Please enter a valid price in ₹.');
      return;
    }
    if (images.length === 0) {
      Alert.alert('Photo Required', 'Please provide at least 1 photo for your listing.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Separate local URIs from remote Cloudinary URLs
      const localUris: string[] = [];
      const remoteUrls: string[] = [];

      images.forEach((img) => {
        if (img.startsWith('http://') || img.startsWith('https://')) {
          remoteUrls.push(img);
        } else {
          localUris.push(img);
        }
      });

      // 2. Upload any local images to Cloudinary
      let uploadedUrls: string[] = [];
      if (localUris.length > 0) {
        uploadedUrls = await uploadMultipleImagesToCloudinary(localUris, 'parts');
      }

      const finalImages = [...remoteUrls, ...uploadedUrls];
      const primaryCover = finalImages[0] || '';

      // Delete removed old Cloudinary images in background
      const originalArr = (part.images || part.imageUrls || [part.imageUrl, part.image]).filter(
        Boolean
      );
      const toDelete = originalArr.filter((oldUrl: string) => !finalImages.includes(oldUrl));
      if (toDelete.length > 0) {
        deleteMultipleImagesFromCloudinary(toDelete).catch(() => null);
      }

      // 3. Payload with exact SellScreen fields
      const updatePayload: Record<string, any> = {
        title: title.trim(),
        name: title.trim(),
        partTitle: title.trim(),
        price: numPrice,
        partPrice: numPrice,
        category: category.trim(),
        condition: condition.trim(),
        brand: brand.trim(),
        carBrand: brand.trim(),
        model: model.trim(),
        carModel: model.trim(),
        variant: variant.trim() || null,
        carVariant: variant.trim() || null,
        carYear: carYear.trim() || null,
        year: carYear.trim() || null,
        fuelType: fuelType.trim() || null,
        description: description.trim(),
        imageUrl: primaryCover,
        image: primaryCover,
        images: finalImages,
        imageUrls: finalImages,
        updatedAt: Date.now(),
      };

      const db = getFirebaseFirestore();
      if (db && typeof db.collection === 'function' && part?.id) {
        await db.collection('spareParts').doc(part.id).set(updatePayload, { merge: true }).catch(() => null);
        await db.collection('parts').doc(part.id).set(updatePayload, { merge: true }).catch(() => null);
      }

      if (typeof onUpdated === 'function') {
        onUpdated({ ...part, ...updatePayload });
      }

      Alert.alert('Saved', 'Listing updated successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err: any) {
      console.error('[EditListingScreen] save error:', err);
      Alert.alert('Save Failed', err?.message || 'Unable to update listing right now.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Listing Confirmation
  const handleDeleteListing = () => {
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
              setIsSaving(true);
              const db = getFirebaseFirestore();
              if (db && typeof db.collection === 'function' && part?.id) {
                await db.collection('spareParts').doc(part.id).delete();
                await db.collection('parts').doc(part.id).delete().catch(() => null);
              }
              const oldImgs = (part.images || part.imageUrls || [part.imageUrl, part.image]).filter(
                Boolean
              );
              if (oldImgs.length > 0) {
                deleteMultipleImagesFromCloudinary(oldImgs).catch(() => null);
              }
              Alert.alert('Deleted', 'Listing permanently deleted.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (err: any) {
              Alert.alert('Delete Failed', err?.message || 'Failed to delete listing.');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0B132B" />

      {/* TOP BAR */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Icon source="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Edit Listing</Text>

        <TouchableOpacity
          onPress={handleDeleteListing}
          style={styles.headerBtn}
          activeOpacity={0.7}
          disabled={isSaving}
        >
          <Icon source="trash-can-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* CARD 1: PHOTOS (Up to 6) */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.iconTitleRow}>
                <Icon source="camera" size={20} color="#0066FF" />
                <Text style={styles.cardHeading}>Photos ({images.length}/6)</Text>
              </View>
              <Text style={styles.cardSubheading}>Add up to 6 photos</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photosRow}
            >
              {images.map((imgUri, index) => (
                <View key={index} style={styles.photoBox}>
                  <Image source={{ uri: imgUri }} style={styles.photoImg as any} resizeMode="cover" />
                  {index === 0 && (
                    <View style={styles.coverPill}>
                      <Text style={styles.coverPillText}>Cover</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removePhotoBadge}
                    onPress={() => handleRemovePhoto(index)}
                    activeOpacity={0.8}
                  >
                    <Icon source="close" size={13} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}

              {images.length < 6 && (
                <TouchableOpacity
                  style={styles.addPhotoDashed}
                  onPress={handleAddPhoto}
                  activeOpacity={0.7}
                >
                  <Icon source="camera" size={26} color="#0066FF" />
                  <Text style={styles.addPhotoText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* CARD 2: TITLE & PRICE */}
          <View style={styles.card}>
            {/* Title Field */}
            <View style={styles.fieldHeaderRow}>
              <Icon source="pencil-box-outline" size={20} color="#0066FF" />
              <Text style={styles.fieldLabel}>Title</Text>
            </View>
            <View style={styles.inputContainer}>
              <RNTextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Maruti Suzuki Swift Headlight Assembly"
                placeholderTextColor="#94A3B8"
              />
              {title.length > 0 && (
                <TouchableOpacity
                  onPress={() => setTitle('')}
                  style={styles.clearBtn}
                  activeOpacity={0.7}
                >
                  <Icon source="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Price Field */}
            <View style={[styles.fieldHeaderRow, { marginTop: 14 }]}>
              <Icon source="currency-inr" size={20} color="#0066FF" />
              <Text style={styles.fieldLabel}>Price ( ₹ )</Text>
            </View>
            <View style={styles.inputContainer}>
              <RNTextInput
                style={styles.textInput}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                placeholder="e.g. 3500"
                placeholderTextColor="#94A3B8"
              />
              {price.length > 0 && (
                <TouchableOpacity
                  onPress={() => setPrice('')}
                  style={styles.clearBtn}
                  activeOpacity={0.7}
                >
                  <Icon source="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* CARD 3: SPECIFICATIONS & FITMENT (Matching Image rows) */}
          <View style={styles.card}>
            {/* Category Row */}
            <TouchableOpacity
              style={styles.specRow}
              onPress={() => {
                setSheetSearchQuery('');
                setActiveSheet('category');
              }}
              activeOpacity={0.6}
            >
              <View style={styles.specLeft}>
                <Icon source="cog" size={20} color="#F97316" />
                <Text style={styles.specLabel}>Category</Text>
              </View>
              <View style={styles.specRight}>
                <Text style={styles.specValue} numberOfLines={1}>
                  {category}
                </Text>
                <Icon source="chevron-right" size={20} color="#94A3B8" />
              </View>
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            {/* Condition Row */}
            <TouchableOpacity
              style={styles.specRow}
              onPress={() => setActiveSheet('condition')}
              activeOpacity={0.6}
            >
              <View style={styles.specLeft}>
                <Icon source="package-variant-closed" size={20} color="#F97316" />
                <Text style={styles.specLabel}>Condition</Text>
              </View>
              <View style={styles.specRight}>
                <Text style={styles.specValue} numberOfLines={1}>
                  {condition}
                </Text>
                <Icon source="chevron-right" size={20} color="#94A3B8" />
              </View>
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            {/* Car Brand / Make Row */}
            <TouchableOpacity
              style={styles.specRow}
              onPress={() => {
                setSheetSearchQuery('');
                setActiveSheet('brand');
              }}
              activeOpacity={0.6}
            >
              <View style={styles.specLeft}>
                <Icon source="car" size={20} color="#0066FF" />
                <Text style={styles.specLabel}>Car Brand / Make</Text>
              </View>
              <View style={styles.specRight}>
                <Text style={styles.specValue} numberOfLines={1}>
                  {brand}
                </Text>
                <Icon source="chevron-right" size={20} color="#94A3B8" />
              </View>
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            {/* Model Row */}
            <TouchableOpacity
              style={styles.specRow}
              onPress={() => {
                setSheetSearchQuery('');
                setActiveSheet('model');
              }}
              activeOpacity={0.6}
            >
              <View style={styles.specLeft}>
                <Icon source="car-sports" size={20} color="#0066FF" />
                <Text style={styles.specLabel}>Model</Text>
              </View>
              <View style={styles.specRight}>
                <Text style={styles.specValue} numberOfLines={1}>
                  {model || 'Select Model'}
                </Text>
                <Icon source="chevron-right" size={20} color="#94A3B8" />
              </View>
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            {/* Variant (Optional) Row */}
            <TouchableOpacity
              style={styles.specRow}
              onPress={() => {
                setSheetSearchQuery('');
                setActiveSheet('variant');
              }}
              activeOpacity={0.6}
            >
              <View style={styles.specLeft}>
                <Icon source="format-list-bulleted" size={20} color="#0066FF" />
                <Text style={styles.specLabel}>Variant (Optional)</Text>
              </View>
              <View style={styles.specRight}>
                <Text style={styles.specValue} numberOfLines={1}>
                  {variant || 'Optional'}
                </Text>
                <Icon source="chevron-right" size={20} color="#94A3B8" />
              </View>
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            {/* Manufacturing Year Row */}
            <TouchableOpacity
              style={styles.specRow}
              onPress={() => setActiveSheet('year')}
              activeOpacity={0.6}
            >
              <View style={styles.specLeft}>
                <Icon source="calendar-month-outline" size={20} color="#0066FF" />
                <Text style={styles.specLabel}>Manufacturing Year</Text>
              </View>
              <View style={styles.specRight}>
                <Text style={styles.specValue} numberOfLines={1}>
                  {carYear}
                </Text>
                <Icon source="chevron-right" size={20} color="#94A3B8" />
              </View>
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            {/* Fuel Type Row */}
            <TouchableOpacity
              style={styles.specRow}
              onPress={() => setActiveSheet('fuel')}
              activeOpacity={0.6}
            >
              <View style={styles.specLeft}>
                <Icon source="water-outline" size={20} color="#0066FF" />
                <Text style={styles.specLabel}>Fuel Type</Text>
              </View>
              <View style={styles.specRight}>
                <Text style={styles.specValue} numberOfLines={1}>
                  {fuelType}
                </Text>
                <Icon source="chevron-right" size={20} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          </View>

          {/* CARD 4: DESCRIPTION */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.descCardHeader}
              onPress={() => {
                setTempDescInput(description);
                setActiveSheet('description');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.specLeft}>
                <Icon source="text-box-outline" size={20} color="#0066FF" />
                <Text style={styles.specLabel}>Description</Text>
              </View>
              <Icon source="chevron-right" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setTempDescInput(description);
                setActiveSheet('description');
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.descPreviewText,
                  !description && { color: '#94A3B8', fontStyle: 'italic' },
                ]}
                numberOfLines={3}
              >
                {description || 'Tap to edit description...'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* CARD 5: LOCATION & CONTACT (Locked) */}
          <View style={styles.card}>
            <View style={styles.specRow}>
              <View style={styles.specLeft}>
                <Icon source="map-marker" size={20} color="#0066FF" />
                <View>
                  <Text style={styles.specLabel}>Location & Contact</Text>
                  <Text style={styles.locValueText}>{lockedLocation}</Text>
                  <Text style={styles.locSubText}>Cannot be changed</Text>
                </View>
              </View>
              <View style={styles.specRight}>
                <Icon source="lock" size={18} color="#94A3B8" />
                <Icon source="chevron-right" size={20} color="#CBD5E1" />
              </View>
            </View>
          </View>

          {/* BOTTOM SUBMIT BUTTON */}
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
            onPress={handleSaveListing}
            activeOpacity={0.8}
            disabled={isSaving}
          >
            {isSaving ? (
              <View style={styles.btnRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Saving Changes...</Text>
              </View>
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ============================================================ */}
      {/* 1. SELECT CATEGORY BOTTOM SHEET (Exact Match to Demo Image) */}
      {/* ============================================================ */}
      <Modal
        visible={activeSheet === 'category'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveSheet(null)}
      >
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity
            style={styles.sheetDismissArea}
            activeOpacity={1}
            onPress={() => setActiveSheet(null)}
          />
          <View style={styles.sheetCard}>
            {/* Top Handle */}
            <View style={styles.sheetHandle} />

            {/* Title */}
            <Text style={styles.sheetTitle}>Select Category</Text>

            {/* Category List */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetListContent}
            >
              {availableCategories.map((catItem) => {
                const catName = typeof catItem === 'string' ? catItem : catItem.name;
                const catImageUrl = typeof catItem === 'object' ? (catItem.imageUrl || catItem.iconUrl) : undefined;
                const isSelected = category.toLowerCase() === catName.toLowerCase();
                return (
                  <TouchableOpacity
                    key={catName}
                    style={[
                      styles.categorySheetRow,
                      isSelected && styles.categorySheetRowSelected,
                    ]}
                    activeOpacity={0.6}
                    onPress={() => {
                      setCategory(catName);
                      setActiveSheet(null);
                    }}
                  >
                    <View style={styles.catLeftGroup}>
                      {catImageUrl ? (
                        <Image
                          source={{ uri: catImageUrl }}
                          style={{ width: 44, height: 44, borderRadius: 10, resizeMode: 'contain', backgroundColor: '#F8FAFC' }}
                        />
                      ) : (
                        <Category3DIcon categoryName={catName} size={48} />
                      )}
                      <Text
                        style={[
                          styles.catItemName,
                          isSelected && styles.catItemNameSelected,
                        ]}
                      >
                        {catName}
                      </Text>
                    </View>

                    <Icon
                      source={isSelected ? 'check' : 'chevron-right'}
                      size={22}
                      color={isSelected ? '#0066FF' : '#94A3B8'}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.sheetCancelBtn}
              onPress={() => setActiveSheet(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* 2. SELECT CAR BRAND BOTTOM SHEET */}
      {/* ============================================================ */}
      <Modal
        visible={activeSheet === 'brand'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveSheet(null)}
      >
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity
            style={styles.sheetDismissArea}
            activeOpacity={1}
            onPress={() => setActiveSheet(null)}
          />
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Select Car Brand / Make</Text>

            {/* Search Input */}
            <View style={styles.sheetSearchBox}>
              <Icon source="magnify" size={20} color="#94A3B8" />
              <RNTextInput
                style={styles.sheetSearchInput}
                placeholder="Search brand (e.g. Maruti, Hyundai, Tata)"
                placeholderTextColor="#94A3B8"
                value={sheetSearchQuery}
                onChangeText={setSheetSearchQuery}
              />
              {sheetSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSheetSearchQuery('')}>
                  <Icon source="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetListContent}
            >
              {availableBrands
                .filter((b) => b.toLowerCase().includes(sheetSearchQuery.toLowerCase()))
                .map((b) => {
                  const isSelected = brand.toLowerCase() === b.toLowerCase();
                  const brandDoc = carBrands.find(
                    (cb) => (cb.name || cb.title)?.toLowerCase() === b.toLowerCase()
                  );
                  const brandLogoUrl = brandDoc?.imageUrl || brandDoc?.logoUrl;
                  return (
                    <TouchableOpacity
                      key={b}
                      style={[styles.simpleSheetRow, isSelected && styles.simpleSheetRowSelected]}
                      activeOpacity={0.6}
                      onPress={() => {
                        setBrand(b);
                        // Reset model if brand changed
                        if (brand.toLowerCase() !== b.toLowerCase()) {
                          const newModels = DEFAULT_BRAND_MODELS[b] || [];
                          setModel(newModels[0] || '');
                          setVariant('');
                        }
                        setActiveSheet(null);
                      }}
                    >
                      <View style={styles.brandRowLeft}>
                        {brandLogoUrl ? (
                          <Image
                            source={{ uri: brandLogoUrl }}
                            style={{ width: 30, height: 30, borderRadius: 6, resizeMode: 'contain' }}
                          />
                        ) : (
                          <BrandLogo brand={b} size={30} />
                        )}
                        <Text style={[styles.simpleRowText, isSelected && styles.simpleRowTextSelected]}>
                          {b}
                        </Text>
                      </View>
                      <Icon
                        source={isSelected ? 'check' : 'chevron-right'}
                        size={20}
                        color={isSelected ? '#0066FF' : '#94A3B8'}
                      />
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>

            <TouchableOpacity
              style={styles.sheetCancelBtn}
              onPress={() => setActiveSheet(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* 3. SELECT CAR MODEL BOTTOM SHEET */}
      {/* ============================================================ */}
      <Modal
        visible={activeSheet === 'model'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveSheet(null)}
      >
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity
            style={styles.sheetDismissArea}
            activeOpacity={1}
            onPress={() => setActiveSheet(null)}
          />
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Select Model ({brand})</Text>

            <View style={styles.sheetSearchBox}>
              <Icon source="magnify" size={20} color="#94A3B8" />
              <RNTextInput
                style={styles.sheetSearchInput}
                placeholder="Search car model..."
                placeholderTextColor="#94A3B8"
                value={sheetSearchQuery}
                onChangeText={setSheetSearchQuery}
              />
              {sheetSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSheetSearchQuery('')}>
                  <Icon source="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetListContent}
            >
              {availableModels
                .filter((m) => m.toLowerCase().includes(sheetSearchQuery.toLowerCase()))
                .map((m) => {
                  const isSelected = model.toLowerCase() === m.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.simpleSheetRow, isSelected && styles.simpleSheetRowSelected]}
                      activeOpacity={0.6}
                      onPress={() => {
                        setModel(m);
                        setVariant('');
                        setActiveSheet(null);
                      }}
                    >
                      <Text style={[styles.simpleRowText, isSelected && styles.simpleRowTextSelected]}>
                        {m}
                      </Text>
                      <Icon
                        source={isSelected ? 'check' : 'chevron-right'}
                        size={20}
                        color={isSelected ? '#0066FF' : '#94A3B8'}
                      />
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>

            <TouchableOpacity
              style={styles.sheetCancelBtn}
              onPress={() => setActiveSheet(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* 4. SELECT VARIANT BOTTOM SHEET */}
      {/* ============================================================ */}
      <Modal
        visible={activeSheet === 'variant'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveSheet(null)}
      >
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity
            style={styles.sheetDismissArea}
            activeOpacity={1}
            onPress={() => setActiveSheet(null)}
          />
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Select Variant</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetListContent}
            >
              {availableVariants.map((v) => {
                const isSelected = variant.toLowerCase() === v.toLowerCase();
                return (
                  <TouchableOpacity
                    key={v}
                    style={[styles.simpleSheetRow, isSelected && styles.simpleSheetRowSelected]}
                    activeOpacity={0.6}
                    onPress={() => {
                      setVariant(v);
                      setActiveSheet(null);
                    }}
                  >
                    <Text style={[styles.simpleRowText, isSelected && styles.simpleRowTextSelected]}>
                      {v}
                    </Text>
                    <Icon
                      source={isSelected ? 'check' : 'chevron-right'}
                      size={20}
                      color={isSelected ? '#0066FF' : '#94A3B8'}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.sheetCancelBtn}
              onPress={() => setActiveSheet(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* 5. SELECT CONDITION BOTTOM SHEET */}
      {/* ============================================================ */}
      <Modal
        visible={activeSheet === 'condition'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveSheet(null)}
      >
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity
            style={styles.sheetDismissArea}
            activeOpacity={1}
            onPress={() => setActiveSheet(null)}
          />
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Select Condition</Text>

            <View style={styles.sheetListContent}>
              {CONDITION_OPTIONS.map((c) => {
                const isSelected =
                  condition.toLowerCase() === c.label.toLowerCase() ||
                  condition.toLowerCase() === c.id.toLowerCase();
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.conditionSheetRow, isSelected && styles.simpleSheetRowSelected]}
                    activeOpacity={0.6}
                    onPress={() => {
                      setCondition(c.label);
                      setActiveSheet(null);
                    }}
                  >
                    <View style={styles.conditionRowLeft}>
                      <Text style={[styles.simpleRowText, isSelected && styles.simpleRowTextSelected]}>
                        {c.label}
                      </Text>
                      <Text style={styles.conditionDescText}>{c.desc}</Text>
                    </View>
                    <Icon
                      source={isSelected ? 'check' : 'chevron-right'}
                      size={20}
                      color={isSelected ? '#0066FF' : '#94A3B8'}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.sheetCancelBtn}
              onPress={() => setActiveSheet(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* 6. SELECT MANUFACTURING YEAR BOTTOM SHEET */}
      {/* ============================================================ */}
      <Modal
        visible={activeSheet === 'year'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveSheet(null)}
      >
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity
            style={styles.sheetDismissArea}
            activeOpacity={1}
            onPress={() => setActiveSheet(null)}
          />
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Manufacturing Year</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetListContent}
            >
              {YEARS.map((yr) => {
                const isSelected = carYear === yr;
                return (
                  <TouchableOpacity
                    key={yr}
                    style={[styles.simpleSheetRow, isSelected && styles.simpleSheetRowSelected]}
                    activeOpacity={0.6}
                    onPress={() => {
                      setCarYear(yr);
                      setActiveSheet(null);
                    }}
                  >
                    <Text style={[styles.simpleRowText, isSelected && styles.simpleRowTextSelected]}>
                      {yr}
                    </Text>
                    <Icon
                      source={isSelected ? 'check' : 'chevron-right'}
                      size={20}
                      color={isSelected ? '#0066FF' : '#94A3B8'}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.sheetCancelBtn}
              onPress={() => setActiveSheet(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* 7. SELECT FUEL TYPE BOTTOM SHEET */}
      {/* ============================================================ */}
      <Modal
        visible={activeSheet === 'fuel'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveSheet(null)}
      >
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity
            style={styles.sheetDismissArea}
            activeOpacity={1}
            onPress={() => setActiveSheet(null)}
          />
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Select Fuel Type</Text>

            <View style={styles.sheetListContent}>
              {FUEL_TYPES.map((f) => {
                const isSelected = fuelType === f;
                return (
                  <TouchableOpacity
                    key={f}
                    style={[styles.simpleSheetRow, isSelected && styles.simpleSheetRowSelected]}
                    activeOpacity={0.6}
                    onPress={() => {
                      setFuelType(f);
                      setActiveSheet(null);
                    }}
                  >
                    <Text style={[styles.simpleRowText, isSelected && styles.simpleRowTextSelected]}>
                      {f}
                    </Text>
                    <Icon
                      source={isSelected ? 'check' : 'chevron-right'}
                      size={20}
                      color={isSelected ? '#0066FF' : '#94A3B8'}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.sheetCancelBtn}
              onPress={() => setActiveSheet(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* 8. DESCRIPTION EDIT MODAL */}
      {/* ============================================================ */}
      <Modal
        visible={activeSheet === 'description'}
        animationType="fade"
        transparent
        onRequestClose={() => setActiveSheet(null)}
      >
        <View style={styles.modalCenterBackdrop}>
          <View style={[styles.modalDialogCard, { maxHeight: height * 0.7 }]}>
            <Text style={styles.modalDialogTitle}>Description</Text>
            <Text style={styles.modalDialogSubtitle}>
              Detail working condition, part authenticity, and fitment details.
            </Text>
            <RNTextInput
              style={styles.dialogTextArea}
              placeholder="Provide complete description for buyers..."
              placeholderTextColor="#94A3B8"
              value={tempDescInput}
              onChangeText={setTempDescInput}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <View style={styles.dialogActionsRow}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setActiveSheet(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogSaveBtn}
                onPress={() => {
                  setDescription(tempDescInput.trim());
                  setActiveSheet(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.dialogSaveText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  flex1: {
    flex: 1,
  },
  topHeader: {
    height: 56,
    backgroundColor: '#0B132B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
    gap: 12,
  },
  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubheading: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  // Photos Row
  photosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  photoBox: {
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  coverPill: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: '#0066FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  coverPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  removePhotoBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoDashed: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#93C5FD',
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0066FF',
  },
  // Fields in Card 2
  fieldHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  inputContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  // Toggles in Card 2
  togglesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  toggleDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  switchSmall: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  // Specifications Card Rows
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  specLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  specRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '50%',
  },
  specLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  specValue: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'right',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  // Description Card
  descCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  descPreviewText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  // Location Card
  locValueText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 2,
  },
  locSubText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  // Bottom Save Button
  saveBtn: {
    backgroundColor: '#0066FF',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#0066FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Bottom Sheet Modal
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetDismissArea: {
    flex: 1,
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    maxHeight: height * 0.85,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
  },
  sheetSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
    gap: 8,
  },
  sheetSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  sheetListContent: {
    paddingBottom: 16,
  },
  // Category Sheet Rows (matches image)
  categorySheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categorySheetRowSelected: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  catLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  catItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  catItemNameSelected: {
    color: '#0066FF',
  },
  sheetCancelBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  sheetCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  // Generic / Simple Sheet Rows
  simpleSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  simpleSheetRowSelected: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  brandRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  simpleRowText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  simpleRowTextSelected: {
    color: '#0066FF',
    fontWeight: '700',
  },
  // Condition Rows
  conditionSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  conditionRowLeft: {
    flex: 1,
  },
  conditionDescText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  // Dialog Modals (OEM & Desc)
  modalCenterBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalDialogCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
  },
  modalDialogTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalDialogSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  dialogTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 16,
  },
  dialogTextArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    height: 120,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 16,
  },
  dialogActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  dialogCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  dialogCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  dialogSaveBtn: {
    backgroundColor: '#0066FF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  dialogSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Error fallback
  errorCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  goBackBtn: {
    backgroundColor: '#0066FF',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  goBackBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
