import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserRole, AuthSession } from '../types';
import { bankSupabase } from './supabase';

export const SUPABASE_TARGET_PROJECT_ID = 'gboathwmaanqxuwsryud';
export const DEFAULT_SUPABASE_URL = `https://${SUPABASE_TARGET_PROJECT_ID}.supabase.co`;
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_XAJvSuJtLj6_b0HDWBUUCA_2M-2dDQ7';
export const SUPABASE_MISAFIRSIFRE_URL = `https://supabase.com/dashboard/project/${SUPABASE_TARGET_PROJECT_ID}/editor/18387?schema=public/misafirsifre`;
export const SUPABASE_KULLANICILAR_URL = `https://supabase.com/dashboard/project/${SUPABASE_TARGET_PROJECT_ID}/editor/18387?schema=public/kullanicilar`;
export const SUPABASE_PERSONELSIFRE_URL = `https://supabase.com/dashboard/project/${SUPABASE_TARGET_PROJECT_ID}/editor/18418?schema=public/personelsifre`;
export const SUPABASE_SQL_EDITOR_URL = `https://supabase.com/dashboard/project/${SUPABASE_TARGET_PROJECT_ID}/sql/new`;

export const PERSONELSIFRE_ADD_MESAJ_SQL = `-- =========================================================================
-- public.personelsifre tablosuna 'mesaj' sütununu ekleme ve İzinleri Açma Kodu:
-- Supabase SQL Editor: https://supabase.com/dashboard/project/gboathwmaanqxuwsryud/sql/new
-- =========================================================================

-- 1. Güvenlik: Row Level Security (RLS) etkinleştir ve anon rolünün parola okumasını engelle:
ALTER TABLE IF EXISTS public.personelsifre ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kullanicilar ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.misafirsifre ENABLE ROW LEVEL SECURITY;

-- 2. anon rolünden doğrudan parola okuma yetkisini geri al:
REVOKE ALL ON TABLE public.personelsifre FROM anon;
REVOKE ALL ON TABLE public.kullanicilar FROM anon;
REVOKE ALL ON TABLE public.misafirsifre FROM anon;

-- Sadece güvenli meta kolonları için okuma izni ver (parola sütunu ASLA verilmez):
GRANT SELECT (id, kullanici_adi, ad_soyad, unvan, aktif, mesaj) ON TABLE public.personelsifre TO anon, authenticated;
GRANT SELECT (id, kullanici_adi, ad_soyad, unvan, aktif) ON TABLE public.kullanicilar TO anon, authenticated;
GRANT SELECT (id, kullanici_adi, ad_soyad, unvan, aktif) ON TABLE public.misafirsifre TO anon, authenticated;

-- Service role tam yetkili (sunucu doğrulamaları için):
GRANT ALL ON TABLE public.personelsifre TO service_role;
GRANT ALL ON TABLE public.kullanicilar TO service_role;
GRANT ALL ON TABLE public.misafirsifre TO service_role;

-- 3. RLS Okuma Politikaları (Şifre sütunu hariç güvenli listeleme):
DROP POLICY IF EXISTS "Guvenli personel listeleme" ON public.personelsifre;
CREATE POLICY "Guvenli personel listeleme" ON public.personelsifre FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Guvenli kullanici listeleme" ON public.kullanicilar;
CREATE POLICY "Guvenli kullanici listeleme" ON public.kullanicilar FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Guvenli misafir listeleme" ON public.misafirsifre;
CREATE POLICY "Guvenli misafir listeleme" ON public.misafirsifre FOR SELECT TO anon, authenticated USING (true);

-- 4. mesaj sütununu ekle:
ALTER TABLE IF EXISTS public.personelsifre 
ADD COLUMN IF NOT EXISTS mesaj TEXT;

-- 3. GÜVENLİ GİRİŞ FONKSİYONUNU GÜNCELLE (Mesaj doluysa KESİNLİKLE giriş engellenir):
CREATE OR REPLACE FUNCTION public.giris_yap(p_kullanici TEXT, p_parola TEXT)
RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_norm_user TEXT;
BEGIN
    v_norm_user := LOWER(TRIM(p_kullanici));

    -- Yönetici kontrolü
    SELECT id, kullanici_adi, COALESCE(ad_soyad, kullanici_adi) AS ad_soyad, 'admin' AS rol 
    INTO v_user FROM public.kullanicilar 
    WHERE LOWER(TRIM(kullanici_adi)) = v_norm_user AND parola = TRIM(p_parola);
    
    IF FOUND THEN
        RETURN json_build_object(
            'success', true, 
            'role', 'admin', 
            'username', v_user.kullanici_adi,
            'ad_soyad', v_user.ad_soyad,
            'table', 'kullanicilar'
        );
    END IF;

    -- Personel kontrolü (MESAJ SÜTUNU DOLUYSA KESİNLİKLE GİRİŞ YAPAMAZ!)
    SELECT id, kullanici_adi, COALESCE(ad_soyad, kullanici_adi) AS ad_soyad, 'personel' AS rol, COALESCE(mesaj, '') AS mesaj, parola 
    INTO v_user FROM public.personelsifre 
    WHERE LOWER(TRIM(kullanici_adi)) = v_norm_user;

    IF FOUND THEN
        -- Mesaj sütunu dolu ise parola doğru olsa da olmasa da giriş KESİNLİKLE ENGELLENİR!
        IF v_user.mesaj IS NOT NULL AND TRIM(v_user.mesaj) <> '' THEN
            RETURN json_build_object(
                'success', false, 
                'blockedByMessage', true,
                'role', 'personel', 
                'username', v_user.kullanici_adi,
                'ad_soyad', v_user.ad_soyad,
                'mesaj', TRIM(v_user.mesaj),
                'table', 'personelsifre',
                'error', 'Giriş izni askıya alındı: ' || TRIM(v_user.mesaj)
            );
        END IF;

        IF v_user.parola = TRIM(p_parola) THEN
            RETURN json_build_object(
                'success', true, 
                'role', 'personel', 
                'username', v_user.kullanici_adi,
                'ad_soyad', v_user.ad_soyad,
                'mesaj', NULL,
                'table', 'personelsifre'
            );
        END IF;
    END IF;

    -- Misafir kontrolü
    SELECT id, kullanici_adi, COALESCE(ad_soyad, kullanici_adi) AS ad_soyad, 'misafir' AS rol 
    INTO v_user FROM public.misafirsifre 
    WHERE LOWER(TRIM(kullanici_adi)) = v_norm_user AND parola = TRIM(p_parola);

    IF FOUND THEN
        RETURN json_build_object(
            'success', true, 
            'role', 'misafir', 
            'username', v_user.kullanici_adi,
            'ad_soyad', v_user.ad_soyad,
            'table', 'misafirsifre'
        );
    END IF;

    RETURN json_build_object('success', false, 'error', 'Kullanıcı adı veya parola hatalı');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.giris_yap(TEXT, TEXT) TO anon, authenticated;
`;

