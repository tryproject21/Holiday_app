Buatkan kerangka aplikasi web/aplikasi seluler (Single Page Application) untuk perencanaan liburan komprehensif. Aplikasi ini berfungsi sebagai pusat kontrol untuk jadwal kegiatan (itinerary) dan pemantauan keuangan (budgeting). Aplikasi harus memiliki antarmuka yang modern, bersih, responsif, dan ramah pengguna (mobile-first design).
Fitur Utama yang Harus Dibangun:
 * Dashboard Visual Budgeting:
   * Halaman utama harus menampilkan ringkasan anggaran.
   * Gunakan komponen visual seperti progress bar atau pie chart yang menunjukkan persentase budget awal vs. pengeluaran aktual (real-time).
   * Kategorikan pengeluaran (misalnya: Transportasi, Akomodasi, Konsumsi, Tiket Wisata).
 * Manajemen Itinerary (Jadwal Kegiatan):
   * Tabel atau timeline view untuk memasukkan tanggal, jam, dan deskripsi kegiatan.
   * Integrasi Tautan Peta: Sediakan kolom khusus untuk memasukkan URL Google Maps. Saat URL tersebut diklik oleh pengguna, arahkan langsung ke tab baru atau aplikasi peta.
 * Pencatatan Pemasukan & Pengeluaran (Ledger):
   * Formulir input untuk mencatat setiap transaksi (nominal, kategori, tanggal).
   * Sistem otomatis menghitung sisa saldo dari total anggaran yang sudah ditetapkan di awal.
 * Sistem Split Bill (Pembagian Biaya):
   * Fitur untuk membagi tagihan di dalam grup.
   * Misalnya, saat pengguna menginput biaya makan siang, berikan opsi untuk membaginya secara rata atau kustom kepada anggota grup (contoh implementasi di UI: membagi tagihan antara Raihan, Juan, Arman, dan Rizki).
   * Tampilkan ringkasan "Siapa berhutang kepada siapa dan berapa jumlahnya".
 * Checklist Persiapan (To-Do List):
   * Modul sederhana untuk membuat daftar barang bawaan (packing list) atau dokumen.
   * Gunakan fitur checkbox yang bisa dicentang dan dicoret (strikethrough) saat selesai.
 * Akses Kolaboratif (Multi-User Workspace):
   * Sistem ruang kerja (workspace) berbasis tautan undangan (invite link) atau room code.
   * Misalnya, pengguna dan pacarnya dapat masuk ke workspace liburan yang sama dari perangkat masing-masing, dan keduanya memiliki hak akses untuk mengedit jadwal atau menambahkan pengeluaran secara real-time.
 * Ekspor Data (Export to Spreadsheet):
   * Sediakan tombol "Export to CSV" pada halaman budgeting.
   * Data harus diunduh dalam format terstruktur (kolom: Tanggal, Kategori, Item, Pembayar, Nominal) yang kompatibel dan rapi saat diimpor ke Google Sheets atau Excel untuk pemrosesan data lebih lanjut.
Kebutuhan Teknis UI/UX:
 * Gunakan kombinasi warna yang menyegarkan khas tema liburan (misalnya, biru laut dan putih, atau warna pastel).
 * Gunakan card layout untuk memisahkan modul-modul di atas agar tidak terlihat menumpuk di satu layar.
 * Interaksi yang mulus saat menambahkan data (gunakan modal atau drawer untuk form input, bukan memuat ulang halaman).