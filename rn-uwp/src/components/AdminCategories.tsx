import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../styles/colors';
import { spacing } from '../styles/spacing';
import { typography } from '../styles/typography';

const AdminCategories: React.FC = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Catégories</Text>
    <Text style={styles.subtitle}>Gestion des catégories à implémenter</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.background },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.lg },
  subtitle: { ...typography.body, color: colors.textSecondary },
});

export default AdminCategories;
