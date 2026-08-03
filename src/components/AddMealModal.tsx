import { useState, useMemo, useRef } from 'react';
import { Camera, Plus, X, Loader2, Check, Trash2, Sparkles } from 'lucide-react';
import { COLORS, MEAL_TYPES } from '../lib/constants';
import { emptyItem, sumItems } from '../lib/types';
import type { Meal, MealItem, MealType } from '../lib/types';
import { resizeImageToBase64 } from '../lib/imageUtils';
import { analyzeMealPhoto, analyzeMealText } from '../lib/analyzeMeal';

interface AddMealModalProps {
  initialMeal: Meal | null;
  onClose: () => void;
  onSave: (meal: Meal) => void;
  onDelete: (id: string) => void;
}

export function AddMealModal({ initialMeal, onClose, onSave, onDelete }: AddMealModalProps) {
  const isEditing = !!initialMeal;
  const [mealType, setMealType] = useState<MealType>(initialMeal?.mealType || 'cafe');
  const [time, setTime] = useState(initialMeal?.time || new Date().toTimeString().slice(0, 5));
  const [description, setDescription] = useState(initialMeal?.description || '');
  const [items, setItems] = useState<MealItem[]>(initialMeal?.items || []);
  const [stage, setStage] = useState<'capture' | 'review'>(isEditing ? 'review' : 'capture');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisNote, setAnalysisNote] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totals = useMemo(() => sumItems(items), [items]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setAnalyzing(true);
    setAnalysisNote(null);
    try {
      const { base64, dataUrl } = await resizeImageToBase64(file);
      setPhotoPreview(dataUrl);
      const result = await analyzeMealPhoto(base64);
      if (result.erro) {
        setAnalysisNote(`Não consegui identificar a refeição direito (${result.erro}). Ajuste os itens manualmente abaixo.`);
        setItems([emptyItem()]);
      } else {
        setDescription(result.descricao || '');
        const parsedItems = (result.itens || []).map((it) => ({
          nome: it.nome || '',
          porcao: it.porcao || '',
          calorias: Math.round(Number(it.calorias) || 0),
          proteina: Math.round(Number(it.proteina) || 0),
          carboidrato: Math.round(Number(it.carboidrato) || 0),
          gordura: Math.round(Number(it.gordura) || 0),
        }));
        setItems(parsedItems.length ? parsedItems : [emptyItem()]);
        if (result.confianca === 'baixa') {
          setAnalysisNote('Confiança baixa nessa estimativa — vale conferir os números.');
        }
      }
    } catch (err) {
      console.error('Erro ao analisar refeição:', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Não consegui analisar a foto agora. Confira sua conexão ou preencha manualmente.';
      setAnalysisNote(message);
      setItems([emptyItem()]);
    }
    setAnalyzing(false);
    setStage('review');
  }

  function startManual() {
    setItems([emptyItem()]);
    setStage('review');
  }

  async function handleRecalculate() {
    const named = items.filter((it) => it.nome.trim() !== '');
    if (!named.length) return;
    setAnalyzing(true);
    setAnalysisNote(null);
    try {
      const texto = named.map((it) => (it.porcao.trim() ? `${it.nome} (${it.porcao})` : it.nome)).join('; ');
      const result = await analyzeMealText(texto);
      if (result.erro) {
        setAnalysisNote(`Não consegui recalcular (${result.erro}). Ajuste os itens manualmente.`);
      } else {
        if (result.descricao && !description) setDescription(result.descricao);
        const parsedItems = (result.itens || []).map((it) => ({
          nome: it.nome || '',
          porcao: it.porcao || '',
          calorias: Math.round(Number(it.calorias) || 0),
          proteina: Math.round(Number(it.proteina) || 0),
          carboidrato: Math.round(Number(it.carboidrato) || 0),
          gordura: Math.round(Number(it.gordura) || 0),
        }));
        if (parsedItems.length) setItems(parsedItems);
        setAnalysisNote(
          result.confianca === 'baixa' ? 'Confiança baixa nessa estimativa — vale conferir os números.' : null
        );
      }
    } catch (err) {
      console.error('Erro ao recalcular refeição:', err);
      const message =
        err instanceof Error ? err.message : 'Não consegui recalcular agora. Confira sua conexão.';
      setAnalysisNote(message);
    }
    setAnalyzing(false);
  }

  function updateItem(idx: number, field: keyof MealItem, value: string) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function handleSave() {
    const cleanItems = items
      .filter((it) => it.nome.trim() !== '' || Number(it.calorias) > 0)
      .map((it) => ({
        nome: it.nome || 'Item',
        porcao: it.porcao || '',
        calorias: Number(it.calorias) || 0,
        proteina: Number(it.proteina) || 0,
        carboidrato: Number(it.carboidrato) || 0,
        gordura: Number(it.gordura) || 0,
      }));
    const t = sumItems(cleanItems);
    onSave({
      id: initialMeal?.id,
      mealType,
      time,
      description: description || cleanItems.map((i) => i.nome).join(', '),
      items: cleanItems,
      calories: t.calories,
      protein: t.protein,
      carbs: t.carbs,
      fat: t.fat,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative rounded-t-2xl max-h-[90vh] overflow-y-auto" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
        <div
          className="sticky top-0 flex items-center justify-between px-4 py-3"
          style={{ background: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}
        >
          <span className="text-sm font-semibold" style={{ color: COLORS.text }}>
            {isEditing ? 'Editar refeição' : 'Nova refeição'}
          </span>
          <button
            onClick={onClose}
            className="w-11 h-11 -mr-2.5 flex items-center justify-center active:opacity-60 cursor-pointer"
            aria-label="Fechar"
          >
            <X size={18} style={{ color: COLORS.textMuted }} />
          </button>
        </div>

        <div className="px-4 py-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {MEAL_TYPES.map((mt) => {
              const Icon = mt.icon;
              const active = mealType === mt.id;
              return (
                <button
                  key={mt.id}
                  onClick={() => setMealType(mt.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                  style={{
                    background: active ? COLORS.protein : COLORS.surface,
                    color: active ? COLORS.bg : COLORS.textMuted,
                    border: `1px solid ${active ? COLORS.protein : COLORS.border}`,
                  }}
                >
                  <Icon size={12} />
                  {mt.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs" style={{ color: COLORS.textMuted }}>
              Horário
            </span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="font-mono text-sm px-2 py-1 rounded"
              style={{ background: COLORS.surface, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
            />
          </div>

          {stage === 'capture' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <button
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                className="flex flex-col items-center justify-center gap-2 w-full py-8 rounded-xl"
                style={{ background: COLORS.surface, border: `1px dashed ${COLORS.border}` }}
              >
                <Camera size={28} style={{ color: COLORS.protein }} />
                <span className="text-sm" style={{ color: COLORS.text }}>
                  Tirar ou escolher foto
                </span>
                <span className="text-xs" style={{ color: COLORS.textMuted }}>
                  A análise leva alguns segundos
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button onClick={startManual} className="text-xs underline" style={{ color: COLORS.textMuted }}>
                ou preencher manualmente
              </button>
            </div>
          )}

          {analyzing && (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 size={18} className="animate-spin" style={{ color: COLORS.protein }} />
              <span className="text-sm" style={{ color: COLORS.textMuted }}>
                {stage === 'review' ? 'Calculando com IA...' : 'Analisando a foto...'}
              </span>
            </div>
          )}

          {stage === 'review' && !analyzing && (
            <div>
              {photoPreview && (
                <img src={photoPreview} alt="Prévia da refeição" className="w-full h-40 object-cover rounded-lg mb-3" />
              )}
              {analysisNote && (
                <div className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: COLORS.surfaceAlt, color: COLORS.warn }}>
                  {analysisNote}
                </div>
              )}
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição da refeição"
                className="w-full text-sm px-3 py-2 rounded-lg mb-3"
                style={{ background: COLORS.surface, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
              />

              <div className="space-y-2 mb-3">
                {items.map((it, idx) => (
                  <div key={idx} className="rounded-lg p-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={it.nome}
                        onChange={(e) => updateItem(idx, 'nome', e.target.value)}
                        placeholder="Alimento"
                        className="flex-1 text-sm px-2 py-1 rounded"
                        style={{ background: COLORS.surfaceAlt, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
                      />
                      <button onClick={() => removeItem(idx)} className="p-1 active:opacity-60">
                        <X size={14} style={{ color: COLORS.textMuted }} />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={it.porcao}
                      onChange={(e) => updateItem(idx, 'porcao', e.target.value)}
                      placeholder="Porção (ex: 150g, 1 unidade)"
                      className="w-full text-xs px-2 py-1 rounded mb-2"
                      style={{ background: COLORS.surfaceAlt, color: COLORS.textMuted, border: `1px solid ${COLORS.border}` }}
                    />
                    <div className="grid grid-cols-4 gap-2">
                      {(
                        [
                          { field: 'calorias', label: 'kcal', color: COLORS.text },
                          { field: 'proteina', label: 'prot g', color: COLORS.protein },
                          { field: 'carboidrato', label: 'carb g', color: COLORS.carbs },
                          { field: 'gordura', label: 'gord g', color: COLORS.fat },
                        ] as const
                      ).map((f) => (
                        <div key={f.field}>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={it[f.field]}
                            onChange={(e) => updateItem(idx, f.field, e.target.value)}
                            className="w-full font-mono text-sm px-1 py-1 rounded text-center"
                            style={{ background: COLORS.surfaceAlt, color: f.color, border: `1px solid ${COLORS.border}` }}
                          />
                          <div className="text-[10px] text-center mt-0.5" style={{ color: COLORS.textMuted }}>
                            {f.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mb-4">
                <button onClick={addItem} className="flex items-center gap-1.5 text-xs" style={{ color: COLORS.protein }}>
                  <Plus size={14} /> Adicionar item
                </button>
                <button
                  onClick={handleRecalculate}
                  disabled={analyzing || !items.some((it) => it.nome.trim() !== '')}
                  className="flex items-center gap-1.5 text-xs disabled:opacity-40"
                  style={{ color: COLORS.protein }}
                >
                  <Sparkles size={14} /> Recalcular com IA
                </button>
              </div>

              <div
                className="flex items-center justify-between px-3 py-2 rounded-lg mb-4 font-mono text-sm"
                style={{ background: COLORS.surfaceAlt }}
              >
                <span style={{ color: COLORS.text }}>{Math.round(totals.calories)} kcal</span>
                <span style={{ color: COLORS.protein }}>P {Math.round(totals.protein)}g</span>
                <span style={{ color: COLORS.carbs }}>C {Math.round(totals.carbs)}g</span>
                <span style={{ color: COLORS.fat }}>G {Math.round(totals.fat)}g</span>
              </div>

              <div className="flex gap-2 pb-6">
                {isEditing && initialMeal?.id && (
                  <button
                    onClick={() => onDelete(initialMeal.id!)}
                    className="p-3 rounded-lg"
                    style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
                  >
                    <Trash2 size={16} style={{ color: COLORS.over }} />
                  </button>
                )}
                <button
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium cursor-pointer active:scale-[0.98] transition-transform duration-150"
                  style={{ background: COLORS.protein, color: COLORS.bg }}
                >
                  <Check size={16} /> Salvar refeição
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
