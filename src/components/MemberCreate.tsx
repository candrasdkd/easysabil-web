import React, { useState, useEffect, useRef } from 'react'; 
import { supabase } from '../supabase/client';
// 1. Hapus import useNotifications lama
// import useNotifications from '../hooks/useNotifications/useNotifications'; 
import toast, { Toaster } from 'react-hot-toast'; // 2. Import React Hot Toast
import dayjs from 'dayjs';
import { 
    Lock, 
    Loader2, 
    Save, 
    XCircle, 
    ChevronLeft, 
    User, 
    Calendar, 
    Heart,
    Search, 
    ChevronDown, 
    X,
    Users,
    GraduationCap,
    Tag
} from 'lucide-react';
import { type Familys } from '../types/Member';

const AUTH_KEY = 'member_create_session';
const SESSION_DURATION = 30 * 60 * 1000;

const Label = ({ children, required }: { children: React.ReactNode, required?: boolean }) => (
    <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {children} {required && <span className="text-red-500">*</span>}
    </label>
);

export default function MemberCreate() {
    // 3. Hapus inisialisasi hook lama
    // const notifications = useNotifications(); 

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
    const [isSubmitting, setIsSubmitting] = useState(false);
    
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
        date_of_birth: '', 
        gender: '',
        education: '',
        marriage_status: '',
        is_educate: false,
        age: 0
    };

    const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES);

    const filteredKeluarga = keluargaOptions.filter(k => 
        k.name.toLowerCase().includes(familySearch.toLowerCase())
    );

    useEffect(() => {
        if (isAuthenticated) {
            localStorage.setItem(AUTH_KEY, Date.now().toString());
            const fetchKeluarga = async () => {
                setLoadingKeluarga(true);
                const { data, error } = await supabase
                    .from('list_family')
                    .select('id, name')
                    .order('name', { ascending: true });

                if (!error) setKeluargaOptions(data || []);
                setLoadingKeluarga(false);
            };
            fetchKeluarga();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (familyDropdownRef.current && !familyDropdownRef.current.contains(event.target as Node)) {
                setIsFamilyDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handlePasswordSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!passwordInput.trim()) {
            // 4. Ganti penggunaan notifikasi
            toast('Password tidak boleh kosong', { icon: '⚠️' });
            return;
        }
        setLoadingPassword(true);
        setTimeout(() => {
            if (passwordInput === "admin354") {
                localStorage.setItem(AUTH_KEY, Date.now().toString());
                setIsAuthenticated(true);
                toast.success('Akses dibuka (Sesi 30 Menit)');
            } else {
                toast.error('Password salah');
            }
            setLoadingPassword(false);
        }, 800);
    };

    const handleLockSession = () => {
        localStorage.removeItem(AUTH_KEY);
        setIsAuthenticated(false);
        setPasswordInput('');
        toast('Sesi dikunci kembali', { icon: '🔒' });
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
        if (!formValues.education) errors.push("Pendidikan/Jenjang wajib dipilih");
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
        // Loading toast
        const toastId = toast.loading('Menyimpan data...');

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
                id_family: selectedKeluarga?.id,
                family_name: selectedKeluarga?.name,
                is_educate: formValues.is_educate,
            };

            const { error } = await supabase.from('list_sensus').insert([body]);
            if (error) throw error;

            // Sukses toast update
            toast.success('Data berhasil disimpan', { id: toastId });
            
            setFormValues(INITIAL_FORM_VALUES); 
            setFamilySearch(''); 
            window.scrollTo({ top: 0, behavior: 'smooth' });
            localStorage.setItem(AUTH_KEY, Date.now().toString());

        } catch (error: any) {
            // Error toast update
            toast.error(`Gagal simpan: ${error.message}`, { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    // UI Render
    if (!isAuthenticated) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
                {/* 5. Pasang Toaster di sini juga untuk handle error password */}
                <Toaster position="top-center" />
                
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                    <div className="bg-indigo-600 p-6 text-center">
                        <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 backdrop-blur-md">
                            <Lock className="text-white" size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Akses Terbatas</h2>
                        <p className="text-indigo-100 text-sm mt-1">Masukkan kunci keamanan untuk menambah data.</p>
                    </div>
                    <div className="p-8">
                        <form onSubmit={handlePasswordSubmit}>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Password Admin</label>
                                <input type="password" autoFocus className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="••••••••" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => window.history.back()} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50">Batal</button>
                                <button type="submit" disabled={loadingPassword} className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-70">{loadingPassword ? <Loader2 className="animate-spin" size={20} /> : 'Buka Akses'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20 pt-8 px-4 sm:px-6">
            {/* 6. Pasang Toaster di Main Render */}
            <Toaster position="top-center" toastOptions={{ duration: 4000 }} />

            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => window.history.back()} className="p-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"><ChevronLeft size={20} /></button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Tambah Anggota Baru</h1>
                            <p className="text-slate-500 text-sm">Formulir pendaftaran sensus penduduk.</p>
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
                                <input type="text" name="name" value={formValues.name} onChange={handleChange} placeholder="Sesuai KTP / KK" className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" />
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

                            {/* --- SEARCHABLE KEPALA KELUARGA (COMBOBOX) --- */}
                            <div className="md:col-span-2" ref={familyDropdownRef}>
                                <Label required>Kepala Keluarga (KK)</Label>
                                <div className="relative">
                                    <div 
                                        className="relative flex items-center"
                                        onClick={() => {
                                            if(!loadingKeluarga) setIsFamilyDropdownOpen(true)
                                        }}
                                    >
                                        <div className="absolute left-4 text-slate-400">
                                            {loadingKeluarga ? <Loader2 className="animate-spin" size={18}/> : <Search size={18} />}
                                        </div>
                                        <input 
                                            type="text"
                                            placeholder={loadingKeluarga ? "Memuat data..." : "Ketik untuk mencari keluarga..."}
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

                                    {/* DROPDOWN LIST */}
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
                                                <div className="px-4 py-6 text-center text-slate-500 text-sm">
                                                    Keluarga tidak ditemukan.
                                                </div>
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
                                <Label>Umur (Otomatis)</Label>
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
                            Status Sosial
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

                            <div className="md:col-span-2 mt-2">
                                <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl bg-white cursor-pointer hover:border-indigo-300 transition-colors">
                                    <input type="checkbox" name="is_educate" checked={formValues.is_educate} onChange={handleChange} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300" />
                                    <div>
                                        <span className="font-semibold text-slate-800 block">Status Binaan / Pelajar</span>
                                        <span className="text-xs text-slate-500">Centang jika anggota ini masih dalam masa pendidikan/binaan aktif.</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 sm:p-8 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row justify-end gap-3">
                        <button type="button" onClick={() => setFormValues(INITIAL_FORM_VALUES)} className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors">Reset Form</button>
                        <button type="submit" disabled={isSubmitting} className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">{isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={18} />} Simpan Data</button>
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