import { AppHeader } from '@/components/AppHeader';
import { HistoryCard } from '@/components/HistoryCard';
import { ScreenContainer } from '@/components/ScreenContainer';
import { StateBanner } from '@/components/StateBanner';
import { APP_TEXTS } from '@/constants/texts';
import { useContractFlow } from '@/hooks/useContractFlow';
import { useRouter } from 'expo-router';
import React from 'react';

export default function HistoryScreen() {
  const router = useRouter();
  const { history, openHistoryAnalysis, isAnalyzing, error } = useContractFlow();

  const handleOpen = async (id: string) => {
    const success = await openHistoryAnalysis(id);
    if (success) {
      router.push('/result');
    }
  };

  return (
    <ScreenContainer>
      <AppHeader title={APP_TEXTS.historyTitle} subtitle="Acompanhe análises anteriores de forma rápida." />

      {isAnalyzing ? <StateBanner message="Carregando análise..." /> : null}
      {error ? <StateBanner message={error} tone="error" /> : null}

      {history.length === 0 ? (
        <StateBanner message="Nenhuma análise no histórico." />
      ) : (
        history.map((item) => (
          <HistoryCard key={item.id} item={item} onOpen={() => handleOpen(item.id)} />
        ))
      )}
    </ScreenContainer>
  );
}
