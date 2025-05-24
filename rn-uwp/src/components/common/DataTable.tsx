import React from 'react';
import { View, Text, StyleSheet, FlatList, ViewStyle } from 'react-native';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { typography } from '../../styles/typography';

type Row = Record<string, any>;

export interface Column {
  key: string;
  title: string;
  render?: (row: Row) => React.ReactNode;
  width?: number;
}

interface DataTableProps {
  data: Row[];
  columns: Column[];
  style?: ViewStyle;
}

const DataTable: React.FC<DataTableProps> = ({ data, columns, style }) => {
  const renderHeader = () => (
    <View style={styles.headerRow}>
      {columns.map(col => (
        <Text key={col.key} style={[styles.headerCell, { flexBasis: col.width || 1 }]}> {col.title} </Text>
      ))}
    </View>
  );

  const renderItem = ({ item }: { item: Row }) => (
    <View style={styles.row}>
      {columns.map(col => (
        <View key={col.key} style={[styles.cell, { flexBasis: col.width || 1 }]}> 
          {col.render ? col.render(item) : <Text style={styles.cellText}>{String(item[col.key])}</Text>}
        </View>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      {renderHeader()}
      <FlatList data={data} renderItem={renderItem} keyExtractor={(_, index) => index.toString()} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
  },
  headerCell: {
    ...typography.button,
    color: colors.text,
    padding: spacing.sm,
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cell: {
    flex: 1,
    padding: spacing.sm,
  },
  cellText: {
    ...typography.body,
    color: colors.text,
  },
});

export default DataTable;
