import { supabase } from './supabaseClient';

export interface AnalyzeMealResult {
  descricao?: string;
  itens?: Array<{
    nome: string;
    porcao: string;
    calorias: number;
    proteina: number;
    carboidrato: number;
    gordura: number;
  }>;
  confianca?: 'baixa' | 'media' | 'alta';
  erro?: string;
}

export async function analyzeMealPhoto(base64: string): Promise<AnalyzeMealResult> {
  const { data, error } = await supabase.functions.invoke('analyze-meal', {
    body: { base64 },
  });
  if (error) throw error;
  return data as AnalyzeMealResult;
}
