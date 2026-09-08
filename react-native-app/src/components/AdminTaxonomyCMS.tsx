import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  IconButton,
  Chip,
  Surface,
  ActivityIndicator,
} from 'react-native-paper';
import { launchImageLibrary } from 'react-native-image-picker';
import { getFirestoreInstance } from '../services/firebase';
import { uploadImageToCloudinary } from '../services/cloudinary';
import { INDIAN_STATES_AND_DISTRICTS } from '../data/indianLocations';

interface BrandItem {
  name: string;
  models: string[];
}

interface CategoryItem {
  id: string;
  name: string;
  subcategories: string[];
  imageUrl?: string;
  icon?: string;
}

interface LocationItem {
  state: string;
  districts: string[];
}

const DEFAULT_BRANDS: BrandItem[] = [
  { name: 'Maruti Suzuki', models: ['Swift', 'Baleno', 'Brezza', 'Dzire', 'Ertiga', 'Wagon R', 'Alto', 'Grand Vitara'] },
  { name: 'Hyundai', models: ['Creta', 'i20', 'Venue', 'Verna', 'Grand i10', 'Aura', 'Tucson'] },
  { name: 'Tata', models: ['Nexon', 'Punch', 'Harrier', 'Safari', 'Altroz', 'Tiago', 'Tigor'] },
  { name: 'Mahindra', models: ['Thar', 'Scorpio-N', 'XUV700', 'Bolero', 'XUV300', 'Scorpio Classic'] },
  { name: 'Toyota', models: ['Innova Crysta', 'Fortuner', 'Hyryder', 'Glanza', 'Hilux', 'Camry'] },
  { name: 'Honda', models: ['City', 'Amaze', 'Elevate', 'WR-V', 'Civic'] },
  { name: 'Kia', models: ['Seltos', 'Sonet', 'Carens', 'Carnival', 'EV6'] },
  { name: 'Volkswagen', models: ['Virtus', 'Taigun', 'Polo', 'Vento', 'Tiguan'] },
  { name: 'Skoda', models: ['Slavia', 'Kushaq', 'Octavia', 'Superb', 'Rapid'] },
  { name: 'Ford', models: ['EcoSport', 'Endeavour', 'Figo', 'Aspire', 'Freestyle'] },
];

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'engine', name: 'Engine & Mechanical', subcategories: ['Cylinder Head', 'Pistons', 'Turbocharger', 'Alternator', 'Starter Motor', 'Fuel Injectors'] },
  { id: 'body', name: 'Body & Exterior', subcategories: ['Front Bumper', 'Rear Bumper', 'Headlight Set', 'Tail Lights', 'Doors', 'Bonnet', 'Side Mirrors'] },
  { id: 'electrical', name: 'Lights & Electricals', subcategories: ['ECU / ECM', 'Wiring Harness', 'Battery', 'Sensors', 'Instrument Cluster', 'Fuse Box'] },
  { id: 'suspension', name: 'Suspension & Brakes', subcategories: ['Shock Absorbers', 'Brake Calipers', 'Disc Rotors', 'Control Arms', 'Steering Rack', 'ABS Module'] },
  { id: 'interior', name: 'Interior & Wheels', subcategories: ['Dashboard', 'Steering Wheel', 'Seats', 'Infotainment Screen', 'AC Compressor', 'Alloy Wheels'] },
];

