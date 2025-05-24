import React from 'react';
import { View, TextInput, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';

interface SearchBarProps {
  value: string;
  placeholder?: string;
  onChange: (text: string) => void;
  style?: ViewStyle;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, placeholder, onChange, style }) => (
  <View style={[styles.container, style]}>
    <Icon name="search" size={18} color={colors.textSecondary} style={styles.icon} />
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      value={value}
      onChangeText={onChange}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
    color: colors.text,
  },
});

export default SearchBar;
