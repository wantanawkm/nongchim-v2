import React, { useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import {
  BarChart3,
  Calendar,
  Download,
  Eye,
  FileText,
  Footprints,
  MapPin,
  Phone,
  Printer,
  TrendingUp,
} from 'lucide-react';
import {
  type ClinicSettings,
  type DrugFormularyItem,
  type Patient,
} from '../types';
import {
  SIX_MONTH_TREND_DATA,
  VILLAGES,
  formatThaiDateBE,
  getTodayIsoDate,
} from '../data/initialData';

interface NcdDashboardViewProps {
  patients: Patient[];
  clinicSettings: ClinicSettings;
  drugs?: DrugFormularyItem[];
}

const REPORT_MONTHS: {
  label: string;
  shortMonth: string;
  htPctOverride?: number;
  dmPctOverride?: number;
  visitsCount: number;
}[] = [
  { label: 'ตุลาคม 2569', shortMonth: 'ต.ค. 69', visitsCount: 134 },
  {
    label: 'กันยายน 2569',
    shortMonth: 'ก.ย. 69',
    htPctOverride: 67.2,
    dmPctOverride: 55.8,
    visitsCount: 129,
  },
  {
    label: 'สิงหาคม 2569',
    shortMonth: 'ส.ค. 69',
    htPctOverride: 64.5,
    dmPctOverride: 53.0,
    visitsCount: 124,
  },
  {
    label: 'กรกฎาคม 2569',
    shortMonth: 'ก.ค. 69',
    htPctOverride: 62.8,
    dmPctOverride: 51.4,
    visitsCount: 121,
  },
  {
    label: 'มิถุนายน 2569',
    shortMonth: 'มิ.ย. 69',
    htPctOverride: 60.4,
    dmPctOverride: 49.1,
    visitsCount: 118,
  },
  {
    label: 'พฤษภาคม 2569',
    shortMonth: 'พ.ค. 69',
    htPctOverride: 58.2,
    dmPctOverride: 47.5,
    visitsCount: 112,
  },
];

async function captureReportAsPng(element: HTMLElement): Promise<string> {
  try {
    return await toPng(element, {
      quality: 1.0,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
    });
  } catch {
    return await toPng(element, {
      quality: 1.0,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      skipFonts: true,
    });
  }
}

export const NcdDashboardView: React.FC<NcdDashboardViewProps> = ({
  patients,
  clinicSettings,
  drugs = [],
}) => {
  const [reportScope, setReportScope] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string>('ตุลาคม 2569');
  const [selectedYear, setSelectedYear] = useState<string>('ปีงบประมาณ พ.ศ. 2569');
  const [isExportingPdf, setIsExportingPdf] = useState<'monthly' | 'yearly' | null>(
    null
  );

  const reportRef = useRef<HTMLDivElement | null>(null);

  const activeMonthMeta =
    REPORT_MONTHS.find((m) => m.label === selectedMonth) || REPORT_MONTHS[0];

  // คำนวณตัวชี้วัดตามเกณฑ์ Service Plan NCD กระทรวงสาธารณสุข
  const ncdMetrics = useMemo(() => {
    const htPatients = patients.filter(
      (p) => p.diseaseGroup === 'HT' || p.diseaseGroup === 'DM+HT'
    );
    const htControlledLive = htPatients.filter(
      (p) => p.systolic < 140 && p.diastolic < 90 && p.controlStatus !== 'ขาดนัด'
    );
    const liveHtRate =
      htPatients.length > 0
        ? Number(((htControlledLive.length / htPatients.length) * 100).toFixed(1))
        : 0;

    const dmPatients = patients.filter(
      (p) => p.diseaseGroup === 'DM' || p.diseaseGroup === 'DM+HT'
    );
    const dmControlledLive = dmPatients.filter(
      (p) => p.dtx >= 70 && p.dtx <= 130 && p.controlStatus !== 'ขาดนัด'
    );
    const liveDmRate =
      dmPatients.length > 0
        ? Number(((dmControlledLive.length / dmPatients.length) * 100).toFixed(1))
        : 0;

    const htRate =
      reportScope === 'monthly' && activeMonthMeta.htPctOverride !== undefined
        ? activeMonthMeta.htPctOverride
        : liveHtRate;

    const dmRate =
      reportScope === 'monthly' && activeMonthMeta.dmPctOverride !== undefined
        ? activeMonthMeta.dmPctOverride
        : liveDmRate;

    const htControlledCount =
      reportScope === 'monthly' && activeMonthMeta.htPctOverride !== undefined
        ? Math.round((htRate / 100) * htPatients.length)
        : htControlledLive.length;

    const dmControlledCount =
      reportScope === 'monthly' && activeMonthMeta.dmPctOverride !== undefined
        ? Math.round((dmRate / 100) * dmPatients.length)
        : dmControlledLive.length;

    const footScreened = dmPatients.filter((p) => p.footExamDone);
    const footRate =
      dmPatients.length > 0
        ? Number(((footScreened.length / dmPatients.length) * 100).toFixed(1))
        : 0;

    const retinalScreened = dmPatients.filter((p) => p.retinalExamDone);
    const retinalRate =
      dmPatients.length > 0
        ? Number(((retinalScreened.length / dmPatients.length) * 100).toFixed(1))
        : 0;

    return {
      htTotal: htPatients.length,
      htControlledCount,
      htRate,
      liveHtRate,
      htPassed: htRate >= clinicSettings.targetHTPercent,
      dmTotal: dmPatients.length,
      dmControlledCount,
      dmRate,
      liveDmRate,
      dmPassed: dmRate >= clinicSettings.targetDMPercent,
      footScreenedCount: footScreened.length,
      footRate,
      retinalScreenedCount: retinalScreened.length,
      retinalRate,
    };
  }, [patients, clinicSettings, reportScope, activeMonthMeta]);

  // ข้อมูลกราฟแนวโน้ม 6 เดือน (พ.ค. - ต.ค.) โดยเดือน ต.ค. อัปเดตตามข้อมูลจริงในระบบ
  const trendSeries = useMemo(() => {
    return SIX_MONTH_TREND_DATA.map((item, idx) => {
      if (idx === SIX_MONTH_TREND_DATA.length - 1) {
        return {
          ...item,
          htControlledPct: ncdMetrics.liveHtRate || item.htControlledPct,
          dmControlledPct: ncdMetrics.liveDmRate || item.dmControlledPct,
        };
      }
      return item;
    });
  }, [ncdMetrics.liveHtRate, ncdMetrics.liveDmRate]);

  // ตารางสรุปสถิติจำแนกรายหมู่บ้านครบทั้ง 8 หมู่บ้าน (ม.1 - ม.8)
  const villageStats = useMemo(() => {
    return VILLAGES.map((v) => {
      const vPatients = patients.filter((p) => p.villageId === v.id);
      const total = vPatients.length;
      const dmOnly = vPatients.filter((p) => p.diseaseGroup === 'DM').length;
      const htOnly = vPatients.filter((p) => p.diseaseGroup === 'HT').length;
      const both = vPatients.filter((p) => p.diseaseGroup === 'DM+HT').length;
      const controlled = vPatients.filter((p) => p.controlStatus === 'คุมได้ดี').length;
      const missed = vPatients.filter((p) => p.controlStatus === 'ขาดนัด').length;
      const rate = total > 0 ? Number(((controlled / total) * 100).toFixed(1)) : 0;

      return {
        ...v,
        total,
        dmOnly,
        htOnly,
        both,
        controlled,
        missed,
        rate,
      };
    });
  }, [patients]);

  const activeReportTitle =
    reportScope === 'monthly'
      ? `รายงานสรุปผลการดำเนินงานคลินิกโรคเรื้อรัง DM-HT ประจำเดือน ${selectedMonth}`
      : `รายงานสรุปผลการดำเนินงานคลินิกโรคเรื้อรัง DM-HT ประจำปี (${selectedYear})`;

  // ฟังก์ชันดาวน์โหลดรายงาน รายเดือน / รายปี เป็นไฟล์ PDF ขนาด A4 โดยรักษาสัดส่วนไม่บีบภาพ
  const handleDownloadReportPdf = async (mode: 'monthly' | 'yearly') => {
    if (!reportRef.current) return;
    setReportScope(mode);
    setIsExportingPdf(mode);

    try {
      await new Promise((r) => setTimeout(r, 160));

      const dataUrl = await captureReportAsPng(reportRef.current);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgProps = pdf.getImageProperties(dataUrl);
      const marginMm = 8;
      const maxPageWidth = 210 - marginMm * 2; // 194 mm
      const maxPageHeight = 297 - marginMm * 2; // 281 mm

      let renderWidth = maxPageWidth;
      let renderHeight = (imgProps.height * renderWidth) / imgProps.width;

      // หากความสูงเกิน 1 หน้า A4 ให้ย่อสัดส่วนอย่างสมดุลเพื่อให้อยู่ในหน้า A4 เดียวอย่างสวยงามโดยไม่บี้ภาพ
      if (renderHeight > maxPageHeight) {
        const scaleFactor = maxPageHeight / renderHeight;
        renderHeight = maxPageHeight;
        renderWidth = renderWidth * scaleFactor;
      }

      const offsetX = (210 - renderWidth) / 2;
      pdf.addImage(
        dataUrl,
        'PNG',
        offsetX,
        marginMm,
        renderWidth,
        renderHeight,
        undefined,
        'FAST'
      );

      const fileName =
        mode === 'monthly'
          ? `รายงานสถิติคลินิก_DM_HT_รายเดือน_${selectedMonth.replace(/\s+/g, '_')}.pdf`
          : `รายงานสถิติคลินิก_DM_HT_รายปี_${selectedYear.replace(/\s+/g, '_')}.pdf`;

      pdf.save(fileName);
    } catch (error) {
      console.error('Failed exporting NCD report PDF:', error);
      window.print();
    } finally {
      setIsExportingPdf(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* แผงควบคุมการออกรายงาน PDF รายเดือน / รายปี */}
      <div className="no-print bg-white p-5 rounded-xl border border-violet-200/90 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            สถิติและรายงานผลคลินิก DM-HT (NCD Dashboard & PDF Report)
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            สรุปตัวชี้วัดตามเกณฑ์ Service Plan สาขาโรคไม่ติดต่อเรื้อรัง (NCD) · พร้อมส่งออกรายงานรายเดือนและรายปีเป็นไฟล์ PDF
          </p>
        </div>

        {/* ตัวเลือกเดือน/ปี และปุ่มดาวน์โหลดรายงาน รายเดือน / รายปี PDF */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="inline-flex rounded-lg border border-violet-200 bg-violet-50/50 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setReportScope('monthly')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                reportScope === 'monthly'
                  ? 'bg-violet-600 text-white font-bold'
                  : 'text-violet-900 hover:bg-violet-100'
              }`}
            >
              มุมมองรายเดือน
            </button>
            <button
              type="button"
              onClick={() => setReportScope('yearly')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                reportScope === 'yearly'
                  ? 'bg-violet-600 text-white font-bold'
                  : 'text-violet-900 hover:bg-violet-100'
              }`}
            >
              มุมมองรายปี
            </button>
          </div>

          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setReportScope('monthly');
            }}
            className="px-3 py-2 text-xs font-semibold bg-emerald-50/60 border border-emerald-300 rounded-lg text-slate-900"
          >
            {REPORT_MONTHS.map((m) => (
              <option key={m.label} value={m.label}>
                เดือน: {m.label}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setReportScope('yearly');
            }}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
          >
            <option value="ปีงบประมาณ พ.ศ. 2569">ปีงบประมาณ พ.ศ. 2569</option>
            <option value="ปีงบประมาณ พ.ศ. 2568">ปีงบประมาณ พ.ศ. 2568</option>
          </select>

          <button
            type="button"
            onClick={() => handleDownloadReportPdf('monthly')}
            disabled={isExportingPdf !== null}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>
              {isExportingPdf === 'monthly'
                ? 'กำลังสร้าง PDF รายเดือน...'
                : 'รายงานรายเดือน (PDF)'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleDownloadReportPdf('yearly')}
            disabled={isExportingPdf !== null}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-violet-700 hover:bg-violet-800 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>
              {isExportingPdf === 'yearly'
                ? 'กำลังสร้าง PDF รายปี...'
                : 'รายงานรายปี (PDF)'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            title="พิมพ์รายงานออกเครื่องพิมพ์"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์</span>
          </button>
        </div>
      </div>

      {/* พื้นที่เอกสารรายงานสำหรับแสดงผลบนจอและแปลงเป็นไฟล์ PDF */}
      <div
        ref={reportRef}
        className="space-y-5 bg-white p-5 sm:p-7 rounded-2xl border border-emerald-200/80 shadow-xs"
      >
        {/* หัวกระดาษเอกสารรายงานทางการ */}
        <div className="pb-4 border-b-2 border-emerald-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            {clinicSettings.logoUrl && (
              <img
                src={clinicSettings.logoUrl}
                alt="โลโก้สถานพยาบาล"
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-xl object-contain border border-emerald-200 bg-white p-1 shrink-0"
              />
            )}
            <div>
              <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                เอกสารสรุปผลการดำเนินงานคลินิกโรคไม่ติดต่อเรื้อรัง (NCD Service Plan)
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-950 mt-0.5">
                {activeReportTitle}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {clinicSettings.hospitalName} · {clinicSettings.subdistrictLine} · โทร{' '}
                {clinicSettings.hospitalPhone}
              </p>
            </div>
          </div>
          <div className="text-right space-y-1 shrink-0 tabular-nums">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-950 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              <span>วันที่ออกรายงาน: {formatThaiDateBE(getTodayIsoDate())}</span>
            </div>
            <div className="text-xs text-slate-600">
              ผู้ป่วยขึ้นทะเบียนรวม <strong>{patients.length} ราย</strong> · คลังยา{' '}
              <strong>{drugs.length} รายการ</strong>
            </div>
          </div>
        </div>

        {/* 1. การ์ดตัวชี้วัดหลักตามเกณฑ์ Service Plan NCD กระทรวงสาธารณสุข */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* เป้าหมาย HT >= 60% */}
          <div className="bg-teal-50/40 p-4 rounded-xl border border-teal-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>อัตราคุมความดันโลหิตได้ดี (HT)</span>
                <span className="text-teal-800 font-mono tabular-nums">
                  เกณฑ์ ≥ {clinicSettings.targetHTPercent}%
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-bold text-teal-900 font-mono tabular-nums">
                  {ncdMetrics.htRate}%
                </span>
                <span className="text-xs text-slate-600 font-mono tabular-nums">
                  {ncdMetrics.htControlledCount} / {ncdMetrics.htTotal} ราย
                </span>
              </div>
              <div className="mt-3 w-full h-2.5 bg-white rounded-full overflow-hidden border border-teal-200">
                <div
                  className="h-full bg-teal-600 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ncdMetrics.htRate)}%` }}
                />
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-teal-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-600">BP &lt; 140/90 mmHg</span>
              <span
                className={`font-bold ${
                  ncdMetrics.htPassed ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {ncdMetrics.htPassed ? 'ผ่านเกณฑ์เป้าหมาย' : 'ต่ำกว่าเกณฑ์เป้าหมาย'}
              </span>
            </div>
          </div>

          {/* เป้าหมาย DM >= 50% */}
          <div className="bg-sky-50/40 p-4 rounded-xl border border-sky-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>อัตราคุมระดับน้ำตาลได้ดี (DM)</span>
                <span className="text-sky-800 font-mono tabular-nums">
                  เกณฑ์ ≥ {clinicSettings.targetDMPercent}%
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-bold text-sky-900 font-mono tabular-nums">
                  {ncdMetrics.dmRate}%
                </span>
                <span className="text-xs text-slate-600 font-mono tabular-nums">
                  {ncdMetrics.dmControlledCount} / {ncdMetrics.dmTotal} ราย
                </span>
              </div>
              <div className="mt-3 w-full h-2.5 bg-white rounded-full overflow-hidden border border-sky-200">
                <div
                  className="h-full bg-sky-600 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ncdMetrics.dmRate)}%` }}
                />
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-sky-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-600">DTX/FBS 70-130 mg/dL</span>
              <span
                className={`font-bold ${
                  ncdMetrics.dmPassed ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {ncdMetrics.dmPassed ? 'ผ่านเกณฑ์เป้าหมาย' : 'ต่ำกว่าเกณฑ์เป้าหมาย'}
              </span>
            </div>
          </div>

          {/* คัดกรองภาวะแทรกซ้อนทางเท้า (Foot Exam) */}
          <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Footprints className="w-3.5 h-3.5 text-emerald-700" />
                  <span>ตรวจคัดกรองเท้าเบาหวาน</span>
                </span>
                <span className="text-emerald-800 font-mono tabular-nums">เป้าหมาย ≥ 85%</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-bold text-emerald-900 font-mono tabular-nums">
                  {ncdMetrics.footRate}%
                </span>
                <span className="text-xs text-slate-600 font-mono tabular-nums">
                  {ncdMetrics.footScreenedCount} / {ncdMetrics.dmTotal} ราย
                </span>
              </div>
              <div className="mt-3 w-full h-2.5 bg-white rounded-full overflow-hidden border border-emerald-200">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ncdMetrics.footRate)}%` }}
                />
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-600">ป้องกันแผลเบาหวานที่เท้า</span>
              <span className="font-semibold text-emerald-800">
                คัดกรองแล้ว {ncdMetrics.footScreenedCount} ราย
              </span>
            </div>
          </div>

          {/* คัดกรองจอประสาทตา (Retinal Exam) */}
          <div className="bg-violet-50/40 p-4 rounded-xl border border-violet-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-violet-700" />
                  <span>ตรวจจอประสาทตา (DR)</span>
                </span>
                <span className="text-violet-800 font-mono tabular-nums">เป้าหมาย ≥ 80%</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-bold text-violet-900 font-mono tabular-nums">
                  {ncdMetrics.retinalRate}%
                </span>
                <span className="text-xs text-slate-600 font-mono tabular-nums">
                  {ncdMetrics.retinalScreenedCount} / {ncdMetrics.dmTotal} ราย
                </span>
              </div>
              <div className="mt-3 w-full h-2.5 bg-white rounded-full overflow-hidden border border-violet-200">
                <div
                  className="h-full bg-violet-600 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ncdMetrics.retinalRate)}%` }}
                />
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-violet-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-600">Fundus Camera ประจำปี</span>
              <span className="font-semibold text-violet-800">
                คัดกรองแล้ว {ncdMetrics.retinalScreenedCount} ราย
              </span>
            </div>
          </div>
        </div>

        {/* 2. กราฟแนวโน้มอัตราการควบคุมโรคย้อนหลัง 6 เดือน (พ.ค. - ต.ค.) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
              <h2 className="text-base font-bold text-slate-900">
                กราฟแนวโน้มอัตราการควบคุมโรคได้ตามเกณฑ์ย้อนหลัง 6 เดือน (พ.ค. – ต.ค. 2569)
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-teal-800">
                <span className="w-3 h-3 rounded-xs bg-teal-600 inline-block" />
                <span>อัตราคุมความดัน HT (เกณฑ์ ≥ {clinicSettings.targetHTPercent}%)</span>
              </div>
              <div className="flex items-center gap-1.5 text-sky-800">
                <span className="w-3 h-3 rounded-xs bg-sky-600 inline-block" />
                <span>อัตราคุมเบาหวาน DM (เกณฑ์ ≥ {clinicSettings.targetDMPercent}%)</span>
              </div>
            </div>
          </div>

          {/* กราฟเปรียบเทียบรายเดือน พ.ค. - ต.ค. */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-2">
            <div className="lg:col-span-8">
              <div className="relative h-64 flex items-end justify-between gap-4 pt-6 pb-8 px-4 bg-emerald-50/30 rounded-xl border border-emerald-100">
                {/* เส้นประเกณฑ์มาตรฐาน HT 60% และ DM 50% */}
                <div
                  className="absolute left-4 right-4 border-t border-dashed border-teal-500/70 pointer-events-none flex justify-end"
                  style={{ bottom: `${(clinicSettings.targetHTPercent / 100) * 180 + 32}px` }}
                >
                  <span className="text-[10px] font-mono font-bold text-teal-800 bg-white/90 px-1.5 -mt-2.5 rounded">
                    เป้าหมาย HT {clinicSettings.targetHTPercent}%
                  </span>
                </div>

                <div
                  className="absolute left-4 right-4 border-t border-dashed border-sky-500/70 pointer-events-none flex justify-start"
                  style={{ bottom: `${(clinicSettings.targetDMPercent / 100) * 180 + 32}px` }}
                >
                  <span className="text-[10px] font-mono font-bold text-sky-800 bg-white/90 px-1.5 -mt-2.5 rounded">
                    เป้าหมาย DM {clinicSettings.targetDMPercent}%
                  </span>
                </div>

                {trendSeries.map((point) => {
                  const htHeightPx = Math.max(20, (point.htControlledPct / 100) * 180);
                  const dmHeightPx = Math.max(20, (point.dmControlledPct / 100) * 180);
                  const isHighlightedMonth =
                    reportScope === 'monthly' &&
                    point.month === activeMonthMeta.shortMonth;

                  return (
                    <div
                      key={point.month}
                      className={`flex-1 flex flex-col items-center justify-end h-full z-10 rounded-lg px-1 ${
                        isHighlightedMonth ? 'bg-emerald-100/50 ring-1 ring-emerald-400' : ''
                      }`}
                    >
                      <div className="flex items-end justify-center gap-1.5 sm:gap-2.5 w-full">
                        {/* แท่ง HT */}
                        <div className="flex flex-col items-center">
                          <span className="text-[11px] font-mono font-bold text-teal-900 mb-1 tabular-nums">
                            {point.htControlledPct}%
                          </span>
                          <div
                            className="w-6 sm:w-9 bg-teal-600 hover:bg-teal-700 rounded-t-md transition-all"
                            style={{ height: `${htHeightPx}px` }}
                            title={`ความดันโลหิตสูง (HT) ${point.month}: ${point.htControlledPct}%`}
                          />
                        </div>

                        {/* แท่ง DM */}
                        <div className="flex flex-col items-center">
                          <span className="text-[11px] font-mono font-bold text-sky-900 mb-1 tabular-nums">
                            {point.dmControlledPct}%
                          </span>
                          <div
                            className="w-6 sm:w-9 bg-sky-600 hover:bg-sky-700 rounded-t-md transition-all"
                            style={{ height: `${dmHeightPx}px` }}
                            title={`เบาหวาน (DM) ${point.month}: ${point.dmControlledPct}%`}
                          />
                        </div>
                      </div>
                      <div className="mt-2 text-xs font-bold text-slate-700 whitespace-nowrap">
                        {point.month}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ตารางสรุปตัวเลขรายเดือน */}
            <div className="lg:col-span-4 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-emerald-700" />
                <span>ตารางเปรียบเทียบผลลัพธ์ 6 เดือนย้อนหลัง</span>
              </div>
              <table className="w-full text-xs border-collapse tabular-nums">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-1.5 text-left">เดือน</th>
                    <th className="py-1.5 text-right">คุม HT ได้</th>
                    <th className="py-1.5 text-right">คุม DM ได้</th>
                    <th className="py-1.5 text-right">ผู้มารับบริการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60">
                  {trendSeries.map((row) => (
                    <tr
                      key={row.month}
                      className={
                        reportScope === 'monthly' &&
                        row.month === activeMonthMeta.shortMonth
                          ? 'bg-emerald-50 font-bold'
                          : ''
                      }
                    >
                      <td className="py-1.5 font-semibold text-slate-800">{row.month}</td>
                      <td className="py-1.5 text-right font-mono font-bold text-teal-800">
                        {row.htControlledPct}%
                      </td>
                      <td className="py-1.5 text-right font-mono font-bold text-sky-800">
                        {row.dmControlledPct}%
                      </td>
                      <td className="py-1.5 text-right font-mono text-slate-600">
                        {row.totalVisits} ครั้ง
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 3. ตารางสรุปสถิติจำแนกรายหมู่บ้านครบทั้ง 8 หมู่บ้าน (ม.1 บ้านหนองชิ่ม ถึง ม.8 บ้านปลายแหลม) */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-emerald-100 bg-emerald-50/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-700" />
              <h2 className="text-base font-bold text-slate-900">
                ตารางสรุปสถิติจำแนกรายหมู่บ้านครบทั้ง 8 หมู่บ้าน (ม.1 บ้านหนองชิ่ม – ม.8 บ้านปลายแหลม)
              </h2>
            </div>
            <span className="text-xs text-slate-600">
              พร้อมรายชื่อและเบอร์โทรศัพท์หัวหน้า อสม. ผู้รับผิดชอบพื้นที่
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4 whitespace-nowrap">หมู่ที่ / ชื่อหมู่บ้าน</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">ผู้ป่วยรวม</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">DM เดี่ยว</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">HT เดี่ยว</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">เป็นทั้ง 2 โรค</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">อัตราคุมโรคได้</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">ขาดนัด</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">อสม. ผู้รับผิดชอบหลัก</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">เบอร์ติดต่อ อสม.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 text-xs sm:text-sm tabular-nums">
                {villageStats.map((v) => (
                  <tr key={v.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">
                        {v.id} {v.villageName}
                      </div>
                      <div className="text-xs text-slate-500">ต.หนองชิ่ม อ.แหลมสิงห์</div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      {v.total} ราย
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-sky-800">{v.dmOnly}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-teal-800">{v.htOnly}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-indigo-800">{v.both}</td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <span
                        className={`font-mono font-bold ${
                          v.rate >= 60 ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {v.rate}%
                      </span>
                      <span className="text-xs text-slate-500 ml-1">
                        ({v.controlled}/{v.total})
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">
                      {v.missed > 0 ? (
                        <span className="font-bold text-rose-700">{v.missed} ราย</span>
                      ) : (
                        <span className="text-emerald-700 font-medium">0 ราย</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{v.vhvLeaderName}</div>
                      <div className="text-xs text-slate-500">ทีม อสม. ประจำหมู่บ้าน {v.vhvCount} คน</div>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap font-mono text-xs font-semibold text-emerald-800">
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{v.vhvPhone}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ส่วนลงนามท้ายรายงานราชการสำหรับเอกสาร PDF */}
        <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-slate-600">
          <div>
            <div className="font-bold text-slate-800">หมายเหตุประกอบรายงาน:</div>
            <p className="mt-1">
              ข้อมูลประมวลผลจากระบบทะเบียนคลินิกโรคเรื้อรัง DM-HT {clinicSettings.hospitalName}{' '}
              ครอบคลุมพื้นที่หมู่ที่ 1 – หมู่ที่ 8 ตำบลหนองชิ่ม อำเภอแหลมสิงห์ จังหวัดจันทบุรี
            </p>
          </div>
          <div className="flex flex-col sm:items-end justify-end text-center sm:text-right space-y-1">
            <div>ลงชื่อ ............................................................ ผู้จัดทำรายงาน</div>
            <div>(เจ้าหน้าที่ผู้รับผิดชอบงานคลินิกโรคไม่ติดต่อเรื้อรัง NCD)</div>
            <div className="text-slate-500">{clinicSettings.hospitalName}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
