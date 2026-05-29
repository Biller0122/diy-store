import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

export function StarRating({ rating, size = 20 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Ionicons
          key={index}
          name={index <= full ? 'star' : index === full + 1 && half ? 'star-half' : 'star-outline'}
          size={size}
          color={colors.warning}
        />
      ))}
    </View>
  );
}
