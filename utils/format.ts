export function formatDateTime(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function formatBytesLabel(value: string): string {
  return value;
}