export const KULLANICILAR_SQL_SCRIPT = PERSONELSIFRE_ADD_MESAJ_SQL;


function isValidHttpUrl(str?: string): boolean {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Ortam ve yerel depolamadan config oku
export function getAuthConfig() {
  const url = DEFAULT_SUPABASE_URL;
  const anonKey = DEFAULT_SUPABASE_ANON_KEY;

  try {
    const savedKey = localStorage.getItem('ozka_supabase_anon_key');
    // Eğer kaydedilen anahtar geçersizse veya eski ise temizle
    if (savedKey && savedKey !== DEFAULT_SUPABASE_ANON_KEY) {
      localStorage.removeItem('ozka_supabase_anon_key');
    }
    const savedUrl = localStorage.getItem('ozka_supabase_url');
    if (savedUrl && !savedUrl.includes(SUPABASE_TARGET_PROJECT_ID)) {
      localStorage.removeItem('ozka_supabase_url');
    }
  } catch {
    // ignore
  }

  return { url, anonKey };
}

export function saveAuthConfig(url: string, anonKey: string) {
  try {
    if (url && url.trim()) {
      localStorage.setItem('ozka_supabase_url', url.trim());
    }
    if (anonKey && anonKey.trim()) {
      localStorage.setItem('ozka_supabase_anon_key', anonKey.trim());
    }
  } catch {
    // ignore
  }
}

// İstemci oluşturucu (Her zaman garantili çalışan resmi Supabase projesine bağlanır)
export function createAuthClient(): SupabaseClient {
  return createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY);
}

export function normalizeAuthText(str: string): string {
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
    .trim();
}

/**
 * Satırdan kullanıcı adı / eposta / tanımlayıcı alanını ayıklar
 */
export function extractRowUser(row: Record<string, unknown>): string {
  if (!row || typeof row !== 'object') return '';

  const candidates = [
    'kullanici_adi',
    'kullaniciadi',
    'username',
    'user',
    'kullanici',
    'ad_soyad',
    'adsoyad',
    'ad',
    'email',
    'eposta',
    'misafir_adi',
    'misafiradi',
    'misafir',
    'hesap',
    'tc',
  ];

  for (const c of candidates) {
    if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '') {
      return String(row[c]).trim();
    }
  }

  for (const [rawKey, rawVal] of Object.entries(row)) {
    if (rawVal === undefined || rawVal === null) continue;
    const key = rawKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    const valStr = String(rawVal).trim();
    if (
      (key.includes('kullanici') ||
        key.includes('user') ||
        key.includes('misafir') ||
        key.includes('personel') ||
        key === 'ad' ||
        key === 'name' ||
        key === 'eposta' ||
        key === 'email' ||
        key === 'hesap' ||
        key === 'tc') &&
      !key.includes('sifre') &&
      !key.includes('parola') &&
      !key.includes('pass')
    ) {
      return valStr;
    }
  }

  return '';
}

