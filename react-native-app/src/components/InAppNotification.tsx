import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Text, IconButton, Surface } from 'react-native-paper';

export interface InAppNotificationData {
  id: string;
  senderName: string;
  text: string;
  partTitle?: string;
  partPrice?: number;
  chatId?: string;
}

interface InAppNotificationProps {
  notification: InAppNotificationData | null;
  onClose: () => void;
  onPress: (item: InAppNotificationData) => void;
}

export const InAppNotification: React.FC<InAppNotificationProps> = ({
  notification,
  onClose,
  onPress,
}) => {
  const slideAnim = React.useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (notification) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 14,
        stiffness: 120,
      }).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, 5500);

      return () => clearTimeout(timer);
    } else {
      slideAnim.setValue(-100);
    }
  }, [notification]);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -120,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  if (!notification) return null;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          onPress(notification);
          handleDismiss();
        }}
      >
        <Surface style={styles.card} elevation={5}>
          {/* Bell Icon Circle */}
          <View style={styles.iconCircle}>
            <IconButton icon="bell-ring" size={20} iconColor="#6366F1" style={{ margin: 0 }} />
          </View>

          {/* Text Col */}
          <View style={styles.textCol}>
            <View style={styles.topRow}>
              <Text style={styles.tag}>NEW INQUIRY</Text>
              <Text style={styles.timeTag}>Just now</Text>
            </View>

            <Text style={styles.sender} numberOfLines={1}>
              {notification.senderName || 'Buyer/Seller'}
            </Text>

            <Text style={styles.message} numberOfLines={1}>
              "{notification.text}"
            </Text>

            {notification.partTitle && (
              <View style={styles.partTagRow}>
                <Text style={styles.partTagText} numberOfLines={1}>
                  Regarding: {notification.partTitle}{' '}
                  {notification.partPrice ? `(₹${notification.partPrice})` : ''}
                </Text>
              </View>
            )}
          </View>

          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
            <IconButton icon="close" size={16} iconColor="#94A3B8" style={{ margin: 0 }} />
          </TouchableOpacity>
        </Surface>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 45,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textCol: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0066FF',
    letterSpacing: 0.5,
  },
  timeTag: {
    fontSize: 9,
    color: '#64748B',
  },
  sender: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  message: {
    fontSize: 12,
    color: '#475569',
    marginTop: 1,
    fontWeight: '500',
  },
  partTagRow: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  partTagText: {
    fontSize: 10,
    color: '#0066FF',
    fontWeight: '600',
  },
  closeBtn: {
    padding: 2,
  },
});
