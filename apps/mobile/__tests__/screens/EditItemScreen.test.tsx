import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import * as attrDefsApi from '../../src/api/attributeDefinitions';
import * as itemsApi from '../../src/api/items';
import type { ItemDetail } from '../../src/api/items';
import * as locationsApi from '../../src/api/locations';
import * as tagsApi from '../../src/api/tags';
import EditItemScreen from '../../src/screens/EditItemScreen';

jest.mock('../../src/api/items');
jest.mock('../../src/api/tags');
jest.mock('../../src/api/locations');
jest.mock('../../src/api/attributeDefinitions');

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

const COLLECTION_ID = '22222222-2222-2222-2222-222222222222';
const ITEM_ID = '11111111-1111-1111-1111-111111111111';

const mockRoute = {
  params: { collectionId: COLLECTION_ID, itemId: ITEM_ID, itemName: 'Canon AE-1' },
  key: 'EditItem',
  name: 'EditItem' as const,
};

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: jest.fn() } as never;

const existingItem: ItemDetail = {
  id: ITEM_ID,
  collectionId: COLLECTION_ID,
  name: 'Canon AE-1',
  description: 'A classic film camera',
  quantity: 2,
  locationId: '33333333-3333-3333-3333-333333333333',
  locationName: 'Camera shelf',
  itemTypeId: null,
  tags: [{ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'film' }],
  createdUtc: '2024-01-01T00:00:00Z',
  updatedUtc: null,
  attributeValues: [
    {
      attributeDefinitionId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      attributeName: 'Year',
      attributeKey: 'year',
      dataType: 'Text',
      value: '1976',
    },
  ],
  mediaAssets: [],
};

const updatedItem: ItemDetail = {
  ...existingItem,
  name: 'Canon AE-1 Program',
  description: 'Updated description',
  updatedUtc: '2024-06-01T00:00:00Z',
};

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function renderScreen() {
  return render(
    <EditItemScreen route={mockRoute} navigation={mockNavigation} />,
    { wrapper },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mockedTags.listTags.mockResolvedValue([]);
  mockedLocations.listLocations.mockResolvedValue([]);
  mockedAttrDefs.listAttributeDefinitions.mockResolvedValue([]);
});

afterEach(() => queryClient.clear());

describe('EditItemScreen', () => {
  it('shows a loading indicator while the item is being fetched', () => {
    mockedItems.getItemDetail.mockReturnValue(new Promise(() => {}));

    const { getByTestId } = renderScreen();

    expect(getByTestId('edit-item-activity-indicator')).toBeTruthy();
  });

  it('pre-fills form fields with existing item data', async () => {
    mockedItems.getItemDetail.mockResolvedValueOnce(existingItem);
    mockedItems.updateItem.mockResolvedValue(updatedItem);

    const { findByTestId } = renderScreen();

    const nameInput = await findByTestId('name-input');
    expect(nameInput.props.value).toBe('Canon AE-1');

    const descInput = await findByTestId('description-input');
    expect(descInput.props.value).toBe('A classic film camera');

    const qtyInput = await findByTestId('quantity-input');
    expect(qtyInput.props.value).toBe('2');
  });

  it('shows a name validation error when name is cleared', async () => {
    mockedItems.getItemDetail.mockResolvedValueOnce(existingItem);

    const { findByTestId } = renderScreen();

    const nameInput = await findByTestId('name-input');
    fireEvent.changeText(nameInput, '');
    fireEvent.press(await findByTestId('save-button'));

    expect(await findByTestId('name-error')).toBeTruthy();
    expect(mockedItems.updateItem).not.toHaveBeenCalled();
  });

  it('calls updateItem with form values and navigates to ItemDetail on success', async () => {
    mockedItems.getItemDetail.mockResolvedValueOnce(existingItem);
    mockedItems.updateItem.mockResolvedValueOnce(updatedItem);

    const { findByTestId } = renderScreen();

    const nameInput = await findByTestId('name-input');
    fireEvent.changeText(nameInput, 'Canon AE-1 Program');

    fireEvent.press(await findByTestId('save-button'));

    await waitFor(() => {
      expect(mockedItems.updateItem).toHaveBeenCalledWith(
        COLLECTION_ID,
        ITEM_ID,
        expect.objectContaining({ name: 'Canon AE-1 Program' }),
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith('ItemDetail', expect.objectContaining({
      collectionId: COLLECTION_ID,
      itemId: updatedItem.id,
      itemName: updatedItem.name,
    }));
  });

  it('shows a server error when updateItem rejects', async () => {
    mockedItems.getItemDetail.mockResolvedValueOnce(existingItem);
    mockedItems.updateItem.mockRejectedValueOnce(new Error('Server error'));

    const { findByTestId } = renderScreen();
    await findByTestId('name-input'); // wait for form to load

    fireEvent.press(await findByTestId('save-button'));

    expect(await findByTestId('server-error')).toBeTruthy();
  });

  it('toggles tag selection', async () => {
    mockedItems.getItemDetail.mockResolvedValueOnce({ ...existingItem, tags: [] });
    mockedTags.listTags.mockResolvedValue([
      { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'film', key: 'film', createdUtc: '2024-01-01T00:00:00Z' },
    ]);
    mockedItems.updateItem.mockResolvedValueOnce(updatedItem);

    const { findByTestId } = renderScreen();

    const tagChip = await findByTestId('tag-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    fireEvent.press(tagChip); // select

    fireEvent.press(await findByTestId('save-button'));

    await waitFor(() => {
      expect(mockedItems.updateItem).toHaveBeenCalledWith(
        COLLECTION_ID,
        ITEM_ID,
        expect.objectContaining({
          tagIds: ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
        }),
      );
    });
  });

  it('pre-selects existing tags', async () => {
    mockedItems.getItemDetail.mockResolvedValueOnce(existingItem);
    mockedTags.listTags.mockResolvedValue([
      { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'film', key: 'film', createdUtc: '2024-01-01T00:00:00Z' },
    ]);
    mockedItems.updateItem.mockResolvedValueOnce(updatedItem);

    const { findByTestId } = renderScreen();
    await findByTestId('name-input');

    fireEvent.press(await findByTestId('save-button'));

    await waitFor(() => {
      expect(mockedItems.updateItem).toHaveBeenCalledWith(
        COLLECTION_ID,
        ITEM_ID,
        expect.objectContaining({
          tagIds: ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
        }),
      );
    });
  });
});
