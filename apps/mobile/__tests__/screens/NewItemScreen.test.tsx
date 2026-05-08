import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import * as itemsApi from '../../src/api/items';
import * as tagsApi from '../../src/api/tags';
import * as locationsApi from '../../src/api/locations';
import * as attrDefsApi from '../../src/api/attributeDefinitions';
import NewItemScreen from '../../src/screens/NewItemScreen';

jest.mock('../../src/api/items');
jest.mock('../../src/api/tags');
jest.mock('../../src/api/locations');
jest.mock('../../src/api/attributeDefinitions');

// DateTimePicker is a native module; stub it as a no-op View in tests
jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native');
  return function DateTimePicker(props: { testID?: string }) {
    return <View testID={props.testID} />;
  };
});

const mockedItems = itemsApi as jest.Mocked<typeof itemsApi>;
const mockedTags = tagsApi as jest.Mocked<typeof tagsApi>;
const mockedLocations = locationsApi as jest.Mocked<typeof locationsApi>;
const mockedAttrDefs = attrDefsApi as jest.Mocked<typeof attrDefsApi>;

const COLLECTION_ID = '11111111-1111-1111-1111-111111111111';

const mockRoute = {
  params: {
    collectionId: COLLECTION_ID,
    photoUri: 'file:///tmp/photo.jpg',
    photoFileName: 'photo.jpg',
    photoContentType: 'image/jpeg',
  },
  key: 'NewItem',
  name: 'NewItem' as const,
};

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate } as never;

const SAVED_ITEM = {
  id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  collectionId: COLLECTION_ID,
  name: 'Canon AE-1',
  description: null,
  quantity: 1,
  locationId: null,
  locationName: null,
  itemTypeId: null,
  tags: [],
  createdUtc: '2026-01-01T00:00:00Z',
  updatedUtc: null,
  attributeValues: [],
  mediaAssets: [],
};

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mockedTags.listTags.mockResolvedValue([]);
  mockedLocations.listLocations.mockResolvedValue([]);
  mockedAttrDefs.listAttributeDefinitions.mockResolvedValue([]);
});

afterEach(() => queryClient.clear());

function renderScreen(routeOverrides = {}) {
  return render(
    <NewItemScreen
      route={{ ...mockRoute, params: { ...mockRoute.params, ...routeOverrides } }}
      navigation={mockNavigation}
    />,
    { wrapper },
  );
}

