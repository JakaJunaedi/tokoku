# Changelog & Catatan Aktivitas Tokoku

Dokumen ini memuat seluruh catatan riwayat komit, perubahan skema database, pembaruan antarmuka, penanganan insiden teknis, serta aktivitas penting lainnya dalam pengembangan proyek Tokoku. Dokumen ini wajib selalu diperbarui setiap kali terjadi aktivitas pengembangan atau perubahan sistem.

---

## Format Pencatatan

Setiap catatan perubahan disajikan dengan struktur:
- **Tanggal**: Waktu pencatatan atau eksekusi perubahan.
- **Judul**: Ringkasan aktivitas atau perubahan.
- **Deskripsi**: Penjelasan detail mengenai latar belakang, dampak perubahan, dan hasil implementasi (tanpa menyertakan potongan kode).

---

## Riwayat Perubahan & Aktivitas

### 14 November 2026, 20:38 WIB
**Judul: Penghapusan Menyeluruh Tabel Kategori dan Relasinya pada Branch feature/category**
- **Kategori**: Skema Database, Backend, Frontend, Dokumentasi
- **Deskripsi**: Menindaklanjuti keputusan untuk tidak lagi menggunakan entitas kategori, dilakukan penghapusan tabel kategori dan relasinya secara penuh pada branch feature/category. Kolom relasi kategori pada produk beserta foreign key dan index penunjang dihapus dari skema database menggunakan migrasi EF Core dan langsung diterapkan ke database PostgreSQL. Di layer backend, seluruh endpoint API kategori, interface service, implementasi service, dan pendaftaran dependensi service dihapus, serta logika produk disesuaikan agar mandiri tanpa kategori. Di layer frontend, tab navigasi kategori, form manajemen kategori, dropdown pilihan kategori pada form produk, serta kolom kategori pada tabel data produk dibersihkan. Seluruh unit testing frontend dan proses kompilasi backend maupun frontend terverifikasi berhasil dengan baik. Dokumentasi panduan API produk dan migrasi database disinkronkan dengan kondisi skema terbaru.

### 14 November 2026, 20:32 WIB
**Judul: Penanganan Insiden File Terkunci (File Lock) saat Build Backend**
- **Kategori**: Insiden Teknis & Pemecahan Masalah
- **Deskripsi**: Saat menjalankan proses kompilasi backend untuk mempersiapkan migrasi EF Core, proses kompilasi sempat mengalami hambatan akibat berkas DLL backend sedang dikunci oleh proses aplikasi backend yang berjalan di latar belakang. Dilakukan pelacakan identifier proses pada port lokal, identifikasi proses aplikasi yang menahan berkas, dan penghentian proses tersebut secara aman. Setelah penghentian proses, berkas kembali dapat diakses sepenuhnya dan proses kompilasi berhasil tanpa hambatan.

### 14 November 2026, 20:27 WIB
**Judul: Pembuatan Branch Baru feature/category**
- **Kategori**: Manajemen Repositori Git
- **Deskripsi**: Dibuat branch baru bernama feature/category yang dicabangkan dari branch utama. Branch ini didedikasikan secara khusus untuk menangani penyesuaian struktural dan perubahan skema terkait entitas kategori.

### 14 November 2026, 20:25 WIB
**Judul: Konfigurasi Git Remote Origin dan Pengunggahan Branch Utama ke GitHub**
- **Kategori**: Manajemen Repositori Git
- **Deskripsi**: Melakukan penyesuaian nama branch default menjadi main, menambahkan remote repository origin yang mengarah ke repositori GitHub pribadi, dan melakukan proses push pertama kali ke remote dengan konfigurasi tracking branch aktif.

### 14 November 2026, 20:19 WIB
**Judul: Penghapusan Kolom Diskon Produk via Migrasi EF Core dan Pembersihan UI**
- **Kategori**: Komit & Skema Database (Commit: 4600c02)
- **Deskripsi**: Menghapus kolom diskon pada tabel produk karena sudah tidak dibutuhkan dalam spesifikasi bisnis. Perubahan skema dilakukan secara resmi melalui pembuatan migrasi EF Core dan dieksekusi langsung ke PostgreSQL. Di sisi backend, seluruh validasi diskon tidak boleh bernilai negatif dan pencatatan logger yang memuat diskon dihapus dari controller dan service. Di sisi frontend, kolom diskon pada tabel, badge diskon, serta field input diskon pada modal tambah dan edit produk dibersihkan. Dokumentasi migrasi dan dokumentasi pembuatan API produk diperbarui untuk mencerminkan skema baru tanpa diskon.

