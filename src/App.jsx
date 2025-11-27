// ---------------------------------------------
//  App.jsx – Version 1.8.7
//  TEIL 1/4 – Imports + Konstanten + Helper
// ---------------------------------------------

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

// ** Native DatePicker Plugin (Month-Year Mode) **
import { DatePicker } from '@capacitor-community/date-picker';

// PDF Generator
import html2pdf from 'html2pdf.js';

// Logo
import KoglerLogo from './assets/kogler_time_icon.png';


// -------------------------------------------------------
// KONFIGURATION & DATEN
// -------------------------------------------------------

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
  { id: 21, label: "21 - Reparaturen" },
  { id: 22, label: "22 - Umbau, Sanierungen" },
  { id: 23, label: "23 - TÜV-Mängel" },
  { id: 24, label: "24 - Demontage" },
  { id: 25, label: "25 - Gerüstbau" },

  // Neuer Code
  { id: 70, label: "70 - Büro" }
];


// -------------------------------------------------------
// FEIERTAGE + DATUMSFUNKTIONEN
// -------------------------------------------------------

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
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  return [
    ...fixed,
    addDays(easterDate, 1),
    addDays(easterDate, 39),
    addDays(easterDate, 50),
    addDays(easterDate, 60)
  ];
};


// -------------------------------------------------------
// HELPER-FUNKTIONEN
// -------------------------------------------------------

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
      options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

const getDayOfWeek = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
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
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};


// -------------------------------------------------------
// Blob → Base64 für Filesystem
// -------------------------------------------------------

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });


// -------------------------------------------------------
// UI BASISKOMPONENTE
// -------------------------------------------------------

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
    {children}
  </div>
);
// ---------------------------------------------
//  TEIL 2/4 – PrintReport Component
// ---------------------------------------------

