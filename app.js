const express = require('express');
const app = express();
const session = require('express-session');
const bodyParser = require('body-parser');
const port = 3000;
const conn = require("./configdb");
const nodemailer = require('nodemailer');
const req = require('express/lib/request');


const options = {
    dotfiles: 'ignore',
    etag: false,  
    extensions: ['htm', 'html'],  
    index: false,
    maxAge: '1d',
    redirect: false,
    setHeaders: function (res, path, stat) {
      res.set('x-timestamp', Date.now())
    }
}

// Pengaturan template engine
app.set('view engine', 'ejs');

// Middleware untuk parsing data yang dikirimkan melalui body
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Middleware untuk mengatur direktori tampilan statis
app.use(express.static('public'));

// Middleware untuk session
app.use(session({
    secret: 'sya131', // Ganti dengan kunci rahasia yang aman
    resave: false,
    saveUninitialized: true
}));

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'nfsyalza@gmail.com',
      pass: 'atmp lfce lugq yjew',
    },
});
  


// Rute Login
app.get('/', (req, res) => {
    console.log('Berada di Halaman Login');
    res.render('login', { title: 'Login Page' });
});

// Rute untuk memproses permintaan login
app.post('/', (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).send('Bad Request');
    }

    if (role === 'admin') {
        // Periksa data login di tabel admin

        const sql = 'SELECT * FROM admin WHERE username = ? AND password = ?';
        const values = [username, password];

        conn.query(sql, values, (err, results) => {
            if (err) {
                console.error(err);
                console.log("Terjadi Kesalahan Saat Login")
                res.status(500).send('Terjadi kesalahan saat login.');
            }
            if (results.length > 0) {
                req.session.role = 'admin'; // Simpan peran admin ke dalam sesi
                console.log("Berhasil masuk ke halaman dashboard")
                return res.redirect('/homeAdmin'); // Redirect ke halaman admin jika login berhasil
            } else {
                return res.status(401).send('Unauthorized');
            }
        });
    } else if (role === 'kasir') {
        // Periksa data login di tabel kasir
        conn.query('SELECT * FROM kasir WHERE username = ? AND password = ?', [username, password], (err, results) => {
            if (err) {
                console.error('Error executing query:', err);
                return res.status(500).send('Internal Server Error');
            }

            if (results.length > 0) {
                req.session.role = 'kasir'; // Simpan peran kasir ke dalam sesi
                req.session.username = username;
                return res.redirect('/penjualan'); // Redirect ke halaman kasir jika login berhasil
            } else {
                return res.status(401).send('Unauthorized');
            }
        });
    } else {
        return res.status(400).send('Bad Request');
    }
});

// Rute forgot password
app.get('/forgotpass', (req, res) => {
    console.log('Berada di Halaman Forgot Password');
    res.render('forgotPass', { title: 'Forgot Password Page' });
});

// Rute reset password
app.get('/resetpass', (req, res) => {
    console.log('Berada di Halaman Reset Password');
    res.render('resetPass', { title: 'Reset Password Page' });
});

// Rute untuk halaman admin
app.get('/homeAdmin', (req, res) => {
    if (req.session.role === 'admin') {
        console.log('Berhasil berada di halaman dashboard');
        res.render('homeAdmin', { title: 'Home Kasir Page' });
    } else {
        res.status(403).send('Forbidden');
    }
});

// Rute untuk halaman kasir
app.get('/homeKasir', (req, res) => {
    if (req.session.role === 'kasir') {
        console.log('Berhasil berada di halaman dashboard');
        res.render('homeKasir', { title: 'Home Kasir Page' });
    } else {
        res.status(403).send('Forbidden');
    }
});

//Rute halaman data barang
app.get('/barang', (req, res) => {
    if (req.session.role === 'admin') {
        const sql = 'SELECT kode_barang, nama_barang, harga, stok FROM barang';
        conn.query(sql, (err, results) => {
            if (err) {
                console.error('Error querying database:', err);
                res.status(500).send('Internal Server Error');
                return;
            }
        console.log('Berhasil berada di halaman data barang');
        res.render('barang', { title: 'Data Barang', barang: results, isAdmin: true });
    });
    // Jika bukan admin
    } else if (req.session.role === 'kasir') {
        const sql = 'SELECT kode_barang, nama_barang, harga, stok FROM barang';
            conn.query(sql, (err, results) => {
                if (err) {
                    console.error('Error querying database:', err);
                    res.status(500).send('Internal Server Error');
                    return;
                }
                console.log('Berhasil berada di halaman data barang');
                res.render('barang', { title: 'Data Barang Page', barang: results, isAdmin: false });
            });
    } else {
        res.redirect('/login');
    }
  });

