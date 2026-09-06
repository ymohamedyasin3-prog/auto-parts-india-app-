import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Icon } from 'react-native-paper';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_SIZE = Math.min(SCREEN_WIDTH - 48, 320);

interface UserProfilePopupModalProps {
  visible: boolean;
  onDismiss: () => void;
  userPhoto?: string | null;
  userName?: string;
  userLocation?: string;
  phone?: string;
  onChangePhoto?: () => void;
  onChatPress?: () => void;
  onViewProfilePress?: () => void;
  onFullPhotoPress?: () => void;
}

export const UserProfilePopupModal: React.FC<UserProfilePopupModalProps> = ({
  visible,
  onDismiss,
  userPhoto,
  userName,
  onChangePhoto,
}) => {
  const fallbackPhoto =
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800';
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      setHasError(false);
    }
  }, [visible, userPhoto]);

  const targetUri = !hasError && userPhoto ? userPhoto : fallbackPhoto;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent={true}
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              {userName ? (
                <Text style={styles.userNameText} numberOfLines={1}>{userName}</Text>
              ) : null}

              <View style={styles.imageCard}>
                <Image
                  source={{ uri: targetUri }}
                  style={styles.profileImage}
                  resizeMode="cover"
                  onLoadStart={() => setIsLoading(true)}
                  onLoadEnd={() => setIsLoading(false)}
                  onError={() => {
                    setHasError(true);
                    setIsLoading(false);
                  }}
                />
                {isLoading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  </View>
                )}
              </View>

              <View style={styles.actionButtonsRow}>
                {onChangePhoto && (
                  <TouchableOpacity
                    style={styles.changePhotoBtn}
                    activeOpacity={0.8}
                    onPress={() => {
                      onDismiss();
                      setTimeout(() => {
                        onChangePhoto();
                      }, 200);
                    }}
                  >
                    <Icon source="camera-plus" size={18} color="#FFFFFF" />
                    <Text style={styles.changePhotoText}>Change Photo</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.closeBtn}
                  activeOpacity={0.8}
                  onPress={onDismiss}
                >
                  <Icon source="close" size={18} color="#94A3B8" />
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    alignItems: 'center',
    width: '100%',
  },
  userNameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  imageCard: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: CARD_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.65,
        shadowRadius: 28,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0066FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#0066FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  changePhotoText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
  },
  closeBtnText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default UserProfilePopupModal;


