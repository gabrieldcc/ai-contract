import { colors, radius, spacing, typography } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  message: string;
  tone?: 'error' | 'info';
};

export function StateBanner({ message, tone = 'info' }: Props) {
  return (
    <View style={[styles.container, tone === 'error' ? styles.error : styles.info]}>
      <Text style={[styles.message, tone === 'error' ? styles.errorText : styles.infoText]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  info: {
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  error: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  message: {
    fontSize: typography.caption,
    fontWeight: '600',
  },
  infoText: {
    color: colors.textSecondary,
  },
  errorText: {
    color: '#991B1B',
  },
});
