// ---------------------------------------------
//  App.jsx – Version 1.8.7
//  TEIL 1/4 – Imports + Konstanten + Helper
// ---------------------------------------------

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  User,
} from "lucide-react";

import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

// ** Native DatePicker Plugin (Month-Year Mode) **
import { DatePicker } from "@capacitor-community/date-picker";

// PDF Generator
import html2pdf from "html2pdf.js";

// Logo
import KoglerLogo from "./assets/kogler_time_icon.png";

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
  { id: 190, label: "19 - An/Abreise" },

  // Neuer Code
  { id: 70, label: "70 - Büro" },
];

// Hilfs-Konstante für die Anzeige
const HOLIDAY_LABEL = "Gesetzlicher Feiertag";

// -------------------------------------------------------
// FEIERTAGE (ÖSTERREICH) + DATUMSFUNKTIONEN
// -------------------------------------------------------

const getHolidayData = (year) => {
  const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  // Oster-Berechnung (Gauss)
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

  // Alle Feiertage in Österreich mit Namen
  const holidays = {
    [`${year}-01-01`]: "Neujahr",
    [`${year}-01-06`]: "Heilige Drei Könige",
    [addDays(easterDate, 1)]: "Ostermontag",
    [`${year}-05-01`]: "Staatsfeiertag",
    [addDays(easterDate, 39)]: "Christi Himmelfahrt",
    [addDays(easterDate, 50)]: "Pfingstmontag",
    [addDays(easterDate, 60)]: "Fronleichnam",
    [`${year}-08-15`]: "Mariä Himmelfahrt",
    [`${year}-10-26`]: "Nationalfeiertag",
    [`${year}-11-01`]: "Allerheiligen",
    [`${year}-12-08`]: "Mariä Empfängnis",
    [`${year}-12-25`]: "Christtag",
    [`${year}-12-26`]: "Stefanitag",
  };

  return holidays;
};

// -------------------------------------------------------
// HELPER-FUNKTIONEN
// -------------------------------------------------------

