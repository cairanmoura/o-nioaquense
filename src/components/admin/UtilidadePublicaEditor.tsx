import { useState } from 'react';

/**
 * UtilidadePublicaEditor.tsx
 * -----------------------------------------------------------------------------
 * Editor rapido da utilidade publica, pensado para o celular:
 *
 *   1. Escala da farmacia de plantao da semana (um dia por linha)
 *   2. Alerta urgente da cidade (ligar/desligar, texto e nivel)
 *   3. Tabela de horarios de onibus intermunicipais
 *
 * Tudo e' gravado por API com RBAC validado no servidor.
 */

interface Utility {
  id: string;
  duty_date: string;
  pharmacy_name: string;
  pharmacy_phone: string | null;
  pharmacy_address: string | null;
  alert_active: boolean;
  alert_message: string | null;
  alert_level: string;
}

interface BusSchedule {
  id: string;
  route_name: string;
  destination: string;
  departure_times: string[];
  frequency: string | null;
  notes: string | null;
  position: number;
  active: boolean;
}

interface Props {
  utilities: Utility[];
  week: { iso: string; label: string }[];
  busSchedules: BusSchedule[];
}

type Feedback = { tone: 'ok' | 'error'; text: string } | null;

const ALERT_LEVELS = [
  { value: 'info', label: 'Informativo (verde)' },
  { value: 'warning', label: 'Atencao (amarelo)' },
  { value: 'urgent', label: 'Urgente (vermelho)' },
];