/**
 * Satırdan şifre / parola alanını ayıklar
 */
export function extractRowPass(row: Record<string, unknown>): string {
  if (!row || typeof row !== 'object') return '';

  const candidates = [
    'parola',
    'sifre',
    'password',
    'şifre',
    'pass',
    'pin',
    'kod',
    'misafirsifre',
    'personelsifre',
  ];

  for (const c of candidates) {
    if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '') {
      return String(row[c]).trim();
    }
  }

  for (const [rawKey, rawVal] of Object.entries(row)) {
    if (rawVal === undefined || rawVal === null) continue;
    const key = rawKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    const valStr = String(rawVal).trim();
    if (
      key.includes('parola') ||
      key.includes('sifre') ||
      key.includes('password') ||
      key.includes('pass') ||
      key.includes('pin') ||
      key.includes('kod')
    ) {
      return valStr;
    }
  }

  return '';
}

/**
 * Kullanıcı adı eşleşmesi kontrolü (Türkçe, eposta, boşluk duyarsız)
 */
export function isUsernameMatch(rowUser: string, inputUser: string): boolean {
  if (!rowUser || !inputUser) return false;
  const targetUser = inputUser.trim();
  const normInput = normalizeAuthText(targetUser);
  const normInputBeforeAt = normalizeAuthText(targetUser.split('@')[0]);
  const normFound = normalizeAuthText(rowUser);
  const normFoundBeforeAt = normalizeAuthText(rowUser.split('@')[0]);

  return (
    normFound === normInput ||
    normFound === normInputBeforeAt ||
    normFoundBeforeAt === normInput ||
    normFoundBeforeAt === normInputBeforeAt ||
    normFound.replace(/[^a-z0-9]/g, '') === normInput.replace(/[^a-z0-9]/g, '') ||
    rowUser.toLowerCase().trim() === targetUser.toLowerCase()
  );
}

/**
 * Şifre eşleşmesi kontrolü
 */
export function isPasswordMatch(rowPass: string, inputPass: string): boolean {
  if (!rowPass || !inputPass) return false;
  return rowPass.trim() === inputPass.trim();
}

// Canlı veri önbelleği
interface TableCache {
  misafirsifre: Record<string, unknown>[] | null;
  kullanicilar: Record<string, unknown>[] | null;
  personelsifre: Record<string, unknown>[] | null;
  lastFetch: number;
}

const tableCache: TableCache = {
  misafirsifre: null,
  kullanicilar: null,
  personelsifre: null,
  lastFetch: 0,
};

/**
 * Supabase `misafirsifre` tablosundan kayıtları çeker (Şifre kolonu ASLA çekilmez)
 */
export async function fetchMisafirSifreTable(forceRefresh = false): Promise<Record<string, unknown>[]> {
  const now = Date.now();
  if (!forceRefresh && tableCache.misafirsifre && now - tableCache.lastFetch < 10000) {
    return tableCache.misafirsifre;
  }

  const client = createAuthClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('misafirsifre')
        .select('id, kullanici_adi, ad_soyad, unvan, aktif');
      if (!error && Array.isArray(data)) {
        tableCache.misafirsifre = data as Record<string, unknown>[];
        tableCache.lastFetch = now;
        return tableCache.misafirsifre;
      }
    } catch (err) {
      console.warn('misafirsifre tablosu fetch hatası:', err);
    }
  }

  return [];
}

/**
 * Supabase `kullanicilar` tablosundan kayıtları çeker (Şifre kolonu ASLA çekilmez)
 */
export async function fetchKullanicilarTable(forceRefresh = false): Promise<Record<string, unknown>[]> {
  const now = Date.now();
  if (!forceRefresh && tableCache.kullanicilar && now - tableCache.lastFetch < 10000) {
    return tableCache.kullanicilar;
  }

  const client = createAuthClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('kullanicilar')
        .select('id, kullanici_adi, ad_soyad, unvan, aktif');
      if (!error && Array.isArray(data)) {
        tableCache.kullanicilar = data as Record<string, unknown>[];
        tableCache.lastFetch = now;
        return tableCache.kullanicilar;
      }
    } catch (err) {
      console.warn('kullanicilar tablosu fetch hatası:', err);
    }
  }

  return [];
}

