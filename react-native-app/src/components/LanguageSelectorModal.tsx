import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Text, IconButton, Surface } from 'react-native-paper';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../data/translations';

interface LanguageSelectorModalProps {
  visible: boolean;
  onDismiss?: () => void;
  onClose?: () => void;
}

interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳' },
];

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  visible,
  onDismiss,
  onClose,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const dismissModal = onDismiss || onClose || (() => {});

  const handleSelect = async (code: Language) => {
    await setLanguage(code);
    dismissModal();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onDismiss}
      >
        <Surface style={styles.modalContent} elevation={5}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <IconButton icon="translate" size={22} iconColor="#1565FF" style={{ margin: 0 }} />
              <Text style={styles.title}>{t('selectLanguage')}</Text>
            </View>
            <IconButton icon="close" size={20} iconColor="#64748B" onPress={onDismiss} />
          </View>

          {/* Options */}
          <View style={styles.optionsList}>
            {LANGUAGES.map((item) => {
              const isSelected = language === item.code;
              return (
                <TouchableOpacity
                  key={item.code}
                  style={[
                    styles.langOption,
                    isSelected && styles.langOptionSelected,
                  ]}
                  onPress={() => handleSelect(item.code)}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionLeft}>
                    <Text style={styles.flagIcon}>{item.flag}</Text>
                    <View>
                      <Text
                        style={[
                          styles.nativeName,
                          isSelected && styles.nativeNameSelected,
                        ]}
                      >
                        {item.nativeName}
                      </Text>
                      <Text style={styles.langName}>{item.name}</Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.radioCircle,
                      isSelected && styles.radioCircleSelected,
                    ]}
                  >
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Surface>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  optionsList: {
    marginTop: 12,
    gap: 10,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#1E293B',
  },
  langOptionSelected: {
    backgroundColor: '#1E1B4B',
    borderColor: '#6366F1',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flagIcon: {
    fontSize: 20,
  },
  nativeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  nativeNameSelected: {
    color: '#818CF8',
  },
  langName: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: '#6366F1',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6366F1',
  },
});
