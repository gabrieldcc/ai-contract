import { ActionButton } from '@/components/ActionButton';
import { AnalysisSection } from '@/components/AnalysisSection';
import { AppHeader } from '@/components/AppHeader';
import { ScreenContainer } from '@/components/ScreenContainer';
import { StateBanner } from '@/components/StateBanner';
import { APP_TEXTS } from '@/constants/texts';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useContractFlow } from '@/hooks/useContractFlow';
import { formatDateTime } from '@/utils/format';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function ResultScreen() {
  const router = useRouter();
  const { currentAnalysis, resetForNewAnalysis } = useContractFlow();

  const handleNewAnalysis = () => {
    resetForNewAnalysis();
    router.replace('/');
  };

  if (!currentAnalysis) {
    return (
      <ScreenContainer>
        <AppHeader title="Resultado da análise" subtitle="Nenhuma análise carregada no momento." />
        <StateBanner message="Faça a análise de um contrato na tela inicial para ver os detalhes." />
        <ActionButton label="Voltar ao início" onPress={() => router.replace('/')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.fileCard}>
        <Text style={styles.fileTitle}>Arquivo analisado</Text>
        <Text style={styles.fileName}>{currentAnalysis.fileName}</Text>
        <Text style={styles.fileDate}>Gerado em {formatDateTime(currentAnalysis.createdAt)}</Text>
      </View>

      <AnalysisSection title="Resumo do contrato" description={currentAnalysis.summary} accent="primary" />
      <AnalysisSection title="Pontos importantes" items={currentAnalysis.importantPoints} accent="success" />
      <AnalysisSection title="Pontos de atenção" items={currentAnalysis.attentionPoints} accent="warning" />
      <AnalysisSection title="Possíveis riscos" items={currentAnalysis.risks} accent="warning" />
      <AnalysisSection title="Recomendações" items={currentAnalysis.recommendations} accent="primary" />

      <ActionButton label="Voltar" onPress={() => router.back()} variant="secondary" />
      <ActionButton label={APP_TEXTS.newAnalysisCta} onPress={handleNewAnalysis} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  fileCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  fileTitle: {
    fontSize: typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.textSecondary,
    letterSpacing: 0.4,
  },
  fileName: {
    fontSize: typography.subtitle,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  fileDate: {
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
});
