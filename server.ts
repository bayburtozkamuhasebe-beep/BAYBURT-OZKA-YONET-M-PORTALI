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

    const [kRes, pRes, mRes] = await Promise.all([
      supabase.from('kullanicilar').select('id, kullanici_adi, parola'),
      supabase.from('personelsifre').select('id, kullanici_adi, parola'),
      supabase.from('misafirsifre').select('id, kullanici_adi, parola'),
    ]);

    // A. Yönetici Kontrolü (Varsayılan supabase kullanicilar)
    if (Array.isArray(kRes.data)) {
      for (const row of kRes.data) {
        if (isUserMatch(row.kullanici_adi, trimmedUser, 'admin') && isPasswordMatch(row.parola, trimmedPass)) {
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

    // B. Personel Kontrolü
    if (Array.isArray(pRes.data)) {
      for (const row of pRes.data) {
        if (isUserMatch(row.kullanici_adi, trimmedUser, 'personel') && isPasswordMatch(row.parola, trimmedPass)) {
          return res.json({
            success: true,
            role: 'personel',
            username: row.kullanici_adi || trimmedUser,
            matchedTable: 'personelsifre',
          });
        }
      }
    }

    // C. Misafir Kontrolü
    if (Array.isArray(mRes.data)) {
      for (const row of mRes.data) {
        if (isUserMatch(row.kullanici_adi, trimmedUser, 'misafir') && isPasswordMatch(row.parola, trimmedPass)) {
          return res.json({
            success: true,
            role: 'misafir',
            username: row.kullanici_adi || trimmedUser,
            matchedTable: 'misafirsifre',
          });
        }
      }
    }

    return res.json({ success: false, error: 'Kullanıcı adı veya parola hatalı' });
  } catch (err: unknown) {
    console.error('Sunucu kimlik doğrulama hatası:', err);
    return res.status(500).json({ success: false, error: 'Sunucu doğrulama hatası' });
  }
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
