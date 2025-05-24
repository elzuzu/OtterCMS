import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { typography } from '../../styles/typography';

interface Props {
  label: string;
  icon: string;
  isActive?: boolean;
  onPress?: () => void;
}

const NavigationItem: React.FC<Props> = ({ label, icon, isActive, onPress }) => (
  <TouchableOpacity onPress={onPress} style={[styles.item, isActive && styles.active]}> 
    <Icon name={icon} size={20} color={colors.text} style={styles.icon} />
    <Text style={styles.label}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  active: {
    backgroundColor: colors.surfaceLight,
  },
  icon: {
    marginRight: spacing.md,
  },
  label: {
    ...typography.body,
    color: colors.text,
  },
});

export default NavigationItem;
