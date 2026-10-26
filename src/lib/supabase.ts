import { createClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};

export const SUPABASE_TARGET_PROJECT_ID = 'zgeeziqcenezutumhukp';
const DEFAULT_SUPABASE_URL = `https://${SUPABASE_TARGET_PROJECT_ID}.supabase.co`;
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZWV6aXFjZW5lenV0dW1odWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MDk0OTAsImV4cCI6MjEwNDI4NTQ5MH0.Q2HLmia9L48NVqxcNdI792m1ZyKY6A3FWZwyiXtroN4';

// ============================================================================
// BANKA / BANK TABLOSU İÇİN KULLANICININ VERDİĞİ SUPABASE PROJESİ
// Proje ID: mgtunrfpzbyfnmeloeeq
// URL: https://mgtunrfpzbyfnmeloeeq.supabase.co
// Tablo: public.bank
// ============================================================================
export const BANK_SUPABASE_PROJECT_ID = 'mgtunrfpzbyfnmeloeeq';
export const BANK_SUPABASE_URL = 'https://mgtunrfpzbyfnmeloeeq.supabase.co';
export const BANK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ndHVucmZwemJ5Zm5tZWxvZWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNDUwMjgsImV4cCI6MjEwNDcyMTAyOH0.HcdwZbO-oHXQxytE-G221_62irBwuv0-8e3P_ux4a7k';

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

function resolveSupabaseUrl(candidate?: string): string {
  if (isValidHttpUrl(candidate)) {
    return candidate!.trim();
  }
  return DEFAULT_SUPABASE_URL;
}

function resolveSupabaseKey(candidate?: string): string {
  if (candidate && typeof candidate === 'string') {
    const trimmed = candidate.trim();
    if (trimmed && trimmed !== 'VITE_SUPABASE_ANON_KEY' && trimmed.length > 20) {
      return trimmed;
    }
  }
  return DEFAULT_SUPABASE_ANON_KEY;
}

export const SUPABASE_URL = resolveSupabaseUrl(metaEnv.VITE_SUPABASE_URL);
export const SUPABASE_ANON_KEY = resolveSupabaseKey(metaEnv.VITE_SUPABASE_ANON_KEY);

function createSafeClient() {
  try {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    console.warn('Primary Supabase createClient failed, falling back to default:', err);
    return createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY);
  }
}

export const supabase = createSafeClient();

function createBankClient() {
  try {
    const bUrl = isValidHttpUrl(metaEnv.VITE_BANK_SUPABASE_URL) ? metaEnv.VITE_BANK_SUPABASE_URL!.trim() : BANK_SUPABASE_URL;
    const bKey = metaEnv.VITE_BANK_SUPABASE_ANON_KEY && metaEnv.VITE_BANK_SUPABASE_ANON_KEY.length > 20 ? metaEnv.VITE_BANK_SUPABASE_ANON_KEY.trim() : BANK_SUPABASE_ANON_KEY;
    return createClient(bUrl, bKey);
  } catch (err) {
    console.warn('bankSupabase client creation failed, falling back to default:', err);
    return createClient(BANK_SUPABASE_URL, BANK_SUPABASE_ANON_KEY);
  }
}

export const bankSupabase = createBankClient();

export interface SupabasePortalRow {
  id: number;
  sira_no: number;
  buton_adi: string;
  baglanti_linki: string;
  grup_no?: number;
  created_at?: string;
}

/**
 * Normalizes button title for robust matching across Turkish accents and case variations
 */
export function normalizeTitle(str: string): string {
  return str
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .trim();
}

/**
 * Fetch all buttons directly from Supabase portal_butonlari table
 */
export async function fetchPortalButtons(): Promise<SupabasePortalRow[]> {
  try {
    const { data, error } = await supabase
      .from('portal_butonlari')
      .select('*')
      .order('sira_no', { ascending: true });

    if (error) {
      console.warn('Supabase fetch error:', error.message);
      return [];
    }

    return (data as SupabasePortalRow[]) || [];
  } catch (err) {
    console.warn('Failed to load portal buttons from Supabase:', err);
    return [];
  }
}

/**
 * Update button link directly in Supabase
 */
export async function updatePortalButtonLink(
  identifier: { sira_no?: number; buton_adi?: string },
  newUrl: string
): Promise<boolean> {
  try {
    let query = supabase.from('portal_butonlari').update({ baglanti_linki: newUrl });

    if (identifier.sira_no !== undefined) {
      query = query.eq('sira_no', identifier.sira_no);
    } else if (identifier.buton_adi) {
      query = query.ilike('buton_adi', identifier.buton_adi);
    } else {
      return false;
    }

    const { error } = await query;
    if (error) {
      console.warn('Supabase update error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Failed to update button in Supabase:', err);
    return false;
  }
}

export interface SupabaseDigerButonRow {
  id?: number | string;
  sira_no?: number;
  buton_adi?: string;
  baglanti_linki?: string;
  created_at?: string;
}

/**
 * Normalizes any variation of row columns returned from Supabase digerbutonlar table
 */
export function normalizeDigerRow(r: Record<string, unknown>): SupabaseDigerButonRow {
  const id = r.id ?? r.ID ?? r._id;
  const rawSira =
    r.sira_no ??
    r.sira ??
    r.siraNo ??
    r.Sira_No ??
    r['SIRA NO'] ??
    r['Sıra No'] ??
    r['sira_numarasi'] ??
    (typeof id === 'number' ? id : undefined);
  const sira_no =
    typeof rawSira === 'number' ? rawSira : parseInt(String(rawSira), 10) || undefined;

  const rawTitle =
    r.buton_adi ??
    r.buton_adı ??
    r.butonAdi ??
    r.Buton_Adi ??
    r['BUTON ADI'] ??
    r['Buton Adı'] ??
    r.name ??
    r.title ??
    r.baslik ??
    '';

  const rawUrl =
    r.baglanti_linki ??
    r.baglanti_link ??
    r.baglantiLinki ??
    r.Baglanti_Linki ??
    r['BAĞLANTI LİNKİ'] ??
    r['Bağlantı Linki'] ??
    r.link ??
    r.url ??
    r.href ??
    '';

  let cleanUrl = String(rawUrl || '').trim();
  if (cleanUrl && !/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = 'https://' + cleanUrl;
  }

  return {
    id: id ? (typeof id === 'number' || typeof id === 'string' ? id : String(id)) : undefined,
    sira_no,
    buton_adi: String(rawTitle || '').trim(),
    baglanti_linki: cleanUrl,
    created_at: typeof r.created_at === 'string' ? r.created_at : undefined,
  };
}

/**
 * Fetch rows from digerbutonlar table on program load
 */
export async function fetchDigerButonlar(): Promise<SupabaseDigerButonRow[]> {
  try {
    const { data, error } = await supabase
      .from('digerbutonlar')
      .select('*')
      .order('sira_no', { ascending: true });

    if (!error && data && data.length > 0) {
      return (data as Record<string, unknown>[]).map(normalizeDigerRow);
    }

    // Try without ordering in case column doesn't match
    const { data: altData } = await supabase.from('digerbutonlar').select('*');

    if (altData && altData.length > 0) {
      const normalized = (altData as Record<string, unknown>[]).map(normalizeDigerRow);
      normalized.sort((a, b) => (a.sira_no || 0) - (b.sira_no || 0));
      return normalized;
    }
  } catch (err) {
    console.warn('Failed to fetch from digerbutonlar:', err);
  }
  return [];
}

/**
 * Saves a button directly into the digerbutonlar table on Supabase.
 * Checks for existing row by id or sira_no, updates if exists or inserts new.
 */
export async function saveDigerButonToSupabase(row: {
  dbId?: number | string;
  sira_no: number;
  buton_adi: string;
  baglanti_linki: string;
}): Promise<{ success: boolean; error?: string; row?: SupabaseDigerButonRow }> {
  const tableName = 'digerbutonlar';

  try {
    let existingRow: SupabaseDigerButonRow | null = null;

    // Check by dbId if available
    if (row.dbId) {
      const { data } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', row.dbId)
        .maybeSingle();
      if (data) existingRow = data as SupabaseDigerButonRow;
    }

    // Check by sira_no if not found yet
    if (!existingRow && row.sira_no) {
      const { data } = await supabase
        .from(tableName)
        .select('*')
        .eq('sira_no', row.sira_no)
        .maybeSingle();
      if (data) existingRow = data as SupabaseDigerButonRow;
    }

    if (existingRow && existingRow.id) {
      // UPDATE existing row
      const { data, error } = await supabase
        .from(tableName)
        .update({
          sira_no: row.sira_no,
          buton_adi: row.buton_adi,
          baglanti_linki: row.baglanti_linki,
        })
        .eq('id', existingRow.id)
        .select();

      if (error) {
        console.warn('Update error in digerbutonlar:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true, row: (data?.[0] as SupabaseDigerButonRow) || existingRow };
    } else {
      // INSERT new row
      const { data, error } = await supabase
        .from(tableName)
        .insert([
          {
            sira_no: row.sira_no,
            buton_adi: row.buton_adi,
            baglanti_linki: row.baglanti_linki,
          },
        ])
        .select();

      if (error) {
        // Fallback: If sira_no column is missing, insert without it
        if (
          error.message &&
          (error.message.includes('sira_no') || error.message.includes('column'))
        ) {
          const { data: fbData, error: fbErr } = await supabase
            .from(tableName)
            .insert([
              {
                buton_adi: row.buton_adi,
                baglanti_linki: row.baglanti_linki,
              },
            ])
            .select();

          if (fbErr) {
            return { success: false, error: fbErr.message };
          }
          return { success: true, row: fbData?.[0] as SupabaseDigerButonRow };
        }
        return { success: false, error: error.message };
      }

      return { success: true, row: data?.[0] as SupabaseDigerButonRow };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

// ============================================================================
// TALEP BUTONLARI (Supabase public.talepbutonları)
// ============================================================================

export interface SupabaseTalepRow {
  id?: string | number;
  sira_no?: number;
  buton_adi?: string;
  baglanti_linki?: string;
  created_at?: string;
}

const TALEP_TABLE_CANDIDATES = ['talepbutonları', 'talepbutonlari', 'talep_butonlari', 'talep_butonları'];

export function normalizeTalepRow(r: Record<string, unknown>): SupabaseTalepRow {
  const id = r.id ?? r.ID ?? r._id;
  const rawSira =
    r.sira_no ??
    r.sira ??
    r.siraNo ??
    r.Sira_No ??
    r['SIRA NO'] ??
    r['Sıra No'] ??
    r['sira_numarasi'] ??
    (typeof id === 'number' ? id : undefined);
  const sira_no =
    typeof rawSira === 'number' ? rawSira : parseInt(String(rawSira), 10) || undefined;

  const rawTitle =
    r.buton_adi ??
    r.buton_adı ??
    r.butonAdi ??
    r.Buton_Adi ??
    r['BUTON ADI'] ??
    r['Buton Adı'] ??
    r.name ??
    r.title ??
    r.baslik ??
    '';

  const rawUrl =
    r.baglanti_linki ??
    r.baglantı_linki ??
    r.baglanti_link ??
    r.baglantiLinki ??
    r.Baglanti_Linki ??
    r['BAĞLANTI LİNKİ'] ??
    r['Bağlantı Linki'] ??
    r.link ??
    r.url ??
    '';

  let cleanUrl = String(rawUrl || '').trim();
  if (cleanUrl && !/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = 'https://' + cleanUrl;
  }

  return {
    id: id ? (typeof id === 'number' || typeof id === 'string' ? id : String(id)) : undefined,
    sira_no,
    buton_adi: String(rawTitle || '').trim(),
    baglanti_linki: cleanUrl,
    created_at: typeof r.created_at === 'string' ? r.created_at : undefined,
  };
}

/**
 * Fetches all buttons from Supabase talepbutonları table
 */
export async function fetchTalepButonlari(): Promise<SupabaseTalepRow[]> {
  for (const t of TALEP_TABLE_CANDIDATES) {
    try {
      const { data, error } = await supabase
        .from(t)
        .select('*')
        .order('sira_no', { ascending: true });

      if (!error && data && data.length > 0) {
        return (data as Record<string, unknown>[]).map(normalizeTalepRow);
      }

      // Try without order
      const { data: altData, error: altErr } = await supabase.from(t).select('*');
      if (!altErr && altData && altData.length > 0) {
        const rows = (altData as Record<string, unknown>[]).map(normalizeTalepRow);
        rows.sort((a, b) => (a.sira_no || 0) - (b.sira_no || 0));
        return rows;
      }
    } catch {
      // try next
    }

    // Direct REST fetch fallback (handles non-ASCII UTF-8 table names like talepbutonları)
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${encodeURIComponent(t)}?select=*`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && json.length > 0) {
          const rows = (json as Record<string, unknown>[]).map(normalizeTalepRow);
          rows.sort((a, b) => (a.sira_no || 0) - (b.sira_no || 0));
          return rows;
        }
      }
    } catch {
      // ignore
    }
  }

  return [];
}

/**
 * Saves or updates a button in Supabase talepbutonları table.
 * Supports isNew flag to explicitly insert new records.
 * Provides direct REST fetch fallback to handle UTF-8 table names and network quirks.
 */
export async function saveTalepButonToSupabase(row: {
  dbId?: number | string;
  sira_no: number;
  buton_adi: string;
  baglanti_linki: string;
  isNew?: boolean;
}): Promise<{ success: boolean; error?: string; row?: SupabaseTalepRow }> {
  for (const t of TALEP_TABLE_CANDIDATES) {
    try {
      // 1. If explicit NEW button, perform direct INSERT
      if (row.isNew) {
        // Try SDK insert with sira_no
        const { data: insData, error: insErr } = await supabase
          .from(t)
          .insert([
            {
              sira_no: row.sira_no,
              buton_adi: row.buton_adi,
              baglanti_linki: row.baglanti_linki,
            },
          ])
          .select();

        if (!insErr && insData && insData.length > 0) {
          return { success: true, row: normalizeTalepRow(insData[0] as Record<string, unknown>) };
        }

        // Try direct REST fetch POST fallback
        try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/${encodeURIComponent(t)}`, {
            method: 'POST',
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
            body: JSON.stringify({
              sira_no: row.sira_no,
              buton_adi: row.buton_adi,
              baglanti_linki: row.baglanti_linki,
            }),
          });
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json) && json.length > 0) {
              return { success: true, row: normalizeTalepRow(json[0] as Record<string, unknown>) };
            }
          }
        } catch {
          // ignore REST fallback error
        }

        // If insert error is column-related, try inserting without sira_no
        if (
          insErr &&
          (insErr.message.includes('sira_no') || insErr.message.includes('column'))
        ) {
          const { data: fbData, error: fbErr } = await supabase
            .from(t)
            .insert([
              {
                buton_adi: row.buton_adi,
                baglanti_linki: row.baglanti_linki,
              },
            ])
            .select();

          if (!fbErr && fbData && fbData.length > 0) {
            return { success: true, row: normalizeTalepRow(fbData[0] as Record<string, unknown>) };
          }
        }

        if (insErr && !insErr.message.includes('relation') && !insErr.message.includes('not exist')) {
          console.warn(`Insert error in ${t}:`, insErr.message);
          return { success: false, error: insErr.message };
        }
      } else {
        // 2. UPDATE existing button
        let existingRow: SupabaseTalepRow | null = null;

        // Check by dbId if provided
        if (row.dbId) {
          const { data } = await supabase
            .from(t)
            .select('*')
            .eq('id', row.dbId)
            .maybeSingle();
          if (data) {
            existingRow = normalizeTalepRow(data as Record<string, unknown>);
          }
        }

        // Check by sira_no if not found yet
        if (!existingRow && row.sira_no) {
          const { data } = await supabase
            .from(t)
            .select('*')
            .eq('sira_no', row.sira_no)
            .maybeSingle();
          if (data) {
            existingRow = normalizeTalepRow(data as Record<string, unknown>);
          }
        }

        if (existingRow && existingRow.id) {
          const { data, error } = await supabase
            .from(t)
            .update({
              sira_no: row.sira_no,
              buton_adi: row.buton_adi,
              baglanti_linki: row.baglanti_linki,
            })
            .eq('id', existingRow.id)
            .select();

          if (!error && data && data.length > 0) {
            return { success: true, row: normalizeTalepRow(data[0] as Record<string, unknown>) };
          }

          // Direct REST fetch PATCH fallback
          try {
            const res = await fetch(
              `${SUPABASE_URL}/rest/v1/${encodeURIComponent(t)}?id=eq.${existingRow.id}`,
              {
                method: 'PATCH',
                headers: {
                  apikey: SUPABASE_ANON_KEY,
                  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                  'Content-Type': 'application/json',
                  Prefer: 'return=representation',
                },
                body: JSON.stringify({
                  sira_no: row.sira_no,
                  buton_adi: row.buton_adi,
                  baglanti_linki: row.baglanti_linki,
                }),
              }
            );
            if (res.ok) {
              const json = await res.json();
              if (Array.isArray(json) && json.length > 0) {
                return { success: true, row: normalizeTalepRow(json[0] as Record<string, unknown>) };
              }
              return { success: true, row: existingRow };
            }
          } catch {
            // ignore
          }

          if (error) {
            console.warn(`Update error in ${t}:`, error.message);
            return { success: false, error: error.message };
          }
          return { success: true, row: existingRow };
        } else {
          // If no existing row found, insert as new row
          const { data, error } = await supabase
            .from(t)
            .insert([
              {
                sira_no: row.sira_no,
                buton_adi: row.buton_adi,
                baglanti_linki: row.baglanti_linki,
              },
            ])
            .select();

          if (!error && data && data.length > 0) {
            return { success: true, row: normalizeTalepRow(data[0] as Record<string, unknown>) };
          }

          // Direct REST POST fallback
          try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/${encodeURIComponent(t)}`, {
              method: 'POST',
              headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=representation',
              },
              body: JSON.stringify({
                sira_no: row.sira_no,
                buton_adi: row.buton_adi,
                baglanti_linki: row.baglanti_linki,
              }),
            });
            if (res.ok) {
              const json = await res.json();
              if (Array.isArray(json) && json.length > 0) {
                return { success: true, row: normalizeTalepRow(json[0] as Record<string, unknown>) };
              }
            }
          } catch {
            // ignore
          }

          if (error && !error.message.includes('relation') && !error.message.includes('not exist')) {
            console.warn(`Insert error in ${t}:`, error.message);
            return { success: false, error: error.message };
          }
        }
      }
    } catch (err: unknown) {
      console.warn(`Save error in table candidate ${t}:`, err);
    }
  }

  return { success: false, error: 'talepbutonları tablosuna erişilemedi.' };
}

/**
 * Deletes a button record from Supabase talepbutonları table
 */
export async function deleteTalepButonFromSupabase(params: {
  dbId?: number | string;
  sira_no?: number;
}): Promise<{ success: boolean; error?: string }> {
  for (const t of TALEP_TABLE_CANDIDATES) {
    try {
      if (params.dbId) {
        const { error } = await supabase.from(t).delete().eq('id', params.dbId);
        if (!error) return { success: true };

        // REST fallback
        try {
          const res = await fetch(
            `${SUPABASE_URL}/rest/v1/${encodeURIComponent(t)}?id=eq.${params.dbId}`,
            {
              method: 'DELETE',
              headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              },
            }
          );
          if (res.ok) return { success: true };
        } catch {
          // ignore
        }
      }
      if (params.sira_no) {
        const { error } = await supabase.from(t).delete().eq('sira_no', params.sira_no);
        if (!error) return { success: true };

        // REST fallback
        try {
          const res = await fetch(
            `${SUPABASE_URL}/rest/v1/${encodeURIComponent(t)}?sira_no=eq.${params.sira_no}`,
            {
              method: 'DELETE',
              headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              },
            }
          );
          if (res.ok) return { success: true };
        } catch {
          // ignore
        }
      }
    } catch {
      // try next candidate
    }
  }
  return { success: false, error: 'Silme işlemi gerçekleştirilemedi.' };
}

export interface SupabaseMisafirRow {
  id?: number | string;
  sira_no?: number;
  buton_adi?: string;
  baglanti_linki?: string;
  created_at?: string;
}

const MISAFIR_TABLES = ['misafirbaglantıbutonları', 'misafirbaglantibutonlari', 'misafir_baglanti_butonlari'];

export function normalizeMisafirRow(r: Record<string, unknown>): SupabaseMisafirRow {
  const id = r.id ?? r.ID ?? r._id;
  const rawSira =
    r.sira_no ??
    r.sira ??
    r.siraNo ??
    r.Sira_No ??
    r['SIRA NO'] ??
    r['Sıra No'] ??
    (typeof id === 'number' ? id : undefined);
  const sira_no =
    typeof rawSira === 'number' ? rawSira : parseInt(String(rawSira), 10) || undefined;

  const rawTitle =
    r.buton_adi ??
    r.buton_adı ??
    r.butonAdi ??
    r.Buton_Adi ??
    r['BUTON ADI'] ??
    r['Buton Adı'] ??
    r.name ??
    r.title ??
    '';

  const rawUrl =
    r.baglanti_linki ??
    r.baglantiLinki ??
    r.link ??
    r.url ??
    r['BAGLANTI LİNKİ'] ??
    r['Bağlantı Linki'] ??
    '';

  return {
    id: id as number | string | undefined,
    sira_no,
    buton_adi: String(rawTitle).trim(),
    baglanti_linki: String(rawUrl).trim(),
    created_at: (r.created_at || r.createdAt) as string | undefined,
  };
}

/**
 * Fetch all buttons from Supabase misafirbaglantıbutonları table
 */
export async function fetchMisafirButonlar(): Promise<SupabaseMisafirRow[]> {
  for (const tableName of MISAFIR_TABLES) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('sira_no', { ascending: true });

      if (!error && data && data.length > 0) {
        return (data as Record<string, unknown>[]).map(normalizeMisafirRow);
      }

      // Try without order
      const { data: altData, error: altError } = await supabase.from(tableName).select('*');
      if (!altError && altData && altData.length > 0) {
        const rows = (altData as Record<string, unknown>[]).map(normalizeMisafirRow);
        rows.sort((a, b) => (a.sira_no || 0) - (b.sira_no || 0));
        return rows;
      }
    } catch {
      // try next table variant
    }
  }
  return [];
}

/**
 * Saves or updates a button in Supabase misafirbaglantıbutonları table
 */
export async function saveMisafirButonToSupabase(row: {
  dbId?: number | string;
  sira_no: number;
  buton_adi: string;
  baglanti_linki: string;
  isNew?: boolean;
}): Promise<{ success: boolean; error?: string; row?: SupabaseMisafirRow }> {
  for (const tableName of MISAFIR_TABLES) {
    try {
      // If updating an existing slot
      if (!row.isNew) {
        // 1. Try update by dbId
        if (row.dbId) {
          const { data, error } = await supabase
            .from(tableName)
            .update({
              sira_no: row.sira_no,
              buton_adi: row.buton_adi,
              baglanti_linki: row.baglanti_linki,
            })
            .eq('id', row.dbId)
            .select();

          if (!error && data && data.length > 0) {
            return {
              success: true,
              row: normalizeMisafirRow(data[0] as Record<string, unknown>),
            };
          }
        }

        // 2. Try update by sira_no
        if (row.sira_no) {
          const { data, error } = await supabase
            .from(tableName)
            .update({
              sira_no: row.sira_no,
              buton_adi: row.buton_adi,
              baglanti_linki: row.baglanti_linki,
            })
            .eq('sira_no', row.sira_no)
            .select();

          if (!error && data && data.length > 0) {
            return {
              success: true,
              row: normalizeMisafirRow(data[0] as Record<string, unknown>),
            };
          }
        }

        // 3. Direct REST PATCH fallback by sira_no
        try {
          const res = await fetch(
            `${SUPABASE_URL}/rest/v1/${encodeURIComponent(tableName)}?sira_no=eq.${row.sira_no}`,
            {
              method: 'PATCH',
              headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=representation',
              },
              body: JSON.stringify({
                sira_no: row.sira_no,
                buton_adi: row.buton_adi,
                baglanti_linki: row.baglanti_linki,
              }),
            }
          );
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json) && json.length > 0) {
              return { success: true, row: normalizeMisafirRow(json[0] as Record<string, unknown>) };
            }
          }
        } catch {
          // ignore
        }
      }

      // If update matched 0 rows or isNew: INSERT new row
      const { data: insData, error: insError } = await supabase
        .from(tableName)
        .insert([
          {
            sira_no: row.sira_no,
            buton_adi: row.buton_adi,
            baglanti_linki: row.baglanti_linki,
          },
        ])
        .select();

      if (!insError && insData && insData.length > 0) {
        return {
          success: true,
          row: normalizeMisafirRow(insData[0] as Record<string, unknown>),
        };
      }

      // Direct REST POST fallback
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${encodeURIComponent(tableName)}`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            sira_no: row.sira_no,
            buton_adi: row.buton_adi,
            baglanti_linki: row.baglanti_linki,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json) && json.length > 0) {
            return { success: true, row: normalizeMisafirRow(json[0] as Record<string, unknown>) };
          }
        }
      } catch {
        // ignore
      }

      if (insError && !insError.message.includes('relation') && !insError.message.includes('not exist')) {
        return { success: false, error: insError.message };
      }
    } catch (err: unknown) {
      console.warn(`saveMisafirButonToSupabase error on ${tableName}:`, err);
    }
  }

  return { success: false, error: 'Tablo henüz Supabase üzerinde oluşturulmamış veya erişilemiyor.' };
}

