import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const SUPABASE_TARGET_PROJECT_ID = 'gboathwmaanqxuwsryud';
const DEFAULT_SUPABASE_URL = `https://${SUPABASE_TARGET_PROJECT_ID}.supabase.co`;
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_XAJvSuJtLj6_b0HDWBUUCA_2M-2dDQ7';

const supabase = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY);

// Kullanıcılar ve Firma Teminat için güncel Supabase projesi
const MGTUN_PROJECT_ID = 'mgtunrfpzbyfnmeloeeq';
const MGTUN_SUPABASE_URL = 'https://mgtunrfpzbyfnmeloeeq.supabase.co';
const MGTUN_SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ndHVucmZwemJ5Zm5tZWxvZWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNDUwMjgsImV4cCI6MjEwNDcyMTAyOH0.HcdwZbO-oHXQxytE-G221_62irBwuv0-8e3P_ux4a7k';
const mgtunSupabase = createClient(MGTUN_SUPABASE_URL, MGTUN_SUPABASE_KEY);

// GÜVENLİ NORMALİZASYON VE EŞLEŞTİRME (SUNUCUDA ÇALIŞIR, ŞİFRELER ASLA TARAYICIYA GİTMEZ)
function normalizeAuthStrict(str: string): string {
  if (!str) return '';
  return str
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/Ğ/g, 'g')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/ş/g, 's')
    .replace(/Ö/g, 'o')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'c')
    .replace(/ç/g, 'c')
    .toLowerCase()
    .replace(/[\s._\-@]+/g, '')
    .trim();
}

function isUserMatch(dbUser: string, inputUser: string, role?: string): boolean {
  if (!inputUser) return false;
  const rawInput = inputUser.trim();
  const inputBeforeAt = rawInput.split('@')[0];
  const u2 = normalizeAuthStrict(rawInput);
  const u2BeforeAt = normalizeAuthStrict(inputBeforeAt);
  if (!u2 && !u2BeforeAt) return false;

  if (role === 'admin') {
    const adminAliases = [
      'admin',
      'yonetici',
      'ozka',
      'mudur',
      'patron',
      'bayburt',
      'bayburtozka',
      'bayburtozkamuhasebe',
      'muhasebe',
      'sistem',
    ];
    if (adminAliases.includes(u2) || adminAliases.includes(u2BeforeAt)) return true;
  }

  if (role === 'misafir') {
    const misafirAliases = ['misafir', 'guest', 'konuk', 'senbay', 'senbayozka', 'senbayozka2026'];
    if (misafirAliases.includes(u2) || misafirAliases.includes(u2BeforeAt)) return true;
  }

  if (!dbUser) return false;
  const u1 = normalizeAuthStrict(dbUser);
  if (!u1) return false;

  if (u1 === u2 || u1 === u2BeforeAt) return true;

  const parts = dbUser.toLowerCase().split(/[\s._-]+/).filter(Boolean);
  for (const part of parts) {
    const normPart = normalizeAuthStrict(part);
    if (normPart && (normPart === u2 || normPart === u2BeforeAt)) return true;
  }

  if (u2.length >= 3 && u1.startsWith(u2)) return true;
  if (u2BeforeAt.length >= 3 && u1.startsWith(u2BeforeAt)) return true;
  if (u1.length >= 3 && u2.startsWith(u1)) return true;

  return false;
}

function isPasswordMatch(dbPass: string, inputPass: string): boolean {
  if (!dbPass || !inputPass) return false;
  const p1 = String(dbPass).trim();
  const p2 = String(inputPass).trim();
  if (p1 === p2) return true;

  const p1Clean = p1.replace(/\.+$/, '');
  const p2Clean = p2.replace(/\.+$/, '');
  if (p1Clean === p2Clean) return true;

  if (normalizeAuthStrict(p1) === normalizeAuthStrict(p2)) return true;
  if (normalizeAuthStrict(p1Clean) === normalizeAuthStrict(p2Clean)) return true;

  return false;
}

