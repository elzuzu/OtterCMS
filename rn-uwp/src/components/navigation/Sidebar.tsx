import React from 'react';
import { View, ScrollView, Text, StyleSheet, Platform } from 'react-native';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import NavigationItem from './NavigationItem';
import { useAuthStore } from '../../store/authStore';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const { user, logout } = useAuthStore();
  const items = [
    { id: 'dashboard', label: 'Tableau de bord', icon: 'home' },
    { id: 'individus', label: 'Individus', icon: 'people' },
    { id: 'import', label: 'Import de données', icon: 'cloud-upload' },
    { id: 'attribution', label: 'Attribution en masse', icon: 'git-branch' },
    { id: 'categories', label: 'Catégories', icon: 'tag' },
    { id: 'users', label: 'Utilisateurs', icon: 'person' },
    { id: 'settings', label: 'Paramètres', icon: 'settings' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appTitle}>Indi-Suivi</Text>
        <Text style={styles.version}>v2.0</Text>
      </View>
      <ScrollView style={styles.navigation}>
        {items.map(item => (
          <NavigationItem key={item.id} label={item.label} icon={item.icon} isActive={activeTab === item.id} onPress={() => onTabChange(item.id)} />
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.username}</Text>
          <Text style={styles.userRole}>{user?.role}</Text>
        </View>
        <NavigationItem label="Déconnexion" icon="log-out" onPress={logout} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 280,
    backgroundColor: colors.backgroundSecondary,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    ...Platform.select({ windows: { height: '100%' } }),
  },
  header: {
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  appTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  version: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  navigation: {
    flex: 1,
    paddingVertical: spacing.md,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
  },
  userInfo: {
    marginBottom: spacing.md,
  },
  userName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  userRole: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
});

export default Sidebar;
