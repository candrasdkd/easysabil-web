import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase/client';
// 1. Import Toast
import toast, { Toaster } from 'react-hot-toast';
import dayjs from 'dayjs';
import { useParams } from 'react-router';
import { 
    Lock, 
    Loader2, 
    Save, 
    XCircle, 
    ChevronLeft, 
    User, 
    Calendar, 
    Users, 
    GraduationCap, 
    Heart,
    Search, 
    ChevronDown, 
    X,
    Activity, 
    HandHeart,
    Tag,
    ListOrdered 
} from 'lucide-react';
import { type Familys } from '../types/Member';

const AUTH_KEY = 'member_create_session';
const SESSION_DURATION = 30 * 60 * 1000;

const Label = ({ children, required }: { children: React.ReactNode, required?: boolean }) => (
    <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {children} {required && <span className="text-red-500">*</span>}
    </label>
);

export default function MemberEdit() {
    const { id } = useParams();
    // const notifications = useNotifications(); // Hapus ini
    
    // --- AUTH STATE ---
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        const storedTimestamp = localStorage.getItem(AUTH_KEY);
        if (storedTimestamp) {
            const now = Date.now();
            if (now - parseInt(storedTimestamp, 10) < SESSION_DURATION) {
                return true;
            } else {
                localStorage.removeItem(AUTH_KEY);
            }
        }
        return false;
    });

    const [passwordInput, setPasswordInput] = useState('');
    const [loadingPassword, setLoadingPassword] = useState(false);
    
    // --- FORM STATE ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingDetail, setIsLoadingDetail] = useState(true);

    const [keluargaOptions, setKeluargaOptions] = useState<Familys[]>([]);
    const [loadingKeluarga, setLoadingKeluarga] = useState(false);
    const [isFamilyDropdownOpen, setIsFamilyDropdownOpen] = useState(false);
    const [familySearch, setFamilySearch] = useState('');
    const familyDropdownRef = useRef<HTMLDivElement>(null);

    const [errorList, setErrorList] = useState<string[]>([]);
    const [openErrorModal, setOpenErrorModal] = useState(false);

    const INITIAL_FORM_VALUES = {
        keluarga: '',
        name: '',
        alias: '', 
        date_of_birth: '', 
        gender: '',
        education: '',
        marriage_status: '',
        is_educate: false,
        age: 0,
        is_active: true,
        is_duafa: false,
        order: null as number | null 
    };

    const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES);

    const filteredKeluarga = keluargaOptions.filter(k => 
        k.name.toLowerCase().includes(familySearch.toLowerCase())
    );

    // --- FETCH DATA LOGIC ---
    
    const fetchKeluarga = useCallback(async () => {
        setLoadingKeluarga(true);
        const { data, error } = await supabase
            .from('list_family')
            .select('id, name')
            .order('name', { ascending: true });

        if (!error) setKeluargaOptions(data || []);
        setLoadingKeluarga(false);
    }, []);

    const fetchMemberDetail = useCallback(async (uuid: string) => {
        setIsLoadingDetail(true);
        const { data, error } = await supabase
            .from('list_sensus')
            .select('*')
            .eq('uuid', uuid)
            .single();

        if (error || !data) {
            // 2. Ganti notifikasi error fetch
            toast.error('Gagal memuat data member');
            setIsLoadingDetail(false);
            return;
        }

        setFormValues({
            keluarga: data.id_family ? String(data.id_family) : '',
            name: data.name || '',
            alias: data.alias || '',
            date_of_birth: data.date_of_birth || '',
            gender: data.gender || '',
            education: data.level || '',
            marriage_status: data.marriage_status || '',
            is_educate: data.is_educate || false,
            age: data.age || 0,
            is_active: data.is_active ?? true,
            is_duafa: data.is_duafa ?? false,
            order: data.order 
        });

        if (data.family_name) {
            setFamilySearch(data.family_name);
        }

        setIsLoadingDetail(false);
    }, []);

    // --- EFFECTS ---
    useEffect(() => {
        if (isAuthenticated && id) {
            localStorage.setItem(AUTH_KEY, Date.now().toString());
            const initData = async () => {
                await fetchKeluarga();
                await fetchMemberDetail(id);
            };
            initData();
        }
    }, [isAuthenticated, id, fetchKeluarga, fetchMemberDetail]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (familyDropdownRef.current && !familyDropdownRef.current.contains(event.target as Node)) {
                setIsFamilyDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- HANDLERS ---

    const handlePasswordSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!passwordInput.trim()) {
            toast('Password kosong', { icon: '⚠️' });
            return;
        }
        setLoadingPassword(true);
        setTimeout(() => {
            if (passwordInput === "admin354") {
                localStorage.setItem(AUTH_KEY, Date.now().toString());
                setIsAuthenticated(true);
                // 3. Sukses Login
                toast.success('Akses Edit Dibuka');
            } else {
                // 4. Gagal Login
                toast.error('Password salah');
            }
            setLoadingPassword(false);
        }, 800);
    };

    const handleLockSession = () => {
        localStorage.removeItem(AUTH_KEY);
        setIsAuthenticated(false);
        setPasswordInput('');
        toast('Sesi dikunci', { icon: '🔒' });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let finalValue: any = value;
        
        if (type === 'checkbox') {
            finalValue = (e.target as HTMLInputElement).checked;
        }
        
        if (name === 'order') {
            finalValue = value === '' ? null : parseInt(value);
        }

        setFormValues(prev => {
            const newState = { ...prev, [name]: finalValue };
            if (name === 'date_of_birth') {
                if (value) {
                    const calculatedAge = dayjs().diff(dayjs(value), 'year');
                    newState.age = calculatedAge;
                } else {
                    newState.age = 0;
                }
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
        if (!formValues.keluarga) errors.push("Keluarga belum dipilih");
        if (!formValues.name?.trim()) errors.push("Nama lengkap wajib diisi");
        if (!formValues.date_of_birth) errors.push("Tanggal lahir wajib diisi");
        if (!formValues.gender) errors.push("Jenis kelamin wajib dipilih");
        if (!formValues.education) errors.push("Jenjang wajib dipilih");
        if (!formValues.marriage_status) errors.push("Status pernikahan wajib dipilih");
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
        // 5. Loading Toast State
        const toastId = toast.loading('Menyimpan perubahan...');

        try {
            const selectedKeluarga = keluargaOptions.find(k => k.id === Number(formValues.keluarga));
            
            const body = {
                name: formValues.name,
                alias: formValues.alias,
                date_of_birth: formValues.date_of_birth,
                gender: formValues.gender,
                level: formValues.education,
                age: formValues.age,
                marriage_status: formValues.marriage_status,
                id_family: selectedKeluarga ? selectedKeluarga.id : Number(formValues.keluarga),
                family_name: selectedKeluarga ? selectedKeluarga.name : familySearch,
                is_educate: formValues.is_educate,
                is_active: formValues.is_active,
                is_duafa: formValues.is_duafa,
                order: formValues.order 
            };

            const { error } = await supabase
                .from('list_sensus')
                .update(body)
                .eq('uuid', id);

            if (error) throw error;

            // 6. Sukses Toast Update
            toast.success('Data berhasil diperbarui', { id: toastId });
            localStorage.setItem(AUTH_KEY, Date.now().toString());
            window.history.back();

        } catch (error: any) {
            // 7. Error Toast Update
            toast.error(`Gagal update: ${error.message}`, { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- RENDER LOGIN ---
    if (!isAuthenticated) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
                {/* 8. Toaster untuk Login Screen */}
                <Toaster position="top-center" />
                
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                    <div className="bg-indigo-600 p-6 text-center">
                        <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 backdrop-blur-md">
                            <Lock className="text-white" size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Edit Data Terbatas</h2>
                        <p className="text-indigo-100 text-sm mt-1">Masukkan kunci keamanan untuk mengubah data.</p>
                    </div>
                    <div className="p-8">
                        <form onSubmit={handlePasswordSubmit}>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Password Admin</label>
                                <input type="password" autoFocus className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="••••••••" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => window.history.back()} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50">Batal</button>
                                <button type="submit" disabled={loadingPassword} className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-70">{loadingPassword ? <Loader2 className="animate-spin" size={20} /> : 'Buka Editor'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoadingDetail) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin text-indigo-600" size={32} />
                    <p className="text-slate-500 font-medium">Sedang mengambil data member...</p>
                </div>
            </div>
        );
    }

    // --- RENDER FORM ---
    return (
        <div className="min-h-screen bg-slate-50 pb-20 pt-8 px-4 sm:px-6">
            {/* 9. Toaster untuk Main Form */}
            <Toaster position="top-center" />

            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => window.history.back()} className="p-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"><ChevronLeft size={20} /></button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Edit Data Member</h1>
                            <p className="text-slate-500 text-sm">Perbarui informasi sensus penduduk.</p>
                        </div>
                    </div>
                    <button onClick={handleLockSession} className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-sm font-medium hover:bg-rose-100 border border-rose-100"><Lock size={14} /> Kunci Akses</button>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    
                    <div className="p-6 sm:p-8 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                            <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><User size={18} /></div>
                            Identitas Personal
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            <div className="md:col-span-1">
                                <Label required>Nama Lengkap</Label>
                                <input 
                                    type="text" 
                                    name="name" 
                                    value={formValues.name} 
                                    onChange={handleChange} 
                                    placeholder="Sesuai KTP / KK" 
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                />
                            </div>

                            <div className="md:col-span-1">
                                <Label>Nama Panggilan (Alias)</Label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        name="alias" 
                                        value={formValues.alias} 
                                        onChange={handleChange} 
                                        placeholder="Nama panggilan..." 
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                    />
                                    <Tag className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                </div>
                            </div>

                            <div className="md:col-span-2" ref={familyDropdownRef}>
                                <Label required>Kepala Keluarga (KK)</Label>
                                <div className="relative">
                                    <div 
                                        className="relative flex items-center"
                                        onClick={() => { if(!loadingKeluarga) setIsFamilyDropdownOpen(true) }}
                                    >
                                        <div className="absolute left-4 text-slate-400">
                                            {loadingKeluarga ? <Loader2 className="animate-spin" size={18}/> : <Search size={18} />}
                                        </div>
                                        <input 
                                            type="text"
                                            placeholder={loadingKeluarga ? "Memuat..." : "Cari keluarga..."}
                                            value={familySearch}
                                            onChange={(e) => {
                                                setFamilySearch(e.target.value);
                                                setIsFamilyDropdownOpen(true);
                                                if (formValues.keluarga) setFormValues(prev => ({...prev, keluarga: ''})); 
                                            }}
                                            onFocus={() => setIsFamilyDropdownOpen(true)}
                                            className="w-full pl-11 pr-10 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
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
                                                        className={`px-4 py-3 cursor-pointer hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0 flex items-center justify-between
                                                            ${String(family.id) === formValues.keluarga ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'}
                                                        `}
                                                    >
                                                        {family.name}
                                                        {String(family.id) === formValues.keluarga && <Users size={16} className="text-indigo-600" />}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-4 py-6 text-center text-slate-500 text-sm">Keluarga tidak ditemukan.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label required>Tanggal Lahir</Label>
                                <div className="relative">
                                    <input type="date" name="date_of_birth" value={formValues.date_of_birth} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                </div>
                            </div>
                            <div>
                                <Label>Umur</Label>
                                <input type="text" value={formValues.age ? `${formValues.age} Tahun` : '-'} readOnly className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 outline-none" />
                            </div>
                            <div>
                                <Label required>Jenis Kelamin</Label>
                                <select name="gender" value={formValues.gender} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                    <option value="">-- Pilih --</option>
                                    <option value="Laki - Laki">Laki - Laki</option>
                                    <option value="Perempuan">Perempuan</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 sm:p-8 bg-slate-50/50">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><GraduationCap size={18} /></div>
                            Status Sosial & Admin
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Label required>Jenjang Pembinaan</Label>
                                <select name="education" value={formValues.education} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
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
                            </div>

                            <div>
                                <Label required>Status Pernikahan</Label>
                                <div className="relative">
                                    <select name="marriage_status" value={formValues.marriage_status} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                        <option value="">-- Pilih Status --</option>
                                        <option value="Belum Menikah">Belum Menikah</option>
                                        <option value="Menikah">Menikah</option>
                                        <option value="Janda">Janda</option>
                                        <option value="Duda">Duda</option>
                                    </select>
                                    <Heart className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                </div>
                            </div>

                            {/* --- INPUT URUTAN --- */}
                            <div className="md:col-span-2">
                                <Label>Urutan dalam Absen</Label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        name="order" 
                                        value={formValues.order ?? ''} 
                                        onChange={handleChange} 
                                        placeholder="Contoh: 1 (Kepala Keluarga), 2 (Istri), dst" 
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                    />
                                    <ListOrdered className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                </div>
                            </div>
                            {/* -------------------- */}

                            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                                <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl bg-white cursor-pointer hover:border-indigo-300 transition-colors">
                                    <input type="checkbox" name="is_educate" checked={formValues.is_educate} onChange={handleChange} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300" />
                                    <div>
                                        <span className="font-semibold text-slate-800 block text-sm">Status Binaan</span>
                                        <span className="text-xs text-slate-500">Masih sekolah/binaan</span>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl bg-white cursor-pointer hover:border-emerald-300 transition-colors">
                                    <input type="checkbox" name="is_active" checked={formValues.is_active} onChange={handleChange} className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300" />
                                    <div>
                                        <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-sm">
                                            <Activity size={14} className="text-emerald-500" /> Keaktifan
                                        </div>
                                        <span className="text-xs text-slate-500">Anggota aktif di sistem</span>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl bg-white cursor-pointer hover:border-rose-300 transition-colors">
                                    <input type="checkbox" name="is_duafa" checked={formValues.is_duafa} onChange={handleChange} className="w-5 h-5 text-rose-600 rounded focus:ring-rose-500 border-gray-300" />
                                    <div>
                                        <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-sm">
                                            <HandHeart size={14} className="text-rose-500" /> Status Duafa
                                        </div>
                                        <span className="text-xs text-slate-500">Penerima bantuan</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 sm:p-8 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row justify-end gap-3">
                        <button type="button" onClick={() => window.history.back()} className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors">Batal</button>
                        <button type="submit" disabled={isSubmitting} className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">{isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={18} />} Update Data</button>
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