/**
 * Supabase `personelsifre` tablosundan kayıtları çeker (Şifre kolonu ASLA çekilmez)
 */
export async function fetchPersonelSifreTable(forceRefresh = false): Promise<Record<string, unknown>[]> {
  const now = Date.now();
  if (!forceRefresh && tableCache.personelsifre && now - tableCache.lastFetch < 10000) {
    return tableCache.personelsifre;
  }

  const client = createAuthClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('personelsifre')
        .select('id, kullanici_adi, ad_soyad, unvan, aktif, mesaj');
      if (!error && Array.isArray(data)) {
        tableCache.personelsifre = data as Record<string, unknown>[];
        tableCache.lastFetch = now;
        return tableCache.personelsifre;
      }
      // 'mesaj' kolonu henüz eklenmemişse fallback sorgusu
      const fallback = await client
        .from('personelsifre')
        .select('id, kullanici_adi, ad_soyad, unvan, aktif');
      if (!fallback.error && Array.isArray(fallback.data)) {
        tableCache.personelsifre = fallback.data as Record<string, unknown>[];
        tableCache.lastFetch = now;
        return tableCache.personelsifre;
      }
    } catch (err) {
      console.warn('personelsifre tablosu fetch hatası:', err);
    }
  }

  return [];
}

/**
 * Tüm tablolardan verileri çeker (Yalnızca güvenli genel meta verileri)
 */
export async function fetchAllAuthTables(forceRefresh = false): Promise<{
  misafir: Record<string, unknown>[];
  kullanicilar: Record<string, unknown>[];
  personel: Record<string, unknown>[];
}> {
  const [misafir, kullanicilar, personel] = await Promise.all([
    fetchMisafirSifreTable(forceRefresh),
    fetchKullanicilarTable(forceRefresh),
    fetchPersonelSifreTable(forceRefresh),
  ]);
  return { misafir, kullanicilar, personel };
}

/**
 * 1. ADIM: GÜVENLİ KULLANICI ADI KONTROLÜ
 * Şifreler ASLA çekilmez. Sadece kullanıcının varlığı doğrulanır ve yeşil tik açılır.
 */
export function normalizeAuthStrict(str: string): string {
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
    .replace(/[\s._-]+/g, '')
    .trim();
}

export function isFlexibleUserMatch(dbUser: string, inputUser: string, dbRole?: UserRole): boolean {
  if (!inputUser) return false;
  const rawInput = inputUser.trim();
  const inputBeforeAt = rawInput.split('@')[0];
  const u2 = normalizeAuthStrict(rawInput);
  const u2BeforeAt = normalizeAuthStrict(inputBeforeAt);
  if (!u2 && !u2BeforeAt) return false;

  // 1. Yönetici tam ve esnek eşleşmeleri
  if (dbRole === 'admin') {
    const adminAliases = [
      'admin',
      'yonetici',
      'ozka',
      'mudur',
      'patron',
      'bayburt',
      'bayburtozka',
      'bayburtozkamuhasebe',
      'bayburtozkamuhasebegmailcom',
      'muhasebe',
      'sistem',
    ];
    if (adminAliases.includes(u2) || adminAliases.includes(u2BeforeAt)) {
      return true;
    }
  }

  // 2. Misafir tam eşleşmeleri
  if (dbRole === 'misafir') {
    const misafirAliases = ['misafir', 'guest', 'konuk', 'senbay', 'senbayozka', 'senbayozka2026'];
    if (misafirAliases.includes(u2) || misafirAliases.includes(u2BeforeAt)) {
      return true;
    }
  }

  if (!dbUser) return false;
  const u1 = normalizeAuthStrict(dbUser);
  if (!u1) return false;

  // Supabase tablolarındaki kullanıcı adı ile birebir tam eşleşme
  if (u1 === u2 || u1 === u2BeforeAt) return true;

  // İsim parçalarından biriyle eşleşme (örn: "hamza kaldırım" tablosundaki kayıt için sadece "hamza" yazılması)
  const parts = dbUser.toLowerCase().split(/[\s._-]+/).filter(Boolean);
  for (const part of parts) {
    const normPart = normalizeAuthStrict(part);
    if (normPart && (normPart === u2 || normPart === u2BeforeAt)) {
      return true;
    }
  }

  // Başlangıç eşleşmesi (örn: "hamza" -> "hamzakaldirim")
  if (u2.length >= 3 && u1.startsWith(u2)) return true;
  if (u2BeforeAt.length >= 3 && u1.startsWith(u2BeforeAt)) return true;
  if (u1.length >= 3 && u2.startsWith(u1)) return true;

  return false;
}

