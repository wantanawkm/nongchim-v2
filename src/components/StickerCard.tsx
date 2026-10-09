import React from 'react';
import { type StickerPrintItem } from '../types';

interface StickerCardProps {
  sticker: StickerPrintItem;
  compact?: boolean;
  logoUrl?: string;
  subdistrictLine?: string;
  onRemove?: (id: string) => void;
  onEdit?: (sticker: StickerPrintItem) => void;
}

export const StickerCard: React.FC<StickerCardProps> = ({
  sticker,
  compact = false,
  logoUrl,
  subdistrictLine,
  onRemove,
  onEdit,
}) => {
  return (
    <div
      className="relative flex flex-col justify-between bg-white text-slate-900 select-none overflow-hidden"
      style={{
        border: '1.5px solid #334155',
        borderRadius: '4px',
        fontFamily: "'Sarabun', 'IBM Plex Sans Thai', sans-serif",
        minHeight: compact ? '212px' : '228px',
        backgroundColor: '#ffffff',
      }}
    >
      {/* 1. หัวกระดาษแถบสีเขียวอ่อน: โรงพยาบาลส่งเสริมสุขภาพตำบลหนองชิ่ม */}
      <div>
        <div
          className="px-2.5 py-1 flex items-center justify-center gap-1.5 font-bold tracking-tight border-b"
          style={{
            backgroundColor: '#d1fae5',
            borderColor: '#6ee7b7',
            color: '#064e3b',
            fontSize: compact ? '12.5px' : '13.5px',
          }}
        >
          {logoUrl && (
            <img
              src={logoUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="w-4 h-4 object-contain rounded-xs shrink-0"
            />
          )}
          <span className="truncate">
            {sticker.hospitalName || 'โรงพยาบาลส่งเสริมสุขภาพตำบลหนองชิ่ม'}
          </span>
        </div>

        {/* 2. ข้อมูลผู้ป่วยและวันที่: ชื่อ-นามสกุล, HN, วันที่/เดือน/ปี (พ.ศ.) */}
        <div
          className="px-2.5 py-1 flex items-center justify-between gap-1 border-b"
          style={{
            backgroundColor: '#f8fafc',
            borderColor: '#cbd5e1',
            fontSize: compact ? '11.5px' : '12px',
          }}
        >
          <div className="font-bold text-slate-900 truncate">
            ชื่อ: <span className="font-bold">{sticker.patientName}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 tabular-nums text-slate-800 font-semibold">
            <span>HN: {sticker.hn}</span>
            <span>·</span>
            <span>วันที่ {sticker.printDateThai}</span>
          </div>
        </div>

        {/* 3. แถบกลุ่มยาเน้นพื้นหลังสีเขียว: เช่น ยาลดความดันโลหิต, ยาลดระดับน้ำตาลในเลือด */}
        <div
          className="px-2.5 py-0.5 text-center font-bold border-b"
          style={{
            backgroundColor: '#059669',
            borderColor: '#047857',
            color: '#ffffff',
            fontSize: compact ? '11.5px' : '12.5px',
          }}
        >
          กลุ่มยา: {sticker.category}
        </div>

        {/* 4. ชื่อยาและจำนวน: ตัวหนาเด่นชัด พร้อมระบุหน่วยเป็น "เม็ด" */}
        <div className="px-3 pt-1.5 pb-1 flex items-baseline justify-between gap-2 border-b border-dashed border-slate-300">
          <div
            className="font-bold tracking-tight text-slate-950 truncate"
            style={{ fontSize: compact ? '15px' : '16.5px' }}
          >
            {sticker.drugName}
          </div>
          <div
            className="font-bold shrink-0 tabular-nums"
            style={{
              fontSize: compact ? '14px' : '15.5px',
              color: '#065f46',
            }}
          >
            จำนวน {sticker.amount} {sticker.unit || 'เม็ด'}
          </div>
        </div>

        {/* 5. วิธีรับประทาน: เน้นสีแดงเด่นชัดเจน เพื่อป้องกันการทานยาผิด */}
        <div className="px-3 py-1.5">
          <div
            className="font-bold leading-snug"
            style={{
              color: '#dc2626',
              fontSize: compact ? '13px' : '14px',
            }}
          >
            วิธีรับประทาน: {sticker.regimen}
          </div>

          {/* 6. สรรพคุณ / คำเตือน: ชัดเจนและอ่านง่าย */}
          <div
            className="mt-1 leading-snug text-slate-700 font-medium"
            style={{ fontSize: compact ? '11px' : '11.5px' }}
          >
            สรรพคุณ/คำเตือน: {sticker.propertiesAndWarnings}
          </div>
        </div>
      </div>

      {/* ส่วนท้ายสติกเกอร์: แถบวันนัดพื้นหลังสีฟ้าด้านล่าง + เบอร์ติดต่อท้ายล่างสติ๊กเกอร์ */}
      <div>
        {/* 7. แถบวันนัดพื้นหลังสีฟ้าด้านล่าง: ระบุวันนัดตรวจครั้งถัดไป */}
        <div
          className="px-2.5 py-1 text-center font-bold border-t border-b"
          style={{
            backgroundColor: '#dbeafe',
            borderColor: '#93c5fd',
            color: '#1e3a8a',
            fontSize: compact ? '11px' : '12px',
          }}
        >
          นัดตรวจครั้งต่อไป: {sticker.nextAppointmentText || 'ตามแพทย์นัด'}
        </div>

        {/* 8. เบอร์ติดต่อท้ายล่างสติ๊กเกอร์: โทร 039-444289 */}
        <div
          className="px-2.5 py-0.5 flex items-center justify-between gap-2"
          style={{
            backgroundColor: '#f1f5f9',
            color: '#334155',
            fontSize: compact ? '10.5px' : '11px',
          }}
        >
          <span className="font-semibold truncate">
            {subdistrictLine || 'รพ.สต.หนองชิ่ม อ.แหลมสิงห์ จ.จันทบุรี'}
          </span>
          <span className="font-bold tabular-nums shrink-0" style={{ color: '#0f172a' }}>
            โทร {sticker.hospitalPhone || '039-444289'}
          </span>
        </div>
      </div>

      {/* ปุ่มจัดการเฉพาะหน้าจอ (ซ่อนเวลาพิมพ์จริง) */}
      {(onRemove || onEdit) && (
        <div className="no-print absolute top-1 right-1 flex items-center gap-1 opacity-90 hover:opacity-100 focus-within:opacity-100 transition-opacity bg-white/95 px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(sticker)}
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 px-1 cursor-pointer"
              title="แก้ไขข้อความบนสติกเกอร์"
            >
              แก้ไข
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(sticker.id)}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 px-1 cursor-pointer"
              title="ลบสติกเกอร์ใบนี้"
            >
              ลบ
            </button>
          )}
        </div>
      )}
    </div>
  );
};
