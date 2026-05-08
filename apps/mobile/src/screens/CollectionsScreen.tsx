import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { listCollections, type Collection } from '../api/collections';
import type { CollectionsStackParamList } from '../navigation/CollectionsStack';

type Props = NativeStackScreenProps<CollectionsStackParamList, 'CollectionsList'>;

export default function CollectionsScreen({ navigation }: Props) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['collections'],
    queryFn: listCollections,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator testID="activity-indicator" size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load collections.</Text>
        <Pressable onPress={() => void refetch()} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No collections yet.</Text>
        <Text style={styles.emptySubtext}>Create one on the web to get started.</Text>
      </View>
    );
  }

  return (
    <FlatList<Collection>
      data={data}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() =>
            navigation.navigate('CollectionDetail', {
              collectionId: item.id,
              collectionName: item.name,
            })
          }
        >
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  list: {
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  name: {
    flex: 1,
    fontSize: 17,
    color: '#111',
  },
  chevron: {
    fontSize: 22,
    color: '#999',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e5e5',
    marginLeft: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#c00',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#111',
  },
  retryText: {
    fontSize: 15,
    color: '#111',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
});