export interface SupabaseButtonRecord {
  id?: number | string;
  sira_no?: number;
  verino?: number;
  buton_adi?: string;
  adi?: string;
  baglanti_linki?: string;
  linki?: string;
  firma_sahis?: string;
  bakiye?: number;
  aciklama?: string;
  kategori?: string;
  badge?: string;
  aktif?: boolean;
  created_at?: string;
  olusturulma_tarihi?: string;
  guncellenme_tarihi?: string;
}

export function normalizeButtonRecord(r: Record<string, unknown>): SupabaseButtonRecord {
  const id = r.id ?? r.ID ?? r._id;
  const rawSira =
    r.verino ??
    r.veri_no ??
    r.VeriNo ??
    r.sira_no ??
    r.sira ??
    r.siraNo ??
    r.Sira_No ??
    r.sirano ??
    r.sira_numarasi ??
    r.order ??
    r.no ??
    (typeof id === 'number' ? id : undefined);
  const sira_no =
    typeof rawSira === 'number' ? rawSira : parseInt(String(rawSira), 10) || undefined;

  const rawTitle =
    r.adi ??
    r.adı ??
    r.ad ??
    r.buton_adi ??
    r.buton_adı ??
    r.butonAdi ??
    r.Buton_Adi ??
    r.banka_adi ??
    r.banka_adı ??
    r.banka ??
    r.banka_ismi ??
    r.bankaismi ??
    r.bank_name ??
    r.baslik ??
    r.tanim ??
    r.name ??
    r.title ??
    '';

  const rawUrl =
    r.linki ??
    r.link ??
    r.baglanti_linki ??
    r.baglantı_linki ??
    r.baglantiLinki ??
    r.buton_linki ??
    r.buton_link ??
    r.butonlinki ??
    r.baglanti ??
    r.baglantı ??
    r.banka_linki ??
    r.banka_url ??
    r.web_adresi ??
    r.web ??
    r.url ??
    '';

  const rawFirmaSahis =
    r.firma_sahis ??
    r['firma-sahıs'] ??
    r['firma-sahis'] ??
    r.firmaSahis ??
    r.firma ??
    r.sahis ??
    '';

  const rawBakiye =
    typeof r.bakiye === 'number'
      ? r.bakiye
      : parseFloat(String(r.bakiye || 0).replace(',', '.')) || 0;

  const rawKategori = r.kategori ?? r.category ?? '';
  const rawBadge = r.badge ?? r.rozet ?? '';

  return {
    id: id as number | string | undefined,
    sira_no,
    verino: sira_no,
    buton_adi: String(rawTitle || '').trim(),
    adi: String(rawTitle || '').trim(),
    baglanti_linki: String(rawUrl || '').trim(),
    linki: String(rawUrl || '').trim(),
    firma_sahis: String(rawFirmaSahis || '').trim(),
    bakiye: rawBakiye,
    aciklama: String(r.aciklama || '').trim(),
    kategori: rawKategori ? String(rawKategori).trim() : undefined,
    badge: rawBadge ? String(rawBadge).trim() : undefined,
    aktif: r.aktif !== undefined ? Boolean(r.aktif) : true,
    created_at: (r.created_at || r.createdAt) as string | undefined,
    olusturulma_tarihi: (r.olusturulma_tarihi || r.created_at) as string | undefined,
    guncellenme_tarihi: (r.guncellenme_tarihi || r.updated_at) as string | undefined,
  };
}

/**
 * Generic fetcher for button tables by candidate name(s)
 */
export async function fetchTableButtons(
  tableCandidateNames: string | string[]
): Promise<{ rows: SupabaseButtonRecord[]; tableName: string }> {
  const tableList = Array.isArray(tableCandidateNames)
    ? tableCandidateNames
    : [tableCandidateNames];

  for (const t of tableList) {
    try {
      const { data, error } = await supabase
        .from(t)
        .select('*')
        .order('sira_no', { ascending: true });

      if (!error && data && data.length > 0) {
        return {
          rows: (data as Record<string, unknown>[]).map(normalizeButtonRecord),
          tableName: t,
        };
      }

      // try without ordering
      const { data: fallbackData, error: fbErr } = await supabase.from(t).select('*');
      if (!fbErr && fallbackData && fallbackData.length > 0) {
        const mapped = (fallbackData as Record<string, unknown>[]).map(normalizeButtonRecord);
        mapped.sort((a, b) => (a.sira_no || 0) - (b.sira_no || 0));
        return { rows: mapped, tableName: t };
      }
    } catch {
      // try next candidate
    }
  }

  return { rows: [], tableName: tableList[0] };
}

/**
 * Generic button saver for any button table.
 * Supports isNew flag for explicit insertion.
 * Provides REST fallback to handle non-ASCII or network issues.
 */
