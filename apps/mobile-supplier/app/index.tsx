import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSupplierStore } from '@/lib/store';

const C = {
  bg: '#08080E',
  primary: '#FF4500',
};

export default function IndexScreen() {
  const supplier = useSupplierStore((s) => s.supplier);
  const hydrate = useSupplierStore((s) => s.hydrate);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate().finally(() => setReady(true));
  }, [hydrate]);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  return <Redirect href={supplier ? '/(tabs)' : '/login'} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
  },
});