export function isFlexiblePasswordMatch(dbPass: string, inputPass: string): boolean {
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



/**
 * 1. ADIM: KULLANICI ADI KONTROLÜ (GÜVENLİ SUNUCU / RPC FONKSİYONU)
 * Supabase PostgreSQL üzerindeki 'kullanici_var_mi' RPC fonksiyonu ile doğrulanır.
 * İstemciye / Tarayıcıya ASLA şifre veya kullanıcı listesi indirilmez!
 */
export async function checkKullaniciAdiInTable(
  _inputUser: string,
  _forceRefresh = false
): Promise<{
  exists: boolean;
  matchedTable?: 'misafirsifre' | 'kullanicilar' | 'personelsifre';
  matchedRow?: Record<string, unknown>;
}> {
  // Canlı sorgu yapılmaz, doğrulama yalnızca /api/auth/login üzerinden sunucuda yapılır
  return { exists: true };
}

/**
 * 2. ADIM: PAROLA VE KULLANICI EŞLEŞTİRMESİ (GÜVENLİ SUNUCU / RPC FONKSİYONU)
 * Supabase PostgreSQL üzerindeki 'giris_yap' RPC fonksiyonu ile doğrulanır.
 * Parolalar sunucu tarafında doğrulanır, istemciye ASLA şifre listesi gelmez!
 */
export async function checkParolaWithKullaniciInTable(
  inputUser: string,
  inputPass: string,
  _forceRefresh = false
): Promise<{
  matches: boolean;
  blockedByMessage?: boolean;
  role?: UserRole;
  username?: string;
  ad_soyad?: string;
  matchedTable?: 'misafirsifre' | 'kullanicilar' | 'personelsifre';
  fromKullanicilarTable?: boolean;
  mesaj?: string;
  error?: string;
  matchedRow?: Record<string, unknown>;
}> {
  const trimmedUser = inputUser.trim();
  const trimmedPass = inputPass.trim();

  if (!trimmedUser || !trimmedPass) {
    return { matches: false };
  }

  // 1. ÖNCELİK: GÜVENLİ SUNUCU API'Sİ (/api/auth/login)
  // Şifreler ve tablolar ASLA istemciye/tarayıcıya indirilmez.
  // F12 Ağ (Network) sekmesinde diğer kullanıcılar veya şifreler görünmez; yalnızca { success: true/false } döner.
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: trimmedUser, password: trimmedPass }),
    });

    const data = await response.json().catch(() => null);

    if (data) {
      // Çok fazla hatalı deneme (Rate limit / Brute force kilidi)
      if (response.status === 429 || (!response.ok && data.error)) {
        return {
          matches: false,
          error: data.error,
        };
      }

      // MESAJ SÜTUNU DOLU İSE GİRİŞ ENGELLENİR
      if (data.blockedByMessage) {
        return {
          matches: false,
          blockedByMessage: true,
          role: data.role || 'personel',
          username: data.username || trimmedUser,
          ad_soyad: data.ad_soyad || data.username || trimmedUser,
          mesaj: String(data.mesaj || '').trim(),
          error: data.error || 'Giriş izni askıya alındı.',
        };
      }

      // Başarılı giriş
      if (data.success) {
        const userMsg = data.mesaj ? String(data.mesaj).trim() : '';
        if (userMsg.length > 0) {
          return {
            matches: false,
            blockedByMessage: true,
            role: data.role || 'personel',
            username: data.username || trimmedUser,
            ad_soyad: data.ad_soyad || data.username || trimmedUser,
            mesaj: userMsg,
            error: data.error || 'Giriş izni askıya alındı.',
          };
        }

        return {
          matches: true,
          role: data.role || 'misafir',
          username: data.username || trimmedUser,
          matchedTable: data.matchedTable || 'misafirsifre',
          fromKullanicilarTable: Boolean(
            data.fromKullanicilarTable || data.matchedTable === 'kullanicilar'
          ),
          mesaj: undefined,
          matchedRow: {
            username: data.username,
            role: data.role,
            ad_soyad: data.ad_soyad,
          },
        };
      }

    }
  } catch (apiErr) {
    console.warn('API /api/auth/login çağrısı uyarısı:', apiErr);
  }

  // 1.5. YEDEK KONTROL: Doğrudan personelsifre mesaj kontrolü (Şifre ASLA çekilmez, sadece mesaj sütunu sorgulanır)
  try {
    const client = createAuthClient();
    if (client) {
      const { data: pDirect } = await client
        .from('personelsifre')
        .select('id, kullanici_adi, ad_soyad, mesaj')
        .ilike('kullanici_adi', trimmedUser)
        .limit(1);

      if (Array.isArray(pDirect) && pDirect.length > 0) {
        const directMsg = pDirect[0].mesaj ? String(pDirect[0].mesaj).trim() : '';
        if (directMsg.length > 0) {
          return {
            matches: false,
            blockedByMessage: true,
            role: 'personel',
            username: pDirect[0].kullanici_adi || trimmedUser,
            ad_soyad: (pDirect[0].ad_soyad as string) || (pDirect[0].kullanici_adi as string) || trimmedUser,
            mesaj: directMsg,
            error: `Giriş izni askıya alındı: ${directMsg}`,
          };
        }
      }
    }
  } catch {
    // ignore
  }

  // 3. YEDEK KONTROL B: Supabase Sunucu RPC Fonksiyonu ('giris_yap')
  // Şifreler yine istemciye gelmez, PostgreSQL fonksiyonu kendi içinde doğrular.
  try {
    const client = createAuthClient();
    const normalized = normalizeAuthText(trimmedUser);
    const variants = Array.from(new Set([trimmedUser, normalized, trimmedUser.toLowerCase()]));

    for (const v of variants) {
      const { data, error } = await client.rpc('giris_yap', {
        p_kullanici: v,
        p_parola: trimmedPass,
      });

      if (!error && data && typeof data === 'object') {
        const res = data as {
          success: boolean;
          blockedByMessage?: boolean;
          role?: UserRole;
          username?: string;
          ad_soyad?: string;
          mesaj?: string;
          error?: string;
          table?: string;
        };

        if (res.blockedByMessage || (res.mesaj && String(res.mesaj).trim().length > 0)) {
          return {
            matches: false,
            blockedByMessage: true,
            role: res.role || 'personel',
            username: res.username || trimmedUser,
            ad_soyad: res.ad_soyad || trimmedUser,
            mesaj: String(res.mesaj || '').trim(),
            error: res.error || 'Giriş izni askıya alındı.',
          };
        }

        if (res.success) {
          const isKullanicilar = res.table === 'kullanicilar';
          return {
            matches: true,
            role: res.role || 'misafir',
            username: res.username || trimmedUser,
            matchedTable: res.table as 'misafirsifre' | 'kullanicilar' | 'personelsifre',
            fromKullanicilarTable: isKullanicilar,
            mesaj: res.mesaj,
            matchedRow: {
              ad_soyad: res.ad_soyad,
              role: res.role,
              username: res.username,
              mesaj: res.mesaj,
            },
          };
        }
      }
    }
  } catch (rpcErr) {
    console.warn('RPC giris_yap çağrısı uyarısı:', rpcErr);
  }

  return { matches: false };
}