// Rute untuk menambah data barang
app.post('/barang/add', (req, res) => {
    if (req.session.role === 'admin') {
        const { kode_barang, nama_barang, harga, stok } = req.body;

        // Pastikan semua data barang yang diperlukan tersedia
        if (!kode_barang || !nama_barang || !harga || !stok) {
            return res.status(400).send('Bad Request');
        }

        // Query untuk menambahkan data barang ke database
        const sql = 'INSERT INTO barang (kode_barang, nama_barang, harga, stok) VALUES (?, ?, ?, ?)';
        const values = [kode_barang, nama_barang, harga, stok];

        conn.query(sql, values, (err, results) => {
            if (err) {
                console.error('Error querying database:', err);
                res.status(500).send('Internal Server Error');
                return;
            }
            console.log('Data barang berhasil ditambahkan:', results);
            // Redirect kembali ke halaman data barang setelah menambahkan barang
            res.redirect('/barang');
        });
    } else {
        // Jika bukan admin
        res.status(403).send('Forbidden');
    }
});

// Rute untuk mengupdate data barang
app.post('/barang/update/:kode_barang', (req, res) => {
    if (req.session.role === 'admin') {
        const { nama_barang, harga, stok } = req.body;
        const kode_barang = req.params.kode_barang;

        // Pastikan semua data barang yang diperlukan tersedia
        if (!kode_barang || !nama_barang || !harga || !stok) {
            return res.status(400).send('Bad Request');
        }

        // Query untuk update data barang ke database
        const sql = 'UPDATE barang SET nama_barang = ?, harga = ?, stok = ? WHERE  kode_barang = ?';
        const values = [nama_barang, harga, stok, kode_barang];

        conn.query(sql, values, (err, results) => {
            if (err) {
                console.error('Error querying database:', err);
                res.status(500).send('Internal Server Error');
                return;
            }
            console.log('Data barang berhasil diupdate:', results);
            // Redirect kembali ke halaman data barang setelah menambahkan barang
            res.redirect('/barang');
        });
    } else {
        // Jika bukan admin
        res.status(403).send('Forbidden');
    }
});

//Rute untuk menghapus data barang
app.post('/barang/delete/:kode_barang', (req, res) => {
    if (req.session.role === 'admin') {
        const kode_barang = req.params.kode_barang;

        const sql = 'DELETE from barang WHERE kode_barang = ?';
        conn.query(sql, values, (err, results) => {
            if (err) {
                console.error('Error querying database:', err);
                res.status(500).send('Internal Server Error');
                return;
            }
            console.log('Data barang berhasil dihapus:', results);
            // Redirect kembali ke halaman data barang setelah menambahkan barang
            res.redirect('/barang');
        });
    } else {
        // Jika bukan admin
        res.status(403).send('Forbidden');
    }
});

app.get('/dataKasir', (req, res) => {
    if (req.session.role === 'admin') {
        const sql = 'SELECT username, nama_lengkap, telepon, alamat FROM kasir';
        conn.query(sql, (err, results) => {
            if (err) {
                console.error('Error querying database:', err);
                res.status(500).send('Internal Server Error');
                return;
            }
        console.log('Berhasil berada di halaman data kasir');
        res.render('dataKasir', { title: 'Data Kasir',  kasir: results });
    });
    } else {
        // Jika bukan admin
        res.status(403).send('Forbidden');
    }
  });

// Rute untuk menambah data kasir
app.post('/dataKasir/add', (req, res) => {
    if (req.session.role === 'admin') {
        const { username, nama_lengkap, telepon, alamat } = req.body;


        // Pastikan semua data kasir yang diperlukan tersedia
        if (!username || !nama_lengkap || !telepon || !alamat) {
            return res.status(400).send('Bad Request');
        }
        // Query untuk menambahkan data kasir ke database
        const sql = 'INSERT INTO kasir (username, nama_lengkap, telepon, alamat) VALUES (?, ?, ?, ?)';
        const values = [username, nama_lengkap, telepon, alamat];

        conn.query(sql, values, (err, results) => {
            if (err) {
                console.error('Error querying database:', err);
                res.status(500).send('Internal Server Error');
                return;
            }
            console.log('Data kasir berhasil ditambahkan:', results);
            // Redirect kembali ke halaman data kasir setelah menambahkan data
            res.redirect('/dataKasir');
        });
    } else {
        // Jika bukan admin
        res.status(403).send('Forbidden');
    }
});