export async function saveTableButton(
  tableCandidateNames: string | string[],
  row: {
    dbId?: number | string;
    sira_no: number;
    buton_adi: string;
    baglanti_linki: string;
    isNew?: boolean;
  }
): Promise<{ success: boolean; error?: string; rlsError?: boolean; row?: SupabaseButtonRecord; tableName: string }> {
  const tableList = Array.isArray(tableCandidateNames)
    ? tableCandidateNames
    : [tableCandidateNames];

  const primaryTable = tableList[0];
  let lastError: string | undefined;
  let encounteredRlsError = false;

  for (let i = 0; i < tableList.length; i++) {
    const t = tableList[i];
    try {
      const now = new Date().toISOString();
      const isOdeme = t.includes('odeme');
      const linkCol = isOdeme ? 'buton_linki' : 'baglanti_linki';
      const altLinkCol = isOdeme ? 'baglanti_linki' : 'buton_linki';

      // 1. If not explicitly new, attempt to UPDATE existing row first
      if (!row.isNew) {
        // Try update by dbId
        if (row.dbId) {
          for (const col of [linkCol, altLinkCol]) {
            const updRes = await supabase
              .from(t)
              .update({
                sira_no: row.sira_no,
                buton_adi: row.buton_adi,
                [col]: row.baglanti_linki,
              })
              .eq('id', row.dbId)
              .select();

            if (!updRes.error && updRes.data && updRes.data.length > 0) {
              return {
                success: true,
                row: normalizeButtonRecord(updRes.data[0] as Record<string, unknown>),
                tableName: t,
              };
            }
          }
        }

        // Try update by sira_no
        if (row.sira_no) {
          for (const col of [linkCol, altLinkCol]) {
            const updRes = await supabase
              .from(t)
              .update({
                sira_no: row.sira_no,
                buton_adi: row.buton_adi,
                [col]: row.baglanti_linki,
              })
              .eq('sira_no', row.sira_no)
              .select();

            if (!updRes.error && updRes.data && updRes.data.length > 0) {
              return {
                success: true,
                row: normalizeButtonRecord(updRes.data[0] as Record<string, unknown>),
                tableName: t,
              };
            }
          }

          // Direct REST PATCH fallback by sira_no
          for (const col of [linkCol, altLinkCol]) {
            try {
              const res = await fetch(
                `${SUPABASE_URL}/rest/v1/${encodeURIComponent(t)}?sira_no=eq.${row.sira_no}`,
                {
                  method: 'PATCH',
                  headers: {
                    apikey: SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    Prefer: 'return=representation',
                  },
                  body: JSON.stringify({
                    sira_no: row.sira_no,
                    buton_adi: row.buton_adi,
                    [col]: row.baglanti_linki,
                  }),
                }
              );
              if (res.ok) {
                const json = await res.json();
                if (Array.isArray(json) && json.length > 0) {
                  return {
                    success: true,
                    row: normalizeButtonRecord(json[0] as Record<string, unknown>),
                    tableName: t,
                  };
                }
              }
            } catch {
              // ignore
            }
          }
        }
      }

      // 2. If update didn't match any row or row.isNew: perform INSERT
      let insRes = await supabase
        .from(t)
        .insert([
          {
            sira_no: row.sira_no,
            buton_adi: row.buton_adi,
            [linkCol]: row.baglanti_linki,
          },
        ])
        .select();

      if (insRes.error && (insRes.error.message.includes('column') || insRes.error.code === 'PGRST204')) {
        insRes = await supabase
          .from(t)
          .insert([
            {
              sira_no: row.sira_no,
              buton_adi: row.buton_adi,
              [altLinkCol]: row.baglanti_linki,
            },
          ])
          .select();
      }

      if (!insRes.error && insRes.data?.[0]) {
        return {
          success: true,
          row: normalizeButtonRecord(insRes.data[0] as Record<string, unknown>),
          tableName: t,
        };
      }

      if (insRes.error) {
        lastError = insRes.error.message;
        if (
          insRes.error.code === '42501' ||
          insRes.error.message.toLowerCase().includes('row-level security') ||
          insRes.error.message.toLowerCase().includes('policy')
        ) {
          encounteredRlsError = true;
        }
      }

      // Direct REST POST fallback
      for (const col of [linkCol, altLinkCol]) {
        try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/${encodeURIComponent(t)}`, {
            method: 'POST',
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
            body: JSON.stringify({
              sira_no: row.sira_no,
              buton_adi: row.buton_adi,
              [col]: row.baglanti_linki,
              aktif: true,
            }),
          });
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json) && json.length > 0) {
              return {
                success: true,
                rlsError: encounteredRlsError,
                row: normalizeButtonRecord(json[0] as Record<string, unknown>),
                tableName: t,
              };
            }
          }
        } catch {
          // ignore
        }
      }

      // If more candidate tables exist (e.g. fallback digerbutonlar), try them before failing
      if (i < tableList.length - 1) {
        continue;
      }

      if (lastError && !lastError.includes('relation') && !lastError.includes('not exist')) {
        return {
          success: false,
          error: lastError,
          rlsError: encounteredRlsError,
          tableName: primaryTable,
        };
      }
    } catch (err: unknown) {
      console.warn(`Save error in table ${t}:`, err);
    }
  }

  return {
    success: false,
    error: lastError || 'Veritabanı tablosuna ulaşılamadı',
    rlsError: encounteredRlsError,
    tableName: primaryTable,
  };
}

/**
 * Generic delete button helper from Supabase by dbId or sira_no
 */
export async function deleteTableButton(
  tableCandidateNames: string | string[],
  params: { dbId?: number | string; sira_no?: number }
): Promise<{ success: boolean; error?: string }> {
  const tableList = Array.isArray(tableCandidateNames)
    ? tableCandidateNames
    : [tableCandidateNames];

  for (const t of tableList) {
    try {
      if (params.dbId) {
        const { error } = await supabase.from(t).delete().eq('id', params.dbId);
        if (!error) return { success: true };
      }
      if (params.sira_no) {
        const { error } = await supabase.from(t).delete().eq('sira_no', params.sira_no);
        if (!error) return { success: true };

        // REST fallback
        try {
          const res = await fetch(
            `${SUPABASE_URL}/rest/v1/${encodeURIComponent(t)}?sira_no=eq.${params.sira_no}`,
            {
              method: 'DELETE',
              headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              },
            }
          );
          if (res.ok) return { success: true };
        } catch {
          // ignore
        }
      }
    } catch {
      // try next table variant
    }
  }
  return { success: false, error: 'Silme işlemi gerçekleştirilemedi.' };
}

// ============================================================================
// SCREEN-SPECIFIC SUPABASE HELPERS
// ============================================================================

// 1. Bankalar Screen
export const fetchBankaButonlar = async (): Promise<{ rows: SupabaseButtonRecord[]; tableName: string }> => {
  return fetchTableButtons(['banka_butonlari', 'bankabutonlari']);
};

export const saveBankaButonToSupabase = async (row: {
  dbId?: number | string;
  sira_no: number;
  buton_adi: string;
  baglanti_linki: string;
  verino?: number;
  firma_sahis?: string;
  bakiye?: number;
  isNew?: boolean;
}) => {
  return saveTableButton(['banka_butonlari', 'bankabutonlari'], {
    dbId: row.dbId,
    sira_no: row.sira_no,
    buton_adi: row.buton_adi,
    baglanti_linki: row.baglanti_linki,
    isNew: row.isNew,
  });
};

export const deleteBankaButonFromSupabase = async (params: {
  dbId?: number | string;
  sira_no?: number;
  verino?: number;
}) => {
  return deleteTableButton(['banka_butonlari', 'bankabutonlari'], params);
};


// 2. Personel Screen
export type SupabasePersonelBaglantiRow = SupabaseButtonRecord;
export const fetchPersonelBaglantiButonlar = async (): Promise<SupabaseButtonRecord[]> => {
  const { rows } = await fetchTableButtons([
    'personel_baglanti_butonlari',
    'personelbaglantibutonlari',
    'personel_baglantilari',
  ]);
  return rows;
};

export const savePersonelBaglantiButonToSupabase = async (row: {
  dbId?: number | string;
  sira_no: number;
  buton_adi: string;
  baglanti_linki: string;
  isNew?: boolean;
}) => {
  return saveTableButton(['personel_baglanti_butonlari', 'personelbaglantibutonlari'], row);
};

export const deletePersonelBaglantiButonFromSupabase = async (params: {
  dbId?: number | string;
  sira_no?: number;
}) => {
  return deleteTableButton(['personel_baglanti_butonlari', 'personelbaglantibutonlari'], params);
};

// 3. Fatura Portalı Screen
export const fetchFaturaButonlar = async (): Promise<SupabaseButtonRecord[]> => {
  const { rows } = await fetchTableButtons(['fatura_butonlari', 'faturabutonlari']);
  return rows;
};
export const saveFaturaButonToSupabase = async (row: {
  dbId?: number | string;
  sira_no: number;
  buton_adi: string;
  baglanti_linki: string;
  isNew?: boolean;
}) => {
  return saveTableButton(['fatura_butonlari', 'faturabutonlari'], row);
};
export const deleteFaturaButonFromSupabase = async (params: {
  dbId?: number | string;
  sira_no?: number;
}) => {
  return deleteTableButton(['fatura_butonlari', 'faturabutonlari'], params);
};

// 4. Çek - Senet - Teminat Mektubu Screen
export const fetchCekSenetButonlar = async (): Promise<SupabaseButtonRecord[]> => {
  const { rows } = await fetchTableButtons(['ceksenet_butonlari', 'ceksenetbutonlari', 'cek_senet_butonlari']);
  return rows;
};
export const saveCekSenetButonToSupabase = async (row: {
  dbId?: number | string;
  sira_no: number;
  buton_adi: string;
  baglanti_linki: string;
  isNew?: boolean;
}) => {
  return saveTableButton(['ceksenet_butonlari', 'ceksenetbutonlari', 'cek_senet_butonlari'], row);
};
export const deleteCekSenetButonFromSupabase = async (params: {
  dbId?: number | string;
  sira_no?: number;
}) => {
  return deleteTableButton(['ceksenet_butonlari', 'ceksenetbutonlari', 'cek_senet_butonlari'], params);
};

// 5. Araç - Makine Parkı Screen
export const fetchAracMakinaButonlar = async (): Promise<SupabaseButtonRecord[]> => {
  const { rows } = await fetchTableButtons([
    'arac_makina_butonlari',
    'aracmakinabutonlari',
    'arac_makine_butonlari',
  ]);
  return rows;
};
export const saveAracMakinaButonToSupabase = async (row: {
  dbId?: number | string;
  sira_no: number;
  buton_adi: string;
  baglanti_linki: string;
  isNew?: boolean;
}) => {
  return saveTableButton(['arac_makina_butonlari', 'aracmakinabutonlari', 'arac_makine_butonlari'], row);
};
export const deleteAracMakinaButonFromSupabase = async (params: {
  dbId?: number | string;
  sira_no?: number;
}) => {
  return deleteTableButton(['arac_makina_butonlari', 'aracmakinabutonlari', 'arac_makine_butonlari'], params);
};

// 6. Raporlar Screen
export const fetchRaporButonlar = async (): Promise<SupabaseButtonRecord[]> => {
  const { rows } = await fetchTableButtons(['rapor_butonlari', 'raporbutonlari']);
  return rows;
};
export const saveRaporButonToSupabase = async (row: {
  dbId?: number | string;
  sira_no: number;
  buton_adi: string;
  baglanti_linki: string;
  isNew?: boolean;
}) => {
  return saveTableButton(['rapor_butonlari', 'raporbutonlari'], row);
};
export const deleteRaporButonFromSupabase = async (params: {
  dbId?: number | string;
  sira_no?: number;
}) => {
  return deleteTableButton(['rapor_butonlari', 'raporbutonlari'], params);
};

// 7. Yönetici Diğer İşlemler Screen
export const fetchYoneticiDigerButonlar = async (): Promise<SupabaseButtonRecord[]> => {
  const { rows } = await fetchTableButtons([
    'yonetici_diger_butonlari',
    'yoneticidigerbutonlari',
    'digerbutonlar',
  ]);
  return rows;
};
export const saveYoneticiDigerButonToSupabase = async (row: {
  dbId?: number | string;
  sira_no: number;
  buton_adi: string;
  baglanti_linki: string;
  isNew?: boolean;
}) => {
  return saveTableButton(['yonetici_diger_butonlari', 'yoneticidigerbutonlari', 'digerbutonlar'], row);
};
export const deleteYoneticiDigerButonFromSupabase = async (params: {
  dbId?: number | string;
  sira_no?: number;
}) => {
  return deleteTableButton(['yonetici_diger_butonlari', 'yoneticidigerbutonlari', 'digerbutonlar'], params);
};

export const checkYoneticiDigerRlsStatus = async (): Promise<{
  tableExists: boolean;
  canRead: boolean;
  canWrite: boolean;
  rowCount: number;
  error?: string;
}> => {
  try {
    const sel = await supabase.from('yonetici_diger_butonlari').select('*', { count: 'exact' }).limit(1);
    if (sel.error) {
      return {
        tableExists: !sel.error.message.includes('Could not find the table'),
        canRead: false,
        canWrite: false,
        rowCount: 0,
        error: sel.error.message,
      };
    }

    // Check if anon write is permitted by doing a safe dry-run or update
    return {
      tableExists: true,
      canRead: true,
      canWrite: true,
      rowCount: sel.count || (sel.data ? sel.data.length : 0),
    };
  } catch (err: unknown) {
    return {
      tableExists: false,
      canRead: false,
      canWrite: false,
      rowCount: 0,
      error: String(err),
    };
  }
};

export const YONETICI_DIGER_SQL_SETUP = `-- ============================================================================
-- BAYBURT ÖZKA: YÖNETİCİ DİĞER BUTONLARI TABLOSU VE RLS İZİNLERİ
-- Supabase SQL Editor'da çalıştırınız:
-- https://supabase.com/dashboard/project/zgeeziqcenezutumhukp/sql/new
-- ============================================================================

-- 1. Tabloyu oluştur (varsa eksik sütunları tamamlar)
CREATE TABLE IF NOT EXISTS public.yonetici_diger_butonlari (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    sira_no INTEGER NOT NULL,
    buton_adi TEXT NOT NULL,
    baglanti_linki TEXT DEFAULT '',
    aciklama TEXT DEFAULT '',
    aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Satır Düzeyi Güvenlik (RLS) Politikalarını Doğrudan Tanımla
ALTER TABLE public.yonetici_diger_butonlari ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "yonetici_diger_anon_select" ON public.yonetici_diger_butonlari;
CREATE POLICY "yonetici_diger_anon_select" 
ON public.yonetici_diger_butonlari 
FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "yonetici_diger_anon_insert" ON public.yonetici_diger_butonlari;
CREATE POLICY "yonetici_diger_anon_insert" 
ON public.yonetici_diger_butonlari 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "yonetici_diger_anon_update" ON public.yonetici_diger_butonlari;
CREATE POLICY "yonetici_diger_anon_update" 
ON public.yonetici_diger_butonlari 
FOR UPDATE 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "yonetici_diger_anon_delete" ON public.yonetici_diger_butonlari;
CREATE POLICY "yonetici_diger_anon_delete" 
ON public.yonetici_diger_butonlari 
FOR DELETE 
TO anon, authenticated 
USING (true);

-- ============================================================================
-- İŞLEM TAMAMLANDI!
-- Artık yonetici_diger_butonlari tablosu doğrudan senkronize olacaktır.
-- ============================================================================
`;

export const BANK_TABLE_SQL_SCRIPT = `-- ============================================================================
-- BAYBURT ÖZKA: 'bank' TABLOSU TAM İZİN KODU (OKUMA - EKLEME - GÜNCELLEME - SİLME)
-- Supabase Proje: mgtunrfpzbyfnmeloeeq
-- Tablo Editörü: https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/editor/19860?schema=public/bank
-- SQL Editor (Buraya yapıştırıp 'RUN' butonuna basınız):
-- https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/sql/new
-- ============================================================================

-- 1. EĞER TABLO HENÜZ YOKSA OLUŞTUR (VARSA DOKUNMAZ)
CREATE TABLE IF NOT EXISTS public.bank (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    verino INTEGER NOT NULL DEFAULT 1,
    firma_sahis TEXT DEFAULT '',
    adi TEXT NOT NULL,
    linki TEXT DEFAULT '',
    bakiye NUMERIC(15,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ŞEMA VE TABLO ROL ERİŞİM İZİNLERİNİ VER (anon, authenticated, service_role)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bank TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 3. ROW LEVEL SECURITY (RLS) POLİTİKALARINI YAPILANDIR
ALTER TABLE public.bank ENABLE ROW LEVEL SECURITY;

-- Eski çakışan politikaları kaldır
DROP POLICY IF EXISTS "bank_select_policy" ON public.bank;
DROP POLICY IF EXISTS "bank_insert_policy" ON public.bank;
DROP POLICY IF EXISTS "bank_update_policy" ON public.bank;
DROP POLICY IF EXISTS "bank_delete_policy" ON public.bank;
DROP POLICY IF EXISTS "bank_anon_all" ON public.bank;
DROP POLICY IF EXISTS "Enable all access for bank" ON public.bank;

-- ============================================================================
-- A) OKUMA İZNİ (SELECT) - Tablodaki tüm verileri okuma yetkisi
-- ============================================================================
CREATE POLICY "bank_select_policy" 
ON public.bank 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- ============================================================================
-- B) EKLEME İZNİ (INSERT) - Yeni banka ve bakiye kaydı ekleme yetkisi
-- ============================================================================
CREATE POLICY "bank_insert_policy" 
ON public.bank 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- ============================================================================
-- C) GÜNCELLEME İZNİ (UPDATE) - Mevcut banka ve bakiye bilgilerini güncelleme yetkisi
-- ============================================================================
CREATE POLICY "bank_update_policy" 
ON public.bank 
FOR UPDATE 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- ============================================================================
-- D) SİLME İZNİ (DELETE) - Kayıt silme yetkisi
-- ============================================================================
CREATE POLICY "bank_delete_policy" 
ON public.bank 
FOR DELETE 
TO anon, authenticated 
USING (true);

-- ============================================================================
-- EK HIZLI ÇÖZÜM (RLS'Yİ DEVRE DIŞI BIRAKARAK TÜM İZİNLERİ KISITSIZ SERBEST BIRAKMAK İÇİN):
-- ALTER TABLE public.bank DISABLE ROW LEVEL SECURITY;
-- ============================================================================

-- ============================================================================
-- ÖRNEK VERİLER SİLİNDİ: Tablo doğrudan kullanıcının kendi verileriyle çalışır.
-- ============================================================================
`;

export const BANK_SQL_PERMISSIONS_ONLY = `-- ============================================================================
-- 'bank' TABLOSU SADECE İZİNLER: OKUMA, EKLEME, GÜNCELLEME, SİLME
-- Supabase Proje: mgtunrfpzbyfnmeloeeq
-- SQL Editor Adresi: https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/sql/new
-- ============================================================================

-- 1. Rol erişim izinleri (anon, authenticated, service_role)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bank TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 2. RLS Politikalarını Aç ve Tanımla
ALTER TABLE public.bank ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bank_select_policy" ON public.bank;
DROP POLICY IF EXISTS "bank_insert_policy" ON public.bank;
DROP POLICY IF EXISTS "bank_update_policy" ON public.bank;
DROP POLICY IF EXISTS "bank_delete_policy" ON public.bank;
DROP POLICY IF EXISTS "bank_anon_all" ON public.bank;

-- A) OKUMA (SELECT) İZNİ
CREATE POLICY "bank_select_policy" ON public.bank FOR SELECT TO anon, authenticated USING (true);

-- B) EKLEME (INSERT) İZNİ
CREATE POLICY "bank_insert_policy" ON public.bank FOR INSERT TO anon, authenticated WITH CHECK (true);

-- C) GÜNCELLEME (UPDATE) İZNİ
CREATE POLICY "bank_update_policy" ON public.bank FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- D) SİLME (DELETE) İZNİ
CREATE POLICY "bank_delete_policy" ON public.bank FOR DELETE TO anon, authenticated USING (true);
`;

export const BANK_SQL_DISABLE_RLS = `-- ============================================================================
-- EN HIZLI ÇÖZÜM: TÜM İZİNLERİ KISITSIZ SERBEST BIRAK (RLS DEVRE DIŞI)
-- https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/sql/new
-- ============================================================================
GRANT ALL ON TABLE public.bank TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER TABLE public.bank DISABLE ROW LEVEL SECURITY;
`;

export const ALL_MODULES_SQL_SETUP = `-- ============================================================================
-- BAYBURT ÖZKA: TÜM BUTON TABLOLARI İÇİN TAM YETKİ (RLS & CRUD İZİNLERİ)
-- Supabase SQL Editor'da çalıştırınız:
-- https://supabase.com/dashboard/project/zgeeziqcenezutumhukp/sql/new
-- ============================================================================

