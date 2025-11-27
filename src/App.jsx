import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Save,
  Trash2,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Thermometer,
  Sun,
  Moon,
  X,
  FileBarChart,
  Loader,
  Plus,
  Settings,
  ArrowLeft,
  User
} from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import html2pdf from 'html2pdf.js';

// *** Logo ***
import KoglerLogo from './assets/kogler_time_icon.png';

// --- KONFIGURATION & DATEN ---

const WORK_CODES = [
  { id: 1, label: "01 - Schienen, Bunse" },
  { id: 2, label: "02 - Umlenkrollen, Rollenrost" },
  { id: 3, label: "03 - TWR mechanisch" },
  { id: 4, label: "04 - Heber, Joch, Seile" },
  { id: 5, label: "05 - GGW, Fangrahmen, Geschw. Regler" },
  { id: 6, label: "06 - TWR elektrisch, Steuerung" },
  { id: 7, label: "07 - Schachttüren, Schachtverblechung" },
  { id: 8, label: "08 - E-Installation, Schachtlicht" },
  { id: 9, label: "09 - Kabine mechanisch, Türantrieb, Auskleidung" },
  { id: 10, label: "10 - Kabine elektrisch, Lichtschranken, Dachsteuerung" },
  { id: 11, label: "11 - Einstellung, Fertigstellung, TÜV-Abnahme" },
  { id: 12, label: "12 - Transport" },
  { id: 13, label: "13 - Diverses, Besprechung, Vermessung" },
  { id: 14, label: "14 - Wartung" },
  { id: 15, label: "15 - Störung" },
  { id: 16, label: "16 - Garantie" },
  { id: 17, label: "17 - Regie" },
  { id: 18, label: "18 - Materialvorbereitung" },
  { id: 19, label: "19 - Fahrzeit" },
  { id: 20, label: "20 - Diverse Zusätze, Stahlschacht" },
  { id: 21, label: "21 - Reperaturen" },
  { id: 22, label: "22 - Umbau, Sanierungen" },
  { id: 23, label: "23 - TÜV-Mängel" },
  { id: 24, label: "24 - Demontage" },
  { id: 25, label: "25 - Gerüstbau" }
];

// Österreichische Feiertage (Fixe + Bewegliche)
const getHolidays = (year) => {
  const fixed = [
    `${year}-01-01`,
    `${year}-01-06`,
    `${year}-05-01`,
    `${year}-08-15`,
    `${year}-10-26`,
    `${year}-11-01`,
    `${year}-12-08`,
    `${year}-12-25`,
    `${year}-12-26`,
  ];

  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  const easterDate = new Date(year, month - 1, day);
  const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString().split('T')[0];
  };

  return [
    ...fixed,
    addDays(easterDate, 1),
    addDays(easterDate, 39),
    addDays(easterDate, 50),
    addDays(easterDate, 60)
  ];
};

// --- HELPER FUNCTIONS ---