const PrintReport = ({ entries, monthDate, employeeName, onClose }) => {
  const [filterMode, setFilterMode] = useState('month');
  const [isGenerating, setIsGenerating] = useState(false);

  // gefilterte Einträge (ganzer Monat oder nach KW)
  const filteredEntries = useMemo(() => {
    let list =
      filterMode === 'month'
        ? [...entries]
        : entries.filter((e) => getWeekNumber(new Date(e.date)) === Number(filterMode));

    // Sortiert nach Datum + Startzeit
    list.sort((a, b) => {
      const da = new Date(a.date);
      const db = new Date(b.date);
      if (da.getTime() !== db.getTime()) return da - db;

      return (a.start || '').localeCompare(b.start || '');
    });

    return list;
  }, [entries, filterMode]);

  const availableWeeks = useMemo(() => {
    const w = new Set(entries.map((e) => getWeekNumber(new Date(e.date))));
    return Array.from(w).sort((a, b) => a - b);
  }, [entries]);

  const reportStats = useMemo(() => {
    let work = 0;
    let vacation = 0;
    let sick = 0;

    filteredEntries.forEach((e) => {
      if (e.type === 'work') work += e.netDuration;
      if (e.type === 'vacation') vacation += e.netDuration;
      if (e.type === 'sick') sick += e.netDuration;
    });

    return {
      work,
      vacation,
      sick,
      total: work + vacation + sick,
    };
  }, [filteredEntries]);

  // ---------------------------------------------
  //  PDF DOWNLOAD (JETZT in Directory.Data)
  // ---------------------------------------------
  const handleDownloadPdf = async () => {
    try {
      setIsGenerating(true);

      const element = document.getElementById('report-to-print');
      if (!element) {
        alert('PDF-Element nicht gefunden.');
        setIsGenerating(false);
        return;
      }

      // Zeitraum nur für Dateiname
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

      const f2 = (d) => String(d.getDate()).padStart(2, '0');
      const fDate = (d) => `${f2(d)}_${String(d.getMonth() + 1).padStart(2, '0')}`;
      const periodStr = `${fDate(start)}_bis_${f2(end)}`;

      const safeName = (employeeName || 'Mitarbeiter').trim().replace(/\s+/g, '_');
      const filename = `${safeName}_Stundenzettel_${periodStr}.pdf`;

      const opt = {
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };

      const worker = html2pdf().set(opt).from(element);

      // Web-Fallback
      if (!Capacitor.isNativePlatform()) {
        await worker.save();
        alert('PDF als Browser-Download erstellt.');
        setIsGenerating(false);
        return;
      }

      // Native:
      const pdfBlob = await worker.output('blob');
      const base64 = await blobToBase64(pdfBlob);

      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Data,
        encoding: Encoding.BASE64,
      });

      let shareUrl;
      try {
        const uriResult = await Filesystem.getUri({
          path: filename,
          directory: Directory.Data,
        });
        shareUrl = uriResult.uri || uriResult.path;
      } catch (err) {
        shareUrl = writeResult.uri || writeResult.path;
      }

      if (shareUrl) {
        try {
          await Share.share({
            title: 'Stundenzettel teilen',
            text: `Stundenzettel ${periodStr}`,
            url: shareUrl,
            dialogTitle: 'PDF teilen',
          });
        } catch (err) {
          alert(`PDF gespeichert, aber Teilen fehlgeschlagen.\n${filename}`);
        }
      } else {
        alert(`PDF gespeichert, aber keine URL verfügbar.\n${filename}`);
      }
    } catch (err) {
      console.error(err);
      alert('Fehler beim Erstellen der PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ---------------------------------------------
  //  REPORT UI
  // ---------------------------------------------
  return (
    <div className="fixed inset-0 bg-slate-800 z-50 overflow-y-auto">
      {/* TOPBAR */}
      <div className="sticky top-0 bg-slate-900 text-white p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-xl z-50">
        <div className="flex items-center gap-4 w-full">
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full">
            <X />
          </button>
          <h2 className="font-bold flex-1 text-center mr-10 text-xl">Berichtsvorschau</h2>
        </div>

        <div className="flex gap-2 items-center flex-wrap justify-center w-full">
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded p-2 text-sm flex-1"
          >
            <option value="month">Gesamter Monat</option>
            {availableWeeks.map((w) => (
              <option key={w} value={w}>
                KW {w}
              </option>
            ))}
          </select>

          <button
            onClick={handleDownloadPdf}
            disabled={isGenerating}
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 text-base"
          >
            {isGenerating ? <Loader className="animate-spin" size={18} /> : <Download size={18} />}
            {isGenerating ? 'Erstelle...' : 'PDF'}
          </button>
        </div>
      </div>

      {/* PRINT CONTENT */}
      <div className="flex justify-center p-4">
        <div
          id="report-to-print"
          className="bg-white w-[210mm] max-w-full min-h-[297mm] mx-auto p-[15mm] shadow-2xl text-black"
        >
          {/* HEADER */}
          <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-900">
                Stundenzettel
              </h1>
              <p className="text-sm font-bold text-slate-500 mt-1">Kogler Aufzugsbau</p>
            </div>

            <div className="text-right">
              <p className="font-medium">Mitarbeiter: {employeeName}</p>
              <p className="text-slate-500 text-sm">
                Zeitraum:{" "}
                {monthDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                {filterMode !== 'month' && ` (KW ${filterMode})`}
              </p>
            </div>
          </div>

          {/* TABLE */}
          <table className="w-full text-sm text-left mb-8">
            <thead>
              <tr className="border-b border-slate-300 text-slate-500 uppercase text-xs">
                <th className="py-2 w-24">Datum</th>
                <th className="py-2 w-32">Zeit</th>
                <th className="py-2">Projekt</th>
                <th className="py-2 w-24">Code</th>
                <th className="py-2 w-16 text-right">Std.</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredEntries.map((e) => {
                const d = new Date(e.date);
                const wd = d.toLocaleDateString('de-DE', { weekday: 'short' }).slice(0, 2);
                const ds = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

                return (
                  <tr key={e.id} className="hover:bg-slate-50 break-inside-avoid">
                    {/* Datum + Wochentag */}
                    <td className="py-2 font-medium align-top">
                      <span className="font-bold">{wd}</span>{" "}
                      <span className="text-slate-600">{ds}</span>
                    </td>

                    {/* Zeiten */}
                    <td className="py-2 align-top">
                      {e.type === 'work' ? (
                        <>
                          <span className="font-bold text-slate-800 text-base leading-tight">
                            {e.start} – {e.end}
                          </span>
                          {e.pause > 0 && (
                            <span className="block text-xs text-slate-500 mt-0.5">
                              Pause {e.pause}m
                            </span>
                          )}
                        </>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Projekt */}
                    <td className="py-2 align-top">
                      {e.type === 'work' ? (
                        <div>
                          <span className="font-medium text-slate-700">{e.project}</span>
                        </div>
                      ) : (
                        <span className="italic text-slate-500">
                          {e.type === 'vacation' ? 'Urlaub' : 'Krank'}
                        </span>
                      )}
                    </td>

                    {/* Code */}
                    <td className="py-2 align-top font-bold text-xs">
                      {e.type === 'work'
                        ? WORK_CODES.find((c) => c.id === e.code)?.label
                        : ''}
                    </td>

                    {/* Std. */}
                    <td className="py-2 text-right font-bold align-top">
                      {formatTime(e.netDuration)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* REPORT SUMMARY */}
          <div className="mt-8 break-inside-avoid">
            <div className="bg-slate-50 p-4 rounded border border-slate-200">
              <h3 className="font-bold text-sm uppercase mb-3 border-b border-slate-200 pb-1">
                Zusammenfassung
              </h3>

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
// ---------------------------------------------
//  TEIL 3/4 – MAIN APP COMPONENT
// ---------------------------------------------

export default function App() {
  // -------------------------------------------------
  //  LOCAL STORAGE STATE
  // -------------------------------------------------
  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem('kogler_entries');
    return saved ? JSON.parse(saved) : [];
  });

  const [userData, setUserData] = useState(() => {
    const saved = localStorage.getItem('kogler_user');
    return saved ? JSON.parse(saved) : { name: "Markus Mustermann" };
  });

  // Theme – Dark/System disabled, Hell aktiv
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('kogler_theme');
    return saved || 'light';
  });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('dashboard');
  const [editingEntry, setEditingEntry] = useState(null);
  const fileInputRef = useRef(null);

  // -------------------------------------------------
  //  BACK BUTTON HANDLING (Android)
  // -------------------------------------------------
  useEffect(() => {
    const handler = CapacitorApp.addListener('backButton', () => {
      if (view !== 'dashboard') {
        setView('dashboard');
        setEditingEntry(null);
      } else {
        CapacitorApp.exitApp();
      }
    });
    return () => handler.remove();
  }, [view]);


  // -------------------------------------------------
  //  THEME (nur Hell erlaubt)
  // -------------------------------------------------
  useEffect(() => {
    localStorage.setItem('kogler_theme', theme);
    const root = document.documentElement;
    root.classList.remove('dark');
  }, [theme]);

  const isDark = false; // DarkMode deaktiviert


  // -------------------------------------------------
  //  FORM STATES
  // -------------------------------------------------
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

  // -------------------------------------------------
  //  MONATSANSICHT
  // -------------------------------------------------
  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth();

  const entriesInMonth = useMemo(() => {
    return entries
      .filter((e) => {
        const d = new Date(e.date);
        return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [entries, viewYear, viewMonth]);

  // -------------------------------------------------
  //  KW Gruppierung
  // -------------------------------------------------
  const groupedByWeek = useMemo(() => {
    const map = new Map();

    entriesInMonth.forEach((e) => {
      const w = getWeekNumber(new Date(e.date));
      if (!map.has(w)) map.set(w, []);
      map.get(w).push(e);
    });

    const arr = Array.from(map.entries());
    arr.forEach(([w, list]) => {
      list.sort((a, b) => new Date(b.date) - new Date(a.date));
    });

    // absteigend nach KW
    arr.sort((a, b) => b[0] - a[0]);
    return arr;
  }, [entriesInMonth]);


  // -------------------------------------------------
  //  KW standardmäßig eingeklappt
  // -------------------------------------------------
  const [expandedWeeks, setExpandedWeeks] = useState({});
  useEffect(() => {
    const collapsed = {};
    groupedByWeek.forEach(([week]) => (collapsed[week] = false));
    setExpandedWeeks(collapsed);
  }, [viewMonth, viewYear]);


  // -------------------------------------------------
  //  Monat wechseln Buttons
  // -------------------------------------------------
  const changeMonth = (delta) => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + delta);
    setCurrentDate(d);
  };


  // -------------------------------------------------
  //  **Native Month-Year Picker**
  // -------------------------------------------------
  const openMonthPicker = async () => {
    try {
      const result = await DatePicker.present({
        mode: 'date',
        locale: 'de-AT',
        theme: 'light',
        format: 'yyyy-MM',
        presentation: 'date',
        // Month-Year-Modus: wir ignorieren "day"
      });

      if (result?.value) {
        const date = new Date(result.value);
        date.setDate(1); // immer auf den 1. setzen (Variante A)
        setCurrentDate(date);
      }
    } catch (err) {
      console.error("DatePicker Error", err);
    }
  };


  // -------------------------------------------------
  //  ZIELZEITEN BERECHNEN
  // -------------------------------------------------
  const holidays = useMemo(() => getHolidays(viewYear), [viewYear]);

  const stats = useMemo(() => {
    let actualMinutes = 0;   // echte Arbeitszeit (ohne Fahrzeit)
    let driveMinutes = 0;    // nur Fahrzeit (Code 19)

    entriesInMonth.forEach((e) => {
      if (e.type === 'work' && e.code === 19) {
        driveMinutes += e.netDuration;
      } else {
        actualMinutes += e.netDuration;
      }
    });

    const days = new Date(viewYear, viewMonth + 1, 0).getDate();
    let targetMinutes = 0;

    for (let d = 1; d <= days; d++) {
      const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dow = getDayOfWeek(ds);
      if (!holidays.includes(ds) && dow !== 0 && dow !== 6) {
        targetMinutes += dow === 5 ? 270 : 510;
      }
    }

    return { actualMinutes, targetMinutes, driveMinutes };
  }, [entriesInMonth, viewYear, viewMonth, holidays]);


  const overtime = stats.actualMinutes - stats.targetMinutes;
  const progressPercent = Math.min(
    100,
    (stats.actualMinutes / (stats.targetMinutes || 1)) * 100
  );


  // -------------------------------------------------
  //  EINTRAG ERSTELLEN + SPEICHERN
  // -------------------------------------------------
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

    const isDrive = entry.type === 'work' && entry.code === 19;
    const effectiveType = isDrive ? 'drive' : entry.type;

    setEntryType(effectiveType);
    setFormDate(entry.date);

    if (entry.type === 'work') {
      setStartTime(entry.start || "06:00");
      setEndTime(entry.end || "16:30");
      setPauseDuration(isDrive ? 0 : (entry.pause ?? 0));
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

    const isDrive = entryType === 'drive';

    let net = 0;
    let label = "";

    if (entryType === 'work' || isDrive) {
      const startMin = parseTime(startTime);
      const endMin = parseTime(endTime);

      if (endMin <= startMin) {
        alert("Endzeit muss nach der Startzeit liegen.");
        return;
      }

      const usedPause = isDrive ? 0 : pauseDuration;
      const usedCode = isDrive ? 19 : code;

      net = endMin - startMin - usedPause;

      label =
        WORK_CODES.find((c) => c.id === usedCode)?.label ||
        (isDrive ? "Fahrzeit" : "Arbeit");
    } else {
      // Urlaub / Krank
      net = getTargetMinutesForDate(formDate);
      label = entryType === 'vacation' ? "Urlaub" : "Krank";
    }

    if (net < 0) net = 0;

    // Fahrtzeit wird als "work" gespeichert, aber mit Code 19 & Pause 0
    const storedType = isDrive ? "work" : entryType;
    const usedCode = isDrive ? 19 : code;
    const usedPause =
      storedType === "work" ? (isDrive ? 0 : pauseDuration) : 0;

    const newEntry = {
      id: editingEntry ? editingEntry.id : Date.now(),
      type: storedType,
      date: formDate,
      start: storedType === "work" ? startTime : null,
      end: storedType === "work" ? endTime : null,
      pause: usedPause,
      project: storedType === "work" ? project : label,
      code: storedType === "work" ? usedCode : null,
      netDuration: net,
    };

    if (editingEntry) {
      setEntries(entries.map((e) => (e.id === editingEntry.id ? newEntry : e)));
    } else {
      setEntries([newEntry, ...entries]);
    }

    setEditingEntry(null);
    setProject("");
    setEntryType("work");
    setView("dashboard");
  };

  const deleteEntry = (id) => {
    if (confirm("Eintrag wirklich löschen?")) {
      setEntries(entries.filter((e) => e.id !== id));
    }
  };

  // -------------------------------------------------
  //  EXPORT / IMPORT
  // -------------------------------------------------
  const exportData = async () => {
    try {
      const payload = {
        user: userData,
        entries,
        exportedAt: new Date().toISOString(),
      };

      const json = JSON.stringify(payload, null, 2);
      const fileName = `kogler_zeiterfassung_${new Date()
        .toISOString()
        .slice(0, 10)}.json`;

      // Web fallback
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

      // Native
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: json,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });

      let shareUrl = writeResult.uri;
      try {
        const uri = await Filesystem.getUri({
          path: fileName,
          directory: Directory.Data,
        });
        if (uri?.uri) shareUrl = uri.uri;
      } catch (err) {}

      await Share.share({
        title: 'Zeiterfassung exportieren',
        text: 'Exportierte Zeiterfassungsdaten',
        url: shareUrl,
      });
    } catch (err) {
      alert('Fehler beim Export.');
    }
  };

  const handleImportFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data.entries)) setEntries(data.entries);
        if (data.user) setUserData(data.user);

        alert('Daten erfolgreich importiert.');
      } catch (err) {
        alert('Import fehlgeschlagen.');
      } finally {
        event.target.value = '';
      }
    };

    reader.readAsText(file, 'utf-8');
  };

  const triggerImport = () => fileInputRef.current?.click();


  // -------------------------------------------------
  //  BERICHTS-VIEW
  // -------------------------------------------------
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


  // -------------------------------------------------
  //  DASHBOARD
  // -------------------------------------------------
  return (
    <div
      className={`min-h-screen w-screen font-sans pb-24 bg-slate-50 text-slate-800`}
    >
      {/* Hidden Import Input */}
      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
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
                onClick={() => {
                  setView('dashboard');
                  setEditingEntry(null);
                }}
                className="p-1 hover:bg-slate-700 rounded-full"
              >
                <ArrowLeft />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center bg-slate-900">
                <img src={KoglerLogo} alt="Kogler Zeit" className="w-full h-full object-contain" />
              </div>
            )}

            <div>
              <h1 className="font-bold text-lg leading-tight">Stundenzettel</h1>
              {view === 'dashboard' && (
                <p className="text-xs text-slate-400">Kogler Aufzugsbau</p>
              )}
            </div>
          </div>

          {/* Settings & Report */}
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
                className="bg-orange-500 hover:bg-orange-600 p-2 rounded-lg transition-colors flex items-center justify-center shadow-md"
              >
                <FileBarChart size={18} className="text-white" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ----------------------------- */}
      {/* DASHBOARD CONTENT */}
      {/* ----------------------------- */}
      {view === 'dashboard' && (
        <main className="w-full p-3 space-y-4">

          {/* MONTH SELECTOR */}
          <div
            className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-2 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
            onClick={openMonthPicker}
          >
            <button className="p-2 hover:bg-slate-100 rounded-lg">
              <ChevronLeft size={20} onClick={(e) => { e.stopPropagation(); changeMonth(-1); }} />
            </button>

            <span className="font-bold text-slate-700 text-base">
              {currentDate.toLocaleDateString('de-DE', {
                month: 'long',
                year: 'numeric',
              })}
            </span>

            <button className="p-2 hover:bg-slate-100 rounded-lg">
              <ChevronRight size={20} onClick={(e) => { e.stopPropagation(); changeMonth(1); }} />
            </button>
          </div>

          {/* PROGRESS CARD */}
          <Card className="bg-gradient-to-br from-white to-slate-50 border-slate-200">
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                {/* IST */}
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    IST
                  </p>
                  <p className="text-xl font-bold text-slate-900">
                    {formatTime(stats.actualMinutes)}
                  </p>
                </div>

                {/* SOLL */}
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    SOLL
                  </p>
                  <p className="text-sm font-semibold text-slate-500">
                    {formatTime(stats.targetMinutes)}
                  </p>
                </div>

                {/* SALDO */}
                <div className={`text-right ${overtime >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  <p className="text-[10px] font-bold uppercase">Saldo</p>
                  <p className="font-bold text-lg">
                    {formatSignedTime(overtime)}
                  </p>
                </div>
              </div>

              {/* PROGRESS BAR */}
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    overtime >= 0 ? 'bg-green-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>

              {/* Fahrzeit Monat (Code 19) – nur anzeigen, wenn vorhanden */}
              {stats.driveMinutes > 0 && (
                <div className="flex justify-between text-xs text-slate-500 pt-1">
                  <span>Fahrzeit (Code 19):</span>
                  <span className="font-semibold">
                    {formatTime(stats.driveMinutes)}
                  </span>
                </div>
              )}

            </div>
          </Card>


          {/* KW LIST */}
          <div className="space-y-3 pb-20">
            <h3 className="font-bold text-slate-500 text-sm px-1">
              Letzte Einträge (nach Kalenderwoche)
            </h3>

            {groupedByWeek.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                <Calendar size={32} className="mx-auto mb-2 opacity-20" />
                <p>Keine Einträge vorhanden.</p>
              </div>
            ) : (
              groupedByWeek.map(([week, weekEntries]) => {
                let workMinutes = 0;      // echte Arbeit (ohne Fahrzeit)
                let driveMinutesKW = 0;   // Fahrzeit dieser Woche

                weekEntries.forEach((e) => {
                  if (e.type === 'work' && e.code === 19) {
                    driveMinutesKW += e.netDuration;
                  } else {
                    workMinutes += e.netDuration;
                  }
                });

                // Eine Referenz auf ein Datum dieser Woche
                const anyDate = new Date(weekEntries[0].date);
                const weekday = anyDate.getDay() || 7;

                const monday = new Date(anyDate);
                monday.setDate(anyDate.getDate() - (weekday - 1));

                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);

// Fixes Wochensoll: 38,5h
const targetKW = 38.5 * 60; // 2310 Minuten

const diff = workMinutes - targetKW;

                const expanded = expandedWeeks[week];

            const sortedWeekEntries = [...weekEntries].sort((a, b) => {
              const da = new Date(a.date);
              const db = new Date(b.date);

              // 1. Nach Datum: neuere Tage zuerst (wie bisher)
              if (da.getTime() !== db.getTime()) {
                return db - da;
              }

              // 2. Innerhalb eines Tages nach Startzeit: früh → spät
              const sa = a.start || '23:59';
              const sb = b.start || '23:59';
              return sa.localeCompare(sb);
            });

                return (
                  <div key={week} className="mb-3">
                    {/* WEEK HEADER */}
                    <button
                      className="w-full flex items-center justify-between bg-slate-100 hover:bg-slate-200 rounded-xl px-3 py-2 transition-colors"
                      onClick={() =>
                        setExpandedWeeks((prev) => ({ ...prev, [week]: !prev[week] }))
                      }
                    >
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-slate-500 uppercase">
                          Kalenderwoche
                        </span>
                        <span className="font-bold text-slate-800">
                          KW {week}{' '}
                          <span className="text-xs text-slate-500 font-normal">
                            ({monday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} –{' '}
                            {sunday.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })})
                          </span>
                        </span>

                        {/* KW-Logik: Arbeitszeit + Diff, Fahrzeit extra */}
                        <div className="mt-1 text-sm flex flex-col gap-0.5">

                          <div className="flex gap-4 items-center">
                            {/* Arbeitszeit (ohne Fahrzeit) */}
                            <span
                              className={`font-bold ${
                                workMinutes >= 38.5 * 60 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {formatTime(workMinutes)}
                            </span>

                            {/* Fehlstunden / Überstunden */}
                            <span
                              className={`font-bold ${
                                diff >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {diff >= 0 ? '+' : '-'}
                              {formatTime(Math.abs(diff))}
                            </span>
                          </div>

                          {/* Fahrzeit separat – nur wenn vorhanden */}
                          {driveMinutesKW > 0 && (
                            <div className="text-xs text-slate-500">
                              Fahrzeit: {formatTime(driveMinutesKW)}
                            </div>
                          )}

                        </div>


                      </div>

                      <ChevronRight
                        size={18}
                        className={`text-slate-500 transition-transform ${
                          expanded ? 'rotate-90' : ''
                        }`}
                      />
                    </button>

                    {/* WEEK ENTRIES */}
                    {expanded && (
                      <div className="mt-2 space-y-2">
                        {weekEntries.map((entry) => {
                          const d = new Date(entry.date);
                          const wd = d.toLocaleDateString('de-DE', { weekday: 'short' }).slice(0, 2);
                          const ds = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

                          const codeLabel =
                            entry.type === 'work'
                              ? WORK_CODES.find((c) => c.id === entry.code)?.label
                              : '';

                          return (
                            <div
                              key={entry.id}
                              onClick={() => startEdit(entry)}
                              className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between gap-3 active:scale-[0.99] transition-transform cursor-pointer"
                            >
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                {/* DATE BLOCK */}
                                <div
                                  className="text-white font-bold rounded-lg w-10 h-10 flex flex-col items-center justify-center flex-shrink-0 text-[10px] leading-none bg-slate-800"
                                >
                                  <span className="text-xs">{wd}</span>
                                  <span className="opacity-75">{ds}</span>
                                </div>

                                <div className="flex-1 min-w-0">
                                  {/* ZEITEN */}
                                  {entry.type === 'work' && (
                                    <div className="font-bold text-slate-900 text-sm">
                                      {entry.start} – {entry.end}{' '}
                                      {entry.pause > 0 ? (
                                        <span className="text-orange-500 text-xs">
                                          (Pause {entry.pause}m)
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 text-xs">
                                          (keine Pause)
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* PROJEKT */}
                                  {entry.project && (
                                    <p className="text-xs text-slate-500 truncate">
                                      {entry.project}
                                    </p>
                                  )}

                                  {/* CODE */}
                                  {codeLabel && (
                                    <p className="text-[11px] text-slate-600 font-medium truncate">
                                      {codeLabel}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* STUNDEN */}
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <div className="font-bold text-slate-700 text-sm">
                                  {formatTime(entry.netDuration)}
                                </div>

                                {/* DELETE BUTTON */}
                                <button
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    deleteEntry(entry.id);
                                  }}
                                  className="text-slate-300 hover:text-red-500 p-1"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* NEW ENTRY BUTTON */}
          <button
            onClick={startNewEntry}
            className="fixed bottom-6 right-6 bg-slate-900 hover:bg-slate-800 text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center active:scale-95 transition-all z-20"
          >
            <Plus size={28} />
          </button>
        </main>
      )}

      {/* ----------------------------- */}
      {/* ADD VIEW (Eintrag erstellen) */}
      {/* ----------------------------- */}
      {view === 'add' && (
        <main className="w-full p-3">
          <Card>
            <form onSubmit={saveEntry} className="p-4 space-y-5">

              {/* ENTRY TYPE SELECT */}
              <div className="bg-slate-100 p-1 rounded-xl grid grid-cols-4 gap-1">
                {/* Arbeit */}
                <button
                  type="button"
                  onClick={() => {
                    setEntryType('work');
                    setCode(WORK_CODES[0].id);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    entryType === 'work' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
                  }`}
                >
                  Arbeit
                </button>

                {/* Urlaub */}
                <button
                  type="button"
                  onClick={() => setEntryType('vacation')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    entryType === 'vacation' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Urlaub
                </button>

                {/* Krank */}
                <button
                  type="button"
                  onClick={() => setEntryType('sick')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    entryType === 'sick' ? 'bg-red-100 text-red-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Krank
                </button>

                {/* Fahrtzeit (Code 19) */}
                <button
                  type="button"
                  onClick={() => {
                    setEntryType('drive');
                    setCode(19);
                    setPauseDuration(0);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    entryType === 'drive' ? 'bg-orange-100 text-orange-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Fahrtzeit
                </button>
              </div>


              {/* DATE */}
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

              {/* WORK TYPE FIELDS */}
              {/* ARBEIT & FAHRTZEIT */}
              {(entryType === 'work' || entryType === 'drive') && (
                <>
                  {/* START / END */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Start</label>
                      <input
                        type="time"
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        step={900} // 15-Minuten-Schritte
                        className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Ende</label>
                      <input
                        type="time"
                        required
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        step={900}
                        className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none font-medium"
                      />
                    </div>
                  </div>

                  {/* PAUSE – nur bei normaler Arbeit */}
                  {entryType === 'work' && (
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
                  )}

                  {/* CODE / TÄTIGKEIT */}
                  {entryType === 'work' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">
                        Tätigkeit
                      </label>
                      <select
                        value={code}
                        onChange={(e) => setCode(Number(e.target.value))}
                        className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none font-medium"
                      >
                        {WORK_CODES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* TÄTIGKEIT bei FAHRTZEIT: fix 19 - Fahrzeit */}
                  {entryType === 'drive' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">
                        Tätigkeit
                      </label>
                      <div className="w-full p-3 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 text-sm font-medium">
                        19 - Fahrzeit
                      </div>
                    </div>
                  )}

                  {/* PROJECT / NOTIZ */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      {entryType === 'drive' ? 'Strecke / Notiz' : 'Projekt'}
                    </label>
                    <input
                      type="text"
                      value={project}
                      onChange={(e) => setProject(e.target.value)}
                      className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none"
                      placeholder="..."
                    />
                  </div>
                </>
              )}

              {/* URLAUB / KRANK */}
              {(entryType === 'vacation' || entryType === 'sick') && (
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
                      Für diesen Tag werden automatisch{' '}
                      {getDayOfWeek(formDate) === 5 ? '4,5h' : '8,5h'} angerechnet.
                    </p>
                  </div>
                </div>
              )}

              {/* BUTTONS */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setView('dashboard');
                    setEditingEntry(null);
                  }}
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

      {/* ----------------------------- */}
      {/* SETTINGS */}
      {/* ----------------------------- */}
      {view === 'settings' && (
        <main className="w-full p-4 space-y-6">

          {/* USER DATA */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="bg-slate-100 p-3 rounded-full">
                <User size={24} className="text-slate-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Benutzerdaten</h3>
                <p className="text-xs text-slate-400">Wird im PDF angezeigt</p>
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

          {/* THEME SELECTION (Dark disabled) */}
          <Card className="p-5 space-y-3">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <Sun size={18} className="text-orange-400" />
              <span>Design / Theme</span>
            </h3>
            <p className="text-sm text-slate-500">
              Dunkel & System sind noch in Arbeit.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {/* HELL (only active) */}
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

              {/* DISABLED BUTTONS */}
              <button
                disabled
                className="py-2 px-2 rounded-xl text-sm font-bold border border-slate-200 bg-slate-100 text-slate-400 opacity-50"
              >
                Dunkel
              </button>

              <button
                disabled
                className="py-2 px-2 rounded-xl text-sm font-bold border border-slate-200 bg-slate-100 text-slate-400 opacity-50"
              >
                System
              </button>
            </div>
          </Card>

          {/* EXPORT / IMPORT */}
          <Card className="p-5 space-y-3">
            <h3 className="font-bold text-slate-700">Daten sichern & wiederherstellen</h3>
            <p className="text-sm text-slate-500">
              Exportiert alle Einträge in eine Datei.
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

          {/* DANGER ZONE */}
          <Card className="p-5">
            <h3 className="font-bold text-red-600 mb-2">Gefahrenzone</h3>
            <p className="text-sm text-slate-500 mb-4">
              Hier kannst du alle Einträge löschen.
            </p>

            <button
              onClick={() => {
                if (confirm("Wirklich ALLE Einträge löschen?")) {
                  setEntries([]);
                }
              }}
              className="w-full py-3 border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50"
            >
              Alle Daten löschen
            </button>
          </Card>

          <p className="text-center text-xs text-slate-300">
            App Version 1.9.0
          </p>
        </main>
      )}
    </div>
  );
}