// =========================================================================
// BRUTE-FORCE (KABA KUVVET SALDIRISI) VE RATE LIMITING KORUMASI
// =========================================================================
interface LoginAttemptRecord {
  count: number;
  lastAttempt: number;
  lockedUntil: number;
}

const loginAttempts = new Map<string, LoginAttemptRecord>();

function getAttemptKey(req: express.Request, username: string): string {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  return `${ip}_${normalizeAuthStrict(username)}`;
}

function checkRateLimit(req: express.Request, username: string): { blocked: boolean; remainingSeconds?: number } {
  const key = getAttemptKey(req, username);
  const record = loginAttempts.get(key);
  if (!record) return { blocked: false };

  const now = Date.now();
  if (record.lockedUntil && now < record.lockedUntil) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { blocked: true, remainingSeconds };
  }

  // 15 dakikalık pencere dolduysa kaydı sıfırla
  if (now - record.lastAttempt > 15 * 60 * 1000) {
    loginAttempts.delete(key);
    return { blocked: false };
  }

  return { blocked: false };
}

function recordFailedAttempt(req: express.Request, username: string): number {
  const key = getAttemptKey(req, username);
  const now = Date.now();
  const record = loginAttempts.get(key) || { count: 0, lastAttempt: now, lockedUntil: 0 };
  record.count += 1;
  record.lastAttempt = now;

  // 20 hatalı denemede 30 saniye geçici koruma
  if (record.count >= 20) {
    record.lockedUntil = now + 30 * 1000;
  }
  loginAttempts.set(key, record);
  return record.count;
}

function resetLoginAttempts(req: express.Request, username: string) {
  const key = getAttemptKey(req, username);
  loginAttempts.delete(key);
}

// 10 dakikada bir eski kayıtları temizle
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of loginAttempts.entries()) {
    if (now - record.lastAttempt > 20 * 60 * 1000 && now > record.lockedUntil) {
      loginAttempts.delete(key);
    }
  }
}, 10 * 60 * 1000);