export default function UtilidadePublicaEditor({ utilities, week, busSchedules }: Props) {
  const byDate = new Map(utilities.map((item) => [item.duty_date, item]));

  /* ----------------------- escala da farmacia ----------------------- */
  const [pharmacy, setPharmacy] = useState<Record<string, { name: string; phone: string }>>(() => {
    const initial: Record<string, { name: string; phone: string }> = {};

    for (const day of week) {
      const existing = byDate.get(day.iso);
      initial[day.iso] = {
        name: existing?.pharmacy_name ?? '',
        phone: existing?.pharmacy_phone ?? '',
      };
    }

    return initial;
  });

  const [savingWeek, setSavingWeek] = useState(false);
  const [weekFeedback, setWeekFeedback] = useState<Feedback>(null);

  async function saveWeek() {
    setSavingWeek(true);
    setWeekFeedback(null);

    try {
      const response = await fetch('/api/admin/utilities/week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week: week.map((day) => ({
            duty_date: day.iso,
            pharmacy_name: pharmacy[day.iso]?.name ?? '',
            pharmacy_phone: pharmacy[day.iso]?.phone ?? '',
          })),
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setWeekFeedback({ tone: 'error', text: data.error ?? 'Nao foi possivel salvar.' });
        return;
      }

      setWeekFeedback({ tone: 'ok', text: 'Escala da semana salva.' });
    } catch {
      setWeekFeedback({ tone: 'error', text: 'Falha de conexao. Tente novamente.' });
    } finally {
      setSavingWeek(false);
    }
  }

  /* ---------------------------- alerta ---------------------------- */
  const alertUtility = utilities.find((item) => item.alert_active) ?? utilities[0] ?? null;

  const [alertActive, setAlertActive] = useState(alertUtility?.alert_active ?? false);
  const [alertMessage, setAlertMessage] = useState(alertUtility?.alert_message ?? '');
  const [alertLevel, setAlertLevel] = useState(alertUtility?.alert_level ?? 'warning');
  const [savingAlert, setSavingAlert] = useState(false);
  const [alertFeedback, setAlertFeedback] = useState<Feedback>(null);

  async function saveAlert() {
    if (!alertUtility) return;

    setSavingAlert(true);
    setAlertFeedback(null);

    try {
      const response = await fetch(`/api/admin/utilities/${alertUtility.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_active: alertActive,
          alert_message: alertMessage,
          alert_level: alertLevel,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setAlertFeedback({ tone: 'error', text: data.error ?? 'Nao foi possivel salvar.' });
        return;
      }

      setAlertFeedback({ tone: 'ok', text: 'Alerta atualizado.' });
    } catch {
      setAlertFeedback({ tone: 'error', text: 'Falha de conexao. Tente novamente.' });
    } finally {
      setSavingAlert(false);
    }
  }

  /* --------------------------- onibus ----------------------------- */
  const [lines, setLines] = useState<BusSchedule[]>(busSchedules);
  const [times, setTimes] = useState<Record<string, string>>({});
  const [busFeedback, setBusFeedback] = useState<Feedback>(null);
  const [newLine, setNewLine] = useState({
    route_name: '',
    destination: '',
    departures: '',
    frequency: '',
  });

  const timeValue = (id: string, fallback: string[]) =>
    times[id] ?? fallback.join(', ');

  async function saveLine(line: BusSchedule) {
    setBusFeedback(null);

    const departures = timeValue(line.id, line.departure_times)
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    try {
      const response = await fetch(`/api/admin/bus-schedules/${line.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route_name: line.route_name,
          destination: line.destination,
          departure_times: departures,
          frequency: line.frequency,
          notes: line.notes,
          active: line.active,
        }),
      });

      const data = (await response.json()) as { error?: string; schedule?: BusSchedule };

      if (!response.ok) {
        setBusFeedback({ tone: 'error', text: data.error ?? 'Nao foi possivel salvar.' });
        return;
      }

      if (data.schedule) {
        setLines((current) =>
          current.map((item) => (item.id === data.schedule!.id ? data.schedule! : item)),
        );
      }

      setBusFeedback({ tone: 'ok', text: 'Horario salvo.' });
    } catch {
      setBusFeedback({ tone: 'error', text: 'Falha de conexao. Tente novamente.' });
    }
  }

  async function removeLine(id: string) {
    if (!window.confirm('Remover esta linha de onibus?')) return;

    try {
      const response = await fetch(`/api/admin/bus-schedules/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete' }),
      });

      if (!response.ok) {
        setBusFeedback({ tone: 'error', text: 'Nao foi possivel remover.' });
        return;
      }

      setLines((current) => current.filter((item) => item.id !== id));
      setBusFeedback({ tone: 'ok', text: 'Linha removida.' });
    } catch {
      setBusFeedback({ tone: 'error', text: 'Falha de conexao. Tente novamente.' });
    }
  }

  async function addLine() {
    setBusFeedback(null);

    try {
      const response = await fetch('/api/admin/bus-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route_name: newLine.route_name,
          destination: newLine.destination,
          departure_times: newLine.departures
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          frequency: newLine.frequency,
        }),
      });

      const data = (await response.json()) as { error?: string; schedule?: BusSchedule };

      if (!response.ok || !data.schedule) {
        setBusFeedback({ tone: 'error', text: data.error ?? 'Nao foi possivel cadastrar.' });
        return;
      }

      setLines((current) => [...current, data.schedule!]);
      setNewLine({ route_name: '', destination: '', departures: '', frequency: '' });
      setBusFeedback({ tone: 'ok', text: 'Linha cadastrada.' });
    } catch {
      setBusFeedback({ tone: 'error', text: 'Falha de conexao. Tente novamente.' });
    }
  }

  const inputClass =
    'w-full rounded-xl border border-line bg-editorial px-4 py-3 text-sm text-ink placeholder:text-ink-muted/60 focus:border-nioaque-green focus:outline-none';

  return (
    <div className="space-y-5">
      {/* ---------------------- ALERTA ---------------------- */}
      <section className="rounded-2xl border border-line bg-nioaque-white p-4 sm:p-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-nioaque-red">
              Alerta urgente da cidade
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              Aparece no topo do site e na barra fixa, em vermelho ou amarelo.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={alertActive}
            aria-label="Ativar alerta"
            onClick={() => setAlertActive((value) => !value)}
            className={`relative mt-1 h-7 w-12 shrink-0 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nioaque-red/40 focus-visible:ring-offset-2 ${
              alertActive ? 'bg-nioaque-red' : 'bg-line-strong'
            }`}
          >
            {/* `left-0` explícito: evita o knob nascer centralizado pelo
                `text-align:center` do <button> (estado desligado torto). */}
            <span
              className={`absolute left-0 top-1 h-5 w-5 rounded-sm bg-white shadow transition-transform ${
                alertActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </header>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
              Texto do alerta
            </span>
            <textarea
              rows={2}
              value={alertMessage}
              onChange={(event) => setAlertMessage(event.target.value)}
              placeholder="Ex.: Chuva forte a partir das 16h; a Rua das Palmeiras pode alagar."
              className={`${inputClass} mt-1.5 resize-y`}
            />
          </label>

          <label className="block">
            <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
              Nivel de urgencia
            </span>
            <select
              value={alertLevel}
              onChange={(event) => setAlertLevel(event.target.value)}
              className={`${inputClass} mt-1.5`}
            >
              {ALERT_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </label>

          {alertFeedback && (
            <p
              role="status"
              className={`rounded-xl px-4 py-2.5 text-xs font-semibold ${
                alertFeedback.tone === 'ok'
                  ? 'bg-nioaque-green-50 text-nioaque-green-dark'
                  : 'bg-nioaque-red-50 text-nioaque-red-dark'
              }`}
            >
              {alertFeedback.text}
            </p>
          )}

          <button
            type="button"
            onClick={() => void saveAlert()}
            disabled={savingAlert || !alertUtility}
            className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-nioaque-red px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-nioaque-red-dark disabled:opacity-60"
          >
            {savingAlert ? 'Salvando...' : 'Salvar alerta'}
          </button>
        </div>
      </section>

      {/* ------------------- FARMACIA DA SEMANA ------------------- */}
      <section className="rounded-2xl border border-line bg-nioaque-white p-4 sm:p-5">
        <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-nioaque-green">
          Farmacia de plantao da semana
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
          Uma linha por dia. A barra fixa do site mostra a farmacia do dia.
        </p>

        <div className="mt-4 space-y-3">
          {week.map((day) => (
            <div key={day.iso} className="rounded-xl bg-editorial p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                {day.label}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,9rem)]">
                <input
                  type="text"
                  value={pharmacy[day.iso]?.name ?? ''}
                  onChange={(event) =>
                    setPharmacy((current) => ({
                      ...current,
                      [day.iso]: { ...current[day.iso], name: event.target.value },
                    }))
                  }
                  placeholder="Nome da farmacia"
                  className={inputClass}
                />
                <input
                  type="tel"
                  value={pharmacy[day.iso]?.phone ?? ''}
                  onChange={(event) =>
                    setPharmacy((current) => ({
                      ...current,
                      [day.iso]: { ...current[day.iso], phone: event.target.value },
                    }))
                  }
                  placeholder="Telefone"
                  className={inputClass}
                />
              </div>
            </div>
          ))}
        </div>

        {weekFeedback && (
          <p
            role="status"
            className={`mt-3 rounded-xl px-4 py-2.5 text-xs font-semibold ${
              weekFeedback.tone === 'ok'
                ? 'bg-nioaque-green-50 text-nioaque-green-dark'
                : 'bg-nioaque-red-50 text-nioaque-red-dark'
            }`}
          >
            {weekFeedback.text}
          </p>
        )}

        <button
          type="button"
          onClick={() => void saveWeek()}
          disabled={savingWeek}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-sm bg-nioaque-green px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-nioaque-green-dark disabled:opacity-60"
        >
          {savingWeek ? 'Salvando...' : 'Salvar escala da semana'}
        </button>
      </section>

      {/* ------------------- ONIBUS INTERMUNICIPAL ------------------- */}
      <section className="rounded-2xl border border-line bg-nioaque-white p-4 sm:p-5">
        <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-nioaque-green">
          Horarios de onibus intermunicipais
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
          Separe os horarios por virgula: <code className="font-mono">06:30, 18:00</code>
        </p>

        <div className="mt-4 space-y-3">
          {lines.map((line) => (
            <div key={line.id} className="rounded-xl bg-editorial p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  value={line.route_name}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((item) =>
                        item.id === line.id ? { ...item, route_name: event.target.value } : item,
                      ),
                    )
                  }
                  placeholder="Linha"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={line.destination}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((item) =>
                        item.id === line.id ? { ...item, destination: event.target.value } : item,
                      ),
                    )
                  }
                  placeholder="Destino"
                  className={inputClass}
                />
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,10rem)]">
                <input
                  type="text"
                  value={timeValue(line.id, line.departure_times)}
                  onChange={(event) =>
                    setTimes((current) => ({ ...current, [line.id]: event.target.value }))
                  }
                  placeholder="06:30, 18:00"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={line.frequency ?? ''}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((item) =>
                        item.id === line.id ? { ...item, frequency: event.target.value } : item,
                      ),
                    )
                  }
                  placeholder="Diaria"
                  className={inputClass}
                />
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => void saveLine(line)}
                  className="rounded-sm bg-nioaque-green px-4 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-nioaque-green-dark"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => void removeLine(line.id)}
                  className="rounded-sm border border-line px-4 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-nioaque-red transition-colors hover:bg-nioaque-red-50"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Nova linha */}
        <div className="mt-4 rounded-xl border-2 border-dashed border-line-strong p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
            Nova linha
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={newLine.route_name}
              onChange={(event) =>
                setNewLine((current) => ({ ...current, route_name: event.target.value }))
              }
              placeholder="Linha"
              className={inputClass}
            />
            <input
              type="text"
              value={newLine.destination}
              onChange={(event) =>
                setNewLine((current) => ({ ...current, destination: event.target.value }))
              }
              placeholder="Destino"
              className={inputClass}
            />
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={newLine.departures}
              onChange={(event) =>
                setNewLine((current) => ({ ...current, departures: event.target.value }))
              }
              placeholder="06:30, 18:00"
              className={inputClass}
            />
            <input
              type="text"
              value={newLine.frequency}
              onChange={(event) =>
                setNewLine((current) => ({ ...current, frequency: event.target.value }))
              }
              placeholder="Diaria / Seg a Sex"
              className={inputClass}
            />
          </div>
          <button
            type="button"
            onClick={() => void addLine()}
            disabled={!newLine.route_name.trim() || !newLine.destination.trim()}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-sm bg-ink px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-ink/90 disabled:opacity-50"
          >
            Cadastrar linha
          </button>
        </div>

        {busFeedback && (
          <p
            role="status"
            className={`mt-3 rounded-xl px-4 py-2.5 text-xs font-semibold ${
              busFeedback.tone === 'ok'
                ? 'bg-nioaque-green-50 text-nioaque-green-dark'
                : 'bg-nioaque-red-50 text-nioaque-red-dark'
            }`}
          >
            {busFeedback.text}
          </p>
        )}
      </section>
    </div>
  );
}
