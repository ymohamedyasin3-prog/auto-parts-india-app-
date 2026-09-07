import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { getCurrentUser } from '../services/firebase';

const SUPPORT_EMAIL = 'wwwautoparts2@gmail.com';

export default function HelpSupportScreen({ navigation }: any) {
  const [activeLegalView, setActiveLegalView] = useState<'none' | 'terms' | 'privacy'>('none');

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      `Need help with your account, orders, or want to report an issue? Email our 24/7 support desk at:\n\n${SUPPORT_EMAIL}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Email',
          onPress: () => {
            const user = getCurrentUser();
            Linking.openURL(
              `mailto:${SUPPORT_EMAIL}?subject=Support & Issue Report - Auto Parts App&body=Hello Support Team,\n\nUser ID: ${user?.uid || 'Unknown'}\nEmail: ${user?.email || 'Unknown'}\n\nMy Query / Issue Details:\n`
            ).catch(() => {
              Alert.alert('Email Client', `Please send an email directly to ${SUPPORT_EMAIL}`);
            });
          },
        },
      ]
    );
  };

  if (activeLegalView === 'terms') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setActiveLegalView('none')} style={styles.backBtn}>
            <Icon source="arrow-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Terms of Service</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.legalLastUpdated}>Last Updated: August 30, 2026</Text>
          
          <Text style={styles.legalSectionHeading}>1. Acceptance of Terms</Text>
          <Text style={styles.legalBody}>
            Welcome to the Auto Parts Marketplace application. By accessing, browsing, or listing spare parts on this platform, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please refrain from using our application.
          </Text>

          <Text style={styles.legalSectionHeading}>2. User Accounts & Verification</Text>
          <Text style={styles.legalBody}>
            To buy or sell auto parts, you must authenticate securely via our verified sign-in methods. You are responsible for maintaining the confidentiality of your account credentials and all activities that occur under your user profile.
          </Text>

          <Text style={styles.legalSectionHeading}>3. Listings & Marketplace Rules</Text>
          <Text style={styles.legalBody}>
            - Sellers must provide accurate descriptions, genuine photographs, fair pricing, and exact location details for all spare parts listed.{'\n'}
            - Prohibited items include stolen goods, counterfeit components, unverified hazardous materials, or fraudulent listings.{'\n'}
            - We reserve the right to remove any listing or suspend accounts that violate safety and compliance standards.
          </Text>

          <Text style={styles.legalSectionHeading}>4. Transactions & Liability</Text>
          <Text style={styles.legalBody}>
            This application acts as a peer-to-peer and dealer marketplace connecting buyers with auto part sellers. We do not directly handle physical shipping or warranty guarantees unless explicitly stated by certified vendors. Buyers and sellers are advised to inspect items thoroughly before completing transactions.
          </Text>

          <Text style={styles.legalSectionHeading}>5. Contact Information</Text>
          <Text style={styles.legalBody}>
            For any legal inquiries or dispute resolutions, please contact our support desk at {SUPPORT_EMAIL}.
          </Text>
        </ScrollView>
      </View>
    );
  }

  if (activeLegalView === 'privacy') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setActiveLegalView('none')} style={styles.backBtn}>
            <Icon source="arrow-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.legalLastUpdated}>Last Updated: August 30, 2026</Text>

          <Text style={styles.legalSectionHeading}>1. Information We Collect</Text>
          <Text style={styles.legalBody}>
            We collect information you provide directly when registering accounts, listing auto parts, chatting with sellers, or reporting issues. This includes your name, email address, profile photo, location coordinates, and chat messages.
          </Text>

          <Text style={styles.legalSectionHeading}>2. How We Use Your Data</Text>
          <Text style={styles.legalBody}>
            - To facilitate secure authentication and user profiles.{'\n'}
            - To connect buyers and sellers within the auto parts marketplace.{'\n'}
            - To provide location-based search and distance calculations.{'\n'}
            - To monitor app security, prevent fraud, and respond to support requests.
          </Text>

          <Text style={styles.legalSectionHeading}>3. Data Security & Storage</Text>
          <Text style={styles.legalBody}>
            Your data is securely stored using encrypted cloud databases (Firebase Firestore). We implement strict access controls to ensure your personal information remains confidential and protected against unauthorized access.
          </Text>

          <Text style={styles.legalSectionHeading}>4. Location Data</Text>
          <Text style={styles.legalBody}>
            With your permission, we utilize device GPS or manual location input to display nearby auto parts and calculate accurate shipping/dealer distances. You can disable location permissions at any time in your device settings.
          </Text>

          <Text style={styles.legalSectionHeading}>5. Contact Us</Text>
          <Text style={styles.legalBody}>
            If you have questions regarding this Privacy Policy or wish to request data deletion, please reach out to us at {SUPPORT_EMAIL}.
          </Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.headerBox}>
          <Icon source="lifebuoy" size={48} color="#0066FF" />
          <Text style={styles.headerTitleBig}>How can we help you?</Text>
          <Text style={styles.headerSubtitle}>Get support, report issues, and read guidelines.</Text>
        </View>

        <Text style={styles.sectionTitle}>CONTACT US</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.listItem} onPress={handleContactSupport}>
            <View style={[styles.listIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Icon source="email-outline" size={20} color="#0066FF" />
            </View>
            <View style={styles.listTexts}>
              <Text style={styles.listTitle}>Email Support & Helpdesk</Text>
              <Text style={styles.listSubtitle}>Contact us directly at {SUPPORT_EMAIL}</Text>
            </View>
            <Icon source="chevron-right" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>LEGAL</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.listItem} onPress={() => setActiveLegalView('terms')}>
            <View style={styles.listIconBox}>
              <Icon source="file-document-outline" size={20} color="#64748B" />
            </View>
            <View style={styles.listTexts}>
              <Text style={styles.listTitle}>Terms of Service</Text>
              <Text style={styles.listSubtitle}>Read our marketplace guidelines</Text>
            </View>
            <Icon source="chevron-right" size={20} color="#CBD5E1" />
          </TouchableOpacity>
          <Divider style={styles.divider} />
          <TouchableOpacity style={styles.listItem} onPress={() => setActiveLegalView('privacy')}>
            <View style={styles.listIconBox}>
              <Icon source="shield-check-outline" size={20} color="#64748B" />
            </View>
            <View style={styles.listTexts}>
              <Text style={styles.listTitle}>Privacy Policy</Text>
              <Text style={styles.listSubtitle}>How we protect your data</Text>
            </View>
            <Icon source="chevron-right" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { marginRight: 16 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  headerBox: { alignItems: 'center', paddingVertical: 24 },
  headerTitleBig: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginTop: 16, marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#94A3B8', marginTop: 24, marginBottom: 8, paddingHorizontal: 4, letterSpacing: 1 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  listIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  listTexts: { flex: 1 },
  listTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  listSubtitle: { fontSize: 13, color: '#64748B' },
  divider: { backgroundColor: '#F1F5F9', height: 1, marginLeft: 60 },
  
  // Legal Text Styles
  legalLastUpdated: { fontSize: 12, color: '#64748B', fontStyle: 'italic', marginBottom: 16 },
  legalSectionHeading: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginTop: 16, marginBottom: 6 },
  legalBody: { fontSize: 14, color: '#334155', lineHeight: 22, marginBottom: 8 },
});
