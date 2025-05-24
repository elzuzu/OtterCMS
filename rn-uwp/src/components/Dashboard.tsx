import React, { useEffect, useState } from 'react';
import { View, ScrollView, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../styles/colors';
import { spacing } from '../styles/spacing';
import { typography } from '../styles/typography';
import Card from './common/Card';
import GlassPanel from './common/GlassPanel';
import { getDashboardStats } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const data = await getDashboardStats(user!.id, user!.role);
      setStats(data);
    } catch (e) {
      console.error('Erreur chargement stats:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tableau de bord</Text>
        <Text style={styles.subtitle}>Bienvenue, {user?.username}</Text>
      </View>
      <View style={styles.statsGrid}>
        <Card title={stats?.mesIndividus || '0'} subtitle="Mes individus" gradient={[colors.accent, colors.accentDark]} onPress={() => onNavigate('individus')} style={styles.statCard} />
        <Card title={stats?.totalIndividus || '0'} subtitle="Total individus" gradient={[colors.primary, colors.primaryDark]} style={styles.statCard} />
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <Card title={stats?.individusNonAttribues || '0'} subtitle="Non attribués" gradient={[colors.warning, '#d97706']} style={styles.statCard} />
        )}
        <Card title={stats?.totalCategories || '0'} subtitle="Catégories" gradient={[colors.surface, colors.surfaceLight]} style={styles.statCard} />
      </View>
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Actions rapides</Text>
        <View style={styles.actionsGrid}>
          <GlassPanel style={styles.actionCard}>
            <Text style={styles.actionTitle}>Ajouter un individu</Text>
            <Text style={styles.actionDescription}>Créer un nouveau dossier</Text>
          </GlassPanel>
          <GlassPanel style={styles.actionCard}>
            <Text style={styles.actionTitle}>Importer des données</Text>
            <Text style={styles.actionDescription}>Import CSV/Excel</Text>
          </GlassPanel>
          <GlassPanel style={styles.actionCard}>
            <Text style={styles.actionTitle}>Attribution en masse</Text>
            <Text style={styles.actionDescription}>Réassigner des dossiers</Text>
          </GlassPanel>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: spacing.xl },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.textSecondary },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xl, gap: spacing.lg },
  statCard: { width: '47%' },
  actionsSection: { padding: spacing.xl, marginTop: spacing.xl },
  sectionTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.lg },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  actionCard: { width: '31%', padding: spacing.xl },
  actionTitle: { ...typography.body, color: colors.text, fontWeight: '600', marginBottom: spacing.sm },
  actionDescription: { ...typography.bodySmall, color: colors.textSecondary },
});

export default Dashboard;
