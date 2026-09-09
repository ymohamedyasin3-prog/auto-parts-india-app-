import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Icon, Switch, Divider } from 'react-native-paper';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSelectorModal } from '../components/LanguageSelectorModal';

export default function SettingsScreen() {
  const { language } = useLanguage();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Text style={styles.sectionTitle}>PREFERENCES</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.listItem} onPress={() => setShowLanguageModal(true)}>
            <View style={styles.listIconBox}>
              <Icon source="translate" size={20} color="#64748B" />
            </View>
            <View style={styles.listTexts}>
              <Text style={styles.listTitle}>Language</Text>
              <Text style={styles.listSubtitle}>{language === 'ta' ? 'Tamil' : 'English'}</Text>
            </View>
            <Icon source="chevron-right" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>NOTIFICATIONS & PERMISSIONS</Text>
        <View style={styles.card}>
          <View style={styles.listItem}>
            <View style={styles.listIconBox}>
              <Icon source="bell-outline" size={20} color="#64748B" />
            </View>
            <View style={styles.listTexts}>
              <Text style={styles.listTitle}>Push Notifications</Text>
              <Text style={styles.listSubtitle}>Alerts for messages and updates</Text>
            </View>
            <Switch 
              value={notificationsEnabled} 
              onValueChange={setNotificationsEnabled} 
              color="#0066FF" 
            />
          </View>
          <Divider style={styles.divider} />
          <View style={styles.listItem}>
            <View style={styles.listIconBox}>
              <Icon source="map-marker-outline" size={20} color="#64748B" />
            </View>
            <View style={styles.listTexts}>
              <Text style={styles.listTitle}>Location Access</Text>
              <Text style={styles.listSubtitle}>Used to show nearby parts</Text>
            </View>
            <Switch 
              value={locationEnabled} 
              onValueChange={setLocationEnabled} 
              color="#0066FF" 
            />
          </View>
        </View>

      </ScrollView>

      {/* Language Modal */}
      <LanguageSelectorModal 
        visible={showLanguageModal} 
        onDismiss={() => setShowLanguageModal(false)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#94A3B8', marginTop: 24, marginBottom: 8, paddingHorizontal: 4, letterSpacing: 1 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  listIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  listTexts: { flex: 1 },
  listTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  listSubtitle: { fontSize: 13, color: '#64748B' },
  divider: { backgroundColor: '#F1F5F9', height: 1, marginLeft: 60 },
});
