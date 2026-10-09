import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Mail,
  Package,
  Printer,
  Settings,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  Users,
} from 'lucide-react';
import { signInWithGmail, signOutUser } from './firebase';
import {
  type ClinicSettings,
  type DrugFormularyItem,
  type Patient,
  type StickerPrintItem,
  type StockTransaction,
} from './types';
import {
  DEFAULT_CLINIC_SETTINGS,
  DRUG_FORMULARY,
  INITIAL_PATIENTS,
  INITIAL_STICKER_QUEUE,
  INITIAL_STOCK_TRANSACTIONS,
  getTodayIsoDate,
} from './data/initialData';
import { PatientRegistryView } from './components/PatientRegistryView';
import { ClinicalVisitView } from './components/ClinicalVisitView';
import { StickerPrintCenterView } from './components/StickerPrintCenterView';
import { NcdDashboardView } from './components/NcdDashboardView';
import { DrugInventoryView } from './components/DrugInventoryView';
import {
  SettingsModal,
  type RegisteredGmailUser,
} from './components/SettingsModal';

type ActiveTab = 'registry' | 'visit' | 'print' | 'dashboard' | 'inventory';

const STORAGE_KEYS = {
  PATIENTS: 'nongchim_dmht_patients_v2',
  STICKER_QUEUE: 'nongchim_dmht_stickers_v2',
  DRUG_INVENTORY: 'nongchim_dmht_drugs_v2',
  STOCK_TX: 'nongchim_dmht_stock_tx_v2',
  SETTINGS: 'nongchim_dmht_settings_v2',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  // สถานะลงทะเบียนเข้าใช้งานด้วย Gmail (ไม่จำค่าในเครื่อง เปิดเครื่องใหม่ต้องลงทะเบียนเข้าใช้งานใหม่เสมอ)
  const [registeredUser, setRegisteredUser] =
    useState<RegisteredGmailUser | null>(null);
  const [regFullName, setRegFullName] = useState<string>('');
  const [regRole, setRegRole] = useState<string>('พยาบาลวิชาชีพ / เวชปฏิบัติ');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regNotice, setRegNotice] = useState<string>('');
  const [isConnectingGoogle, setIsConnectingGoogle] = useState<boolean>(false);

  // แท็บหน้าจอหลัก
  const [activeTab, setActiveTab] = useState<ActiveTab>('registry');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // ข้อมูลระบบที่บันทึกใน LocalStorage
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings>(() =>
    loadFromStorage(STORAGE_KEYS.SETTINGS, DEFAULT_CLINIC_SETTINGS)
  );
  const [patients, setPatients] = useState<Patient[]>(() =>
    loadFromStorage(STORAGE_KEYS.PATIENTS, INITIAL_PATIENTS)
  );
  const [stickerQueue, setStickerQueue] = useState<StickerPrintItem[]>(() =>
    loadFromStorage(STORAGE_KEYS.STICKER_QUEUE, INITIAL_STICKER_QUEUE)
  );
  const [drugs, setDrugs] = useState<DrugFormularyItem[]>(() =>
    loadFromStorage(STORAGE_KEYS.DRUG_INVENTORY, DRUG_FORMULARY)
  );
  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>(
    () => loadFromStorage(STORAGE_KEYS.STOCK_TX, INITIAL_STOCK_TRANSACTIONS)
  );

  // ผู้ป่วยที่กำลังเปิดตรวจในหน้า Clinical Visit
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    () => patients[0]?.id || INITIAL_PATIENTS[0].id
  );

  // ซิงค์ข้อมูลลง LocalStorage อัตโนมัติเมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
    } catch (e) {
      console.error('Failed saving patients to LocalStorage', e);
    }
  }, [patients]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STICKER_QUEUE, JSON.stringify(stickerQueue));
    } catch (e) {
      console.error('Failed saving stickers to LocalStorage', e);
    }
  }, [stickerQueue]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DRUG_INVENTORY, JSON.stringify(drugs));
    } catch (e) {
      console.error('Failed saving drugs to LocalStorage', e);
    }
  }, [drugs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STOCK_TX, JSON.stringify(stockTransactions));
    } catch (e) {
      console.error('Failed saving stock transactions to LocalStorage', e);
    }
  }, [stockTransactions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(clinicSettings));
    } catch (e) {
      console.error('Failed saving settings to LocalStorage', e);
    }
  }, [clinicSettings]);

  // ล้างค่าการจำอีเมลใน Storage ทุกครั้งที่เปิดหน้าเว็บ เพื่อให้ทุกเครื่องต้องลงทะเบียนเข้าใช้งานใหม่เสมอ
  useEffect(() => {
    try {
      localStorage.removeItem('nongchim_dmht_gmail_session_v1');
      localStorage.removeItem('nongchim_dmht_gmail_session_v2');
      sessionStorage.removeItem('nongchim_dmht_gmail_session_v1');
      sessionStorage.removeItem('nongchim_dmht_gmail_session_v2');
    } catch {
      // ignore
    }
    signOutUser().catch(() => {});
  }, []);

  const getCurrentTimestampStr = () => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    return `${getTodayIsoDate()} ${time}`;
  };

  // ลงทะเบียนเข้าใช้งานด้วยฟอร์ม Gmail โดยตรง (ไม่ติดแถบแดง และไม่จำอีเมลค้างในเครื่อง)
  const handleRegisterWithGmailForm = (e: React.FormEvent) => {
    e.preventDefault();
    let cleanedEmail = regEmail.trim().toLowerCase();
    if (!cleanedEmail) {
      setRegNotice('กรุณากรอกชื่อบัญชี Gmail เพื่อลงทะเบียนเข้าใช้งานระบบ');
      return;
    }
    // หากพิมพ์เฉพาะชื่อด้านหน้า ระบบเติม @gmail.com ให้อัตโนมัติ
    if (!cleanedEmail.includes('@')) {
      cleanedEmail = `${cleanedEmail}@gmail.com`;
    }

    const displayFullName =
      regFullName.trim() || cleanedEmail.split('@')[0] || 'เจ้าหน้าที่คลินิก DM-HT';

    setRegisteredUser({
      fullName: displayFullName,
      role: regRole,
      email: cleanedEmail,
      registeredAt: getCurrentTimestampStr(),
    });
    setRegFullName('');
    setRegEmail('');
    setRegNotice('');
  };

  // ลงทะเบียนด่วนผ่านการเชื่อมต่อบัญชี Google (Gmail)
  const handleQuickGoogleRegister = async () => {
    setIsConnectingGoogle(true);
    setRegNotice('');
    try {
      const user = await signInWithGmail();
      if (user?.email) {
        setRegisteredUser({
          fullName:
            user.displayName ||
            regFullName.trim() ||
            user.email.split('@')[0] ||
            'เจ้าหน้าที่คลินิก DM-HT',
          role: regRole,
          email: user.email.toLowerCase(),
          registeredAt: getCurrentTimestampStr(),
        });
        setRegFullName('');
        setRegEmail('');
      }
    } catch {
      // หากเบราว์เซอร์บล็อกหน้าต่างป๊อปอัป ไม่แสดงแถบแดง แต่แจ้งให้กรอกในช่อง Gmail ด้านบนแทน
      setRegNotice('กรุณากรอกอีเมล Gmail ในช่องด้านบน แล้วกดปุ่ม "ลงทะเบียนเข้าใช้งานด้วย Gmail"');
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleLogoutRegistration = async () => {
    try {
      await signOutUser();
    } catch {
      // ignore
    }
    setRegisteredUser(null);
    setRegFullName('');
    setRegEmail('');
    setRegNotice('');
    setIsSettingsOpen(false);
  };

  // บันทึกตั้งค่าระบบและอัปเดตหัวสติกเกอร์ที่อยู่ในคิว
  const handleSaveSettings = (nextSettings: ClinicSettings) => {
    setClinicSettings(nextSettings);
    setStickerQueue((prev) =>
      prev.map((stk) => ({
        ...stk,
        hospitalName: nextSettings.hospitalName,
        hospitalPhone: nextSettings.hospitalPhone,
      }))
    );
  };

  // การจัดการข้อมูลผู้ป่วย
  const handleAddPatient = (newPt: Patient) => {
    setPatients((prev) => [newPt, ...prev]);
    setSelectedPatientId(newPt.id);
  };

  const handleUpdatePatient = (updatedPt: Patient) => {
    setPatients((prev) => prev.map((p) => (p.id === updatedPt.id ? updatedPt : p)));
  };

  const handleDeletePatient = (patientId: string) => {
    setPatients((prev) => {
      const remaining = prev.filter((p) => p.id !== patientId);
      if (selectedPatientId === patientId && remaining.length > 0) {
        setSelectedPatientId(remaining[0].id);
      }
      return remaining;
    });
  };

  const handleStartVisit = (patient: Patient) => {
    setSelectedPatientId(patient.id);
    setActiveTab('visit');
  };

  // บันทึกการตรวจ & ตัดสต๊อกยาอัตโนมัติ & ส่งคิวพิมพ์สติกเกอร์
  const handleSaveVisitAndQueueStickers = (
    updatedPatient: Patient,
    stickersToPrint: StickerPrintItem[],
    navigateToPrint: boolean
  ) => {
    handleUpdatePatient(updatedPatient);

    // ตัดสต๊อกยาในคลังตามรายการที่สั่งจ่ายอย่างแม่นยำและบันทึกประวัติทันที
    if (updatedPatient.latestPrescriptions.length > 0) {
      const nowStr = getCurrentTimestampStr();
      const todayStr = getTodayIsoDate();
      const newTxs: StockTransaction[] = [];

      const nextDrugs = drugs.map((drug) => {
        const matchedRx = updatedPatient.latestPrescriptions.find(
          (rx) => rx.drugId === drug.id
        );
        if (!matchedRx || matchedRx.amount <= 0) return drug;

        const nextBalance = Math.max(0, drug.stockBalance - matchedRx.amount);
        newTxs.push({
          id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          drugId: drug.id,
          drugCode: drug.code,
          drugName: drug.fullName,
          category: drug.category,
          type: 'จ่ายยาผู้ป่วย',
          amount: matchedRx.amount,
          balanceAfter: nextBalance,
          note: `จ่ายยาผู้ป่วย ${updatedPatient.prefix}${updatedPatient.fullName} (HN: ${updatedPatient.hn})`,
          createdAt: nowStr,
        });

        return {
          ...drug,
          stockBalance: nextBalance,
          lastUpdated: todayStr,
        };
      });

      setDrugs(nextDrugs);
      if (newTxs.length > 0) {
        setStockTransactions((prev) => [...newTxs, ...prev]);
      }
    }

    if (stickersToPrint.length > 0) {
      setStickerQueue(stickersToPrint);
    }
    if (navigateToPrint) {
      setActiveTab('print');
    }
  };

  // รับยาเข้าคลัง (Stock In)
  const handleReceiveStock = (
    drugId: string,
    addedAmount: number,
    lotNumber: string,
    expiryDate: string,
    note: string
  ) => {
    const nowStr = getCurrentTimestampStr();
    const targetDrug = drugs.find((d) => d.id === drugId);
    if (!targetDrug) return;

    const nextBalance = (targetDrug.stockBalance || 0) + addedAmount;

    setDrugs((prev) =>
      prev.map((d) =>
        d.id === drugId
          ? {
              ...d,
              stockBalance: nextBalance,
              lotNumber,
              expiryDate,
              lastUpdated: getTodayIsoDate(),
            }
          : d
      )
    );

    const tx: StockTransaction = {
      id: `tx-${Date.now()}`,
      drugId: targetDrug.id,
      drugCode: targetDrug.code,
      drugName: targetDrug.fullName,
      category: targetDrug.category,
      type: 'รับยาเข้าคลัง',
      amount: addedAmount,
      balanceAfter: nextBalance,
      lotNumber,
      expiryDate,
      note,
      createdAt: nowStr,
    };

    setStockTransactions((prev) => [tx, ...prev]);
  };

  // เพิ่มรายการยาใหม่เข้าคลัง
  const handleAddNewDrug = (newDrug: DrugFormularyItem, note: string) => {
    setDrugs((prev) => [newDrug, ...prev]);
    const tx: StockTransaction = {
      id: `tx-${Date.now()}`,
      drugId: newDrug.id,
      drugCode: newDrug.code,
      drugName: newDrug.fullName,
      category: newDrug.category,
      type: 'เพิ่มรายการยาใหม่',
      amount: newDrug.stockBalance,
      balanceAfter: newDrug.stockBalance,
      lotNumber: newDrug.lotNumber,
      expiryDate: newDrug.expiryDate,
      note,
      createdAt: getCurrentTimestampStr(),
    };
    setStockTransactions((prev) => [tx, ...prev]);
  };

  // แก้ไขข้อมูลยา / ปรับยอดคงเหลือตามนับจริง
  const handleUpdateDrug = (updatedDrug: DrugFormularyItem, note: string) => {
    const existing = drugs.find((d) => d.id === updatedDrug.id);
    setDrugs((prev) =>
      prev.map((d) => (d.id === updatedDrug.id ? updatedDrug : d))
    );

    if (existing && existing.stockBalance !== updatedDrug.stockBalance) {
      const diff = updatedDrug.stockBalance - existing.stockBalance;
      const tx: StockTransaction = {
        id: `tx-${Date.now()}`,
        drugId: updatedDrug.id,
        drugCode: updatedDrug.code,
        drugName: updatedDrug.fullName,
        category: updatedDrug.category,
        type: diff >= 0 ? 'รับยาเข้าคลัง' : 'จ่ายยาผู้ป่วย',
        amount: Math.abs(diff),
        balanceAfter: updatedDrug.stockBalance,
        lotNumber: updatedDrug.lotNumber,
        expiryDate: updatedDrug.expiryDate,
        note: `${note} (ปรับยอดจาก ${existing.stockBalance.toLocaleString()} เป็น ${updatedDrug.stockBalance.toLocaleString()} เม็ด)`,
        createdAt: getCurrentTimestampStr(),
      };
      setStockTransactions((prev) => [tx, ...prev]);
    }
  };

  // ลบรายการยาออกจากคลัง
  const handleDeleteDrug = (drugId: string) => {
    setDrugs((prev) => prev.filter((d) => d.id !== drugId));
  };

  const handleResetDemoData = () => {
    setPatients(INITIAL_PATIENTS);
    setStickerQueue(INITIAL_STICKER_QUEUE);
    setDrugs(DRUG_FORMULARY);
    setStockTransactions(INITIAL_STOCK_TRANSACTIONS);
    setClinicSettings(DEFAULT_CLINIC_SETTINGS);
    setSelectedPatientId(INITIAL_PATIENTS[0].id);
  };

  const handleExportBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      clinicSettings,
      patients,
      stickerQueue,
      drugs,
      stockTransactions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `สำรองข้อมูล_คลินิก_DM_HT_รพสต_หนองชิ่ม_${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (jsonText: string): boolean => {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed.clinicSettings) setClinicSettings(parsed.clinicSettings);
      if (Array.isArray(parsed.patients) && parsed.patients.length > 0) {
        setPatients(parsed.patients);
        setSelectedPatientId(parsed.patients[0].id);
      }
      if (Array.isArray(parsed.stickerQueue)) setStickerQueue(parsed.stickerQueue);
      if (Array.isArray(parsed.drugs)) setDrugs(parsed.drugs);
      if (Array.isArray(parsed.stockTransactions)) {
        setStockTransactions(parsed.stockTransactions);
      }
      return true;
    } catch {
      return false;
    }
  };

  const selectedPatient =
    patients.find((p) => p.id === selectedPatientId) ||
    patients[0] ||
    INITIAL_PATIENTS[0];

  // ---------------------------------------------------------------------------
  // หน้าลงทะเบียนเข้าใช้งานด้วย Gmail (ไม่จำอีเมลในเครื่อง ส่งเว็บไปเครื่องไหนต้องลงทะเบียนเข้าใช้งานใหม่เสมอ)
  // ---------------------------------------------------------------------------
  if (!registeredUser) {
    return (
      <div className="min-h-screen bg-[#f4fbf7] flex items-center justify-center p-4 sm:p-8">
        <main className="max-w-md w-full bg-white rounded-2xl border border-emerald-200/90 p-6 sm:p-8 shadow-sm space-y-6">
          {/* ส่วนหัวหน้าลงทะเบียนเข้าใช้งาน */}
          <div className="text-center space-y-2">
            {clinicSettings.logoUrl ? (
              <img
                src={clinicSettings.logoUrl}
                alt="โลโก้สถานพยาบาล"
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl object-contain mx-auto border border-emerald-200 bg-white p-1.5"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                <UserCheck className="w-7 h-7" />
              </div>
            )}

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800">
              <span>ระบบลงทะเบียนเข้าใช้งานด้วยบัญชี Gmail</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              ลงทะเบียนเข้าใช้งานระบบ
            </h1>
            <p className="text-sm font-semibold text-emerald-900">
              {clinicSettings.hospitalName}
            </p>
            <p className="text-xs text-slate-500">
              คลินิกโรคเรื้อรัง (เบาหวาน · ความดันโลหิตสูง)
            </p>
          </div>

          {/* แบบฟอร์มลงทะเบียนเข้าใช้งานด้วย Gmail */}
          <form
            onSubmit={handleRegisterWithGmailForm}
            autoComplete="off"
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                1. บัญชีอีเมล Gmail ผู้ใช้งาน <span className="text-emerald-700">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-emerald-700 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  name="gmail_registration_input"
                  autoComplete="off"
                  autoFocus
                  required
                  value={regEmail}
                  onChange={(e) => {
                    setRegEmail(e.target.value);
                    if (regNotice) setRegNotice('');
                  }}
                  placeholder="ระบุอีเมล เช่น name@gmail.com"
                  className="w-full pl-10 pr-24 py-2.5 text-sm bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                {!regEmail.includes('@') && (
                  <button
                    type="button"
                    onClick={() =>
                      setRegEmail((prev) =>
                        prev.trim() ? `${prev.trim()}@gmail.com` : '@gmail.com'
                      )
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-mono font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg cursor-pointer"
                  >
                    +@gmail.com
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  2. ชื่อ-สกุลผู้ปฏิบัติงาน
                </label>
                <input
                  type="text"
                  name="staff_name_registration"
                  autoComplete="off"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="ชื่อ-นามสกุล (ถ้ามี)"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  3. ตำแหน่ง / ฝ่ายงาน
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="w-full px-2.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="พยาบาลวิชาชีพ / เวชปฏิบัติ">
                    พยาบาลวิชาชีพ / เวชปฏิบัติ
                  </option>
                  <option value="นักวิชาการสาธารณสุข">
                    นักวิชาการสาธารณสุข
                  </option>
                  <option value="เจ้าพนักงานเภสัชกรรม">
                    เจ้าพนักงานเภสัชกรรม
                  </option>
                  <option value="เจ้าหน้าที่คลินิก NCD">
                    เจ้าหน้าที่คลินิก NCD
                  </option>
                </select>
              </div>
            </div>

            {regNotice && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900">
                {regNotice}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>ลงทะเบียนเข้าใช้งานด้วย Gmail</span>
            </button>
          </form>

          {/* ทางเลือกดึงบัญชีจาก Google อัตโนมัติ */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <button
              type="button"
              onClick={handleQuickGoogleRegister}
              disabled={isConnectingGoogle}
              className="w-full py-2.5 px-4 bg-slate-50 hover:bg-emerald-50/60 text-slate-800 border border-slate-200 rounded-xl font-semibold text-xs flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>
                {isConnectingGoogle
                  ? 'กำลังเชื่อมต่อบัญชี Google...'
                  : 'หรือเลือกบัญชีผ่านหน้าต่าง Google (Gmail)'}
              </span>
            </button>

            <div className="text-center text-[11px] text-slate-400">
              {clinicSettings.subdistrictLine} · โทร {clinicSettings.hospitalPhone}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // หน้าจอหลักของระบบคลินิก DM-HT รพ.สต.หนองชิ่ม
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#f6fbf8] text-slate-900 flex flex-col">
      {/* Top Bar Contract: 3 Zones (Brand + Logo, 5 color-coded category nav tabs, 1 Gear icon button) */}
      <header className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-emerald-200/80 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Zone 1: Brand wordmark + Custom Header Logo */}
        <a
          href="#registry"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('registry');
          }}
          className="flex items-center gap-2.5 text-base sm:text-lg font-bold tracking-tight text-emerald-950 whitespace-nowrap shrink-0"
        >
          {clinicSettings.logoUrl ? (
            <img
              src={clinicSettings.logoUrl}
              alt="โลโก้หัวเว็บ"
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-lg object-contain border border-emerald-200 bg-white p-0.5 shrink-0"
            />
          ) : (
            <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </span>
          )}
          <span>รพ.สต.หนองชิ่ม · คลินิก DM-HT</span>
        </a>

        {/* Zone 2: 5 หมวดหมู่หลัก แยกสีพื้นหลังชัดเจนแต่ละหมวด */}
        <nav className="flex items-center gap-2 sm:gap-2.5 text-xs sm:text-sm font-semibold overflow-x-auto py-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('registry')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'registry'
                ? 'bg-emerald-600 text-white border-emerald-700 font-bold shadow-xs ring-2 ring-emerald-600/20'
                : 'bg-emerald-50 hover:bg-emerald-100/90 text-emerald-900 border-emerald-200/90'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>ทะเบียนผู้ป่วย DM-HT</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('visit')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'visit'
                ? 'bg-sky-600 text-white border-sky-700 font-bold shadow-xs ring-2 ring-sky-600/20'
                : 'bg-sky-50 hover:bg-sky-100/90 text-sky-900 border-sky-200/90'
            }`}
          >
            <Stethoscope className="w-4 h-4 shrink-0" />
            <span>ตรวจรักษา & สั่งยา</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('print')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'print'
                ? 'bg-amber-600 text-white border-amber-700 font-bold shadow-xs ring-2 ring-amber-600/20'
                : 'bg-amber-50 hover:bg-amber-100/90 text-amber-950 border-amber-200/90'
            }`}
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>ศูนย์พิมพ์สติกเกอร์ A4 ({stickerQueue.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-violet-600 text-white border-violet-700 font-bold shadow-xs ring-2 ring-violet-600/20'
                : 'bg-violet-50 hover:bg-violet-100/90 text-violet-900 border-violet-200/90'
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span>สถิติคลินิก NCD</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-rose-600 text-white border-rose-700 font-bold shadow-xs ring-2 ring-rose-600/20'
                : 'bg-rose-50 hover:bg-rose-100/90 text-rose-900 border-rose-200/90'
            }`}
          >
            <Package className="w-4 h-4 shrink-0" />
            <span>คลังสต๊อกยา DM-HT</span>
          </button>
        </nav>

        {/* Zone 3: ปุ่มตั้งค่าระบบ (สัญลักษณ์เฟือง) */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="ตั้งค่าระบบ"
            title="ตั้งค่าระบบ"
            className="p-2 rounded-lg text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 border border-emerald-200/80 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* พื้นที่แสดงผลหลัก */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'registry' && (
          <PatientRegistryView
            patients={patients}
            onAddPatient={handleAddPatient}
            onUpdatePatient={handleUpdatePatient}
            onDeletePatient={handleDeletePatient}
            onStartVisit={handleStartVisit}
          />
        )}

        {activeTab === 'visit' && (
          <ClinicalVisitView
            patients={patients}
            selectedPatient={selectedPatient}
            onSelectPatient={(pt) => setSelectedPatientId(pt.id)}
            clinicSettings={clinicSettings}
            drugs={drugs}
            onSaveVisitAndQueueStickers={handleSaveVisitAndQueueStickers}
          />
        )}

        {activeTab === 'print' && (
          <StickerPrintCenterView
            patients={patients}
            stickerQueue={stickerQueue}
            onUpdateQueue={setStickerQueue}
            clinicSettings={clinicSettings}
          />
        )}

        {activeTab === 'dashboard' && (
          <NcdDashboardView
            patients={patients}
            clinicSettings={clinicSettings}
            drugs={drugs}
          />
        )}

        {activeTab === 'inventory' && (
          <DrugInventoryView
            drugs={drugs}
            transactions={stockTransactions}
            onReceiveStock={handleReceiveStock}
            onAddNewDrug={handleAddNewDrug}
            onUpdateDrug={handleUpdateDrug}
            onDeleteDrug={handleDeleteDrug}
          />
        )}
      </main>

      {/* ส่วนท้ายหน้าเว็บ */}
      <footer className="no-print border-t border-emerald-200/60 bg-white px-6 py-4 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          {clinicSettings.hospitalName} · {clinicSettings.subdistrictLine} · โทร{' '}
          {clinicSettings.hospitalPhone}
        </div>
        <div className="tabular-nums">
          ผู้ลงทะเบียนใช้งาน: {registeredUser.fullName} ({registeredUser.email})
        </div>
      </footer>

      {/* หน้าต่างตั้งค่าระบบ (เปิดจากปุ่มสัญลักษณ์เฟือง) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={clinicSettings}
        onSaveSettings={handleSaveSettings}
        onResetDemoData={handleResetDemoData}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        registeredUser={registeredUser}
        onLogout={handleLogoutRegistration}
      />
    </div>
  );
}
