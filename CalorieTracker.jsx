import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Camera, Plus, X, Settings, ChevronLeft, ChevronRight, Trash2,
  Loader2, Coffee, Sun, Moon, Cookie, Check, Pencil,
} from 'lucide-react';

const COLORS = {
  bg: '#1C1A17',
  surface: '#242019',
  surfaceAlt: '#2C2721',
  border: '#3A342B',
  text: '#F3EDE1',
  textMuted: '#A99D89',
  protein: '#C9772B',
  carbs: '#8FA05C',
  fat: '#D4A93A',
  good: '#8FA05C',
  warn: '#D4A93A',
  over: '#BD5A34',
};

const MEAL_TYPES = [
  { id: 'cafe', label: 'Café da manhã', icon: Coffee },
  { id: 'almoco', label: 'Almoço', icon: Sun },
  { id: 'lanche', label: 'Lanche', icon: Cookie },
  { id: 'jantar', label: 'Jantar', icon: Moon },
];

const ANALYSIS_PROMPT = `Você é um assistente de nutrição especializado em estimar calorias e macronutrientes a partir de fotos de refeições, com boa familiaridade com pratos brasileiros.

Analise esta foto e:
1. Identifique cada alimento/item visível no prato.
2. Estime a porção de cada item (ex: "1 xícara", "150g", "2 unidades").
3. Estime calorias, proteína (g), carboidrato (g) e gordura (g) de cada item, com base em referências nutricionais comuns.
4. Indique seu nível de confiança na estimativa geral: "baixa", "media" ou "alta".

Responda SOMENTE com um JSON válido, sem markdown, sem texto antes ou depois, exatamente neste formato:
{"descricao": "resumo curto da refeição em poucas palavras", "itens": [{"nome": "nome do alimento", "porcao": "porção estimada", "calorias": numero, "proteina": numero, "carboidrato": numero, "gordura": numero}], "confianca": "baixa"}

Se a imagem não mostrar comida de forma clara, responda apenas: {"erro": "descreva em uma frase curta o que impediu a análise"}`;