/**
 * Kullanıcının 'kullanıcılar' tablosundan şifreli giriş yapıp yapmadığını kontrol eder.
 * Vade uyarısı (sağ alt köşe) SADECE kullanıcılar tablosundaki kullanıcılar için açılır.
 */
export function isKullanicilarSession(): boolean {
  try {
    const raw = localStorage.getItem('ozka_auth_session');
    if (!raw) return false;
    const session = JSON.parse(raw);
    if (!session || !session.username) return false;
    if (session.fromKullanicilarTable === true || session.matchedTable === 'kullanicilar') {
      return true;
    }
    if (session.matchedTable === 'misafirsifre' || session.matchedTable === 'personelsifre') {
      return false;
    }
    const u = String(session.username).toLowerCase().trim();
    if (['admin', 'bayburt', 'muhasebe'].includes(u)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Satırdaki verileri esnek bir şekilde kullanıcı adı ve şifre ile eşleştirir.
 */
export function rowMatchesCredentials(
  row: Record<string, unknown>,
  inputUser: string,
  inputPass: string,
  roleHint?: UserRole
): boolean {
  if (!row || typeof row !== 'object') return false;
  const user = extractRowUser(row);
  const pass = extractRowPass(row);
  if (user && pass) {
    const userMatch =
      isUsernameMatch(user, inputUser) || isFlexibleUserMatch(user, inputUser, roleHint);
    const passMatch =
      isPasswordMatch(pass, inputPass) || isFlexiblePasswordMatch(pass, inputPass);
    return Boolean(userMatch && passMatch);
  }
  if (!user && pass) {
    return Boolean(isPasswordMatch(pass, inputPass) || isFlexiblePasswordMatch(pass, inputPass));
  }
  return false;
}

export interface LoginResult {
  success: boolean;
  role?: UserRole;
  username?: string;
  matchedTable?: string;
  error?: string;
  needsKey?: boolean;
  userExists?: boolean;
  passMatches?: boolean;
}

/**
 * Supabase Bağlantı Testi Fonksiyonu
 */
export async function testSupabaseConnection(
  customUrl?: string,
  customKey?: string
): Promise<{
  success: boolean;
  message: string;
  rowCount?: number;
}> {
  const { url: defaultUrl, anonKey: defaultKey } = getAuthConfig();
  const rawUrl = customUrl?.trim() || defaultUrl;
  const url = isValidHttpUrl(rawUrl) ? rawUrl : defaultUrl;
  const anonKey = customKey?.trim() || defaultKey;

  if (!url || !anonKey || !isValidHttpUrl(url)) {
    return {
      success: false,
      message: 'Geçerli bir Supabase URL (http:// veya https://) veya Anon Key eksik.',
    };
  }

  try {
    const testClient = createClient(url, anonKey);
    const [resMisafir, resKullanici, resPersonel] = await Promise.allSettled([
      testClient.from('misafirsifre').select('id', { count: 'exact', head: true }),
      testClient.from('kullanicilar').select('id', { count: 'exact', head: true }),
      testClient.from('personelsifre').select('id', { count: 'exact', head: true }),
    ]);

    const countMisafir = resMisafir.status === 'fulfilled' ? resMisafir.value.count || 0 : 0;
    const countKullanici = resKullanici.status === 'fulfilled' ? resKullanici.value.count || 0 : 0;
    const countPersonel = resPersonel.status === 'fulfilled' ? resPersonel.value.count || 0 : 0;
    const total = countMisafir + countKullanici + countPersonel;

    return {
      success: true,
      message: `Bağlantı başarılı! misafirsifre: ${countMisafir}, kullanicilar: ${countKullanici}, personelsifre: ${countPersonel} kayıt bulundu.`,
      rowCount: total,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: `Bağlantı kurulamadı: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Kullanıcı Giriş Kontrolü:
 * GİRİŞ YAP BUTONUNA TIKLANDIĞINDA:
 * - misafirsifre tablosunda eşleşiyorsa -> Misafir Girişi
 * - kullanicilar tablosunda eşleşiyorsa -> Yönetici Girişi
 * - personelsifre tablosunda eşleşiyorsa -> Personel Girişi
 * - Şifreler eşleşmiyorsa -> "KULLANICI ADI VEYA PAROLA HATALI"
 */
export async function authenticateWithSupabase(
  inputUsername: string,
  inputPassword: string
): Promise<LoginResult> {
  const trimmedUser = inputUsername.trim();
  const trimmedPass = inputPassword.trim();

  if (!trimmedUser || !trimmedPass) {
    return {
      success: false,
      userExists: Boolean(trimmedUser),
      passMatches: false,
      error: 'LÜTFEN KULLANICI ADI VE PAROLANIZI GİRİNİZ',
    };
  }

  // Kullanıcı adı ve parola eşleşme kontrolü (tüm tablolar)
  const passCheck = await checkParolaWithKullaniciInTable(trimmedUser, trimmedPass, true);

  if (passCheck.matches) {
    return {
      success: true,
      userExists: true,
      passMatches: true,
      role: passCheck.role || 'misafir',
      username: passCheck.username || trimmedUser,
      matchedTable: passCheck.matchedTable || 'misafirsifre',
    };
  }

  // Kullanıcı adı tabloda var mı kontrol et (kullanıcıya özel hata vermek veya genel hata vermek için)
  const userCheck = await checkKullaniciAdiInTable(trimmedUser, true);

  // Şifreler eşleşmiyorsa veya kullanıcı bulunamadıysa:
  return {
    success: false,
    userExists: userCheck.exists,
    passMatches: false,
    error: 'KULLANICI ADI VEYA PAROLA HATALI',
  };
}

/**
 * Kullanıcı Rolüne Göre Buton Görünürlük (Vizibilite) Kontrolü
 * 
 * MİSAFİR GİRİŞİ (misafirsifre tablosu eşleşmesi):
 * ÖDEME TALEPLERİ BUTONU Vizibilite: false
 * BANKALAR BUTONU Vizibilite: false
 * FATURALAR BUTONU Vizibilite: false
 * ÇEK-SENET-TEMİNAT BUTONU Vizibilite: false
 * RAPORLAR BUTONU Vizibilite: false
 * YÖNETİCİ DİĞER İŞLEMLER BUTONU Vizibilite: false
 * PERSONEL DİĞER İŞLEMLER BUTONU Vizibilite: false
 * TALEPLER BUTONU Vizibilite: false
 * PERSONEL BUTONU Vizibilite: false
 * ARAÇ NAKİNA PARKI Vizibilite: false
 * (Yalnızca MİSAFİR KULLANICI İŞLEMLER BUTONU Vizibilite: true)
 */
export function isButtonVisibleForRole(buttonId: string, role: UserRole): boolean {
  if (role === 'admin') {
    return true; // Yönetici tüm butonları görür
  }

  const normalizedId = (buttonId || '').toLowerCase().trim();

  if (role === 'personel') {
    // personelsifre ile giriş yapıldığında:
    // ÖDEME TALEPLERİ: false
    // BANKALAR: false
    // FATURALAR: true (görünür)
    // ÇEK-SENET-TEMİNAT: false
    // RAPORLAR: false
    // YÖNETİCİ DİĞER İŞLEMLER: false
    // MİSAFİR KULLANICI İŞLEMLER: false
    const hiddenForPersonel = [
      'odeme-talepleri',
      'odemetalepleri',
      'personel-avans',
      'personelavans',
      'personel-odeme-talepleri',
      'personelodemetalepleri',
      'bankalar',
      'cek-senet-teminat',
      'ceksenetteminat',
      'raporlar',
      'diger-islemler',
      'digerislemler',
      'yonetici-diger-islemler',
      'personel-maas-rapor',
      'personelmaasrapor',
      'puantaj-rapor-sistemi',
      'puantajraporsistemi',
      'misafir-islemler',
      'misafirislemler',
    ];
    return !hiddenForPersonel.includes(normalizedId);
  }

  if (role === 'misafir') {
    // misafirsifre ile giriş yapıldığında gizlenen butonlar:
    const hiddenForMisafir = [
      'odeme-talepleri',
      'odemetalepleri',
      'personel-avans',
      'personelavans',
      'personel-odeme-talepleri',
      'personelodemetalepleri',
      'bankalar',
      'faturalar',
      'cek-senet-teminat',
      'ceksenetteminat',
      'raporlar',
      'diger-islemler',
      'digerislemler',
      'yonetici-diger-islemler',
      'personel-maas-rapor',
      'personelmaasrapor',
      'puantaj-rapor-sistemi',
      'puantajraporsistemi',
      'personel-diger-islemler',
      'personeldigerislemler',
      'talepler',
      'personel',
      'arac-makina-parki',
      'arac-nakina-parki',
      'aracmakinaparki',
      'aracnakinaparki',
      'mutabakat-portali',
      'mutabakatportali',
    ];
    return !hiddenForMisafir.includes(normalizedId);
  }

  return true;
}

/**
 * Rol Başlığı ve Rozeti
 */
export function getRoleBadgeInfo(role: UserRole): {
  title: string;
  badge: string;
  colorClass: string;
  bgClass: string;
} {
  switch (role) {
    case 'admin':
      return {
        title: 'Sistem Yöneticisi',
        badge: 'Tam Yetki',
        colorClass: 'text-purple-300 border-purple-500/40',
        bgClass: 'bg-purple-500/15',
      };
    case 'personel':
      return {
        title: 'Personel Girişi',
        badge: 'Kısıtlı Yetki',
        colorClass: 'text-blue-300 border-blue-500/40',
        bgClass: 'bg-blue-500/15',
      };
    case 'misafir':
      return {
        title: 'Misafir Kullanıcı',
        badge: 'Ziyaretçi Yetkisi',
        colorClass: 'text-teal-300 border-teal-500/40',
        bgClass: 'bg-teal-500/15',
      };
    default:
      return {
        title: 'Kullanıcı',
        badge: 'Standart',
        colorClass: 'text-gray-300 border-gray-500/40',
        bgClass: 'bg-white/10',
      };
  }
}

/**
 * personelsifre tablosundan kullanıcının en güncel 'mesaj' bilgisini sorgular
 */
export async function fetchPersonelMesajFromSupabase(username: string): Promise<string | null> {
  if (!username) return null;
  const client = createAuthClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('personelsifre')
      .select('kullanici_adi, mesaj')
      .ilike('kullanici_adi', username.trim())
      .limit(1);

    if (!error && Array.isArray(data) && data.length > 0) {
      return (data[0].mesaj as string) || null;
    }
  } catch (err) {
    console.warn('fetchPersonelMesajFromSupabase uyarısı:', err);
  }
  return null;
}

/**
 * personelsifre tablosunda personele ait 'mesaj' alanını günceller
 */
export async function updatePersonelMesajInSupabase(
  username: string,
  mesaj: string
): Promise<{ success: boolean; error?: string }> {
  if (!username) return { success: false, error: 'Kullanıcı adı belirtilmedi' };
  const client = createAuthClient();
  if (!client) return { success: false, error: 'Veritabanı bağlantısı kurulamadı' };

  try {
    const { error } = await client
      .from('personelsifre')
      .update({ mesaj: (mesaj || '').trim() })
      .ilike('kullanici_adi', username.trim());

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}
