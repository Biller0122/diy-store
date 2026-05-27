import { Redirect } from 'expo-router';
import { useDriverStore } from '../lib/store';

export default function IndexScreen() {
  const driver = useDriverStore((s) => s.driver);
  return <Redirect href={driver ? '/(tabs)' : '/login'} />;
}
