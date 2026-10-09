import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Pill,
  Plus,
  Printer,
  Save,
  Trash2,
  User,
} from 'lucide-react';
import {
  type ClinicSettings,
  type DrugCategory,
  type DrugFormularyItem,
  type Patient,
  type PrescribedDrug,
  type StickerPrintItem,
} from '../types';
import {
  VILLAGES,
  addDaysToIsoDate,
  calculateBmi,
  evaluateControlStatus,
  formatThaiDateBE,
  getTodayIsoDate,
  interpretBmi,
} from '../data/initialData';
import { StickerCard } from './StickerCard';

interface ClinicalVisitViewProps {
  patients: Patient[];
  selectedPatient: Patient;
  onSelectPatient: (patient: Patient) => void;
  clinicSettings: ClinicSettings;
  drugs: DrugFormularyItem[];
  onSaveVisitAndQueueStickers: (
    updatedPatient: Patient,
    stickersToPrint: StickerPrintItem[],
    navigateToPrint: boolean
  ) => void;
}

const DRUG_CATEGORIES: DrugCategory[] = [
  'ยาลดความดันโลหิต',
  'ยาลดระดับน้ำตาลในเลือด',
  'ยาลดไขมันในเลือด',
  'ยาต้านเกล็ดเลือด',
  'วิตามินบำรุงปลายประสาท',
];

const APPOINTMENT_GOALS = [
  'เจาะเลือด DTX งดน้ำ-อาหารหลังเที่ยงคืน และรับยาต่อเนื่อง',
  'วัดความดันโลหิตและรับยาโรคเรื้อรังต่อเนื่อง',
  'เจาะเลือดตรวจแล็บประจำปี (FBS, HbA1c, Lipid, Creatinine) งดอาหารหลังเที่ยงคืน',
  'ติดตามปรับขนาดยาและประเมินอาการข้างเคียงอย่างใกล้ชิด',
];

