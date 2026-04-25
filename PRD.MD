
# PRD: UniverseAI Tools - Session Sharing & UI Overhaul

## 1. Ringkasan Proyek
**UniverseAI Tools** adalah ekstensi Chrome yang memungkinkan tim untuk mengakses akun premium tanpa mengetahui kredensial (email/password). Sistem ini menggunakan sinkronisasi cookie melalui database cloud (Neon) dan API (Vercel), serta melakukan modifikasi UI pada website target untuk membatasi akses fitur sensitif.

## 2. Arsitektur Teknis
* **Frontend:** Chrome Extension (Manifest V3, React/Tailwind untuk UI).
* **Backend:** Vercel Serverless Functions (Next.js atau Node.js).
* **Database:** Neon Postgres (dengan Drizzle ORM).
* **Security:** AES-256 Encryption, JWT Auth, Code Obfuscation.

---

## 3. Fitur Utama & UI/UX

### A. Floating Top Bar (Desktop Optimized)
* **Desain:** Bar mengambang di bagian paling atas browser (`z-index: 2147483647`).
* **Visual:** Glassmorphism effect, semi-transparent, minimalis.
* **Struktur Menu:**
    * **Menu Utama (e.g., Tools):** Dropdown berisi daftar website yang tersedia.
    * **Sub-Menu (e.g., Akun 1, Akun 2):** Untuk memilih profil akun yang berbeda.
    * **Status Connection:** Indikator hijau jika sesi aktif.
    * **Refresh Session Button:** Menarik ulang cookie dari database jika terjadi error.

### B. Admin Backend (Vercel)
* **Dashboard Sederhana:** Halaman login khusus admin (kamu).
* **Cookie Manager:** Textarea untuk mem-paste JSON hasil export dari "Cookie Editor".
* **Site Manager:** Menambah/menghapus domain website yang ingin dikontrol.
* **User Access:** Fitur untuk mengaktifkan/menonaktifkan akses tim secara remote.

---

## 4. Skema Database (Neon)
Tabel utama yang dibutuhkan:
```sql
TABLE shared_sessions (
    id SERIAL PRIMARY KEY,
    site_name VARCHAR(255),
    domain VARCHAR(255),
    encrypted_cookies TEXT, -- Data JSON yang dienkripsi
    ui_config JSONB,        -- Selector CSS yang harus disembunyikan
    updated_at TIMESTAMP
);
```

---

## 5. Keamanan & Anti-Tamper (F12 Defense)
Ini adalah bagian paling krusial untuk mencegah tim "mencuri" cookie secara manual.

### A. Proteksi Data di Database
* **AES-256 Encryption:** Jangan simpan cookie dalam teks biasa di Neon. Gunakan `process.env.ENCRYPTION_KEY` di Vercel untuk mengenkripsi data sebelum dikirim ke ekstensi.
* **Short-lived Access:** Ekstensi hanya menyimpan cookie di memory browser, bukan di `localStorage`.

### B. Proteksi Runtime (Mencegah F12/Inspect Element)
Untuk mempersulit tim yang ingin nakal dan mencoba mengambil cookie via Console:
1.  **DevTools Detection:** Tambahkan skrip yang mendeteksi jika jendela Inspect Element dibuka. Jika terbuka, skrip akan otomatis melakukan `window.location.reload()` atau menghapus cookie secara instan dari sesi tersebut.
2.  **Debug Loop (Anti-Debugger):** Menggunakan `debugger;` statement yang berjalan terus-menerus dalam loop saat DevTools terbuka, sehingga browser mereka akan "hang" atau lambat jika mencoba menginspeksi kode.
3.  **Right-Click & Shortcut Disable:** Mematikan fungsi klik kanan dan shortcut `Ctrl+Shift+I` atau `F12` khusus di domain website target.
4.  **Shadow DOM:** Gunakan Shadow DOM untuk menyuntikkan Floating Bar agar CSS website asli tidak merusak desain ekstensi dan lebih sulit dimanipulasi dari console biasa.

---

## 6. Daftar Tugas untuk AI Agent (Prompt Instruksi)

Salin perintah ini untuk AI Agent kamu:

> **Prompt:** "Buatlah ekstensi Chrome bernama 'UniverseAI Tools' dengan Manifest V3. Ekstensi ini harus memiliki Floating UI di bagian atas browser menggunakan Tailwind CSS. Hubungkan ekstensi ini ke backend Vercel yang menggunakan database Neon + Drizzle ORM.
> 
> **Fitur Utama:**
> 1. Ambil data cookie terenkripsi dari API Vercel `/api/get-session`.
> 2. Dekripsi cookie di dalam ekstensi dan suntikkan ke browser menggunakan `chrome.cookies.set`.
> 3. Implementasikan Content Script untuk menyembunyikan elemen UI website tertentu berdasarkan selector CSS dari database.
> 4. **Keamanan:** Tambahkan proteksi anti-DevTools (F12) dan obfuscation pada kode JavaScript.
> 5. Buat API admin di `/api/update-session` yang dilindungi API Key untuk memperbarui cookie di Neon.
> 
> Gunakan desain yang profesional dan bersih untuk tim saya di desktop."

---

