import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { listAttributeDefinitions } from '../api/attributeDefinitions';
import { getItemDetail, updateItem } from '../api/items';
import { listLocations } from '../api/locations';
import { listTags } from '../api/tags';
import type { CollectionsStackParamList } from '../navigation/CollectionsStack';

type Props = NativeStackScreenProps<CollectionsStackParamList, 'EditItem'>;

function validate(name: string, quantity: string) {
  const errors: Record<string, string> = {};
  const trimmed = name.trim();
  if (!trimmed) errors.name = 'Name is required.';
  else if (trimmed.length < 3) errors.name = 'Name must be at least 3 characters.';
  else if (trimmed.length > 120) errors.name = 'Name must be 120 characters or fewer.';
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1 || qty > 9999)
    errors.quantity = 'Quantity must be between 1 and 9999.';
  return errors;
}

export default function EditItemScreen({ route, navigation }: Props) {
  const { collectionId, itemId } = route.params;
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [locationId, setLocationId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [attrValues, setAttrValues] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const initialized = useRef(false);

  const { data: item, isLoading: itemLoading } = useQuery({
    queryKey: ['collections', collectionId, 'items', itemId],
    queryFn: () => getItemDetail(collectionId, itemId),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: listLocations,
  });

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: listTags,
  });

  const { data: attrDefs = [] } = useQuery({
    queryKey: ['attributeDefinitions', collectionId],
    queryFn: () => listAttributeDefinitions(collectionId),
  });

  // Populate form fields once from cached/fetched item data
  useEffect(() => {
    if (item && !initialized.current) {
      initialized.current = true;
      setName(item.name);
      setDescription(item.description ?? '');
      setQuantity(String(item.quantity));
      setLocationId(item.locationId);
      setSelectedTagIds(item.tags.map((t) => t.id));
      setAttrValues(
        Object.fromEntries(
          item.attributeValues.map((av) => [av.attributeDefinitionId, av.value]),
        ),
      );
    }
  }, [item]);

  const { mutate: submit, isPending, isError, error } = useMutation({
    mutationFn: async () => {
      const fieldErrors = validate(name, quantity);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        throw new Error('validation');
      }
      setErrors({});

      return updateItem(collectionId, itemId, {
        name: name.trim(),
        description: description || null,
        quantity: Number(quantity),
        locationId,
        itemTypeId: item?.itemTypeId ?? null,
        tagIds: selectedTagIds,
        attributeValues: Object.entries(attrValues).map(([attributeDefinitionId, value]) => ({
          attributeDefinitionId,
          value,
        })),
      });
    },
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['collections', collectionId, 'items', itemId] });
      void queryClient.invalidateQueries({ queryKey: ['collections', collectionId, 'items'] });
      navigation.navigate('ItemDetail', {
        collectionId,
        itemId: updated.id,
        itemName: updated.name,
      });
    },
  });

  function toggleTag(id: string) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  if (itemLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator testID="edit-item-activity-indicator" size="large" />
      </View>
    );
  }

  const serverError =
    isError && (error as Error).message !== 'validation'
      ? 'Failed to save item. Please try again.'
      : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Name */}
      <View style={styles.field}>
        <Text style={styles.label}>Name *</Text>
        <TextInput
          testID="name-input"
          style={[styles.input, errors.name ? styles.inputError : null]}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Canon AE-1"
          maxLength={120}
        />
        {errors.name ? <Text testID="name-error" style={styles.errorText}>{errors.name}</Text> : null}
      </View>

      {/* Description */}
      <View style={styles.field}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          testID="description-input"
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Optional"
          multiline
          numberOfLines={3}
          maxLength={2000}
        />
      </View>

      {/* Quantity */}
      <View style={styles.field}>
        <Text style={styles.label}>Quantity *</Text>
        <TextInput
          testID="quantity-input"
          style={[styles.input, errors.quantity ? styles.inputError : null]}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
        />
        {errors.quantity ? (
          <Text testID="quantity-error" style={styles.errorText}>{errors.quantity}</Text>
        ) : null}
      </View>

      {/* Location */}
      {locations.length > 0 ? (
        <View style={styles.field}>
          <Text style={styles.label}>Location</Text>
          <View style={styles.chipRow}>
            <Pressable
              testID="location-none"
              style={[styles.chip, locationId === null && styles.chipSelected]}
              onPress={() => setLocationId(null)}
            >
              <Text style={locationId === null ? styles.chipTextSelected : styles.chipText}>
                None
              </Text>
            </Pressable>
            {locations.map((loc) => (
              <Pressable
                key={loc.id}
                testID={`location-${loc.id}`}
                style={[styles.chip, locationId === loc.id && styles.chipSelected]}
                onPress={() => setLocationId(loc.id)}
              >
                <Text style={locationId === loc.id ? styles.chipTextSelected : styles.chipText}>
                  {loc.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {/* Tags */}
      {tags.length > 0 ? (
        <View style={styles.field}>
          <Text style={styles.label}>Tags</Text>
          <View style={styles.chipRow}>
            {tags.map((tag) => {
              const selected = selectedTagIds.includes(tag.id);
              return (
                <Pressable
                  key={tag.id}
                  testID={`tag-${tag.id}`}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => toggleTag(tag.id)}
                >
                  <Text style={selected ? styles.chipTextSelected : styles.chipText}>
                    {tag.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Dynamic attribute fields */}
      {attrDefs.map((def) => (
        <View key={def.id} style={styles.field}>
          <Text style={styles.label}>
            {def.name}
            {def.isRequired ? ' *' : ''}
          </Text>
          {def.dataType === 'Boolean' ? (
            <Switch
              testID={`attr-${def.key}`}
              value={attrValues[def.id] === 'true'}
              onValueChange={(v) =>
                setAttrValues((prev) => ({ ...prev, [def.id]: v ? 'true' : 'false' }))
              }
            />
          ) : def.dataType === 'Date' ? (
            <View>
              <Pressable
                testID={`attr-${def.key}`}
                style={styles.input}
                onPress={() => setShowDatePicker(def.id)}
              >
                <Text style={attrValues[def.id] ? styles.inputText : styles.placeholderText}>
                  {attrValues[def.id] || 'Select date…'}
                </Text>
              </Pressable>
              {showDatePicker === def.id && (
                <DateTimePicker
                  testID={`attr-${def.key}-picker`}
                  mode="date"
                  value={attrValues[def.id] ? new Date(attrValues[def.id]) : new Date()}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_event, date) => {
                    if (Platform.OS !== 'ios') setShowDatePicker(null);
                    if (date) {
                      setAttrValues((prev) => ({
                        ...prev,
                        [def.id]: date.toISOString().slice(0, 10),
                      }));
                    }
                  }}
                />
              )}
            </View>
          ) : (
            <TextInput
              testID={`attr-${def.key}`}
              style={styles.input}
              value={attrValues[def.id] ?? ''}
              onChangeText={(v) => setAttrValues((prev) => ({ ...prev, [def.id]: v }))}
              keyboardType={
                def.dataType === 'Number'
                  ? 'number-pad'
                  : def.dataType === 'Decimal'
                  ? 'decimal-pad'
                  : 'default'
              }
              placeholder={def.dataType}
            />
          )}
        </View>
      ))}

      {/* Server error */}
      {serverError ? (
        <Text testID="server-error" style={styles.errorText}>{serverError}</Text>
      ) : null}

      {/* Save button */}
      <Pressable
        testID="save-button"
        style={[styles.saveButton, isPending && styles.saveDisabled]}
        onPress={() => submit()}
        disabled={isPending}
      >
        {isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveText}>Save Changes</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, gap: 4 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  inputError: { borderColor: '#ef4444' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  errorText: { color: '#ef4444', fontSize: 13, marginTop: 4 },
  inputText: { fontSize: 16, color: '#111827', paddingVertical: 2 },
  placeholderText: { fontSize: 16, color: '#9ca3af', paddingVertical: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  chipSelected: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  chipText: { color: '#374151', fontSize: 14 },
  chipTextSelected: { color: '#fff', fontSize: 14 },
  saveButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