### 14 November 2026, 05:12 WIB
**Judul: Implementasi Fitur Kategori, Relasi Produk, dan Tab UI Kategori**
- **Kategori**: Komit & Fitur Baru (Commit: 63e9622)
- **Deskripsi**: Menambahkan tabel kategori baru di database dengan atribut nama, deskripsi, dan tanggal pembuatan, serta menambahkan relasi foreign key pada tabel produk. Mengembangkan API CRUD lengkap untuk kategori di backend beserta eager loading relasi pada endpoint produk. Di sisi frontend, menambahkan tab navigasi khusus untuk mengelola kategori, form modal tambah dan edit kategori, modal konfirmasi hapus kategori, filter pencarian kategori, serta kartu ringkasan statistik kategori. Menambahkan dokumentasi teknis terkait relasi entitas dan endpoint kategori.

### 14 November 2026, 04:48 WIB
**Judul: Penambahan Kolom Diskon pada Entitas Produk**
- **Kategori**: Komit & Fitur Baru (Commit: e351465)
- **Deskripsi**: Menambahkan kolom diskon bertipe numerik dengan nilai bawaan nol pada tabel produk melalui migrasi EF Core. Menambahkan validasi nilai diskon tidak boleh negatif dan tidak boleh melampaui harga satuan produk pada backend dan frontend. Menampilkan badge potongan harga pada tabel produk di frontend serta menyediakan input diskon pada form modal produk. Dokumentasi migrasi diperbarui dengan catatan DDL dan verifikasi tabel PostgreSQL.

### 14 November 2026, 04:35 WIB
**Judul: Penambahan Kolom Stok pada Entitas Produk**
- **Kategori**: Komit & Fitur Baru (Commit: 980bf5d)
- **Deskripsi**: Menambahkan kolom stok produk bertipe integer dengan nilai bawaan nol pada database melalui migrasi EF Core. Menambahkan validasi nilai stok tidak boleh negatif di controller backend dan validasi formulir frontend. Menampilkan indikator stok dan badge status stok habis pada tabel frontend, serta memperbarui dokumentasi skema database.

### 14 November 2026, 04:23 WIB
**Judul: Pembangunan Arsitektur Controller-Service CRUD Produk dan Logging Serilog**
- **Kategori**: Komit & Fitur Baru (Commit: 93ec7e7)
- **Deskripsi**: Mengimplementasikan arsitektur layered pattern berbasis controller dan service untuk operasi CRUD produk pada backend ASP.NET Core. Mengintegrasikan pustaka Serilog untuk pencatatan log terstruktur ke konsol dan file harian dengan rotasi berkas otomatis. Mengembangkan antarmuka pengguna berbasis Angular dengan komponen modern berupa kartu statistik inventaris, tabel interaktif, modal formulir dinamis, modal konfirmasi penghapusan, dan notifikasi toast. Menyusun dokumen panduan pola pengembangan API produk.

### 14 November 2026, 03:27 WIB
**Judul: Inisialisasi Solusi Proyek Tokoku, Frontend Angular, dan Git Hooks**
- **Kategori**: Komit & Inisialisasi Proyek (Commit: 89dbbc0)
- **Deskripsi**: Inisialisasi awal repositori solusi Tokoku yang memisahkan tanggung jawab ke dalam beberapa layer proyek: ServiceTokoku sebagai API entrypoint, DatabaseTokoku untuk DbContext EF Core, ModelTokoku untuk domain entitas, dan MigrationTokoku khusus penyimpanan berkas migrasi database. Menyiapkan aplikasi klien FrontendTokoku menggunakan Angular versi 21 dengan konfigurasi standalone component. Mengonfigurasi Git hooks menggunakan Husky untuk menjalankan pengecekan otomatis sebelum komit dibuat.
