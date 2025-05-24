import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Text } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { spacing } from '../styles/spacing';
import { typography } from '../styles/typography';
import { colors } from '../styles/colors';

const AuthScreen: React.FC = () => {
  const { login, error, isLoading } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connexion</Text>
      <TextInput style={styles.input} placeholder="Nom d'utilisateur" value={username} onChangeText={setUsername} />
      <TextInput style={styles.input} placeholder="Mot de passe" secureTextEntry value={password} onChangeText={setPassword} />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button title="Se connecter" onPress={() => login(username, password)} disabled={isLoading} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  title: { ...typography.h2, color: colors.text, textAlign: 'center', marginBottom: spacing.lg },
  input: { borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, padding: spacing.sm, color: colors.text },
  error: { color: colors.error, marginBottom: spacing.md, textAlign: 'center' },
});

export default AuthScreen;
