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

import { listItems, type ItemSummary } from '../api/items';
import type { CollectionsStackParamList } from '../navigation/CollectionsStack';

type Props = NativeStackScreenProps<CollectionsStackParamList, 'CollectionDetail'>;

export default function CollectionDetailScreen({ route }: Props) {
  const { collectionId } = route.params;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['collections', collectionId, 'items'],
    queryFn: () => listItems(collectionId),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator testID="detail-activity-indicator" size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load items.</Text>
        <Pressable onPress={() => void refetch()} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No items yet.</Text>
        <Text style={styles.emptySubtext}>Add items on the web to see them here.</Text>
      </View>
    );
  }

  return (
    <FlatList<ItemSummary>
      data={data}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={styles.rowContent}>
            <Text style={styles.name}>{item.name}</Text>
            {item.description ? (
              <Text style={styles.description} numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}
            <View style={styles.meta}>
              {item.locationName ? (
                <Text style={styles.metaText}>📍 {item.locationName}</Text>
              ) : null}
              <Text style={styles.metaText}>Qty: {item.quantity}</Text>
              {item.tags.length > 0 ? (
                <Text style={styles.metaText}>{item.tags.join(', ')}</Text>
              ) : null}
            </View>
          </View>
        </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowContent: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '500',
    color: '#111',
  },
  description: {
    fontSize: 14,
    color: '#555',
    marginTop: 2,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#777',
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
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#111',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
  },
});