function dateKeyFor(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(date) {
  const today = new Date();
  if (dateKeyFor(date) === dateKeyFor(today)) return 'Hoje';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (dateKeyFor(date) === dateKeyFor(yesterday)) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
}

function emptyItem() {
  return { nome: '', porcao: '', calorias: 0, proteina: 0, carboidrato: 0, gordura: 0 };
}

function sumItems(items) {
  return items.reduce(
    (acc, it) => ({
      calories: acc.calories + (Number(it.calorias) || 0),
      protein: acc.protein + (Number(it.proteina) || 0),
      carbs: acc.carbs + (Number(it.carboidrato) || 0),
      fat: acc.fat + (Number(it.gordura) || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

function generateTips(totals, targets) {
  if (totals.calories === 0) {
    return ['Nenhuma refeição registrada ainda hoje. Bora começar pelo café da manhã?'];
  }
  const tips = [];
  const calPct = targets.calories ? totals.calories / targets.calories : 0;
  const protPct = targets.protein ? totals.protein / targets.protein : 0;

  if (protPct < 0.6) {
    tips.push(
      `Proteína ainda baixa (${Math.round(totals.protein)}g de ${targets.protein}g). Bom momento pra incluir ovos, frango, iogurte grego ou whey na próxima refeição.`
    );
  } else if (protPct >= 1) {
    tips.push(`Meta de proteína batida (${Math.round(totals.protein)}g) — ótimo suporte pro ganho de massa.`);
  }

  if (calPct > 1.1) {
    tips.push(
      `Calorias um pouco acima da meta hoje (${Math.round(totals.calories - targets.calories)} kcal a mais). Sem problema — o que importa é a média da semana, não um dia isolado.`
    );
  } else if (calPct < 0.7) {
    tips.push(
      `Ainda restam ${Math.round(targets.calories - totals.calories)} kcal hoje. Se bateu fome, é sinal pra comer — não pra pular refeição.`
    );
  }

  if (tips.length === 0) {
    tips.push('Bom equilíbrio entre calorias e macros hoje. Segue assim.');
  }
  return tips.slice(0, 3);
}

function resizeImageToBase64(file, maxDim = 1024) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          } else {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64 = dataUrl.split(',')[1];
        resolve({ base64, dataUrl });
      };
      img.onerror = () => reject(new Error('Não foi possível carregar a imagem.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

async function analyzeMealPhoto(base64) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: ANALYSIS_PROMPT },
          ],
        },
      ],
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error((data && data.error && data.error.message) || 'Erro ao chamar a análise.');
  }
  const textBlock = (data.content || []).find((b) => b.type === 'text');
  if (!textBlock) throw new Error('Resposta sem conteúdo de texto.');
  let clean = textBlock.text.trim();
  clean = clean.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  return JSON.parse(clean);
}

export default function CalorieTracker() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dayData, setDayData] = useState({ meals: [] });
  const [targets, setTargets] = useState({ calories: 2000, protein: 150, carbs: 200, fat: 65 });
  const [loadingDay, setLoadingDay] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [storageError, setStorageError] = useState(false);

  const dateKey = useMemo(() => dateKeyFor(currentDate), [currentDate]);
  const isToday = dateKey === dateKeyFor(new Date());

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get('settings:targets');
        if (r && r.value) setTargets(JSON.parse(r.value));
      } catch (e) {
        // sem metas salvas ainda — mantém padrão
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingDay(true);
      try {
        const r = await window.storage.get(`day:${dateKey}`);
        if (!cancelled) setDayData(r && r.value ? JSON.parse(r.value) : { meals: [] });
      } catch (e) {
        if (!cancelled) setDayData({ meals: [] });
      }
      if (!cancelled) setLoadingDay(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  async function persistDay(newData) {
    setDayData(newData);
    try {
      const ok = await window.storage.set(`day:${dateKey}`, JSON.stringify(newData));
      if (!ok) setStorageError(true);
    } catch (e) {
      setStorageError(true);
    }
  }

  async function persistTargets(newTargets) {
    setTargets(newTargets);
    try {
      await window.storage.set('settings:targets', JSON.stringify(newTargets));
    } catch (e) {
      setStorageError(true);
    }
    setShowSettings(false);
  }

  function handleSaveMeal(meal) {
    const meals = [...dayData.meals];
    if (meal.id) {
      const idx = meals.findIndex((m) => m.id === meal.id);
      if (idx >= 0) meals[idx] = meal;
      else meals.push({ ...meal, id: Date.now().toString() });
    } else {
      meals.push({ ...meal, id: Date.now().toString() });
    }
    meals.sort((a, b) => a.time.localeCompare(b.time));
    persistDay({ meals });
    setShowAddModal(false);
    setEditingMeal(null);
  }

  function handleDeleteMeal(id) {
    const meals = dayData.meals.filter((m) => m.id !== id);
    persistDay({ meals });
    setShowAddModal(false);
    setEditingMeal(null);
  }

  const totals = useMemo(() => {
    return dayData.meals.reduce(
      (acc, m) => ({
        calories: acc.calories + (Number(m.calories) || 0),
        protein: acc.protein + (Number(m.protein) || 0),
        carbs: acc.carbs + (Number(m.carbs) || 0),
        fat: acc.fat + (Number(m.fat) || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [dayData]);

  const tips = useMemo(() => generateTips(totals, targets), [totals, targets]);

  function goPrevDay() {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  }
  function goNextDay() {
    if (isToday) return;
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  }

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ background: COLORS.bg }}>
      <div className="w-full max-w-md px-4 pt-6 pb-28">
        <div className="flex items-center justify-between mb-6">
          <button onClick={goPrevDay} className="p-2 rounded-full active:opacity-60" aria-label="Dia anterior">
            <ChevronLeft size={20} style={{ color: COLORS.textMuted }} />
          </button>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-widest" style={{ color: COLORS.textMuted }}>
              Registro diário
            </div>
            <div className="text-lg font-semibold capitalize" style={{ color: COLORS.text }}>
              {formatDisplayDate(currentDate)}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={goNextDay}
              className="p-2 rounded-full active:opacity-60"
              style={{ opacity: isToday ? 0.3 : 1 }}
              aria-label="Próximo dia"
            >
              <ChevronRight size={20} style={{ color: COLORS.textMuted }} />
            </button>
            <button onClick={() => setShowSettings(true)} className="p-2 rounded-full active:opacity-60" aria-label="Configurações">
              <Settings size={20} style={{ color: COLORS.textMuted }} />
            </button>
          </div>
        </div>

        <GaugeBar consumed={totals.calories} target={targets.calories} />

        <div className="grid grid-cols-3 gap-2 mb-6">
          <MacroPill label="Proteína" consumed={totals.protein} target={targets.protein} color={COLORS.protein} />
          <MacroPill label="Carboidrato" consumed={totals.carbs} target={targets.carbs} color={COLORS.carbs} />
          <MacroPill label="Gordura" consumed={totals.fat} target={targets.fat} color={COLORS.fat} />
        </div>

        {!loadingDay && dayData.meals.length > 0 && <TipsCard tips={tips} />}

        <div className="text-xs uppercase tracking-widest mb-3" style={{ color: COLORS.textMuted }}>
          Refeições {isToday ? 'de hoje' : 'do dia'}
        </div>

        {loadingDay && (
          <div className="text-sm py-8 text-center" style={{ color: COLORS.textMuted }}>
            Carregando...
          </div>
        )}

        {!loadingDay && dayData.meals.length === 0 && (
          <div className="rounded-lg p-6 text-center mb-4" style={{ background: COLORS.surface, border: `1px dashed ${COLORS.border}` }}>
            <p className="text-sm" style={{ color: COLORS.textMuted }}>
              Nenhuma refeição registrada {isToday ? 'ainda hoje' : 'neste dia'}.
            </p>
          </div>
        )}

        {!loadingDay &&
          dayData.meals.map((meal, i) => (
            <MealTicket
              key={meal.id}
              meal={meal}
              index={i}
              onEdit={(m) => {
                setEditingMeal(m);
                setShowAddModal(true);
              }}
              onDelete={handleDeleteMeal}
            />
          ))}

        {storageError && (
          <p className="text-xs text-center mt-2" style={{ color: COLORS.over }}>
            Alguns dados podem não ter sido salvos. Tente novamente.
          </p>
        )}
      </div>

      {isToday && (
        <button
          onClick={() => {
            setEditingMeal(null);
            setShowAddModal(true);
          }}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: COLORS.protein }}
          aria-label="Adicionar refeição"
        >
          <Plus size={26} style={{ color: COLORS.bg }} />
        </button>
      )}

      {showAddModal && (
        <AddMealModal
          initialMeal={editingMeal}
          onClose={() => {
            setShowAddModal(false);
            setEditingMeal(null);
          }}
          onSave={handleSaveMeal}
          onDelete={handleDeleteMeal}
        />
      )}

      {showSettings && <SettingsModal targets={targets} onClose={() => setShowSettings(false)} onSave={persistTargets} />}
    </div>
  );
}

function GaugeBar({ consumed, target }) {
  const pct = target > 0 ? (consumed / target) * 100 : 0;
  const clamped = Math.min(pct, 100);
  const over = consumed > target;
  const remaining = target - consumed;
  const barColor = pct > 110 ? COLORS.over : pct > 100 ? COLORS.warn : COLORS.good;
  return (
    <div className="mb-6">
      <div className="flex items-end justify-between mb-2">
        <div>
          <div className="font-mono text-3xl font-semibold" style={{ color: COLORS.text }}>
            {Math.abs(Math.round(remaining))}
          </div>
          <div className="text-xs" style={{ color: COLORS.textMuted }}>
            {over ? 'kcal acima da meta' : 'kcal restantes hoje'}
          </div>
        </div>
        <div className="text-right font-mono text-sm" style={{ color: COLORS.textMuted }}>
          {Math.round(consumed)} / {target} kcal
        </div>
      </div>
      <div className="relative h-3 rounded-full overflow-hidden" style={{ background: COLORS.surfaceAlt }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${clamped}%`, background: barColor }} />
        {[25, 50, 75].map((t) => (
          <div key={t} className="absolute top-0 bottom-0 w-px" style={{ left: `${t}%`, background: COLORS.bg, opacity: 0.5 }} />
        ))}
      </div>
    </div>
  );
}

function MacroPill({ label, consumed, target, color }) {
  const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  return (
    <div className="rounded-xl p-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
      <div className="text-[11px] mb-1" style={{ color: COLORS.textMuted }}>
        {label}
      </div>
      <div className="font-mono text-sm mb-2" style={{ color: COLORS.text }}>
        {Math.round(consumed)}
        <span style={{ color: COLORS.textMuted }}>/{target}g</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: COLORS.surfaceAlt }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function MealTicket({ meal, index, onEdit, onDelete }) {
  const mealTypeInfo = MEAL_TYPES.find((m) => m.id === meal.mealType) || MEAL_TYPES[0];
  const Icon = mealTypeInfo.icon;
  const rotate = index % 2 === 0 ? -0.5 : 0.5;
  return (
    <div
      className="rounded-lg mb-3 overflow-hidden"
      style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, transform: `rotate(${rotate}deg)` }}
    >
      <div className="flex items-center justify-between px-3 pt-3">
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color: COLORS.textMuted }} />
          <span className="text-[11px] uppercase tracking-wide" style={{ color: COLORS.textMuted }}>
            {mealTypeInfo.label}
          </span>
          <span className="text-[11px] font-mono" style={{ color: COLORS.textMuted }}>
            {meal.time}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(meal)} className="p-1.5 active:opacity-60" aria-label="Editar">
            <Pencil size={13} style={{ color: COLORS.textMuted }} />
          </button>
          <button onClick={() => onDelete(meal.id)} className="p-1.5 active:opacity-60" aria-label="Excluir">
            <Trash2 size={13} style={{ color: COLORS.textMuted }} />
          </button>
        </div>
      </div>
      <div className="px-3 pt-1 pb-2 text-sm" style={{ color: COLORS.text }}>
        {meal.description || 'Refeição registrada'}
      </div>
      <div className="flex justify-between px-1" aria-hidden="true">
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i} className="w-1 h-1 rounded-full" style={{ background: COLORS.bg }} />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-px px-3 py-2 font-mono text-[11px]" style={{ color: COLORS.textMuted }}>
        <div>
          <div style={{ color: COLORS.text }}>{Math.round(meal.calories)}</div>kcal
        </div>
        <div>
          <div style={{ color: COLORS.protein }}>{Math.round(meal.protein)}g</div>prot
        </div>
        <div>
          <div style={{ color: COLORS.carbs }}>{Math.round(meal.carbs)}g</div>carb
        </div>
        <div>
          <div style={{ color: COLORS.fat }}>{Math.round(meal.fat)}g</div>gord
        </div>
      </div>
    </div>
  );
}

function TipsCard({ tips }) {
  return (
    <div
      className="rounded-lg p-4 mb-6"
      style={{ background: COLORS.surfaceAlt, borderLeft: `3px solid ${COLORS.warn}`, transform: 'rotate(-0.4deg)' }}
    >
      <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: COLORS.textMuted }}>
        Notas do dia
      </div>
      <ul className="space-y-2">
        {tips.map((t, i) => (
          <li key={i} className="text-sm leading-snug" style={{ color: COLORS.text }}>
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AddMealModal({ initialMeal, onClose, onSave, onDelete }) {
  const isEditing = !!initialMeal;
  const [mealType, setMealType] = useState(initialMeal?.mealType || 'cafe');
  const [time, setTime] = useState(initialMeal?.time || new Date().toTimeString().slice(0, 5));
  const [description, setDescription] = useState(initialMeal?.description || '');
  const [items, setItems] = useState(initialMeal?.items || []);
  const [stage, setStage] = useState(isEditing ? 'review' : 'capture');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisNote, setAnalysisNote] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);

  const totals = useMemo(() => sumItems(items), [items]);

  async function handleFileChange(e) {
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
      setAnalysisNote('Não consegui analisar a foto agora. Confira sua conexão ou preencha manualmente.');
      setItems([emptyItem()]);
    }
    setAnalyzing(false);
    setStage('review');
  }

  function startManual() {
    setItems([emptyItem()]);
    setStage('review');
  }

  function updateItem(idx, field, value) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  function removeItem(idx) {
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
          <button onClick={onClose} className="p-1.5 active:opacity-60">
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
                capture="environment"
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
                Analisando a foto...
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
                      {[
                        { field: 'calorias', label: 'kcal', color: COLORS.text },
                        { field: 'proteina', label: 'prot g', color: COLORS.protein },
                        { field: 'carboidrato', label: 'carb g', color: COLORS.carbs },
                        { field: 'gordura', label: 'gord g', color: COLORS.fat },
                      ].map((f) => (
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

              <button onClick={addItem} className="flex items-center gap-1.5 text-xs mb-4" style={{ color: COLORS.protein }}>
                <Plus size={14} /> Adicionar item
              </button>

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
                {isEditing && (
                  <button
                    onClick={() => onDelete(initialMeal.id)}
                    className="p-3 rounded-lg"
                    style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
                  >
                    <Trash2 size={16} style={{ color: COLORS.over }} />
                  </button>
                )}
                <button
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium"
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

function SettingsModal({ targets, onClose, onSave }) {
  const [calories, setCalories] = useState(targets.calories);
  const [protein, setProtein] = useState(targets.protein);
  const [carbs, setCarbs] = useState(targets.carbs);
  const [fat, setFat] = useState(targets.fat);
  const [showCalc, setShowCalc] = useState(false);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('F');
  const [activity, setActivity] = useState('moderado');
  const [goal, setGoal] = useState('deficit');

  const activityFactors = { sedentario: 1.2, leve: 1.375, moderado: 1.55, intenso: 1.725 };

  function applyCalculator() {
    const w = Number(weight),
      h = Number(height),
      a = Number(age);
    if (!w || !h || !a) return;
    const bmr = sex === 'M' ? 10 * w + 6.25 * h - 5 * a + 5 : 10 * w + 6.25 * h - 5 * a - 161;
    const tdee = bmr * (activityFactors[activity] || 1.375);
    let cals = tdee;
    if (goal === 'deficit') cals = tdee - 350;
    if (goal === 'superavit') cals = tdee + 250;
    const prot = w * 2.0;
    const fatG = (cals * 0.25) / 9;
    const carbG = Math.max(0, (cals - prot * 4 - fatG * 9) / 4);
    setCalories(Math.round(cals));
    setProtein(Math.round(prot));
    setFat(Math.round(fatG));
    setCarbs(Math.round(carbG));
  }

  function handleSave() {
    onSave({
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
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
            Metas diárias
          </span>
          <button onClick={onClose} className="p-1.5 active:opacity-60">
            <X size={18} style={{ color: COLORS.textMuted }} />
          </button>
        </div>

        <div className="px-4 py-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs" style={{ color: COLORS.textMuted }}>
                Calorias (kcal)
              </label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="w-full font-mono text-sm px-2 py-2 rounded mt-1"
                style={{ background: COLORS.surface, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: COLORS.protein }}>
                Proteína (g)
              </label>
              <input
                type="number"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                className="w-full font-mono text-sm px-2 py-2 rounded mt-1"
                style={{ background: COLORS.surface, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: COLORS.carbs }}>
                Carboidrato (g)
              </label>
              <input
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                className="w-full font-mono text-sm px-2 py-2 rounded mt-1"
                style={{ background: COLORS.surface, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: COLORS.fat }}>
                Gordura (g)
              </label>
              <input
                type="number"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                className="w-full font-mono text-sm px-2 py-2 rounded mt-1"
                style={{ background: COLORS.surface, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
              />
            </div>
          </div>

          <button onClick={() => setShowCalc(!showCalc)} className="text-xs underline mb-3" style={{ color: COLORS.textMuted }}>
            {showCalc ? 'Ocultar calculadora' : 'Calcular sugestão a partir dos meus dados'}
          </button>

          {showCalc && (
            <div className="rounded-lg p-3 mb-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <input
                  type="number"
                  placeholder="Peso (kg)"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="text-sm px-2 py-1.5 rounded"
                  style={{ background: COLORS.surfaceAlt, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
                />
                <input
                  type="number"
                  placeholder="Altura (cm)"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="text-sm px-2 py-1.5 rounded"
                  style={{ background: COLORS.surfaceAlt, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
                />
                <input
                  type="number"
                  placeholder="Idade"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="text-sm px-2 py-1.5 rounded"
                  style={{ background: COLORS.surfaceAlt, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                  className="text-sm px-2 py-1.5 rounded"
                  style={{ background: COLORS.surfaceAlt, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
                >
                  <option value="F">Feminino</option>
                  <option value="M">Masculino</option>
                </select>
                <select
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  className="text-sm px-2 py-1.5 rounded"
                  style={{ background: COLORS.surfaceAlt, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
                >
                  <option value="sedentario">Sedentário</option>
                  <option value="leve">Leve (1-3x/sem)</option>
                  <option value="moderado">Moderado (3-5x/sem)</option>
                  <option value="intenso">Intenso (6-7x/sem)</option>
                </select>
              </div>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full text-sm px-2 py-1.5 rounded mb-3"
                style={{ background: COLORS.surfaceAlt, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
              >
                <option value="deficit">Déficit leve (recomposição / emagrecimento)</option>
                <option value="manutencao">Manutenção</option>
                <option value="superavit">Superávit leve (foco em massa)</option>
              </select>
              <button
                onClick={applyCalculator}
                className="w-full py-2 rounded-lg text-sm font-medium"
                style={{ background: COLORS.protein, color: COLORS.bg }}
              >
                Aplicar sugestão
              </button>
              <p className="text-[11px] mt-2 leading-snug" style={{ color: COLORS.textMuted }}>
                Estimativa geral (fórmula Mifflin-St Jeor + 2g de proteína/kg). Ajuste com base na sua resposta ao longo das semanas, ou com orientação profissional.
              </p>
            </div>
          )}

          <button
            onClick={handleSave}
            className="w-full py-3 rounded-lg text-sm font-medium mb-6"
            style={{ background: COLORS.protein, color: COLORS.bg }}
          >
            Salvar metas
          </button>
        </div>
      </div>
    </div>
  );
}
