import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../styles/colors';
import { spacing } from '../styles/spacing';
import { typography } from '../styles/typography';

const MassAttribution: React.FC = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Attribution en masse</Text>
    <Text style={styles.subtitle}>Fonctionnalité à implémenter</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.background },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.lg },
  subtitle: { ...typography.body, color: colors.textSecondary },
});

export default MassAttribution;
