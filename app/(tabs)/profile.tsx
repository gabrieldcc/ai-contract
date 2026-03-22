import { AppHeader } from '@/components/AppHeader';
import { ScreenContainer } from '@/components/ScreenContainer';
import { StateBanner } from '@/components/StateBanner';
import { APP_TEXTS } from '@/constants/texts';
import { authService } from '@/services/authService';
import { AppUser } from '@/types/contract';
import { colors, radius, spacing, typography } from '@/constants/theme';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function ProfileScreen() {
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    authService.getCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);

  return (
    <ScreenContainer>
      <AppHeader
        title={APP_TEXTS.profileTitle}
        subtitle="Espaço preparado para preferências, integrações e dados da conta."
      />

      <View style={styles.card}>
        <Text style={styles.label}>Usuário</Text>
        <Text style={styles.value}>{user?.name ?? 'Convidado'}</Text>
        <Text style={styles.valueSecondary}>{user?.email ?? 'Sem e-mail'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Próximas integrações</Text>
        <Text style={styles.valueSecondary}>• Autenticação Firebase</Text>
        <Text style={styles.valueSecondary}>• Preferências de análise por perfil</Text>
        <Text style={styles.valueSecondary}>• Notificações de status de processamento</Text>
      </View>

      <StateBanner message="Tela mockada para evolução futura sem dependências externas." />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  value: {
    color: colors.textPrimary,
    fontSize: typography.subtitle,
    fontWeight: '700',
  },
  valueSecondary: {
    color: colors.textSecondary,
    fontSize: typography.body,
  },
});
