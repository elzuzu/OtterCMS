import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ViewStyle, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { typography } from '../../styles/typography';

interface CardProps {
  title: string;
  subtitle?: string;
  backgroundImage?: string;
  onPress?: () => void;
  style?: ViewStyle;
  gradient?: string[];
}

const Card: React.FC<CardProps> = ({ title, subtitle, backgroundImage, onPress, style, gradient = [colors.surface, colors.surfaceLight] }) => {
  const content = (
    <View style={[styles.container, style]}>
      {backgroundImage ? (
        <ImageBackground source={{ uri: backgroundImage }} style={styles.backgroundImage} imageStyle={styles.backgroundImageStyle}>
          <LinearGradient colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.8)"]} style={styles.gradient}>
            <View style={styles.content}>
              <Text style={styles.title}>{title}</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
          </LinearGradient>
        </ImageBackground>
      ) : (
        <LinearGradient colors={gradient} style={styles.gradient}>
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        </LinearGradient>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({ windows: { elevation: 4 } }),
  },
  backgroundImage: { flex: 1 },
  backgroundImageStyle: { borderRadius: 12 },
  gradient: { flex: 1, justifyContent: 'flex-end' },
  content: { padding: spacing.lg },
  title: { ...typography.h4, color: colors.text, marginBottom: spacing.xs },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary },
});

export default Card;
