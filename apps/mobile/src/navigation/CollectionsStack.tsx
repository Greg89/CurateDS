import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CollectionDetailScreen from '../screens/CollectionDetailScreen';
import CollectionsScreen from '../screens/CollectionsScreen';

export type CollectionsStackParamList = {
  CollectionsList: undefined;
  CollectionDetail: { collectionId: string; collectionName: string };
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
    </Stack.Navigator>
  );
}
