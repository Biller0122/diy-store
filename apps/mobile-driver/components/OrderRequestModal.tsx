import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { DeliveryRequest } from '../lib/store';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const C = {
  bg: '#08080E',
  card: '#0F0F1A',
  modal: '#1E1E30',
  surface: '#161625',
  primary: '#FF4500',
  primaryGlow: 'rgba(255,69,0,0.15)',
  success: '#00D4AA',
  warning: '#FFB547',
  border: 'rgba(255,255,255,0.06)',
  text: '#F5F5FF',
  textSub: '#8888AA',
  textTertiary: '#55556A',
};

const COUNTDOWN_SECONDS = 30;

interface Props {
  request: DeliveryRequest;
  visible: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export default function OrderRequestModal({ request, visible, onAccept, onReject }: Props) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const countdownAnim = useRef(new Animated.Value(1)).current;
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      setSecondsLeft(COUNTDOWN_SECONDS);
      countdownAnim.setValue(1);

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 20,
          stiffness: 200,
          mass: 1,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.timing(countdownAnim, {
        toValue: 0,
        duration: COUNTDOWN_SECONDS * 1000,
        useNativeDriver: false,
      }).start();

      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            onReject();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [visible]);

  const handleAccept = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (intervalRef.current) clearInterval(intervalRef.current);
    onAccept();
  };

  const handleReject = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    onReject();
  };

  const countdownColor = countdownAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: ['#FF4444', '#FFB547', '#00D4AA'],
  });

  const percentage = secondsLeft / COUNTDOWN_SECONDS;
  const countdownBg = percentage < 0.3 ? '#FF444420' : percentage < 0.6 ? '#FFB54720' : '#00D4AA20';
  const countdownBorder = percentage < 0.3 ? '#FF444460' : percentage < 0.6 ? '#FFB54760' : '#00D4AA60';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleReject}
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          { opacity: backdropAnim },
        ]}
      />

      {/* Panel */}
      <Animated.View
        style={[
          styles.panel,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.newBadge}>
            <View style={styles.newDot} />
            <Text style={styles.newBadgeText}>Шинэ захиалга!</Text>
          </View>
          <View style={[styles.countdownBadge, { backgroundColor: countdownBg, borderColor: countdownBorder }]}>
            <Animated.Text style={[styles.countdownNumber, { color: countdownColor }]}>
              {secondsLeft}с
            </Animated.Text>
          </View>
        </View>

        {/* Distance + time */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="navigate-outline" size={16} color={C.textSub} />
            <Text style={styles.metaValue}>{request.distance} км</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={16} color={C.textSub} />
            <Text style={styles.metaValue}>~{request.estimatedMinutes} мин</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={16} color={C.textSub} />
            <Text style={styles.metaValue}>{request.customerName}</Text>
          </View>
        </View>

        {/* Addresses */}
        <View style={styles.addressCard}>
          <View style={styles.addressRow}>
            <View style={[styles.addressDot, { backgroundColor: C.primary }]} />
            <View style={styles.addressTextWrap}>
              <Text style={styles.addressLabel}>Авах газар</Text>
              <Text style={styles.addressText}>{request.pickupAddress}</Text>
            </View>
          </View>
          <View style={styles.addressConnector} />
          <View style={styles.addressRow}>
            <View style={[styles.addressDot, { backgroundColor: C.success }]} />
            <View style={styles.addressTextWrap}>
              <Text style={styles.addressLabel}>Хүргэх газар</Text>
              <Text style={styles.addressText}>{request.dropoffAddress}</Text>
            </View>
          </View>
        </View>

        {/* Fee */}
        <View style={styles.feeWrap}>
          <Text style={styles.feeLabel}>Хөлс</Text>
          <Text style={styles.feeAmount}>₮{request.fee.toLocaleString()}</Text>
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} activeOpacity={0.85}>
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={styles.acceptBtnText}>Хүлээн авах</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.rejectBtn} onPress={handleReject} activeOpacity={0.8}>
          <Ionicons name="close-circle-outline" size={20} color={C.textSub} />
          <Text style={styles.rejectBtnText}>Татгалзах</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1E1E30',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  newBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF4500',
  },
  newBadgeText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FF4500',
  },
  countdownBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 56,
    alignItems: 'center',
  },
  countdownNumber: {
    fontSize: 15,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161625',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    gap: 8,
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F5F5FF',
  },
  metaDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  addressCard: {
    backgroundColor: '#161625',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    gap: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  addressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 3,
  },
  addressConnector: {
    width: 2,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginLeft: 5,
    marginVertical: 4,
  },
  addressTextWrap: { flex: 1 },
  addressLabel: {
    fontSize: 10,
    color: '#8888AA',
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  addressText: {
    fontSize: 14,
    color: '#F5F5FF',
    fontWeight: '500',
    marginTop: 2,
  },
  feeWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  feeLabel: {
    fontSize: 12,
    color: '#8888AA',
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  feeAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FF4500',
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    backgroundColor: '#00D4AA',
    borderRadius: 16,
    marginBottom: 10,
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  rejectBtnText: {
    color: '#8888AA',
    fontSize: 15,
    fontWeight: '600',
  },
});
