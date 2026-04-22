# Chatbot Konsultan Pajak by Jefri

Aplikasi Chatbot Konsultan Pajak berbasis Web yang menggunakan model AI (DeepSeek) via AgentRouter.

## Persiapan Lokal (Local Setup)

1. Pastikan Anda sudah menginstal [Node.js](https://nodejs.org/).
2. Buka terminal di folder ini.
3. Instal dependencies:
   ```bash
   npm install
   ```
4. Jalankan aplikasi:
   ```bash
   npm run dev
   ```
5. Buka `http://localhost:5173` di browser Anda.

## Cara Mengakses Online (Deployment)

Untuk membuat aplikasi ini dapat diakses secara online oleh siapa saja, Anda bisa menggunakan platform **Vercel** atau **Netlify** (Gratis).

### Opsi 1: Menggunakan Vercel (Paling Mudah)

1. Buat akun di [Vercel](https://vercel.com/).
2. Hubungkan akun GitHub Anda.
3. Upload (Push) folder ini ke repository GitHub baru.
4. Di Dashboard Vercel, pilih **"New Project"** dan pilih repo GitHub Anda.
5. Pada bagian **Environment Variables**, masukkan:
   - Name: `VITE_AGENTROUTER_API_KEY`
   - Value: `Kunci_API_Anda_Disini` (Jika ingin mengganti yang default).
6. Klik **Deploy**.

### Opsi 2: Build Manual (Untuk Hosting Sendiri)

1. Jalankan perintah build:
   ```bash
   npm run build
   ```
2. Folder `dist` akan muncul. Isi dari folder `dist` tersebut adalah file web statis yang bisa Anda upload ke hosting mana pun (cPanel, Firebase Hosting, GitHub Pages, dll).

## Konfigurasi API
Aplikasi ini menggunakan API Key AgentRouter. Jika API Key default tidak berfungsi, silakan ganti di file `.env` atau pada pengaturan Environment Variables di platform hosting Anda.
