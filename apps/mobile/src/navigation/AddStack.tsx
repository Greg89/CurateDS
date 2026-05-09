import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import CameraScreen from '../screens/CameraScreen';
import CollectionsScreen from '../screens/CollectionsScreen';
import NewItemScreen from '../screens/NewItemScreen';
import ItemSavedScreen from '../screens/ItemSavedScreen';

export type AddStackParamList = {
  PickCollection: undefined;
  Camera: { collectionId: string; collectionName: string };
  NewItem: {
    collectionId: string;
    photoUri: string | null;
    photoFileName: string;
    photoContentType: string;
  };
  ItemSaved: { collectionId: string; itemId: string; itemName: string };
};

const Stack = createNativeStackNavigator<AddStackParamList>();

export default function AddStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="PickCollection"
        options={{ title: 'Choose Collection' }}
      >
        {(props: NativeStackScreenProps<AddStackParamList, 'PickCollection'>) => (
          <CollectionsScreen
            {...(props as any)}
            onSelectCollection={(col) =>
              props.navigation.navigate('Camera', {
                collectionId: col.id,
                collectionName: col.name,
              })
            }
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Camera"
        options={{ title: 'Take Photo', headerShown: false }}
      >
        {(props: NativeStackScreenProps<AddStackParamList, 'Camera'>) => (
          <CameraScreen
            onPhotoCaptured={(photo) =>
              props.navigation.navigate('NewItem', {
                collectionId: props.route.params.collectionId,
                photoUri: photo.uri,
                photoFileName: photo.fileName,
                photoContentType: photo.contentType,
              })
            }
            onCancel={() => props.navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="NewItem"
        component={NewItemScreen}
        options={{ title: 'New Item' }}
      />
      <Stack.Screen
        name="ItemSaved"
        component={ItemSavedScreen}
        options={{ title: 'Item Saved', headerBackVisible: false }}
      />
    </Stack.Navigator>
  );
}
