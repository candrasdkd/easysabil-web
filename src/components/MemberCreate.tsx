import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase/client';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import {
    Loader2,
    Save,
    XCircle,
    ChevronLeft,
    User,
    Heart,
    Search,
    ChevronDown,
    X,
    Users,
    GraduationCap,
    Tag,
    HandHeart
} from 'lucide-react';
import { type Familys } from '../types/Member';
import CustomDatePicker from './CustomDatePicker';
import { logAudit } from '../utils/auditLogger';
import { useMembersStore, useRoleMembersStore } from '../store/membersStore';


const Label = ({ children, required }: { children: React.ReactNode, required?: boolean }) => (
    <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {children} {required && <span className="text-red-500">*</span>}
    </label>
);

export default function MemberCreate() {
    // 3. Hapus inisialisasi hook lama
    // const notifications = useNotifications(); 

    const [isSubmitting, setIsSubmitting] = useState(false);
    const { profile } = useAuth();

    // --- STATE UNTUK SEARCHABLE KELUARGA ---
    const [keluargaOptions, setKeluargaOptions] = useState<Familys[]>([]);
    const [loadingKeluarga, setLoadingKeluarga] = useState(false);
    const [isFamilyDropdownOpen, setIsFamilyDropdownOpen] = useState(false);
    const [familySearch, setFamilySearch] = useState('');
    const familyDropdownRef = useRef<HTMLDivElement>(null);
    // ---------------------------------------

    const [errorList, setErrorList] = useState<string[]>([]);
    const [openErrorModal, setOpenErrorModal] = useState(false);

    const INITIAL_FORM_VALUES = {
        keluarga: '',
        name: '',
        alias: '',
        date_of_birth: dayjs().format('YYYY-MM-DD'),
        gender: '',
        education: '',
        marriage_status: '',
        kelompok: '',
        is_educate: false,
        is_duafa: false,
        age: '0 Bulan'
    };

    const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES);

    const filteredKeluarga = keluargaOptions.filter(k =>
        k.name.toLowerCase().includes(familySearch.toLowerCase())
    );

    useEffect(() => {
        const fetchKeluarga = async () => {
            if (!profile) return;
            setLoadingKeluarga(true);
            try {
                let q;
                if (profile.status === 3 || profile.status === 5) {
                    q = query(
                        collection(db, 'families'),
                        where('kelompok', '==', profile.kelompok),
                        orderBy('name', 'asc')
                    );
                } else {
                    q = query(collection(db, 'families'), orderBy('name', 'asc'));
                }
                const querySnapshot = await getDocs(q);
                const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setKeluargaOptions(data as any as Familys[]);
            } catch (error) {
                console.error("Error fetching families:", error);
            } finally {
                setLoadingKeluarga(false);
            }
        };
        fetchKeluarga();
    }, [profile]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (familyDropdownRef.current && !familyDropdownRef.current.contains(event.target as Node)) {
                setIsFamilyDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    const formatAge = (dob: string | null | undefined) => {
        if (!dob) return '-';
        const birthDate = dayjs(dob);
        const today = dayjs();
        if (birthDate.isAfter(today)) return '-';

        const years = today.diff(birthDate, 'year');
        const months = today.diff(birthDate.add(years, 'year'), 'month');

        if (years === 0 && months === 0) return '< 1 Bulan';
        if (years === 0) return `${months} Bulan`;
        if (months === 0) return `${years} Tahun`;
        return `${years} Tahun ${months} Bulan`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let finalValue: any = value;
        if (type === 'checkbox') {
            finalValue = (e.target as HTMLInputElement).checked;
        }

        setFormValues(prev => {
            const newState = { ...prev, [name]: finalValue };
            if (name === 'date_of_birth') {
                newState.age = value ? formatAge(value) : '-';
            }
            return newState;
        });
    };

    const handleSelectFamily = (family: Familys) => {
        setFormValues(prev => ({ ...prev, keluarga: String(family.id) }));
        setFamilySearch(family.name);
        setIsFamilyDropdownOpen(false);
    };

    const handleClearFamily = () => {
        setFormValues(prev => ({ ...prev, keluarga: '' }));
        setFamilySearch('');
    };

    const validateForm = () => {
        const errors: string[] = [];
        if (!formValues.name?.trim()) errors.push("Nama lengkap wajib diisi");
        if (!formValues.gender) errors.push("Jenis kelamin wajib dipilih");
        
        if (!formValues.is_educate) {
            if (!formValues.keluarga) errors.push("Keluarga belum dipilih");
            if (!formValues.date_of_birth) errors.push("Tanggal lahir wajib diisi");
            if (!formValues.education) errors.push("Pendidikan/Jenjang wajib dipilih");
            if (!formValues.marriage_status) errors.push("Status pernikahan wajib dipilih");
        }
        return errors;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors = validateForm();
        if (errors.length > 0) {
            setErrorList(errors);
            setOpenErrorModal(true);
            return;
        }

        setIsSubmitting(true);
        // Loading toast
        const toastId = toast.loading('Menyimpan data...');

        try {
            const selectedKeluarga = keluargaOptions.find(k => String(k.id) === formValues.keluarga);
            const body = {
                name: formValues.name,
                alias: formValues.alias,
                date_of_birth: formValues.date_of_birth,
                gender: formValues.gender,
                level: formValues.education,
                age: formValues.age,
                marriage_status: formValues.marriage_status,
                kelompok: formValues.kelompok,
                family_id: selectedKeluarga?.id,
                family_name: selectedKeluarga?.name,
                is_educate: formValues.is_educate,
                is_duafa: formValues.is_duafa,
                is_active: true,
                created_at: new Date().toISOString(),
            };

            const cleanBody = Object.fromEntries(Object.entries(body).filter(([_, v]) => v !== undefined));

            const { error, id: newDocId } = await addDoc(collection(db, 'sensus'), cleanBody).then(docRef => ({ error: null, id: docRef.id })).catch(err => ({ error: err, id: null }));
            if (error) throw error;
            // console.log(error);
            // Sukses toast update
            toast.success('Data berhasil disimpan', { id: toastId });

            // Audit Log
            await logAudit('CREATE', 'MEMBER', newDocId as string, formValues.name, profile, cleanBody, 'Menambahkan anggota baru');

            useMembersStore.getState().invalidate();
            useRoleMembersStore.getState().invalidate();

            setFormValues(INITIAL_FORM_VALUES);
            setFamilySearch('');
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (error: any) {
            console.log(error);
            // Error toast update
            toast.error(`Gagal simpan: ${error.message}`, { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20 pt-8 px-4 sm:px-6">

            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => window.history.back()} className="p-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"><ChevronLeft size={20} /></button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Tambah Anggota Baru</h1>
                            <p className="text-slate-500 text-sm">Formulir pendaftaran sensus penduduk.</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 sm:p-8 border-b border-slate-200 bg-slate-50/30">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {!formValues.is_duafa && (
                                <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl bg-white cursor-pointer hover:border-blue-300 transition-colors">
                                    <input type="checkbox" name="is_educate" checked={formValues.is_educate} onChange={handleChange} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300" />
                                    <div>
                                        <span className="font-semibold text-slate-800 block">Status Binaan / Pelajar</span>
                                        <span className="text-xs text-slate-500">Centang jika anggota ini masih dalam masa pendidikan/binaan aktif.</span>
                                    </div>
                                </label>
                            )}

                            {!formValues.is_educate && (
                                <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl bg-white cursor-pointer hover:border-rose-300 transition-colors">
                                    <input type="checkbox" name="is_duafa" checked={formValues.is_duafa} onChange={handleChange} className="w-5 h-5 text-rose-600 rounded focus:ring-rose-500 border-gray-300" />
                                    <div>
                                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                                            <HandHeart size={16} className="text-rose-500" /> Status Duafa
                                        </div>
                                        <span className="text-xs text-slate-500">Penerima bantuan</span>
                                    </div>
                                </label>
                            )}
                        </div>
                    </div>

                    <div className="p-6 sm:p-8 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                            <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><User size={18} /></div>
                            Identitas Personal
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            <div className="md:col-span-1">
                                <Label required>Nama Lengkap</Label>
                                <input type="text" name="name" value={formValues.name} onChange={handleChange} placeholder="Sesuai KTP / KK" className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>

                            {!formValues.is_educate && (
                                <div className="md:col-span-1">
                                    <Label>Nama Panggilan (Alias)</Label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            name="alias"
                                            value={formValues.alias}
                                            onChange={handleChange}
                                            placeholder="Nama panggilan..."
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                        <Tag className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                    </div>
                                </div>
                            )}

                            {!formValues.is_educate && (
                                <div className="md:col-span-2" ref={familyDropdownRef}>
                                    <Label required>Kepala Keluarga (KK)</Label>
                                    <div className="relative">
                                        <div
                                            className="relative flex items-center"
                                            onClick={() => {
                                                if (!loadingKeluarga) setIsFamilyDropdownOpen(true)
                                            }}
                                        >
                                            <div className="absolute left-4 text-slate-400">
                                                {loadingKeluarga ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                                            </div>
                                            <input
                                                type="text"
                                                placeholder={loadingKeluarga ? "Memuat data..." : "Ketik untuk mencari keluarga..."}
                                                value={familySearch}
                                                onChange={(e) => {
                                                    setFamilySearch(e.target.value);
                                                    setIsFamilyDropdownOpen(true);
                                                    if (formValues.keluarga) setFormValues(prev => ({ ...prev, keluarga: '' }));
                                                }}
                                                onFocus={() => setIsFamilyDropdownOpen(true)}
                                                className="w-full pl-11 pr-10 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                            <div className="absolute right-3 flex items-center gap-1">
                                                {formValues.keluarga && (
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleClearFamily(); }} className="p-1 text-slate-400 hover:text-red-500">
                                                        <X size={16} />
                                                    </button>
                                                )}
                                                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isFamilyDropdownOpen ? 'rotate-180' : ''}`} />
                                            </div>
                                        </div>

                                        {isFamilyDropdownOpen && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                                {filteredKeluarga.length > 0 ? (
                                                    filteredKeluarga.map(family => (
                                                        <div
                                                            key={family.id}
                                                            onClick={() => handleSelectFamily(family)}
                                                            className={`px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0 flex items-center justify-between
                                                                ${String(family.id) === formValues.keluarga ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'}
                                                            `}
                                                        >
                                                            {family.name}
                                                            {String(family.id) === formValues.keluarga && <Users size={16} className="text-blue-600" />}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="px-4 py-6 text-center text-slate-500 text-sm">
                                                        Keluarga tidak ditemukan.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {!formValues.is_educate && (
                                <div>
                                    <Label required>Tanggal Lahir</Label>
                                    <CustomDatePicker
                                        value={formValues.date_of_birth}
                                        onChange={(val: string) => handleChange({ target: { name: 'date_of_birth', value: val, type: 'text' } } as any)}
                                    />
                                </div>
                            )}
                            {!formValues.is_educate && (
                                <div>
                                    <Label>Umur (Otomatis)</Label>
                                    <input type="text" value={formValues.age} readOnly className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 outline-none" />
                                </div>
                            )}
                            <div>
                                <Label required>Jenis Kelamin</Label>
                                <div className="relative">
                                    <select name="gender" value={formValues.gender} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none pr-10">
                                        <option value="">-- Pilih --</option>
                                        <option value="Laki - Laki">Laki - Laki</option>
                                        <option value="Perempuan">Perempuan</option>
                                    </select>
                                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 sm:p-8 bg-slate-50/50">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><GraduationCap size={18} /></div>
                            Status Sosial
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Kelompok */}
                            {profile?.status !== 3 && profile?.status !== 5 && (
                                <div className="md:col-span-2">
                                    <Label>Kelompok</Label>
                                    <div className="relative">
                                        <select name="kelompok" value={formValues.kelompok} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none pr-10">
                                            <option value="">-- Pilih Kelompok --</option>
                                            {Array.from(new Set(keluargaOptions.map(f => f.kelompok))).filter(Boolean).sort().map(kelompok => (
                                                <option key={kelompok} value={kelompok}>{kelompok}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            )}

                            {!formValues.is_educate && (
                                <div>
                                    <Label required>Jenjang Pembinaan</Label>
                                    <div className="relative">
                                        <select name="education" value={formValues.education} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none pr-10">
                                            <option value="">-- Pilih Jenjang --</option>
                                            <option value="Batita">Batita (0-3 Tahun)</option>
                                            <option value="Paud">Paud (3-5 Tahun)</option>
                                            <option value="Cabe Rawit">Cabe Rawit (5-12 Tahun)</option>
                                            <option value="Pra Remaja">Pra Remaja (12-15 Tahun)</option>
                                            <option value="Remaja">Remaja (15-19 Tahun)</option>
                                            <option value="Pra Nikah">Pra Nikah (19-30 Tahun)</option>
                                            <option value="Dewasa">Dewasa (Sudah Menikah / 30-60 Tahun)</option>
                                            <option value="Lansia">Lansia (70+ Tahun)</option>
                                        </select>
                                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            )}

                            {!formValues.is_educate && (
                                <div>
                                    <Label required>Status Pernikahan</Label>
                                    <div className="relative">
                                        <Heart className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                        <select name="marriage_status" value={formValues.marriage_status} onChange={handleChange} className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none">
                                            <option value="">-- Pilih Status --</option>
                                            <option value="Belum Menikah">Belum Menikah</option>
                                            <option value="Menikah">Menikah</option>
                                            <option value="Janda">Janda</option>
                                            <option value="Duda">Duda</option>
                                        </select>
                                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 sm:p-8 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row justify-end gap-3">
                        <button type="button" onClick={() => setFormValues(INITIAL_FORM_VALUES)} className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors">Reset Form</button>
                        <button type="submit" disabled={isSubmitting} className="px-8 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">{isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={18} />} Simpan Data</button>
                    </div>
                </form>
            </div>

            {openErrorModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
                        <div className="flex items-center gap-3 text-red-600 mb-4"><XCircle size={24} /><h3 className="text-lg font-bold">Data Belum Lengkap</h3></div>
                        <ul className="space-y-2 mb-6 text-sm text-slate-600">{errorList.map((err, idx) => (<li key={idx} className="flex items-start gap-2"><span className="text-red-400 mt-0.5">•</span> {err}</li>))}</ul>
                        <button onClick={() => setOpenErrorModal(false)} className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl transition-colors">Perbaiki Data</button>
                    </div>
                </div>
            )}
        </div>
    );
}