// Rute untuk melakukan update kasir
app.post('/dataKasir/update/:username', (req, res) => {
    if (req.session.role === 'admin') {
        const username = req.params.username;
        const { nama_lengkap, telepon, alamat } = req.body;

        // Lakukan update data kasir ke dalam database
        const sql = 'UPDATE kasir SET nama_lengkap = ?, telepon = ?, alamat = ? WHERE username = ?';
        conn.query(sql, [nama_lengkap, telepon, alamat, username], (err, results) => {
            if (err) {
                console.error('Error querying database:', err);
                res.status(500).send('Internal Server Error');
                return;
            }
            // Jika pengguna dengan username yang diberikan tidak ditemukan
            if (results.affectedRows === 0) {
                res.status(404).send('Pengguna tidak ditemukan.');
                return;
            }
            // Redirect kembali ke halaman data kasir setelah data kasir berhasil diupdate
            res.redirect('/dataKasir');
        });
    } else {
        // Jika bukan admin
        res.status(403).send('Forbidden');
    }
});

//Rute untuk menghapus data barang
app.post('/dataKasir/delete/:username', (req, res) => {
    if (req.session.role === 'admin') {
        const username = req.params.username;

        const sql = 'DELETE from kasir WHERE username = ?';
        conn.query(sql, [username], (err, results) => {
            if (err) {
                console.error('Error querying database:', err);
                res.status(500).send('Internal Server Error');
                return;
            }
            console.log('Data barang berhasil dihapus:', results);
            // Redirect kembali ke halaman data kasir setelah menambahkan data kasir
            res.redirect('/dataKasir');
        });
    } else {
        // Jika bukan admin
        res.status(403).send('Forbidden');
    }
});

