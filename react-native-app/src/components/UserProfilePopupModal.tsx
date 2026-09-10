import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';

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
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      setHasError(false);
    }
  }, [visible, userPhoto]);

  const hasValidPhoto =
    !hasError &&
    Boolean(userPhoto) &&
    typeof userPhoto === 'string' &&
    userPhoto.trim().length > 5 &&
    !userPhoto.includes('photo-1534528741775-53994a69daeb');

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
                {hasValidPhoto ? (
                  <>
                    <Image
                      source={{ uri: userPhoto! }}
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
                        <ActivityIndicator size="small" color="#0066FF" />
                      </View>
                    )}
                  </>
                ) : (
                  <View style={[styles.profileImage, { backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ fontSize: 48, fontWeight: '800', color: '#0066FF' }}>
                      {(userName || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
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
});

export default UserProfilePopupModal;