const formatTime = (minutes) => {
  const abs = Math.max(0, Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
};

const formatSignedTime = (minutes) => {
  const sign = minutes > 0 ? '+' : minutes < 0 ? '-' : '';
  const abs = Math.abs(Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h ${m.toString().padStart(2, '0')}m`;
};

const parseTime = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const generateTimeOptions = () => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      options.push(timeStr);
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

const getDayOfWeek = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getDay();
};

const getTargetMinutesForDate = (dateStr) => {
  const day = getDayOfWeek(dateStr);
  if (day >= 1 && day <= 4) return 510;
  if (day === 5) return 270;
  return 0;
};

const getWeekNumber = (d) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNo;
};

// Blob -> Base64 für Filesystem
const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

// --- UI BASISKOMPONENTEN ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
    {children}
  </div>
);

// --- PRINT VIEW COMPONENT ---

const PrintReport = ({ entries, monthDate, employeeName, onClose }) => {
  const [filterMode, setFilterMode] = useState('month');
  const [isGenerating, setIsGenerating] = useState(false);

  // sortiert nach Datum (alt → neu) + Startzeit
  const filteredEntries = useMemo(() => {
    let list =
      filterMode === 'month'
        ? [...entries]
        : entries.filter(e => getWeekNumber(new Date(e.date)) === Number(filterMode));

    list.sort((a, b) => {
      const da = new Date(a.date);
      const db = new Date(b.date);
      if (da.getTime() !== db.getTime()) return da - db;
      const sa = a.start || '';
      const sb = b.start || '';
      return sa.localeCompare(sb);
    });

    return list;
  }, [entries, filterMode]);

  const availableWeeks = useMemo(() => {
    const weeks = new Set(entries.map(e => getWeekNumber(new Date(e.date))));
    return Array.from(weeks).sort((a, b) => a - b);
  }, [entries]);

  const reportStats = useMemo(() => {
    let work = 0;
    let vacation = 0;
    let sick = 0;

    filteredEntries.forEach(e => {
      if (e.type === 'work') work += e.netDuration;
      if (e.type === 'vacation') vacation += e.netDuration;
      if (e.type === 'sick') sick += e.netDuration;
    });

    return { work, vacation, sick, total: work + vacation + sick };
  }, [filteredEntries]);

  const handleDownloadPdf = async () => {
    try {
      setIsGenerating(true);
      const element = document.getElementById('report-to-print');
      if (!element) {
        alert('PDF-Element nicht gefunden.');
        setIsGenerating(false);
        return;
      }

      // Zeitraum bestimmen (nur für Dateinamen / Share-Text)
      let start, end;
      if (filterMode === 'month') {
        start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      } else {
        if (filteredEntries.length > 0) {
          const d = new Date(filteredEntries[0].date);
          const day = d.getDay() || 7;
          start = new Date(d);
          start.setDate(d.getDate() - day + 1);
          end = new Date(start);
          end.setDate(start.getDate() + 6);
        } else {
          start = new Date();
          end = new Date();
        }
      }

      const fDate = (d) =>
        `${String(d.getDate()).padStart(2, '0')}_${String(d.getMonth() + 1).padStart(2, '0')}`;
      const fDay = (d) => String(d.getDate()).padStart(2, '0');

      const safeName = (employeeName || 'Mitarbeiter').trim().replace(/\s+/g, '_');
      const periodStr = `${fDate(start)}_bis_${fDay(end)}`;
      const filename = `${safeName}_Stundenzettel_${periodStr}.pdf`;

      // html2pdf-Optionen (kein TypeScript, kein ": any")
      const opt = {
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const worker = html2pdf().set(opt).from(element);

      // --- Web-Fallback ---
      if (!Capacitor.isNativePlatform()) {
        await worker.save();
        alert('PDF als Browser-Download erstellt.');
        setIsGenerating(false);
        return;
      }

      // --- Native (Android / iOS) ---
      // 1. PDF als Blob erzeugen
      const pdfBlob = await worker.output('blob');
      const base64 = await blobToBase64(pdfBlob);

      // 2. In den öffentlichen Dokumente-Ordner schreiben
      const directory = Directory.Documents;

      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory,
        encoding: Encoding.BASE64
      });

      console.log('PDF gespeichert, writeResult:', writeResult);

      // 3. Share-URI holen (wichtig: gleiches Directory wie oben!)
      let shareUrl;

      try {
        const uriResult = await Filesystem.getUri({
          path: filename,
          directory
        });

        console.log('Filesystem.getUri result:', uriResult);

        // Verschiedene Plattformen liefern evtl. uri oder path
        shareUrl = uriResult.uri || uriResult.path || writeResult.uri || writeResult.path;
      } catch (uriErr) {
        console.warn('Fehler bei Filesystem.getUri:', uriErr);
        shareUrl = writeResult.uri || writeResult.path;
      }

      if (shareUrl) {
        try {
          await Share.share({
            title: 'Stundenzettel teilen',
            text: `Stundenzettel ${periodStr}`,
            url: shareUrl,
            dialogTitle: 'PDF teilen'
          });
        } catch (shareErr) {
          console.warn('Share-Fehler (PDF):', shareErr);
          alert(
            'PDF wurde in den Dokumenten gespeichert, aber Teilen ist fehlgeschlagen.\n\n' +
              `Dateiname: ${filename}`
          );
        }
      } else {
        alert(
          'PDF wurde in den Dokumenten gespeichert,\n' +
            'aber es konnte keine Share-URL ermittelt werden.\n\n' +
            `Dateiname: ${filename}\n` +
            'Du findest die Datei im Ordner "Dokumente".'
        );
      }
    } catch (err) {
      console.error('PDF-Fehler', err);
      const msg = typeof err === 'object' ? (err?.message || JSON.stringify(err)) : String(err);
      alert('Fehler beim Erstellen/Speichern der PDF:\n' + msg);
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <div
      className="fixed inset-0 bg-slate-800 z-50 overflow-y-auto"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="sticky top-0 bg-slate-900 text-white p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg z-50">
        <div className="flex items-center gap-4 w-full">
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full">
            <X />
          </button>
          <h2 className="font-bold flex-1 text-center mr-10">Berichtsvorschau</h2>
        </div>

        <div className="flex gap-2 items-center flex-wrap justify-center w-full">
          <select
            value={filterMode}
            onChange={e => setFilterMode(e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded p-2 text-sm flex-1"
          >
            <option value="month">Gesamter Monat</option>
            {availableWeeks.map(w => (
              <option key={w} value={w}>KW {w}</option>
            ))}
          </select>

          <button
            onClick={handleDownloadPdf}
            disabled={isGenerating}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 text-sm whitespace-nowrap"
          >
            {isGenerating ? <Loader className="animate-spin" size={16} /> : <Download size={16} />}
            {isGenerating ? '...' : 'PDF'}
          </button>
        </div>
      </div>

      <div className="flex justify-center p-4">
        <div
          id="report-to-print"
          className="bg-white w-[210mm] max-w-full min-h-[297mm] mx-auto p-[15mm] shadow-2xl text-black"
        >
          <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-900">Zeiterfassung</h1>
              <p className="text-sm font-bold text-slate-500 mt-1">Kogler Aufzugsbau</p>
            </div>
            <div className="text-right">
              <p className="font-medium">Mitarbeiter: {employeeName}</p>
              <p className="text-slate-500 text-sm">
                Zeitraum: {monthDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                {filterMode !== 'month' && ` (KW ${filterMode})`}
              </p>
            </div>
          </div>

          <table className="w-full text-sm text-left mb-8">
            <thead>
              <tr className="border-b border-slate-300 text-slate-500 uppercase text-xs">
                <th className="py-2 w-24">Datum</th>
                <th className="py-2 w-24">Typ</th>
                <th className="py-2 w-32">Zeit</th>
                <th className="py-2">Projekt / Code</th>
                <th className="py-2 w-16 text-right">Std.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-50 break-inside-avoid">
                  <td className="py-2 font-medium align-top">
                    {new Date(entry.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                    <span className="text-slate-400 font-normal ml-1">
                      {new Date(entry.date).toLocaleDateString('de-DE', { weekday: 'short' }).slice(0, 2)}
                    </span>
                  </td>
                  <td className="py-2 align-top">
                    {entry.type === 'work' && 'Arbeit'}
                    {entry.type === 'vacation' && 'Urlaub'}
                    {entry.type === 'sick' && 'Krank'}
                  </td>
                  <td className="py-2 align-top">
                    {entry.type === 'work' ? (
                      <div className="flex flex-col justify-start">
                        <span className="font-bold text-slate-800 text-base leading-tight">
                          {entry.start} - {entry.end}
                        </span>
                        {entry.pause > 0 && (
                          <span className="text-xs text-slate-500 mt-0.5">
                            {entry.pause} min Pause
                          </span>
                        )}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="py-2 align-top">
                    {entry.type === 'work' ? (
                      <div>
                        <span className="font-bold text-xs bg-slate-100 px-1 rounded mr-1">
                          {String(entry.code).padStart(2, '0')}
                        </span>
                        {entry.project || WORK_CODES.find(c => c.id === entry.code)?.label.split(' - ')[1]}
                      </div>
                    ) : (
                      <span className="italic text-slate-500">
                        {entry.type === 'vacation' ? 'Erholungsurlaub' : 'Krankenstand'}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right font-bold align-top">
                    {formatTime(entry.netDuration)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-8 break-inside-avoid">
            <div className="bg-slate-50 p-4 rounded border border-slate-200">
              <h3 className="font-bold text-sm uppercase mb-3 border-b border-slate-200 pb-1">Zusammenfassung</h3>
              <div className="flex justify-between text-sm mb-1">
                <span>Arbeitszeit:</span>
                <span className="font-bold">{formatTime(reportStats.work)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1 text-blue-700">
                <span>Urlaub:</span>
                <span className="font-bold">{formatTime(reportStats.vacation)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1 text-red-700">
                <span>Krankenstand:</span>
                <span className="font-bold">{formatTime(reportStats.sick)}</span>
              </div>
              <div className="flex justify-between text-base mt-2 pt-2 border-t border-slate-300 font-bold">
                <span>Gesamt:</span>
                <span>{formatTime(reportStats.total)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

export default function App() {
  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem('kogler_entries');
    return saved ? JSON.parse(saved) : [];
  });

  const [userData, setUserData] = useState(() => {
    const saved = localStorage.getItem('kogler_user');
    return saved ? JSON.parse(saved) : { name: "Markus Mustermann" };
  });

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('kogler_theme');
    return saved || 'system'; // 'light' | 'dark' | 'system'
  });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('dashboard');
  const [editingEntry, setEditingEntry] = useState(null);

  const fileInputRef = useRef(null);

  // BACK BUTTON
  useEffect(() => {
    const handler = CapacitorApp.addListener('backButton', () => {
      if (view !== 'dashboard') {
        setView('dashboard');
        setEditingEntry(null);
      } else {
        CapacitorApp.exitApp();
      }
    });

    return () => {
      handler.remove();
    };
  }, [view]);

  // Theme anwenden
  useEffect(() => {
    try {
      localStorage.setItem('kogler_theme', theme);
    } catch (e) {
      console.warn('Konnte Theme nicht speichern:', e);
    }

    const prefersDark =
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    const isDark = theme === 'dark' || (theme === 'system' && prefersDark);

    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryType, setEntryType] = useState('work');
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("16:30");
  const [project, setProject] = useState("");
  const [code, setCode] = useState(WORK_CODES[0].id);
  const [pauseDuration, setPauseDuration] = useState(30);

  useEffect(() => {
    localStorage.setItem('kogler_entries', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem('kogler_user', JSON.stringify(userData));
  }, [userData]);

  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth();

  const entriesInMonth = useMemo(() => {
    return entries
      .filter(e => {
        const d = new Date(e.date);
        return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [entries, viewYear, viewMonth]);

  // Gruppierung nach KW
  const groupedByWeek = useMemo(() => {
    const map = new Map();
    entriesInMonth.forEach(e => {
      const d = new Date(e.date);
      const w = getWeekNumber(d);
      if (!map.has(w)) map.set(w, []);
      map.get(w).push(e);
    });

    const weeks = Array.from(map.entries());
    // neueste KW zuerst auf der Übersicht
    weeks.forEach(([w, list]) => {
      list.sort((a, b) => new Date(b.date) - new Date(a.date));
    });
    weeks.sort((a, b) => b[0] - a[0]);
    return weeks;
  }, [entriesInMonth]);

  const [expandedWeeks, setExpandedWeeks] = useState({});

  // Neue Wochen standardmäßig expandieren
  useEffect(() => {
    setExpandedWeeks(prev => {
      const next = { ...prev };
      groupedByWeek.forEach(([week]) => {
        if (!(week in next)) next[week] = true;
      });
      return next;
    });
  }, [groupedByWeek]);

  const holidays = useMemo(() => getHolidays(viewYear), [viewYear]);

  const stats = useMemo(() => {
    let actualMinutes = 0;
    entriesInMonth.forEach(e => actualMinutes += e.netDuration);

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    let targetMinutes = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateString = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = getDayOfWeek(dateString);
      const isHoliday = holidays.includes(dateString);

      if (!isHoliday && dayOfWeek !== 0 && dayOfWeek !== 6) {
        if (dayOfWeek === 5) {
          targetMinutes += 270;
        } else {
          targetMinutes += 510;
        }
      }
    }

    return { actualMinutes, targetMinutes };
  }, [entriesInMonth, viewYear, viewMonth, holidays]);

  const changeDate = (days) => {
    const d = new Date(formDate);
    d.setDate(d.getDate() + days);
    setFormDate(d.toISOString().split('T')[0]);
  };

  const startNewEntry = () => {
    setEditingEntry(null);
    setEntryType('work');
    setFormDate(new Date().toISOString().split('T')[0]);
    setStartTime("06:00");
    setEndTime("16:30");
    setPauseDuration(30);
    setProject("");
    setCode(WORK_CODES[0].id);
    setView('add');
  };

  const startEdit = (entry) => {
    setEditingEntry(entry);
    setEntryType(entry.type);
    setFormDate(entry.date);
    if (entry.type === 'work') {
      setStartTime(entry.start || "06:00");
      setEndTime(entry.end || "16:30");
      setPauseDuration(entry.pause ?? 0);
      setCode(entry.code ?? WORK_CODES[0].id);
      setProject(entry.project || "");
    } else {
      setPauseDuration(0);
      setProject("");
    }
    setView('add');
  };

  const saveEntry = (e) => {
    e.preventDefault();

    let net = 0;
    let label = "";

    if (entryType === 'work') {
      const startMin = parseTime(startTime);
      const endMin = parseTime(endTime);

      if (endMin <= startMin) {
        alert("Endzeit muss nach der Startzeit liegen.");
        return;
      }

      net = endMin - startMin - pauseDuration;
      label = WORK_CODES.find(c => c.id === code)?.label || "Arbeit";
    } else {
      net = getTargetMinutesForDate(formDate);
      if (entryType === 'vacation') label = "Urlaub";
      if (entryType === 'sick') label = "Krankenstand";
    }

    if (net < 0) net = 0;

    const baseId = editingEntry ? editingEntry.id : Date.now();

    const newEntry = {
      id: baseId,
      type: entryType,
      date: formDate,
      start: entryType === 'work' ? startTime : null,
      end: entryType === 'work' ? endTime : null,
      pause: entryType === 'work' ? pauseDuration : 0,
      project: entryType === 'work' ? project : label,
      code: entryType === 'work' ? code : null,
      netDuration: net
    };

    if (editingEntry) {
      setEntries(entries.map(e => (e.id === editingEntry.id ? newEntry : e)));
    } else {
      setEntries([newEntry, ...entries]);
    }

    setEditingEntry(null);
    setProject("");
    setEntryType('work');
    setView('dashboard');
  };

  const deleteEntry = (id) => {
    if (confirm("Eintrag wirklich löschen?")) {
      setEntries(entries.filter(e => e.id !== id));
    }
  };

  const changeMonth = (delta) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  const clearAllData = () => {
    if (confirm("ACHTUNG: Wirklich ALLE Einträge löschen? Das kann nicht rückgängig gemacht werden!")) {
      setEntries([]);
      alert("Daten gelöscht.");
    }
  };

  // --- Export / Import ---

	const exportData = async () => {
	  try {
		const payload = {
		  user: userData,
		  entries,
		  exportedAt: new Date().toISOString()
		};

		const json = JSON.stringify(payload, null, 2);
		const fileName = `kogler_zeiterfassung_${new Date().toISOString().slice(0, 10)}.json`;

		// Web-Fallback
		if (!Capacitor.isNativePlatform()) {
		  const blob = new Blob([json], { type: 'application/json' });
		  const url = URL.createObjectURL(blob);
		  const a = document.createElement('a');
		  a.href = url;
		  a.download = fileName;
		  document.body.appendChild(a);
		  a.click();
		  document.body.removeChild(a);
		  URL.revokeObjectURL(url);
		  alert('Export als Browser-Download erstellt.');
		  return;
		}

		// Native: in App-Daten schreiben
		const writeResult = await Filesystem.writeFile({
		  path: fileName,
		  data: json,
		  directory: Directory.Data,
		  encoding: Encoding.UTF8
		});

		let shareUrl = writeResult.uri;

		try {
		  const uriResult = await Filesystem.getUri({
			path: fileName,
			directory: Directory.Data
		  });
		  if (uriResult && uriResult.uri) {
			shareUrl = uriResult.uri;
		  }
		} catch (uriErr) {
		  console.warn('Filesystem.getUri (Export) Fehler, verwende file-URI:', uriErr);
		}

		try {
		  await Share.share({
			title: 'Zeiterfassung exportieren',
			text: 'Exportierte Zeiterfassungsdaten',
			url: shareUrl
		  });
		} catch (shareErr) {
		  console.warn('Share-Fehler (Export):', shareErr);
		  // Auch hier kein alert, nur Log
		}

		alert('Export gespeichert:\n' + writeResult.uri);
	  } catch (err) {
		console.error('Export-Fehler', err);
		const msg =
		  typeof err === 'object' ? (err?.message || JSON.stringify(err)) : String(err);
		alert('Fehler beim Export:\n' + msg);
	  }
	};


  const handleImportFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const data = JSON.parse(text);

        if (Array.isArray(data.entries)) {
          setEntries(data.entries);
        }
        if (data.user) {
          setUserData(data.user);
        }

        alert('Daten erfolgreich importiert.');
      } catch (err) {
        console.error('Import-Fehler', err);
        alert('Import fehlgeschlagen: Ungültige Datei.');
      } finally {
        event.target.value = '';
      }
    };

    reader.readAsText(file, 'utf-8');
  };

  const triggerImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Report-View
  if (view === 'report') {
    return (
      <PrintReport
        entries={entriesInMonth}
        monthDate={currentDate}
        employeeName={userData.name}
        onClose={() => setView('dashboard')}
      />
    );
  }

  const overtime = stats.actualMinutes - stats.targetMinutes;
  const progressPercent = Math.min(100, (stats.actualMinutes / (stats.targetMinutes || 1)) * 100);

  const isDark = (() => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true;
    }
    return false;
  })();

  return (
    <div
      className={`min-h-screen w-screen font-sans pb-24 ${
        isDark ? 'bg-slate-900 text-slate-50' : 'bg-slate-50 text-slate-800'
      }`}
    >

      {/* verstecktes File-Input für Import */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="application/json"
        onChange={handleImportFile}
      />

      {/* HEADER */}
      <header
        className="bg-slate-900 text-white p-4 pb-4 shadow-lg sticky top-0 z-10 w-full"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {view !== 'dashboard' ? (
              <button
                onClick={() => { setView('dashboard'); setEditingEntry(null); }}
                className="p-1 hover:bg-slate-700 rounded-full"
              >
                <ArrowLeft />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center bg-slate-900">
                <img
                  src={KoglerLogo}
                  alt="Kogler Zeit"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div>
              <h1 className="font-bold text-lg leading-tight">
                {view === 'dashboard'
                  ? 'Übersicht'
                  : view === 'add'
                    ? (editingEntry ? 'Eintrag bearbeiten' : 'Neuer Eintrag')
                    : view === 'settings'
                      ? 'Einstellungen'
                      : 'Zeiterfassung'}
              </h1>
              {view === 'dashboard' && <p className="text-xs text-slate-400">Kogler Aufzugsbau</p>}
            </div>
          </div>

          {view === 'dashboard' && (
            <div className="flex gap-2">
              <button
                onClick={() => setView('settings')}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Settings size={18} className="text-slate-300" />
              </button>
              <button
                onClick={() => setView('report')}
                className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg transition-colors flex items-center justify-center"
              >
                <FileBarChart size={18} className="text-orange-400" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* DASHBOARD */}
      {view === 'dashboard' && (
        <main className="w-full p-3 space-y-4">

          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-2 shadow-sm">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-lg">
              <ChevronLeft size={20} />
            </button>
            <span className="font-bold text-slate-700">
              {currentDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-lg">
              <ChevronRight size={20} />
            </button>
          </div>

          <Card className="bg-gradient-to-br from-white to-slate-50 border-slate-200">
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">
                    IST
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900">
                    {formatTime(stats.actualMinutes)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">
                    ZIEL
                  </p>
                  <p className="text-sm sm:text-base font-semibold text-slate-500">
                    {formatTime(stats.targetMinutes)}
                  </p>
                </div>
                <div className={`text-right ${overtime >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  <p className="text-[10px] sm:text-xs font-bold uppercase">Saldo</p>
                  <p className="font-bold text-lg sm:text-xl">
                    {formatSignedTime(overtime)}
                  </p>
                </div>
              </div>

              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${overtime >= 0 ? 'bg-green-500' : 'bg-orange-500'}`}
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          </Card>

          <div className="space-y-3 pb-20">
            <h3 className="font-bold text-slate-500 text-sm px-1">Letzte Einträge (nach Kalenderwoche)</h3>
            {groupedByWeek.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                <Calendar size={32} className="mx-auto mb-2 opacity-20" />
                <p>Keine Einträge vorhanden.</p>
              </div>
            ) : (
              groupedByWeek.map(([week, weekEntries]) => {
                const totalWeekMinutes = weekEntries.reduce((sum, e) => sum + e.netDuration, 0);
                const dates = weekEntries.map(e => new Date(e.date));
                const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
                const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
                const expanded = expandedWeeks[week];

                return (
                  <div key={week} className="mb-3">
                    <button
                      className="w-full flex items-center justify-between bg-slate-100 hover:bg-slate-200 rounded-xl px-3 py-2 transition-colors"
                      onClick={() =>
                        setExpandedWeeks(prev => ({ ...prev, [week]: !prev[week] }))
                      }
                    >
                      <div className="flex flex-col items-start text-left">
                        <span className="text-xs font-bold text-slate-500 uppercase">Kalenderwoche</span>
                        <span className="font-bold text-slate-800">
                          KW {week}{' '}
                          <span className="text-xs text-slate-500 font-normal">
                            ({minDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} –{' '}
                            {maxDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })})
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 uppercase font-bold">
                          Woche
                        </span>
                        <span className="font-bold text-slate-800 text-sm">
                          {formatTime(totalWeekMinutes)}
                        </span>
                        <ChevronRight
                          size={18}
                          className={`text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
                        />
                      </div>
                    </button>

                    {expanded && (
                      <div className="mt-2 space-y-2">
                        {weekEntries.map(entry => (
                          <div
                            key={entry.id}
                            onClick={() => startEdit(entry)}
                            className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between gap-3 active:scale-[0.99] transition-transform"
                          >
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div
                                className={`text-white font-bold rounded-lg w-10 h-10 flex flex-col items-center justify-center flex-shrink-0 text-[10px] leading-none
                                  ${entry.type === 'vacation'
                                    ? 'bg-blue-400'
                                    : entry.type === 'sick'
                                      ? 'bg-red-400'
                                      : 'bg-slate-800'}`}
                              >
                                <span className="text-xs">{new Date(entry.date).getDate()}.</span>
                                <span className="uppercase opacity-75">
                                  {new Date(entry.date).toLocaleDateString('de-DE', { weekday: 'short' }).slice(0, 2)}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="font-bold text-slate-900 truncate text-sm">
                                    {entry.type === 'work'
                                      ? (WORK_CODES.find(c => c.id === Number(entry.code))?.label.split(' - ')[1])
                                      : (entry.type === 'vacation' ? 'Urlaub' : 'Krank')}
                                  </span>
                                </div>
                                {entry.project && (
                                  <p className="text-xs text-slate-500 truncate">
                                    {entry.project}
                                  </p>
                                )}
                                {entry.type === 'work' && (
                                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                    <span>{entry.start} - {entry.end}</span>
                                    {entry.pause > 0 && (
                                      <span className="text-orange-500">(-{entry.pause}m)</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <div className="font-bold text-slate-700 text-sm">
                                {formatTime(entry.netDuration)}
                              </div>
                              <button
                                onClick={(ev) => { ev.stopPropagation(); deleteEntry(entry.id); }}
                                className="text-slate-300 hover:text-red-500 p-1"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <button
            onClick={startNewEntry}
            className="fixed bottom-6 right-6 bg-slate-900 hover:bg-slate-800 text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center active:scale-95 transition-all z-20"
          >
            <Plus size={28} />
          </button>
        </main>
      )}

      {/* ADD VIEW */}
      {view === 'add' && (
        <main className="w-full p-3">
          <Card>
            <form onSubmit={saveEntry} className="p-4 space-y-5">

              <div className="bg-slate-100 p-1 rounded-xl flex">
                <button
                  type="button"
                  onClick={() => setEntryType('work')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                    entryType === 'work' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
                  }`}
                >
                  Arbeit
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType('vacation')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                    entryType === 'vacation' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Urlaub
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType('sick')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                    entryType === 'sick' ? 'bg-red-100 text-red-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Krank
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Datum</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => changeDate(-1)}
                    className="p-3 bg-slate-100 rounded-lg text-slate-600"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="flex-1 p-3 bg-white border border-slate-300 rounded-lg text-center font-bold outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => changeDate(1)}
                    className="p-3 bg-slate-100 rounded-lg text-slate-600"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              {entryType === 'work' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Start</label>
                      <select
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none appearance-none font-medium"
                      >
                        {TIME_OPTIONS.map(t => (
                          <option key={`s-${t}`} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Ende</label>
                      <select
                        required
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none appearance-none font-medium"
                      >
                        {TIME_OPTIONS.map(t => (
                          <option key={`e-${t}`} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Pause</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPauseDuration(0)}
                        className={`flex-1 p-3 rounded-lg border text-sm font-bold ${
                          pauseDuration === 0
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-slate-200 bg-white text-slate-500'
                        }`}
                      >
                        Keine
                      </button>
                      <button
                        type="button"
                        onClick={() => setPauseDuration(30)}
                        className={`flex-1 p-3 rounded-lg border text-sm font-bold ${
                          pauseDuration === 30
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-slate-200 bg-white text-slate-500'
                        }`}
                      >
                        30 Min
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Tätigkeit</label>
                    <select
                      value={code}
                      onChange={(e) => setCode(Number(e.target.value))}
                      className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none font-medium"
                    >
                      {WORK_CODES.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Projekt / Notiz</label>
                    <input
                      type="text"
                      placeholder="..."
                      value={project}
                      onChange={(e) => setProject(e.target.value)}
                      className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none"
                    />
                  </div>
                </>
              )}

              {entryType !== 'work' && (
                <div
                  className={`p-4 rounded-xl border flex gap-3 ${
                    entryType === 'vacation'
                      ? 'bg-blue-50 border-blue-100 text-blue-800'
                      : 'bg-red-50 border-red-100 text-red-800'
                  }`}
                >
                  {entryType === 'vacation' ? <Sun /> : <Thermometer />}
                  <div className="text-sm">
                    <p className="font-bold">Sollzeit wird gutgeschrieben</p>
                    <p>
                      Für diesen Tag werden automatisch {getDayOfWeek(formDate) === 5 ? '4,5h' : '8,5h'} angerechnet.
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setView('dashboard'); setEditingEntry(null); }}
                  className="flex-1 py-3 font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-lg flex items-center justify-center gap-2"
                >
                  <Save size={18} /> Speichern
                </button>
              </div>

            </form>
          </Card>
        </main>
      )}

      {/* SETTINGS */}
      {view === 'settings' && (
        <main className="w-full p-4 space-y-6">
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="bg-slate-100 p-3 rounded-full">
                <User size={24} className="text-slate-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Benutzerdaten</h3>
                <p className="text-xs text-slate-400">Wird auf dem PDF Bericht angezeigt</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Dein Name</label>
              <input
                type="text"
                value={userData.name}
                onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 outline-none focus:border-orange-500"
              />
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <Sun size={18} className="text-orange-400" />
              <span>Design / Theme</span>
            </h3>
            <p className="text-sm text-slate-500">
              Wähle, ob die App hell, dunkel oder automatisch nach System-Einstellung aussehen soll.
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setTheme('light')}
                className={`py-2 px-2 rounded-xl text-sm font-bold border ${
                  theme === 'light'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                Hell
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`py-2 px-2 rounded-xl text-sm font-bold border flex items-center justify-center gap-1 ${
                  theme === 'dark'
                    ? 'border-slate-700 bg-slate-900 text-slate-50'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                <Moon size={14} />
                Dunkel
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`py-2 px-2 rounded-xl text-sm font-bold border ${
                  theme === 'system'
                    ? 'border-slate-800 bg-slate-200 text-slate-900'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                System
              </button>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="font-bold text-slate-700">Daten sichern & wiederherstellen</h3>
            <p className="text-sm text-slate-500">
              Exportiert alle Einträge und Einstellungen als JSON-Datei in einen App-internen Ordner.
              Über „Importieren“ kannst du eine zuvor exportierte Datei wieder einlesen.
              Auf dem Handy kannst du den Speicherort beim Teilen selbst wählen (z.&nbsp;B. Google Drive, Mail, Dateien).
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={exportData}
                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800"
              >
                Daten exportieren
              </button>
              <button
                onClick={triggerImport}
                className="w-full py-3 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50"
              >
                Daten importieren
              </button>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-bold text-red-600 mb-2">Gefahrenzone</h3>
            <p className="text-sm text-slate-500 mb-4">
              Hier kannst du alle gespeicherten Einträge löschen. Das kann nicht rückgängig gemacht werden.
            </p>
            <button
              onClick={clearAllData}
              className="w-full py-3 border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50"
            >
              Alle Daten löschen
            </button>
          </Card>

          <p className="text-center text-xs text-slate-300">
            App Version 1.8.3 (PDF-Share-Fix)
          </p>
        </main>
      )}

    </div>
  );
}
