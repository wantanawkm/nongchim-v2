import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Edit3,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  type ControlStatus,
  type DiseaseGroup,
  type InsuranceType,
  type Patient,
  type VillageId,
} from '../types';
import {
  VILLAGES,
  calculateBmi,
  evaluateControlStatus,
  formatThaiDateBE,
  getTodayIsoDate,
  addDaysToIsoDate,
} from '../data/initialData';

interface PatientRegistryViewProps {
  patients: Patient[];
  onAddPatient: (patient: Patient) => void;
  onUpdatePatient: (patient: Patient) => void;
  onDeletePatient: (patientId: string) => void;
  onStartVisit: (patient: Patient) => void;
}

interface PatientFormState {
  id?: string;
  hn: string;
  citizenId: string;
  prefix: 'นาย' | 'นาง' | 'นางสาว' | 'ด.ช.' | 'ด.ญ.';
  fullName: string;
  age: number;
  phone: string;
  insurance: InsuranceType;
  villageId: VillageId;
  houseNumber: string;
  diseaseGroup: DiseaseGroup;
  hasAllergy: boolean;
  drugAllergy: string;
  allergySymptom: string;
  systolic: number;
  diastolic: number;
  dtx: number;
  weight: number;
  height: number;
}

export const PatientRegistryView: React.FC<PatientRegistryViewProps> = ({
  patients,
  onAddPatient,
  onUpdatePatient,
  onDeletePatient,
  onStartVisit,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVillage, setSelectedVillage] = useState<string>('ALL');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [formError, setFormError] = useState('');

  const getNextSuggestedHn = () => {
    const maxNum = patients.reduce((acc, p) => {
      const m = p.hn.match(/(\d+)$/);
      const n = m ? parseInt(m[1], 10) : 100;
      return n > acc ? n : acc;
    }, 100);
    return `69-${String(maxNum + 1).padStart(5, '0')}`;
  };

  const [form, setForm] = useState<PatientFormState>({
    hn: '69-00113',
    citizenId: '',
    prefix: 'นาง',
    fullName: '',
    age: 60,
    phone: '',
    insurance: 'บัตรทอง (UC)',
    villageId: 'ม.1',
    houseNumber: '',
    diseaseGroup: 'DM+HT',
    hasAllergy: false,
    drugAllergy: '',
    allergySymptom: '',
    systolic: 130,
    diastolic: 80,
    dtx: 115,
    weight: 58,
    height: 160,
  });

  // คำนวณตัวชี้วัดภาพรวมคลินิก
  const stats = useMemo(() => {
    const total = patients.length;
    const dmOnly = patients.filter((p) => p.diseaseGroup === 'DM').length;
    const htOnly = patients.filter((p) => p.diseaseGroup === 'HT').length;
    const bothDmHt = patients.filter((p) => p.diseaseGroup === 'DM+HT').length;
    const controlledCount = patients.filter((p) => p.controlStatus === 'คุมได้ดี').length;
    const uncontrolledOrMissed = patients.filter(
      (p) => p.controlStatus === 'คุมไม่ได้' || p.controlStatus === 'ขาดนัด'
    ).length;
    const controlledRate = total > 0 ? ((controlledCount / total) * 100).toFixed(1) : '0.0';

    return {
      total,
      dmTotal: dmOnly + bothDmHt,
      dmOnly,
      htTotal: htOnly + bothDmHt,
      htOnly,
      bothDmHt,
      controlledCount,
      controlledRate,
      uncontrolledOrMissed,
    };
  }, [patients]);

  // กรองรายชื่อผู้ป่วย
  const filteredPatients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return patients.filter((p) => {
      const matchesVillage = selectedVillage === 'ALL' || p.villageId === selectedVillage;
      const matchesGroup = selectedGroup === 'ALL' || p.diseaseGroup === selectedGroup;
      const matchesStatus = selectedStatus === 'ALL' || p.controlStatus === selectedStatus;
      const matchesQuery =
        !q ||
        p.fullName.toLowerCase().includes(q) ||
        p.hn.toLowerCase().includes(q) ||
        p.citizenId.replace(/-/g, '').includes(q.replace(/-/g, '')) ||
        p.phone.includes(q);

      return matchesVillage && matchesGroup && matchesStatus && matchesQuery;
    });
  }, [patients, searchQuery, selectedVillage, selectedGroup, selectedStatus]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setConfirmDeleteOpen(false);
    setFormError('');
    setForm({
      hn: getNextSuggestedHn(),
      citizenId: '',
      prefix: 'นาง',
      fullName: '',
      age: 60,
      phone: '',
      insurance: 'บัตรทอง (UC)',
      villageId: 'ม.1',
      houseNumber: '',
      diseaseGroup: 'DM+HT',
      hasAllergy: false,
      drugAllergy: '',
      allergySymptom: '',
      systolic: 128,
      diastolic: 80,
      dtx: 112,
      weight: 58,
      height: 158,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (patient: Patient) => {
    setModalMode('edit');
    setConfirmDeleteOpen(false);
    setFormError('');
    setForm({
      id: patient.id,
      hn: patient.hn,
      citizenId: patient.citizenId,
      prefix: patient.prefix,
      fullName: patient.fullName,
      age: patient.age,
      phone: patient.phone,
      insurance: patient.insurance,
      villageId: patient.villageId,
      houseNumber: patient.houseNumber,
      diseaseGroup: patient.diseaseGroup,
      hasAllergy: patient.hasAllergy,
      drugAllergy: patient.hasAllergy ? patient.drugAllergy : '',
      allergySymptom: patient.allergySymptom || '',
      systolic: patient.systolic,
      diastolic: patient.diastolic,
      dtx: patient.dtx,
      weight: patient.weight,
      height: patient.height,
    });
    setIsModalOpen(true);
  };

  const handleSavePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      setFormError('กรุณาระบุชื่อ-นามสกุลผู้ป่วย');
      return;
    }
    if (!form.hn.trim()) {
      setFormError('กรุณาระบุเลขประจำตัวผู้ป่วย (HN)');
      return;
    }
    if (form.hasAllergy && !form.drugAllergy.trim()) {
      setFormError('กรุณาระบุชื่อยาที่แพ้ให้ชัดเจนเพื่อความปลอดภัยของผู้ป่วย');
      return;
    }

    const bmi = calculateBmi(form.weight, form.height);
    const today = getTodayIsoDate();

    if (modalMode === 'create') {
      const nextDate = addDaysToIsoDate(today, 60);
      const status = evaluateControlStatus(
        form.diseaseGroup,
        form.systolic,
        form.diastolic,
        form.dtx,
        nextDate
      );

      const newPatient: Patient = {
        id: `pt-${Date.now()}`,
        hn: form.hn.trim(),
        citizenId: form.citizenId.trim() || '3-2204-00000-00-0',
        prefix: form.prefix,
        fullName: form.fullName.trim(),
        age: Number(form.age) || 60,
        phone: form.phone.trim() || '-',
        insurance: form.insurance,
        villageId: form.villageId,
        houseNumber: form.houseNumber.trim() || '-',
        diseaseGroup: form.diseaseGroup,
        hasAllergy: form.hasAllergy,
        drugAllergy: form.hasAllergy ? form.drugAllergy.trim() : 'ปฏิเสธแพ้ยา',
        allergySymptom: form.hasAllergy ? form.allergySymptom.trim() : '',
        systolic: Number(form.systolic) || 128,
        diastolic: Number(form.diastolic) || 80,
        pulseRate: 74,
        respiratoryRate: 18,
        dtx: Number(form.dtx) || 105,
        weight: Number(form.weight) || 58,
        height: Number(form.height) || 160,
        bmi,
        controlStatus: status,
        lastVisitDate: today,
        nextAppointmentDate: nextDate,
        nextAppointmentPeriod: 'ช่วงเช้า (08.00 - 11.30 น.)',
        nextAppointmentGoal: 'ตรวจติดตามอาการและรับยาโรคเรื้อรังต่อเนื่อง',
        footExamDone: false,
        footExamResult: 'ยังไม่ได้ตรวจ',
        retinalExamDone: false,
        retinalExamResult: 'ยังไม่ได้ตรวจ',
        latestPrescriptions: [],
        visitHistory: [],
      };
      onAddPatient(newPatient);
    } else if (modalMode === 'edit' && form.id) {
      const existing = patients.find((p) => p.id === form.id);
      if (existing) {
        const status = evaluateControlStatus(
          form.diseaseGroup,
          form.systolic,
          form.diastolic,
          form.dtx,
          existing.nextAppointmentDate
        );
        const updated: Patient = {
          ...existing,
          hn: form.hn.trim(),
          citizenId: form.citizenId.trim(),
          prefix: form.prefix,
          fullName: form.fullName.trim(),
          age: Number(form.age) || existing.age,
          phone: form.phone.trim(),
          insurance: form.insurance,
          villageId: form.villageId,
          houseNumber: form.houseNumber.trim(),
          diseaseGroup: form.diseaseGroup,
          hasAllergy: form.hasAllergy,
          drugAllergy: form.hasAllergy ? form.drugAllergy.trim() : 'ปฏิเสธแพ้ยา',
          allergySymptom: form.hasAllergy ? form.allergySymptom.trim() : '',
          systolic: Number(form.systolic) || existing.systolic,
          diastolic: Number(form.diastolic) || existing.diastolic,
          dtx: Number(form.dtx) || existing.dtx,
          weight: Number(form.weight) || existing.weight,
          height: Number(form.height) || existing.height,
          bmi,
          controlStatus: status,
        };
        onUpdatePatient(updated);
      }
    }

    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (form.id) {
      onDeletePatient(form.id);
      setConfirmDeleteOpen(false);
      setIsModalOpen(false);
    }
  };

  const getStatusTextStyle = (status: ControlStatus) => {
    switch (status) {
      case 'คุมได้ดี':
        return 'text-emerald-800 font-semibold';
      case 'เฝ้าระวัง':
        return 'text-amber-700 font-semibold';
      case 'คุมไม่ได้':
        return 'text-rose-700 font-bold';
      case 'ขาดนัด':
        return 'text-red-800 font-bold underline decoration-red-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* ส่วนหัวหน้าทะเบียนผู้ป่วย + ปุ่มเพิ่มคนไข้ใหม่ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-emerald-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            ทะเบียนผู้ป่วยคลินิกโรคเรื้อรัง DM-HT (Patient Registry)
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            โรงพยาบาลส่งเสริมสุขภาพตำบลหนองชิ่ม · ข้อมูลเวชระเบียนพื้นที่ ม.1 - ม.8 ต.หนองชิ่ม
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ เพิ่มคนไข้ใหม่</span>
        </button>
      </div>

      {/* แถบการ์ดตัวชี้วัด 6 ช่อง (KPI Summary Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-emerald-200/70">
          <div className="text-xs font-medium text-slate-500">ผู้ป่วยขึ้นทะเบียนรวม</div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">{stats.total}</span>
            <span className="text-xs text-slate-500">ราย</span>
          </div>
          <div className="mt-1 text-xs text-emerald-700">ครอบคลุม ม.1 - ม.8</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200/70">
          <div className="text-xs font-medium text-slate-500">กลุ่มโรคเบาหวาน (DM)</div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-sky-700 tabular-nums">{stats.dmTotal}</span>
            <span className="text-xs text-slate-500">ราย</span>
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            DM เดี่ยว {stats.dmOnly} · ร่วม {stats.bothDmHt}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200/70">
          <div className="text-xs font-medium text-slate-500">ความดันโลหิตสูง (HT)</div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-teal-700 tabular-nums">{stats.htTotal}</span>
            <span className="text-xs text-slate-500">ราย</span>
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            HT เดี่ยว {stats.htOnly} · ร่วม {stats.bothDmHt}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200/70">
          <div className="text-xs font-medium text-slate-500">เป็นทั้ง 2 โรค (DM+HT)</div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-indigo-700 tabular-nums">
              {stats.bothDmHt}
            </span>
            <span className="text-xs text-slate-500">ราย</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">เฝ้าระวังภาวะแทรกซ้อน</div>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-300/80">
          <div className="text-xs font-semibold text-emerald-900">อัตราคุมโรคได้ตามเกณฑ์</div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-700 tabular-nums">
              {stats.controlledRate}%
            </span>
            <span className="text-xs text-emerald-800 tabular-nums">
              {stats.controlledCount}/{stats.total} ราย
            </span>
          </div>
          <div className="mt-1 text-xs text-emerald-800">ผ่านเกณฑ์เป้าหมายคลินิก</div>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200">
          <div className="text-xs font-semibold text-rose-900">คุมไม่ได้ / ขาดนัด</div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-rose-700 tabular-nums">
              {stats.uncontrolledOrMissed}
            </span>
            <span className="text-xs text-rose-700">ราย</span>
          </div>
          <div className="mt-1 text-xs text-rose-700">ต้องติดตามปรับยา/เยี่ยมบ้าน</div>
        </div>
      </div>

      {/* แถบค้นหาด่วนและตัวกรองหมู่บ้าน ม.1 - ม.8 */}
      <div className="bg-white p-4 rounded-xl border border-emerald-200/80 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* ช่องค้นหาด่วน */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาด่วนด้วย ชื่อ-สกุล, HN (เช่น 69-00101), เลขบัตรประชาชน หรือเบอร์โทรศัพท์..."
              className="w-full pl-10 pr-9 py-2 text-sm bg-emerald-50/30 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-slate-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="ล้างคำค้นหา"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* ตัวกรองกลุ่มโรค & สถานะ */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="ALL">ทุกกลุ่มโรค (DM / HT / DM+HT)</option>
              <option value="DM">เฉพาะเบาหวาน (DM)</option>
              <option value="HT">เฉพาะความดันโลหิตสูง (HT)</option>
              <option value="DM+HT">เป็นทั้ง 2 โรค (DM+HT)</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="ALL">ทุกสถานะการคุมโรค</option>
              <option value="คุมได้ดี">คุมได้ดี</option>
              <option value="เฝ้าระวัง">เฝ้าระวัง</option>
              <option value="คุมไม่ได้">คุมไม่ได้</option>
              <option value="ขาดนัด">ขาดนัด</option>
            </select>
          </div>
        </div>

        {/* ปุ่มตัวกรองแยกตามหมู่บ้าน ม.1 - ม.8 ต.หนองชิ่ม */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedVillage('ALL')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedVillage === 'ALL'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-50/70 text-emerald-900 hover:bg-emerald-100'
            }`}
          >
            ทุกหมู่บ้าน ({patients.length})
          </button>
          {VILLAGES.map((v) => {
            const count = patients.filter((p) => p.villageId === v.id).length;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVillage(v.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedVillage === v.id
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50/70 text-emerald-900 hover:bg-emerald-100'
                }`}
              >
                {v.id} {v.villageName} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ตารางเวชระเบียนผู้ป่วย */}
      <div className="bg-white rounded-xl border border-emerald-200/80 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-emerald-100 flex items-center justify-between bg-emerald-50/40">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-900">
              ตารางเวชระเบียนผู้ป่วยโรคเรื้อรัง ({filteredPatients.length} ราย)
            </h2>
          </div>
          <div className="text-xs text-slate-500">
            คลิกปุ่ม &ldquo;ตรวจ/จ่ายยา&rdquo; เพื่อเปิดหน้าบันทึกสัญญาณชีพและพิมพ์สติกเกอร์ยา
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4 whitespace-nowrap">HN / เลขบัตร</th>
                <th className="py-3 px-4 whitespace-nowrap">ชื่อ-นามสกุล / กลุ่มโรค</th>
                <th className="py-3 px-4 whitespace-nowrap">ที่อยู่ (ต.หนองชิ่ม)</th>
                <th className="py-3 px-4 whitespace-nowrap">ประวัติการแพ้ยา</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">BP ล่าสุด</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">DTX/FBS ล่าสุด</th>
                <th className="py-3 px-4 whitespace-nowrap">สถานะการคุมโรค</th>
                <th className="py-3 px-4 whitespace-nowrap">วันนัดถัดไป</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 text-sm">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    ไม่พบรายชื่อผู้ป่วยที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => {
                  const villageObj = VILLAGES.find((v) => v.id === patient.villageId);
                  return (
                    <tr
                      key={patient.id}
                      className="hover:bg-emerald-50/40 transition-colors align-top"
                    >
                      {/* HN & เลขบัตร */}
                      <td className="py-3.5 px-4 whitespace-nowrap tabular-nums">
                        <div className="font-mono font-bold text-emerald-900">{patient.hn}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          {patient.citizenId}
                        </div>
                      </td>

                      {/* ชื่อ-นามสกุล & กลุ่มโรค */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {patient.prefix}
                          {patient.fullName}
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5 tabular-nums">
                          <span>อายุ {patient.age} ปี</span>
                          <span> · </span>
                          <span className="font-semibold text-emerald-800">
                            กลุ่มโรค: {patient.diseaseGroup}
                          </span>
                          <span> · </span>
                          <span>{patient.insurance}</span>
                        </div>
                      </td>

                      {/* ที่อยู่ หมู่บ้าน */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          บ้านเลขที่ {patient.houseNumber} {patient.villageId}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {villageObj ? villageObj.villageName : 'ต.หนองชิ่ม'} · โทร {patient.phone}
                        </div>
                      </td>

                      {/* แถบเตือนประวัติแพ้ยาสีแดงเด่นชัด */}
                      <td className="py-3.5 px-4">
                        {patient.hasAllergy ? (
                          <div className="bg-red-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-xs max-w-[230px]">
                            <div className="flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>แพ้ยา: {patient.drugAllergy}</span>
                            </div>
                            {patient.allergySymptom && (
                              <div className="text-[11px] font-normal text-red-100 mt-0.5 leading-tight">
                                อาการ: {patient.allergySymptom}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">ปฏิเสธแพ้ยา</span>
                        )}
                      </td>

                      {/* ค่า BP ล่าสุด */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap tabular-nums">
                        <div
                          className={`font-mono font-bold ${
                            patient.systolic >= 140 || patient.diastolic >= 90
                              ? 'text-rose-700'
                              : 'text-slate-900'
                          }`}
                        >
                          {patient.systolic}/{patient.diastolic}
                        </div>
                        <div className="text-[11px] text-slate-500">mmHg</div>
                      </td>

                      {/* ค่า DTX/FBS ล่าสุด */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap tabular-nums">
                        <div
                          className={`font-mono font-bold ${
                            patient.dtx > 130 ? 'text-amber-700' : 'text-slate-900'
                          } ${patient.dtx >= 180 ? 'text-rose-700' : ''}`}
                        >
                          {patient.dtx}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          mg/dL {patient.hba1c ? `· A1c ${patient.hba1c}%` : ''}
                        </div>
                      </td>

                      {/* สถานะการคุมโรค */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className={`text-xs ${getStatusTextStyle(patient.controlStatus)}`}>
                          {patient.controlStatus}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                          BMI {patient.bmi} กก./ม²
                        </div>
                      </td>

                      {/* วันนัดถัดไป */}
                      <td className="py-3.5 px-4 whitespace-nowrap tabular-nums">
                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-800">
                          <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span>{formatThaiDateBE(patient.nextAppointmentDate)}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          ตรวจล่าสุด {formatThaiDateBE(patient.lastVisitDate)}
                        </div>
                      </td>

                      {/* ปุ่มตรวจ/จ่ายยา และ ปุ่มแก้ไข */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onStartVisit(patient)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Stethoscope className="w-3.5 h-3.5" />
                            <span>ตรวจ/จ่ายยา</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(patient)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            title="แก้ไขข้อมูลผู้ป่วย หรือลบรายชื่อ"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>แก้ไข</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal เพิ่ม / แก้ไขข้อมูลผู้ป่วย (พร้อมปุ่มลบคนไข้และยืนยันก่อนลบ) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-emerald-200 max-w-2xl w-full p-6 shadow-xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-5 h-5 text-emerald-700" />
                <h3 className="text-lg font-bold text-slate-900">
                  {modalMode === 'create'
                    ? 'ขึ้นทะเบียนผู้ป่วยโรคเรื้อรังรายใหม่ (DM-HT)'
                    : `แก้ไขข้อมูลเวชระเบียนผู้ป่วย (${form.hn})`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePatient} className="mt-4 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เลขประจำตัวผู้ป่วย (HN) *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.hn}
                    onChange={(e) => setForm({ ...form, hn: e.target.value })}
                    placeholder="เช่น 69-00113"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เลขบัตรประจำตัวประชาชน 13 หลัก
                  </label>
                  <input
                    type="text"
                    value={form.citizenId}
                    onChange={(e) => setForm({ ...form, citizenId: e.target.value })}
                    placeholder="3-2204-00xxx-xx-x"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    คำนำหน้า
                  </label>
                  <select
                    value={form.prefix}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        prefix: e.target.value as PatientFormState['prefix'],
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                  >
                    <option value="นาย">นาย</option>
                    <option value="นาง">นาง</option>
                    <option value="นางสาว">นางสาว</option>
                    <option value="ด.ช.">ด.ช.</option>
                    <option value="ด.ญ.">ด.ญ.</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อ - นามสกุล *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="ระบุชื่อและนามสกุล"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    อายุ (ปี)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เบอร์โทรศัพท์ติดต่อ
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="08x-xxx-xxxx"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    สิทธิการรักษาพยาบาล
                  </label>
                  <select
                    value={form.insurance}
                    onChange={(e) =>
                      setForm({ ...form, insurance: e.target.value as InsuranceType })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                  >
                    <option value="บัตรทอง (UC)">บัตรทอง (UC)</option>
                    <option value="ข้าราชการ (OFC)">ข้าราชการ (OFC)</option>
                    <option value="ประกันสังคม (SSS)">ประกันสังคม (SSS)</option>
                    <option value="ชำระเงินเอง">ชำระเงินเอง</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    กลุ่มโรคเรื้อรัง *
                  </label>
                  <select
                    value={form.diseaseGroup}
                    onChange={(e) =>
                      setForm({ ...form, diseaseGroup: e.target.value as DiseaseGroup })
                    }
                    className="w-full px-3 py-2 text-sm font-semibold text-emerald-900 border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-emerald-50/50"
                  >
                    <option value="DM">เบาหวาน (DM)</option>
                    <option value="HT">ความดันโลหิตสูง (HT)</option>
                    <option value="DM+HT">เป็นทั้ง 2 โรค (DM+HT)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    บ้านเลขที่
                  </label>
                  <input
                    type="text"
                    value={form.houseNumber}
                    onChange={(e) => setForm({ ...form, houseNumber: e.target.value })}
                    placeholder="เช่น 42/1"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    หมู่บ้านในเขตบริการ (ม.1 - ม.8 ต.หนองชิ่ม) *
                  </label>
                  <select
                    value={form.villageId}
                    onChange={(e) =>
                      setForm({ ...form, villageId: e.target.value as VillageId })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                  >
                    {VILLAGES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.fullLabel} ({v.vhvLeaderName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ส่วนระบุประวัติการแพ้ยาอย่างชัดเจน */}
              <div
                className={`p-4 rounded-xl border ${
                  form.hasAllergy
                    ? 'bg-red-50 border-red-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={`w-4 h-4 ${
                        form.hasAllergy ? 'text-red-600' : 'text-slate-500'
                      }`}
                    />
                    <span className="text-xs font-bold text-slate-900">
                      ข้อมูลประวัติการแพ้ยา (Drug Allergy Verification)
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={!form.hasAllergy}
                        onChange={() =>
                          setForm({
                            ...form,
                            hasAllergy: false,
                            drugAllergy: '',
                            allergySymptom: '',
                          })
                        }
                        className="accent-emerald-600"
                      />
                      <span>ปฏิเสธแพ้ยา</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-red-700 cursor-pointer">
                      <input
                        type="radio"
                        checked={form.hasAllergy}
                        onChange={() => setForm({ ...form, hasAllergy: true })}
                        className="accent-red-600"
                      />
                      <span>มีประวัติแพ้ยา (แจ้งเตือนสีแดง)</span>
                    </label>
                  </div>
                </div>

                {form.hasAllergy && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-bold text-red-800 mb-1">
                        ระบุชื่อยาที่แพ้ *
                      </label>
                      <input
                        type="text"
                        required={form.hasAllergy}
                        value={form.drugAllergy}
                        onChange={(e) => setForm({ ...form, drugAllergy: e.target.value })}
                        placeholder="เช่น Enalapril, Aspirin, ยากลุ่ม Sulfa"
                        className="w-full px-3 py-2 text-sm bg-white border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 text-red-950 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-red-800 mb-1">
                        อาการแพ้ยาที่พบ
                      </label>
                      <input
                        type="text"
                        value={form.allergySymptom}
                        onChange={(e) =>
                          setForm({ ...form, allergySymptom: e.target.value })
                        }
                        placeholder="เช่น ผื่นลมพิษ ไอเรื้อรัง แน่นหน้าอก ตาบวม"
                        className="w-full px-3 py-2 text-sm bg-white border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 text-red-950"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ค่าสัญญาณชีพแรกรับ/ล่าสุด */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    BP Systolic
                  </label>
                  <input
                    type="number"
                    value={form.systolic}
                    onChange={(e) => setForm({ ...form, systolic: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    BP Diastolic
                  </label>
                  <input
                    type="number"
                    value={form.diastolic}
                    onChange={(e) => setForm({ ...form, diastolic: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    DTX (mg/dL)
                  </label>
                  <input
                    type="number"
                    value={form.dtx}
                    onChange={(e) => setForm({ ...form, dtx: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    น้ำหนัก (กก.)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    ส่วนสูง (ซม.)
                  </label>
                  <input
                    type="number"
                    value={form.height}
                    onChange={(e) => setForm({ ...form, height: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* ส่วนลบรายชื่อผู้ป่วยเมื่ออยู่ในโหมดแก้ไข (พร้อมระบบยืนยันก่อนลบ) */}
              {modalMode === 'edit' && (
                <div className="pt-3 border-t border-slate-200">
                  {!confirmDeleteOpen ? (
                    <div className="flex items-center justify-between bg-rose-50/70 px-4 py-2.5 rounded-xl border border-rose-200">
                      <div className="text-xs text-rose-900">
                        <span className="font-bold">กรณีผู้ป่วยย้ายออกหรือไม่อยู่ในทะเบียนแล้ว:</span>{' '}
                        สามารถลบข้อมูลออกจากทะเบียนคลินิกได้
                      </div>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ลบผู้ป่วยออกจากทะเบียน</span>
                      </button>
                    </div>
                  ) : (
                    <div className="bg-red-50 p-4 rounded-xl border-2 border-red-400 space-y-2.5">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-red-950">
                          <div className="font-bold text-sm text-red-800">
                            ยืนยันการลบข้อมูลผู้ป่วยออกจากทะเบียนใช่หรือไม่?
                          </div>
                          <p className="mt-0.5">
                            คุณกำลังจะลบข้อมูลของ{' '}
                            <span className="font-bold underline">
                              {form.prefix}
                              {form.fullName} (HN: {form.hn})
                            </span>{' '}
                            ออกจากระบบทะเบียนผู้ป่วย รพ.สต.หนองชิ่ม การดำเนินการนี้ไม่สามารถย้อนกลับได้
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteOpen(false)}
                          className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 cursor-pointer"
                        >
                          ยกเลิก (เก็บข้อมูลไว้)
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmDelete}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ยืนยันลบข้อมูลถาวร</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
                >
                  {modalMode === 'create' ? 'บันทึกขึ้นทะเบียนผู้ป่วยใหม่' : 'บันทึกการแก้ไขข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
