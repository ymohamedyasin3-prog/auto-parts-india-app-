import React, { useState, useEffect } from 'react';
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
  FlatList,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {
  TextInput,
  Button,
  IconButton,
  Chip,
  Divider,
  Surface,
  Icon,
} from 'react-native-paper';
import {
  promptImageSourceDialog,
} from '../services/imagePickerService';
import { uploadMultipleImagesToCloudinary } from '../services/cloudinary';
import { getFirebaseFirestore, getCurrentUser } from '../services/firebase';

const CATEGORIES = [
  'Engine & Mechanical',
  'Body & Exterior',
  'Lights & Electricals',
  'Suspension & Brakes',
  'Interior & Wheels',
  'Cooling & AC',
  'Transmission & Clutch',
  'Exhaust & Fuel',
];

const POPULAR_BRANDS = [
  'Maruti Suzuki',
  'Hyundai',
  'Tata',
  'Mahindra',
  'Toyota',
  'Honda',
  'Kia',
  'Volkswagen',
  'Skoda',
  'Ford',
  'MG',
  'Renault',
  'Nissan',
  'BMW',
  'Mercedes-Benz',
  'Audi',
  'Universal',
];

const FUEL_TYPES = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid', 'All / Any'];

export default function EditListingScreen({ navigation, route }: any) {
  const part = route?.params?.part;
  const onUpdated = route?.params?.onUpdated;

  if (!part) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorCenter}>
          <Icon source="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>No listing selected to edit.</Text>
          <Button mode="contained" onPress={() => navigation.goBack()} style={styles.btnPrimary}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // Extract initial images array
  const initialImages: string[] = [];
  if (Array.isArray(part.images) && part.images.length > 0) {
    part.images.forEach((img: any) => {
      if (typeof img === 'string' && img) initialImages.push(img);
    });
  } else if (Array.isArray(part.imageUrls) && part.imageUrls.length > 0) {
    part.imageUrls.forEach((img: any) => {
      if (typeof img === 'string' && img) initialImages.push(img);
    });
  } else if (part.imageUrl) {
    initialImages.push(part.imageUrl);
  }

  // State
  const [images, setImages] = useState<string[]>(initialImages);
  const [title, setTitle] = useState(part.title || part.name || part.partTitle || '');
  const [price, setPrice] = useState(String(part.price || part.partPrice || ''));
  const [category, setCategory] = useState(part.category || 'Engine & Mechanical');
  const [brand, setBrand] = useState(part.carBrand || part.brand || 'Universal');
  const [model, setModel] = useState(part.carModel || part.model || '');
  const [variant, setVariant] = useState(part.carVariant || part.variant || '');
  const [carYear, setCarYear] = useState(part.carYear ? String(part.carYear) : '');
  const [fuelType, setFuelType] = useState(part.fuelType || 'Petrol');
  const [condition, setCondition] = useState(part.condition || 'Used');
  const [partNumber, setPartNumber] = useState(part.partNumber || part.oemNumber || '');
  const [warranty, setWarranty] = useState(part.warranty || 'No Warranty');
  const [description, setDescription] = useState(part.description || '');
  const [negotiable, setNegotiable] = useState(Boolean(part.negotiable || part.isNegotiable));
  const [deliveryAvailable, setDeliveryAvailable] = useState(Boolean(part.deliveryAvailable || part.allIndiaShipping));

  // Read-only locked fields
  const lockedLocation = part.location || part.district || part.city || part.state || 'India';
  const lockedPhone = part.sellerPhone || part.phone || part.contactNumber || 'Contact via In-App Chat';

  const [isSaving, setIsSaving] = useState(false);

  // Add Photo Handler
  const handleAddPhoto = async () => {
    if (images.length >= 6) {
      Alert.alert('Limit Reached', 'You can upload a maximum of 6 photos per listing.');
      return;
    }

    try {
      const selected: any = await promptImageSourceDialog();
      const imgUri = typeof selected === 'string' ? selected : selected?.uri;
      if (imgUri) {
        setImages((prev) => [...prev, imgUri]);
      }
    } catch (err: any) {
      console.warn('Image picker error:', err);
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Submit Update
  const handleSaveListing = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your spare part.');
      return;
    }

    const numericPrice = parseFloat(price.replace(/[^0-9.]/g, ''));
    if (isNaN(numericPrice) || numericPrice <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid selling price in ₹.');
      return;
    }

    if (images.length === 0) {
      Alert.alert('Photo Required', 'Please provide at least 1 photo of the spare part.');
      return;
    }

    setIsSaving(true);

    try {
      // 1. Separate local vs already-hosted Cloudinary images
      const localUris: string[] = [];
      const remoteUrls: string[] = [];

      images.forEach((img) => {
        if (img.startsWith('http://') || img.startsWith('https://')) {
          remoteUrls.push(img);
        } else {
          localUris.push(img);
        }
      });

      // 2. Upload any newly picked local images
      let newlyUploadedUrls: string[] = [];
      if (localUris.length > 0) {
        newlyUploadedUrls = await uploadMultipleImagesToCloudinary(localUris, 'parts');
      }

      const finalImages = [...remoteUrls, ...newlyUploadedUrls];
      const primaryImageUrl = finalImages[0] || '';

      // 3. Build comprehensive sync update payload
      const updateData = {
        title: title.trim(),
        name: title.trim(),
        partTitle: title.trim(),
        price: numericPrice,
        partPrice: numericPrice,
        category,
        brand: brand.trim(),
        carBrand: brand.trim(),
        finalBrand: brand.trim(),
        model: model.trim(),
        carModel: model.trim(),
        finalModel: model.trim(),
        variant: variant.trim(),
        carVariant: variant.trim(),
        carYear: carYear.trim() || undefined,
        fuelType,
        condition,
        partNumber: partNumber.trim() || undefined,
        oemNumber: partNumber.trim() || undefined,
        warranty,
        description: description.trim(),
        negotiable,
        isNegotiable: negotiable,
        deliveryAvailable,
        allIndiaShipping: deliveryAvailable,
        imageUrl: primaryImageUrl,
        image: primaryImageUrl,
        images: finalImages,
        imageUrls: finalImages,
        updatedAt: Date.now(),
      };

      const db = getFirebaseFirestore();
      if (db && typeof db.collection === 'function') {
        // Update Firestore in both spareParts and parts collections if present
        await db.collection('spareParts').doc(part.id).set(updateData, { merge: true }).catch(() => null);
        await db.collection('parts').doc(part.id).set(updateData, { merge: true }).catch(() => null);
      }

      if (typeof onUpdated === 'function') {
        onUpdated({ ...part, ...updateData });
      }

      Alert.alert('Success', 'Listing updated successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err: any) {
      console.error('[EditListingScreen] Update error:', err);
      Alert.alert('Update Failed', err?.message || 'Could not update listing. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteListing = () => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to permanently delete this listing? It will be removed immediately.',
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
              }
              Alert.alert('Deleted', 'Listing permanently deleted.', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1220" />

      {/* TOP APP BAR */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Icon source="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Listing</Text>
        <TouchableOpacity
          onPress={handleDeleteListing}
          style={styles.deleteHeaderBtn}
          activeOpacity={0.7}
          disabled={isSaving}
        >
          <Icon source="trash-can-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* SECTION 1: PHOTOS (Up to 6) */}
          <Surface style={styles.cardSection} elevation={1}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.titleIconRow}>
                <Icon source="camera" size={20} color="#0066FF" />
                <Text style={styles.sectionTitle}>Listing Photos ({images.length}/6)</Text>
              </View>
              <Text style={styles.helperText}>Tap photo to delete</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
              {images.map((imgUri, index) => (
                <View key={index} style={styles.photoContainer}>
                  <Image source={{ uri: imgUri }} style={styles.photoThumb} />
                  {index === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>COVER</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.deletePhotoBtn}
                    onPress={() => handleRemovePhoto(index)}
                    activeOpacity={0.8}
                  >
                    <Icon source="close" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}

              {images.length < 6 && (
                <TouchableOpacity
                  style={styles.addPhotoBox}
                  onPress={handleAddPhoto}
                  activeOpacity={0.8}
                >
                  <Icon source="camera-plus-outline" size={28} color="#0066FF" />
                  <Text style={styles.addPhotoText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </Surface>

          {/* SECTION 2: ESSENTIAL INFORMATION */}
          <Surface style={styles.cardSection} elevation={1}>
            <View style={styles.titleIconRow}>
              <Icon source="car-cog" size={20} color="#0066FF" />
              <Text style={styles.sectionTitle}>Basic Details</Text>
            </View>

            {/* Title */}
            <Text style={styles.fieldLabel}>Listing Title *</Text>
            <TextInput
              mode="outlined"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. OEM LED Headlight Assembly Right Side"
              outlineColor="#334155"
              activeOutlineColor="#0066FF"
              textColor="#FFFFFF"
              style={styles.input}
              theme={{ colors: { background: '#1E293B' } }}
            />

            {/* Price */}
            <Text style={styles.fieldLabel}>Selling Price (₹) *</Text>
            <TextInput
              mode="outlined"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholder="e.g. 4500"
              outlineColor="#334155"
              activeOutlineColor="#0066FF"
              textColor="#FFFFFF"
              style={styles.input}
              theme={{ colors: { background: '#1E293B' } }}
            />

            {/* Negotiable & Delivery Toggles */}
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.togglePill, negotiable && styles.togglePillActive]}
                onPress={() => setNegotiable(!negotiable)}
                activeOpacity={0.8}
              >
                <Icon source={negotiable ? "check-circle" : "checkbox-blank-circle-outline"} size={18} color={negotiable ? "#FFFFFF" : "#94A3B8"} />
                <Text style={[styles.toggleText, negotiable && styles.toggleTextActive]}>Price Negotiable</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.togglePill, deliveryAvailable && styles.togglePillActive]}
                onPress={() => setDeliveryAvailable(!deliveryAvailable)}
                activeOpacity={0.8}
              >
                <Icon source={deliveryAvailable ? "truck-fast" : "truck-outline"} size={18} color={deliveryAvailable ? "#FFFFFF" : "#94A3B8"} />
                <Text style={[styles.toggleText, deliveryAvailable && styles.toggleTextActive]}>All India Shipping</Text>
              </TouchableOpacity>
            </View>
          </Surface>

          {/* SECTION 3: CATEGORY & CONDITION */}
          <Surface style={styles.cardSection} elevation={1}>
            <View style={styles.titleIconRow}>
              <Icon source="shape" size={20} color="#0066FF" />
              <Text style={styles.sectionTitle}>Category & Condition</Text>
            </View>

            {/* Category Chips */}
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.chipWrap}>
              {CATEGORIES.map((cat) => {
                const selected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.choiceChip, selected && styles.choiceChipActive]}
                    onPress={() => setCategory(cat)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Condition Chips */}
            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Condition</Text>
            <View style={styles.conditionRow}>
              {['Brand New', 'Used / OEM', 'Refurbished'].map((cond) => {
                const selected = condition.toLowerCase() === cond.toLowerCase();
                return (
                  <TouchableOpacity
                    key={cond}
                    style={[styles.condPill, selected && styles.condPillActive]}
                    onPress={() => setCondition(cond)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.condPillText, selected && styles.condPillTextActive]}>
                      {cond}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Surface>

          {/* SECTION 4: VEHICLE FITMENT (BRAND, MODEL, VARIANT, YEAR) */}
          <Surface style={styles.cardSection} elevation={1}>
            <View style={styles.titleIconRow}>
              <Icon source="car" size={20} color="#0066FF" />
              <Text style={styles.sectionTitle}>Car Compatibility</Text>
            </View>

            {/* Popular Brands Quick Select */}
            <Text style={styles.fieldLabel}>Car Brand / Make</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.brandQuickRow}>
              {POPULAR_BRANDS.map((b) => {
                const selected = brand.toLowerCase() === b.toLowerCase();
                return (
                  <TouchableOpacity
                    key={b}
                    style={[styles.brandQuickPill, selected && styles.brandQuickPillActive]}
                    onPress={() => setBrand(b)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.brandQuickText, selected && styles.brandQuickTextActive]}>
                      {b}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TextInput
              mode="outlined"
              value={brand}
              onChangeText={setBrand}
              placeholder="Or type custom brand"
              outlineColor="#334155"
              activeOutlineColor="#0066FF"
              textColor="#FFFFFF"
              style={[styles.input, { marginTop: 8 }]}
              theme={{ colors: { background: '#1E293B' } }}
            />

            {/* Car Model & Variant */}
            <View style={styles.twoColumnRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.fieldLabel}>Car Model</Text>
                <TextInput
                  mode="outlined"
                  value={model}
                  onChangeText={setModel}
                  placeholder="e.g. Swift / Creta"
                  outlineColor="#334155"
                  activeOutlineColor="#0066FF"
                  textColor="#FFFFFF"
                  style={styles.input}
                  theme={{ colors: { background: '#1E293B' } }}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.fieldLabel}>Variant (Optional)</Text>
                <TextInput
                  mode="outlined"
                  value={variant}
                  onChangeText={setVariant}
                  placeholder="e.g. VXI / SX"
                  outlineColor="#334155"
                  activeOutlineColor="#0066FF"
                  textColor="#FFFFFF"
                  style={styles.input}
                  theme={{ colors: { background: '#1E293B' } }}
                />
              </View>
            </View>

            {/* Manufacturing Year & OEM Number */}
            <View style={styles.twoColumnRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.fieldLabel}>Manufacturing Year</Text>
                <TextInput
                  mode="outlined"
                  value={carYear}
                  onChangeText={setCarYear}
                  keyboardType="numeric"
                  placeholder="e.g. 2019"
                  outlineColor="#334155"
                  activeOutlineColor="#0066FF"
                  textColor="#FFFFFF"
                  style={styles.input}
                  theme={{ colors: { background: '#1E293B' } }}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.fieldLabel}>OEM Part Number</Text>
                <TextInput
                  mode="outlined"
                  value={partNumber}
                  onChangeText={setPartNumber}
                  placeholder="e.g. 35120-M76R00"
                  outlineColor="#334155"
                  activeOutlineColor="#0066FF"
                  textColor="#FFFFFF"
                  style={styles.input}
                  theme={{ colors: { background: '#1E293B' } }}
                />
              </View>
            </View>

            {/* Fuel Type */}
            <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Fuel Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fuelRow}>
              {FUEL_TYPES.map((f) => {
                const selected = fuelType === f;
                return (
                  <TouchableOpacity
                    key={f}
                    style={[styles.fuelPill, selected && styles.fuelPillActive]}
                    onPress={() => setFuelType(f)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.fuelPillText, selected && styles.fuelPillTextActive]}>
                      {f}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Surface>

          {/* SECTION 5: DESCRIPTION */}
          <Surface style={styles.cardSection} elevation={1}>
            <View style={styles.titleIconRow}>
              <Icon source="text-box-outline" size={20} color="#0066FF" />
              <Text style={styles.sectionTitle}>Description & Fitment Notes</Text>
            </View>

            <TextInput
              mode="outlined"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              placeholder="Describe condition, scratch status, working guarantee or any fitment instructions..."
              outlineColor="#334155"
              activeOutlineColor="#0066FF"
              textColor="#FFFFFF"
              style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
              theme={{ colors: { background: '#1E293B' } }}
            />
          </Surface>

          {/* SECTION 6: LOCKED FIELDS (LOCATION & CONTACT NUMBER) */}
          <Surface style={styles.cardSection} elevation={1}>
            <View style={styles.titleIconRow}>
              <Icon source="lock-outline" size={20} color="#94A3B8" />
              <Text style={[styles.sectionTitle, { color: '#94A3B8' }]}>Verified Location & Contact</Text>
            </View>
            <Text style={styles.lockedNotice}>
              To maintain buyer trust and fraud prevention, verified Location and Contact Number cannot be altered during quick edits.
            </Text>

            {/* Locked Location Card */}
            <View style={styles.lockedFieldCard}>
              <Icon source="map-marker" size={20} color="#0066FF" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.lockedFieldLabel}>Location</Text>
                <Text style={styles.lockedFieldValue}>{lockedLocation}</Text>
              </View>
              <Icon source="lock" size={16} color="#64748B" />
            </View>

            {/* Locked Contact Card */}
            <View style={[styles.lockedFieldCard, { marginTop: 8 }]}>
              <Icon source="phone" size={20} color="#10B981" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.lockedFieldLabel}>Contact Number / Phone</Text>
                <Text style={styles.lockedFieldValue}>{lockedPhone}</Text>
              </View>
              <Icon source="lock" size={16} color="#64748B" />
            </View>
          </Surface>

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* BOTTOM ACTION BAR */}
      <Surface style={styles.bottomBar} elevation={4}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.cancelBtn}
          textColor="#94A3B8"
          disabled={isSaving}
        >
          Cancel
        </Button>

        <Button
          mode="contained"
          onPress={handleSaveListing}
          style={styles.saveBtn}
          loading={isSaving}
          disabled={isSaving}
          icon="check"
        >
          {isSaving ? 'Saving Changes...' : 'Save Changes'}
        </Button>
      </Surface>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E3A5F',
    backgroundColor: '#0B1220',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F1E36',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3F1219',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7F1D1D',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  cardSection: {
    backgroundColor: '#0F1E36',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  titleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  helperText: {
    color: '#64748B',
    fontSize: 11,
  },
  photoRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  photoContainer: {
    position: 'relative',
    marginRight: 10,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: '#0066FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coverBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0F1E36',
  },
  addPhotoBox: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#0066FF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    color: '#0066FF',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  fieldLabel: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#1E293B',
    fontSize: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  togglePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  togglePillActive: {
    backgroundColor: '#0066FF',
    borderColor: '#0066FF',
  },
  toggleText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  choiceChipActive: {
    backgroundColor: '#0066FF',
    borderColor: '#0066FF',
  },
  choiceChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  choiceChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  conditionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  condPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  condPillActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  condPillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  condPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  brandQuickRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  brandQuickPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  brandQuickPillActive: {
    backgroundColor: '#0066FF',
    borderColor: '#0066FF',
  },
  brandQuickText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  brandQuickTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  twoColumnRow: {
    flexDirection: 'row',
  },
  fuelRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  fuelPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  fuelPillActive: {
    backgroundColor: '#0066FF',
    borderColor: '#0066FF',
  },
  fuelPillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  fuelPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  lockedNotice: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  lockedFieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  lockedFieldLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  lockedFieldValue: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#0F1E36',
    borderTopWidth: 1,
    borderTopColor: '#1E3A5F',
  },
  cancelBtn: {
    flex: 1,
    borderColor: '#334155',
  },
  saveBtn: {
    flex: 2,
    backgroundColor: '#0066FF',
    borderRadius: 8,
  },
  errorCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 20,
  },
  btnPrimary: {
    backgroundColor: '#0066FF',
  },
});
