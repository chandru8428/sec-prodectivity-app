import { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { FileUp, LoaderCircle, Save, Sparkles, UploadCloud } from 'lucide-react';

import StepPill from './components/StepPill';
import SubjectCard from './components/SubjectCard';
import ThemeToggle from './components/ThemeToggle';
import {
  fetchSampleData,
  fetchSavedTimetables,
  optimizeTimetable,
  parseRawText,
  saveTimetable,
} from './lib/api';

const STEP_TITLES = ['Input', 'AI Analysis', 'Subject Selection', 'Preferences', 'Timetable'];
const LEAVE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'None'];
const TIME_SLOTS = ['8–10', '10–12', '1–3', '3–5'];

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('aitb-theme') || 'dark');
  const [rawText, setRawText] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectCodes, setSelectedSubjectCodes] = useState([]);
  const [preferences, setPreferences] = useState({
    preferredStaff: {},
    leaveDay: 'None',
    avoidTimeSlots: [],
    preferredSlots: {},
  });
  const [result, setResult] = useState(null);
  const [savedTimetables, setSavedTimetables] = useState([]);
  const [activeStep, setActiveStep] = useState(1);
  const [loading, setLoading] = useState({ parsing: false, optimizing: false, saving: false, sample: false });
  const [error, setError] = useState('');
  const resultsRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('aitb-theme', theme);
  }, [theme]);

  useEffect(() => {
    fetchSavedTimetables().then(setSavedTimetables).catch(() => {});
  }, []);

  const selectedSubjects = useMemo(
    () => subjects.filter((subject) => selectedSubjectCodes.includes(subject.code)),
    [subjects, selectedSubjectCodes]
  );

  const handlePdfUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await extractPdfText(file);
      setRawText(text);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAnalyze = async () => {
    if (!rawText.trim()) {
      setError('Paste timetable text or upload a PDF first.');
      return;
    }
    setLoading((current) => ({ ...current, parsing: true }));
    setError('');
    setResult(null);
    try {
      const parsed = await parseRawText(rawText);
      setSubjects(parsed.subjects || []);
      setSelectedSubjectCodes([]);
      setPreferences({
        preferredStaff: {},
        leaveDay: 'None',
        avoidTimeSlots: [],
        preferredSlots: {},
      });
      setActiveStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((current) => ({ ...current, parsing: false }));
    }
  };

  const loadSample = async () => {
    setLoading((current) => ({ ...current, sample: true }));
    setError('');
    try {
      const sample = await fetchSampleData();
      setRawText(sample.raw_text);
      setSubjects(sample.parsed.subjects || []);
      setSelectedSubjectCodes([]);
      setPreferences({
        preferredStaff: {},
        leaveDay: 'None',
        avoidTimeSlots: [],
        preferredSlots: {},
      });
      setResult(null);
      setActiveStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((current) => ({ ...current, sample: false }));
    }
  };

  const toggleSubjectSelection = (code) => {
    setSelectedSubjectCodes((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code]
    );
    setActiveStep(3);
  };

  const updatePreferredStaff = (code, value) => {
    setPreferences((current) => ({
      ...current,
      preferredStaff: {
        ...current.preferredStaff,
        [code]: value,
      },
    }));
  };

  const updatePreferredSlot = (code, value) => {
    setPreferences((current) => ({
      ...current,
      preferredSlots: {
        ...current.preferredSlots,
        [code]: value,
      },
    }));
  };

  const toggleAvoidSlot = (slot) => {
    setPreferences((current) => ({
      ...current,
      avoidTimeSlots: current.avoidTimeSlots.includes(slot)
        ? current.avoidTimeSlots.filter((item) => item !== slot)
        : [...current.avoidTimeSlots, slot],
    }));
  };

  const generateTimetable = async () => {
    if (!selectedSubjectCodes.length) {
      setError('Select at least one subject before generating the timetable.');
      return;
    }
    setLoading((current) => ({ ...current, optimizing: true }));
    setError('');
    try {
      const optimized = await optimizeTimetable({
        subjects,
        selected_subject_codes: selectedSubjectCodes,
        preferences: {
          preferred_staff: preferences.preferredStaff,
          leave_day: preferences.leaveDay,
          avoid_time_slots: preferences.avoidTimeSlots,
          preferred_slots: preferences.preferredSlots,
        },
      });
      setResult(optimized);
      setActiveStep(5);
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((current) => ({ ...current, optimizing: false }));
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setLoading((current) => ({ ...current, saving: true }));
    try {
      const saved = await saveTimetable({
        title: 'AI Timetable Builder Result',
        raw_input: rawText,
        selected_slots: result.selected_slots,
        weekly_timetable: result.weekly_timetable,
        summary: result.summary,
        constraints: {
          selected_subject_codes: selectedSubjectCodes,
          preferences,
        },
      });
      setSavedTimetables((current) => [saved, ...current]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((current) => ({ ...current, saving: false }));
    }
  };

  const exportPdf = async () => {
    if (!resultsRef.current) return;
    const canvas = await html2canvas(resultsRef.current, {
      backgroundColor: null,
      scale: 2,
    });
    const image = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 190;
    const pageHeight = (canvas.height * pageWidth) / canvas.width;
    pdf.addImage(image, 'PNG', 10, 10, pageWidth, pageHeight);
    pdf.save('ai-timetable-builder.pdf');
  };

  return (
    <div className={`${theme === 'light' ? 'light' : ''}`}>
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-5 rounded-[32px] glass-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-sky-200">
              AI Timetable Builder
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl gradient-text">Build the cleanest weekly timetable from messy input</h1>
            <p className="mt-3 max-w-3xl text-sm text-[var(--muted)] sm:text-base">
              Paste raw text or upload a PDF, let AI extract subjects and slot options, then optimize your week around staff preferences, leave day, avoided times, and preferred slots.
            </p>
          </div>
          <ThemeToggle theme={theme} onToggle={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))} />
        </header>

        <section className="mb-8 flex flex-wrap gap-3">
          {STEP_TITLES.map((title, index) => (
            <StepPill
              key={title}
              index={index + 1}
              title={title}
              active={activeStep === index + 1}
              completed={activeStep > index + 1}
            />
          ))}
        </section>

        {error ? (
          <div className="mb-6 rounded-3xl border border-rose-300/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className="glass-card fade-up rounded-[32px] p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200">Step 1</p>
                  <h2 className="mt-2 text-2xl font-bold">Input raw timetable</h2>
                </div>
                <button
                  type="button"
                  onClick={loadSample}
                  disabled={loading.sample}
                  className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                >
                  {loading.sample ? 'Loading sample...' : 'Use sample data'}
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <textarea
                  value={rawText}
                  onChange={(event) => setRawText(event.target.value)}
                  placeholder="Paste raw timetable text here..."
                  className="min-h-[260px] rounded-[28px] border border-white/10 bg-slate-950/30 p-5 text-sm outline-none transition focus:border-sky-300/50"
                />
                <div className="flex flex-col gap-4">
                  <label className="glass-card-strong flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-white/15 p-6 text-center transition hover:border-sky-300/50">
                    <UploadCloud className="mb-4" size={34} />
                    <div className="text-lg font-semibold">Upload timetable PDF</div>
                    <div className="mt-2 text-sm text-[var(--muted)]">We extract the text client-side, then send it for AI parsing.</div>
                    <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
                  </label>

                  <button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={loading.parsing}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading.parsing ? <LoaderCircle className="animate-spin" size={18} /> : <Sparkles size={18} />}
                    {loading.parsing ? 'Analyzing with AI...' : 'Analyze timetable'}
                  </button>
                </div>
              </div>
            </section>

            <section className="glass-card fade-up rounded-[32px] p-6">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200">Step 2 + 3</p>
                <h2 className="mt-2 text-2xl font-bold">AI analysis and subject selection</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Extracted subjects appear as clickable cards. Select only the ones you want in the optimized timetable.
                </p>
              </div>

              {subjects.length ? (
                <>
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-white/8 px-4 py-2 text-sm text-slate-100">
                      {subjects.length} subjects detected
                    </span>
                    <span className="rounded-full bg-emerald-500/12 px-4 py-2 text-sm text-emerald-200">
                      {selectedSubjectCodes.length} selected
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSubjectCodes(subjects.map((subject) => subject.code))}
                      className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSubjectCodes([])}
                      className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {subjects.map((subject) => (
                      <SubjectCard
                        key={subject.code}
                        subject={subject}
                        selected={selectedSubjectCodes.includes(subject.code)}
                        onToggle={toggleSubjectSelection}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-[28px] border border-dashed border-white/10 px-6 py-10 text-center text-sm text-[var(--muted)]">
                  AI analysis output will appear here after parsing the timetable.
                </div>
              )}
            </section>

            <section className="glass-card fade-up rounded-[32px] p-6">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200">Step 4</p>
                <h2 className="mt-2 text-2xl font-bold">Set preferences</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="mb-3 text-lg font-semibold">Leave day selection</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {LEAVE_DAYS.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setPreferences((current) => ({ ...current, leaveDay: day }))}
                        className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                          preferences.leaveDay === day
                            ? 'border-sky-300/70 bg-sky-400/15 text-sky-100'
                            : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-lg font-semibold">Avoid time slots</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {TIME_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => toggleAvoidSlot(slot)}
                        className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                          preferences.avoidTimeSlots.includes(slot)
                            ? 'border-rose-300/70 bg-rose-500/15 text-rose-100'
                            : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedSubjects.length ? selectedSubjects.map((subject) => (
                    <div key={subject.code} className="glass-card-strong rounded-[24px] p-5">
                      <div className="mb-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-200">{subject.code}</div>
                        <div className="mt-2 text-lg font-semibold">{subject.name}</div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-200">Preferred staff</label>
                          <input
                            value={preferences.preferredStaff[subject.code] || ''}
                            onChange={(event) => updatePreferredStaff(subject.code, event.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm outline-none focus:border-sky-300/50"
                            placeholder="Optional preferred staff"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-200">Preferred slot</label>
                          <select
                            value={preferences.preferredSlots[subject.code] || ''}
                            onChange={(event) => updatePreferredSlot(subject.code, event.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm outline-none focus:border-sky-300/50"
                          >
                            <option value="">Any slot</option>
                            {subject.slots.map((slot) => (
                              <option key={`${subject.code}-${slot.slot}`} value={slot.slot}>
                                {slot.slot} ({slot.staff})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-[28px] border border-dashed border-white/10 px-6 py-10 text-center text-sm text-[var(--muted)]">
                      Select subjects to unlock per-subject staff and slot preferences.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={generateTimetable}
                  disabled={loading.optimizing || !selectedSubjectCodes.length}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading.optimizing ? <LoaderCircle className="animate-spin" size={18} /> : <Sparkles size={18} />}
                  {loading.optimizing ? 'Generating timetable...' : 'Generate optimized timetable'}
                </button>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section ref={resultsRef} className="glass-card fade-up rounded-[32px] p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200">Step 5</p>
                  <h2 className="mt-2 text-2xl font-bold">Final output</h2>
                </div>
                {result ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={loading.saving}
                      className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Save size={16} />
                        {loading.saving ? 'Saving...' : 'Save'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={exportPdf}
                      className="rounded-full bg-sky-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:translate-y-[-1px]"
                    >
                      <span className="inline-flex items-center gap-2">
                        <FileUp size={16} />
                        Export PDF
                      </span>
                    </button>
                  </div>
                ) : null}
              </div>

              {result ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="mb-3 text-lg font-bold">✅ FINAL SELECTED SLOTS</h3>
                    <div className="space-y-2 rounded-[24px] bg-white/5 p-4">
                      {result.selected_slots.map((item) => (
                        <div key={`${item.subject_code}-${item.slot_name}`} className="text-sm leading-7 text-slate-100">
                          <span className="font-semibold">{item.subject_name} ({item.subject_code})</span> → {item.slot_name} ({item.staff})
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-lg font-bold">📅 WEEKLY TIMETABLE</h3>
                    <div className="overflow-hidden rounded-[24px] border border-white/10">
                      <table className="w-full border-collapse text-sm">
                        <thead className="bg-white/8 text-left">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Day</th>
                            {TIME_SLOTS.map((slot) => (
                              <th key={slot} className="px-4 py-3 font-semibold">{slot}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(result.weekly_timetable).map(([day, slots]) => (
                            <tr key={day} className="border-t border-white/8">
                              <td className="px-4 py-3 font-semibold">{day}</td>
                              {TIME_SLOTS.map((slot) => {
                                const value = slots[slot];
                                const leaveCell = value === '❌ LEAVE';
                                return (
                                  <td
                                    key={`${day}-${slot}`}
                                    className={`slot-cell px-4 py-3 align-top ${
                                      leaveCell ? 'bg-rose-500/10 text-rose-200' : 'bg-transparent'
                                    }`}
                                  >
                                    {value || '—'}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-lg font-bold">🎯 SUMMARY</h3>
                    <div className="space-y-3 rounded-[24px] bg-white/5 p-4 text-sm text-slate-100">
                      <div><span className="font-semibold">Leave day status:</span> {result.summary.leave_day_status}</div>
                      <div>
                        <span className="font-semibold">Any compromises:</span>{' '}
                        {result.summary.compromises.length ? result.summary.compromises.join(' • ') : 'None'}
                      </div>
                      <div><span className="font-semibold">Why this timetable is optimal:</span> {result.summary.why_optimal}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[28px] border border-dashed border-white/10 px-6 py-16 text-center text-sm text-[var(--muted)]">
                  Generate the timetable to see final selected slots, the weekly grid, and the optimization summary.
                </div>
              )}
            </section>

            <section className="glass-card rounded-[32px] p-6">
              <h3 className="text-xl font-bold">Saved timetables</h3>
              <div className="mt-4 space-y-3">
                {savedTimetables.length ? savedTimetables.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-white/5 px-4 py-3">
                    <div className="font-semibold">{item.title}</div>
                    <div className="mt-1 text-xs text-[var(--muted)]">{new Date(item.created_at).toLocaleString()}</div>
                  </div>
                )) : (
                  <div className="text-sm text-[var(--muted)]">No saved timetables yet.</div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

async function extractPdfText(file) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let text = '';

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(' ') + '\n';
  }

  if (!text.trim()) {
    throw new Error('No extractable text found in the uploaded PDF.');
  }
  return text;
}