export const ClinicalVisitView: React.FC<ClinicalVisitViewProps> = ({
  patients,
  selectedPatient,
  onSelectPatient,
  clinicSettings,
  drugs,
  onSaveVisitAndQueueStickers,
}) => {
  // สัญญาณชีพ & ผลตรวจ
  const [systolic, setSystolic] = useState<number>(selectedPatient.systolic);
  const [diastolic, setDiastolic] = useState<number>(selectedPatient.diastolic);
  const [pulseRate, setPulseRate] = useState<number>(selectedPatient.pulseRate || 74);
  const [respiratoryRate, setRespiratoryRate] = useState<number>(
    selectedPatient.respiratoryRate || 18
  );
  const [dtx, setDtx] = useState<number>(selectedPatient.dtx);
  const [hba1c, setHba1c] = useState<string>(
    selectedPatient.hba1c ? String(selectedPatient.hba1c) : ''
  );
  const [weight, setWeight] = useState<number>(selectedPatient.weight);
  const [height, setHeight] = useState<number>(selectedPatient.height);

  // คัดกรองภาวะแทรกซ้อน
  const [footExamDone, setFootExamDone] = useState<boolean>(selectedPatient.footExamDone);
  const [footExamResult, setFootExamResult] = useState<Patient['footExamResult']>(
    selectedPatient.footExamResult
  );
  const [retinalExamDone, setRetinalExamDone] = useState<boolean>(
    selectedPatient.retinalExamDone
  );
  const [retinalExamResult, setRetinalExamResult] = useState<Patient['retinalExamResult']>(
    selectedPatient.retinalExamResult
  );

  // แผนการนัดหมายครั้งถัดไป
  const [appointmentDaysShortcut, setAppointmentDaysShortcut] = useState<number>(60);
  const [nextAppointmentDate, setNextAppointmentDate] = useState<string>(
    selectedPatient.nextAppointmentDate || addDaysToIsoDate(getTodayIsoDate(), 60)
  );
  const [nextAppointmentPeriod, setNextAppointmentPeriod] = useState<
    Patient['nextAppointmentPeriod']
  >(selectedPatient.nextAppointmentPeriod || 'ช่วงเช้า (08.00 - 11.30 น.)');
  const [nextAppointmentGoal, setNextAppointmentGoal] = useState<string>(
    selectedPatient.nextAppointmentGoal || APPOINTMENT_GOALS[0]
  );
  const [clinicalNote, setClinicalNote] = useState<string>(
    'ผู้ป่วยรับประทานยาสม่ำเสมอ แนะนำคุมอาหารลดหวาน มัน เค็ม ตามหลัก 2:1:1'
  );

  // รายการยาสั่งจ่าย
  const [activeDrugCategory, setActiveDrugCategory] = useState<DrugCategory>('ยาลดความดันโลหิต');
  const [prescriptions, setPrescriptions] = useState<PrescribedDrug[]>(
    selectedPatient.latestPrescriptions
  );
  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);
  const [allergyWarningMsg, setAllergyWarningMsg] = useState<string>('');
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string>('');

  // ซิงค์ข้อมูลเมื่อเปลี่ยนคนไข้
  useEffect(() => {
    setSystolic(selectedPatient.systolic);
    setDiastolic(selectedPatient.diastolic);
    setPulseRate(selectedPatient.pulseRate || 74);
    setRespiratoryRate(selectedPatient.respiratoryRate || 18);
    setDtx(selectedPatient.dtx);
    setHba1c(selectedPatient.hba1c ? String(selectedPatient.hba1c) : '');
    setWeight(selectedPatient.weight);
    setHeight(selectedPatient.height);
    setFootExamDone(selectedPatient.footExamDone);
    setFootExamResult(selectedPatient.footExamResult);
    setRetinalExamDone(selectedPatient.retinalExamDone);
    setRetinalExamResult(selectedPatient.retinalExamResult);
    setNextAppointmentDate(
      selectedPatient.nextAppointmentDate || addDaysToIsoDate(getTodayIsoDate(), 60)
    );
    setNextAppointmentPeriod(
      selectedPatient.nextAppointmentPeriod || 'ช่วงเช้า (08.00 - 11.30 น.)'
    );
    setNextAppointmentGoal(selectedPatient.nextAppointmentGoal || APPOINTMENT_GOALS[0]);
    setPrescriptions(
      selectedPatient.latestPrescriptions.map((item) => ({ ...item }))
    );
    setActivePreviewIndex(0);
    setAllergyWarningMsg('');
    setSavedSuccessMsg('');
  }, [selectedPatient]);

  // คำนวณ BMI และแปลผลอัตโนมัติ
  const currentBmi = useMemo(() => calculateBmi(weight, height), [weight, height]);
  const bmiInterpretation = useMemo(() => interpretBmi(currentBmi), [currentBmi]);

  // ประเมินสถานะการคุมโรคอัตโนมัติ
  const liveControlStatus = useMemo(
    () =>
      evaluateControlStatus(
        selectedPatient.diseaseGroup,
        systolic,
        diastolic,
        dtx,
        nextAppointmentDate
      ),
    [selectedPatient.diseaseGroup, systolic, diastolic, dtx, nextAppointmentDate]
  );

  // ปุ่มลัดเลือกวันนัด 1 เดือน (+30), 2 เดือน (+60), 3 เดือน (+90) พร้อมคำนวณจำนวนเม็ดยาอัตโนมัติ
  const handleSelectShortcutDays = (days: number) => {
    setAppointmentDaysShortcut(days);
    const targetIso = addDaysToIsoDate(getTodayIsoDate(), days);
    setNextAppointmentDate(targetIso);

    setPrescriptions((prev) =>
      prev.map((rx) => {
        const matchedDrug = drugs.find((d) => d.id === rx.drugId);
        if (!matchedDrug) return rx;
        return {
          ...rx,
          amount: Math.max(1, Math.round(matchedDrug.defaultPillsPerDay * days)),
        };
      })
    );
  };

  // ตรวจสอบว่ายาตรงกับประวัติแพ้ยาหรือไม่
  const isDrugMatchingAllergy = (drug: DrugFormularyItem): boolean => {
    if (!selectedPatient.hasAllergy || !selectedPatient.drugAllergy) return false;
    const allergyLower = selectedPatient.drugAllergy.toLowerCase();
    return drug.allergyKeywords.some((kw) => allergyLower.includes(kw.toLowerCase()));
  };

  // คลิกเพิ่มยาจากคลังยา รพ.สต.
  const handleAddDrugFromFormulary = (drug: DrugFormularyItem) => {
    if (isDrugMatchingAllergy(drug)) {
      setAllergyWarningMsg(
        `ระงับการสั่งจ่ายยาอัตโนมัติ: ผู้ป่วยมีประวัติแพ้ยา "${selectedPatient.drugAllergy}" ซึ่งตรงกับกลุ่มยา ${drug.fullName}!`
      );
      return;
    }
    setAllergyWarningMsg('');

    const existingIdx = prescriptions.findIndex((p) => p.drugId === drug.id);
    const calculatedAmount = Math.max(
      1,
      Math.round(drug.defaultPillsPerDay * appointmentDaysShortcut)
    );

    if (existingIdx >= 0) {
      setActivePreviewIndex(existingIdx);
      return;
    }

    const newRx: PrescribedDrug = {
      id: `rx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      drugId: drug.id,
      drugName: drug.fullName,
      category: drug.category,
      amount: calculatedAmount,
      unit: 'เม็ด',
      regimen: drug.defaultRegimen,
      propertiesAndWarnings: drug.propertiesAndWarnings,
    };

    const nextList = [...prescriptions, newRx];
    setPrescriptions(nextList);
    setActivePreviewIndex(nextList.length - 1);
  };

  const handleUpdatePrescription = (
    index: number,
    field: keyof PrescribedDrug,
    value: string | number
  ) => {
    const updated = prescriptions.map((item, idx) =>
      idx === index ? { ...item, [field]: value } : item
    );
    setPrescriptions(updated);
    setActivePreviewIndex(index);
  };

  const handleRemovePrescription = (index: number) => {
    const updated = prescriptions.filter((_, idx) => idx !== index);
    setPrescriptions(updated);
    setActivePreviewIndex(Math.max(0, Math.min(activePreviewIndex, updated.length - 1)));
  };

  // สร้างข้อมูลสติกเกอร์สด (Live Sticker Preview)
  const liveStickers: StickerPrintItem[] = useMemo(() => {
    const todayThai = formatThaiDateBE(getTodayIsoDate());
    const nextApptThai = `${formatThaiDateBE(nextAppointmentDate)} (${nextAppointmentPeriod})`;
    return prescriptions.map((rx) => ({
      id: `stk-${rx.id}`,
      hospitalName: clinicSettings.hospitalName,
      patientName: `${selectedPatient.prefix}${selectedPatient.fullName}`,
      hn: selectedPatient.hn,
      printDateThai: todayThai,
      category: rx.category,
      drugName: rx.drugName,
      amount: rx.amount,
      unit: rx.unit || 'เม็ด',
      regimen: rx.regimen,
      propertiesAndWarnings: rx.propertiesAndWarnings,
      nextAppointmentText: nextApptThai,
      hospitalPhone: clinicSettings.hospitalPhone,
    }));
  }, [
    prescriptions,
    selectedPatient,
    nextAppointmentDate,
    nextAppointmentPeriod,
    clinicSettings,
  ]);

  const handleSaveClinicalVisit = (navigateToPrint: boolean) => {
    const todayIso = getTodayIsoDate();
    const updatedPatient: Patient = {
      ...selectedPatient,
      systolic: Number(systolic) || 120,
      diastolic: Number(diastolic) || 80,
      pulseRate: Number(pulseRate) || 72,
      respiratoryRate: Number(respiratoryRate) || 18,
      dtx: Number(dtx) || 100,
      hba1c: hba1c ? Number(hba1c) : selectedPatient.hba1c,
      weight: Number(weight) || selectedPatient.weight,
      height: Number(height) || selectedPatient.height,
      bmi: currentBmi,
      controlStatus: liveControlStatus,
      lastVisitDate: todayIso,
      nextAppointmentDate,
      nextAppointmentPeriod,
      nextAppointmentGoal,
      footExamDone,
      footExamResult,
      retinalExamDone,
      retinalExamResult,
      latestPrescriptions: prescriptions,
      visitHistory: [
        {
          id: `vh-${Date.now()}`,
          visitDate: todayIso,
          systolic: Number(systolic),
          diastolic: Number(diastolic),
          pulseRate: Number(pulseRate),
          respiratoryRate: Number(respiratoryRate),
          dtx: Number(dtx),
          hba1c: hba1c ? Number(hba1c) : undefined,
          weight: Number(weight),
          height: Number(height),
          bmi: currentBmi,
          bmiCategory: bmiInterpretation.shortLabel,
          controlStatus: liveControlStatus,
          nextAppointmentDate,
          nextAppointmentPeriod,
          nextAppointmentGoal,
          clinicalNote,
          prescriptions,
        },
        ...(selectedPatient.visitHistory || []),
      ],
    };

    onSaveVisitAndQueueStickers(updatedPatient, liveStickers, navigateToPrint);
    if (!navigateToPrint) {
      setSavedSuccessMsg(
        `บันทึกผลตรวจและส่งรายการฉลากยา ${liveStickers.length} รายการเข้าศูนย์พิมพ์สติกเกอร์เรียบร้อยแล้ว`
      );
      setTimeout(() => setSavedSuccessMsg(''), 4000);
    }
  };

  const villageObj = VILLAGES.find((v) => v.id === selectedPatient.villageId);
  const currentPreviewSticker = liveStickers[activePreviewIndex] || liveStickers[0];

  return (
    <div className="space-y-5">
      {/* แถบเลือกผู้ป่วยที่กำลังตรวจ */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-emerald-200/80 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-bold text-slate-900">
                {selectedPatient.prefix}
                {selectedPatient.fullName}
              </span>
              <span className="text-sm font-mono font-bold text-emerald-800 tabular-nums">
                HN: {selectedPatient.hn}
              </span>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs font-semibold text-emerald-900">
                กลุ่มโรค {selectedPatient.diseaseGroup}
              </span>
            </div>
            <div className="text-xs text-slate-600 mt-0.5 tabular-nums">
              <span>อายุ {selectedPatient.age} ปี</span>
              <span> · </span>
              <span>
                บ้านเลขที่ {selectedPatient.houseNumber} {selectedPatient.villageId}{' '}
                {villageObj?.villageName}
              </span>
              <span> · </span>
              <span>สิทธิ {selectedPatient.insurance}</span>
              <span> · </span>
              <span>โทร {selectedPatient.phone}</span>
            </div>
          </div>
        </div>

        {/* สลับผู้ป่วยด่วน */}
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            เปลี่ยนผู้ป่วย:
          </label>
          <select
            value={selectedPatient.id}
            onChange={(e) => {
              const found = patients.find((p) => p.id === e.target.value);
              if (found) onSelectPatient(found);
            }}
            className="px-3 py-2 text-xs font-semibold bg-emerald-50/60 border border-emerald-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            {patients.map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.hn} — {pt.prefix}
                {pt.fullName} ({pt.diseaseGroup})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* แถบแจ้งเตือนการแพ้ยา (Alert สีแดงขนาดใหญ่ทันทีเมื่อเปิดเคสที่มีประวัติแพ้ยา) */}
      {selectedPatient.hasAllergy && (
        <div
          role="alert"
          className="bg-red-600 text-white p-4 sm:p-5 rounded-xl border-2 border-red-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-3.5">
            <div className="p-2 bg-white/15 rounded-lg shrink-0">
              <AlertTriangle className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-bold tracking-tight">
                แจ้งเตือนประวัติการแพ้ยาสำคัญ (DRUG ALLERGY ALERT): ห้ามสั่งจ่ายยาที่แพ้เด็ดขาด!
              </div>
              <div className="text-sm font-semibold text-red-100 mt-0.5">
                ยาที่แพ้: <span className="underline text-white font-bold">{selectedPatient.drugAllergy}</span>
                {selectedPatient.allergySymptom
                  ? ` · อาการแพ้ที่พบ: ${selectedPatient.allergySymptom}`
                  : ''}
              </div>
            </div>
          </div>
          <div className="text-xs font-bold bg-red-800/80 px-3 py-1.5 rounded-lg whitespace-nowrap self-start sm:self-center">
            ระบบล็อกการสั่งยาที่ตรงกับประวัติแพ้ยาอัตโนมัติ
          </div>
        </div>
      )}

      {allergyWarningMsg && (
        <div className="bg-amber-50 border-2 border-red-500 text-red-800 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between">
          <span>{allergyWarningMsg}</span>
          <button
            type="button"
            onClick={() => setAllergyWarningMsg('')}
            className="text-xs underline ml-4 cursor-pointer"
          >
            รับทราบ
          </button>
        </div>
      )}

      {savedSuccessMsg && (
        <div className="bg-emerald-700 text-white px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedSuccessMsg}</span>
        </div>
      )}

      {/* โครงสร้างหลัก 2 คอลัมน์: ซ้าย = บันทึกตรวจ & สั่งยา, ขวา = Live Sticker Preview สด */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* คอลัมน์ซ้าย (7 ส่วน): สัญญาณชีพ + นัดหมาย + คลังยาสั่งจ่าย */}
        <div className="xl:col-span-7 space-y-5">
          {/* 1. สัญญาณชีพ & ผลตรวจ + คำนวณ BMI อัตโนมัติ */}
          <div className="bg-white p-5 rounded-xl border border-emerald-200/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-700" />
                <h2 className="text-base font-bold text-slate-900">
                  1. บันทึกสัญญาณชีพ ผลตรวจน้ำตาล และคำนวณดัชนีมวลกาย (BMI)
                </h2>
              </div>
              <span className="text-xs font-semibold text-emerald-800">
                สถานะประเมินผล:{' '}
                <strong
                  className={
                    liveControlStatus === 'คุมได้ดี'
                      ? 'text-emerald-700'
                      : liveControlStatus === 'เฝ้าระวัง'
                      ? 'text-amber-700'
                      : 'text-rose-700'
                  }
                >
                  {liveControlStatus}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  BP Systolic (ตัวบน)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={systolic}
                    onChange={(e) => setSystolic(Number(e.target.value))}
                    className={`w-full px-3 py-2 text-sm font-mono font-bold border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 tabular-nums ${
                      systolic >= 140
                        ? 'border-rose-400 bg-rose-50/40 text-rose-800'
                        : 'border-slate-300 text-slate-900'
                    }`}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                    mmHg
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  BP Diastolic (ตัวล่าง)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={diastolic}
                    onChange={(e) => setDiastolic(Number(e.target.value))}
                    className={`w-full px-3 py-2 text-sm font-mono font-bold border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 tabular-nums ${
                      diastolic >= 90
                        ? 'border-rose-400 bg-rose-50/40 text-rose-800'
                        : 'border-slate-300 text-slate-900'
                    }`}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                    mmHg
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชีพจร (PR)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={pulseRate}
                    onChange={(e) => setPulseRate(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 tabular-nums"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                    /นาที
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  การหายใจ (RR)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={respiratoryRate}
                    onChange={(e) => setRespiratoryRate(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 tabular-nums"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                    /นาที
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  น้ำตาลปลายนิ้ว (DTX/FBS)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={dtx}
                    onChange={(e) => setDtx(Number(e.target.value))}
                    className={`w-full px-3 py-2 text-sm font-mono font-bold border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 tabular-nums ${
                      dtx > 130
                        ? 'border-amber-400 bg-amber-50/40 text-amber-900'
                        : 'border-slate-300 text-slate-900'
                    }`}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                    mg/dL
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  น้ำตาลสะสม HbA1c (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={hba1c}
                  onChange={(e) => setHba1c(e.target.value)}
                  placeholder="เช่น 6.5"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  น้ำหนัก (กก.)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ส่วนสูง (ซม.)
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 tabular-nums"
                />
              </div>
            </div>

            {/* แถบแสดงผลคำนวณ BMI อัตโนมัติ + การคัดกรองเท้า/ตา */}
            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="text-xs font-semibold text-slate-700">
                  ดัชนีมวลกาย (BMI อัตโนมัติ):
                </div>
                <div className="font-mono text-lg font-bold text-emerald-900 tabular-nums">
                  {currentBmi} กก./ม²
                </div>
                <span
                  className={`text-xs font-bold ${
                    bmiInterpretation.tone === 'emerald'
                      ? 'text-emerald-700'
                      : bmiInterpretation.tone === 'amber'
                      ? 'text-amber-700'
                      : 'text-rose-700'
                  }`}
                >
                  — แปลผล: {bmiInterpretation.label}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <label className="inline-flex items-center gap-1.5 font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={footExamDone}
                    onChange={(e) => {
                      setFootExamDone(e.target.checked);
                      if (e.target.checked && footExamResult === 'ยังไม่ได้ตรวจ') {
                        setFootExamResult('ปกติ (Low Risk)');
                      }
                    }}
                    className="accent-emerald-600"
                  />
                  <span>ตรวจเท้าแล้ว</span>
                </label>
                <label className="inline-flex items-center gap-1.5 font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={retinalExamDone}
                    onChange={(e) => {
                      setRetinalExamDone(e.target.checked);
                      if (e.target.checked && retinalExamResult === 'ยังไม่ได้ตรวจ') {
                        setRetinalExamResult('ปกติ (No DR)');
                      }
                    }}
                    className="accent-emerald-600"
                  />
                  <span>ตรวจจอประสาทตาแล้ว</span>
                </label>
              </div>
            </div>
          </div>

          {/* 2. แผนการนัดหมายครั้งถัดไป */}
          <div className="bg-white p-5 rounded-xl border border-emerald-200/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <h2 className="text-base font-bold text-slate-900">
                  2. แผนการนัดหมายตรวจครั้งถัดไป (Next Appointment)
                </h2>
              </div>
              <span className="text-xs font-bold text-sky-800 tabular-nums">
                วันนัดบนสติกเกอร์: {formatThaiDateBE(nextAppointmentDate)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 mr-1">
                ปุ่มลัดเลือกวันนัดด่วน:
              </span>
              {[
                { label: '1 เดือน (+30 วัน)', days: 30 },
                { label: '2 เดือน (+60 วัน)', days: 60 },
                { label: '3 เดือน (+90 วัน)', days: 90 },
              ].map((btn) => (
                <button
                  key={btn.days}
                  type="button"
                  onClick={() => handleSelectShortcutDays(btn.days)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    appointmentDaysShortcut === btn.days
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-emerald-50/70 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ระบุวันที่นัดหมาย (ปฏิทิน)
                </label>
                <input
                  type="date"
                  value={nextAppointmentDate}
                  onChange={(e) => setNextAppointmentDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ช่วงเวลาตรวจ
                </label>
                <select
                  value={nextAppointmentPeriod}
                  onChange={(e) =>
                    setNextAppointmentPeriod(
                      e.target.value as Patient['nextAppointmentPeriod']
                    )
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                >
                  <option value="ช่วงเช้า (08.00 - 11.30 น.)">
                    ช่วงเช้า (08.00 - 11.30 น.) — เจาะเลือด/รับยา
                  </option>
                  <option value="ช่วงบ่าย (13.00 - 15.30 น.)">
                    ช่วงบ่าย (13.00 - 15.30 น.) — คลินิกความดัน/รับยา
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เป้าหมายการนัดหมายครั้งถัดไป
              </label>
              <select
                value={nextAppointmentGoal}
                onChange={(e) => setNextAppointmentGoal(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              >
                {APPOINTMENT_GOALS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                บันทึกอาการทางคลินิก / คำแนะนำสุขภาพ (Clinical Note)
              </label>
              <input
                type="text"
                value={clinicalNote}
                onChange={(e) => setClinicalNote(e.target.value)}
                placeholder="ระบุอาการ ความสม่ำเสมอในการทานยา หรือคำแนะนำการปรับพฤติกรรม..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* 3. การสั่งยาโรคเรื้อรัง (คลังยา รพ.สต. ครบตามหมวดหมู่) */}
          <div className="bg-white p-5 rounded-xl border border-emerald-200/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-emerald-700" />
                <h2 className="text-base font-bold text-slate-900">
                  3. สั่งจ่ายยาโรคเรื้อรัง (คลังยา รพ.สต.หนองชิ่ม)
                </h2>
              </div>
              <span className="text-xs text-slate-500">
                คลิกชื่อยาเพื่อดึงขนาดยา วิธีรับประทาน และสรรพคุณอัตโนมัติ
              </span>
            </div>

            {/* แท็บหมวดหมู่ยา 5 กลุ่ม แยกสีพื้นหลังแต่ละหมวด */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {DRUG_CATEGORIES.map((cat) => {
                const isSelected = activeDrugCategory === cat;
                const colorStyles: Record<DrugCategory, string> = {
                  ยาลดความดันโลหิต: isSelected
                    ? 'bg-teal-600 text-white border-teal-700 font-bold shadow-2xs'
                    : 'bg-teal-50 hover:bg-teal-100 text-teal-900 border-teal-200',
                  ยาลดระดับน้ำตาลในเลือด: isSelected
                    ? 'bg-sky-600 text-white border-sky-700 font-bold shadow-2xs'
                    : 'bg-sky-50 hover:bg-sky-100 text-sky-900 border-sky-200',
                  ยาลดไขมันในเลือด: isSelected
                    ? 'bg-amber-600 text-white border-amber-700 font-bold shadow-2xs'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-200',
                  ยาต้านเกล็ดเลือด: isSelected
                    ? 'bg-rose-600 text-white border-rose-700 font-bold shadow-2xs'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-200',
                  วิตามินบำรุงปลายประสาท: isSelected
                    ? 'bg-violet-600 text-white border-violet-700 font-bold shadow-2xs'
                    : 'bg-violet-50 hover:bg-violet-100 text-violet-900 border-violet-200',
                };
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveDrugCategory(cat)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${colorStyles[cat]}`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* ปุ่มเลือกยาในหมวดหมู่ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {drugs.filter((d) => d.category === activeDrugCategory).map((drug) => {
                const isAllergic = isDrugMatchingAllergy(drug);
                const isAdded = prescriptions.some((p) => p.drugId === drug.id);
                return (
                  <button
                    key={drug.id}
                    type="button"
                    onClick={() => handleAddDrugFromFormulary(drug)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-2 cursor-pointer ${
                      isAllergic
                        ? 'bg-red-50 border-red-300 text-red-900 hover:bg-red-100'
                        : isAdded
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
                        : 'bg-slate-50/70 border-slate-200 hover:border-emerald-400 hover:bg-white'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold flex items-center gap-1.5">
                        <span>{drug.fullName}</span>
                        {isAllergic && (
                          <span className="text-[11px] text-red-700 font-bold">
                            (ห้ามใช้ - แพ้ยา!)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                        {drug.defaultRegimen}
                      </div>
                      <div className="text-[11px] font-mono text-emerald-800 mt-0.5 tabular-nums">
                        คงเหลือในคลัง: {drug.stockBalance.toLocaleString()} เม็ด
                      </div>
                    </div>
                    <div className="shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                          isAllergic
                            ? 'bg-red-600 text-white'
                            : isAdded
                            ? 'bg-emerald-700 text-white'
                            : 'bg-white border border-slate-300 text-slate-700'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                        <span>{isAdded ? 'เลือกแล้ว' : 'เพิ่มยา'}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ตารางรายการยาที่สั่งจ่ายและปรับแก้จำนวนเม็ด/วิธีรับประทานได้อิสระ */}
            <div className="pt-2 space-y-3">
              <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>รายการยาที่สั่งจ่ายในครั้งนี้ ({prescriptions.length} รายการ)</span>
                <span className="text-emerald-700 font-medium">
                  คลิกที่รายการยาเพื่อดูพรีวิวสติกเกอร์ด้านขวา
                </span>
              </div>

              {prescriptions.length === 0 ? (
                <div className="p-6 text-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500">
                  ยังไม่มีรายการยาสั่งจ่าย กรุณาคลิกเลือกยาจากคลังยาด้านบน
                </div>
              ) : (
                <div className="space-y-3">
                  {prescriptions.map((rx, index) => {
                    const isFocused = index === activePreviewIndex;
                    return (
                      <div
                        key={rx.id}
                        onClick={() => setActivePreviewIndex(index)}
                        className={`p-3.5 rounded-xl border transition-colors cursor-pointer ${
                          isFocused
                            ? 'bg-emerald-50/50 border-emerald-500'
                            : 'bg-white border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-emerald-800">
                              #{index + 1} · {rx.category}
                            </span>
                            <input
                              type="text"
                              value={rx.drugName}
                              onChange={(e) =>
                                handleUpdatePrescription(index, 'drugName', e.target.value)
                              }
                              className="px-2.5 py-1 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-700">
                              จำนวน:
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={1000}
                              value={rx.amount}
                              onChange={(e) =>
                                handleUpdatePrescription(
                                  index,
                                  'amount',
                                  Number(e.target.value)
                                )
                              }
                              className="w-20 px-2.5 py-1 text-sm font-mono font-bold text-emerald-900 bg-white border border-emerald-400 rounded-lg text-right tabular-nums"
                            />
                            <span className="text-xs font-semibold text-slate-700">เม็ด</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePrescription(index);
                              }}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="ลบรายการยานี้"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-red-700 mb-0.5">
                              วิธีรับประทาน (แสดงตัวอักษรสีแดงบนสติกเกอร์):
                            </label>
                            <input
                              type="text"
                              value={rx.regimen}
                              onChange={(e) =>
                                handleUpdatePrescription(index, 'regimen', e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                              สรรพคุณ / คำเตือน:
                            </label>
                            <input
                              type="text"
                              value={rx.propertiesAndWarnings}
                              onChange={(e) =>
                                handleUpdatePrescription(
                                  index,
                                  'propertiesAndWarnings',
                                  e.target.value
                                )
                              }
                              className="w-full px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 4. ประวัติการตรวจรักษาและรับยาย้อนหลังของผู้ป่วยรายนี้ */}
          {selectedPatient.visitHistory && selectedPatient.visitHistory.length > 0 && (
            <div className="bg-white p-5 rounded-xl border border-emerald-200/80 space-y-3">
              <div className="text-sm font-bold text-slate-900">
                ประวัติการตรวจรักษาและสั่งจ่ายยาย้อนหลัง ({selectedPatient.visitHistory.length} ครั้ง)
              </div>
              <div className="space-y-2.5 max-h-60 overflow-y-auto">
                {selectedPatient.visitHistory.map((vh) => (
                  <div
                    key={vh.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1 tabular-nums"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-slate-900">
                      <span>วันที่ตรวจ: {formatThaiDateBE(vh.visitDate)}</span>
                      <span className="text-emerald-800">
                        BP {vh.systolic}/{vh.diastolic} mmHg · DTX {vh.dtx} mg/dL · BMI {vh.bmi} ({vh.bmiCategory})
                      </span>
                    </div>
                    <div className="text-slate-600">{vh.clinicalNote}</div>
                    <div className="text-emerald-900 font-medium">
                      ยาสั่งจ่าย:{' '}
                      {vh.prescriptions
                        .map((p) => `${p.drugName} (${p.amount} ${p.unit})`)
                        .join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* คอลัมน์ขวา (5 ส่วน): Live Sticker Preview (พรีวิวสติกเกอร์สดทันที) */}
        <div className="xl:col-span-5 xl:sticky xl:top-20 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-emerald-200/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Live Sticker Preview (พรีวิวฉลากซองยาสด)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  อัปเดตแบบเรียลไทม์ตามขนาดยา วิธีรับประทาน และวันนัดที่เลือก
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-800 tabular-nums">
                {liveStickers.length > 0
                  ? `ใบที่ ${activePreviewIndex + 1}/${liveStickers.length}`
                  : '0 ใบ'}
              </span>
            </div>

            {/* ปุ่มสลับดูสติกเกอร์แต่ละตัวยา */}
            {liveStickers.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {liveStickers.map((stk, idx) => (
                  <button
                    key={stk.id}
                    type="button"
                    onClick={() => setActivePreviewIndex(idx)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activePreviewIndex === idx
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {idx + 1}. {stk.drugName}
                  </button>
                ))}
              </div>
            )}

            {/* จอจำลองสติกเกอร์ซองยาตามแบบจริง 100% */}
            {currentPreviewSticker ? (
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
                <StickerCard
                  sticker={currentPreviewSticker}
                  logoUrl={clinicSettings.logoUrl}
                  subdistrictLine={clinicSettings.subdistrictLine}
                />
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-sm text-slate-500">
                คลิกเลือกยาจากคลังยาเพื่อดูตัวอย่างสติกเกอร์สดที่นี่
              </div>
            )}

            {/* สรุปรายการสติกเกอร์ทั้งหมดของคนไข้รายนี้ */}
            {liveStickers.length > 1 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-600">
                  รายการฉลากยาที่จะส่งพิมพ์ทั้งหมด ({liveStickers.length} ซอง):
                </div>
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg bg-slate-50/50">
                  {liveStickers.map((stk, idx) => (
                    <div
                      key={stk.id}
                      onClick={() => setActivePreviewIndex(idx)}
                      className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer ${
                        activePreviewIndex === idx
                          ? 'bg-emerald-50 font-bold text-emerald-950'
                          : 'text-slate-700 hover:bg-white'
                      }`}
                    >
                      <span>
                        {idx + 1}. {stk.drugName} ({stk.category})
                      </span>
                      <span className="font-mono font-semibold tabular-nums">
                        {stk.amount} {stk.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ปุ่มบันทึกการตรวจ & ส่งเข้าศูนย์พิมพ์สติกเกอร์ A4 */}
            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={() => handleSaveClinicalVisit(true)}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>
                  บันทึกผลตรวจ & ไปยังศูนย์พิมพ์สติกเกอร์ A4 ({liveStickers.length} ดวง)
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveClinicalVisit(false)}
                className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกผลตรวจลงเวชระเบียน (ยังไม่พิมพ์ทันที)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
