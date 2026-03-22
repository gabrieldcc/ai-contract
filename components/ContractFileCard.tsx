import { colors, radius, spacing, typography } from '@/constants/theme';
import { UploadedContractFile } from '@/types/contract';
import { formatBytesLabel, formatDateTime } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  file: UploadedContractFile;
  onRemove: () => void;
};

export function ContractFileCard({ file, onRemove }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons name="document-text-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.content}>
          <Text style={styles.fileName}>{file.name}</Text>
          <Text style={styles.meta}>{formatBytesLabel(file.sizeLabel)} • {file.type.toUpperCase()}</Text>
          <Text style={styles.meta}>Selecionado em {formatDateTime(file.uploadedAt)}</Text>
        </View>
      </View>

      <Pressable onPress={onRemove}>
        <Text style={styles.remove}>Remover</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  fileName: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: typography.body,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  remove: {
    color: colors.danger,
    fontWeight: '600',
  },
});