describe('NewItemScreen', () => {
  it('renders name, description, and quantity inputs', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('name-input')).toBeTruthy();
    expect(getByTestId('description-input')).toBeTruthy();
    expect(getByTestId('quantity-input')).toBeTruthy();
  });

  it('shows a photo preview when photoUri is provided', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('photo-preview')).toBeTruthy();
  });

  it('does not show photo preview when photoUri is null', () => {
    const { queryByTestId } = renderScreen({ photoUri: null });
    expect(queryByTestId('photo-preview')).toBeNull();
  });

  it('shows name validation error when name is empty', async () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('save-button'));
    await waitFor(() => expect(getByTestId('name-error')).toBeTruthy());
  });

  it('shows name validation error when name is too short', async () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('name-input'), 'AB');
    fireEvent.press(getByTestId('save-button'));
    await waitFor(() =>
      expect(getByTestId('name-error').props.children).toContain('3 characters'),
    );
  });

  it('shows quantity validation error when quantity is 0', async () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('name-input'), 'Canon AE-1');
    fireEvent.changeText(getByTestId('quantity-input'), '0');
    fireEvent.press(getByTestId('save-button'));
    await waitFor(() => expect(getByTestId('quantity-error')).toBeTruthy());
  });

  it('shows quantity validation error when quantity exceeds 9999', async () => {
    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('name-input'), 'Canon AE-1');
    fireEvent.changeText(getByTestId('quantity-input'), '10000');
    fireEvent.press(getByTestId('save-button'));
    await waitFor(() => expect(getByTestId('quantity-error')).toBeTruthy());
  });

  it('calls createItem and navigates to ItemSaved on success', async () => {
    mockedItems.createItem.mockResolvedValueOnce(SAVED_ITEM);
    mockedItems.uploadItemMedia.mockResolvedValueOnce({
      id: 'aaa',
      url: 'https://cdn.example.com/photo.jpg',
      contentType: 'image/jpeg',
      fileName: 'photo.jpg',
      sizeBytes: 1024,
      isPrimary: true,
      uploadedUtc: '2026-01-01T00:00:00Z',
    });

    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('name-input'), 'Canon AE-1');
    fireEvent.press(getByTestId('save-button'));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('ItemSaved', {
        collectionId: COLLECTION_ID,
        itemId: SAVED_ITEM.id,
        itemName: SAVED_ITEM.name,
      }),
    );
    expect(mockedItems.createItem).toHaveBeenCalledWith(
      COLLECTION_ID,
      expect.objectContaining({ name: 'Canon AE-1', quantity: 1 }),
    );
    expect(mockedItems.uploadItemMedia).toHaveBeenCalled();
  });

  it('skips uploadItemMedia when no photo uri provided', async () => {
    mockedItems.createItem.mockResolvedValueOnce(SAVED_ITEM);

    const { getByTestId } = renderScreen({ photoUri: null });
    fireEvent.changeText(getByTestId('name-input'), 'Canon AE-1');
    fireEvent.press(getByTestId('save-button'));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    expect(mockedItems.uploadItemMedia).not.toHaveBeenCalled();
  });

  it('shows server error when createItem fails', async () => {
    mockedItems.createItem.mockRejectedValueOnce(new Error('network'));

    const { getByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('name-input'), 'Canon AE-1');
    fireEvent.press(getByTestId('save-button'));

    await waitFor(() => expect(getByTestId('server-error')).toBeTruthy());
  });

  it('renders location chips when locations are available', async () => {
    mockedLocations.listLocations.mockResolvedValue([
      { id: 'loc-1', name: 'Camera shelf', description: null, createdUtc: '2026-01-01T00:00:00Z' },
    ]);
    const { findByTestId } = renderScreen();
    expect(await findByTestId('location-loc-1')).toBeTruthy();
  });

  it('renders tag chips when tags are available', async () => {
    mockedTags.listTags.mockResolvedValue([
      { id: 'tag-1', name: 'film', key: 'film', createdUtc: '2026-01-01T00:00:00Z' },
    ]);
    const { findByTestId } = renderScreen();
    expect(await findByTestId('tag-tag-1')).toBeTruthy();
  });

  it('renders attribute fields when attribute definitions are loaded', async () => {
    mockedAttrDefs.listAttributeDefinitions.mockResolvedValue([
      {
        id: 'attr-1',
        collectionId: COLLECTION_ID,
        name: 'Year',
        key: 'year',
        dataType: 'Number',
        isRequired: true,
        isFilterable: false,
        sortOrder: 0,
        itemTypeId: null,
        createdUtc: '2026-01-01T00:00:00Z',
      },
    ]);
    const { findByTestId } = renderScreen();
    expect(await findByTestId('attr-year')).toBeTruthy();
  });

  it('includes selected tag ids in the createItem call', async () => {
    mockedTags.listTags.mockResolvedValue([
      { id: 'tag-1', name: 'film', key: 'film', createdUtc: '2026-01-01T00:00:00Z' },
    ]);
    mockedItems.createItem.mockResolvedValueOnce(SAVED_ITEM);
    mockedItems.uploadItemMedia.mockResolvedValueOnce({
      id: 'aaa', url: '', contentType: 'image/jpeg', fileName: 'p.jpg', sizeBytes: 1, isPrimary: true, uploadedUtc: '',
    });

    const { getByTestId, findByTestId } = renderScreen();
    fireEvent.changeText(getByTestId('name-input'), 'Canon AE-1');
    const tagChip = await findByTestId('tag-tag-1');
    fireEvent.press(tagChip);
    fireEvent.press(getByTestId('save-button'));

    await waitFor(() =>
      expect(mockedItems.createItem).toHaveBeenCalledWith(
        COLLECTION_ID,
        expect.objectContaining({ tagIds: ['tag-1'] }),
      ),
    );
  });

  it('renders a Switch for Boolean attribute type', async () => {
    mockedAttrDefs.listAttributeDefinitions.mockResolvedValue([
      {
        id: 'attr-bool',
        collectionId: COLLECTION_ID,
        name: 'Mint Condition',
        key: 'mintCondition',
        dataType: 'Boolean' as const,
        isRequired: false,
        isFilterable: false,
        sortOrder: 0,
        itemTypeId: null,
        createdUtc: '2026-01-01T00:00:00Z',
      },
    ]);
    const { findByTestId } = renderScreen();
    const toggle = await findByTestId('attr-mintCondition');
    // Switch renders with accessibilityRole="switch"
    expect(toggle.props.accessibilityRole).toBe('switch');
  });

  it('renders a date Pressable for Date attribute type', async () => {
    mockedAttrDefs.listAttributeDefinitions.mockResolvedValue([
      {
        id: 'attr-date',
        collectionId: COLLECTION_ID,
        name: 'Purchase Date',
        key: 'purchaseDate',
        dataType: 'Date' as const,
        isRequired: false,
        isFilterable: false,
        sortOrder: 0,
        itemTypeId: null,
        createdUtc: '2026-01-01T00:00:00Z',
      },
    ]);
    const { findByTestId, queryByTestId } = renderScreen();
    const trigger = await findByTestId('attr-purchaseDate');
    expect(trigger).toBeTruthy();
    // Picker is hidden until trigger is pressed
    expect(queryByTestId('attr-purchaseDate-picker')).toBeNull();
    fireEvent.press(trigger);
    expect(queryByTestId('attr-purchaseDate-picker')).toBeTruthy();
  });
});
