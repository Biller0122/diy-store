import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ActiveOrder } from '../src/store/delivery';
import { Button } from '../src/components/Button';
import { colors, radius } from '../src/theme';

const { height } = Dimensions.get('window');
const CIRCUMFERENCE = 2 * Math.PI * 38;

type Props = {
  visible: boolean;
  request: ActiveOrder;
  onAccept: () => void;
  onReject: () => void;
};

export default function OrderRequestModal({ visible, request, onAccept, onReject }: Props) {
  const translateY = useRef(new Animated.Value(height)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const [seconds, setSeconds] = useState(30);
  const progress = useMemo(() => Math.max(0, seconds / 30), [seconds]);

  useEffect(() => {
    if (!visible) return;
    setSeconds(30);
    Animated.spring(translateY, { toValue: 0, damping: 24, stiffness: 220, useNativeDriver: true }).start();
    const interval = setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          clearInterval(interval);
          onReject();
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, onReject, translateY]);

  useEffect(() => {
    if (seconds > 5) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 280, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, seconds]);

  const accept = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onAccept();
  };

  const reject = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReject();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Шинэ захиалга!</Text>
                <Text style={styles.orderNumber}>{request.orderNumber}</Text>
              </View>
              <Animated.View style={{ transform: [{ scale: seconds < 5 ? pulse : 1 }] }}>
                <Svg width={88} height={88}>
                  <Circle cx={44} cy={44} r={38} stroke="rgba(255,255,255,0.12)" strokeWidth={6} fill="none" />
                  <Circle
                    cx={44}
                    cy={44}
                    r={38}
                    stroke={seconds < 10 ? colors.error : colors.primary}
                    strokeWidth={6}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
                    rotation="-90"
                    origin="44,44"
                  />
                </Svg>
                <Text style={[styles.seconds, seconds < 10 && { color: colors.error }]}>{seconds}</Text>
              </Animated.View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Барааны цуглуулах цэгүүд</Text>
              {request.pickupStops.map((stop, index) => (
                <View key={stop.supplierId} style={styles.stopBlock}>
                  <View style={styles.stopTop}>
                    <View style={styles.stopNumber}>
                      <Text style={styles.stopNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.stopText}>
                      <Text style={styles.stopTitle}>🏪 {stop.supplierName} — {stop.district}</Text>
                      <Text style={styles.muted}>{stop.address}</Text>
                    </View>
                    {stop.phone ? (
                      <TouchableOpacity style={styles.phoneBtn} onPress={() => Linking.openURL(`tel:${stop.phone}`)}>
                        <Ionicons name="call" size={16} color={colors.success} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  {stop.phone ? <Text style={styles.phone}>📞 {stop.phone}</Text> : null}
                  <Text style={styles.items}>{stop.items.map((item) => `${item.name} ×${item.qty}`).join(', ')}</Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Хүргэлтийн хаяг</Text>
              <Text style={styles.stopTitle}>🏠 {request.customerDistrict}, {request.customerKhoroo ?? ''}</Text>
              <Text style={styles.muted}>{request.dropoffAddress}</Text>
            </View>

            <View style={styles.pills}>
              <View style={styles.pill}><Text style={styles.pillText}>📏 {request.distance.toFixed(1)} км</Text></View>
              <View style={styles.pill}><Text style={styles.pillText}>🏪 {request.pickupStops.length} дэлгүүр</Text></View>
              <View style={styles.pill}><Text style={styles.pillText}>⏱ ~{request.estimatedDuration} мин</Text></View>
            </View>

            <Text style={styles.fee}>₮{request.fee.toLocaleString()}</Text>

            <Button title="Хүлээн авах" variant="success" style={styles.acceptBtn} onPress={accept} />
            <Button title="Татгалзах" variant="ghost" size="md" onPress={reject} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.74)' },
  sheet: { maxHeight: '92%', backgroundColor: '#111315', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: colors.borderHover },
  handle: { width: 42, height: 4, backgroundColor: colors.borderHover, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  content: { padding: 20, paddingBottom: 34 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900' },
  orderNumber: { color: colors.textSub, fontFamily: 'Courier', marginTop: 3 },
  seconds: { position: 'absolute', left: 0, right: 0, top: 31, textAlign: 'center', color: colors.text, fontSize: 21, fontWeight: '900' },
  section: { borderRadius: radius.xl, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
  sectionLabel: { color: colors.textSub, fontSize: 12, fontWeight: '800', marginBottom: 12 },
  stopBlock: { marginBottom: 12 },
  stopTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stopNumber: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryGlow },
  stopNumberText: { color: colors.primary, fontWeight: '900', fontSize: 12 },
  stopText: { flex: 1 },
  stopTitle: { color: colors.text, fontSize: 14, fontWeight: '800', lineHeight: 20 },
  muted: { color: colors.textSub, fontSize: 12, lineHeight: 18, marginTop: 2 },
  phoneBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,212,170,0.13)' },
  phone: { color: colors.success, fontSize: 12, marginLeft: 34, marginTop: 3 },
  items: { color: colors.textSub, fontSize: 11, marginLeft: 34, marginTop: 5 },
  pills: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  pill: { flex: 1, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.04)', paddingVertical: 12, alignItems: 'center' },
  pillText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  fee: { color: colors.primary, fontSize: 52, fontWeight: '900', textAlign: 'center', marginBottom: 14 },
  acceptBtn: { height: 60, marginBottom: 10 },
});
