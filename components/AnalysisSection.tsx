import { colors, radius, spacing, typography } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  title: string;
  items?: string[];
  description?: string;
  accent?: 'primary' | 'warning' | 'success';
};

const accentMap = {
  primary: '#2F5BFF',
  warning: '#F59E0B',
  success: '#16A34A',
};

export function AnalysisSection({ title, items, description, accent = 'primary' }: Props) {
  return (
    <View style={[styles.container, { borderLeftColor: accentMap[accent] }] }>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {items?.map((item) => (
        <View key={item} style={styles.itemRow}>
          <View style={[styles.dot, { backgroundColor: accentMap[accent] }]} />
          <Text style={styles.itemText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.subtitle,
    fontWeight: '700',
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    marginTop: 6,
  },
  itemText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 21,
  },
});
