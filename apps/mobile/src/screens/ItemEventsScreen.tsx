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

import { listItemEvents, type ItemEvent } from '../api/items';
import type { CollectionsStackParamList } from '../navigation/CollectionsStack';

type Props = NativeStackScreenProps<CollectionsStackParamList, 'ItemEvents'>;

const EVENT_LABELS: Record<string, string> = {
  Created: 'Created',
  Updated: 'Updated',
  TagsChanged: 'Tags changed',
  LocationChanged: 'Location changed',
  AttributesChanged: 'Attributes changed',
  Deleted: 'Deleted',
};

const EVENT_COLORS: Record<string, string> = {
  Created: '#22c55e',
  Updated: '#6366f1',
  TagsChanged: '#f59e0b',
  LocationChanged: '#06b6d4',
  AttributesChanged: '#8b5cf6',
  Deleted: '#ef4444',
};

function EventRow({ event }: { event: ItemEvent }) {
  const label = EVENT_LABELS[event.eventType] ?? event.eventType;
  const color = EVENT_COLORS[event.eventType] ?? '#888';
  const date = new Date(event.occurredUtc);

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={styles.rowContent}>
        <View style={styles.rowHeader}>
          <Text style={styles.eventType}>{label}</Text>
          <Text style={styles.date}>
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Text style={styles.occurredBy}>{event.occurredBy}</Text>
        {event.notes ? <Text style={styles.notes}>{event.notes}</Text> : null}
      </View>
    </View>
  );
}

export default function ItemEventsScreen({ route }: Props) {
  const { collectionId, itemId } = route.params;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['collections', collectionId, 'items', itemId, 'events'],
    queryFn: () => listItemEvents(collectionId, itemId),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator testID="events-activity-indicator" size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load history.</Text>
        <Pressable onPress={() => void refetch()} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No history yet.</Text>
      </View>
    );
  }

  return (
    <FlatList<ItemEvent>
      data={data}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => <EventRow event={item} />}
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
    paddingVertical: 8,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e5e5',
    marginLeft: 48,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  eventType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  date: {
    fontSize: 12,
    color: '#888',
  },
  occurredBy: {
    fontSize: 13,
    color: '#555',
  },
  notes: {
    fontSize: 13,
    color: '#444',
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
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
});
