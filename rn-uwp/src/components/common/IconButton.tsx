import React from 'react';
import { TouchableOpacity, StyleSheet, GestureResponderEvent } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';

interface IconButtonProps {
  icon: string;
  size?: number;
  color?: string;
  onPress?: (event: GestureResponderEvent) => void;
}

const IconButton: React.FC<IconButtonProps> = ({ icon, size = 20, color = colors.text, onPress }) => (
  <TouchableOpacity style={styles.button} onPress={onPress}>
    <Icon name={icon} size={size} color={color} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    padding: spacing.sm,
  },
});

export default IconButton;
