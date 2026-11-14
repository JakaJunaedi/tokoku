# Panduan: Arsitektur & Spesifikasi Microservice Auth (ServiceAuthTokoku)

Dokumen ini menjelaskan arsitektur layanan autentikasi mandiri (**ServiceAuthTokoku**), konfigurasi basis data terpisah `tokoku_user_db`, pengamanan kata sandi menggunakan hash BCrypt, serta mekanisme token JWT.

---

## 1. Arsitektur Solusi Terpisah

Layanan autentikasi diorganisir ke dalam layer proyek mandiri:

- **`Model.AuthTokoku`**: Menyimpan entitas `User`, `PasswordResetToken`, dan seluruh DTO (Register, Login, Reset Password, SuperAdmin, AuthResponse).
- **`Database.AuthTokoku`**: Memuat konfigurasi EF Core `TokokuUserDbContext` yang terhubung ke database `tokoku_user_db`.
- **`Migration.AuthTokoku`**: Assembly penyimpanan berkas migrasi EF Core khusus database `tokoku_user_db`.
- **`ServiceAuthTokoku`**: Proyek Web API mandiri yang melayani endpoint autentikasi pada port `5251`.

---

## 2. Spesifikasi Database (`tokoku_user_db`)

### 2.1 Tabel `Users`
- `Id`: Integer, Primary Key, Identity.
- `FullName`: Character varying (150), wajib diisi.
- `Email`: Character varying (150), unik, wajib diisi.
- `PasswordHash`: Text, hash BCrypt.
- `Role`: Character varying (50), nilai bawaan `'User'` (pilihan: `'User'`, `'Admin'`, `'SuperAdmin'`).
- `IsActive`: Boolean, nilai bawaan `true`.
- `CreatedAt`: Timestamp with time zone, default `CURRENT_TIMESTAMP`.
- `UpdatedAt`: Timestamp with time zone, dapat bernilai null.

### 2.2 Tabel `PasswordResetTokens`
- `Id`: Integer, Primary Key, Identity.
- `UserId`: Integer, Foreign Key ke `Users(Id)` dengan `ON DELETE CASCADE`.
- `Token`: Character varying (256), unik, token kriptografi acak 64 karakter hex.
- `Expiry`: Timestamp with time zone (masa berlaku 2 jam).
- `IsUsed`: Boolean, default `false`.
- `CreatedAt`: Timestamp with time zone, default `CURRENT_TIMESTAMP`.

---

## 3. Fitur & Endpoint API

Base URL: `http://localhost:5251`

### 3.1 Registrasi Pengguna
- **Method & URL**: `POST /api/auth/register`
- **Payload**:
  - `fullName`: Nama lengkap pengguna
  - `email`: Alamat email unik
  - `password`: Kata sandi (minimal 6 karakter)
- **Respons**: Token JWT dan profil pengguna (Role default: `User`).

### 3.2 Login
- **Method & URL**: `POST /api/auth/login`
- **Payload**:
  - `email`: Alamat email terdaftar
  - `password`: Kata sandi
- **Respons**: Token JWT bertanda tangan HMAC-SHA256 yang memuat klaim subjek, email, nama, dan peran (`Role`).

### 3.3 Permintaan Reset Password
- **Method & URL**: `POST /api/auth/forgot-password`
- **Payload**:
  - `email`: Alamat email terdaftar
- **Respons**: Pesan konfirmasi dan token reset password yang aman.

### 3.4 Konfirmasi Reset Password
- **Method & URL**: `POST /api/auth/reset-password`
- **Payload**:
  - `email`: Alamat email
  - `token`: Token reset yang valid
  - `newPassword`: Kata sandi baru (minimal 6 karakter)
- **Respons**: Konfirmasi keberhasilan perubahan password.

### 3.5 Pembuatan Akun Superadmin
- **Method & URL**: `POST /api/auth/superadmin`
- **Otorisasi**: Memerlukan header `Authorization: Bearer <token_superadmin>` ATAU field `masterKey` yang sesuai dengan konfigurasi server.
- **Payload**:
  - `fullName`: Nama lengkap superadmin
  - `email`: Alamat email
  - `password`: Kata sandi
  - `masterKey`: Kunci otorisasi master (opsional jika request sudah berstatus SuperAdmin)
- **Respons**: Detail akun SuperAdmin baru.

### 3.6 Profil Pengguna Saat Ini
- **Method & URL**: `GET /api/auth/me`
- **Otorisasi**: Wajib menyertakan header `Authorization: Bearer <token>`.
- **Respons**: Objek profil pengguna aktif yang diekstrak dari klaim token.

---

## 4. Mekanisme Keamanan

1. **Hashing Kata Sandi**:
   - Menggunakan pustaka BCrypt dengan work factor 11.
   - Kata sandi mentah tidak pernah disimpan dalam database maupun dicatat di dalam log.

2. **JSON Web Token (JWT)**:
   - Ditandatangani menggunakan algoritma simetris `HmacSha256`.
   - Masa berlaku bawaan token adalah 1440 menit (24 jam).
   - Membawa klaim peran yang kompatibel dengan mekanisme otorisasi berbasis peran ASP.NET Core (`ClaimTypes.Role`).

3. **Seeding Superadmin Otomatis**:
   - Saat aplikasi pertama kali dimulai, sistem otomatis memeriksa ketersediaan akun dengan role `SuperAdmin`.
   - Jika belum ada, sistem menginisialisasi akun awal secara otomatis (`superadmin@tokoku.com` dengan password bawaan yang ter-hash).
