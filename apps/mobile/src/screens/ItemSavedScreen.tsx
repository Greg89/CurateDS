import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AddStackParamList } from '../navigation/AddStack';

type Props = NativeStackScreenProps<AddStackParamList, 'ItemSaved'>;

export default function ItemSavedScreen({ route, navigation }: Props) {
  const { collectionId, itemName } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>✅</Text>
      <Text testID="saved-title" style={styles.title}>
        {itemName} saved!
      </Text>
      <Pressable
        testID="add-another-button"
        style={styles.button}
        onPress={() =>
          navigation.navigate('Camera', {
            collectionId,
            collectionName: '',
          })
        }
      >
        <Text style={styles.buttonText}>Add Another</Text>
      </Pressable>
      <Pressable
        testID="done-button"
        onPress={() => navigation.popToTop()}
      >
        <Text style={styles.doneText}>Done</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32 },
  emoji: { fontSize: 64 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center' },
  button: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  doneText: { color: '#6b7280', fontSize: 16 },
});
