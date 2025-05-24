import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Individu } from '../types';
import GlassPanel from './common/GlassPanel';
import { colors } from '../styles/colors';
import { spacing } from '../styles/spacing';
import { typography } from '../styles/typography';

interface Props {
  individu: Individu;
}

const IndividuDetails: React.FC<Props> = ({ individu }) => (
  <GlassPanel style={styles.container}>
    <Text style={styles.title}>Dossier #{individu.id}</Text>
    <Text style={styles.field}>Numéro: {individu.numero_unique}</Text>
    <Text style={styles.field}>Catégorie: {individu.categorie_nom}</Text>
    <Text style={styles.field}>En charge: {individu.en_charge_username}</Text>
  </GlassPanel>
);

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  title: { ...typography.h4, color: colors.text, marginBottom: spacing.md },
  field: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.sm },
});

export default IndividuDetails;
