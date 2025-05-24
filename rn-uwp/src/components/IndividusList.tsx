import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useDataStore } from '../store/dataStore';
import DataTable, { Column } from './common/DataTable';
import LoadingSpinner from './common/LoadingSpinner';
import SearchBar from './common/SearchBar';
import { colors } from '../styles/colors';
import { spacing } from '../styles/spacing';

const IndividusList: React.FC = () => {
  const { individus, loadIndividus, loading } = useDataStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadIndividus();
  }, []);

  const filtered = individus.filter(ind =>
    ind.numero_unique?.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column[] = [
    { key: 'id', title: 'ID', width: 80 },
    { key: 'numero_unique', title: 'Numero' },
    { key: 'categorie_nom', title: 'Catégorie' },
    { key: 'en_charge_username', title: 'En charge' },
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <SearchBar value={search} onChange={setSearch} placeholder="Rechercher" style={styles.search} />
      <DataTable data={filtered} columns={columns} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.background },
  search: { marginBottom: spacing.lg },
});

export default IndividusList;