export const AdminTaxonomyCMS: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'brands' | 'categories' | 'locations'>('brands');
  const [brands, setBrands] = useState<BrandItem[]>(DEFAULT_BRANDS);
  const [categories, setCategories] = useState<CategoryItem[]>(DEFAULT_CATEGORIES);
  const [locations, setLocations] = useState<LocationItem[]>(INDIAN_STATES_AND_DISTRICTS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modals for adding
  const [brandModalVisible, setBrandModalVisible] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandModels, setNewBrandModels] = useState('');

  const [modelModalVisible, setModelModalVisible] = useState(false);
  const [selectedBrandIndex, setSelectedBrandIndex] = useState<number | null>(null);
  const [newModelName, setNewModelName] = useState('');

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySubs, setNewCategorySubs] = useState('');
  const [newCategoryImageUrl, setNewCategoryImageUrl] = useState('');
  const [uploadingCatImage, setUploadingCatImage] = useState(false);

  const [subcategoryModalVisible, setSubcategoryModalVisible] = useState(false);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<number | null>(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');

  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [newStateName, setNewStateName] = useState('');
  const [newDistricts, setNewDistricts] = useState('');

  const [districtModalVisible, setDistrictModalVisible] = useState(false);
  const [selectedLocationIndex, setSelectedLocationIndex] = useState<number | null>(null);
  const [newDistrictName, setNewDistrictName] = useState('');

  useEffect(() => {
    fetchTaxonomy();
  }, []);

  const fetchTaxonomy = async () => {
    try {
      setLoading(true);
      const db = getFirestoreInstance();
      if (!db) return;
      const docSnap = await db.collection('taxonomy').doc('data').get();
      if (docSnap.exists) {
        const data = docSnap.data();
        if (data?.brands && Array.isArray(data.brands)) {
          setBrands(data.brands);
        }
        if (data?.categories && Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
        if (data?.locations && Array.isArray(data.locations)) {
          setLocations(data.locations);
        }
      }
    } catch (err) {
      console.warn('[AdminTaxonomyCMS] fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePickCatImage = async () => {
    try {
      const res = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
      if (res.assets && res.assets[0]?.uri) {
        setUploadingCatImage(true);
        const uploadedUrl = await uploadImageToCloudinary(res.assets[0].uri, 'categories');
        if (uploadedUrl) {
          setNewCategoryImageUrl(uploadedUrl);
        }
      }
    } catch (err) {
      console.warn('[AdminTaxonomyCMS] image pick error:', err);
    } finally {
      setUploadingCatImage(false);
    }
  };

  const handleSaveToCloud = async () => {
    try {
      setSaving(true);
      const db = getFirestoreInstance();
      if (!db) {
        Alert.alert('Notice', 'Unable to connect to the server.');
        return;
      }

      // Save taxonomy doc
      await db.collection('taxonomy').doc('data').set({
        brands,
        categories,
        locations,
        updatedAt: Date.now(),
      });

      // Sync all location state and district names to config/locations for real-time search
      try {
        const allLocs: string[] = [];
        locations.forEach((loc) => {
          if (loc.state && loc.state.trim()) allLocs.push(loc.state.trim());
          if (Array.isArray(loc.districts)) {
            loc.districts.forEach((d) => {
              if (d && d.trim()) allLocs.push(d.trim());
            });
          }
        });
        const uniqueLocs = Array.from(new Set(allLocs));
        await db.collection('config').doc('locations').set({
          list: uniqueLocs,
          updatedAt: Date.now(),
        }, { merge: true });

        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('config_locations', JSON.stringify(uniqueLocs));
        }
      } catch (locSyncErr) {
        console.warn('[AdminTaxonomyCMS] location sync error:', locSyncErr);
      }

      // Sync categories directly to topCategories collection in Firestore
      const batch = db.batch ? db.batch() : null;
      if (batch) {
        categories.forEach((cat, idx) => {
          const docRef = db.collection('topCategories').doc(cat.id || `cat_${idx}`);
          batch.set(docRef, {
            id: cat.id,
            name: cat.name,
            subcategories: cat.subcategories || [],
            imageUrl: cat.imageUrl || '',
            active: true,
            order: idx,
            updatedAt: Date.now(),
          }, { merge: true });
        });
        await batch.commit();
      }

      Alert.alert('Success', 'Settings & Category images saved successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddBrand = () => {
    if (!newBrandName.trim()) {
      Alert.alert('Error', 'Brand name is required');
      return;
    }
    const modelsArray = newBrandModels
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    setBrands([...brands, { name: newBrandName.trim(), models: modelsArray }]);
    setNewBrandName('');
    setNewBrandModels('');
    setBrandModalVisible(false);
  };

  const handleDeleteBrand = (index: number) => {
    Alert.alert('Confirm Delete', `Delete ${brands[index].name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const updated = [...brands];
          updated.splice(index, 1);
          setBrands(updated);
        },
      },
    ]);
  };

  const handleAddModelToBrand = () => {
    if (selectedBrandIndex === null || !newModelName.trim()) return;
    const updated = [...brands];
    if (!updated[selectedBrandIndex].models.includes(newModelName.trim())) {
      updated[selectedBrandIndex].models.push(newModelName.trim());
      setBrands(updated);
    }
    setNewModelName('');
    setModelModalVisible(false);
  };

  const handleDeleteModel = (brandIndex: number, modelName: string) => {
    const updated = [...brands];
    updated[brandIndex].models = updated[brandIndex].models.filter((m) => m !== modelName);
    setBrands(updated);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Category name is required');
      return;
    }
    const subArray = newCategorySubs
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const newId = newCategoryName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    setCategories([
      ...categories,
      { 
        id: newId, 
        name: newCategoryName.trim(), 
        subcategories: subArray,
        imageUrl: newCategoryImageUrl.trim() || undefined
      },
    ]);
    setNewCategoryName('');
    setNewCategorySubs('');
    setNewCategoryImageUrl('');
    setCategoryModalVisible(false);
  };

  const handleDeleteCategory = (index: number) => {
    Alert.alert('Confirm Delete', `Delete ${categories[index].name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const updated = [...categories];
          updated.splice(index, 1);
          setCategories(updated);
        },
      },
    ]);
  };

  const handleAddSubcategory = () => {
    if (selectedCategoryIndex === null || !newSubcategoryName.trim()) return;
    const updated = [...categories];
    if (!updated[selectedCategoryIndex].subcategories.includes(newSubcategoryName.trim())) {
      updated[selectedCategoryIndex].subcategories.push(newSubcategoryName.trim());
      setCategories(updated);
    }
    setNewSubcategoryName('');
    setSubcategoryModalVisible(false);
  };

  const handleDeleteSubcategory = (catIndex: number, subName: string) => {
    const updated = [...categories];
    updated[catIndex].subcategories = updated[catIndex].subcategories.filter((s) => s !== subName);
    setCategories(updated);
  };

  const handleAddLocation = () => {
    if (!newStateName.trim()) {
      Alert.alert('Error', 'State name is required');
      return;
    }
    const distArray = newDistricts
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);

    setLocations([...locations, { state: newStateName.trim(), districts: distArray }]);
    setNewStateName('');
    setNewDistricts('');
    setLocationModalVisible(false);
  };

  const handleDeleteLocation = (index: number) => {
    Alert.alert('Confirm Delete', `Delete ${locations[index].state}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const updated = [...locations];
          updated.splice(index, 1);
          setLocations(updated);
        },
      },
    ]);
  };

  const handleAddDistrict = () => {
    if (selectedLocationIndex === null || !newDistrictName.trim()) return;
    const updated = [...locations];
    if (!updated[selectedLocationIndex].districts.includes(newDistrictName.trim())) {
      updated[selectedLocationIndex].districts.push(newDistrictName.trim());
      setLocations(updated);
    }
    setNewDistrictName('');
    setDistrictModalVisible(false);
  };

  const handleDeleteDistrict = (locIndex: number, districtName: string) => {
    const updated = [...locations];
    updated[locIndex].districts = updated[locIndex].districts.filter((d) => d !== districtName);
    setLocations(updated);
  };

  return (
    <View style={styles.container}>
      {/* Sub Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'brands' && styles.tabBtnActive]}
          onPress={() => setActiveTab('brands')}
        >
          <Text style={[styles.tabText, activeTab === 'brands' && styles.tabTextActive]}>
            Brands & Models ({brands.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'categories' && styles.tabBtnActive]}
          onPress={() => setActiveTab('categories')}
        >
          <Text style={[styles.tabText, activeTab === 'categories' && styles.tabTextActive]}>
            Categories ({categories.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'locations' && styles.tabBtnActive]}
          onPress={() => setActiveTab('locations')}
        >
          <Text style={[styles.tabText, activeTab === 'locations' && styles.tabTextActive]}>
            States & Hubs ({locations.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Header */}
      <View style={styles.actionsHeader}>
        <Button
          mode="contained"
          onPress={handleSaveToCloud}
          loading={saving}
          disabled={saving}
          style={styles.saveBtn}
          labelStyle={{ color: '#FFFFFF', fontWeight: '700' }}
          icon="cloud-upload"
        >
          Save All to Cloud
        </Button>

        {activeTab === 'brands' && (
          <Button
            mode="outlined"
            onPress={() => setBrandModalVisible(true)}
            style={styles.addBtn}
            labelStyle={{ color: '#1565FF', fontWeight: '700' }}
            icon="plus"
          >
            Add Brand
          </Button>
        )}

        {activeTab === 'categories' && (
          <Button
            mode="outlined"
            onPress={() => setCategoryModalVisible(true)}
            style={styles.addBtn}
            labelStyle={{ color: '#1565FF', fontWeight: '700' }}
            icon="plus"
          >
            Add Category
          </Button>
        )}

        {activeTab === 'locations' && (
          <Button
            mode="outlined"
            onPress={() => setLocationModalVisible(true)}
            style={styles.addBtn}
            labelStyle={{ color: '#1565FF', fontWeight: '700' }}
            icon="plus"
          >
            Add State
          </Button>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ padding: 40 }} color="#1565FF" />
      ) : (
        <ScrollView style={styles.contentScroll}>
          {/* BRANDS TAB */}
          {activeTab === 'brands' && (
            <View style={styles.cardsCol}>
              {brands.map((b, bIdx) => (
                <Surface key={`brand-${b.name}-${bIdx}`} style={styles.cmsCard} elevation={2}>
                  <View style={styles.cmsCardHeader}>
                    <View style={styles.brandTitleRow}>
                      <IconButton icon="car" size={20} iconColor="#1565FF" style={{ margin: 0 }} />
                      <Text style={styles.cmsCardTitle}>{b.name}</Text>
                      <View style={styles.countChip}>
                        <Text style={styles.countChipText}>{b.models.length} models</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                      <IconButton
                        icon="plus-circle"
                        size={20}
                        iconColor="#10B981"
                        onPress={() => {
                          setSelectedBrandIndex(bIdx);
                          setModelModalVisible(true);
                        }}
                      />
                      <IconButton
                        icon="delete-outline"
                        size={20}
                        iconColor="#EF4444"
                        onPress={() => handleDeleteBrand(bIdx)}
                      />
                    </View>
                  </View>

                  <View style={styles.chipsWrap}>
                    {b.models.map((m) => (
                      <Chip
                        key={m}
                        style={styles.modelChip}
                        textStyle={{ fontSize: 11, color: '#1E293B', fontWeight: '600' }}
                        onClose={() => handleDeleteModel(bIdx, m)}
                        
                      >
                        {m}
                      </Chip>
                    ))}
                  </View>
                </Surface>
              ))}
            </View>
          )}

          {/* CATEGORIES TAB */}
          {activeTab === 'categories' && (
            <View style={styles.cardsCol}>
              {categories.map((c, cIdx) => (
                <Surface key={`cat-${c.id}-${cIdx}`} style={styles.cmsCard} elevation={2}>
                  <View style={styles.cmsCardHeader}>
                    <View style={styles.brandTitleRow}>
                      {c.imageUrl ? (
                        <Image source={{ uri: c.imageUrl }} style={{ width: 28, height: 28, borderRadius: 6, marginRight: 8, backgroundColor: '#F1F5F9' }} />
                      ) : (
                        <IconButton icon="shape-outline" size={20} iconColor="#7C3AED" style={{ margin: 0 }} />
                      )}
                      <Text style={styles.cmsCardTitle}>{c.name}</Text>
                      <View style={styles.countChip}>
                        <Text style={styles.countChipText}>{c.subcategories.length} subparts</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                      <IconButton
                        icon="plus-circle"
                        size={20}
                        iconColor="#10B981"
                        onPress={() => {
                          setSelectedCategoryIndex(cIdx);
                          setSubcategoryModalVisible(true);
                        }}
                      />
                      <IconButton
                        icon="delete-outline"
                        size={20}
                        iconColor="#EF4444"
                        onPress={() => handleDeleteCategory(cIdx)}
                      />
                    </View>
                  </View>

                  <View style={styles.chipsWrap}>
                    {c.subcategories.map((s) => (
                      <Chip
                        key={s}
                        style={styles.modelChip}
                        textStyle={{ fontSize: 11, color: '#1E293B', fontWeight: '600' }}
                      >
                        {s}
                      </Chip>
                    ))}
                  </View>
                </Surface>
              ))}
            </View>
          )}

          {/* LOCATIONS TAB */}
          {activeTab === 'locations' && (
            <View style={styles.cardsCol}>
              {locations.map((st, lIdx) => (
                <Surface key={st.state} style={styles.cmsCard} elevation={2}>
                  <View style={styles.cmsCardHeader}>
                    <View style={styles.brandTitleRow}>
                      <IconButton icon="map-marker-outline" size={20} iconColor="#34D399" style={{ margin: 0 }} />
                      <Text style={styles.cmsCardTitle}>{st.state}</Text>
                      <View style={styles.countChip}>
                        <Text style={styles.countChipText}>{st.districts.length} districts</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                      <IconButton
                        icon="plus-circle"
                        size={20}
                        iconColor="#10B981"
                        onPress={() => {
                          setSelectedLocationIndex(lIdx);
                          setDistrictModalVisible(true);
                        }}
                      />
                      <IconButton
                        icon="delete-outline"
                        size={20}
                        iconColor="#EF4444"
                        onPress={() => handleDeleteLocation(lIdx)}
                      />
                    </View>
                  </View>

                  <View style={styles.chipsWrap}>
                    {st.districts.slice(0, 30).map((d) => (
                      <Chip
                        key={d}
                        style={styles.modelChip}
                        textStyle={{ fontSize: 11, color: '#1E293B', fontWeight: '600' }}
                        onClose={() => handleDeleteDistrict(lIdx, d)}
                      >
                        {d}
                      </Chip>
                    ))}
                    {st.districts.length > 30 && (
                      <View style={styles.locPillMore}>
                        <Text style={styles.locPillMoreText}>+{st.districts.length - 30} more</Text>
                      </View>
                    )}
                  </View>
                </Surface>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Brand Modal */}
      <Modal
        visible={brandModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBrandModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Surface style={styles.modalCard} elevation={5}>
            <Text style={styles.modalHeader}>Add Car Brand</Text>
            <TextInput
              label="Brand Name (e.g. Nissan, MG, Jeep)"
              value={newBrandName}
              onChangeText={setNewBrandName}
              mode="outlined"
              style={styles.modalInput}
            />
            <TextInput
              label="Initial Models (comma separated, e.g. Magnite, Kicks)"
              value={newBrandModels}
              onChangeText={setNewBrandModels}
              mode="outlined"
              style={styles.modalInput}
            />
            <View style={styles.modalBtnRow}>
              <Button onPress={() => setBrandModalVisible(false)}>Cancel</Button>
              <Button mode="contained" onPress={handleAddBrand}>
                Add Brand
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>

      {/* Add Model Modal */}
      <Modal
        visible={modelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModelModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Surface style={styles.modalCard} elevation={5}>
            <Text style={styles.modalHeader}>
              Add Model to {selectedBrandIndex !== null ? brands[selectedBrandIndex]?.name : ''}
            </Text>
            <TextInput
              label="Model Name (e.g. Jimny, Fronx, Creta N Line)"
              value={newModelName}
              onChangeText={setNewModelName}
              mode="outlined"
              style={styles.modalInput}
            />
            <View style={styles.modalBtnRow}>
              <Button onPress={() => setModelModalVisible(false)}>Cancel</Button>
              <Button mode="contained" onPress={handleAddModelToBrand}>
                Add Model
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Surface style={styles.modalCard} elevation={5}>
            <Text style={styles.modalHeader}>Add Part Category</Text>
            <TextInput
              label="Category Name (e.g. Transmission & Gearbox)"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              mode="outlined"
              style={styles.modalInput}
            />
            <TextInput
              label="Subcategories (comma separated, e.g. Clutch Plate, Flywheel)"
              value={newCategorySubs}
              onChangeText={setNewCategorySubs}
              mode="outlined"
              style={styles.modalInput}
            />

            {/* Category Image Section */}
            <View style={{ marginVertical: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>
                CATEGORY IMAGE
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {newCategoryImageUrl ? (
                  <Image 
                    source={{ uri: newCategoryImageUrl }} 
                    style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: '#F1F5F9' }} 
                  />
                ) : (
                  <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                    <IconButton icon="image" size={24} iconColor="#94A3B8" />
                  </View>
                )}
                <Button 
                  mode="outlined" 
                  onPress={handlePickCatImage} 
                  loading={uploadingCatImage}
                  disabled={uploadingCatImage}
                  compact
                  icon="upload"
                >
                  Upload Image
                </Button>
              </View>
              <TextInput
                label="Or paste Image URL"
                value={newCategoryImageUrl}
                onChangeText={setNewCategoryImageUrl}
                mode="outlined"
                dense
                style={[styles.modalInput, { marginTop: 6 }]}
              />
            </View>

            <View style={styles.modalBtnRow}>
              <Button onPress={() => setCategoryModalVisible(false)}>Cancel</Button>
              <Button mode="contained" onPress={handleAddCategory}>
                Add Category
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>

      {/* Add Subcategory Modal */}
      <Modal
        visible={subcategoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSubcategoryModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Surface style={styles.modalCard} elevation={5}>
            <Text style={styles.modalHeader}>
              Add Subcategory to {selectedCategoryIndex !== null ? categories[selectedCategoryIndex]?.name : ''}
            </Text>
            <TextInput
              label="Subcategory Name"
              value={newSubcategoryName}
              onChangeText={setNewSubcategoryName}
              mode="outlined"
              style={styles.modalInput}
            />
            <View style={styles.modalBtnRow}>
              <Button onPress={() => setSubcategoryModalVisible(false)}>Cancel</Button>
              <Button mode="contained" onPress={handleAddSubcategory}>
                Add Subcategory
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>

      {/* Add State Modal */}
      <Modal
        visible={locationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Surface style={styles.modalCard} elevation={5}>
            <Text style={styles.modalHeader}>Add State / Region</Text>
            <TextInput
              label="State Name"
              value={newStateName}
              onChangeText={setNewStateName}
              mode="outlined"
              style={styles.modalInput}
            />
            <TextInput
              label="Initial Districts (comma separated)"
              value={newDistricts}
              onChangeText={setNewDistricts}
              mode="outlined"
              style={styles.modalInput}
            />
            <View style={styles.modalBtnRow}>
              <Button onPress={() => setLocationModalVisible(false)}>Cancel</Button>
              <Button mode="contained" onPress={handleAddLocation}>
                Add State
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>

      {/* Add District Modal */}
      <Modal
        visible={districtModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDistrictModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Surface style={styles.modalCard} elevation={5}>
            <Text style={styles.modalHeader}>
              Add District to {selectedLocationIndex !== null ? locations[selectedLocationIndex]?.state : ''}
            </Text>
            <TextInput
              label="District Name"
              value={newDistrictName}
              onChangeText={setNewDistrictName}
              mode="outlined"
              style={styles.modalInput}
            />
            <View style={styles.modalBtnRow}>
              <Button onPress={() => setDistrictModalVisible(false)}>Cancel</Button>
              <Button mode="contained" onPress={handleAddDistrict}>
                Add District
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 4,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#1565FF',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  actionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
  },
  saveBtn: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    flex: 1,
  },
  addBtn: {
    borderColor: '#1565FF',
    borderRadius: 10,
  },
  contentScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  cardsCol: {
    gap: 12,
    paddingBottom: 24,
  },
  cmsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cmsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cmsCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  countChip: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modelChip: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  locPill: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  locPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  locPillMore: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  locPillMoreText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  modalInput: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
});

export default AdminTaxonomyCMS;
