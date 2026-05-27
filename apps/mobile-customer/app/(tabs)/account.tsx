import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/lib/store';
import { C } from '@/lib/colors';

const MOCK_RECENT_ORDERS = [
  { id: '1', code: 'DIY-2025-00142', status: 'Хүргэгдлээ', total: 188000 },
  { id: '2', code: 'DIY-2025-00139', status: 'Хүлээгдэж буй', total: 42000 },
  { id: '3', code: 'DIY-2025-00128', status: 'Хүргэлтэнд гарсан', total: 84000 },
];

const MOCK_ADDRESS = {
  id: '1',
  label: 'Гэр',
  full: 'Хан-Уул дүүрэг, 7-р хороо, Сонгинохайрхан гудамж 15',
};

function StatusColor(status: string) {
  if (status === 'Хүргэгдлээ') return C.success;
  if (status === 'Цуцлагдсан') return '#FF4444';
  return C.warning;
}

function formatPrice(price: number) {
  return '₮' + price.toLocaleString('mn-MN');
}

function AuthPanel() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPass, setShowPass] = useState(false);

  const { login, register, isLoading, error, clearError } = useAppStore();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Алдаа', 'И-мэйл болон нууц үгийг оруулна уу');
      return;
    }
    const ok = await login(email.trim(), password);
    if (!ok && error) {
      Alert.alert('Нэвтрэх алдаа', error);
      clearError();
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !firstName.trim() || !lastName.trim()) {
      Alert.alert('Алдаа', 'Бүх талбарыг бөглөнө үү');
      return;
    }
    const ok = await register(email.trim(), password, firstName.trim(), lastName.trim());
    if (ok) {
      Alert.alert('Амжилттай', 'Бүртгэл амжилттай үүслээ. Нэвтрэнэ үү.', [
        { text: 'OK', onPress: () => setTab('login') },
      ]);
    } else if (error) {
      Alert.alert('Бүртгэлийн алдаа', error);
      clearError();
    }
  };

  return (
    <ScrollView
      style={styles.authScroll}
      contentContainerStyle={styles.authContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.authLogo}>
        <View style={styles.authLogoDot} />
        <Text style={styles.authLogoText}>DIY Store</Text>
      </View>
      <Text style={styles.authWelcome}>Тавтай морилно уу 👋</Text>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'login' && styles.tabBtnActive]}
          onPress={() => setTab('login')}
        >
          <Text style={[styles.tabBtnText, tab === 'login' && styles.tabBtnTextActive]}>
            Нэвтрэх
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'register' && styles.tabBtnActive]}
          onPress={() => setTab('register')}
        >
          <Text style={[styles.tabBtnText, tab === 'register' && styles.tabBtnTextActive]}>
            Бүртгүүлэх
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'login' ? (
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>И-мэйл</Text>
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              placeholderTextColor={C.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Нууц үг</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="••••••••"
                placeholderTextColor={C.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(!showPass)}>
                <Ionicons name={showPass ? 'eye-off' : 'eye'} size={20} color={C.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Нэвтрэх</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.form}>
          <View style={styles.nameRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Овог</Text>
              <TextInput
                style={styles.input}
                placeholder="Батаа"
                placeholderTextColor={C.textTertiary}
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Нэр</Text>
              <TextInput
                style={styles.input}
                placeholder="Дорж"
                placeholderTextColor={C.textTertiary}
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>И-мэйл</Text>
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              placeholderTextColor={C.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Нууц үг</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="••••••••"
                placeholderTextColor={C.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(!showPass)}>
                <Ionicons name={showPass ? 'eye-off' : 'eye'} size={20} color={C.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Бүртгүүлэх</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function LoggedInPanel() {
  const router = useRouter();
  const { customer, logout } = useAppStore();

  if (!customer) return null;

  const initials = `${customer.firstName.charAt(0)}${customer.lastName?.charAt(0) ?? ''}`;

  return (
    <ScrollView
      style={styles.loggedScroll}
      contentContainerStyle={styles.loggedContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar + Info */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials.toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.profileName}>{customer.firstName} {customer.lastName}</Text>
          <Text style={styles.profileEmail}>{customer.emailAddress}</Text>
        </View>
      </View>

      {/* Recent Orders */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Миний захиалгууд</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/orders' as never)}>
            <Text style={styles.seeAll}>Бүгдийг харах</Text>
          </TouchableOpacity>
        </View>
        {MOCK_RECENT_ORDERS.map((order) => (
          <View key={order.id} style={styles.miniOrderCard}>
            <Text style={styles.miniOrderCode}>{order.code}</Text>
            <Text style={[styles.miniOrderStatus, { color: StatusColor(order.status) }]}>
              {order.status}
            </Text>
            <Text style={styles.miniOrderTotal}>{formatPrice(order.total)}</Text>
          </View>
        ))}
      </View>

      {/* Addresses */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Хаяг</Text>
        <View style={styles.addressCard}>
          <View style={styles.addressIconBox}>
            <Ionicons name="home" size={18} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.addressLabel}>{MOCK_ADDRESS.label}</Text>
            <Text style={styles.addressFull}>{MOCK_ADDRESS.full}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addAddressBtn}>
          <Ionicons name="add" size={18} color={C.primary} />
          <Text style={styles.addAddressText}>Хаяг нэмэх</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => {
          Alert.alert('Гарах', 'Та гарахдаа итгэлтэй байна уу?', [
            { text: 'Болих', style: 'cancel' },
            { text: 'Гарах', style: 'destructive', onPress: logout },
          ]);
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={18} color="#FF4444" />
        <Text style={styles.logoutText}>Гарах</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

export default function AccountScreen() {
  const customer = useAppStore((s) => s.customer);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {!customer ? (
        <AuthPanel />
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Бүртгэл</Text>
          </View>
          <LoggedInPanel />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: { color: C.text, fontSize: 22, fontWeight: '800' },

  // Auth
  authScroll: { flex: 1 },
  authContent: { padding: 24, paddingTop: 48 },
  authLogo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  authLogoDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },
  authLogoText: { color: C.text, fontSize: 22, fontWeight: '800' },
  authWelcome: { color: C.textSub, fontSize: 15, marginBottom: 28 },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 3,
    marginBottom: 24,
  },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: C.primary },
  tabBtnText: { color: C.textSub, fontSize: 14, fontWeight: '600' },
  tabBtnTextActive: { color: '#fff' },

  form: { gap: 16 },
  nameRow: { flexDirection: 'row', gap: 12 },
  inputGroup: { gap: 6 },
  inputLabel: { color: C.textSub, fontSize: 12, fontWeight: '600' },
  input: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 14,
  },
  passwordWrapper: { position: 'relative' },
  passwordInput: { paddingRight: 44 },
  eyeBtn: { position: 'absolute', right: 12, top: 13 },
  primaryBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Logged in
  loggedScroll: { flex: 1 },
  loggedContent: { padding: 16 },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  profileName: { color: C.text, fontSize: 17, fontWeight: '700' },
  profileEmail: { color: C.textSub, fontSize: 13, marginTop: 2 },

  section: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: '700' },
  seeAll: { color: C.primary, fontSize: 13, fontWeight: '600' },

  miniOrderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  miniOrderCode: { color: C.text, fontSize: 12, fontFamily: 'monospace', flex: 1 },
  miniOrderStatus: { fontSize: 11, fontWeight: '600', flex: 1, textAlign: 'center' },
  miniOrderTotal: { color: C.primary, fontSize: 12, fontWeight: '700', textAlign: 'right' },

  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  addressIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressLabel: { color: C.text, fontSize: 13, fontWeight: '600', marginBottom: 2 },
  addressFull: { color: C.textSub, fontSize: 11 },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
  },
  addAddressText: { color: C.primary, fontSize: 13, fontWeight: '600' },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.3)',
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,68,68,0.06)',
  },
  logoutText: { color: '#FF4444', fontSize: 15, fontWeight: '700' },
  bottomSpacer: { height: 24 },
});
