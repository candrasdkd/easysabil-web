# Product Requirements Document — EasySabil Web App

**Repo:** [candrasdkd/easysabil-web](https://github.com/candrasdkd/easysabil-web)
**Live:** easysabil-web.vercel.app
**Status:** Living document — update setiap ada perubahan scope/fitur
**Versi:** 1.3 (Sensus auto-level Dewasa + Kolom Muda/i + Timestamp Absen & Floating Buttons + Excel Multi-sheet)
**Terakhir Diperbarui:** 22 Juli 2026

---

## 1. Ringkasan Produk

EasySabil adalah aplikasi web untuk mengelola data komunitas/jamaah: sensus keluarga & anggota, iuran/order, dan absensi — dengan role-based access control 6 level dan scoping per kelompok.

**Problem yang diselesaikan:**
- Data sensus keluarga/anggota masih tersebar (manual/Excel) → sulit di-maintain & rawan duplikasi.
- Tidak ada kontrol akses berbasis role untuk data sensitif komunitas.
- Pencatatan iuran & kategori produk belum terpusat.
- Rekap kehadiran manual, sulit dianalisis.
- Analitik agregat sebelumnya bergantung pada layanan eksternal (SheetDB) → coupling & cost tidak perlu.

---

## 2. Target User & Role

Role ditentukan oleh field `status` (number, 0–5) di collection `users`, dikombinasikan dengan field `kelompok` untuk data scoping.

| `status` | Label | Level |
|---|---|---|
| 0 | Super Admin | Full — satu-satunya yang bisa ubah status user lain |
| 1 | Admin | Full operasional harian |
| 2 | Pengurus Desa | Desa-level |
| 3 | Pengurus Kelompok | Kelompok-level (wajib pilih kelompok saat register) |
| 4 | Pengurus Muda/i Desa | Desa-level, scope Muda/i |
| 5 | Pengurus Muda/i Kelompok | Kelompok-level, scope Muda/i (wajib pilih kelompok) |

**Alur registrasi:** user baru pilih status 2/3/4/5 saat `/register` (0 & 1 tidak tersedia di form publik) → `isActive = false` → butuh approval Admin/Super Admin di `/admin/users` sebelum bisa login. Hanya Super Admin yang bisa mengubah `status` user lain.

### Hak Akses Per Fitur (dari dokumen access-matrix)

| Fitur | 0 | 1 | 2 P.Desa | 3 P.Klp | 4 PM Desa | 5 PM Klp |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Anggota — Lihat | Semua | Semua | Semua | Klp sendiri | Muda/i Desa | Muda/i Klp |
| Anggota — CRUD | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Keluarga — Lihat | Semua | Semua | Semua | Klp sendiri | Read Only | Read Only |
| Keluarga — CRUD | ✅ | ✅ | 👁️ Read | ✅ Klp saja | ❌ | ❌ |
| Category Orders | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Orders / Iuran | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Presensi Muda/i — Input | ✅ | ✅ | ❌ | ❌ | ✅ Desa-wide | ✅ Klp sendiri |
| Presensi Muda/i — Rekap | ✅ | ✅ | ❌ | ❌ | ✅ Desa-wide | ✅ Klp sendiri |
| Audit Log | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Admin Users | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ubah Status User | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

> ⚠️ **RISIKO — mismatch matrix vs Firestore rules (perlu diverifikasi & fix):**
> 1. **`families`**: matrix bilang status 2 (P.Desa) cuma "Read" dan status 4 (PM Desa) "❌" untuk CRUD. Tapi rule `canCreateData/Update/Delete` pakai `isDesaLevel()` yang mencakup status **0,1,2,4** tanpa filter tambahan → di level Firestore, status 2 & 4 sebenarnya **bisa** create/update/delete `families` sepenuhnya. Kalau UI cuma hide tombol berdasarkan matrix, user status 2/4 masih bisa bypass lewat direct write (Postman/console) karena rule mengizinkan. Perlu diperbaiki salah satu: perketat rule `families` (tambah exclude utk status 4, read-only utk status 2), atau update matrix dokumentasi.
> 2. **`category_orders`**: matrix bilang semua role (termasuk 3 & 5) ✅ penuh. Tapi rule `allow write: if isDesaLevel();` → status 3 & 5 (kelompok-level) **tidak bisa write**, cuma read. Kalau UI kelompok-level nampilin tombol create/edit kategori, request-nya bakal ditolak Firestore — cek UX-nya, apakah error-nya di-handle dengan baik.

---

## 3. Tech Stack (existing)

- **Frontend:** React 19 + Vite 5 + TypeScript
- **Routing:** React Router v7
- **State Management:** Zustand v5 — semua store pakai **cache TTL 10 menit** (lihat §6 soal klaim "real-time")
- **Styling:** Tailwind CSS v4
- **Charts:** Recharts + CSS `conic-gradient` (Donut Chart Presensi)
- **Tanggal:** Day.js + locale `id` (format Indonesia: "Senin, 22 Juli 2026")
- **Export/Import:** xlsx (Excel), react-to-pdf, html-to-image, file-saver
- **Icons:** Lucide React
- **Notifikasi:** React Hot Toast
- **PWA:** vite-plugin-pwa
- **Backend/DB:** Firebase (Authentication + Firestore)
- **Hosting:** Vercel

Stack cost-effective (Firebase + Vercel free tier untuk skala komunitas kecil-menengah). Pertahankan kecuali volume data sudah besar dan butuh query kompleks/reporting berat → baru pertimbangkan Postgres/Supabase.

### Zustand Stores (referensi implementasi)

| Store | File | Collection | Dipakai di |
|---|---|---|---|
| `useMembersStore` | `membersStore.ts` | `sensus` (aktif saja) | TableTotalSensus, AttendanceLog |
| `useRoleMembersStore` | `membersStore.ts` | `sensus` (filter by role) | DashboardPage, MemberListPage, AttendanceLog |
| `useFamiliesStore` | `familiesStore.ts` | `families` (filter by role) | MemberCreate, MemberEdit, FamiliesPage |
| `useOrdersStore` | `ordersStore.ts` | `orders` | ListOrder |
| `useOrderDropdownsStore` | `ordersStore.ts` | `sensus` + `category_orders` | OrderFormModal |
| `useCategoryOrdersStore` | `categoryOrdersStore.ts` | `category_orders` | CategoryOrder |

---

## 4. Functional Requirements

### 4.1 Sensus Management
- CRUD data keluarga (`families`) dan anggota individu (`sensus`), relasi via `family_id`/`family_name`.
- Bulk import via Excel (`xlsx`).
- **Otomatisasi Level Dewasa:** Ketika `marriage_status` diubah/diset ke `'Menikah'` di form tambah/edit anggota, field `level` (education) otomatis diset ke `'Dewasa'`.
- **Swapping Kolom Adaptif per Role:** Pada daftar anggota (`MemberList.tsx`), untuk role Pengurus Muda/i (status 4 & 5), kolom `Status Nikah` dan `No` disembunyikan dan digantikan oleh `Status Pekerjaan` (`occupation_status`) & `Sambung Ngaji` (`sambung_ngaji_status`).
- **Rollback** untuk bulk import (revert batch import terakhir) — mekanisme belum terkonfirmasi, lihat §8.
- Filter/list data sesuai scope role & kelompok.

### 4.2 Role-Based Access Control
- Login/auth via Firebase Authentication + collection `users` (field `status`, `kelompok`, `isActive`).
- Registrasi self-service dengan approval admin sebelum aktif.
- UI & Firestore rules filtering menyesuaikan role — lihat catatan mismatch di §2.

### 4.3 Orders & Finance (Iuran)
- CRUD kategori order (`category_orders`) — tampil sebagai `name + year` di dropdown, mis. "Iuran Tahunan 2025".
- CRUD transaksi order (`orders`) — field `is_payment`, `actual_price`, `money_holder`, `payment_method`.

### 4.4 Presensi Muda/i (Attendance)

Fitur presensi anggota Muda/i yang diakses oleh status 0, 1, 4, dan 5. Tersedia 2 mode utama dalam satu halaman (`/attendance`):

#### 4.4.1 Mode Input Sesi Harian

- **Pilih Tanggal Sesi:** Custom date picker menampilkan format Indonesia lengkap: `"Senin, 22 Juli 2026"`. Tanggal sesi bebas (tidak terbatas hari tertentu).
- **Filter (collapsible, auto-hidden saat halaman load):**
  - Kelompok (terkunci ke kelompok login untuk status 3 & 5).
  - Jenis Kelamin (Semua / Laki-Laki / Perempuan).
  - Jenjang / Level (Semua / Pra Remaja / Remaja / Pra Nikah — untuk status 4 & 5; atau full range untuk 0 & 1).
  - Badge indicator jumlah filter aktif pada tombol toggle.
- **Pencarian Jamaah:** Real-time search berdasarkan nama atau alias.
- **Daftar Anggota & Pengurutan:** Anggota aktif diurutkan berdasarkan kriteria pilihan (`Urutan No`, `Waktu Terakhir`, `Waktu Terawal`, `Nama A-Z`). Header tabel desktop dapat diklik langsung untuk mengurutkan.
- **Input Status Presensi & Jam (Timestamp):**
  - Tombol cepat: `H` (Hadir) · `I` (Izin) · `S` (Sakit) · `A` (Alfa).
  - **Pencatatan Jam (Timestamp):** Setiap kali status ditekan, jam absensi (`HH:mm`, contoh `"19:45"`) dicatat otomatis ke dalam `records[memberUuid].time` dan ditampilkan pada UI mobile (badge jam) & desktop (kolom Waktu).
  - Klik tombol yang sudah aktif → batalkan pilihan & bersihkan jam.
  - **Auto-save instan:** setiap klik tombol langsung menyimpan ke Firestore (`setDoc` dengan merge). Tidak ada tombol "Submit" manual.
- **Input Catatan / Alasan:**
  - Muncul otomatis hanya untuk status `I` (Izin) dan `S` (Sakit).
  - Auto-save dengan debounce 400ms setelah selesai mengetik.
  - Saat status berpindah ke `H`, `A`, atau dikosongkan, catatan **otomatis terhapus**.
- **Indikator Save Status:** Dot indicator realtime — `Menyimpan…` (biru, animasi pulse) / `Tersimpan` (hijau) / `Gagal` (merah).
- **Responsive UI:** Mobile = Card view tombol H/I/S/A touch-friendly dengan penataan header & badge jam yang bersih. Desktop = Table view dengan kolom Waktu.

#### 4.4.2 Mode Rekap Presensi & Aksi Melayang (Floating Action Buttons)

- **Pilih Rentang Tanggal:** Dari–Sampai (default bulan berjalan).
- **Filter (collapsible, auto-hidden):** Kelompok, Jenis Kelamin, Jenjang.
- **Pilih Sesi Pengajian yang Dihitung:**
  - Aplikasi mengambil semua sesi yang benar-benar tersimpan di Firestore pada rentang tersebut.
  - Ditampilkan sebagai chip yang dapat dicentang/dinonaktifkan (format: `dddd, DD MMM YYYY`).
  - Tombol "Pilih Semua" / "Batal Semua". Total sesi = jumlah chip aktif.
- **Ringkasan Gabungan Semua Jenjang:**
  - Donut Chart (CSS `conic-gradient`) 3 warna: 🟢 Hadir / 🟡 Izin & Sakit (I+S) / 🔴 Alfa.
  - Legenda + 3 Stat Card besar dengan jumlah presensi per kategori.
  - Responsive breakpoint `sm:flex-row` pada laptop/desktop agar Donut Chart dan Legenda berdampingan secara horizontal.
  - Kalkulasi: `pct = (total_count / (total_members × total_sessions)) × 100`.
- **Persentase Per Jenjang:**
  - Card per level masing-masing berisi mini Donut Chart, multi-segment progress bar, 3 stat card mini.
- **Detail Per Anggota:** Tabel H/I/S/A + Total Sesi + % Kehadiran. Kartu mobile dilengkapi mini multi-bar progress bar per jamaah. Badge warna ≥80%=hijau, 50–79%=amber, <50%=merah.
- **Floating Action Buttons (FAB):** Tombol **Excel** dan **WhatsApp Share** tampil melayang (*always-on-top*) di pojok kanan bawah layar (`fixed bottom-6 right-6`), mudah diakses di mode Input maupun Rekap.
- **Format Excel Multi-Sheet Terstruktur:**
  - **Absensi Sesi (Input):** Memiliki pengaturan lebar kolom otomatis (`ws['!cols']`), format status jelas (`Hadir (H)`, `Izin (I)`, dst.), dan kolom Waktu Absen.
  - **Rekap Presensi:** Menghasilkan 2 sheet tab dalam 1 workbook — **Sheet 1 (`Rekap Jamaah`)** untuk statistik detail tiap jamaah (tipe angka murni), dan **Sheet 2 (`Ringkasan Jenjang`)** untuk statistik ringkasan per jenjang & gabungan.

### 4.5 Analytics
- Agregasi data sensus dari Firestore, di-cache di Zustand (TTL 10 menit) — bukan real-time murni, lihat §6.

### 4.6 Audit Trail
- Log CREATE/UPDATE/DELETE/IMPORT/EXPORT per aksi pengurus, immutable (append-only di rule level).
- Hanya bisa dilihat oleh status 0 & 1.

### 4.7 Export & Reporting
- Export data ke PDF (`react-to-pdf`), gambar (`html-to-image`), dan file (`file-saver`).

### 4.8 Auth & UI
- Split-layout auth page, tema biru konsisten, PWA-installable.

---

## 5. Data Model (Firestore Collections)

### `sensus` — Anggota
`uuid, name, alias, gender, age, date_of_birth, marriage_status, level, kelompok, family_name, family_id ⚠️, is_active, is_educate, is_duafa, created_at, order(number)`
`level`: Pra Remaja / Remaja / Pra Nikah / Dewasa / Lansia → dipetakan ke kategori absensi Muda/i vs Bapak-Bapak/Ibu-Ibu.

> ⚠️ **Bug tipe data `family_id` (confirmed):** dideklarasikan `number` di `Member.ts`, tapi runtime (`MemberCreate`/`MemberEdit`/`MemberList`) menyimpan Firestore doc-id `families.id` (`string`). `TableTotalSensus` sampai perlu `String(m.family_id)` buat nutupin ini. **Join ke `families` di seluruh kode selalu lewat `family_name`, bukan `family_id`** — jadi field ini saat ini nganggur/tidak reliable sebagai FK. **Fix:** ubah tipe di `Member.ts` jadi `string` (atau `string | number` sementara buat backward-compat data lama), atau sekalian deprecate field ini kalau `family_name` sudah cukup sebagai join key — tapi perlu cek dulu apakah ada `family_name` yang tidak unique (dua keluarga beda kelompok pakai nama sama), karena itu bisa jadi alasan `family_id` awalnya dibuat.

### `families` — Keluarga
`id, name(UPPERCASE), kelompok`

### `users` — Akun Pengurus
`uid(=doc id), email, status(0–5), kelompok, isActive, createdAt`

### `category_orders` — Kategori Iuran
`id, name, price(number), year(number)`

### `orders` — Transaksi Iuran
`id, user_name, user_id(FK sensus.uuid), id_category_order(FK category_orders.id), name_category(denormalized), total_order, unit_price, note, is_payment, actual_price, money_holder, payment_method, created_at`

### `attendance_sessions` — Sesi Presensi Muda/i *(BARU v1.2)*

**Doc ID = `{YYYY-MM-DD}__{kelompok-slug}`** (contoh: `2026-07-22__kelompok-ar-rasyid`).

```
{
  date: string           // "YYYY-MM-DD"
  kelompok: string       // nama kelompok (tampilan)
  day_label: string      // nama hari, mis. "Senin"
  records: {
    [memberUuid: string]: {
      status: 'H' | 'I' | 'S' | 'A'
      time?: string      // format "HH:mm" jam absensi diinput/diperbarui
      note?: string      // hanya untuk I & S, otomatis terhapus jika status pindah ke H/A
    }
  }
  created_at: Timestamp
  created_by: string     // uid pengurus
  updated_at: Timestamp
  updated_by: string     // uid pengurus
}
```

> **Logika Anggota Tidak Terekam:** Jika `records[memberUuid]` tidak ada → dihitung sebagai **Alfa (A)** dalam kalkulasi rekap.

### `audit_logs` — Audit Trail (append-only)
`id, action(CREATE/UPDATE/DELETE/IMPORT/EXPORT), entity(MEMBER/FAMILY/ORDER/SYSTEM), entity_id, entity_name, actor_uid(FK users.uid), actor_email, actor_status, timestamp, changes(JSON string), details`

### Relasi
```
sensus ──(family_name/family_id)── families
sensus ──(uuid → records key)── attendance_sessions
sensus ──(uuid → user_id)── orders ──(id_category_order)── category_orders
users ──(uid → actor_uid)── audit_logs
users ──(uid → created_by/updated_by)── attendance_sessions
```

> `family_name` adalah field join yang aktif dipakai di seluruh kode (bukan `family_id`) — lihat catatan bug di §5 `sensus`.

---

## 6. Non-Functional Requirements

- **Security:** Firestore Security Rules v2 diterapkan, role via lookup `users/{uid}` (bukan custom claims) — 1 extra read per rule check, tapi role berubah real-time tanpa re-issue token. Default-deny untuk collection tak terdaftar. Ada 2 mismatch matrix-vs-rule yang perlu di-fix, lihat §2.
- **"Real-time" analytics — klaim perlu diluruskan:** README menyebut "Real-Time Analytics", tapi semua Zustand store pakai cache TTL 10 menit. Jadi data yang ditampilkan bisa stale sampai 10 menit, bukan real-time (no `onSnapshot` listener). Kalau ini disengaja (trade-off cost read Firestore vs freshness), update istilah di README/PRD jadi "near real-time" biar ekspektasi user/stakeholder sesuai.
- **Env config:** Firebase config di `.env`, aman untuk expose ke frontend, tapi `.env` tidak boleh di-commit.
- **Performance:** cache TTL 10 menit di semua store mengurangi read cost — bagus. Tapi `getUserData()` di rule dieksekusi tiap request (create/update/delete) → extra read per mutation, monitor kalau volume tinggi.
- **PWA/Offline:** `vite-plugin-pwa` terpasang — perlu didefinisikan behavior offline (apakah cuma installable/cache-first assets, atau ada offline-write queue ke Firestore?).
- **Responsiveness:** UI harus responsive.

---

## 7. Out of Scope (saat ini)

- Native mobile app companion.
- Payment gateway integration otomatis (`payment_method`/`is_payment` di-update manual).
- Notifikasi push/email otomatis (yang ada baru toast in-app via React Hot Toast).

*(Update section ini kalau ada keputusan eksplisit dari product owner.)*

---

## 8. Open Questions & Risiko

**Resolved:**
- [x] ~~Firestore Security Rules~~ — sudah diterapkan v2, termasuk aturan `attendance_sessions`.
- [x] ~~Label role status 2/3/4/5~~ — sudah jelas, lihat §2.
- [x] ~~Skema `attendance_logs`~~ — diganti dengan `attendance_sessions` (doc komposit per sesi per kelompok), lihat §5.
- [x] ~~`audit_logs` aktif dipakai?~~ — ya, field lengkap dengan action/entity/actor, lihat §5.
- [x] ~~FK join `family_id` vs `family_name`~~ — confirmed: `family_name` yang dipakai, `family_id` type-mismatch (number vs string) dan tidak reliable. Lihat §5.
- [x] ~~Jadwal Pengajian Senin/Kamis~~ — tidak hardcoded; sesi bebas tiap tanggal kapan pun.
- [x] ~~Fitur Presensi Muda/i~~ — sudah live, lihat §4.4.
- [x] ~~Rekap Kehadiran~~ — sudah live dengan Donut Chart 3 kategori (Hadir / Izin & Sakit / Alfa) gabungan + per jenjang + per anggota.

**Masih terbuka:**
- [ ] **[HIGH]** Fix mismatch permission `families` (status 2 & 4 punya akses lebih luas di rule vs matrix) — lihat §2.
- [ ] **[HIGH]** Fix mismatch permission `category_orders` (status 3 & 5 di-block write oleh rule tapi matrix bilang ✅) — lihat §2.
- [ ] **[MED]** Fix tipe `family_id` di `Member.ts` (`number` → `string`) atau deprecate field-nya — lihat §5. Cek dulu uniqueness `family_name` sebelum decide.
- [ ] Rollback bulk import — transactional per-batch atau soft-delete dengan flag?
- [ ] "Real-time" di README — apakah perlu diganti jadi "near real-time (cache 10 menit)"?
- [ ] PWA offline behavior — cache-only assets atau ada offline-write queue?
- [ ] Presensi level lain (Bapak-Bapak, Ibu-Ibu) — apakah akan dikembangkan?
- [ ] Rencana skala: estimasi jumlah keluarga/anggota 1–2 tahun ke depan.

---

## 9. Changelog

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | — | Baseline PRD awal |
| 1.1 | — | Tambah Firestore rules v2, skema data lengkap, access-matrix, open questions |
| 1.2 | 22 Jul 2026 | §4.4 Presensi Muda/i lengkap (Input Sesi + Rekap + Donut Chart 3 kategori); skema `attendance_sessions`; access matrix + baris Presensi; tech stack: conic-gradient + Day.js locale id; resolved items §8 |
| 1.3 | 22 Jul 2026 | Form sensus auto-level Dewasa pada status Menikah; Swapping kolom adaptif di sensus list untuk Pengurus Muda/i (`occupation_status` & `sambung_ngaji_status`); Pencatatan jam absensi (`time`); Fitur sorting presensi; Responsive layout & Donut Chart fix (`sm:flex-row`); Floating Action Buttons (Excel & WA); Format Excel 2-Sheet terstruktur dengan auto column width. |

---

## 10. Next Steps (template untuk fitur baru)

Setiap fitur baru mengikuti format ini sebelum development:

```
## Feature: <nama fitur>
- Problem:
- User story:
- Acceptance criteria:
- Data model impact (collection baru/field baru):
- Role/permission impact:
- Out of scope:
```
