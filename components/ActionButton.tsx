import { colors, radius, spacing, typography } from '@/constants/theme';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
};

export function ActionButton({ label, onPress, variant = 'primary', loading, disabled }: Props) {
  const isSecondary = variant === 'secondary';
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={[styles.base, isSecondary ? styles.secondary : styles.primary, isDisabled ? styles.disabled : null]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary ? colors.primary : '#FFFFFF'} />
      ) : (
        <View style={styles.content}>
          <Text style={[styles.label, isSecondary ? styles.secondaryLabel : styles.primaryLabel]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  content: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
    shadowColor: colors.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  secondary: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    fontSize: typography.body,
    fontWeight: '700',
  },
  primaryLabel: {
    color: '#FFFFFF',
  },
  secondaryLabel: {
    color: colors.primary,
  },
});
