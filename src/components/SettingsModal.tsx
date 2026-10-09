import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  FileUp,
  Image as ImageIcon,
  LogOut,
  RotateCcw,
  Save,
  Settings,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { type ClinicSettings } from '../types';

export interface RegisteredGmailUser {
  fullName: string;
  role: string;
  email: string;
  registeredAt: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ClinicSettings;
  onSaveSettings: (nextSettings: ClinicSettings) => void;
  onResetDemoData: () => void;
  onExportBackup: () => void;
  onImportBackup: (jsonText: string) => boolean;
  registeredUser?: RegisteredGmailUser | null;
  onLogout?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetDemoData,
  onExportBackup,
  onImportBackup,
  registeredUser,
  onLogout,
}) => {
  const [form, setForm] = useState<ClinicSettings>(settings);
  const [confirmReset, setConfirmReset] = useState(false);
  const [importStatusMsg, setImportStatusMsg] = useState<string>('');
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setForm(settings);
    setImportStatusMsg('');
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((prev) => ({ ...prev, logoUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBackupFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const ok = onImportBackup(reader.result);
        setImportStatusMsg(
          ok
            ? 'นำเข้าข้อมูลสำรองสำเร็จเรียบร้อยแล้ว'
            : 'รูปแบบไฟล์สำรองข้อมูลไม่ถูกต้อง กรุณาตรวจสอบไฟล์ .JSON'
        );
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(form);
    onClose();
  };

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-emerald-200 max-w-lg w-full p-6 shadow-xl my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-700" />
            <h3 className="text-base font-bold text-slate-900">
              ตั้งค่าระบบคลินิกโรคเรื้อรัง DM-HT (System Settings)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {registeredUser && (
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5 min-w-0">
                <div className="text-slate-500">ผู้ลงทะเบียนเข้าใช้งานปัจจุบัน (Gmail):</div>
                <div className="font-bold text-slate-900 truncate">
                  {registeredUser.fullName} · <span className="text-emerald-800">{registeredUser.role}</span>
                </div>
                <div className="font-mono font-semibold text-emerald-900 truncate">
                  {registeredUser.email}
                </div>
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-semibold rounded-lg shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>สลับบัญชี / ออก</span>
                </button>
              )}
            </div>
          )}

          {/* ส่วนตั้งค่าเปลี่ยนโลโก้หัวเว็บ (Website Header Logo) */}
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-700" />
                <span>เปลี่ยนโลโก้หัวเว็บ (Header Logo)</span>
              </label>
              {form.logoUrl && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, logoUrl: '' })}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบโลโก้ / ใช้ค่าเริ่มต้น</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl border border-emerald-300 bg-white flex items-center justify-center overflow-hidden shrink-0">
                {form.logoUrl ? (
                  <img
                    src={form.logoUrl}
                    alt="ตัวอย่างโลโก้หัวเว็บ"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <span className="text-[11px] font-bold text-emerald-800 text-center px-1">
                    โลโก้เริ่มต้น
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>อัปโหลดรูปโลโก้จากเครื่อง</span>
                  </button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileUpload}
                    className="hidden"
                  />
                </div>
                <input
                  type="text"
                  value={form.logoUrl || ''}
                  onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                  placeholder="หรือวางลิงก์รูปภาพโลโก้ (URL)..."
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อสถานพยาบาล (หัวเว็บและหัวสติกเกอร์)
              </label>
              <input
                type="text"
                required
                value={form.hospitalName}
                onChange={(e) => setForm({ ...form, hospitalName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ที่ตั้ง (ตำบล / อำเภอ / จังหวัด)
              </label>
              <input
                type="text"
                required
                value={form.subdistrictLine}
                onChange={(e) =>
                  setForm({ ...form, subdistrictLine: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เบอร์ติดต่อท้ายสติกเกอร์ยา
              </label>
              <input
                type="text"
                required
                value={form.hospitalPhone}
                onChange={(e) => setForm({ ...form, hospitalPhone: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ค่าเริ่มต้นเว้นช่องสติกเกอร์ (0-9)
              </label>
              <input
                type="number"
                min={0}
                max={9}
                value={form.defaultBlankOffset}
                onChange={(e) =>
                  setForm({ ...form, defaultBlankOffset: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เกณฑ์เป้าหมายคุม HT ได้ (%)
              </label>
              <input
                type="number"
                min={10}
                max={100}
                value={form.targetHTPercent}
                onChange={(e) =>
                  setForm({ ...form, targetHTPercent: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เกณฑ์เป้าหมายคุม DM ได้ (%)
              </label>
              <input
                type="number"
                min={10}
                max={100}
                value={form.targetDMPercent}
                onChange={(e) =>
                  setForm({ ...form, targetDMPercent: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* จัดการฐานข้อมูล LocalStorage */}
          <div className="pt-3 border-t border-slate-200 space-y-2.5">
            <div className="text-xs font-bold text-slate-800">
              การจัดการข้อมูลในระบบ (LocalStorage Persistence)
            </div>

            {importStatusMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900">
                {importStatusMsg}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onExportBackup}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>สำรองข้อมูล (.JSON)</span>
                </button>

                <button
                  type="button"
                  onClick={() => backupInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>นำเข้าข้อมูล (.JSON)</span>
                </button>
                <input
                  ref={backupInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleBackupFileImport}
                  className="hidden"
                />
              </div>

              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>รีเซ็ตข้อมูลเริ่มต้น</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onResetDemoData();
                      setConfirmReset(false);
                      onClose();
                    }}
                    className="px-2.5 py-1 bg-rose-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    ยืนยันรีเซ็ตข้อมูล
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-2.5 py-1 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>บันทึกการตั้งค่า</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