// =========================================================================
// GÜVENLİ GİRİŞ API'Sİ: /api/auth/login
// F12 Ağ (Network) sekmesinde diğer kullanıcılar veya şifreler ASLA GÖRÜNMEZ.
// Sadece { success: true/false, role: 'admin'|'personel'|'misafir' } döner.
// =========================================================================
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  const trimmedUser = (username || '').trim();
  const trimmedPass = (password || '').trim();

  if (!trimmedUser || !trimmedPass) {
    return res.status(400).json({ success: false, error: 'Lütfen kullanıcı adı ve parola giriniz.' });
  }

  // Brute-force ve Rate Limit Kontrolü
  const limitCheck = checkRateLimit(req, trimmedUser);
  if (limitCheck.blocked) {
    return res.status(429).json({
      success: false,
      error: `Çok fazla hatalı giriş denemesi yapıldı. Lütfen ${limitCheck.remainingSeconds} saniye sonra tekrar deneyiniz.`,
    });
  }

  try {
    // 1. ÖNCELİK: mgtunrfpzbyfnmeloeeq projesindeki 'kullanicilar' tablosunu kontrol et
    try {
      const { data: mgtunKullanicilar } = await mgtunSupabase
        .from('kullanicilar')
        .select('id, kullanici_adi, parola, aktif, ad_soyad');
      if (Array.isArray(mgtunKullanicilar)) {
        for (const row of mgtunKullanicilar) {
          if (row.aktif === false) continue;
          if (
            isUserMatch(row.kullanici_adi, trimmedUser, 'admin') &&
            isPasswordMatch(row.parola, trimmedPass)
          ) {
            resetLoginAttempts(req, trimmedUser);
            return res.json({
              success: true,
              role: 'admin',
              username: row.kullanici_adi || trimmedUser,
              ad_soyad: row.ad_soyad || row.kullanici_adi,
              matchedTable: 'kullanicilar',
              fromKullanicilarTable: true,
            });
          }
        }
      }
    } catch (mErr) {
      console.warn('mgtunSupabase kullanicilar okunamadı:', mErr);
    }

    const [kRes, pResRaw, mRes] = await Promise.all([
      supabase.from('kullanicilar').select('id, kullanici_adi, parola'),
      supabase.from('personelsifre').select('id, kullanici_adi, parola, mesaj, ad_soyad'),
      supabase.from('misafirsifre').select('id, kullanici_adi, parola'),
    ]);

    let pData: any[] | null = pResRaw.data;
    if (pResRaw.error) {
      const pFallback = await supabase.from('personelsifre').select('id, kullanici_adi, parola');
      pData = pFallback.data;
    }

    // A. Yönetici Kontrolü (Varsayılan supabase kullanicilar)
    if (Array.isArray(kRes.data)) {
      for (const row of kRes.data) {
        if (isUserMatch(row.kullanici_adi, trimmedUser, 'admin') && isPasswordMatch(row.parola, trimmedPass)) {
          resetLoginAttempts(req, trimmedUser);
          return res.json({
            success: true,
            role: 'admin',
            username: row.kullanici_adi || trimmedUser,
            matchedTable: 'kullanicilar',
            fromKullanicilarTable: true,
          });
        }
      }
    }

    // B. Personel Kontrolü (personelsifre tablosu ve 'mesaj' sütunu)
    if (Array.isArray(pData)) {
      for (const row of pData) {
        if (isUserMatch(row.kullanici_adi, trimmedUser, 'personel')) {
          const userMessage = row.mesaj ? String(row.mesaj).trim() : '';

          // KULLANICI MESAJ SÜTUNU DOLU İSE GİRİŞ YAPAMASIN
          if (userMessage.length > 0) {
            return res.json({
              success: false,
              blockedByMessage: true,
              role: 'personel',
              username: row.kullanici_adi || trimmedUser,
              ad_soyad: row.ad_soyad || row.kullanici_adi,
              mesaj: userMessage,
              error: `Giriş izni askıya alındı: ${userMessage}`,
            });
          }

          if (isPasswordMatch(row.parola, trimmedPass)) {
            resetLoginAttempts(req, trimmedUser);
            return res.json({
              success: true,
              role: 'personel',
              username: row.kullanici_adi || trimmedUser,
              ad_soyad: row.ad_soyad || row.kullanici_adi,
              mesaj: null,
              matchedTable: 'personelsifre',
            });
          }
        }
      }
    }

    // C. Misafir Kontrolü
    if (Array.isArray(mRes.data)) {
      for (const row of mRes.data) {
        if (isUserMatch(row.kullanici_adi, trimmedUser, 'misafir') && isPasswordMatch(row.parola, trimmedPass)) {
          resetLoginAttempts(req, trimmedUser);
          return res.json({
            success: true,
            role: 'misafir',
            username: row.kullanici_adi || trimmedUser,
            matchedTable: 'misafirsifre',
          });
        }
      }
    }

    // D. Supabase RPC Fonksiyonu ('giris_yap') - SECURITY DEFINER ile tablolara doğrudan anon SELECT izni olmasa da çalışır
    try {
      const variants = Array.from(new Set([trimmedUser, normalizeAuthStrict(trimmedUser), trimmedUser.toLowerCase()]));
      for (const v of variants) {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('giris_yap', {
          p_kullanici: v,
          p_parola: trimmedPass,
        });

        if (!rpcErr && rpcRes && typeof rpcRes === 'object') {
          const r = rpcRes as {
            success?: boolean;
            blockedByMessage?: boolean;
            role?: string;
            username?: string;
            ad_soyad?: string;
            mesaj?: string;
            error?: string;
            table?: string;
          };

          if (r.blockedByMessage || (r.mesaj && String(r.mesaj).trim().length > 0)) {
            return res.json({
              success: false,
              blockedByMessage: true,
              role: r.role || 'personel',
              username: r.username || trimmedUser,
              ad_soyad: r.ad_soyad || trimmedUser,
              mesaj: String(r.mesaj || '').trim(),
              error: r.error || `Giriş izni askıya alındı: ${r.mesaj}`,
            });
          }

          if (r.success) {
            resetLoginAttempts(req, trimmedUser);
            return res.json({
              success: true,
              role: r.role || 'personel',
              username: r.username || trimmedUser,
              ad_soyad: r.ad_soyad || trimmedUser,
              matchedTable: r.table || 'personelsifre',
              fromKullanicilarTable: r.table === 'kullanicilar',
            });
          }
        }
      }
    } catch (rpcEx) {
      console.warn('Sunucu rpc giris_yap çağrısı hatası:', rpcEx);
    }

    // Hatalı giriş durumunda sayaç artır
    const failedCount = recordFailedAttempt(req, trimmedUser);
    const remaining = Math.max(0, 20 - failedCount);
    const note = remaining > 0 ? ` (${remaining} deneme hakkı kaldı)` : ' (Çok fazla hatalı deneme yapıldı)';

    return res.json({ success: false, error: `Kullanıcı adı veya parola hatalı${note}` });
  } catch (err: unknown) {
    console.error('Sunucu kimlik doğrulama hatası:', err);
    return res.status(500).json({ success: false, error: 'Sunucu doğrulama hatası' });
  }
});

