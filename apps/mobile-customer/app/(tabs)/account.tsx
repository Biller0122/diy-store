import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/lib/store';
import { C } from '@/lib/colors';
import { MY_ORDERS_QUERY, shopFetch } from '@/lib/api';

type AccountOrder = { id: string; code: string; state: string; total: number; createdAt?: string };

function StatusColor(status: string) {
  if (status === 'Хүргэгдлээ') return C.success;
  if (status === 'Цуцлагдсан') return '#FF4444';
  return C.warning;
}

function formatPrice(price: number) {
  return '₮' + price.toLocaleString('mn-MN');
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function AuthPanel() {
  const [tab, setTab] = useState<'login' | 'otp'>('login');
  const [formError, setFormError] = useState('');
  const [info, setInfo] = useState('');

  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<'email' | 'code'>('email');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPwd, setShowLoginPwd] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetStep, setResetStep] = useState<'email' | 'reset'>('email');

  const [registerOpen, setRegisterOpen] = useState(false);
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPwd, setShowRegPwd] = useState(false);

  const {
    login,
    register,
    requestEmailOtp,
    verifyEmailOtp,
    requestPasswordResetOtp,
    resetPasswordWithOtp,
    isLoading,
    error,
    clearError,
  } = useAppStore();

  const displayError = formError || error;

  function resetMessages() {
    setFormError('');
    setInfo('');
    clearError();
  }

  function handleTabChange(next: 'login' | 'otp') {
    setTab(next);
    setResetOpen(false);
    resetMessages();
  }

  const handleLogin = async () => {
    resetMessages();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setFormError('И-мэйл/утас болон нууц үгээ оруулна уу');
      return;
    }
    await login(loginEmail.trim(), loginPassword);
  };

  const handleRequestOtp = async () => {
    resetMessages();
    if (!validEmail(otpEmail)) {
      setFormError('И-мэйл хаяг буруу байна');
      return;
    }
    const result = await requestEmailOtp(otpEmail.trim());
    if (result.ok) {
      setOtpStep('code');
      setInfo(result.otp ? `Туршилтын код: ${result.otp}` : 'Код и-мэйлээр илгээгдлээ');
    }
  };

  const handleVerifyOtp = async () => {
    resetMessages();
    if (!/^\d{4}$/.test(otpCode.trim())) {
      setFormError('4 оронтой код оруулна уу');
      return;
    }
    await verifyEmailOtp(otpEmail.trim(), otpCode.trim());
  };

  const handleRegister = async () => {
    resetMessages();
    if (!regFirstName.trim() || !regLastName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setFormError('Бүх шаардлагатай талбарыг бөглөнө үү');
      return;
    }
    if (!validEmail(regEmail)) {
      setFormError('И-мэйл хаяг буруу байна');
      return;
    }
    if (regPhone && !/^[6789]\d{7}$/.test(regPhone.replace(/\D/g, ''))) {
      setFormError('Утасны дугаар 8 оронтой, 6/7/8/9-өөр эхлэх ёстой');
      return;
    }
    if (regPassword.length < 8) {
      setFormError('Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой');
      return;
    }
    if (regPassword !== regConfirm) {
      setFormError('Нууц үг таарахгүй байна');
      return;
    }
    const ok = await register({
      firstName: regFirstName.trim(),
      lastName: regLastName.trim(),
      emailAddress: regEmail.trim(),
      password: regPassword,
      phoneNumber: regPhone.replace(/\D/g, '') || undefined,
    });
    if (ok) {
      Alert.alert('Амжилттай', 'Бүртгэл үүслээ. Та автоматаар нэвтэрлээ.');
    }
  };

  const handleRequestReset = async () => {
    resetMessages();
    if (!validEmail(resetEmail)) {
      setFormError('И-мэйл хаяг буруу байна');
      return;
    }
    const result = await requestPasswordResetOtp(resetEmail.trim());
    if (result.ok) {
      setResetStep('reset');
      setInfo(result.otp ? `Туршилтын сэргээх код: ${result.otp}` : 'Сэргээх код и-мэйлээр илгээгдлээ');
    }
  };

  const handleResetPassword = async () => {
    resetMessages();
    if (!/^\d{4}$/.test(resetOtp.trim())) {
      setFormError('4 оронтой сэргээх код оруулна уу');
      return;
    }
    if (resetPassword.length < 8) {
      setFormError('Шинэ нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой');
      return;
    }
    if (resetPassword !== resetConfirm) {
      setFormError('Шинэ нууц үг таарахгүй байна');
      return;
    }
    await resetPasswordWithOtp(resetEmail.trim(), resetOtp.trim(), resetPassword);
  };

  return (
    <ScrollView
      style={styles.authScroll}
      contentContainerStyle={styles.authContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.authLogo}>
        <Image source={require('../../assets/shoptool-logo.png')} style={styles.authLogoImage} resizeMode="contain" />
      </View>
      <Text style={styles.authTitle}>Нэвтрэх</Text>
      <Text style={styles.authWelcome}>Эхлээд email-ээр бүртгүүлээд, дараа нь email эсвэл утсаараа нэвтэрнэ</Text>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'login' && styles.tabBtnActive]}
          onPress={() => handleTabChange('login')}
        >
          <Text style={[styles.tabBtnText, tab === 'login' && styles.tabBtnTextActive]}>Email/утас</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'otp' && styles.tabBtnActive]}
          onPress={() => handleTabChange('otp')}
        >
          <Text style={[styles.tabBtnText, tab === 'otp' && styles.tabBtnTextActive]}>Email код</Text>
        </TouchableOpacity>
      </View>

      {displayError ? <Text style={styles.errorBox}>{displayError}</Text> : null}
      {info ? <Text style={styles.infoBox}>{info}</Text> : null}

      {tab === 'otp' && otpStep === 'email' ? (
        <View style={styles.form}>
          <AuthField label="И-мэйл">
            <TextInput style={styles.input} placeholder="example@gmail.com" placeholderTextColor={C.textTertiary} value={otpEmail} onChangeText={setOtpEmail} keyboardType="email-address" autoCapitalize="none" />
          </AuthField>
          <TouchableOpacity
            style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
            onPress={handleRequestOtp}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Код авах</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setTab('login'); setResetOpen(true); setResetEmail(otpEmail); resetMessages(); }}>
            <Text style={styles.linkText}>Нууц үг сэргээх</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {tab === 'otp' && otpStep === 'code' ? (
        <View style={styles.form}>
          <AuthField label="И-мэйл">
            <TextInput style={styles.input} value={otpEmail} onChangeText={setOtpEmail} keyboardType="email-address" autoCapitalize="none" />
          </AuthField>
          <AuthField label="Баталгаажуулах код">
            <TextInput style={[styles.input, styles.otpInput]} value={otpCode} onChangeText={(value) => setOtpCode(value.replace(/\D/g, '').slice(0, 4))} placeholder="1234" placeholderTextColor={C.textTertiary} keyboardType="number-pad" maxLength={4} />
          </AuthField>
          <TouchableOpacity
            style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
            onPress={handleVerifyOtp}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Нэвтрэх</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setOtpStep('email')}>
            <Text style={styles.mutedLinkText}>И-мэйлээ солих</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {tab === 'login' && !resetOpen ? (
        <View style={styles.form}>
          <AuthField label="И-мэйл эсвэл утас">
            <TextInput style={styles.input} placeholder="example@mail.com эсвэл 99112233" placeholderTextColor={C.textTertiary} value={loginEmail} onChangeText={setLoginEmail} keyboardType="email-address" autoCapitalize="none" />
          </AuthField>
          <AuthField label="Нууц үг">
            <PasswordField value={loginPassword} onChange={setLoginPassword} show={showLoginPwd} setShow={setShowLoginPwd} />
          </AuthField>
          <TouchableOpacity onPress={() => { setResetOpen(true); setResetEmail(loginEmail); resetMessages(); }}>
            <Text style={styles.linkText}>Нууц үгээ мартсан уу?</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]} onPress={handleLogin} disabled={isLoading} activeOpacity={0.85}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Нэвтрэх</Text>}
          </TouchableOpacity>
        </View>
      ) : null}

      {tab === 'login' && resetOpen && resetStep === 'email' ? (
        <View style={styles.form}>
          <Text style={styles.panelTitle}>Нууц үг сэргээх</Text>
          <AuthField label="Бүртгэлтэй и-мэйл">
            <TextInput style={styles.input} placeholder="example@mail.com" placeholderTextColor={C.textTertiary} value={resetEmail} onChangeText={setResetEmail} keyboardType="email-address" autoCapitalize="none" />
          </AuthField>
          <TouchableOpacity style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]} onPress={handleRequestReset} disabled={isLoading} activeOpacity={0.85}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Сэргээх код авах</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setResetOpen(false)}>
            <Text style={styles.mutedLinkText}>Буцах</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {tab === 'login' && resetOpen && resetStep === 'reset' ? (
        <View style={styles.form}>
          <AuthField label="Сэргээх код">
            <TextInput style={[styles.input, styles.otpInput]} value={resetOtp} onChangeText={(value) => setResetOtp(value.replace(/\D/g, '').slice(0, 4))} placeholder="1234" placeholderTextColor={C.textTertiary} keyboardType="number-pad" maxLength={4} />
          </AuthField>
          <AuthField label="Шинэ нууц үг">
            <PasswordField value={resetPassword} onChange={setResetPassword} show={showRegPwd} setShow={setShowRegPwd} />
          </AuthField>
          <AuthField label="Шинэ нууц үг давтах">
            <TextInput style={styles.input} value={resetConfirm} onChangeText={setResetConfirm} secureTextEntry={!showRegPwd} />
          </AuthField>
          <TouchableOpacity style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]} onPress={handleResetPassword} disabled={isLoading} activeOpacity={0.85}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Нууц үг шинэчлэх</Text>}
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.registerCard}>
        <View style={styles.registerHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.registerTitle}>Шинэ хэрэглэгч үү?</Text>
            <Text style={styles.registerText}>Email-ээр бүртгүүлнэ. Дараа нь email эсвэл утсаараа нэвтэрч болно.</Text>
          </View>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setRegisterOpen((value) => !value); resetMessages(); }}>
            <Text style={styles.secondaryBtnText}>Бүртгэл үүсгэх</Text>
          </TouchableOpacity>
        </View>

        {registerOpen ? (
          <View style={[styles.form, styles.registerForm]}>
            <View style={styles.nameRow}>
              <AuthField label="Нэр" style={{ flex: 1 }}>
                <TextInput style={styles.input} value={regFirstName} onChangeText={setRegFirstName} />
              </AuthField>
              <AuthField label="Овог" style={{ flex: 1 }}>
                <TextInput style={styles.input} value={regLastName} onChangeText={setRegLastName} />
              </AuthField>
            </View>
            <AuthField label="И-мэйл">
              <TextInput style={styles.input} value={regEmail} onChangeText={setRegEmail} keyboardType="email-address" autoCapitalize="none" />
            </AuthField>
            <AuthField label="Утасны дугаар">
              <TextInput style={styles.input} value={regPhone} onChangeText={setRegPhone} placeholder="9911 2233" placeholderTextColor={C.textTertiary} keyboardType="phone-pad" />
            </AuthField>
            <AuthField label="Нууц үг">
              <PasswordField value={regPassword} onChange={setRegPassword} show={showRegPwd} setShow={setShowRegPwd} />
            </AuthField>
            <AuthField label="Нууц үг давтах">
              <TextInput style={styles.input} value={regConfirm} onChangeText={setRegConfirm} secureTextEntry={!showRegPwd} />
            </AuthField>
            <TouchableOpacity style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]} onPress={handleRegister} disabled={isLoading} activeOpacity={0.85}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Бүртгэл үүсгэх</Text>}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function AuthField({ label, children, style }: { label: string; children: ReactNode; style?: object }) {
  return (
    <View style={[styles.inputGroup, style]}>
      <Text style={styles.inputLabel}>{label}</Text>
      {children}
    </View>
  );
}

