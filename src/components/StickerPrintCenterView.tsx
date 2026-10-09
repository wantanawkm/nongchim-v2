import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import {
  Download,
  FilePlus,
  Layers,
  Printer,
  RotateCcw,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import {
  type ClinicSettings,
  type DrugCategory,
  type Patient,
  type StickerPrintItem,
} from '../types';
import { formatThaiDateBE, getTodayIsoDate } from '../data/initialData';
import { StickerCard } from './StickerCard';

interface StickerPrintCenterViewProps {
  patients: Patient[];
  stickerQueue: StickerPrintItem[];
  onUpdateQueue: (nextQueue: StickerPrintItem[]) => void;
  clinicSettings: ClinicSettings;
}

const STICKERS_PER_A4_PAGE = 10; // 2 คอลัมน์ x 5 แถว มาตรฐานกระดาษสติกเกอร์ยา A4

async function captureElementAsPng(element: HTMLElement): Promise<string> {
  try {
    return await toPng(element, {
      quality: 1.0,
      pixelRatio: 2.5,
      backgroundColor: '#ffffff',
      cacheBust: true,
    });
  } catch {
    return await toPng(element, {
      quality: 1.0,
      pixelRatio: 2.5,
      backgroundColor: '#ffffff',
      skipFonts: true,
    });
  }
}

export const StickerPrintCenterView: React.FC<StickerPrintCenterViewProps> = ({
  patients,
  stickerQueue,
  onUpdateQueue,
  clinicSettings,
}) => {
  const [blankOffset, setBlankOffset] = useState<number>(
    clinicSettings.defaultBlankOffset || 0
  );
  const [selectedPatientToLoad, setSelectedPatientToLoad] = useState<string>(
    patients[0]?.id || ''
  );
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [hideGuidesForCapture, setHideGuidesForCapture] = useState<boolean>(false);
  const [editingSticker, setEditingSticker] = useState<StickerPrintItem | null>(null);

  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    setBlankOffset(clinicSettings.defaultBlankOffset || 0);
  }, [clinicSettings.defaultBlankOffset]);

  useEffect(() => {
    if (!patients.some((p) => p.id === selectedPatientToLoad) && patients[0]) {
      setSelectedPatientToLoad(patients[0].id);
    }
  }, [patients, selectedPatientToLoad]);

  // จัดเรียงช่องสติกเกอร์รวมช่องที่แกะใช้แล้ว (Blank Offset) ลงในหน้ากระดาษ A4 (หน้าละ 10 ช่อง = 2 คอลัมน์ x 5 แถว)
  const pages = useMemo(() => {
    const slots: (StickerPrintItem | null)[] = [
      ...Array.from({ length: blankOffset }, () => null),
      ...stickerQueue,
    ];

    if (slots.length === 0) {
      return [Array.from({ length: STICKERS_PER_A4_PAGE }, () => null)];
    }

    const numPages = Math.ceil(slots.length / STICKERS_PER_A4_PAGE);
    const result: (StickerPrintItem | null)[][] = [];

    for (let p = 0; p < numPages; p++) {
      const pageSlice = slots.slice(
        p * STICKERS_PER_A4_PAGE,
        (p + 1) * STICKERS_PER_A4_PAGE
      );
      while (pageSlice.length < STICKERS_PER_A4_PAGE) {
        pageSlice.push(null);
      }
      result.push(pageSlice);
    }
    return result;
  }, [blankOffset, stickerQueue]);

  // ดึงรายการยาของผู้ป่วยเข้าคิวพิมพ์สติกเกอร์
  const handleLoadPatientStickers = (appendMode: boolean) => {
    const pt = patients.find((p) => p.id === selectedPatientToLoad);
    if (!pt) return;

    const todayThai = formatThaiDateBE(getTodayIsoDate());
    const nextApptText = `${formatThaiDateBE(pt.nextAppointmentDate)} (${pt.nextAppointmentPeriod})`;

    const newStickers: StickerPrintItem[] = pt.latestPrescriptions.map((rx) => ({
      id: `stk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      hospitalName: clinicSettings.hospitalName,
      patientName: `${pt.prefix}${pt.fullName}`,
      hn: pt.hn,
      printDateThai: todayThai,
      category: rx.category,
      drugName: rx.drugName,
      amount: rx.amount,
      unit: rx.unit || 'เม็ด',
      regimen: rx.regimen,
      propertiesAndWarnings: rx.propertiesAndWarnings,
      nextAppointmentText: nextApptText,
      hospitalPhone: clinicSettings.hospitalPhone,
    }));

    if (appendMode) {
      onUpdateQueue([...stickerQueue, ...newStickers]);
    } else {
      onUpdateQueue(newStickers);
    }
  };

  // เพิ่มสติกเกอร์เปล่า/กำหนดเอง
  const handleAddCustomSticker = () => {
    const pt = patients.find((p) => p.id === selectedPatientToLoad) || patients[0];
    const customSticker: StickerPrintItem = {
      id: `stk-custom-${Date.now()}`,
      hospitalName: clinicSettings.hospitalName,
      patientName: pt ? `${pt.prefix}${pt.fullName}` : 'นางสมจิตร ทองคำแท้',
      hn: pt ? pt.hn : '69-00101',
      printDateThai: formatThaiDateBE(getTodayIsoDate()),
      category: 'ยาลดความดันโลหิต',
      drugName: 'Amlodipine 5 mg',
      amount: 60,
      unit: 'เม็ด',
      regimen: 'รับประทานครั้งละ 1 เม็ด วันละ 1 ครั้ง หลังอาหารเช้า',
      propertiesAndWarnings: 'ยาลดความดันโลหิต ห้ามหยุดยาเอง อาจทำให้ข้อเท้าบวมหรือหน้ามืดได้',
      nextAppointmentText: pt
        ? `${formatThaiDateBE(pt.nextAppointmentDate)} (${pt.nextAppointmentPeriod})`
        : '7 ธ.ค. 2569 (ช่วงเช้า 08.00 - 11.30 น.)',
      hospitalPhone: clinicSettings.hospitalPhone,
    };
    onUpdateQueue([...stickerQueue, customSticker]);
  };

  const handleRemoveSticker = (id: string) => {
    onUpdateQueue(stickerQueue.filter((s) => s.id !== id));
  };

  const handleSaveEditedSticker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSticker) return;
    onUpdateQueue(
      stickerQueue.map((s) => (s.id === editingSticker.id ? editingSticker : s))
    );
    setEditingSticker(null);
  };

  // ดาวน์โหลดไฟล์ PDF A4 คมชัดสูง
  const handleDownloadPdfA4 = async () => {
    if (stickerQueue.length === 0) return;
    setIsGeneratingPdf(true);
    setHideGuidesForCapture(true);

    try {
      // รอให้ซ่อนเส้นประช่องว่างก่อนแคปภาพลง PDF
      await new Promise((r) => setTimeout(r, 150));

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const validPageEls = pageRefs.current.slice(0, pages.length).filter(Boolean);

      for (let i = 0; i < validPageEls.length; i++) {
        const pageEl = validPageEls[i]!;
        const dataUrl = await captureElementAsPng(pageEl);

        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }
        pdf.addImage(dataUrl, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
      }

      const firstPt = stickerQueue[0];
      const fileName = firstPt
        ? `สติกเกอร์ยา_A4_${firstPt.hn}_${firstPt.patientName.replace(/\s+/g, '_')}.pdf`
        : 'สติกเกอร์ยา_รพสต_หนองชิ่ม_A4.pdf';

      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating A4 PDF:', error);
      window.print();
    } finally {
      setHideGuidesForCapture(false);
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* แผงควบคุมศูนย์พิมพ์สติกเกอร์ยา A4 (ไม่แสดงเวลาสั่งพิมพ์จริง) */}
      <div className="no-print bg-white p-5 rounded-xl border border-amber-200/90 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              ศูนย์พิมพ์สติกเกอร์ยา A4 (Drug Label Printing Center)
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              จัดวางแบบ 2 คอลัมน์บนกระดาษ A4 มาตรฐาน (10 ดวง/แผ่น) · รองรับการเว้นช่องสติกเกอร์ที่แกะใช้แล้ว (Blank Offset)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadPdfA4}
              disabled={isGeneratingPdf || stickerQueue.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>
                {isGeneratingPdf
                  ? 'กำลังสร้างไฟล์ PDF ความละเอียดสูง...'
                  : 'ดาวน์โหลดไฟล์ PDF A4 คมชัดสูง'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              disabled={stickerQueue.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>สั่งพิมพ์ออกเครื่องพิมพ์ทันที</span>
            </button>
          </div>
        </div>

        {/* แถวตั้งค่า Blank Offset (กระดาษที่แกะใช้แล้ว) + ดึงรายการยาของผู้ป่วย */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* 1. ฟังก์ชันรองรับกระดาษที่แกะใช้แล้ว (Blank Offset) */}
          <div className="lg:col-span-6 p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-800" />
                <span className="text-sm font-bold text-amber-950">
                  ตั้งค่าเว้นช่องสติกเกอร์ที่แกะใช้แล้ว (Blank Offset)
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-900 tabular-nums">
                เว้นว่าง {blankOffset} ช่องแรก (เริ่มพิมพ์ช่องที่ {blankOffset + 1})
              </span>
            </div>

            <p className="text-xs text-slate-600">
              คลิกเลือกจำนวนช่องสติกเกอร์ด้านบนที่ถูกแกะใช้งานไปแล้ว เพื่อประหยัดกระดาษสติกเกอร์แผ่นเดิม:
            </p>

            <div className="flex flex-wrap items-center gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setBlankOffset(num)}
                  className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition-colors tabular-nums cursor-pointer ${
                    blankOffset === num
                      ? 'bg-amber-600 text-white border-amber-700'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-amber-400'
                  }`}
                >
                  {num === 0 ? '0 (แผ่นใหม่)' : `เว้น ${num} ช่อง`}
                </button>
              ))}
            </div>
          </div>

          {/* 2. ดึงรายการยาจากผู้ป่วยในทะเบียน หรือเพิ่มสติกเกอร์ */}
          <div className="lg:col-span-6 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="text-sm font-bold text-slate-900">
              จัดการคิวสติกเกอร์ยาในแผ่น A4 (ปัจจุบัน {stickerQueue.length} ดวง · {pages.length} หน้า A4)
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <select
                value={selectedPatientToLoad}
                onChange={(e) => setSelectedPatientToLoad(e.target.value)}
                className="flex-1 px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {patients.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.hn} — {pt.prefix}
                    {pt.fullName} (มียา {pt.latestPrescriptions.length} รายการ)
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => handleLoadPatientStickers(false)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ดึงทับคิวเดิม</span>
              </button>

              <button
                type="button"
                onClick={() => handleLoadPatientStickers(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>ต่อท้ายคิวพิมพ์</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleAddCustomSticker}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-semibold rounded-lg cursor-pointer"
              >
                <FilePlus className="w-3.5 h-3.5" />
                <span>+ เพิ่มสติกเกอร์กำหนดเอง 1 ดวง</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateQueue([])}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ล้างคิวสติกเกอร์ทั้งหมด</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* แสดงตัวอย่างกระดาษ A4 แบบ 2 คอลัมน์ (100% ตามขนาดสัดส่วนจริง) */}
      <div className="space-y-8 flex flex-col items-center">
        {pages.map((pageSlots, pageIdx) => (
          <div key={pageIdx} className="w-full flex flex-col items-center">
            <div className="no-print mb-2 flex items-center justify-between w-full max-w-[794px] text-xs font-semibold text-slate-600">
              <span>
                แผ่นกระดาษสติกเกอร์ A4 หน้าที่ {pageIdx + 1} / {pages.length} (การจัดวางแบบ 2 คอลัมน์ มาตรฐาน 210 × 297 มม.)
              </span>
              <span>คลิกปุ่ม &ldquo;แก้ไข&rdquo; มุมขวาบนของสติกเกอร์เพื่อปรับข้อความ หรือคลิกช่องว่างเพื่อตั้งค่าเว้นช่อง</span>
            </div>

            <div className="w-full overflow-x-auto flex justify-center pb-2">
              <div
                ref={(el) => {
                  pageRefs.current[pageIdx] = el;
                }}
                className="print-only-sheet bg-white shadow-md border border-slate-300 shrink-0"
                style={{
                  width: '794px', // ขนาดมาตรฐาน A4 ที่ 96 DPI (210mm)
                  minHeight: '1123px', // ขนาดมาตรฐาน A4 ที่ 96 DPI (297mm)
                  padding: '22px 24px',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  className="grid grid-cols-2 gap-x-4 gap-y-3"
                  style={{
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  }}
                >
                  {pageSlots.map((slot, slotIdx) => {
                    const globalSlotNumber = pageIdx * STICKERS_PER_A4_PAGE + slotIdx + 1;
                    const isPeeledBlankSlot = globalSlotNumber <= blankOffset;

                    if (slot) {
                      return (
                        <StickerCard
                          key={slot.id}
                          sticker={{
                            ...slot,
                            hospitalName:
                              slot.hospitalName || clinicSettings.hospitalName,
                            hospitalPhone:
                              slot.hospitalPhone || clinicSettings.hospitalPhone,
                          }}
                          compact
                          logoUrl={clinicSettings.logoUrl}
                          subdistrictLine={clinicSettings.subdistrictLine}
                          onRemove={
                            hideGuidesForCapture ? undefined : handleRemoveSticker
                          }
                          onEdit={
                            hideGuidesForCapture
                              ? undefined
                              : (stk) => setEditingSticker({ ...stk })
                          }
                        />
                      );
                    }

                    // ช่องว่าง (แกะใช้แล้ว หรือ ช่องที่เหลือในแผ่น)
                    return (
                      <div
                        key={`blank-${pageIdx}-${slotIdx}`}
                        onClick={() => {
                          if (pageIdx === 0 && slotIdx < 9) {
                            setBlankOffset(
                              isPeeledBlankSlot ? slotIdx : slotIdx + 1
                            );
                          }
                        }}
                        style={{
                          minHeight: '212px',
                          borderRadius: '4px',
                          border: hideGuidesForCapture
                            ? '1.5px solid transparent'
                            : isPeeledBlankSlot
                            ? '1.5px dashed #f59e0b'
                            : '1px dashed #cbd5e1',
                          backgroundColor: hideGuidesForCapture
                            ? 'transparent'
                            : isPeeledBlankSlot
                            ? '#fffbeb'
                            : '#ffffff',
                        }}
                        className="flex flex-col items-center justify-center p-4 text-center select-none cursor-pointer"
                        title="คลิกเพื่อตั้งค่าเว้นช่องสติกเกอร์ที่แกะใช้แล้ว"
                      >
                        {!hideGuidesForCapture && (
                          <div className="no-print space-y-1">
                            <div className="text-xs font-mono font-bold text-slate-400 tabular-nums">
                              ช่องที่ {globalSlotNumber} (คอลัมน์ {(slotIdx % 2) + 1} · แถวที่{' '}
                              {Math.floor(slotIdx / 2) + 1})
                            </div>
                            {isPeeledBlankSlot ? (
                              <div className="text-xs font-semibold text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded border border-amber-300">
                                เว้นว่าง: สติกเกอร์แกะใช้แล้ว (ไม่พิมพ์ทับ)
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-400">
                                ช่องสติกเกอร์ว่าง (คลิกเพื่อเว้นช่องถึงตำแหน่งนี้)
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal แก้ไขข้อความสติกเกอร์รายดวง */}
      {editingSticker && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl border border-emerald-200 max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                แก้ไขรายละเอียดบนสติกเกอร์ยา ({editingSticker.drugName})
              </h3>
              <button
                type="button"
                onClick={() => setEditingSticker(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedSticker} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อ-นามสกุลผู้ป่วย
                  </label>
                  <input
                    type="text"
                    value={editingSticker.patientName}
                    onChange={(e) =>
                      setEditingSticker({
                        ...editingSticker,
                        patientName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    HN
                  </label>
                  <input
                    type="text"
                    value={editingSticker.hn}
                    onChange={(e) =>
                      setEditingSticker({ ...editingSticker, hn: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    กลุ่มยา
                  </label>
                  <select
                    value={editingSticker.category}
                    onChange={(e) =>
                      setEditingSticker({
                        ...editingSticker,
                        category: e.target.value as DrugCategory,
                      })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="ยาลดความดันโลหิต">ยาลดความดันโลหิต</option>
                    <option value="ยาลดระดับน้ำตาลในเลือด">ยาลดระดับน้ำตาลในเลือด</option>
                    <option value="ยาลดไขมันในเลือด">ยาลดไขมันในเลือด</option>
                    <option value="ยาต้านเกล็ดเลือด">ยาต้านเกล็ดเลือด</option>
                    <option value="วิตามินบำรุงปลายประสาท">วิตามินบำรุงปลายประสาท</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    จำนวน (เม็ด)
                  </label>
                  <input
                    type="number"
                    value={editingSticker.amount}
                    onChange={(e) =>
                      setEditingSticker({
                        ...editingSticker,
                        amount: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อยาและขนาดความแรง
                </label>
                <input
                  type="text"
                  value={editingSticker.drugName}
                  onChange={(e) =>
                    setEditingSticker({ ...editingSticker, drugName: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-sm font-bold border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-red-700 mb-1">
                  วิธีรับประทาน (ตัวอักษรสีแดง)
                </label>
                <input
                  type="text"
                  value={editingSticker.regimen}
                  onChange={(e) =>
                    setEditingSticker({ ...editingSticker, regimen: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-sm font-semibold text-red-700 border border-red-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  สรรพคุณ / คำเตือน
                </label>
                <input
                  type="text"
                  value={editingSticker.propertiesAndWarnings}
                  onChange={(e) =>
                    setEditingSticker({
                      ...editingSticker,
                      propertiesAndWarnings: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ข้อความแถบวันนัดตรวจครั้งต่อไป
                </label>
                <input
                  type="text"
                  value={editingSticker.nextAppointmentText}
                  onChange={(e) =>
                    setEditingSticker({
                      ...editingSticker,
                      nextAppointmentText: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingSticker(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
                >
                  บันทึกการแก้ไขสติกเกอร์
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