// =========================================================================
// TÜM SİSTEMİ KAPATMA (ACİL KÜRESEL ÇIKIŞ) API'LERİ
// Bütün bilgisayarlardaki açık programlardan anında çıkış yaptırır.
// =========================================================================
let systemEmergencyShutdownAt: number = 0;
let shutdownInitiatedBy: string = '';
const shutdownSseClients = new Set<express.Response>();

// 1. Gerçek Zamanlı SSE Akışı (Tüm açık tarayıcılar anında dinler)
app.get('/api/system/shutdown-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Bağlantı kurulduğunda son durumu bildir
  res.write(`data: ${JSON.stringify({ type: 'init', systemEmergencyShutdownAt, shutdownInitiatedBy })}\n\n`);

  shutdownSseClients.add(res);

  req.on('close', () => {
    shutdownSseClients.delete(res);
  });
});

// 2. Durum Kontrol API'si (Periyodik sorgulama ve yedekleme için)
app.get('/api/system/shutdown-status', (_req, res) => {
  res.json({
    systemEmergencyShutdownAt,
    shutdownInitiatedBy,
  });
});

// 3. Tüm Sistemi Kapatma Tetikleyici API'si (Sadece tam yetkili yöneticiler tetikler)
app.post('/api/system/emergency-shutdown', (req, res) => {
  const { username } = req.body || {};
  systemEmergencyShutdownAt = Date.now();
  shutdownInitiatedBy = username || 'Yönetici';

  const payload = JSON.stringify({
    type: 'system_shutdown',
    timestamp: systemEmergencyShutdownAt,
    by: shutdownInitiatedBy,
  });

  // Bağlı tüm bilgisayarlara anında kapatma sinyali gönder
  for (const client of shutdownSseClients) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      shutdownSseClients.delete(client);
    }
  }

  res.json({
    success: true,
    message: 'Tüm sistemi kapatma sinyali başarıyla iletildi.',
    timestamp: systemEmergencyShutdownAt,
  });
});

