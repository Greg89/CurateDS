import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CollectionDetailScreen from '../screens/CollectionDetailScreen';
import CollectionsScreen from '../screens/CollectionsScreen';
import EditItemScreen from '../screens/EditItemScreen';
import ItemDetailScreen from '../screens/ItemDetailScreen';

export type CollectionsStackParamList = {
  CollectionsList: undefined;
  CollectionDetail: { collectionId: string; collectionName: string };
  ItemDetail: { collectionId: string; itemId: string; itemName: string };
  EditItem: { collectionId: string; itemId: string; itemName: string };
};

const Stack = createNativeStackNavigator<CollectionsStackParamList>();

export default function CollectionsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CollectionsList"
        component={CollectionsScreen}
        options={{ title: 'Collections' }}
      />
      <Stack.Screen
        name="CollectionDetail"
        component={CollectionDetailScreen}
        options={({ route }) => ({ title: route.params.collectionName })}
      />
      <Stack.Screen
        name="ItemDetail"
        component={ItemDetailScreen}
        options={({ route }) => ({ title: route.params.itemName })}
      />
      <Stack.Screen
        name="EditItem"
        component={EditItemScreen}
        options={{ title: 'Edit Item' }}
      />
    </Stack.Navigator>
  );
}
