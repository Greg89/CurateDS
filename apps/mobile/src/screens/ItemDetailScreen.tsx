import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getItemDetail } from '../api/items';
import type { CollectionsStackParamList } from '../navigation/CollectionsStack';

type Props = NativeStackScreenProps<CollectionsStackParamList, 'ItemDetail'>;

export default function ItemDetailScreen({ route }: Props) {
  const { collectionId, itemId } = route.params;

  const { data, isLoading, isError, isRefetching, refetch } = useQuery({
    queryKey: ['collections', collectionId, 'items', itemId],
    queryFn: () => getItemDetail(collectionId, itemId),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator testID="item-detail-activity-indicator" size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load item.</Text>
        <Pressable onPress={() => void refetch()} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!data) return null;

  const primaryImage = data.mediaAssets.find((a) => a.isPrimary) ?? data.mediaAssets[0];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
      }
    >
      {/* Hero image */}
      {primaryImage ? (
        <Image
          source={{ uri: primaryImage.url }}
          style={styles.heroImage}
          resizeMode="cover"
          accessibilityLabel={`Primary image for ${data.name}`}
        />
      ) : null}

      {/* Core metadata */}
      <View style={styles.section}>
        <Text style={styles.itemName}>{data.name}</Text>
        {data.description ? (
          <Text style={styles.description}>{data.description}</Text>
        ) : null}
      </View>

      <View style={styles.divider} />

      {/* Details row */}
      <View style={styles.section}>
        <DetailRow label="Quantity" value={String(data.quantity)} />
        {data.locationName ? (
          <DetailRow label="Location" value={data.locationName} />
        ) : null}
        <DetailRow
          label="Added"
          value={new Date(data.createdUtc).toLocaleDateString()}
        />
        {data.updatedUtc ? (
          <DetailRow
            label="Updated"
            value={new Date(data.updatedUtc).toLocaleDateString()}
          />
        ) : null}
      </View>

      {/* Tags */}
      {data.tags.length > 0 ? (
        <>
          <View style={styles.divider} />
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagRow}>
              {data.tags.map((tag) => (
                <View key={tag.id} style={styles.tag}>
                  <Text style={styles.tagText}>{tag.name}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      ) : null}

      {/* Attribute values */}
      {data.attributeValues.length > 0 ? (
        <>
          <View style={styles.divider} />
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attributes</Text>
            {data.attributeValues.map((attr) => (
              <DetailRow
                key={attr.attributeDefinitionId}
                label={attr.attributeName}
                value={attr.value}
              />
            ))}
          </View>
        </>
      ) : null}

      {/* Additional photos */}
      {data.mediaAssets.length > 1 ? (
        <>
          <View style={styles.divider} />
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.photoRow}>
                {data.mediaAssets.map((asset) => (
                  <Image
                    key={asset.id}
                    source={{ uri: asset.url }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                    accessibilityLabel={asset.fileName}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  heroImage: {
    width: '100%',
    height: 260,
    backgroundColor: '#f0f0f0',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e5e5',
    marginHorizontal: 16,
  },
  itemName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
    marginBottom: 6,
  },
  description: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 15,
    color: '#555',
  },
  detailValue: {
    fontSize: 15,
    color: '#111',
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 13,
    color: '#333',
  },
  photoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
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
