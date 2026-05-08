import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import CollectionsStack from './CollectionsStack';
import ProfileScreen from '../screens/ProfileScreen';
import SearchScreen from '../screens/SearchScreen';

export type RootTabParamList = {
  Collections: undefined;
  Search: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function RootTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#111',
      }}
    >
      <Tab.Screen
        name="Collections"
        component={CollectionsStack}
        options={{ tabBarIcon: () => <Text>📚</Text> }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ headerShown: true, tabBarIcon: () => <Text>🔍</Text> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: true, tabBarIcon: () => <Text>👤</Text> }}
      />
    </Tab.Navigator>
  );
}
