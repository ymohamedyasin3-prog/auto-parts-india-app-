import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Image,
  Animated,
  PanResponder,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { SparePart } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageGalleryModalProps {
  visible: boolean;
  part: SparePart | null;
  initialIndex?: number;
  onDismiss: () => void;
  onChat?: () => void;
  onCall?: () => void;
  isOwner?: boolean;
}

interface ZoomableImageItemProps {
  uri: string;
  isActive: boolean;
  onSwipeNext?: () => void;
  onSwipePrev?: () => void;
  onDismiss?: () => void;
}

const ZoomableImageItem: React.FC<ZoomableImageItemProps> = ({
  uri,
  isActive,
  onSwipeNext,
  onSwipePrev,
  onDismiss,
}) => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const scale = useRef(new Animated.Value(1)).current;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const currentScale = useRef(1);
  const currentPan = useRef({ x: 0, y: 0 });

  const lastTapTime = useRef(0);
  const initialDistance = useRef(0);
  const initialScale = useRef(1);
  const initialPan = useRef({ x: 0, y: 0 });
  const isPinching = useRef(false);

  useEffect(() => {
    const scaleListener = scale.addListener((v) => {
      currentScale.current = v.value;
    });
    const panListener = pan.addListener((v) => {
      currentPan.current = v;
    });

    return () => {
      scale.removeListener(scaleListener);
      pan.removeListener(panListener);
    };
  }, [scale, pan]);

  // Reset transform when not active or image changes
  useEffect(() => {
    if (!isActive) {
      resetZoom(false);
    }
  }, [isActive]);

  const resetZoom = (animated = true) => {
    if (animated) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 7,
          tension: 40,
        }),
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
          friction: 7,
          tension: 40,
        }),
      ]).start();
    } else {
      scale.setValue(1);
      pan.setValue({ x: 0, y: 0 });
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only take over if there is noticeable movement or multiple touches
        return (
          Math.abs(gestureState.dx) > 3 ||
          Math.abs(gestureState.dy) > 3 ||
          gestureState.numberActiveTouches > 1
        );
      },
      onPanResponderGrant: (evt, _) => {
        if (evt.nativeEvent.touches.length === 2) {
          isPinching.current = true;
          const [t1, t2] = evt.nativeEvent.touches;
          initialDistance.current = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
          initialScale.current = currentScale.current;
        } else {
          isPinching.current = false;
          initialPan.current = { ...currentPan.current };
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        // Two fingers: Pinch-to-Zoom
        if (evt.nativeEvent.touches.length === 2) {
          isPinching.current = true;
          const [t1, t2] = evt.nativeEvent.touches;
          const currentDistance = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
          if (initialDistance.current > 0) {
            const ratio = currentDistance / initialDistance.current;
            const newScale = Math.max(0.8, Math.min(5, initialScale.current * ratio));
            scale.setValue(newScale);
          }
          return;
        }

        // One finger: Move / Pan
        if (!isPinching.current && evt.nativeEvent.touches.length === 1) {
          if (currentScale.current > 1.05) {
            // Smooth free pan with responsive movement
            const newX = initialPan.current.x + gestureState.dx;
            const newY = initialPan.current.y + gestureState.dy;
            pan.setValue({ x: newX, y: newY });
          } else {
            // At 1x scale: slight feedback for vertical drag-to-dismiss or horizontal swipe
            pan.setValue({
              x: gestureState.dx * 0.4,
              y: gestureState.dy * 0.6,
            });
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const now = Date.now();
        const timeSinceLastTap = now - lastTapTime.current;

        // Double tap detection
        if (
          timeSinceLastTap < 300 &&
          Math.abs(gestureState.dx) < 10 &&
          Math.abs(gestureState.dy) < 10
        ) {
          lastTapTime.current = 0;
          if (currentScale.current > 1.2) {
            resetZoom(true);
          } else {
            Animated.parallel([
              Animated.spring(scale, {
                toValue: 2.5,
                useNativeDriver: true,
                friction: 6,
                tension: 40,
              }),
              Animated.spring(pan, {
                toValue: { x: 0, y: 0 },
                useNativeDriver: true,
                friction: 6,
              }),
            ]).start();
          }
          return;
        }
        lastTapTime.current = now;

        // Released while zoomed: Clamp inside boundaries so it stays centered and smooth
        if (currentScale.current > 1.05) {
          const maxPanX = (SCREEN_WIDTH * (currentScale.current - 1)) / 2;
          const maxPanY = (SCREEN_HEIGHT * (currentScale.current - 1)) / 2;

          let targetX = currentPan.current.x;
          let targetY = currentPan.current.y;

          if (targetX > maxPanX) targetX = maxPanX;
          if (targetX < -maxPanX) targetX = -maxPanX;
          if (targetY > maxPanY) targetY = maxPanY;
          if (targetY < -maxPanY) targetY = -maxPanY;

          let targetScale = currentScale.current;
          if (targetScale < 1) targetScale = 1;
          if (targetScale > 4) targetScale = 4;

          Animated.parallel([
            Animated.spring(scale, {
              toValue: targetScale,
              useNativeDriver: true,
              friction: 7,
              tension: 40,
            }),
            Animated.spring(pan, {
              toValue: { x: targetX, y: targetY },
              useNativeDriver: true,
              friction: 7,
              tension: 40,
            }),
          ]).start();
        } else {
          // At 1x scale: Check if horizontal swipe or vertical swipe to dismiss
          if (gestureState.dx < -50 && onSwipeNext) {
            onSwipeNext();
            resetZoom(false);
          } else if (gestureState.dx > 50 && onSwipePrev) {
            onSwipePrev();
            resetZoom(false);
          } else if (Math.abs(gestureState.dy) > 100 && onDismiss) {
            onDismiss();
          } else {
            resetZoom(true);
          }
        }
      },
    })
  ).current;

  return (
    <View style={styles.imageSlideContainer} {...panResponder.panHandlers}>
      <Animated.View
        style={[
          styles.imageTransformWrapper,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { scale: scale },
            ],
          },
        ]}
      >
        <Image
          source={{ uri }}
          style={styles.fullImage}
          resizeMode="contain"
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoadError(true);
            setLoading(false);
          }}
        />
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#1565FF" />
          </View>
        )}
        {loadError && (
          <View style={styles.errorOverlay}>
            <Icon source="image-broken-variant" size={44} color="#94A3B8" />
            <Text style={styles.errorText}>Unable to load image</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

export const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({
  visible,
  part,
  initialIndex = 0,
  onDismiss,
  onChat,
  onCall,
  isOwner = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
    }
  }, [visible, initialIndex]);

  const images: string[] = [];
  if (part) {
    if (part.imageUrls && part.imageUrls.length > 0) {
      part.imageUrls.forEach((url) => {
        if (url && !images.includes(url)) images.push(url);
      });
    } else if (part.imageUrl) {
      images.push(part.imageUrl);
    }
  }
  if (images.length === 0) {
    images.push(
      'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&auto=format&fit=crop&q=80'
    );
  }

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (!visible) return null;

  const currentUri = images[currentIndex] || images[0];

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent={true}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0B1220" />
      <View style={styles.container}>
        {/* TOP CONTROLS BAR */}
        <SafeAreaView style={styles.topSafeArea} pointerEvents="box-none">
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.controlIconBtn}
              onPress={onDismiss}
              activeOpacity={0.7}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Icon source="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>
                {currentIndex + 1} / {images.length}
              </Text>
            </View>

            <View style={styles.topRightPlaceholder} />
          </View>
        </SafeAreaView>

        {/* MAIN ZOOMABLE IMAGE VIEWER */}
        <ZoomableImageItem
          key={`img-item-${currentIndex}-${currentUri}`}
          uri={currentUri}
          isActive={true}
          onSwipeNext={images.length > 1 ? handleNext : undefined}
          onSwipePrev={images.length > 1 ? handlePrev : undefined}
          onDismiss={onDismiss}
        />

        {/* LEFT / RIGHT NAV ARROWS (When multiple images exist) */}
        {images.length > 1 && (
          <>
            {currentIndex > 0 && (
              <TouchableOpacity
                style={[styles.navArrowBtn, styles.navArrowLeft]}
                onPress={handlePrev}
                activeOpacity={0.8}
              >
                <Icon source="chevron-left" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            {currentIndex < images.length - 1 && (
              <TouchableOpacity
                style={[styles.navArrowBtn, styles.navArrowRight]}
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <Icon source="chevron-right" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* BOTTOM ACTION BAR */}
        <SafeAreaView style={styles.bottomSafeArea} pointerEvents="box-none">
          {/* Thumbnails indicator when multiple images */}
          {images.length > 1 && (
            <View style={styles.thumbnailRow}>
              {images.map((img, idx) => (
                <TouchableOpacity
                  key={`thumb-${idx}`}
                  activeOpacity={0.8}
                  onPress={() => setCurrentIndex(idx)}
                  style={[
                    styles.thumbDot,
                    idx === currentIndex && styles.thumbDotActive,
                  ]}
                >
                  <Image source={{ uri: img }} style={styles.thumbImage} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Chat and Call buttons */}
          {part && !isOwner && (onChat || onCall) && (
            <View style={styles.actionBtnRow}>
              {onChat && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.chatBtn}
                  onPress={() => {
                    onDismiss();
                    setTimeout(() => {
                      onChat();
                    }, 150);
                  }}
                >
                  <Icon source="message-text" size={19} color="#FFFFFF" />
                  <Text style={styles.chatBtnText}>Chat</Text>
                </TouchableOpacity>
              )}
              {onCall && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.callBtn}
                  onPress={() => {
                    onCall();
                  }}
                >
                  <Icon source="phone" size={19} color="#FFFFFF" />
                  <Text style={styles.callBtnText}>Call Seller</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070D18',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  topSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 36,
    paddingBottom: 8,
  },
  controlIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  counterBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  counterText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  topRightPlaceholder: {
    width: 42,
  },
  imageSlideContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageTransformWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  navArrowBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 90,
  },
  navArrowLeft: {
    left: 12,
  },
  navArrowRight: {
    right: 12,
  },
  bottomSafeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  thumbnailRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  thumbDot: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
    opacity: 0.6,
  },
  thumbDotActive: {
    borderColor: '#1565FF',
    borderWidth: 2.5,
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chatBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#1565FF',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  chatBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  callBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#0B1220',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ImageGalleryModal;
