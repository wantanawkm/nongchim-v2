export type DiseaseGroup = 'DM' | 'HT' | 'DM+HT';

export type ControlStatus = 'คุมได้ดี' | 'เฝ้าระวัง' | 'คุมไม่ได้' | 'ขาดนัด';

export type VillageId =
  | 'ม.1'
  | 'ม.2'
  | 'ม.3'
  | 'ม.4'
  | 'ม.5'
  | 'ม.6'
  | 'ม.7'
  | 'ม.8';

export type DrugCategory =
  | 'ยาลดความดันโลหิต'
  | 'ยาลดระดับน้ำตาลในเลือด'
  | 'ยาลดไขมันในเลือด'
  | 'ยาต้านเกล็ดเลือด'
  | 'วิตามินบำรุงปลายประสาท';

export type InsuranceType =
  | 'บัตรทอง (UC)'
  | 'ข้าราชการ (OFC)'
  | 'ประกันสังคม (SSS)'
  | 'ชำระเงินเอง';

export interface DrugFormularyItem {
  id: string;
  code: string;
  genericName: string;
  strength: string;
  fullName: string;
  category: DrugCategory;
  defaultPillsPerDay: number;
  defaultRegimen: string;
  propertiesAndWarnings: string;
  allergyKeywords: string[];
  stockBalance: number;
  minStockLevel: number;
  lotNumber: string;
  expiryDate: string; // YYYY-MM-DD
  lastUpdated: string; // YYYY-MM-DD
}

export interface StockTransaction {
  id: string;
  drugId: string;
  drugCode: string;
  drugName: string;
  category: DrugCategory;
  type: 'รับยาเข้าคลัง' | 'จ่ายยาผู้ป่วย' | 'เพิ่มรายการยาใหม่';
  amount: number;
  balanceAfter: number;
  lotNumber?: string;
  expiryDate?: string;
  note: string;
  createdAt: string;
}

export interface PrescribedDrug {
  id: string;
  drugId: string;
  drugName: string;
  category: DrugCategory;
  amount: number;
  unit: string;
  regimen: string;
  propertiesAndWarnings: string;
}

export interface StickerPrintItem {
  id: string;
  hospitalName: string;
  patientName: string;
  hn: string;
  printDateThai: string;
  category: DrugCategory;
  drugName: string;
  amount: number;
  unit: string;
  regimen: string;
  propertiesAndWarnings: string;
  nextAppointmentText: string;
  hospitalPhone: string;
}

export interface ClinicalVisitHistoryItem {
  id: string;
  visitDate: string; // YYYY-MM-DD
  systolic: number;
  diastolic: number;
  pulseRate: number;
  respiratoryRate: number;
  dtx: number;
  hba1c?: number;
  weight: number;
  height: number;
  bmi: number;
  bmiCategory: string;
  controlStatus: ControlStatus;
  nextAppointmentDate: string;
  nextAppointmentPeriod: 'ช่วงเช้า (08.00 - 11.30 น.)' | 'ช่วงบ่าย (13.00 - 15.30 น.)';
  nextAppointmentGoal: string;
  clinicalNote: string;
  prescriptions: PrescribedDrug[];
}

export interface Patient {
  id: string;
  hn: string;
  citizenId?: string;
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
  pulseRate: number;
  respiratoryRate: number;
  dtx: number;
  hba1c?: number;
  weight: number;
  height: number;
  bmi: number;
  controlStatus: ControlStatus;
  lastVisitDate: string; // YYYY-MM-DD
  nextAppointmentDate: string; // YYYY-MM-DD
  nextAppointmentPeriod: 'ช่วงเช้า (08.00 - 11.30 น.)' | 'ช่วงบ่าย (13.00 - 15.30 น.)';
  nextAppointmentGoal: string;
  footExamDone: boolean;
  footExamResult: 'ปกติ (Low Risk)' | 'เสี่ยงปานกลาง' | 'เสี่ยงสูง/มีแผล' | 'ยังไม่ได้ตรวจ';
  retinalExamDone: boolean;
  retinalExamResult: 'ปกติ (No DR)' | 'พบเบาหวานขึ้นตา (NPDR)' | 'ส่งต่อจักษุแพทย์' | 'ยังไม่ได้ตรวจ';
  latestPrescriptions: PrescribedDrug[];
  visitHistory: ClinicalVisitHistoryItem[];
}

export interface VillageInfo {
  id: VillageId;
  mooNumber: number;
  villageName: string;
  fullLabel: string;
  vhvLeaderName: string;
  vhvPhone: string;
  vhvCount: number;
}

export interface ClinicSettings {
  hospitalName: string;
  subdistrictLine: string;
  hospitalPhone: string;
  targetHTPercent: number;
  targetDMPercent: number;
  defaultBlankOffset: number;
  logoUrl?: string;
}

export interface HomeVisitRecord {
  id: string;
  patientId: string;
  patientHn: string;
  patientName: string;
  villageId: VillageId;
  houseNumber: string;
  phone: string;
  assignedVhvName: string;
  visitDate: string;
  reason: string;
  status: 'รอดำเนินการ' | 'ลงพื้นที่แล้ว' | 'นัดหมายใหม่แล้ว';
  homeBp: string;
  homeDtx: string;
  pillCountResult: string;
  summaryNote: string;
}

export interface MealLogRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientHn: string;
  villageId: VillageId;
  recordedAt: string;
  mealType: 'มื้อเช้า' | 'มื้อกลางวัน' | 'มื้อเย็น' | 'ของว่าง';
  menuName: string;
  imageUrl: string;
  sweetnessLevel: number;
  saltinessLevel: number;
  carbPortion: 'เหมาะสม (1 ส่วน)' | 'ค่อนข้างมาก' | 'เกินเกณฑ์มาก';
  veggiePortion: 'ครบ 2 ส่วน (ผ่านเกณฑ์ 2:1:1)' | 'น้อยกว่าเกณฑ์' | 'ไม่มีผักเลย';
  evaluationResult: 'ผ่านเกณฑ์ 2:1:1' | 'ควรปรับลดหวาน/เค็ม' | 'เสี่ยงน้ำตาลและโซเดียมสูง';
  staffAdvice: string;
}