function PasswordField({
  value,
  onChange,
  show,
  setShow,
}: {
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  setShow: (value: boolean) => void;
}) {
  return (
    <View style={styles.passwordWrapper}>
      <TextInput
        style={[styles.input, styles.passwordInput]}
        placeholder="Хамгийн багадаа 8 тэмдэгт"
        placeholderTextColor={C.textTertiary}
        value={value}
        onChangeText={onChange}
        secureTextEntry={!show}
      />
      <TouchableOpacity style={styles.eyeBtn} onPress={() => setShow(!show)}>
        <Ionicons name={show ? 'eye-off' : 'eye'} size={20} color={C.textTertiary} />
      </TouchableOpacity>
    </View>
  );
}

function LoggedInPanel() {
  const router = useRouter();
  const { customer, logout } = useAppStore();
  const [orders, setOrders] = useState<AccountOrder[]>([]);

  useEffect(() => {
    let mounted = true;
    shopFetch<{ orders: { items: AccountOrder[] } }>(MY_ORDERS_QUERY)
      .then((data) => {
        if (mounted) setOrders(data.orders.items);
      })
      .catch(() => {
        if (mounted) setOrders([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

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
        {orders.slice(0, 3).map((order) => (
          <View key={order.id} style={styles.miniOrderCard}>
            <Text style={styles.miniOrderCode}>{order.code}</Text>
            <Text style={[styles.miniOrderStatus, { color: StatusColor(order.state) }]}>
              {order.state}
            </Text>
            <Text style={styles.miniOrderTotal}>{formatPrice(order.total)}</Text>
          </View>
        ))}
        {orders.length === 0 ? <Text style={styles.emptyText}>Захиалга байхгүй байна</Text> : null}
      </View>

      {/* Addresses */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Хаяг</Text>
        {(customer.addresses ?? []).map((address) => (
          <View key={address.id} style={styles.addressCard}>
            <View style={styles.addressIconBox}>
              <Ionicons name="home" size={18} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>{address.defaultShippingAddress ? 'Үндсэн хаяг' : 'Хаяг'}</Text>
              <Text style={styles.addressFull}>{address.streetLine1}{address.city ? `, ${address.city}` : ''}</Text>
            </View>
          </View>
        ))}
        {(customer.addresses ?? []).length === 0 ? <Text style={styles.emptyText}>Хаяг бүртгэлгүй байна</Text> : null}
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
  authLogo: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  authLogoImage: { width: 230, height: 84 },
  authTitle: { color: C.text, fontSize: 22, fontWeight: '900', marginTop: 4 },
  authWelcome: { color: C.textSub, fontSize: 14, lineHeight: 20, marginTop: 5, marginBottom: 24 },

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
  otpInput: { textAlign: 'center', fontSize: 20, fontWeight: '800', letterSpacing: 8 },
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
  secondaryBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,69,0,0.35)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  secondaryBtnText: { color: C.primary, fontSize: 12, fontWeight: '800' },
  linkText: { color: C.primary, fontSize: 12, fontWeight: '800' },
  mutedLinkText: { color: C.textSub, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  errorBox: {
    overflow: 'hidden',
    color: '#FF7777',
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.22)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    fontSize: 12,
    lineHeight: 18,
  },
  infoBox: {
    overflow: 'hidden',
    color: C.success,
    backgroundColor: 'rgba(0,212,170,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.22)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    fontSize: 12,
    lineHeight: 18,
  },
  panelTitle: { color: C.text, fontSize: 15, fontWeight: '800' },
  registerCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginTop: 18,
  },
  registerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  registerTitle: { color: C.text, fontSize: 15, fontWeight: '900' },
  registerText: { color: C.textSub, fontSize: 12, lineHeight: 17, marginTop: 3 },
  registerForm: { marginTop: 16 },

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
  emptyText: { color: C.textSub, fontSize: 12, textAlign: 'center', paddingVertical: 10 },
  bottomSpacer: { height: 24 },
});
