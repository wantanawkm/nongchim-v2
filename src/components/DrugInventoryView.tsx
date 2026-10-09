import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Edit3,
  History,
  Package,
  PackagePlus,
  Pill,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  type DrugCategory,
  type DrugFormularyItem,
  type StockTransaction,
} from '../types';
import { formatThaiDateBE, getTodayIsoDate } from '../data/initialData';

interface DrugInventoryViewProps {
  drugs: DrugFormularyItem[];
  transactions: StockTransaction[];
  onReceiveStock: (
    drugId: string,
    addedAmount: number,
    lotNumber: string,
    expiryDate: string,
    note: string
  ) => void;
  onAddNewDrug: (newDrug: DrugFormularyItem, note: string) => void;
  onUpdateDrug: (updatedDrug: DrugFormularyItem, note: string) => void;
  onDeleteDrug: (drugId: string) => void;
}

const DRUG_CATEGORIES: DrugCategory[] = [
  'ยาลดความดันโลหิต',
  'ยาลดระดับน้ำตาลในเลือด',
  'ยาลดไขมันในเลือด',
  'ยาต้านเกล็ดเลือด',
  'วิตามินบำรุงปลายประสาท',
];

export const DrugInventoryView: React.FC<DrugInventoryViewProps> = ({
  drugs,
  transactions,
  onReceiveStock,
  onAddNewDrug,
  onUpdateDrug,
  onDeleteDrug,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Modal รับยาเข้าคลัง (Stock In)
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [selectedDrugId, setSelectedDrugId] = useState<string>(drugs[0]?.id || '');
  const [stockInAmount, setStockInAmount] = useState<number>(1000);
  const [lotNumber, setLotNumber] = useState<string>('LOT-6910');
  const [expiryDate, setExpiryDate] = useState<string>('2028-10-31');
  const [stockInNote, setStockInNote] = useState<string>(
    'รับเวชภัณฑ์ยาเข้าคลังจากโรงพยาบาลแม่ข่าย (รพ.แหลมสิงห์)'
  );

  // Modal เพิ่มรายการยาใหม่เข้าคลัง
  const [isAddNewDrugOpen, setIsAddNewDrugOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newGenericName, setNewGenericName] = useState('');
  const [newStrength, setNewStrength] = useState('500 mg');
  const [newCategory, setNewCategory] = useState<DrugCategory>('ยาลดความดันโลหิต');
  const [newInitialStock, setNewInitialStock] = useState<number>(1000);
  const [newMinStock, setNewMinStock] = useState<number>(500);
  const [newLotNumber, setNewLotNumber] = useState<string>('LOT-NEW69');
  const [newExpiryDate, setNewExpiryDate] = useState<string>('2028-12-31');
  const [newRegimen, setNewRegimen] = useState<string>(
    'รับประทานครั้งละ 1 เม็ด วันละ 1 ครั้ง หลังอาหารเช้า'
  );
  const [newProperties, setNewProperties] = useState<string>(
    'รับประทานยาต่อเนื่องตามแพทย์สั่ง ห้ามหยุดยาเอง'
  );

  // Modal แก้ไขข้อมูลยา / ปรับยอดคงเหลือตามนับจริง
  const [editingDrug, setEditingDrug] = useState<DrugFormularyItem | null>(null);
  const [editNote, setEditNote] = useState<string>('ปรับปรุงข้อมูลรายการยาและยอดคงเหลือตามนับจริง');
  const [confirmDeleteDrug, setConfirmDeleteDrug] = useState<boolean>(false);

  // คำนวณสรุปยอดคลังยา
  const summary = useMemo(() => {
    const totalItems = drugs.length;
    const totalTablets = drugs.reduce((sum, d) => sum + (d.stockBalance || 0), 0);
    const lowStockItems = drugs.filter((d) => d.stockBalance <= d.minStockLevel);
    const healthyItems = totalItems - lowStockItems.length;
    return {
      totalItems,
      totalTablets,
      lowStockCount: lowStockItems.length,
      healthyItems,
    };
  }, [drugs]);

  // กรองรายการยาในคลัง
  const filteredDrugs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return drugs.filter((d) => {
      const matchCat = selectedCategory === 'ALL' || d.category === selectedCategory;
      const matchLow = !showLowStockOnly || d.stockBalance <= d.minStockLevel;
      const matchQuery =
        !q ||
        d.fullName.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        d.genericName.toLowerCase().includes(q) ||
        d.lotNumber.toLowerCase().includes(q);
      return matchCat && matchLow && matchQuery;
    });
  }, [drugs, searchQuery, selectedCategory, showLowStockOnly]);

  const handleOpenStockInForDrug = (drug: DrugFormularyItem) => {
    setSelectedDrugId(drug.id);
    setStockInAmount(1000);
    setLotNumber(drug.lotNumber || 'LOT-6910');
    setExpiryDate(drug.expiryDate || '2028-10-31');
    setIsStockInOpen(true);
  };

  const handleSubmitStockIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrugId || stockInAmount <= 0) return;
    onReceiveStock(
      selectedDrugId,
      Number(stockInAmount),
      lotNumber.trim() || 'LOT-6910',
      expiryDate || '2028-12-31',
      stockInNote.trim() || 'รับเวชภัณฑ์ยาเข้าคลัง รพ.สต.หนองชิ่ม'
    );
    setIsStockInOpen(false);
  };

  const handleSubmitNewDrug = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGenericName.trim()) return;
    const codeClean =
      newCode.trim().toUpperCase() ||
      newGenericName.trim().slice(0, 4).toUpperCase() +
        Math.floor(10 + Math.random() * 89);
    const fullName = `${newGenericName.trim()} ${newStrength.trim()}`.trim();

    const createdDrug: DrugFormularyItem = {
      id: `drug-${Date.now()}`,
      code: codeClean,
      genericName: newGenericName.trim(),
      strength: newStrength.trim(),
      fullName,
      category: newCategory,
      defaultPillsPerDay: 1,
      defaultRegimen: newRegimen.trim(),
      propertiesAndWarnings: newProperties.trim(),
      allergyKeywords: [newGenericName.trim().toLowerCase()],
      stockBalance: Number(newInitialStock) || 0,
      minStockLevel: Number(newMinStock) || 500,
      lotNumber: newLotNumber.trim() || 'LOT-NEW69',
      expiryDate: newExpiryDate || getTodayIsoDate(),
      lastUpdated: getTodayIsoDate(),
    };

    onAddNewDrug(createdDrug, 'ขึ้นทะเบียนรายการยาใหม่และรับเข้าคลังสต๊อก รพ.สต.หนองชิ่ม');
    setNewCode('');
    setNewGenericName('');
    setIsAddNewDrugOpen(false);
  };

  const handleOpenEditDrug = (drug: DrugFormularyItem) => {
    setEditingDrug({ ...drug });
    setEditNote('ปรับปรุงข้อมูลรายการยาและยอดคงเหลือตามนับจริง');
    setConfirmDeleteDrug(false);
  };

  const handleSubmitEditDrug = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDrug) return;
    const updatedFullName =
      editingDrug.fullName.trim() ||
      `${editingDrug.genericName.trim()} ${editingDrug.strength.trim()}`.trim();
    onUpdateDrug(
      {
        ...editingDrug,
        fullName: updatedFullName,
        stockBalance: Math.max(0, Number(editingDrug.stockBalance) || 0),
        minStockLevel: Math.max(0, Number(editingDrug.minStockLevel) || 0),
        lastUpdated: getTodayIsoDate(),
      },
      editNote.trim() || 'ปรับปรุงยอดคงเหลือในคลังยา'
    );
    setEditingDrug(null);
  };

  const selectedDrugObj = drugs.find((d) => d.id === selectedDrugId);

  return (
    <div className="space-y-6">
      {/* ส่วนหัวคลังสต๊อกยา DM-HT */}
      <div className="bg-white p-5 rounded-xl border border-rose-200/80 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            คลังสต๊อกยาโรคเรื้อรัง DM-HT (Drug Inventory & Stock Management)
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            บริหารจัดการยอดคงเหลือเวชภัณฑ์ยา รพ.สต.หนองชิ่ม · รับยาเข้าคลัง เพิ่มรายการยาใหม่ ปรับยอดคงเหลือ และตัดสต๊อกอัตโนมัติเมื่อสั่งจ่ายยา
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (drugs[0]) setSelectedDrugId(drugs[0].id);
              setIsStockInOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
          >
            <PackagePlus className="w-4 h-4" />
            <span>+ รับยาเข้าคลัง (เพิ่มยอดคงเหลือ)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddNewDrugOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-800 hover:bg-teal-900 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มรายการยาใหม่</span>
          </button>
        </div>
      </div>

      {/* การ์ดสรุปยอดคลังยา 4 ช่อง */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-emerald-200/80">
          <div className="text-xs font-medium text-slate-500">รายการยาในคลังทั้งหมด</div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {summary.totalItems}
            </span>
            <span className="text-xs text-slate-500">รายการ</span>
          </div>
          <div className="mt-1 text-xs text-emerald-700">ครอบคลุม 5 หมวดหมู่ยาหลัก</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200/80">
          <div className="text-xs font-medium text-slate-500">ยอดคงเหลือรวมทั้งคลัง</div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-800 font-mono tabular-nums">
              {summary.totalTablets.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">เม็ด</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">ตัดสต๊อกอัตโนมัติเมื่อจ่ายยา</div>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-300/80">
          <div className="text-xs font-semibold text-emerald-900">รายการยาพร้อมจ่ายปกติ</div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-700 font-mono tabular-nums">
              {summary.healthyItems}
            </span>
            <span className="text-xs text-emerald-800">รายการ</span>
          </div>
          <div className="mt-1 text-xs text-emerald-800">สูงกว่าเกณฑ์สำรองขั้นต่ำ</div>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200">
          <div className="text-xs font-semibold text-rose-900">
            ยาใกล้หมดคลัง (ต่ำกว่าเกณฑ์ขั้นต่ำ)
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-rose-700 font-mono tabular-nums">
              {summary.lowStockCount}
            </span>
            <span className="text-xs text-rose-700">รายการ</span>
          </div>
          <div className="mt-1 text-xs text-rose-700">ควรเบิกยาเข้าคลังเพิ่ม</div>
        </div>
      </div>

      {/* แถบค้นหาและตัวกรองหมวดหมู่ยา */}
      <div className="bg-white p-4 rounded-xl border border-emerald-200/80 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาด้วยชื่อยา (เช่น Amlodipine, Metformin), รหัสยา หรือเลข Lot..."
              className="w-full pl-10 pr-9 py-2 text-sm bg-emerald-50/30 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
              showLowStockOnly
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-rose-50/70 text-rose-800 border-rose-200 hover:bg-rose-100'
            }`}
          >
            แสดงเฉพาะยาใกล้หมดคลัง ({summary.lowStockCount})
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-emerald-700 text-white border-emerald-800 font-bold shadow-2xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200'
            }`}
          >
            ทุกหมวดหมู่ยา ({drugs.length})
          </button>
          {DRUG_CATEGORIES.map((cat) => {
            const count = drugs.filter((d) => d.category === cat).length;
            const isSelected = selectedCategory === cat;
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
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${colorStyles[cat]}`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ตารางรายการยาและยอดคงเหลือในคลัง */}
      <div className="bg-white rounded-xl border border-emerald-200/80 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-emerald-100 bg-emerald-50/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-900">
              ตารางรายการเวชภัณฑ์ยาและยอดคงเหลือ ({filteredDrugs.length} รายการ)
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            คลิกปุ่ม &ldquo;รับยาเข้า&rdquo; เพื่อเติมสต๊อก หรือ &ldquo;แก้ไข/ปรับยอด&rdquo; เพื่อปรับปรุงข้อมูลยา
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4 whitespace-nowrap">รหัสยา</th>
                <th className="py-3 px-4 whitespace-nowrap">ชื่อยา / ขนาดความแรง</th>
                <th className="py-3 px-4 whitespace-nowrap">หมวดหมู่ยา</th>
                <th className="py-3 px-4 whitespace-nowrap">เลขที่ผลิต (Lot) / วันหมดอายุ</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">จุดสั่งซื้อขั้นต่ำ</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">ยอดคงเหลือ (เม็ด)</th>
                <th className="py-3 px-4 whitespace-nowrap">สถานะคลัง</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 text-sm tabular-nums">
              {filteredDrugs.map((drug) => {
                const isLow = drug.stockBalance <= drug.minStockLevel;
                return (
                  <tr
                    key={drug.id}
                    className={`hover:bg-emerald-50/30 transition-colors ${
                      isLow ? 'bg-rose-50/20' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-900 whitespace-nowrap">
                      {drug.code}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{drug.fullName}</div>
                      <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {drug.defaultRegimen}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-xs font-semibold text-emerald-800">
                        {drug.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono text-xs font-semibold text-slate-800">
                        {drug.lotNumber}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        หมดอายุ {formatThaiDateBE(drug.expiryDate)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-500 whitespace-nowrap">
                      {drug.minStockLevel.toLocaleString()} เม็ด
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span
                        className={`text-base font-mono font-bold ${
                          isLow ? 'text-rose-700' : 'text-emerald-800'
                        }`}
                      >
                        {drug.stockBalance.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500 ml-1">เม็ด</span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>ใกล้หมด (ควรเบิกเพิ่ม)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>พร้อมจ่าย</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenStockInForDrug(drug)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>รับยาเข้า</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditDrug(drug)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                          title="แก้ไขข้อมูลยา หรือปรับยอดคงเหลือ"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>แก้ไข</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ประวัติการรับยาเข้าคลังและการจ่ายยาผู้ป่วยล่าสุด */}
      <div className="bg-white rounded-xl border border-emerald-200/80 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-emerald-100 bg-emerald-50/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-900">
              ประวัติการเคลื่อนไหวคลังยาล่าสุด (รับยาเข้าคลัง / ตัดสต๊อกจ่ายยาผู้ป่วย)
            </h2>
          </div>
          <span className="text-xs text-slate-500 tabular-nums">
            ทั้งหมด {transactions.length} รายการ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs tabular-nums">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600">
                <th className="py-2.5 px-4 whitespace-nowrap">วัน-เวลา</th>
                <th className="py-2.5 px-4 whitespace-nowrap">ประเภทรายการ</th>
                <th className="py-2.5 px-4 whitespace-nowrap">รายการยา</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">จำนวน (เม็ด)</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">คงเหลือหลังทำรายการ</th>
                <th className="py-2.5 px-4 whitespace-nowrap">รายละเอียด / หมายเหตุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60">
              {transactions.slice(0, 15).map((tx) => {
                const isReceive =
                  tx.type === 'รับยาเข้าคลัง' || tx.type === 'เพิ่มรายการยาใหม่';
                return (
                  <tr key={tx.id} className="hover:bg-emerald-50/20">
                    <td className="py-2.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {tx.createdAt}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 font-bold ${
                          isReceive ? 'text-emerald-700' : 'text-amber-800'
                        }`}
                      >
                        {isReceive ? (
                          <ArrowDownCircle className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpCircle className="w-3.5 h-3.5" />
                        )}
                        <span>{tx.type}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {tx.drugName} ({tx.drugCode})
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-mono font-bold whitespace-nowrap ${
                        isReceive ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {isReceive ? `+${tx.amount.toLocaleString()}` : `-${tx.amount.toLocaleString()}`}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                      {tx.balanceAfter.toLocaleString()} เม็ด
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {tx.note} {tx.lotNumber ? `(${tx.lotNumber})` : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: รับยาเข้าคลัง (Stock In) */}
      {isStockInOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl border border-emerald-200 max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  รับเวชภัณฑ์ยาเข้าคลัง (Stock In)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStockInOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitStockIn} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลือกรายการยาที่รับเข้าคลัง *
                </label>
                <select
                  value={selectedDrugId}
                  onChange={(e) => {
                    const found = drugs.find((d) => d.id === e.target.value);
                    setSelectedDrugId(e.target.value);
                    if (found) {
                      setLotNumber(found.lotNumber);
                      setExpiryDate(found.expiryDate);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm font-semibold border border-emerald-300 rounded-lg bg-emerald-50/40"
                >
                  {drugs.map((d) => (
                    <option key={d.id} value={d.id}>
                      [{d.code}] {d.fullName} — คงเหลือปัจจุบัน {d.stockBalance.toLocaleString()} เม็ด
                    </option>
                  ))}
                </select>
              </div>

              {selectedDrugObj && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs tabular-nums">
                  <span>ยอดคงเหลือเดิม: <strong>{selectedDrugObj.stockBalance.toLocaleString()} เม็ด</strong></span>
                  <span className="text-emerald-800 font-bold">
                    รวมหลังรับเข้า: {(selectedDrugObj.stockBalance + Number(stockInAmount || 0)).toLocaleString()} เม็ด
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  จำนวนเม็ดยาที่รับเข้าคลัง *
                </label>
                <div className="flex items-center gap-2 mb-2">
                  {[500, 1000, 2000, 5000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setStockInAmount(preset)}
                      className={`px-3 py-1 text-xs font-mono font-bold rounded-lg border cursor-pointer ${
                        stockInAmount === preset
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      +{preset.toLocaleString()}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  required
                  value={stockInAmount}
                  onChange={(e) => setStockInAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เลขที่ผลิต (Lot Number)
                  </label>
                  <input
                    type="text"
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    วันหมดอายุ (Expiry Date)
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมายเหตุ / แหล่งที่มาการรับยา
                </label>
                <input
                  type="text"
                  value={stockInNote}
                  onChange={(e) => setStockInNote(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsStockInOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
                >
                  ยืนยันรับยาเข้าคลัง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: เพิ่มรายการยาใหม่เข้าคลัง */}
      {isAddNewDrugOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-emerald-200 max-w-xl w-full p-6 shadow-xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  เพิ่มรายการยาใหม่เข้าคลังเวชภัณฑ์ รพ.สต.หนองชิ่ม
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddNewDrugOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewDrug} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    รหัสยา (Code)
                  </label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="เช่น DOX2"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อสามัญทางยา *
                  </label>
                  <input
                    type="text"
                    required
                    value={newGenericName}
                    onChange={(e) => setNewGenericName(e.target.value)}
                    placeholder="เช่น Doxazosin"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ขนาดความแรง *
                  </label>
                  <input
                    type="text"
                    required
                    value={newStrength}
                    onChange={(e) => setNewStrength(e.target.value)}
                    placeholder="เช่น 2 mg"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    หมวดหมู่ยา
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as DrugCategory)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                  >
                    {DRUG_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    จำนวนรับเข้าตั้งต้น (เม็ด)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newInitialStock}
                    onChange={(e) => setNewInitialStock(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    จุดเตือนยาใกล้หมด (เม็ด)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newMinStock}
                    onChange={(e) => setNewMinStock(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เลขที่ผลิต (Lot Number)
                  </label>
                  <input
                    type="text"
                    value={newLotNumber}
                    onChange={(e) => setNewLotNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    วันหมดอายุ
                  </label>
                  <input
                    type="date"
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  วิธีรับประทานมาตรฐาน (สำหรับดึงขึ้นสติกเกอร์ซองยาอัตโนมัติ)
                </label>
                <input
                  type="text"
                  value={newRegimen}
                  onChange={(e) => setNewRegimen(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  สรรพคุณ / คำเตือนบนสติกเกอร์
                </label>
                <input
                  type="text"
                  value={newProperties}
                  onChange={(e) => setNewProperties(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddNewDrugOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 rounded-lg cursor-pointer"
                >
                  บันทึกเพิ่มรายการยาใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: แก้ไขข้อมูลยา / ปรับยอดคงเหลือตามนับจริง / ลบรายการยา */}
      {editingDrug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-emerald-200 max-w-xl w-full p-6 shadow-xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  แก้ไขข้อมูลเวชภัณฑ์ยา / ปรับยอดคงเหลือ ({editingDrug.code})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingDrug(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEditDrug} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    รหัสยา (Code)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingDrug.code}
                    onChange={(e) =>
                      setEditingDrug({ ...editingDrug, code: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อแสดงบนสติกเกอร์ซองยา (ชื่อยา + ความแรง) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingDrug.fullName}
                    onChange={(e) =>
                      setEditingDrug({ ...editingDrug, fullName: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm font-bold border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    หมวดหมู่ยา
                  </label>
                  <select
                    value={editingDrug.category}
                    onChange={(e) =>
                      setEditingDrug({
                        ...editingDrug,
                        category: e.target.value as DrugCategory,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                  >
                    {DRUG_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-1">
                    ยอดคงเหลือปัจจุบัน (เม็ด) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editingDrug.stockBalance}
                    onChange={(e) =>
                      setEditingDrug({
                        ...editingDrug,
                        stockBalance: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono font-bold border border-emerald-400 bg-emerald-50/40 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    จุดเตือนยาใกล้หมด (เม็ด)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingDrug.minStockLevel}
                    onChange={(e) =>
                      setEditingDrug({
                        ...editingDrug,
                        minStockLevel: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เลขที่ผลิต (Lot Number)
                  </label>
                  <input
                    type="text"
                    value={editingDrug.lotNumber}
                    onChange={(e) =>
                      setEditingDrug({ ...editingDrug, lotNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    วันหมดอายุ
                  </label>
                  <input
                    type="date"
                    value={editingDrug.expiryDate}
                    onChange={(e) =>
                      setEditingDrug({ ...editingDrug, expiryDate: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  วิธีรับประทานมาตรฐาน
                </label>
                <input
                  type="text"
                  value={editingDrug.defaultRegimen}
                  onChange={(e) =>
                    setEditingDrug({
                      ...editingDrug,
                      defaultRegimen: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  สรรพคุณ / คำเตือน
                </label>
                <input
                  type="text"
                  value={editingDrug.propertiesAndWarnings}
                  onChange={(e) =>
                    setEditingDrug({
                      ...editingDrug,
                      propertiesAndWarnings: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมายเหตุการปรับปรุงข้อมูล
                </label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                {!confirmDeleteDrug ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteDrug(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบรายการยานี้</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteDrug(editingDrug.id);
                        setEditingDrug(null);
                      }}
                      className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      ยืนยันลบรายการยา
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteDrug(false)}
                      className="px-2.5 py-1.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingDrug(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                  >
                    ปิด
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
                  >
                    บันทึกการแก้ไข
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