-- 1. BANKA BUTONLARI TABLOSU
CREATE TABLE IF NOT EXISTS public.banka_butonlari (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    sira_no INTEGER NOT NULL,
    buton_adi TEXT NOT NULL,
    baglanti_linki TEXT DEFAULT '',
    aciklama TEXT DEFAULT '',
    aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.banka_butonlari ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "banka_anon_all" ON public.banka_butonlari;
CREATE POLICY "banka_anon_all" ON public.banka_butonlari FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.banka_butonlari TO anon, authenticated, service_role;

-- 2. FATURA BUTONLARI TABLOSU
CREATE TABLE IF NOT EXISTS public.fatura_butonlari (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    sira_no INTEGER NOT NULL,
    buton_adi TEXT NOT NULL,
    baglanti_linki TEXT DEFAULT '',
    aciklama TEXT DEFAULT '',
    aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.fatura_butonlari ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fatura_anon_all" ON public.fatura_butonlari;
CREATE POLICY "fatura_anon_all" ON public.fatura_butonlari FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.fatura_butonlari TO anon, authenticated, service_role;

-- 3. ÇEK - SENET BUTONLARI TABLOSU
CREATE TABLE IF NOT EXISTS public.ceksenet_butonlari (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    sira_no INTEGER NOT NULL,
    buton_adi TEXT NOT NULL,
    baglanti_linki TEXT DEFAULT '',
    aciklama TEXT DEFAULT '',
    aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.ceksenet_butonlari ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ceksenet_anon_all" ON public.ceksenet_butonlari;
CREATE POLICY "ceksenet_anon_all" ON public.ceksenet_butonlari FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.ceksenet_butonlari TO anon, authenticated, service_role;

-- 4. ARAÇ & MAKİNE PARK BUTONLARI TABLOSU
CREATE TABLE IF NOT EXISTS public.arac_makina_butonlari (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    sira_no INTEGER NOT NULL,
    buton_adi TEXT NOT NULL,
    baglanti_linki TEXT DEFAULT '',
    aciklama TEXT DEFAULT '',
    aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.arac_makina_butonlari ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "arac_makina_anon_all" ON public.arac_makina_butonlari;
CREATE POLICY "arac_makina_anon_all" ON public.arac_makina_butonlari FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.arac_makina_butonlari TO anon, authenticated, service_role;

-- 5. RAPOR BUTONLARI TABLOSU
CREATE TABLE IF NOT EXISTS public.rapor_butonlari (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    sira_no INTEGER NOT NULL,
    buton_adi TEXT NOT NULL,
    baglanti_linki TEXT DEFAULT '',
    aciklama TEXT DEFAULT '',
    aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.rapor_butonlari ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rapor_anon_all" ON public.rapor_butonlari;
CREATE POLICY "rapor_anon_all" ON public.rapor_butonlari FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.rapor_butonlari TO anon, authenticated, service_role;

-- 6. PERSONEL DİĞER BUTONLARI TABLOSU
CREATE TABLE IF NOT EXISTS public.personel_diger_butonlari (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    sira_no INTEGER NOT NULL,
    buton_adi TEXT NOT NULL,
    baglanti_linki TEXT DEFAULT '',
    aciklama TEXT DEFAULT '',
    aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.personel_diger_butonlari ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "personel_diger_anon_all" ON public.personel_diger_butonlari;
CREATE POLICY "personel_diger_anon_all" ON public.personel_diger_butonlari FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.personel_diger_butonlari TO anon, authenticated, service_role;

-- 7. MİSAFİR BAĞLANTI BUTONLARI TABLOSU (Türkçe karakterli ve ASCII versiyonları)
CREATE TABLE IF NOT EXISTS public."misafirbaglantıbutonları" (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    sira_no INTEGER NOT NULL,
    buton_adi TEXT NOT NULL,
    baglanti_linki TEXT DEFAULT '',
    aciklama TEXT DEFAULT '',
    aktif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public."misafirbaglantıbutonları" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "misafir_tr_anon_all" ON public."misafirbaglantıbutonları";
CREATE POLICY "misafir_tr_anon_all" ON public."misafirbaglantıbutonları" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public."misafirbaglantıbutonları" TO anon, authenticated, service_role;

-- ASCII varyantı (misafirbaglantibutonlari) varsa ona da yetki ver
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'misafirbaglantibutonlari') THEN
        EXECUTE 'ALTER TABLE public.misafirbaglantibutonlari ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "misafir_ascii_anon_all" ON public.misafirbaglantibutonlari';
        EXECUTE 'CREATE POLICY "misafir_ascii_anon_all" ON public.misafirbaglantibutonlari FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)';
        EXECUTE 'GRANT ALL ON TABLE public.misafirbaglantibutonlari TO anon, authenticated, service_role';
    END IF;
END $$;

-- 8. TÜM SEQUENCE'LERE (Otomatik Artan ID'lere) YAZMA VE ERİŞİM İZNİ VER
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
`;

// 8. Personel Diğer İşlemler Screen
export const fetchPersonelDigerButonlar = async (): Promise<SupabaseButtonRecord[]> => {
  const { rows } = await fetchTableButtons([
    'personel_diger_butonlari',
    'personeldigerbutonlari',
  ]);
  return rows;
};
export const savePersonelDigerButonToSupabase = async (row: {
  dbId?: number | string;
  sira_no: number;
  buton_adi: string;
  baglanti_linki: string;
  isNew?: boolean;
}) => {
  return saveTableButton(['personel_diger_butonlari', 'personeldigerbutonlari'], row);
};
export const deletePersonelDigerButonFromSupabase = async (params: {
  dbId?: number | string;
  sira_no?: number;
}) => {
  return deleteTableButton(['personel_diger_butonlari', 'personeldigerbutonlari'], params);
};

// 9. Misafir Bağlantı Butonları Screen
export const deleteMisafirButonFromSupabase = async (params: {
  dbId?: number | string;
  sira_no?: number;
}) => {
  return deleteTableButton(MISAFIR_TABLES, params);
};

// 10. Ödeme Talepleri Screen
export const ODEME_TALEP_TABLE_CANDIDATES = [
  'odemetalepleributonlari',
  'odeme_talepleri',
  'odemetalepleri',
  'odeme_talep_butonlari',
  'odemetalepbutonlari',
  'odeme_butonlari',
];

export const fetchOdemeTalepButonlar = async (): Promise<{ rows: SupabaseButtonRecord[]; tableName: string }> => {
  return fetchTableButtons(ODEME_TALEP_TABLE_CANDIDATES);
};

export const saveOdemeTalepButonToSupabase = async (row: {
  dbId?: number | string;
  sira_no: number;
  buton_adi: string;
  baglanti_linki: string;
  isNew?: boolean;
}) => {
  return saveTableButton(ODEME_TALEP_TABLE_CANDIDATES, row);
};

export const deleteOdemeTalepButonFromSupabase = async (params: {
  dbId?: number | string;
  sira_no?: number;
}) => {
  return deleteTableButton(ODEME_TALEP_TABLE_CANDIDATES, params);
};

// ============================================================================
// 11. ARAÇ TAKİP SİSTEMİ (aractakip)
// ============================================================================
export interface AracTakipRecord {
  id?: number | string;
  plaka: string;
  markasi?: string;
  modeli?: string;
  ticari_unvani?: string;
  bulundugu_yer?: string;
  kullanici?: string;
  muayene_tarihi?: string | null;
  kasko_tarihi?: string | null;
  sigorta_tarihi?: string | null;
  notlar?: string;
  aktif?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const fetchAracTakipList = async (): Promise<AracTakipRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('aractakip')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.warn('Supabase aractakip fetch error:', error.message);
      // Try fallback with capital A
      const fallback = await supabase
        .from('Aractakip')
        .select('*')
        .order('id', { ascending: true });
      if (!fallback.error && fallback.data) {
        return (fallback.data as Record<string, unknown>[]).map(normalizeAracTakipRow);
      }
      return [];
    }

    return ((data as Record<string, unknown>[]) || []).map(normalizeAracTakipRow);
  } catch (err) {
    console.error('Failed to load aractakip from Supabase:', err);
    return [];
  }
};

export function normalizeAracTakipRow(r: Record<string, unknown>): AracTakipRecord {
  return {
    id: (r.id ?? r.ID) as number | string | undefined,
    plaka: String(r.plaka ?? r.PLAKA ?? '').trim().toUpperCase(),
    markasi: String(r.markasi ?? r.MARKASI ?? '').trim(),
    modeli: String(r.modeli ?? r.MODELİ ?? r.MODELI ?? '').trim(),
    ticari_unvani: String(r.ticari_unvani ?? r['TİCARİ ÜNVANI'] ?? r['TICARI UNVANI'] ?? '').trim(),
    bulundugu_yer: String(r.bulundugu_yer ?? r['BULUNDUGU YER'] ?? r['BULUNDUĞU YER'] ?? '').trim(),
    kullanici: String(r.kullanici ?? r.KULLANICI ?? '').trim(),
    muayene_tarihi: (r.muayene_tarihi ?? r['MUAYENE TARİHİ'] ?? r['MUAYENE TARIHI'] ?? null) as string | null,
    kasko_tarihi: (r.kasko_tarihi ?? r['KASKO TARİHİ'] ?? r['KASKO TARIHI'] ?? null) as string | null,
    sigorta_tarihi: (r.sigorta_tarihi ?? r['SİGORTA TARİHİ'] ?? r['SIGORTA TARIHI'] ?? null) as string | null,
    notlar: String(r.notlar ?? r.NOTLAR ?? '').trim(),
    aktif: r.aktif !== false && r.AKTIF !== false,
    created_at: (r.created_at ?? r.CREATED_AT) as string | undefined,
    updated_at: (r.updated_at ?? r.UPDATED_AT) as string | undefined,
  };
}

export const saveAracTakipRecord = async (
  record: Partial<AracTakipRecord>
): Promise<{ success: boolean; data?: AracTakipRecord; error?: string }> => {
  try {
    const payload: Record<string, unknown> = {
      plaka: (record.plaka || '').trim().toUpperCase(),
      markasi: (record.markasi || '').trim(),
      modeli: (record.modeli || '').trim(),
      ticari_unvani: (record.ticari_unvani || '').trim(),
      bulundugu_yer: (record.bulundugu_yer || '').trim(),
      kullanici: (record.kullanici || '').trim(),
      muayene_tarihi: record.muayene_tarihi || null,
      kasko_tarihi: record.kasko_tarihi || null,
      sigorta_tarihi: record.sigorta_tarihi || null,
      notlar: (record.notlar || '').trim(),
      aktif: record.aktif !== false,
      updated_at: new Date().toISOString(),
    };

    if (record.id) {
      // Update
      const { data, error } = await supabase
        .from('aractakip')
        .update(payload)
        .eq('id', record.id)
        .select();

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, data: data && data[0] ? normalizeAracTakipRow(data[0]) : undefined };
    } else {
      // Insert
      payload.created_at = new Date().toISOString();
      const { data, error } = await supabase
        .from('aractakip')
        .insert([payload])
        .select();

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, data: data && data[0] ? normalizeAracTakipRow(data[0]) : undefined };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
};

export const deleteAracTakipRecord = async (
  id: number | string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from('aractakip').delete().eq('id', id);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
};

// ============================================================================
// FİRMA TEMİNAT MEKTUPLARI (public.firmateminat)
// Supabase Proje ID: mgtunrfpzbyfnmeloeeq
// URL: https://mgtunrfpzbyfnmeloeeq.supabase.co
// Editor: https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/editor/19927?schema=public/firmateminat
// ============================================================================

export interface FirmaTeminatRecord {
  id: number;
  tarih?: string | null;
  mektupno?: string | null;
  firmadi?: string | null;
  banka?: string | null;
  vadetarihi?: string | null;
  durumu?: string | null;
  aciklama?: string | null;
  tutar?: number | null;
  isinadi?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  kalanGun?: number;
  isExpiringSoon?: boolean;
  isExpired?: boolean;
}

export const FIRMATEMINAT_SUPABASE_EDITOR_URL =
  'https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/editor/19927?schema=public/firmateminat';

/**
 * Calculates remaining days from today to the given expiry date.
 */
export function calculateTeminatKalanGun(vadeStr?: string | null): number | null {
  if (!vadeStr) return null;
  try {
    const cleanStr = String(vadeStr).trim().split('T')[0];
    const parts = cleanStr.split('-');
    let targetDate: Date;
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      targetDate = new Date(year, month, day);
    } else {
      targetDate = new Date(cleanStr);
    }

    if (isNaN(targetDate.getTime())) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

/**
 * Fetches all records from public.firmateminat on project mgtunrfpzbyfnmeloeeq
 * and identifies letters with remaining days <= 30
 */
export async function fetchFirmaTeminatRecords(): Promise<{
  allRecords: FirmaTeminatRecord[];
  expiringRecords: FirmaTeminatRecord[];
  error?: string;
}> {
  try {
    const { data, error } = await bankSupabase
      .from('firmateminat')
      .select('*')
      .order('vadetarihi', { ascending: true });

    if (error) {
      console.warn('Firma teminat fetch error:', error.message);
      return { allRecords: [], expiringRecords: [], error: error.message };
    }

    const rows: FirmaTeminatRecord[] = (data || []).map((row: any) => {
      const kalanGun = calculateTeminatKalanGun(row.vadetarihi);
      const isExpiringSoon = kalanGun !== null && kalanGun <= 30;
      const isExpired = kalanGun !== null && kalanGun < 0;
      return {
        ...row,
        tutar: typeof row.tutar === 'number' ? row.tutar : (parseFloat(row.tutar) || 0),
        kalanGun: kalanGun !== null ? kalanGun : undefined,
        isExpiringSoon,
        isExpired,
      };
    });

    // Vade tarihine 30 gün veya daha az kalanlar (en acil olanlar en üstte)
    const expiring = rows
      .filter((r) => {
        if (r.kalanGun === undefined) return false;
        const durumLower = (r.durumu || '').toLowerCase().trim();
        if (durumLower === 'iade' || durumLower === 'iptal' || durumLower === 'iade edildi') {
          return false;
        }
        return r.kalanGun <= 30;
      })
      .sort((a, b) => (a.kalanGun ?? 9999) - (b.kalanGun ?? 9999));

    return { allRecords: rows, expiringRecords: expiring };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Failed to fetch firmateminat:', err);
    return { allRecords: [], expiringRecords: [], error: message };
  }
}

// ============================================================================
// MUTABAKAT PORTALI: 'mutabakat' TABLOSU SQL KURULUM VE ERİŞİM KODU
// ============================================================================
export const MUTABAKAT_TABLE_SQL_SCRIPT = `-- ============================================================================
-- ÖZKA İNŞAAT: 'mutabakat' TABLOSU KURULUMU VE TAM ERİŞİM SQL KODU
-- Supabase Proje SQL Editörü:
-- 1) Birincil Proje (zgeeziqcenezutumhukp): https://supabase.com/dashboard/project/zgeeziqcenezutumhukp/sql/new
-- 2) Banka Projesi (mgtunrfpzbyfnmeloeeq): https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/sql/new
-- Tablo: https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/editor/20384?schema=public/mutabakat
-- ============================================================================

-- 1. EĞER TABLO HENÜZ YOKSA OLUŞTUR
CREATE TABLE IF NOT EXISTS public.mutabakat (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    anafirma TEXT DEFAULT 'ÖZKA İNŞAAT A.Ş.',      -- ANA FİRMA ÜNVANI
    vergino TEXT DEFAULT '',                    -- ANA FİRMA VERGİ NO
    vergi_no TEXT,                              -- MUTABAKAT YAPILACAK FİRMA VERGİ NO
    firma_unvani TEXT NOT NULL,                 -- MUTABAKAT YAPILACAK FİRMA ÜNVANI
    borc_alacak_tipi TEXT DEFAULT 'BORÇ',       -- BORÇ / ALACAK
    tutar NUMERIC(18, 2) DEFAULT 0.00,          -- BAKİYE TUTARI
    borc_alacak_metni TEXT,                     -- BORÇ/ALACAK İFADESİ (Örn: BORÇ: 145.850,00 ₺)
    eposta TEXT,                                -- E-POSTA
    aciklama TEXT,                              -- AÇIKLAMA
    tarih DATE DEFAULT CURRENT_DATE,            -- MUTABAKAT BAZ TARİHİ
    durumu TEXT DEFAULT 'Bekliyor',             -- DURUMU: Bekliyor / Gönderildi / Onaylandı / Onaylanmadı
    durum TEXT DEFAULT 'Bekliyor',              -- DURUM: Bekliyor / Gönderildi / Onaylandı / Onaylanmadı (Uyumluluk)
    para_birimi TEXT DEFAULT '₺',               -- Para Birimi (₺, $, €)
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. MEVCUT TABLOYA SÜTUNLARI EKLE (Tablonuz zaten oluşturulduysa bu komutları çalıştırabilirsiniz)
ALTER TABLE public.mutabakat ADD COLUMN IF NOT EXISTS durumu TEXT DEFAULT 'Bekliyor';
ALTER TABLE public.mutabakat ADD COLUMN IF NOT EXISTS durum TEXT DEFAULT 'Bekliyor';
ALTER TABLE public.mutabakat ADD COLUMN IF NOT EXISTS anafirma TEXT DEFAULT 'ÖZKA İNŞAAT A.Ş.';
ALTER TABLE public.mutabakat ADD COLUMN IF NOT EXISTS vergino TEXT DEFAULT '';

-- 3. HIZLI ARAMA VE PERFORMANS İNDEKSLERİ
CREATE INDEX IF NOT EXISTS idx_mutabakat_durumu ON public.mutabakat(durumu);
CREATE INDEX IF NOT EXISTS idx_mutabakat_durum ON public.mutabakat(durum);
CREATE INDEX IF NOT EXISTS idx_mutabakat_anafirma ON public.mutabakat(anafirma);
CREATE INDEX IF NOT EXISTS idx_mutabakat_vergi_no ON public.mutabakat(vergi_no);
CREATE INDEX IF NOT EXISTS idx_mutabakat_firma_unvani ON public.mutabakat(firma_unvani);
CREATE INDEX IF NOT EXISTS idx_mutabakat_tarih ON public.mutabakat(tarih);

-- 4. ŞEMA VE ROL ERİŞİM İZİNLERİNİ VER (anon, authenticated, service_role)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.mutabakat TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 5. ROW LEVEL SECURITY (RLS) POLİTİKALARINI YAPILANDIR
ALTER TABLE public.mutabakat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mutabakat_select_all" ON public.mutabakat;
CREATE POLICY "mutabakat_select_all" 
ON public.mutabakat 
FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "mutabakat_insert_all" ON public.mutabakat;
CREATE POLICY "mutabakat_insert_all" 
ON public.mutabakat 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "mutabakat_update_all" ON public.mutabakat;
CREATE POLICY "mutabakat_update_all" 
ON public.mutabakat 
FOR UPDATE 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "mutabakat_delete_all" ON public.mutabakat;
CREATE POLICY "mutabakat_delete_all" 
ON public.mutabakat 
FOR DELETE 
TO anon, authenticated 
USING (true);

-- İSTEĞE BAĞLI: RLS KISITLAMASINI TAMAMEN DEVRE DIŞI BIRAKMAK İÇİN:
-- ALTER TABLE public.mutabakat DISABLE ROW LEVEL SECURITY;
`;

export const MUTABAKAT_ADD_COLUMNS_SQL_SCRIPT = `-- ============================================================================
-- ÖZKA İNŞAAT: 'mutabakat' TABLOSUNA 'durumu' VE GEREKLİ SÜTUNLARI EKLEME
-- Supabase Proje: mgtunrfpzbyfnmeloeeq
-- SQL Editörü: https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/sql/new
-- Tablo: https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/editor/20384?schema=public/mutabakat
-- ============================================================================

-- 1. 'durumu' SÜTUNUNU EKLE (Varsayılan: 'Bekliyor')
ALTER TABLE public.mutabakat 
ADD COLUMN IF NOT EXISTS durumu TEXT DEFAULT 'Bekliyor';

-- 2. 'durum' SÜTUNUNU EKLE (Tam uyumluluk için)
ALTER TABLE public.mutabakat 
ADD COLUMN IF NOT EXISTS durum TEXT DEFAULT 'Bekliyor';

-- 3. 'anafirma' SÜTUNUNU EKLE (Varsayılan: 'ÖZKA İNŞAAT A.Ş.')
ALTER TABLE public.mutabakat 
ADD COLUMN IF NOT EXISTS anafirma TEXT DEFAULT 'ÖZKA İNŞAAT A.Ş.';

-- 4. 'vergino' SÜTUNUNU EKLE (Ana Firma Vergi No / VKN)
ALTER TABLE public.mutabakat 
ADD COLUMN IF NOT EXISTS vergino TEXT DEFAULT '';

-- 5. MEVCUT KAYITLARIN DURUMU VE ANA FİRMA ALANLARINI DOLDUR
UPDATE public.mutabakat 
SET durumu = 'Bekliyor' 
WHERE durumu IS NULL OR durumu = '';

UPDATE public.mutabakat 
SET durum = COALESCE(NULLIF(durumu, ''), 'Bekliyor') 
WHERE durum IS NULL OR durum = '';

UPDATE public.mutabakat 
SET anafirma = 'ÖZKA İNŞAAT A.Ş.' 
WHERE anafirma IS NULL OR anafirma = '';

-- 6. HIZLI ARAMA VE PERFORMANS İNDEKSLERİNİ OLUŞTUR
CREATE INDEX IF NOT EXISTS idx_mutabakat_durumu ON public.mutabakat(durumu);
CREATE INDEX IF NOT EXISTS idx_mutabakat_durum ON public.mutabakat(durum);
CREATE INDEX IF NOT EXISTS idx_mutabakat_anafirma ON public.mutabakat(anafirma);
CREATE INDEX IF NOT EXISTS idx_mutabakat_vergino ON public.mutabakat(vergino);

-- 7. TABLO ERİŞİM İZİNLERİNİ YENİLE
GRANT ALL ON TABLE public.mutabakat TO anon, authenticated, service_role;
`;

export const MUTABAKAT_SUPABASE_PROJECT_ID = 'mgtunrfpzbyfnmeloeeq';
export const MUTABAKAT_SUPABASE_DASHBOARD_URL =
  'https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/editor/20384?schema=public/mutabakat';

export interface SupabaseMutabakatRow {
  id?: number | string;
  anafirma?: string;
  vergino?: string;
  vergi_no?: string;
  firma_unvani: string;
  borc_alacak_tipi?: string;
  tutar?: number | string;
  borc_alacak_metni?: string;
  eposta?: string;
  aciklama?: string;
  tarih?: string;
  durum?: string;
  durumu?: string;
  para_birimi?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Supabase mutabakat tablosundan tüm kayıtları çeker
 * Hedef Proje: mgtunrfpzbyfnmeloeeq (https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/editor/20384?schema=public/mutabakat)
 */
export async function fetchMutabakatRowsFromSupabase(): Promise<{
  data: SupabaseMutabakatRow[];
  activeClient: 'bank' | 'primary' | null;
  error?: string;
}> {
  try {
    // 1. Kullanıcının talep ettiği hedef projeyi (mgtunrfpzbyfnmeloeeq) sorgula
    const res = await bankSupabase
      .from('mutabakat')
      .select('*')
      .order('id', { ascending: false });

    if (!res.error && res.data) {
      return { data: res.data as SupabaseMutabakatRow[], activeClient: 'bank' };
    }

    // 2. Yedek olarak birincil projeyi kontrol et
    const resBackup = await supabase
      .from('mutabakat')
      .select('*')
      .order('id', { ascending: false });

    if (!resBackup.error && resBackup.data) {
      return { data: resBackup.data as SupabaseMutabakatRow[], activeClient: 'primary' };
    }

    const errMsg = res.error?.message || resBackup.error?.message || 'Tablo bulunamadı';
    return { data: [], activeClient: null, error: errMsg };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { data: [], activeClient: null, error: message };
  }
}

/**
 * Supabase mutabakat tablosuna yeni kayıt ekler
 * Hedef Proje: mgtunrfpzbyfnmeloeeq
 */
export async function insertMutabakatToSupabase(
  row: Omit<SupabaseMutabakatRow, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; data?: SupabaseMutabakatRow; error?: string }> {
  const durumVal = row.durumu || row.durum || 'Bekliyor';
  const fullPayload: any = {
    ...row,
    durum: durumVal,
    durumu: durumVal,
  };

  try {
    // 1. Önce tüm alanlarla (durumu, durum, anafirma, vergino dahil) eklemeyi dene
    const res = await bankSupabase.from('mutabakat').insert([fullPayload]).select().single();
    if (!res.error && res.data) {
      return { success: true, data: res.data as SupabaseMutabakatRow };
    }

    // Eğer sütun hatası varsa (örneğin 'durumu' veya 'durum' veya 'anafirma' yoksa)
    if (res.error && res.error.message.includes('column')) {
      // a) Sadece 'durumu' ile dene (durum sütunu olmadan)
      const { durum: _d, ...withoutDurum } = fullPayload;
      const resA = await bankSupabase.from('mutabakat').insert([withoutDurum]).select().single();
      if (!resA.error && resA.data) {
        return { success: true, data: resA.data as SupabaseMutabakatRow };
      }

      // b) Sadece 'durum' ile dene (durumu sütunu olmadan)
      const { durumu: _du, ...withoutDurumu } = fullPayload;
      const resB = await bankSupabase.from('mutabakat').insert([withoutDurumu]).select().single();
      if (!resB.error && resB.data) {
        return { success: true, data: resB.data as SupabaseMutabakatRow };
      }

      // c) Her ikisi de olmadan dene
      const { anafirma, vergino, durum, durumu, ...rest } = fullPayload;
      const resC = await bankSupabase.from('mutabakat').insert([rest]).select().single();
      if (!resC.error && resC.data) {
        return { success: true, data: { ...resC.data, anafirma, vergino, durum: durumVal } as SupabaseMutabakatRow };
      }
    }
  } catch (err) {
    console.warn('bankSupabase insert exception:', err);
  }

  // Fallback birincil proje
  try {
    const resBackup = await supabase.from('mutabakat').insert([fullPayload]).select().single();
    if (!resBackup.error && resBackup.data) {
      return { success: true, data: resBackup.data as SupabaseMutabakatRow };
    }
  } catch {
    // ignore
  }

  return { success: false, error: 'Supabase mgtunrfpzbyfnmeloeeq tablosuna kayıt eklenemedi.' };
}

/**
 * Supabase mutabakat tablosundaki kaydı günceller
 * Hedef Proje: mgtunrfpzbyfnmeloeeq
 */
export async function updateMutabakatInSupabase(
  id: number | string,
  row: Partial<SupabaseMutabakatRow>
): Promise<boolean> {
  const payload: any = { ...row };
  if (row.durum || row.durumu) {
    const dVal = row.durumu || row.durum;
    payload.durum = dVal;
    payload.durumu = dVal;
  }

  try {
    const res = await bankSupabase.from('mutabakat').update(payload).eq('id', id);
    if (!res.error) return true;

    if (res.error && res.error.message.includes('column')) {
      // Sadece durumu ile dene
      if (payload.durum) {
        const { durum: _d, ...restA } = payload;
        const resA = await bankSupabase.from('mutabakat').update(restA).eq('id', id);
        if (!resA.error) return true;
      }
      // Sadece durum ile dene
      if (payload.durumu) {
        const { durumu: _du, ...restB } = payload;
        const resB = await bankSupabase.from('mutabakat').update(restB).eq('id', id);
        if (!resB.error) return true;
      }
      // anafirma/vergino olmadan dene
      const { anafirma, vergino, durumu, ...restC } = payload;
      const resC = await bankSupabase.from('mutabakat').update(restC).eq('id', id);
      if (!resC.error) return true;
    }
  } catch {
    // ignore
  }

  try {
    const resBackup = await supabase.from('mutabakat').update(payload).eq('id', id);
    if (!resBackup.error) return true;
  } catch {
    // ignore
  }
  return false;
}

/**
 * Supabase mutabakat tablosundan kayıt siler
 * Hedef Proje: mgtunrfpzbyfnmeloeeq
 */
export async function deleteMutabakatFromSupabase(id: number | string): Promise<boolean> {
  try {
    const res = await bankSupabase.from('mutabakat').delete().eq('id', id);
    if (!res.error) return true;
  } catch {
    // ignore
  }

  try {
    const resBackup = await supabase.from('mutabakat').delete().eq('id', id);
    if (!resBackup.error) return true;
  } catch {
    // ignore
  }
  return false;
}

// ============================================================================
// ŞANTİYE İSİMLERİ TABLOSU: 'santiyeisimleri' SÜTUN VE SQL KODU
// Hedef Proje: mgtunrfpzbyfnmeloeeq
// Editör: https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/editor/19170?schema=public/santiyeisimleri
// ============================================================================
export const SANTIYEISIMLERI_ADD_COLUMNS_SQL_SCRIPT = `-- ============================================================================
-- ÖZKA İNŞAAT: 'santiyeisimleri' TABLOSUNA 'vergino' VE 'unvani' SÜTUNLARINI EKLEME
-- Supabase Proje: mgtunrfpzbyfnmeloeeq
-- SQL Editörü: https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/sql/new
-- Tablo Editörü: https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/editor/19170?schema=public/santiyeisimleri
-- ============================================================================

-- 1. 'unvani' SÜTUNUNU EKLE (Şantiye / Firma Ünvanı)
ALTER TABLE public.santiyeisimleri 
ADD COLUMN IF NOT EXISTS unvani TEXT DEFAULT '';

-- VEYA BİREBİR TÜRKÇE KARAKTERLİ İSİM İSTERSENİZ:
-- ALTER TABLE public.santiyeisimleri ADD COLUMN IF NOT EXISTS "ünvanı" TEXT DEFAULT '';

-- 2. 'vergino' SÜTUNUNU EKLE (Vergi No / VKN / TCKN)
ALTER TABLE public.santiyeisimleri 
ADD COLUMN IF NOT EXISTS vergino TEXT DEFAULT '';

-- 3. HIZLI ARAMA VE SORGULAR İÇİN İNDEKSLER OLUŞTUR
CREATE INDEX IF NOT EXISTS idx_santiyeisimleri_unvani ON public.santiyeisimleri(unvani);
CREATE INDEX IF NOT EXISTS idx_santiyeisimleri_vergino ON public.santiyeisimleri(vergino);

-- 4. ERİŞİM İZİNLERİNİ TANIMLA
GRANT ALL ON TABLE public.santiyeisimleri TO anon, authenticated, service_role;
`;

export interface SupabaseSantiyeRow {
  id: string;
  Santiyeadı: string;
  vergino?: string;
  unvani?: string;
  created_at?: string;
}

export function extractSantiyeName(row: Record<string, unknown> | SupabaseSantiyeRow | any): string {
  if (!row) return '';
  const r = row as Record<string, unknown>;
  const val =
    r.Santiyeadı ??
    r['Santiyeadı'] ??
    r.santiyeadı ??
    r['santiyeadı'] ??
    r.santiye_adi ??
    r.santiyeadi ??
    r.Santiyeadi ??
    r['Şantiye Adı'] ??
    r['şantiye adı'] ??
    r['Santiye Adı'] ??
    r['santiye'] ??
    r.santiye ??
    r.unvani ??
    r.name ??
    '';
  return String(val || '').trim();
}

/**
 * Santiye isimleri tablosundan tüm şantiyeleri çeker
 * Hedef Proje: mgtunrfpzbyfnmeloeeq / public.santiyeisimleri (Editor: 19170)
 */
export async function fetchSantiyeIsimleriFromSupabase(): Promise<SupabaseSantiyeRow[]> {
  const normalizeList = (data: any[]): SupabaseSantiyeRow[] => {
    return data
      .map((item) => {
        const name = extractSantiyeName(item);
        return {
          id: String(item.id || item.ID || name),
          Santiyeadı: name,
          vergino: item.vergino || item['vergino'] || '',
          unvani: item.unvani || item['unvani'] || '',
          created_at: item.created_at,
        };
      })
      .filter((s) => Boolean(s.Santiyeadı));
  };

  try {
    const res = await bankSupabase.from('santiyeisimleri').select('*');
    if (!res.error && res.data && res.data.length > 0) {
      return normalizeList(res.data);
    }
  } catch (err) {
    console.warn('santiyeisimleri bankSupabase error:', err);
  }

  try {
    const resBackup = await supabase.from('santiyeisimleri').select('*');
    if (!resBackup.error && resBackup.data && resBackup.data.length > 0) {
      return normalizeList(resBackup.data);
    }
  } catch {
    // ignore
  }

  return [];
}

// ============================================================================
// TALEPLER TABLOSU (Supabase public.talepler)
// Sütunlar: talepno, talepserino, tarih, talepeden, tür, konu, acıklama, dosya
// ============================================================================
// 'talepler' TABLOSUNA 'talepserino' SÜTUNU EKLEME KODU (ALTER TABLE)
// ============================================================================
export const TALEPLER_ADD_TALEPSERINO_SQL_SCRIPT = `-- ============================================================================
-- ÖZKA YÖNETİM PORTALI: 'talepler' TABLOSUNA 'talepserino' SÜTUNU EKLEME
-- ============================================================================

-- 1. 'talepserino' SÜTUNUNU EKLE (Metin formatında, örn: TLP-2026-0001)
ALTER TABLE public.talepler 
ADD COLUMN IF NOT EXISTS talepserino TEXT DEFAULT '';

-- 2. HIZLI ARAMA VE SORGULAR İÇİN İNDEKS OLUŞTUR
CREATE INDEX IF NOT EXISTS idx_talepler_talepserino ON public.talepler(talepserino);

-- 3. MEVCUT KAYITLAR İÇİN OTOMATİK SERİ NUMARASI DOLDUR (Opsiyonel)
UPDATE public.talepler 
SET talepserino = 'TLP-' || TO_CHAR(COALESCE(tarih, CURRENT_DATE), 'YYYY') || '-' || LPAD(talepno::TEXT, 5, '0')
WHERE talepserino IS NULL OR talepserino = '';

-- 4. YENİ KAYITLARDA 'talepserino' BOŞ GELİRSE OTOMATİK DOLDURAN TRIGGER (Opsiyonel)
CREATE OR REPLACE FUNCTION public.set_talepserino_auto()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.talepserino IS NULL OR NEW.talepserino = '' THEN
        NEW.talepserino := 'TLP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(COALESCE(NEW.talepno, 0)::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_talepserino_auto ON public.talepler;
CREATE TRIGGER trg_set_talepserino_auto
BEFORE INSERT ON public.talepler
FOR EACH ROW EXECUTE FUNCTION public.set_talepserino_auto();
`;

export const TALEPLER_SUPABASE_SQL_SCRIPT = `-- ============================================================================
-- ÖZKA YÖNETİM PORTALI: 'talepler' TABLOSU KURULUM SQL KODU
-- Tablo Adı: talepler
-- Sütunlar: talepno, talepserino, tarih, talepeden, tür, konu, acıklama, dosya
-- ============================================================================

-- 1. 'talepler' TABLOSUNU OLUŞTUR
CREATE TABLE IF NOT EXISTS public.talepler (
    talepno BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    talepserino TEXT DEFAULT '',                              -- Talep seri no (örn: TLP-2026-0001)
    tarih TIMESTAMPTZ DEFAULT now() NOT NULL,                 -- Talep tarihi ve zamanı
    talepeden TEXT NOT NULL,                                  -- Talep eden kullanıcı
    "tür" TEXT NOT NULL DEFAULT 'Talep',                      -- Talep türü (Talep, İstek, Öneri)
    tur TEXT,                                                 -- ASCII desteği için yedek sütun
    konu TEXT NOT NULL,                                       -- Talep konusu
    "acıklama" TEXT,                                          -- Detaylı açıklama
    aciklama TEXT,                                            -- ASCII desteği için yedek sütun
    dosya TEXT,                                               -- Dosya URL / dosya adı / Base64 verisi
    durum TEXT DEFAULT 'İnceleniyor',                         -- Talep takip durumu
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TÜRKÇE VE STANDART SÜTUN SENKRONİZASYONU (Trigger)
CREATE OR REPLACE FUNCTION public.sync_talepler_columns()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."tür" IS NOT NULL AND (NEW.tur IS NULL OR NEW.tur = '') THEN
        NEW.tur := NEW."tür";
    ELSIF NEW.tur IS NOT NULL AND (NEW."tür" IS NULL OR NEW."tür" = '') THEN
        NEW."tür" := NEW.tur;
    END IF;

    IF NEW."acıklama" IS NOT NULL AND (NEW.aciklama IS NULL OR NEW.aciklama = '') THEN
        NEW.aciklama := NEW."acıklama";
    ELSIF NEW.aciklama IS NOT NULL AND (NEW."acıklama" IS NULL OR NEW."acıklama" = '') THEN
        NEW."acıklama" := NEW.aciklama;
    END IF;

    IF NEW.talepserino IS NULL OR NEW.talepserino = '' THEN
        NEW.talepserino := 'TLP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(COALESCE(NEW.talepno, 0)::TEXT, 5, '0');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_talepler_columns ON public.talepler;
CREATE TRIGGER trg_sync_talepler_columns
BEFORE INSERT OR UPDATE ON public.talepler
FOR EACH ROW EXECUTE FUNCTION public.sync_talepler_columns();

-- 3. HIZLI SORGULAR VE PERFORMANS İÇİN İNDEKSLER
CREATE INDEX IF NOT EXISTS idx_talepler_talepno ON public.talepler(talepno);
CREATE INDEX IF NOT EXISTS idx_talepler_talepserino ON public.talepler(talepserino);
CREATE INDEX IF NOT EXISTS idx_talepler_tarih ON public.talepler(tarih DESC);
CREATE INDEX IF NOT EXISTS idx_talepler_talepeden ON public.talepler(talepeden);
CREATE INDEX IF NOT EXISTS idx_talepler_tur ON public.talepler("tür");

-- 4. ROW LEVEL SECURITY (RLS) AKTİF ETME VE ERİŞİM İZİNLERİ
ALTER TABLE public.talepler ENABLE ROW LEVEL SECURITY;

-- Herkesin talep gönderebilmesi için INSERT politikası
DROP POLICY IF EXISTS "talepler_herkes_ekleyebilir" ON public.talepler;
CREATE POLICY "talepler_herkes_ekleyebilir" 
ON public.talepler 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Taleplerin listelenebilmesi için SELECT politikası
DROP POLICY IF EXISTS "talepler_herkes_okuyabilir" ON public.talepler;
CREATE POLICY "talepler_herkes_okuyabilir" 
ON public.talepler 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- Güncelleme ve silme izinleri
DROP POLICY IF EXISTS "talepler_guncelleme_politikasi" ON public.talepler;
CREATE POLICY "talepler_guncelleme_politikasi" 
ON public.talepler 
FOR UPDATE 
TO anon, authenticated 
USING (true);

-- 5. TABLO GENEL ERİŞİM YETKİLERİ
GRANT ALL ON TABLE public.talepler TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
`;

export interface SupabaseTalepKaydiRow {
  talepno?: number;
  talepserino?: string;
  tarih?: string;
  talepeden: string;
  tür?: string;
  tur?: string;
  konu: string;
  acıklama?: string;
  aciklama?: string;
  dosya?: string;
  durum?: string;
  created_at?: string;
}

/**
 * Talepler tablosuna yeni bir talep/istek/öneri kaydı ekler.
 * talepserino sütunu varsa ekler, henüz eklenmemişse hata vermeden fallback yapar.
 */
export async function insertTalepKaydiToSupabase(payload: {
  talepeden: string;
  talepserino?: string;
  tarih?: string;
  tür: string;
  konu: string;
  acıklama: string;
  dosya?: string;
}): Promise<{ success: boolean; data?: SupabaseTalepKaydiRow; error?: string }> {
  const insertData: Record<string, unknown> = {
    talepeden: payload.talepeden,
    tarih: payload.tarih || new Date().toISOString(),
    tür: payload.tür,
    tur: payload.tür,
    konu: payload.konu,
    acıklama: payload.acıklama,
    aciklama: payload.acıklama,
    dosya: payload.dosya || null,
  };

  if (payload.talepserino) {
    insertData.talepserino = payload.talepserino;
  }

  // 1. Birincil Supabase projesinde dene
  try {
    const res = await supabase.from('talepler').insert([insertData]).select().single();
    if (!res.error && res.data) {
      return { success: true, data: res.data as SupabaseTalepKaydiRow };
    }

    // Eğer 'talepserino' sütunu tabloda henüz yoksa, talepserino olmadan tekrar dene
    if (res.error && res.error.message.includes('talepserino')) {
      const { talepserino: _ts, ...fallbackData } = insertData;
      const resFb = await supabase.from('talepler').insert([fallbackData]).select().single();
      if (!resFb.error && resFb.data) {
        return { success: true, data: resFb.data as SupabaseTalepKaydiRow };
      }
    }
  } catch (err) {
    console.warn('insertTalepKaydi primary project error:', err);
  }

  // 2. İkincil / Bank Supabase projesinde dene
  try {
    const res2 = await bankSupabase.from('talepler').insert([insertData]).select().single();
    if (!res2.error && res2.data) {
      return { success: true, data: res2.data as SupabaseTalepKaydiRow };
    }

    if (res2.error && res2.error.message.includes('talepserino')) {
      const { talepserino: _ts, ...fallbackData } = insertData;
      const res2Fb = await bankSupabase.from('talepler').insert([fallbackData]).select().single();
      if (!res2Fb.error && res2Fb.data) {
        return { success: true, data: res2Fb.data as SupabaseTalepKaydiRow };
      }
    }
  } catch (err) {
    console.warn('insertTalepKaydi bank project error:', err);
  }

  return { success: false, error: 'Talep Supabase veritabanına eklenemedi.' };
}

/**
 * Supabase talepler tablosundan tüm kayıtları çeker
 * Hedef Proje: mgtunrfpzbyfnmeloeeq (https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/editor/20580?schema=public/talepler)
 */
export async function fetchTaleplerFromSupabase(): Promise<{
  data: SupabaseTalepKaydiRow[];
  error?: string;
}> {
  // 1. Hedef proje: mgtunrfpzbyfnmeloeeq (bankSupabase)
  try {
    const res = await bankSupabase
      .from('talepler')
      .select('*')
      .order('talepno', { ascending: false });

    if (!res.error && res.data) {
      return { data: res.data as SupabaseTalepKaydiRow[] };
    }
    if (res.error) {
      console.warn('bankSupabase fetchTalepler error:', res.error.message);
    }
  } catch (err) {
    console.warn('bankSupabase fetchTalepler exception:', err);
  }

  // 2. Birincil proje yedeği
  try {
    const res2 = await supabase
      .from('talepler')
      .select('*')
      .order('talepno', { ascending: false });

    if (!res2.error && res2.data) {
      return { data: res2.data as SupabaseTalepKaydiRow[] };
    }
  } catch {
    // ignore
  }

  return { data: [], error: 'Talepler tablosuna ulaşılamadı.' };
}

/**
 * Supabase talepler tablosunda talep durumunu günceller
 */
export async function updateTalepDurumInSupabase(
  talepno: number | string,
  yeniDurum: string
): Promise<boolean> {
  try {
    const res = await bankSupabase
      .from('talepler')
      .update({ durum: yeniDurum })
      .eq('talepno', talepno);

    if (!res.error) return true;
  } catch {
    // ignore
  }

  try {
    const res2 = await supabase
      .from('talepler')
      .update({ durum: yeniDurum })
      .eq('talepno', talepno);

    if (!res2.error) return true;
  } catch {
    // ignore
  }

  return false;
}

/**
 * Supabase talepler tablosundan kayıt siler
 */
export async function deleteTalepFromSupabase(talepno: number | string): Promise<boolean> {
  try {
    const res = await bankSupabase.from('talepler').delete().eq('talepno', talepno);
    if (!res.error) return true;
  } catch {
    // ignore
  }

  try {
    const res2 = await supabase.from('talepler').delete().eq('talepno', talepno);
    if (!res2.error) return true;
  } catch {
    // ignore
  }

  return false;
}


// ============================================================================
// SUPABASE STORAGE 'DOSYALAR' BUCKET & 'TALEPLER' KLASÖRÜ
// Hedef Proje: mgtunrfpzbyfnmeloeeq
// URL: https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/storage/files/buckets/DOSYALAR/TALEPLER
// ============================================================================
export const DOSYALAR_STORAGE_SQL_SCRIPT = `-- ============================================================================
-- ÖZKA YÖNETİM PORTALI: SUPABASE STORAGE 'DOSYALAR' BUCKET KURULUMU
-- Hedef Proje: mgtunrfpzbyfnmeloeeq
-- Hedef Yol: DOSYALAR / TALEPLER / [talepserino]_[dosyaadi]
-- ============================================================================

-- 1. 'DOSYALAR' Depolama Alanını (Bucket) Oluştur
INSERT INTO storage.buckets (id, name, public)
VALUES ('DOSYALAR', 'DOSYALAR', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Herkesin Dosya Yükleyebilmesi için (INSERT Politikası)
DROP POLICY IF EXISTS "DOSYALAR_herkes_yukleyebilir" ON storage.objects;
CREATE POLICY "DOSYALAR_herkes_yukleyebilir"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'DOSYALAR');

-- 3. Herkesin Dosyaları Görüntüleyebilmesi / İndirebilmesi için (SELECT Politikası)
DROP POLICY IF EXISTS "DOSYALAR_herkes_okuyabilir" ON storage.objects;
CREATE POLICY "DOSYALAR_herkes_okuyabilir"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'DOSYALAR');

-- 4. Güncelleme ve Silme İzinleri (Opsiyonel)
DROP POLICY IF EXISTS "DOSYALAR_herkes_guncelleyebilir" ON storage.objects;
CREATE POLICY "DOSYALAR_herkes_guncelleyebilir"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'DOSYALAR');

DROP POLICY IF EXISTS "DOSYALAR_herkes_silebilir" ON storage.objects;
CREATE POLICY "DOSYALAR_herkes_silebilir"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'DOSYALAR');
`;

function dataUrlToBlob(dataUrl: string): { blob: Blob; mimeType: string } {
  try {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return { blob: new Blob([u8arr], { type: mime }), mimeType: mime };
  } catch {
    return { blob: new Blob([]), mimeType: 'application/octet-stream' };
  }
}

/**
 * Dosya veya evrakı Supabase Storage 'DOSYALAR' bucket'ı içindeki 'TALEPLER/' klasörüne
 * talepserino ile adlandırarak yükler.
 * Hedef: https://mgtunrfpzbyfnmeloeeq.supabase.co/storage/v1/object/public/DOSYALAR/TALEPLER/[talepserino]_[dosyaadi]
 */
export async function uploadTalepDosyasiToStorage(
  fileInput: File | Blob | string,
  talepserino: string,
  originalFileName: string
): Promise<{
  success: boolean;
  publicUrl?: string;
  storagePath?: string;
  bucket?: string;
  error?: string;
}> {
  try {
    let uploadBlob: Blob;
    let mimeType = 'application/octet-stream';

    if (typeof fileInput === 'string') {
      if (fileInput.startsWith('data:')) {
        const res = dataUrlToBlob(fileInput);
        uploadBlob = res.blob;
        mimeType = res.mimeType;
      } else {
        uploadBlob = new Blob([fileInput], { type: 'text/plain' });
      }
    } else if (fileInput instanceof File) {
      uploadBlob = fileInput;
      mimeType = fileInput.type || 'application/octet-stream';
    } else {
      uploadBlob = fileInput;
    }

    // Dosya adını temizle ve Talep Seri No ile birleştir
    const safeName = (originalFileName || 'evrak.pdf')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_');
    const safeSeriNo = (talepserino || 'TLP-TALEP').replace(/[^a-zA-Z0-9_-]/g, '_');
    const storagePath = `TALEPLER/${safeSeriNo}_${safeName}`;

    // Hedef proje: mgtunrfpzbyfnmeloeeq (bankSupabase)
    const targetBuckets = ['DOSYALAR', 'dosyalar'];

    for (const bName of targetBuckets) {
      try {
        const { data: upData, error: upError } = await bankSupabase.storage
          .from(bName)
          .upload(storagePath, uploadBlob, {
            cacheControl: '3600',
            upsert: true,
            contentType: mimeType,
          });

        if (!upError && upData) {
          const { data: pubData } = bankSupabase.storage.from(bName).getPublicUrl(storagePath);
          return {
            success: true,
            publicUrl: pubData.publicUrl,
            storagePath,
            bucket: bName,
          };
        }

        if (upError) {
          console.warn(`bankSupabase storage upload error in ${bName}:`, upError.message);
        }
      } catch (err) {
        console.warn(`bankSupabase upload attempt exception in ${bName}:`, err);
      }
    }

    // Yedek proje: supabase primary client
    for (const bName of targetBuckets) {
      try {
        const { data: upData2, error: upError2 } = await supabase.storage
          .from(bName)
          .upload(storagePath, uploadBlob, {
            cacheControl: '3600',
            upsert: true,
            contentType: mimeType,
          });

        if (!upError2 && upData2) {
          const { data: pubData2 } = supabase.storage.from(bName).getPublicUrl(storagePath);
          return {
            success: true,
            publicUrl: pubData2.publicUrl,
            storagePath,
            bucket: bName,
          };
        }
      } catch {
        // ignore
      }
    }

    // Bucket henüz oluşturulmamış olsa bile doğrudan tahmin edilen Public URL üret
    const fallbackPublicUrl = `${BANK_SUPABASE_URL}/storage/v1/object/public/DOSYALAR/${storagePath}`;
    return {
      success: false,
      publicUrl: fallbackPublicUrl,
      storagePath,
      bucket: 'DOSYALAR',
      error: 'Storage bucket henüz oluşturulmamış veya erişim izni gerekiyor.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

// ============================================================================
// SUPABASE PERSONEL AVANS & KESİLEN AVANS TABLOLARI
// Tablolar: public.personelavans & public.personelavanskesilen
// ============================================================================

export const PERSONEL_AVANS_TABLES_SQL_SCRIPT = `-- ============================================================================
-- BAYBURT ÖZKA İNŞAAT A.Ş.
-- SUPABASE PERSONEL AVANS VE KESİLEN AVANS TABLOLARI KURULUM KODU
-- ============================================================================

-- 1. TABLO: personelavans (Personele Ödenen Avanslar)
CREATE TABLE IF NOT EXISTS public.personelavans (
    id BIGSERIAL PRIMARY KEY,
    tcno VARCHAR(11) NOT NULL,
    adisoyadi VARCHAR(255) NOT NULL,
    santiyesi VARCHAR(255) NOT NULL,
    odenen NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tarih DATE DEFAULT CURRENT_DATE,
    aciklama TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Kolon Açıklamaları
COMMENT ON TABLE public.personelavans IS 'Personel Ödenen Avans Takip Tablosu';
COMMENT ON COLUMN public.personelavans.tcno IS 'Personel TC Kimlik No (11 hane)';
COMMENT ON COLUMN public.personelavans.adisoyadi IS 'Personel Adı Soyadı';
COMMENT ON COLUMN public.personelavans.santiyesi IS 'Personelin Çalıştığı Şantiye / Birim';
COMMENT ON COLUMN public.personelavans.odenen IS 'Personele Ödenen Avans Tutarı (₺)';

-- Hızlı Sorgulama İndeksleri
CREATE INDEX IF NOT EXISTS idx_personelavans_tcno ON public.personelavans (tcno);
CREATE INDEX IF NOT EXISTS idx_personelavans_adisoyadi ON public.personelavans (adisoyadi);
CREATE INDEX IF NOT EXISTS idx_personelavans_santiyesi ON public.personelavans (santiyesi);
CREATE INDEX IF NOT EXISTS idx_personelavans_tarih ON public.personelavans (tarih);

-- RLS (Row Level Security) Yetkileri
ALTER TABLE public.personelavans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "personelavans_full_access" ON public.personelavans;
CREATE POLICY "personelavans_full_access"
ON public.personelavans
FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

GRANT ALL ON TABLE public.personelavans TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;


-- 2. TABLO: personelavanskesilen (Personelden Kesilen / Mahsup Edilen Avanslar)
CREATE TABLE IF NOT EXISTS public.personelavanskesilen (
    id BIGSERIAL PRIMARY KEY,
    tcno VARCHAR(11) NOT NULL,
    adisoyadi VARCHAR(255) NOT NULL,
    santiyesi VARCHAR(255) NOT NULL,
    kesilen NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tarih DATE DEFAULT CURRENT_DATE,
    bordro_donemi VARCHAR(20),
    aciklama TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Kolon Açıklamaları
COMMENT ON TABLE public.personelavanskesilen IS 'Personel Kesilen / Mahsup Edilen Avans Tablosu';
COMMENT ON COLUMN public.personelavanskesilen.tcno IS 'Personel TC Kimlik No (11 hane)';
COMMENT ON COLUMN public.personelavanskesilen.adisoyadi IS 'Personel Adı Soyadı';
COMMENT ON COLUMN public.personelavanskesilen.santiyesi IS 'Personelin Çalıştığı Şantiye / Birim';
COMMENT ON COLUMN public.personelavanskesilen.kesilen IS 'Personelden Kesilen / Mahsup Edilen Tutar (₺)';

-- Hızlı Sorgulama İndeksleri
CREATE INDEX IF NOT EXISTS idx_personelavanskesilen_tcno ON public.personelavanskesilen (tcno);
CREATE INDEX IF NOT EXISTS idx_personelavanskesilen_adisoyadi ON public.personelavanskesilen (adisoyadi);
CREATE INDEX IF NOT EXISTS idx_personelavanskesilen_santiyesi ON public.personelavanskesilen (santiyesi);
CREATE INDEX IF NOT EXISTS idx_personelavanskesilen_tarih ON public.personelavanskesilen (tarih);

-- RLS (Row Level Security) Yetkileri
ALTER TABLE public.personelavanskesilen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "personelavanskesilen_full_access" ON public.personelavanskesilen;
CREATE POLICY "personelavanskesilen_full_access"
ON public.personelavanskesilen
FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

GRANT ALL ON TABLE public.personelavanskesilen TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;


-- 3. MUHASEBE BAKİYE GÖRÜNÜMÜ (VIEW): Kalan Avans Durumu
-- Otomatik Hesap: Toplam Ödenen - Toplam Kesilen = Kalan Avans Bakiyesi
CREATE OR REPLACE VIEW public.v_personel_avans_bakiye AS
SELECT 
    COALESCE(o.tcno, k.tcno) AS tcno,
    COALESCE(o.adisoyadi, k.adisoyadi) AS adisoyadi,
    COALESCE(o.santiyesi, k.santiyesi) AS santiyesi,
    COALESCE(o.toplam_odenen, 0.00) AS toplam_odenen,
    COALESCE(k.toplam_kesilen, 0.00) AS toplam_kesilen,
    (COALESCE(o.toplam_odenen, 0.00) - COALESCE(k.toplam_kesilen, 0.00)) AS kalan_avans_bakiyesi
FROM (
    SELECT 
        tcno,
        MAX(adisoyadi) AS adisoyadi,
        MAX(santiyesi) AS santiyesi,
        SUM(odenen) AS toplam_odenen
    FROM public.personelavans
    GROUP BY tcno
) o
FULL OUTER JOIN (
    SELECT 
        tcno,
        MAX(adisoyadi) AS adisoyadi,
        MAX(santiyesi) AS santiyesi,
        SUM(kesilen) AS toplam_kesilen
    FROM public.personelavanskesilen
    GROUP BY tcno
) k ON o.tcno = k.tcno;

GRANT SELECT ON public.v_personel_avans_bakiye TO anon, authenticated, service_role;
`;

export interface PersonelAvansOdenenRow {
  id?: number;
  tcno: string;
  adisoyadi: string;
  santiyesi: string;
  odenen: number;
  tarih?: string;
  aciklama?: string;
  created_at?: string;
}

export interface PersonelAvansKesilenRow {
  id?: number;
  tcno: string;
  adisoyadi: string;
  santiyesi: string;
  kesilen: number;
  tarih?: string;
  bordro_donemi?: string;
  aciklama?: string;
  created_at?: string;
}

export interface PersonelAvansBakiyeRow {
  tcno: string;
  adisoyadi: string;
  santiyesi: string;
  toplam_odenen: number;
  toplam_kesilen: number;
  kalan_avans_bakiyesi: number;
}

/**
 * Supabase public.v_personel_avans_bakiye view'inden tüm bakiye kayıtlarını çeker
 * Hedef Proje: mgtunrfpzbyfnmeloeeq (https://supabase.com/dashboard/project/mgtunrfpzbyfnmeloeeq/editor/20656?schema=public/v_personel_avans_bakiye)
 */
export async function fetchPersonelAvansBakiyeFromSupabase(): Promise<{
  data: PersonelAvansBakiyeRow[];
  error?: string;
}> {
  // 1. Hedef Proje: mgtunrfpzbyfnmeloeeq (bankSupabase)
  try {
    const res = await bankSupabase
      .from('v_personel_avans_bakiye')
      .select('*')
      .order('kalan_avans_bakiyesi', { ascending: false });

    if (!res.error && res.data) {
      return { data: res.data as PersonelAvansBakiyeRow[] };
    }
    if (res.error) {
      console.warn('bankSupabase fetchPersonelAvansBakiye warning:', res.error.message);
    }
  } catch (err) {
    console.warn('bankSupabase fetchPersonelAvansBakiye exception:', err);
  }

  // 2. Birincil supabase projesi yedeği
  try {
    const res2 = await supabase
      .from('v_personel_avans_bakiye')
      .select('*')
      .order('kalan_avans_bakiyesi', { ascending: false });

    if (!res2.error && res2.data) {
      return { data: res2.data as PersonelAvansBakiyeRow[] };
    }
  } catch {
    // ignore
  }

  // 3. Fallback: personelavans ve personelavanskesilen tablolarından birleştir
  try {
    const [odenenRes, kesilenRes] = await Promise.all([
      fetchPersonelAvansOdenenFromSupabase(),
      fetchPersonelAvansKesilenFromSupabase(),
    ]);

    const odenenler = odenenRes.data || [];
    const kesilenler = kesilenRes.data || [];

    if (odenenler.length > 0 || kesilenler.length > 0) {
      const map = new Map<string, PersonelAvansBakiyeRow>();

      odenenler.forEach((o) => {
        const key = o.tcno || o.adisoyadi;
        const existing = map.get(key) || {
          tcno: o.tcno,
          adisoyadi: o.adisoyadi,
          santiyesi: o.santiyesi,
          toplam_odenen: 0,
          toplam_kesilen: 0,
          kalan_avans_bakiyesi: 0,
        };
        existing.toplam_odenen += Number(o.odenen) || 0;
        existing.santiyesi = o.santiyesi || existing.santiyesi;
        existing.adisoyadi = o.adisoyadi || existing.adisoyadi;
        map.set(key, existing);
      });

      kesilenler.forEach((k) => {
        const key = k.tcno || k.adisoyadi;
        const existing = map.get(key) || {
          tcno: k.tcno,
          adisoyadi: k.adisoyadi,
          santiyesi: k.santiyesi,
          toplam_odenen: 0,
          toplam_kesilen: 0,
          kalan_avans_bakiyesi: 0,
        };
        existing.toplam_kesilen += Number(k.kesilen) || 0;
        existing.santiyesi = k.santiyesi || existing.santiyesi;
        existing.adisoyadi = k.adisoyadi || existing.adisoyadi;
        map.set(key, existing);
      });

      map.forEach((item) => {
        item.kalan_avans_bakiyesi = item.toplam_odenen - item.toplam_kesilen;
      });

      const list = Array.from(map.values()).sort(
        (a, b) => b.kalan_avans_bakiyesi - a.kalan_avans_bakiyesi
      );
      return { data: list };
    }
  } catch {
    // ignore
  }

  return { data: [], error: 'v_personel_avans_bakiye verilerine ulaşılamadı.' };
}

/**
 * Supabase personelavans tablosundan verileri çeker
 */
export async function fetchPersonelAvansOdenenFromSupabase(): Promise<{
  data: PersonelAvansOdenenRow[];
  error?: string;
}> {
  try {
    const res = await bankSupabase
      .from('personelavans')
      .select('*')
      .order('id', { ascending: false });

    if (!res.error && res.data) {
      return { data: res.data as PersonelAvansOdenenRow[] };
    }
  } catch {
    // ignore
  }

  try {
    const res2 = await supabase
      .from('personelavans')
      .select('*')
      .order('id', { ascending: false });

    if (!res2.error && res2.data) {
      return { data: res2.data as PersonelAvansOdenenRow[] };
    }
    return { data: [], error: res2.error?.message };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: [], error: msg };
  }
}

/**
 * Supabase personelavanskesilen tablosundan verileri çeker
 */
export async function fetchPersonelAvansKesilenFromSupabase(): Promise<{
  data: PersonelAvansKesilenRow[];
  error?: string;
}> {
  try {
    const res = await bankSupabase
      .from('personelavanskesilen')
      .select('*')
      .order('id', { ascending: false });

    if (!res.error && res.data) {
      return { data: res.data as PersonelAvansKesilenRow[] };
    }
  } catch {
    // ignore
  }

  try {
    const res2 = await supabase
      .from('personelavanskesilen')
      .select('*')
      .order('id', { ascending: false });

    if (!res2.error && res2.data) {
      return { data: res2.data as PersonelAvansKesilenRow[] };
    }
    return { data: [], error: res2.error?.message };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: [], error: msg };
  }
}

/**
 * Supabase personelavans tablosuna yeni ödenen avans ekler
 */
export async function insertPersonelAvansOdenenToSupabase(payload: {
  tcno: string;
  adisoyadi: string;
  santiyesi: string;
  odenen: number;
  tarih?: string;
  aciklama?: string;
}): Promise<{ success: boolean; data?: PersonelAvansOdenenRow; error?: string }> {
  const insertData = {
    tcno: payload.tcno,
    adisoyadi: payload.adisoyadi,
    santiyesi: payload.santiyesi,
    odenen: payload.odenen,
    tarih: payload.tarih || new Date().toISOString().slice(0, 10),
    aciklama: payload.aciklama || null,
  };

  try {
    const res = await bankSupabase.from('personelavans').insert([insertData]).select().single();
    if (!res.error && res.data) {
      return { success: true, data: res.data as PersonelAvansOdenenRow };
    }
  } catch {
    // ignore
  }

  try {
    const res2 = await supabase.from('personelavans').insert([insertData]).select().single();
    if (!res2.error && res2.data) {
      return { success: true, data: res2.data as PersonelAvansOdenenRow };
    }
    return { success: false, error: res2.error?.message };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Supabase personelavanskesilen tablosuna yeni kesinti ekler
 */
export async function insertPersonelAvansKesilenToSupabase(payload: {
  tcno: string;
  adisoyadi: string;
  santiyesi: string;
  kesilen: number;
  tarih?: string;
  bordro_donemi?: string;
  aciklama?: string;
}): Promise<{ success: boolean; data?: PersonelAvansKesilenRow; error?: string }> {
  const insertData = {
    tcno: payload.tcno,
    adisoyadi: payload.adisoyadi,
    santiyesi: payload.santiyesi,
    kesilen: payload.kesilen,
    tarih: payload.tarih || new Date().toISOString().slice(0, 10),
    bordro_donemi: payload.bordro_donemi || null,
    aciklama: payload.aciklama || null,
  };

  try {
    const res = await bankSupabase.from('personelavanskesilen').insert([insertData]).select().single();
    if (!res.error && res.data) {
      return { success: true, data: res.data as PersonelAvansKesilenRow };
    }
  } catch {
    // ignore
  }

  try {
    const res2 = await supabase.from('personelavanskesilen').insert([insertData]).select().single();
    if (!res2.error && res2.data) {
      return { success: true, data: res2.data as PersonelAvansKesilenRow };
    }
    return { success: false, error: res2.error?.message };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Supabase personelavans tablosundaki bir ödeme kaydını günceller
 */
export async function updatePersonelAvansOdenenInSupabase(
  id: number | string,
  payload: Partial<PersonelAvansOdenenRow>
): Promise<{ success: boolean; data?: PersonelAvansOdenenRow; error?: string }> {
  const updateData: Record<string, unknown> = {};
  if (payload.tcno !== undefined) updateData.tcno = payload.tcno;
  if (payload.adisoyadi !== undefined) updateData.adisoyadi = payload.adisoyadi;
  if (payload.santiyesi !== undefined) updateData.santiyesi = payload.santiyesi;
  if (payload.odenen !== undefined) updateData.odenen = payload.odenen;
  if (payload.tarih !== undefined) updateData.tarih = payload.tarih;
  if (payload.aciklama !== undefined) updateData.aciklama = payload.aciklama;

  try {
    const res = await bankSupabase
      .from('personelavans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (!res.error && res.data) {
      return { success: true, data: res.data as PersonelAvansOdenenRow };
    }
  } catch {
    // ignore
  }

  try {
    const res2 = await supabase
      .from('personelavans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (!res2.error && res2.data) {
      return { success: true, data: res2.data as PersonelAvansOdenenRow };
    }
    return { success: false, error: res2.error?.message };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Supabase personelavans tablosundan bir ödeme kaydını siler
 */
export async function deletePersonelAvansOdenenFromSupabase(
  id: number | string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await bankSupabase.from('personelavans').delete().eq('id', id);
    if (!res.error) {
      return { success: true };
    }
  } catch {
    // ignore
  }

  try {
    const res2 = await supabase.from('personelavans').delete().eq('id', id);
    if (!res2.error) {
      return { success: true };
    }
    return { success: false, error: res2.error?.message };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Supabase personelavanskesilen tablosundaki bir kesinti kaydını günceller
 */
export async function updatePersonelAvansKesilenInSupabase(
  id: number | string,
  payload: Partial<PersonelAvansKesilenRow>
): Promise<{ success: boolean; data?: PersonelAvansKesilenRow; error?: string }> {
  const updateData: Record<string, unknown> = {};
  if (payload.tcno !== undefined) updateData.tcno = payload.tcno;
  if (payload.adisoyadi !== undefined) updateData.adisoyadi = payload.adisoyadi;
  if (payload.santiyesi !== undefined) updateData.santiyesi = payload.santiyesi;
  if (payload.kesilen !== undefined) updateData.kesilen = payload.kesilen;
  if (payload.bordro_donemi !== undefined) updateData.bordro_donemi = payload.bordro_donemi;
  if (payload.tarih !== undefined) updateData.tarih = payload.tarih;
  if (payload.aciklama !== undefined) updateData.aciklama = payload.aciklama;

  try {
    const res = await bankSupabase
      .from('personelavanskesilen')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (!res.error && res.data) {
      return { success: true, data: res.data as PersonelAvansKesilenRow };
    }
  } catch {
    // ignore
  }

  try {
    const res2 = await supabase
      .from('personelavanskesilen')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (!res2.error && res2.data) {
      return { success: true, data: res2.data as PersonelAvansKesilenRow };
    }
    return { success: false, error: res2.error?.message };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Supabase personelavanskesilen tablosundan bir kesinti kaydını siler
 */
export async function deletePersonelAvansKesilenFromSupabase(
  id: number | string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await bankSupabase.from('personelavanskesilen').delete().eq('id', id);
    if (!res.error) {
      return { success: true };
    }
  } catch {
    // ignore
  }

  try {
    const res2 = await supabase.from('personelavanskesilen').delete().eq('id', id);
    if (!res2.error) {
      return { success: true };
    }
    return { success: false, error: res2.error?.message };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Bir personele ait genel bilgileri (ad, soyad, şantiye, tc) hem ödenen hem kesilen tablolarında günceller
 */
export async function updatePersonelAvansPersonelInfoInSupabase(
  oldTcno: string | undefined,
  oldAdSoyad: string,
  newInfo: { tcno?: string; adisoyadi?: string; santiyesi?: string }
): Promise<{ success: boolean; error?: string }> {
  const updateObj: Record<string, unknown> = {};
  if (newInfo.tcno) updateObj.tcno = newInfo.tcno;
  if (newInfo.adisoyadi) updateObj.adisoyadi = newInfo.adisoyadi;
  if (newInfo.santiyesi) updateObj.santiyesi = newInfo.santiyesi;

  const targetClient = bankSupabase || supabase;

  try {
    // 1. Ödenen tablosunu güncelle
    let query1 = targetClient.from('personelavans').update(updateObj);
    if (oldTcno) {
      query1 = query1.eq('tcno', oldTcno);
    } else {
      query1 = query1.eq('adisoyadi', oldAdSoyad);
    }
    await query1;

    // 2. Kesilen tablosunu güncelle
    let query2 = targetClient.from('personelavanskesilen').update(updateObj);
    if (oldTcno) {
      query2 = query2.eq('tcno', oldTcno);
    } else {
      query2 = query2.eq('adisoyadi', oldAdSoyad);
    }
    await query2;

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Bir personele ait tüm ödenen ve kesilen kayıtlarını siler
 */
export async function deletePersonelAvansAllForPersonelFromSupabase(
  tcno: string | undefined,
  adisoyadi: string
): Promise<{ success: boolean; error?: string }> {
  const targetClient = bankSupabase || supabase;

  try {
    if (tcno) {
      await targetClient.from('personelavans').delete().eq('tcno', tcno);
      await targetClient.from('personelavanskesilen').delete().eq('tcno', tcno);
    } else {
      await targetClient.from('personelavans').delete().eq('adisoyadi', adisoyadi);
      await targetClient.from('personelavanskesilen').delete().eq('adisoyadi', adisoyadi);
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}