// Rute untuk menampilkan form reset password kasir
app.get('/dataKasir/reset-password/:username', (req, res) => {
    const username = req.params.username;
    const sql = 'SELECT * FROM kasir WHERE username = ?';
    conn.query(sql, [username], (err, results) => {
        if (err) {
            console.error('Error querying database:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        // Jika pengguna dengan username yang diberikan tidak ditemukan
        if (results.length === 0) {
            res.status(404).send('Pengguna tidak ditemukan.');
            return;
        }
        res.render('resetPassword', { title: 'Reset password page', user: results[0] });
    });
});

// Rute untuk menangani reset password kasir
app.post('/dataKasir/reset-password/:username', (req, res) => {
    const username = req.params.username;
    const newPassword = req.body.newPassword;

    // Lakukan update password ke dalam database
    const sql = 'UPDATE kasir SET password = ? WHERE username = ?';
    conn.query(sql, [newPassword, username], (err, result) => {
        if (err) {
            console.error('Error querying database:', err);
            res.status(500).send('Internal Server Error');
            return;
        }

        // Check if the password was successfully updated
        if (result.affectedRows > 0) {
            console.log(`Password for user ${username} reset successfully.`);
            // Mengalihkan kembali ke halaman data kasir
            res.redirect('/dataKasir');
        } else {
            console.log(`Failed to reset password for user ${username}. User not found.`);
            res.status(404).send('Pengguna tidak ditemukan.');
        }
    });
});

//Rute halaman laporan member
app.get('/lapMember', (req, res) => {
    if (req.session.role === 'admin') {
        const sql = 'SELECT kode_member, nama, telepon, alamat FROM member';
        conn.query(sql, (err, results) => {
            if (err) {
                console.error('Error querying database:', err);
                res.status(500).send('Internal Server Error');
                return;
            }
        console.log('Berhasil berada di halaman data member');
        res.render('lapMember', { title: 'Data Member',  member: results });
    });
    } else {
        // Jika bukan admin
        res.status(403).send('Forbidden');
    }
  });

//Rute halaman stok barang
app.get('/lapStok', (req, res) => {
    if (req.session.role === 'admin' || req.session.role === 'kasir') { 
        const sql = 'SELECT kode_barang, nama, stok FROM barang';
        conn.query(sql, (err, results) => {
            if (err) {
                console.error('Error querying database:', err);
                res.status(500).send('Internal Server Error');
                return;
            }
        console.log('Berhasil berada di halaman laporan stok barang');
        res.render('lapStok', { title: 'Laporan Stok Barang',  stok: results, role: req.session.role });
    });
    } else {
        // Jika bukan admin
        res.status(403).send('Forbidden');
    }
  });

  app.get('/penjualan', (req, res) => {
    if (req.session.role === 'kasir') {
        console.log('Berhasil berada di halaman dashboard');

        // Mendapatkan username kasir dari sesi
        const kasir = req.session.username || 'Kasir Tidak Tersedia';
        console.log('Nilai kasir:', kasir); 
        const tgl = new Date().toISOString().slice(0, 10); // Ambil tanggal penjualan saat ini
        const lastIDQuery = 'SELECT MAX(kode_transaksi) AS lastID FROM transaksi';
        conn.query(lastIDQuery, (err, results) => {
            if (err) {
                console.error('Error querying database:', err);
                res.status(500).send('Internal Server Error');
                return;
            }

            let lastID = results[0].lastID || "0";
            // Mengambil angka dari kode transaksi terakhir
            let lastNumber = parseInt(lastID.slice(2));
            // Membuat kode transaksi baru dengan menambahkan 1
            let nextID = "PJ" + ("000" + (lastNumber + 1)).slice(-3);

            // Setelah mendapatkan kode_transaksi, lakukan pengambilan data barang
            const sql = 'SELECT kode_barang, nama_barang, harga, stok FROM barang';
            conn.query(sql, (err, results) => {
                if (err) {
                    console.error('Error querying database:', err);
                    res.status(500).send('Internal Server Error');
                    return;
                }
                // Render halaman penjualan dan sertakan data barang dan username
                res.render('penjualan', { title: 'Penjualan Page', kasir: req.session.username, kode_transaksi: nextID, tgl, barang: results, keranjang: keranjang });
            });
        });
    } else {
        res.status(403).send('Forbidden');
    }
});


const keranjang = [];
//rute untuk menambah data penjualan ke keranjang
app.post('/penjualan/add', (req, res) => {
    // Tangkap data dari form
    const { kode_barang, qty, harga, total } = req.body;

    // Query untuk mendapatkan nama_barang dan harga dari database
    const sql = 'SELECT nama_barang, harga FROM barang WHERE kode_barang = ?';
    conn.query(sql, [kode_barang], (err, results) => {
        if (err) {
            console.error('Error querying database:', err);
            res.status(500).send('Internal Server Error');
            return;
        }

        // Pastikan ada hasil dari query
        if (results.length > 0) {
            const { nama_barang, harga } = results[0];
            const total = harga * qty;

            // Tambahkan data transaksi ke dalam keranjang
            const item = {
                kode_barang: kode_barang,
                nama_barang: nama_barang,
                qty: qty,
                harga: harga,
                total: total
            };
            keranjang.push(item);

            // Console log untuk memeriksa data masuk ke keranjang
            console.log('Data berhasil dimasukkan ke dalam keranjang:', item);

            // Setelah menambahkan data ke keranjang, kirim kembali respons ke klien tanpa informasi transaksi
            res.render('penjualan', { title: 'Penjualan Page', kasir: req.session.username, keranjang: keranjang });
        } else {
            // Jika tidak ada hasil dari query
            console.log('Kode barang tidak ditemukan dalam database.');
            res.status(404).json({ message: 'Kode barang tidak ditemukan dalam database.' });
        }
    });
});

// // Endpoint untuk menampilkan keranjang
// app.get('/keranjang', (req, res) => {
//     res.status(200).json({ keranjang: keranjang });
// });

// // Endpoint untuk menghapus semua item dari keranjang (untuk keperluan contoh)
// app.delete('/keranjang/delete', (req, res) => {
//     keranjang = [];
//     res.status(200).json({ message: 'Semua item di keranjang berhasil dihapus.' });
// });

// Rute untuk menyimpan penjualan ke database
app.post('/penjualan/save', (req, res) => {
    Promise.all(
    // Loop untuk menyimpan setiap barang dalam keranjang ke database
    keranjangPenjualan.map(({ kode_barang, qty, harga, total }) => {
        return new Promise((resolve, reject) => {
            // Simpan data ke dalam tabel penjualan di database
            const sql = 'INSERT INTO transaksi (tgl, kode_transaksi, kasir, kode_barang, nama_barang, qty, harga, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
            conn.query(sql, [tgl, kode_transaksi, kasir, kode_barang, nama_barang, qty, harga, total], (err, result) => {
                if (err) {
                    console.error('Error querying database:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
        })
    )
    .then(() => {
    // Setelah menyimpan transaksi ke database, kosongkan keranjang penjualan
    keranjangPenjualan = [];

    // Redirect kembali ke halaman penjualan atau tampilkan pesan sukses
    res.redirect('/penjualan');
    })
    .catch((err) => {
        // Tangani kesalahan jika ada
        console.error('Error saving transaction to database:', err);
        res.status(500).send('Internal Server Error');
    });
});


//Rute halaman data member
app.get('/member', (req, res) => {  
    if (req.session.role === 'kasir') {
        const sql = 'SELECT kode_member, nama, telepon, alamat FROM member';
        conn.query(sql, (err, results) => {
            if (err) {
                console.error('Error querying database:', err);
                res.status(500).send('Internal Server Error');
                return;
            }
        console.log('Berhasil berada di halaman data member');
        res.render('member', { title: 'Data Member',  member: results });
    });
    } else {
        // Jika bukan admin
        res.status(403).send('Forbidden');
    }
  });

// Rute untuk menambah data member
app.post('/member/add', (req, res) => {
    if (req.session.role === 'kasir') {
        const { kode_member, nama, telepon, alamat } = req.body;


        // Pastikan semua data member yang diperlukan tersedia
        if (!kode_member || !nama || !telepon || !alamat) {
            return res.status(400).send('Bad Request');
        }
        // Query untuk menambahkan data member ke database
        const sql = 'INSERT INTO member (kode_member, nama, telepon, alamat) VALUES (?, ?, ?, ?)';
        const values = [kode_member, nama, telepon, alamat];

        conn.query(sql, values, (err, results) => {
            if (err) {
                console.error('Error querying database:', err);
                res.status(500).send('Internal Server Error');
                return;
            }
            console.log('Data member berhasil ditambahkan:', results);
            res.redirect('/member');
        });
    } else {
        // Jika bukan admin
        res.status(403).send('Forbidden');
    }
});

// Rute untuk melakukan update member
app.post('/member/update/:kode_member', (req, res) => {
    if (req.session.role === 'kasir') {
        const kode_member = req.params.kode_member;
        const { nama, telepon, alamat } = req.body;

        // Lakukan update data member ke dalam database
        const sql = 'UPDATE member SET nama = ?, telepon = ?, alamat = ? WHERE kode_member = ?';
        conn.query(sql, [nama, telepon, alamat, kode_member], (err, results) => {
            if (err) {
                console.error('Error querying database:', err);
                res.status(500).send('Internal Server Error');
                return;
            }
            // Jika pengguna dengan kode_member yang diberikan tidak ditemukan
            if (results.affectedRows === 0) {
                res.status(404).send('Member tidak ditemukan.');
                return;
            }
            // Redirect kembali ke halaman member setelah member berhasil diupdate
            res.redirect('/member');
        });
    } else {
        // Jika bukan admin
        res.status(403).send('Forbidden');
    }
});

//Rute untuk menghapus data member
app.post('/member/delete/:kode_member', (req, res) => {
    if (req.session.role === 'kasir') {
        const kode_member = req.params.kode_member;

        const sql = 'DELETE from member WHERE kode_member = ?';
        conn.query(sql, [kode_member], (err, results) => {
            if (err) {
                console.error('Error querying database:', err);
                res.status(500).send('Internal Server Error');
                return;
            }
            console.log('Data member berhasil dihapus:', results);
            // Redirect kembali ke halaman data kasir setelah menambahkan data kasir
            res.redirect('/member');
        });
    } else {
        res.status(403).send('Forbidden');
    }
});


app.use('/', (req, res)=>{
  res.status(404)
  res.send('page not found :404')
});
app.listen(port, () =>{
  console.log(`Example app listening on port ${port}`)
});