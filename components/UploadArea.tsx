import { colors, radius, spacing, typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ActionButton } from './ActionButton';

type Props = {
  onSelectFile: () => void;
  loading?: boolean;
};

export function UploadArea({ onSelectFile, loading }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="cloud-upload-outline" size={32} color={colors.primary} />
      <Text style={styles.title}>Adicione seu contrato</Text>
      <Text style={styles.description}>PDF, DOC ou DOCX (simulação)</Text>
      <ActionButton label="Selecionar arquivo" onPress={onSelectFile} variant="secondary" loading={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.subtitle,
    fontWeight: '700',
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
});
