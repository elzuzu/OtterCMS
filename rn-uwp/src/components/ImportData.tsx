import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import { spacing } from '../styles/spacing';
import { typography } from '../styles/typography';
import { colors } from '../styles/colors';

const ImportData: React.FC = () => {
  const pickFile = async () => {
    try {
      await DocumentPicker.pickSingle({ type: [DocumentPicker.types.allFiles] });
    } catch (e) {
      if (!DocumentPicker.isCancel(e)) {
        console.error(e);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Import de données</Text>
      <Button title="Choisir un fichier" onPress={pickFile} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.background },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.lg },
});

export default ImportData;
