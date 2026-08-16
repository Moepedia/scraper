// ============================================================
//  SERVER AM PREMIUM - MENGIRIM EMAIL REAL
// ============================================================

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const crypto = require('crypto');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ============================================================
//  KONFIGURASI EMAIL (Ganti dengan akun Gmail kamu)
// ============================================================
const EMAIL_CONFIG = {
    // 🔴 GANTI DENGAN EMAIL DAN PASSWORD GMAIL KAMU
    email: 'your-email@gmail.com',
    password: 'your-app-password', // Bukan password biasa, tapi App Password
    // Cara buat App Password: 
    // 1. Google Account > Security > 2-Step Verification > ON
    // 2. App Passwords > Generate > Pilih "Mail" > Copy password
};

// ============================================================
//  KONFIGURASI TRANSPORTER
// ============================================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_CONFIG.email,
        pass: EMAIL_CONFIG.password,
    },
    tls: {
        rejectUnauthorized: false
    }
});

// ============================================================
//  STORAGE SEMENTARA (Simpan token aktivasi)
// ============================================================
const pendingActivations = new Map();

// ============================================================
//  API: KIRIM EMAIL AKTIVASI
// ============================================================
app.post('/api/send-activation', async (req, res) => {
    try {
        const { email } = req.body;

        // Validasi email
        if (!email || !email.includes('@')) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email tidak valid!' 
            });
        }

        // Generate token unik
        const token = crypto.randomBytes(32).toString('hex');
        const activationLink = `https://alightcreative.com/verify?token=${token}`;

        // Simpan token untuk verifikasi
        pendingActivations.set(token, {
            email: email,
            timestamp: Date.now(),
            used: false
        });

        // Hapus token lama (lebih dari 1 jam)
        for (const [key, value] of pendingActivations) {
            if (Date.now() - value.timestamp > 3600000) {
                pendingActivations.delete(key);
            }
        }

        // ============================================================
        //  KONTEN EMAIL - SAMA PERSIS DENGAN ASLINYA
        // ============================================================
        const mailOptions = {
            from: `"AM Premium" <${EMAIL_CONFIG.email}>`,
            to: email,
            subject: '🔑 Aktivasi Akun AM Premium',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: 'Segoe UI', Arial, sans-serif;
                            background: #0a0a1a;
                            color: #e0e0e0;
                            padding: 40px 20px;
                            max-width: 600px;
                            margin: 0 auto;
                        }
                        .container {
                            background: #16213e;
                            border-radius: 20px;
                            padding: 40px;
                            border: 1px solid #2a2a5e;
                        }
                        h1 {
                            color: #e94560;
                            text-align: center;
                            font-size: 28px;
                        }
                        .content {
                            margin: 30px 0;
                            line-height: 1.8;
                        }
                        .button {
                            display: inline-block;
                            background: linear-gradient(135deg, #e94560, #c23152);
                            color: #fff;
                            padding: 15px 40px;
                            border-radius: 10px;
                            text-decoration: none;
                            font-weight: 700;
                            margin: 20px 0;
                            font-size: 18px;
                            text-align: center;
                            width: 100%;
                            box-sizing: border-box;
                        }
                        .button:hover {
                            background: linear-gradient(135deg, #ff5575, #d43a5a);
                            transform: scale(1.02);
                        }
                        .footer {
                            text-align: center;
                            color: #666;
                            font-size: 13px;
                            margin-top: 30px;
                            padding-top: 20px;
                            border-top: 1px solid #2a2a5e;
                        }
                        .link-box {
                            background: #0a0a1a;
                            padding: 15px;
                            border-radius: 8px;
                            border: 1px solid #2a2a5e;
                            word-break: break-all;
                            font-size: 14px;
                            margin: 15px 0;
                        }
                        .warning {
                            background: #1a2a1a;
                            padding: 12px;
                            border-radius: 8px;
                            color: #6fdf8f;
                            font-size: 14px;
                            border-left: 4px solid #27ae60;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>🎯 Aktivasi AM Premium</h1>
                        <div class="content">
                            <p>Halo <strong>${email}</strong>,</p>
                            <p>Terima kasih telah mendaftar! Klik tombol di bawah untuk mengaktifkan akun AM Premium Anda:</p>
                            
                            <a href="${activationLink}" class="button">✨ Sign in to Alight Creative</a>
                            
                            <p style="text-align:center;color:#888;font-size:14px;">Atau salin link ini:</p>
                            <div class="link-box">${activationLink}</div>
                            
                            <div class="warning">
                                ⚠️ Link ini hanya berlaku selama 1 jam.
                            </div>
                            
                            <p style="margin-top:20px;">Jika Anda tidak meminta aktivasi ini, abaikan email ini.</p>
                        </div>
                        <div class="footer">
                            <p>© 2024 AM Premium Generator by Yuji</p>
                            <p style="font-size:12px;">Email ini dikirim secara otomatis, jangan balas.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        // Kirim email
        await transporter.sendMail(mailOptions);

        console.log(`✅ Email aktivasi terkirim ke: ${email}`);
        console.log(`🔗 Token: ${token}`);

        res.json({
            success: true,
            message: 'Email aktivasi terkirim!',
            token: token // Hanya untuk debug, hapus di production
        });

    } catch (error) {
        console.error('❌ Error kirim email:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengirim email: ' + error.message
        });
    }
});

// ============================================================
//  API: VERIFIKASI TOKEN (Aktivasi)
// ============================================================
app.post('/api/activate', (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token tidak ditemukan!'
            });
        }

        // Cek token
        const activation = pendingActivations.get(token);

        if (!activation) {
            return res.status(400).json({
                success: false,
                message: 'Token tidak valid atau sudah kadaluarsa!'
            });
        }

        if (activation.used) {
            return res.status(400).json({
                success: false,
                message: 'Token sudah digunakan!'
            });
        }

        // Tandai sebagai used
        activation.used = true;
        pendingActivations.set(token, activation);

        console.log(`✅ Aktivasi berhasil untuk: ${activation.email}`);

        res.json({
            success: true,
            message: '✅ Aktivasi berhasil! Akun AM Premium aktif! 🎉',
            email: activation.email
        });

    } catch (error) {
        console.error('❌ Error aktivasi:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal aktivasi: ' + error.message
        });
    }
});

// ============================================================
//  API: CEK STATUS TOKEN
// ============================================================
app.get('/api/check-token/:token', (req, res) => {
    const token = req.params.token;
    const activation = pendingActivations.get(token);

    if (!activation) {
        return res.json({ valid: false, message: 'Token tidak ditemukan' });
    }

    res.json({
        valid: true,
        email: activation.email,
        used: activation.used,
        timestamp: activation.timestamp
    });
});

// ============================================================
//  START SERVER
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server AM Premium running di http://localhost:${PORT}`);
    console.log(`📧 Email pengirim: ${EMAIL_CONFIG.email}`);
    console.log(`📝 Total token pending: ${pendingActivations.size}`);
});
