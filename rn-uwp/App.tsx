import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AuthScreen from './src/screens/AuthScreen';
import MainScreen from './src/screens/MainScreen';
import { useAuthStore } from './src/store/authStore';
import { initDatabase } from './src/services/database';
import { colors } from './src/styles/colors';

const Stack = createStackNavigator();

const App: React.FC = () => {
  const { user, checkAutoLogin } = useAuthStore();

  useEffect(() => {
    initDatabase();
    checkAutoLogin();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: colors.background } }}>
            {user ? <Stack.Screen name="Main" component={MainScreen} /> : <Stack.Screen name="Auth" component={AuthScreen} />}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
