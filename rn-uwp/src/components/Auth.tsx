import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { login, initDatabase, testConnection } from '../api';

interface AuthProps {
  setUser: (u: any) => void;
}

export default function Auth({ setUser }: AuthProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initStatus, setInitStatus] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    setInitStatus('');
    try {
      const res = await login(username, password);
      if (res.success) {
        setUser({
          id: res.userId,
          username: res.username,
          role: res.role,
          permissions: res.permissions,
        });
      } else {
        setError(res.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInit = async () => {
    setLoading(true);
    try {
      const res = await initDatabase();
      if (res.success) {
        setInitStatus('Database initialized');
      } else {
        setInitStatus('Initialization failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    const res = await testConnection();
    setInitStatus(res.message || 'Test done');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connexion</Text>
      <TextInput
        style={styles.input}
        placeholder="Nom d'utilisateur"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {initStatus ? <Text style={styles.status}>{initStatus}</Text> : null}
      <View style={styles.buttons}>
        <Button title="Se connecter" onPress={handleLogin} disabled={loading} />
        <Button title="Test" onPress={handleTest} disabled={loading} />
        <Button title="Init DB" onPress={handleInit} disabled={loading} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, marginBottom: 16, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', marginBottom: 12, padding: 8 },
  buttons: { flexDirection: 'row', justifyContent: 'space-around' },
  error: { color: 'red', marginBottom: 8, textAlign: 'center' },
  status: { color: 'green', marginBottom: 8, textAlign: 'center' },
});