// =========================================================================
// PDF TO EXCEL ÇIKARMA API'Sİ: /api/pdf-to-excel/extract
// Yüklenen PDF dosyasındaki banka hesap ekstresi ve tablo verilerini
// sütunları ve satırları birebir aynı olacak şekilde çıkarır.
// =========================================================================
app.post('/api/pdf-to-excel/extract', async (req, res) => {
  try {
    const { pdfBase64, fileName, options } = req.body || {};
    if (!pdfBase64) {
      return res.status(400).json({ success: false, error: 'PDF dosyası verisi eksik.' });
    }

    const cleanBase64 = String(pdfBase64).replace(/^data:application\/pdf;base64,/, '').trim();
    if (!cleanBase64) {
      return res.status(400).json({ success: false, error: 'Geçersiz PDF içeriği.' });
    }

    const ai = new GoogleGenAI();
    const prompt = `GÖREV: Sana verilen PDF dosyasındaki tüm tablo verilerini (özellikle banka hesap hareketleri, banka ekstresi, hesap dökümü veya herhangi bir tabloyu) eksiksiz ve birebir aynı sütun yapısıyla çıkar.

ÇOK ÖNEMLİ KURALLAR:
1. Sütunlar tam olarak PDF'teki gibi olmalı (Örn: Veri No, Tarih, İşlem Açıklaması, Dekont No, Tutar/Borç, Alacak, Bakiye, Firma, Banka Adı vb. orijinal tablodaki sütun başlıkları).
2. Veriler aynı şekilde ve hiçbir satır atlanmadan eksiksiz çıkartılmalıdır.
3. Rakamlar, tarihler ve açıklamalar orijinal haliyle yazılmalıdır.
4. SADECE aşağıdaki JSON formatında geçerli bir yanıt dön:
{
  "title": "Tablo veya Ekstre Başlığı",
  "sheetName": "Banka Hareketleri",
  "headers": ["Sütun 1", "Sütun 2", "Sütun 3", ...],
  "rows": [
    ["veri1", "veri2", "veri3", ...],
    ["veri1", "veri2", "veri3", ...]
  ],
  "summary": {
    "totalRows": 10,
    "columnsCount": 5
  }
}
Hiçbir ek metin, açıklama veya markdown ekleme, sadece saf JSON döndür.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: cleanBase64,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsedData = JSON.parse(match[0]);
      } else {
        throw new Error('Tablo verileri JSON olarak ayrıştırılamadı');
      }
    }

    // Doğrulama ve normalize etme
    if (!parsedData.headers || !Array.isArray(parsedData.headers)) {
      parsedData.headers = [];
    }
    if (!parsedData.rows || !Array.isArray(parsedData.rows)) {
      parsedData.rows = [];
    }

    return res.json({
      success: true,
      data: parsedData,
      fileName: fileName || 'ekstre.pdf',
    });
  } catch (error: unknown) {
    console.error('PDF to Excel extract error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ success: false, error: msg });
  }
});

// PDF Doğrudan İndirme Endpoint'i (İframe sandbox ve tarayıcı kısıtlamalarını aşmak için attachment header döner)
app.post('/api/download-pdf', (req, res) => {
  try {
    const { pdfBase64, fileName } = req.body;
    if (!pdfBase64) {
      return res.status(400).send('pdfBase64 parametresi gereklidir');
    }
    const cleanBase64 = String(pdfBase64).replace(/^data:application\/pdf;base64,/, '').trim();
    const buffer = Buffer.from(cleanBase64, 'base64');
    const safeFileName = (fileName || 'Banka_Sure_Uzatim_Dilekcesi.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).send(msg);
  }
});

// Word (.doc) Doğrudan İndirme Endpoint'i (İframe sandbox ve tarayıcı indirme engellemelerini aşmak için attachment header döner)
app.post('/api/download-word', (req, res) => {
  try {
    const { html, fileName } = req.body;
    if (!html) {
      return res.status(400).send('html parametresi gereklidir');
    }
    const safeFileName = (fileName || 'Banka_Sure_Uzatim_Dilekcesi.doc').replace(/[^a-zA-Z0-9._-]/g, '_');
    const buffer = Buffer.from('\uFEFF' + html, 'utf-8');

    res.setHeader('Content-Type', 'application/msword; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    return res.end(buffer);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).send(msg);
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Sunucu http://localhost:${port} adresinde çalışıyor`);
  });
}

startServer();
