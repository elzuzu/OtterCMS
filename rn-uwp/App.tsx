import React, { useState } from 'react';
import { View, Text, Button } from 'react-native';
import Auth from './src/components/Auth';

const App = () => {
  const [user, setUser] = useState<any>(null);

  if (!user) {
    return <Auth setUser={setUser} />;
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 20, marginBottom: 16 }}>Bienvenue, {user.username}</Text>
      <Button title="Déconnexion" onPress={() => setUser(null)} />
    </View>
  );
};

export default App;