const formatTime = (minutes) => {
  const abs = Math.max(0, Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
};

const formatSignedTime = (minutes) => {
  const sign = minutes > 0 ? "+" : minutes < 0 ? "-" : "";
  const abs = Math.abs(Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h ${m.toString().padStart(2, "0")}m`;
};

const parseTime = (timeStr) => {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

const generateTimeOptions = () => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      options.push(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
      );
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

const getDayOfWeek = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
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
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

// -------------------------------------------------------
// Blob → Base64 für Filesystem
// -------------------------------------------------------

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

// -------------------------------------------------------
// UI BASISKOMPONENTE
// -------------------------------------------------------

const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}
  >
    {children}
  </div>
);

// ---------------------------------------------
//  TEIL 2/4 – PrintReport Component (FINAL V4)
// ---------------------------------------------

const PrintReport = ({ entries, monthDate, employeeName, onClose }) => {
  const [filterMode, setFilterMode] = useState("month");
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper: Saldo formatieren (+HHh MMm)
  const formatSaldo = (minutes) => {
    const sign = minutes > 0 ? "+" : minutes < 0 ? "-" : "";
    const abs = Math.abs(Math.round(minutes));
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${sign}${h}h ${m.toString().padStart(2, "0")}m`;
  };

  // Gefilterte Einträge
  const filteredEntries = useMemo(() => {
    let list =
      filterMode === "month"
        ? [...entries]
        : entries.filter(
            (e) => getWeekNumber(new Date(e.date)) === Number(filterMode)
          );

    // Sortiert nach Datum + Startzeit
    list.sort((a, b) => {
      const da = new Date(a.date);
      const db = new Date(b.date);
      if (da.getTime() !== db.getTime()) return da - db;
      return (a.start || "").localeCompare(b.start || "");
    });

    return list;
  }, [entries, filterMode]);

  const availableWeeks = useMemo(() => {
    const w = new Set(entries.map((e) => getWeekNumber(new Date(e.date))));
    return Array.from(w).sort((a, b) => a - b);
  }, [entries]);

  // ---------------------------------------------
  //  BERECHNUNGEN: TAGES- & GESAMTSALDO
  // ---------------------------------------------
  const reportStats = useMemo(() => {
    let work = 0; // Bezahlt (Arbeit + Anreise)
    let vacation = 0;
    let sick = 0;
    let holiday = 0;
    let drive = 0; // Unbezahlt (Code 19)

    // Zeitraum ermitteln für exakte Soll-Berechnung
    let periodStart, periodEnd;

    if (filteredEntries.length > 0) {
      if (filterMode === "month") {
        periodStart = new Date(
          monthDate.getFullYear(),
          monthDate.getMonth(),
          1
        );
        periodEnd = new Date(
          monthDate.getFullYear(),
          monthDate.getMonth() + 1,
          0
        );
      } else {
        // KW Modus: Start/Ende der KW berechnen
        const d = new Date(filteredEntries[0].date);
        const day = d.getDay() || 7;
        periodStart = new Date(d);
        periodStart.setDate(d.getDate() - day + 1);
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodStart.getDate() + 6);
      }
    } else {
      // Fallback falls keine Einträge
      if (filterMode === "month") {
        periodStart = new Date(
          monthDate.getFullYear(),
          monthDate.getMonth(),
          1
        );
        periodEnd = new Date(
          monthDate.getFullYear(),
          monthDate.getMonth() + 1,
          0
        );
      } else {
        periodStart = new Date();
        periodEnd = new Date();
      }
    }

    // 1. IST-Zeiten summieren
    filteredEntries.forEach((e) => {
      if (e.type === "work") {
        if (e.code === 19) {
          drive += e.netDuration;
        } else {
          work += e.netDuration;
        }
      }
      if (e.type === "vacation") vacation += e.netDuration;
      if (e.type === "sick") sick += e.netDuration;
      if (e.type === "public_holiday") holiday += e.netDuration;
    });

    const totalIst = work + vacation + sick + holiday;

    // 2. SOLL-Zeit für den Zeitraum berechnen (Exakt wie in App)
    let totalTarget = 0;
    // Wir klonen das Startdatum, um die Loop nicht zu verfälschen
    let loopDate = new Date(periodStart);
    while (loopDate <= periodEnd) {
      const dow = loopDate.getDay();
      // Mo-Fr zählt zum Soll
      if (dow >= 1 && dow <= 5) {
        totalTarget += dow === 5 ? 270 : 510;
      }
      loopDate.setDate(loopDate.getDate() + 1);
    }

    return {
      work,
      vacation,
      sick,
      holiday,
      drive,
      totalIst,
      totalTarget,
      totalSaldo: totalIst - totalTarget,
    };
  }, [filteredEntries, monthDate, filterMode]);

  // ---------------------------------------------
  //  HELPER FÜR TAGESGRUPPIERUNG (ZEBRA & SALDO)
  // ---------------------------------------------
  const dayMetaMap = useMemo(() => {
    const map = {};
    let currentDateStr = "";
    let dayIndex = 0;
    const sums = {};

    // Summen bilden
    filteredEntries.forEach((e) => {
      if (!sums[e.date]) {
        sums[e.date] = { totalMinutes: 0 };
      }
      // Code 19 (Unbezahlt) zählt nicht zum Tagessaldo
      if (!(e.type === "work" && e.code === 19)) {
        sums[e.date].totalMinutes += e.netDuration;
      }
    });

    // Metadaten zuweisen
    filteredEntries.forEach((e, idx) => {
      if (e.date !== currentDateStr) {
        dayIndex++;
        currentDateStr = e.date;
      }
      const d = new Date(e.date);
      const dow = d.getDay();
      let target = 0;
      if (dow >= 1 && dow <= 4) target = 510;
      if (dow === 5) target = 270;

      const nextEntry = filteredEntries[idx + 1];
      const isLastOfDay = !nextEntry || nextEntry.date !== e.date;
      const balance = sums[e.date].totalMinutes - target;

      map[e.id] = {
        dayIndex,
        isEvenDay: dayIndex % 2 === 0,
        showBalance: isLastOfDay && target > 0, // Nur Arbeitstage haben Saldo
        balance: balance,
      };
    });
    return map;
  }, [filteredEntries]);

  // ---------------------------------------------
  //  PDF GENERIERUNG (Safe Mode & Unique Names)
  // ---------------------------------------------
  const handleDownloadPdf = async () => {
    try {
      setIsGenerating(true);
      const element = document.getElementById("report-to-print");
      if (!element) {
        alert("PDF-Element nicht gefunden.");
        setIsGenerating(false);
        return;
      }

      // Zeitraum ermitteln
      let start, end;
      if (filterMode === "month") {
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

      // Dateinamen generieren (jetzt mit Timestamp um Konflikte zu vermeiden!)
      const f2 = (d) => String(d.getDate()).padStart(2, "0");
      const fDate = (d) =>
        `${f2(d)}_${String(d.getMonth() + 1).padStart(2, "0")}`;
      const periodStr = `${fDate(start)}_bis_${f2(end)}`;
      const safeName = (employeeName || "Mitarbeiter")
        .trim()
        .replace(/\s+/g, "_");

      // Timestamp hinzufügen (z.B. _102345), damit der Name immer neu ist
      const timestamp = new Date().getTime().toString().slice(-6);
      const filename = `${safeName}_Stundenzettel_${periodStr}_${timestamp}.pdf`;

      const opt = {
        margin: 0,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      // 1. PDF Buffer erzeugen
      const worker = html2pdf().set(opt).from(element);

      if (!Capacitor.isNativePlatform()) {
        await worker.save();
        alert("PDF als Browser-Download erstellt.");
        setIsGenerating(false);
        return;
      }

      const pdfBlob = await worker.output("blob");
      const base64 = await blobToBase64(pdfBlob);

      // 2. Schreiben versuchen
      try {
        const result = await Filesystem.writeFile({
          path: filename,
          data: base64,
          directory: Directory.Documents,
          encoding: Encoding.BASE64,
          recursive: true, // Hilft manchmal auf Android
        });

        console.log("PDF gespeichert unter:", result.uri);
      } catch (writeError) {
        // Falls schreiben fehlschlägt, zeigen wir den genauen Fehler
        alert("Fehler beim Speichern: " + writeError.message);
        setIsGenerating(false);
        return;
      }

      // 3. Teilen versuchen
      let shareUrl;
      try {
        const uriResult = await Filesystem.getUri({
          path: filename,
          directory: Directory.Documents,
        });
        shareUrl = uriResult.uri || uriResult.path;
      } catch (uriError) {
        console.error("URI Fehler:", uriError);
      }

      if (shareUrl) {
        await Share.share({
          title: "Stundenzettel teilen",
          text: `Stundenzettel ${periodStr}`,
          url: shareUrl,
        });
      } else {
        alert("PDF gespeichert in Dokumente (Teilen nicht möglich).");
      }
    } catch (err) {
      console.error(err);
      alert("Genereller Fehler: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // ---------------------------------------------
  //  UI RENDER
  // ---------------------------------------------
  return (
    <div className="fixed inset-0 bg-slate-800 z-50 overflow-y-auto">
      {/* TOPBAR */}
      <div className="sticky top-0 bg-slate-900 text-white p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-xl z-50">
        <div className="flex items-center gap-4 w-full">
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-full"
          >
            <X />
          </button>
          <h2 className="font-bold flex-1 text-center mr-10 text-xl">
            Berichtsvorschau
          </h2>
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
            {isGenerating ? (
              <Loader className="animate-spin" size={18} />
            ) : (
              <Download size={18} />
            )}
            {isGenerating ? "Erstelle..." : "PDF"}
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
              <p className="text-sm font-bold text-slate-500 mt-1">
                Kogler Aufzugsbau
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium">Mitarbeiter: {employeeName}</p>
              <p className="text-slate-500 text-sm">
                Zeitraum:{" "}
                {monthDate.toLocaleDateString("de-DE", {
                  month: "long",
                  year: "numeric",
                })}
                {filterMode !== "month" && ` (KW ${filterMode})`}
              </p>
            </div>
          </div>

          {/* TABLE */}
          <table className="w-full text-sm text-left mb-8 border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-800 text-slate-500 uppercase text-xs">
                <th className="py-2 w-20">Datum</th>
                <th className="py-2 w-28">Zeit</th>
                <th className="py-2">Projekt</th>
                <th className="py-2 w-20">Code</th>
                <th className="py-2 w-16 text-right">Std.</th>
                <th className="py-2 w-16 text-right">Saldo</th>
              </tr>
            </thead>

            <tbody className="">
              {filteredEntries.map((e) => {
                const d = new Date(e.date);
                const wd = d
                  .toLocaleDateString("de-DE", { weekday: "short" })
                  .slice(0, 2);
                const ds = d.toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                });
                const meta = dayMetaMap[e.id] || {};

                let rowStyle = {};
                let rowClass = "break-inside-avoid border-b border-slate-100";
                if (e.type === "public_holiday") {
                  rowClass += " bg-blue-100/50";
                } else if (meta.isEvenDay) {
                  rowStyle = { backgroundColor: "#f8faff" };
                }

                let projectText = "";
                let codeText = "";
                let durationDisplay = formatTime(e.netDuration);
                let durationClass =
                  "py-2 text-right font-bold align-top text-slate-900";
                let timeCellContent = null;

                if (e.type === "work") {
                  projectText = e.project;
                  codeText =
                    WORK_CODES.find((c) => c.id === e.code)?.label || "";
                  if (e.code === 19) {
                    durationDisplay = "-";
                    durationClass =
                      "py-2 text-right font-medium align-top text-slate-400";
                  }
                  const pauseText =
                    e.pause > 0 ? `Pause: ${e.pause}m` : "Keine Pause";
                  const pauseClass =
                    e.pause > 0 ? "text-slate-500" : "text-slate-400 italic";

                  timeCellContent = (
                    <div className="flex flex-col justify-start">
                      <span className="font-bold text-slate-800 leading-tight">
                        {e.start} – {e.end}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-wide mt-0.5 ${pauseClass}`}
                      >
                        {pauseText}
                      </span>
                    </div>
                  );
                } else if (e.type === "public_holiday") {
                  timeCellContent = (
                    <span className="font-bold text-slate-800">Feiertag</span>
                  );
                  projectText = e.project || "Gesetzlicher Feiertag";
                  durationClass =
                    "py-2 text-right font-bold align-top text-blue-800";
                } else {
                  timeCellContent = <span className="text-slate-400">-</span>;
                  projectText = e.type === "vacation" ? "Urlaub" : "Krank";
                }

                return (
                  <tr key={e.id} className={rowClass} style={rowStyle}>
                    <td className="py-2 pl-2 font-medium align-top">
                      <span className="font-bold">{wd}</span>{" "}
                      <span className="text-slate-600">{ds}</span>
                    </td>
                    <td className="py-2 align-top">{timeCellContent}</td>
                    <td className="py-2 align-top">
                      <span
                        className={`font-medium ${
                          e.type === "public_holiday"
                            ? "text-blue-800"
                            : "text-slate-700"
                        }`}
                      >
                        {projectText}
                      </span>
                    </td>
                    <td className="py-2 align-top text-xs text-slate-500">
                      {codeText}
                    </td>
                    <td className={durationClass}>{durationDisplay}</td>
                    <td className="py-2 pr-2 text-right align-top font-bold text-xs">
                      {meta.showBalance ? (
                        <span
                          className={
                            meta.balance >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {formatSaldo(meta.balance)}
                        </span>
                      ) : null}
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
                <span>Arbeitszeit (inkl. Anreise):</span>
                <span className="font-bold">
                  {formatTime(reportStats.work)}
                </span>
              </div>
              <div className="flex justify-between text-sm mb-1 text-blue-700">
                <span>Feiertage:</span>
                <span className="font-bold">
                  {formatTime(reportStats.holiday)}
                </span>
              </div>
              <div className="flex justify-between text-sm mb-1 text-blue-700">
                <span>Urlaub:</span>
                <span className="font-bold">
                  {formatTime(reportStats.vacation)}
                </span>
              </div>
              <div className="flex justify-between text-sm mb-1 text-red-700">
                <span>Krankenstand:</span>
                <span className="font-bold">
                  {formatTime(reportStats.sick)}
                </span>
              </div>

              {reportStats.drive > 0 && (
                <div className="flex justify-between text-sm mb-1 text-slate-400 italic mt-2">
                  <span>Fahrtzeit (unbezahlt):</span>
                  <span>{formatTime(reportStats.drive)}</span>
                </div>
              )}

              {/* GESAMT IST */}
              <div className="flex justify-between text-base mt-2 pt-2 border-t border-slate-300 font-bold">
                <span>Gesamt (IST):</span>
                <span>{formatTime(reportStats.totalIst)}</span>
              </div>

              {/* SOLL */}
              <div className="flex justify-between text-sm mt-1 text-slate-500 font-medium">
                <span>Sollzeit (SOLL):</span>
                <span>{formatTime(reportStats.totalTarget)}</span>
              </div>

              {/* SALDO */}
              <div className="flex justify-between text-base mt-2 pt-2 border-t border-slate-300 font-bold">
                <span>Saldo:</span>
                <span
                  className={
                    reportStats.totalSaldo >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {formatSaldo(reportStats.totalSaldo)}
                </span>
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
    const saved = localStorage.getItem("kogler_entries");
    return saved ? JSON.parse(saved) : [];
  });

  const [userData, setUserData] = useState(() => {
    const saved = localStorage.getItem("kogler_user");
    return saved ? JSON.parse(saved) : { name: "Markus Mustermann" };
  });

  // Theme – Dark/System disabled, Hell aktiv
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("kogler_theme");
    return saved || "light";
  });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("dashboard");
  const [editingEntry, setEditingEntry] = useState(null);
  const fileInputRef = useRef(null);

  // -------------------------------------------------
  //  BACK BUTTON HANDLING (Android)
  // -------------------------------------------------
  useEffect(() => {
    const handler = CapacitorApp.addListener("backButton", () => {
      if (view !== "dashboard") {
        setView("dashboard");
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
    localStorage.setItem("kogler_theme", theme);
    const root = document.documentElement;
    root.classList.remove("dark");
  }, [theme]);

  const isDark = false; // DarkMode deaktiviert

  // ... bestehende States ...

  // -------------------------------------------------
  //  AUTO-BACKUP STATE
  // -------------------------------------------------
  const [autoBackup, setAutoBackup] = useState(() => {
    const saved = localStorage.getItem("kogler_auto_backup");
    return saved === "true"; // Standard ist false, wenn noch nie gesetzt
  });

  // Speichern der Einstellung
  useEffect(() => {
    localStorage.setItem("kogler_auto_backup", autoBackup);
  }, [autoBackup]);

  // -------------------------------------------------
  //  AUTO-BACKUP LOGIK (Einmal täglich)
  // -------------------------------------------------
  useEffect(() => {
    const performAutoBackup = async () => {
      // 1. Abbruchbedingungen
      if (!autoBackup) return; // Feature deaktiviert
      if (!Capacitor.isNativePlatform()) return; // Im Browser macht Auto-Save ins Dateisystem wenig Sinn/Probleme
      if (entries.length === 0) return; // Nichts zu sichern

      const today = new Date().toISOString().split("T")[0];
      const lastBackupDate = localStorage.getItem("kogler_last_backup_date");

      // 2. Prüfen: Wurde heute schon gesichert?
      if (lastBackupDate === today) {
        return;
      }

      // 3. Backup durchführen
      try {
        const payload = {
          user: userData,
          entries,
          exportedAt: new Date().toISOString(),
          note: "Automatische Sicherung",
        };

        const json = JSON.stringify(payload, null, 2);
        const fileName = `kogler_autobackup_${today}.json`;

        await Filesystem.writeFile({
          path: fileName,
          data: json,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });

        // 4. Merken, dass wir heute fertig sind
        localStorage.setItem("kogler_last_backup_date", today);
        console.log("Auto-Backup erfolgreich erstellt:", fileName);
      } catch (err) {
        console.error("Fehler beim Auto-Backup:", err);
      }
    };

    // Wir geben dem System kurz Zeit, bevor wir prüfen (Debounce nicht zwingend, aber gut bei App Start)
    const timer = setTimeout(() => {
      performAutoBackup();
    }, 2000);

    return () => clearTimeout(timer);
  }, [entries, userData, autoBackup]);

  // -------------------------------------------------
  //  FORM STATES
  // -------------------------------------------------
  const [formDate, setFormDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [entryType, setEntryType] = useState("work");
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("16:30");
  const [project, setProject] = useState("");
  const [code, setCode] = useState(WORK_CODES[0].id);
  const [pauseDuration, setPauseDuration] = useState(30);

  useEffect(() => {
    localStorage.setItem("kogler_entries", JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem("kogler_user", JSON.stringify(userData));
  }, [userData]);

  // -------------------------------------------------
  //  MONATSANSICHT & FEIERTAGS-INJEKTION
  // -------------------------------------------------
  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth();

  // 1. Feiertags-Daten holen (Map: Datum -> Name)
  const holidayMap = useMemo(() => getHolidayData(viewYear), [viewYear]);

  // Array von Datums-Strings für einfache Checks (z.B. includes)
  const holidays = useMemo(() => Object.keys(holidayMap), [holidayMap]);

  // 2. Alle Einträge des Monats + Automatische Feiertage
  const entriesWithHolidays = useMemo(() => {
    // A) Echte Einträge filtern
    const realEntries = entries.filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
    });

    // B) Feiertage als "virtuelle Einträge" generieren
    const holidayEntries = [];
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(
        2,
        "0"
      )}-${String(d).padStart(2, "0")}`;

      // Ist es ein Feiertag?
      if (holidays.includes(dateStr)) {
        const dow = getDayOfWeek(dateStr);
        // Nur Mo-Fr (Wochenende ignorieren wir)
        if (dow >= 1 && dow <= 5) {
          // Hier holen wir uns den echten Namen aus der Map!
          const holidayName = holidayMap[dateStr] || "Gesetzlicher Feiertag";

          holidayEntries.push({
            id: `auto-holiday-${dateStr}`,
            type: "public_holiday",
            date: dateStr,
            start: null,
            end: null,
            pause: 0,
            project: holidayName, // <--- Der Name wird als Projekt eingetragen
            code: null,
            netDuration: dow === 5 ? 270 : 510,
          });
        }
      }
    }

    // C) Zusammenfügen & Sortieren
    return [...realEntries, ...holidayEntries].sort((a, b) => {
      const da = new Date(a.date);
      const db = new Date(b.date);
      if (da.getTime() !== db.getTime()) return db - da;
      return 0;
    });
  }, [entries, viewYear, viewMonth, holidays, holidayMap]);

  // -------------------------------------------------
  //  KW Gruppierung (Basierend auf der neuen Liste!)
  // -------------------------------------------------
  const groupedByWeek = useMemo(() => {
    const map = new Map();

    entriesWithHolidays.forEach((e) => {
      const w = getWeekNumber(new Date(e.date));
      if (!map.has(w)) map.set(w, []);
      map.get(w).push(e);
    });

    const arr = Array.from(map.entries());
    arr.forEach(([w, list]) => {
      list.sort((a, b) => new Date(b.date) - new Date(a.date));
    });

    arr.sort((a, b) => b[0] - a[0]);
    return arr;
  }, [entriesWithHolidays]);

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
        mode: "date",
        locale: "de-AT",
        theme: "light",
        format: "yyyy-MM",
        presentation: "date",
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
  //  ZIELZEITEN BERECHNEN (INKL. FEIERTAGSGUTSCHRIFT)
  // -------------------------------------------------

  const stats = useMemo(() => {
    let actualMinutes = 0;
    let driveMinutes = 0;
    let holidayMinutes = 0;

    // Wir iterieren über die NEUE Liste (die auch die Feiertage enthält)
    entriesWithHolidays.forEach((e) => {
      if (e.type === "work") {
        if (e.code === 19) {
          // Reine Fahrzeit (Code 19) -> zählt nicht zum Soll/Ist
          driveMinutes += e.netDuration;
        } else {
          // Normale Arbeit (inkl. An/Abreise Code 190)
          actualMinutes += e.netDuration;
        }
      } else if (e.type === "public_holiday") {
        // Feiertag aus der Liste zählen
        holidayMinutes += e.netDuration;
      } else {
        // Urlaub / Krank -> zählt als Arbeitszeit
        actualMinutes += e.netDuration;
      }
    });

    // Soll berechnen (für den ganzen Monat)
    // Da Feiertage jetzt als "Eintrag" existieren (IST-Zeit),
    // bleibt das SOLL für jeden Wochentag ganz normal bestehen (38,5h Woche).
    const days = new Date(viewYear, viewMonth + 1, 0).getDate();
    let targetMinutes = 0;

    for (let d = 1; d <= days; d++) {
      const checkDate = new Date(viewYear, viewMonth, d);
      const dow = checkDate.getDay();
      // Mo(1) bis Fr(5) zählen zum Soll
      if (dow >= 1 && dow <= 5) {
        targetMinutes += dow === 5 ? 270 : 510;
      }
    }

    return { actualMinutes, targetMinutes, driveMinutes, holidayMinutes };
  }, [entriesWithHolidays, viewYear, viewMonth]);

  // Saldo berechnen: (Echte Arbeit + Feiertagsstunden) - Soll
  const totalCredited = stats.actualMinutes + stats.holidayMinutes;
  const overtime = totalCredited - stats.targetMinutes;

  const progressPercent = Math.min(
    100,
    (totalCredited / (stats.targetMinutes || 1)) * 100
  );

  // -------------------------------------------------
  //  EINTRAG ERSTELLEN + SPEICHERN
  // -------------------------------------------------
  const changeDate = (days) => {
    const d = new Date(formDate);
    d.setDate(d.getDate() + days);
    setFormDate(d.toISOString().split("T")[0]);
  };

  const startNewEntry = () => {
    setEditingEntry(null);
    setEntryType("work");
    setFormDate(new Date().toISOString().split("T")[0]);
    setStartTime("06:00");
    setEndTime("16:30");
    setPauseDuration(30);
    setProject("");
    setCode(WORK_CODES[0].id);
    setView("add");
  };

  const startEdit = (entry) => {
    setEditingEntry(entry);

    const isDrive = entry.type === "work" && entry.code === 19;
    const effectiveType = isDrive ? "drive" : entry.type;

    setEntryType(effectiveType);
    setFormDate(entry.date);

    if (entry.type === "work") {
      setStartTime(entry.start || "06:00");
      setEndTime(entry.end || "16:30");
      setPauseDuration(isDrive ? 0 : entry.pause ?? 0);
      setCode(entry.code ?? WORK_CODES[0].id);
      setProject(entry.project || "");
    } else {
      setPauseDuration(0);
      setProject("");
    }

    setView("add");
  };

  const saveEntry = (e) => {
    e.preventDefault();

    const isDrive = entryType === "drive";

    let net = 0;
    let label = "";

    if (entryType === "work" || isDrive) {
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
      label = entryType === "vacation" ? "Urlaub" : "Krank";
    }

    if (net < 0) net = 0;

    // Fahrtzeit wird als "work" gespeichert, aber mit Code 19 & Pause 0
    const storedType = isDrive ? "work" : entryType;
    const usedCode = isDrive ? 19 : code;
    const usedPause = storedType === "work" ? (isDrive ? 0 : pauseDuration) : 0;

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
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert("Export als Browser-Download erstellt.");
        return;
      }

      // Native
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: json,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });

      let shareUrl = writeResult.uri;
      try {
        const uri = await Filesystem.getUri({
          path: fileName,
          directory: Directory.Documents,
        });
        if (uri?.uri) shareUrl = uri.uri;
      } catch (err) {}

      await Share.share({
        title: "Zeiterfassung exportieren",
        text: "Exportierte Zeiterfassungsdaten",
        url: shareUrl,
      });
    } catch (err) {
      alert("Fehler beim Export.");
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

        alert("Daten erfolgreich importiert.");
      } catch (err) {
        alert("Import fehlgeschlagen.");
      } finally {
        event.target.value = "";
      }
    };

    reader.readAsText(file, "utf-8");
  };

  const triggerImport = () => fileInputRef.current?.click();

  // -------------------------------------------------
  //  BERICHTS-VIEW
  // -------------------------------------------------
  if (view === "report") {
    return (
      <PrintReport
        entries={entriesWithHolidays}
        monthDate={currentDate}
        employeeName={userData.name}
        onClose={() => setView("dashboard")}
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
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {view !== "dashboard" ? (
              <button
                onClick={() => {
                  setView("dashboard");
                  setEditingEntry(null);
                }}
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
              <h1 className="font-bold text-lg leading-tight">Stundenzettel</h1>
              {view === "dashboard" && (
                <p className="text-xs text-slate-400">Kogler Aufzugsbau</p>
              )}
            </div>
          </div>

          {/* Settings & Report */}
          {view === "dashboard" && (
            <div className="flex gap-2">
              <button
                onClick={() => setView("settings")}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Settings size={18} className="text-slate-300" />
              </button>

              <button
                onClick={() => setView("report")}
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
      {view === "dashboard" && (
        <main className="w-full p-3 space-y-4">
          {/* MONTH SELECTOR */}
          <div
            className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-2 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
            onClick={openMonthPicker}
          >
            <button className="p-2 hover:bg-slate-100 rounded-lg">
              <ChevronLeft
                size={20}
                onClick={(e) => {
                  e.stopPropagation();
                  changeMonth(-1);
                }}
              />
            </button>

            <span className="font-bold text-slate-700 text-base">
              {currentDate.toLocaleDateString("de-DE", {
                month: "long",
                year: "numeric",
              })}
            </span>

            <button className="p-2 hover:bg-slate-100 rounded-lg">
              <ChevronRight
                size={20}
                onClick={(e) => {
                  e.stopPropagation();
                  changeMonth(1);
                }}
              />
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
                <div
                  className={`text-right ${
                    overtime >= 0 ? "text-green-600" : "text-orange-600"
                  }`}
                >
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
                    overtime >= 0 ? "bg-green-500" : "bg-orange-500"
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
                // 1. ARBEITSZEIT BERECHNEN (Jetzt viel einfacher!)
                let workMinutes = 0; // Alles was zählt (Arbeit + Urlaub + Krank + Feiertag)
                let driveMinutesKW = 0;

                weekEntries.forEach((e) => {
                  // Fahrzeit Code 19 ignorieren wir für die Summe
                  if (e.type === "work" && e.code === 19) {
                    driveMinutesKW += e.netDuration;
                  } else {
                    // Alles andere (inkl. public_holiday) zählt zum IST
                    workMinutes += e.netDuration;
                  }
                });

                // Dynamisches Soll berechnen (wie vorhin besprochen)
                const anyDate = new Date(weekEntries[0].date);
                const currentDay = anyDate.getDay() || 7;
                const monday = new Date(anyDate);
                monday.setDate(anyDate.getDate() - (currentDay - 1));
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);

                // Soll berechnen (Nur Tage im Monat zählen)
                let dynamicTargetMinutes = 0;
                for (let i = 0; i < 5; i++) {
                  const checkDate = new Date(monday);
                  checkDate.setDate(monday.getDate() + i);
                  if (
                    checkDate.getMonth() === viewMonth &&
                    checkDate.getFullYear() === viewYear
                  ) {
                    // Feiertage erhöhen AUCH das Soll (werden durch den Eintrag ausgeglichen)
                    dynamicTargetMinutes += i === 4 ? 270 : 510;
                  }
                }

                const diff = workMinutes - dynamicTargetMinutes;
                const expanded = expandedWeeks[week];

                // Tage gruppieren
                const daysMap = new Map();
                weekEntries.forEach((e) => {
                  if (!daysMap.has(e.date)) daysMap.set(e.date, []);
                  daysMap.get(e.date).push(e);
                });
                const sortedDays = Array.from(daysMap.entries()).sort(
                  (a, b) => new Date(b[0]) - new Date(a[0])
                );

                return (
                  <div key={week} className="mb-3">
                    {/* WEEK HEADER */}
                    <button
                      className="w-full flex items-center justify-between bg-slate-100 hover:bg-slate-200 rounded-xl px-3 py-2 transition-colors"
                      onClick={() =>
                        setExpandedWeeks((prev) => ({
                          ...prev,
                          [week]: !prev[week],
                        }))
                      }
                    >
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-slate-500 uppercase">
                          Kalenderwoche
                        </span>
                        <span className="font-bold text-slate-800">
                          KW {week}{" "}
                          <span className="text-xs text-slate-500 font-normal">
                            (
                            {monday.toLocaleDateString("de-DE", {
                              day: "2-digit",
                              month: "2-digit",
                            })}{" "}
                            –{" "}
                            {sunday.toLocaleDateString("de-DE", {
                              day: "2-digit",
                              month: "2-digit",
                            })}
                            )
                          </span>
                        </span>

                        <div className="mt-1 text-sm flex flex-col gap-0.5">
                          <div className="flex gap-4 items-center">
                            <span
                              className={`font-bold ${
                                workMinutes >= dynamicTargetMinutes
                                  ? "text-green-600"
                                  : "text-slate-700"
                              }`}
                            >
                              {formatTime(workMinutes)}
                            </span>
                            <span
                              className={`font-bold ${
                                diff >= 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {diff >= 0 ? "+" : "-"}
                              {formatTime(Math.abs(diff))}
                            </span>
                          </div>
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
                          expanded ? "rotate-90" : ""
                        }`}
                      />
                    </button>

                    {/* WEEK CONTENT */}
                    {expanded && (
                      <div className="mt-2 space-y-3">
                        {sortedDays.map(([dateStr, dayEntries]) => {
                          // Tagessumme (Code 19 ignorieren)
                          const daySum = dayEntries.reduce((acc, curr) => {
                            if (curr.type === "work" && curr.code === 19)
                              return acc;
                            return acc + curr.netDuration;
                          }, 0);

                          const d = new Date(dateStr);
                          const wd = d
                            .toLocaleDateString("de-DE", { weekday: "short" })
                            .slice(0, 2);
                          const ds = d.toLocaleDateString("de-DE", {
                            day: "2-digit",
                            month: "2-digit",
                          });

                          // Sortieren
                          const sortedEntries = [...dayEntries].sort((a, b) =>
                            (a.start || "").localeCompare(b.start || "")
                          );

                          return (
                            <div
                              key={dateStr}
                              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                            >
                              <div className="flex">
                                {/* LINKS: Datum */}
                                <div className="bg-slate-800 w-12 flex flex-col items-center justify-center text-white flex-shrink-0">
                                  <span className="text-xs font-bold opacity-80">
                                    {wd}
                                  </span>
                                  <span className="text-sm font-bold">
                                    {ds}
                                  </span>
                                </div>

                                {/* MITTE: Liste */}
                                <div className="flex-1 min-w-0">
                                  {sortedEntries.map((entry, idx) => {
                                    // Label Logik
                                    let codeLabel = "";
                                    let timeLabel = "";

                                    if (entry.type === "work") {
                                      timeLabel = `${entry.start} - ${entry.end}`;
                                      codeLabel = WORK_CODES.find(
                                        (c) => c.id === entry.code
                                      )?.label;
                                    } else if (
                                      entry.type === "public_holiday"
                                    ) {
                                      timeLabel = "Feiertag";
                                      codeLabel = "Bezahlt frei";
                                    } else {
                                      timeLabel = "Ganztags";
                                      codeLabel =
                                        entry.type === "vacation"
                                          ? "Urlaub"
                                          : "Krank";
                                    }

                                    // Hintergrundfarbe für Feiertag
                                    const rowBg =
                                      entry.type === "public_holiday"
                                        ? "bg-blue-50/50"
                                        : "hover:bg-slate-50 active:bg-slate-100";

                                    return (
                                      <div
                                        key={entry.id}
                                        // Nur klickbar wenn KEIN Feiertag (Auto-generated)
                                        onClick={() =>
                                          entry.type !== "public_holiday" &&
                                          startEdit(entry)
                                        }
                                        className={`p-3 flex justify-between items-start gap-3 transition-colors cursor-pointer ${rowBg} ${
                                          idx < sortedEntries.length - 1
                                            ? "border-b border-slate-100"
                                            : ""
                                        }`}
                                      >
                                        <div className="min-w-0 flex-1 flex flex-col gap-1">
                                          {/* Zeile 1: Uhrzeit / Typ */}
                                          <div
                                            className={`font-bold text-sm leading-none pt-0.5 ${
                                              entry.type === "public_holiday"
                                                ? "text-blue-600"
                                                : "text-slate-900"
                                            }`}
                                          >
                                            {timeLabel}
                                          </div>

                                          {/* Zeile 2: Projekt / Name */}
                                          <div className="text-sm text-slate-700 font-medium leading-tight break-words">
                                            {entry.project}
                                          </div>

                                          {/* Zeile 3: Code */}
                                          {codeLabel && (
                                            <div className="text-xs text-slate-500 leading-tight">
                                              {codeLabel}
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-2 pl-2 border-l border-slate-100 ml-1 pt-0.5">
                                          <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">
                                            {formatTime(entry.netDuration)}
                                          </span>

                                          {/* DELETE BUTTON: Nur wenn KEIN Feiertag */}
                                          {entry.type !== "public_holiday" && (
                                            <button
                                              onClick={(ev) => {
                                                ev.stopPropagation();
                                                deleteEntry(entry.id);
                                              }}
                                              className="text-slate-300 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                                            >
                                              <Trash2 size={16} />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* RECHTS: Tagessumme */}
                                <div className="bg-slate-50 w-20 border-l border-slate-200 flex flex-col items-center justify-center flex-shrink-0 px-1">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">
                                    Gesamt
                                  </span>
                                  <span className="font-bold text-slate-800 whitespace-nowrap text-sm">
                                    {formatTime(daySum)}
                                  </span>
                                </div>
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
      {view === "add" && (
        <main className="w-full p-3">
          <Card>
            <form onSubmit={saveEntry} className="p-4 space-y-5">
              {/* ENTRY TYPE SELECT */}
              <div className="flex flex-col gap-2">
                {/* HAUPT-AUSWAHL */}
                <div className="bg-slate-100 p-1 rounded-xl grid grid-cols-4 gap-1">
                  {/* Arbeit */}
                  <button
                    type="button"
                    onClick={() => {
                      setEntryType("work");
                      setCode(WORK_CODES[0].id);
                    }}
                    className={`py-2 rounded-lg text-xs font-bold transition-all ${
                      entryType === "work" && code !== 190 // Nicht markieren wenn An/Abreise aktiv
                        ? "bg-white shadow text-slate-900"
                        : "text-slate-500"
                    }`}
                  >
                    Arbeit
                  </button>

                  {/* Urlaub */}
                  <button
                    type="button"
                    onClick={() => setEntryType("vacation")}
                    className={`py-2 rounded-lg text-xs font-bold transition-all ${
                      entryType === "vacation"
                        ? "bg-blue-100 text-blue-700 shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    Urlaub
                  </button>

                  {/* Krank */}
                  <button
                    type="button"
                    onClick={() => setEntryType("sick")}
                    className={`py-2 rounded-lg text-xs font-bold transition-all ${
                      entryType === "sick"
                        ? "bg-red-100 text-red-700 shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    Krank
                  </button>

                  {/* Fahrtzeit (Button aktiviert Sub-Auswahl) */}
                  <button
                    type="button"
                    onClick={() => {
                      // Standardmäßig erstmal "drive" (unbezahlt) vorselektieren oder nur den Modus wechseln
                      setEntryType("drive");
                      setCode(19);
                      setPauseDuration(0);
                    }}
                    className={`py-2 rounded-lg text-xs font-bold transition-all ${
                      entryType === "drive" || code === 190
                        ? "bg-orange-100 text-orange-700 shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    Fahrt
                  </button>
                </div>

                {/* SUB-AUSWAHL FÜR FAHRTZEIT (Nur sichtbar wenn Fahrt oder An/Abreise gewählt) */}
                {(entryType === "drive" || code === 190) && (
                  <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* OPTION 1: AN/ABREISE (BEZAHLT) */}
                    <button
                      type="button"
                      onClick={() => {
                        setEntryType("work"); // WICHTIG: Typ ist "work", damit es zählt
                        setCode(190); // ID 190 = An/Abreise
                        setPauseDuration(0); // Keine Pause bei Fahrt
                        setProject("");
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 ${
                        code === 190
                          ? "bg-green-100 border-green-200 text-green-800 ring-2 ring-green-500 ring-offset-1"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      <span>An/Abreise</span>
                      <span className="text-[10px] uppercase bg-green-200 px-1 rounded text-green-800">
                        Bezahlt
                      </span>
                    </button>

                    {/* OPTION 2: REINE FAHRT (UNBEZAHLT) */}
                    <button
                      type="button"
                      onClick={() => {
                        setEntryType("drive"); // Typ "drive" wird ignoriert in Summen
                        setCode(19); // ID 19 = Unbezahlt
                        setPauseDuration(0);
                        setProject("");
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 ${
                        entryType === "drive" && code === 19
                          ? "bg-orange-100 border-orange-200 text-orange-800 ring-2 ring-orange-500 ring-offset-1"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      <span>Fahrtzeit</span>
                      <span className="text-[10px] uppercase bg-slate-200 px-1 rounded text-slate-600">
                        Unbezahlt
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* DATE */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Datum
                </label>

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
              {/* ARBEIT & FAHRTZEIT (Bezahlt Code 190 oder Unbezahlt Code 19) */}
              {(entryType === "work" || entryType === "drive") && (
                <>
                  {/* START / END */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">
                        Start
                      </label>
                      <input
                        type="time"
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        step={900}
                        className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">
                        Ende
                      </label>
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

                  {/* PAUSE – nur bei normaler Arbeit (NICHT bei An/Abreise Code 190) */}
                  {entryType === "work" && code !== 190 && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">
                        Pause
                      </label>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPauseDuration(0)}
                          className={`flex-1 p-3 rounded-lg border text-sm font-bold ${
                            pauseDuration === 0
                              ? "border-orange-500 bg-orange-50 text-orange-700"
                              : "border-slate-200 bg-white text-slate-500"
                          }`}
                        >
                          Keine
                        </button>

                        <button
                          type="button"
                          onClick={() => setPauseDuration(30)}
                          className={`flex-1 p-3 rounded-lg border text-sm font-bold ${
                            pauseDuration === 30
                              ? "border-orange-500 bg-orange-50 text-orange-700"
                              : "border-slate-200 bg-white text-slate-500"
                          }`}
                        >
                          30 Min
                        </button>
                      </div>
                    </div>
                  )}

                  {/* CODE / TÄTIGKEIT - Dropdown nur bei normaler Arbeit */}
                  {entryType === "work" && code !== 190 && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">
                        Tätigkeit
                      </label>
                      <select
                        value={code}
                        onChange={(e) => setCode(Number(e.target.value))}
                        className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none font-medium"
                      >
                        {WORK_CODES.filter(
                          (c) => c.id !== 190 && c.id !== 19
                        ).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* TÄTIGKEIT FIXIERT: Wenn Fahrtzeit (Drive) ODER An/Abreise (Code 190) */}
                  {(entryType === "drive" || code === 190) && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">
                        Tätigkeit
                      </label>
                      <div
                        className={`w-full p-3 border rounded-lg text-sm font-medium ${
                          code === 190
                            ? "bg-green-50 border-green-200 text-green-800" // Grün für Bezahlt
                            : "bg-orange-50 border-orange-200 text-orange-800" // Orange für Unbezahlt
                        }`}
                      >
                        {code === 190
                          ? "19 - An/Abreise (Bezahlt)"
                          : "19 - Fahrzeit (Unbezahlt)"}
                      </div>
                    </div>
                  )}

                  {/* PROJECT / NOTIZ - Label passt sich an */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      {entryType === "drive" || code === 190
                        ? "Strecke / Notiz"
                        : "Projekt"}
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

              {/* BUTTONS */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setView("dashboard");
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
      {view === "settings" && (
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
              <label className="text-xs font-bold text-slate-500 uppercase">
                Dein Name
              </label>
              <input
                type="text"
                value={userData.name}
                onChange={(e) =>
                  setUserData({ ...userData, name: e.target.value })
                }
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
                onClick={() => setTheme("light")}
                className={`py-2 px-2 rounded-xl text-sm font-bold border ${
                  theme === "light"
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-slate-200 bg-slate-50 text-slate-600"
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

          {/* EXPORT / IMPORT & AUTO-BACKUP */}
          <Card className="p-5 space-y-3">
            <h3 className="font-bold text-slate-700">Daten & Backup</h3>

            {/* NEU: AUTO BACKUP SCHALTER */}
            <div className="flex items-center justify-between bg-slate-100 p-3 rounded-xl mb-2">
              <div>
                <span className="block font-bold text-sm text-slate-800">
                  Automatisches Backup
                </span>
                <span className="block text-xs text-slate-500">
                  Speichert 1x täglich lokal.
                </span>
              </div>
              <button
                onClick={() => {
                  if (!autoBackup) {
                    // Datum zurücksetzen, damit beim Einschalten sofort gesichert wird
                    localStorage.removeItem("kogler_last_backup_date");
                  }
                  setAutoBackup(!autoBackup);
                }}
                className={`w-12 h-7 rounded-full transition-colors flex items-center px-1 ${
                  autoBackup ? "bg-green-500" : "bg-slate-300"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                    autoBackup ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <p className="text-sm text-slate-500">
              Manueller Export aller Einträge in eine Datei.
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
            App Version 2.0.1
          </p>
        </main>
      )}
    </div>
  );
}
