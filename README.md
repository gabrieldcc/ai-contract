# AI Contract Lens (UI Mock)

Aplicativo mobile em React Native com Expo + TypeScript + Expo Router, focado na **primeira fase (UI mockada)** de uma solução de análise de contratos com IA.

## Stack

- Expo
- React Native
- TypeScript
- Expo Router

## Estrutura

```txt
app/
  _layout.tsx
  result.tsx
  (tabs)/
    _layout.tsx
    index.tsx
    history.tsx
    profile.tsx
components/
hooks/
services/
types/
utils/
constants/
```

## Executar o projeto

```bash
npm install
npm start
```

Atalhos:

```bash
npm run android
npm run ios
npm run web
```

## Escopo desta fase

- UI completa e navegável
- Dados mockados para upload, análise e histórico
- Services placeholder para integrações futuras
- Sem Firebase real
- Sem API de IA real
- Sem parser real
- Sem upload real

## Próximas etapas sugeridas

1. Upload real de arquivo (Storage)
2. Parser de documento (PDF/DOC)
3. Integração com IA para análise estruturada
4. Persistência com Firebase (Firestore)
5. Autenticação do usuário
# ai-contract
