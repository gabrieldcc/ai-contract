import { colors, radius, spacing, typography } from '@/constants/theme';
import { AnalysisHistoryItem } from '@/types/contract';
import { formatDateTime } from '@/utils/format';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton } from './ActionButton';

type Props = {
  item: AnalysisHistoryItem;
  onOpen: () => void;
};

const statusMap = {
  completed: { label: 'Concluída', color: colors.success },
  processing: { label: 'Em processamento', color: colors.warning },
  failed: { label: 'Falhou', color: colors.danger },
};

export function HistoryCard({ item, onOpen }: Props) {
  const status = statusMap[item.status];

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{item.contractName}</Text>
      <Text style={styles.meta}>Data: {formatDateTime(item.createdAt)}</Text>

      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
        <Text style={styles.statusText}>{status.label}</Text>
      </View>

      <ActionButton label="Abrir detalhes" onPress={onOpen} variant="secondary" />
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
  name: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: '700',
  },
  meta: {
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '600',
  },
});
