import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';

interface GlassPanelProps {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
}

const GlassPanel: React.FC<GlassPanelProps> = ({ children, style, noPadding = false }) => (
  <View style={[styles.container, !noPadding && styles.padding, style]}>{children}</View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.glass,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({ windows: { backdropFilter: 'blur(20px)' } }),
  },
  padding: {
    padding: spacing.lg,
  },
});

export default GlassPanel;
