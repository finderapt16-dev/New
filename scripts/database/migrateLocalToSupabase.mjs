import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Usage: node scripts/database/migrateLocalToSupabase.mjs ./migrations
// Expect files inside the folder: users.json, customApartments.json, apartmentReports.json, adminNotifications.json, adminViolations.json, favorites.json

const USERS_TABLE = 'app_users';
let supabase;

async function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');

  try {
    const raw = await fs.readFile(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env is optional if environment variables are already set.
  }
}

async function createMigrationClient() {
  await loadEnvFile();

  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

async function readJsonOrEmpty(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

async function upsertUsers(users) {
  if (!users.length) return { inserted: 0 };
  const payload = users.map((u) => ({
    email: u.email || null,
    name: u.name || null,
    role: u.role || 'student',
    mobile: u.mobileNumber || u.mobile || null,
    avatar_url: u.avatar || null,
    bio: u.bio || null,
    is_verified: !!u.isVerified,
    legacy_id: u.id || null,
    status: u.status || (u.role === 'landlord' && !u.isVerified ? 'pending' : 'active'),
  }));

  const { data, error } = await supabase.from(USERS_TABLE).upsert(payload, { onConflict: 'email' }).select('id,legacy_id');
  if (error) throw error;
  return { inserted: data?.length ?? 0, data };
}

async function insertApartments(apts) {
  if (!apts.length) return { inserted: 0, map: {} };
  const map = {}; // legacy -> new id
  for (const a of apts) {
    const landlord = a.landlordId ? (await supabase.from(USERS_TABLE).select('id').eq('legacy_id', a.landlordId).limit(1).maybeSingle()) : null;
    const landlord_id = landlord?.data?.id ?? null;
    const payload = {
      landlord_id,
      title: a.title || a.name || '',
      description: a.description || a.desc || null,
      price: a.price ?? 0,
      bedrooms: a.bedrooms ?? (a.rooms ? a.rooms.length : 0),
      bathrooms: a.bathrooms ?? 0,
      sqft: a.sqft ?? null,
      address: a.address || null,
      city: a.city || null,
      state: a.state || null,
      zip: a.zip || null,
      lat: a.lat ?? null,
      lng: a.lng ?? null,
      pet_friendly: !!a.petFriendly,
      parking: !!a.parking,
      furnished: !!a.furnished,
      utilities: Array.isArray(a.utilities) ? a.utilities : [],
      amenities: Array.isArray(a.amenities) ? a.amenities : [],
      features: a.features ?? {},
      is_published: a.isPublished !== undefined ? !!a.isPublished : true,
      legacy_id: a.id || null,
    };

    const { data, error } = await supabase.from('apartments').insert(payload).select('id').single();
    if (error) {
      console.error('Apartment insert error', error, a.title);
      continue;
    }
    map[a.id] = data.id;

    // images
    if (Array.isArray(a.images) && a.images.length) {
      const imagesPayload = a.images.map((img, idx) => ({
        apartment_id: data.id,
        url: img,
        is_primary: idx === 0,
        sort_order: idx,
      }));
      await supabase.from('apartment_images').insert(imagesPayload);
    }

    // rooms
    if (Array.isArray(a.rooms) && a.rooms.length) {
      const roomsPayload = a.rooms.map((r) => ({
        apartment_id: data.id,
        room_type: r.type || null,
        sqft: r.sqft ?? null,
        max_occupants: r.maxOccupants ?? 1,
        rent: r.rent ?? 0,
        has_private_bath: !!r.hasPrivateBath,
        is_occupied: !!r.isOccupied,
      }));
      await supabase.from('apartment_rooms').insert(roomsPayload);
    }
  }
  return { inserted: Object.keys(map).length, map };
}

async function insertReports(reports) {
  if (!reports.length) return { inserted: 0 };
  const payload = [];
  for (const r of reports) {
    const reporter = r.reporterEmail ? (await supabase.from(USERS_TABLE).select('id').eq('email', r.reporterEmail).limit(1).maybeSingle()) : null;
    const reporter_id = reporter?.data?.id ?? null;
    const apt = r.apartmentId ? (await supabase.from('apartments').select('id').eq('legacy_id', r.apartmentId).limit(1).maybeSingle()) : null;
    const apartment_id = apt?.data?.id ?? null;
    payload.push({
      reporter_id,
      apartment_id,
      reporter_role: r.role || null,
      issue_type: r.issueType || r.issue_type || null,
      tags: Array.isArray(r.tags) ? r.tags : [],
      details: r.details || null,
      contact: r.contact || null,
      severity: r.severity || 'med',
      submitted_at: r.submittedAt ? new Date(r.submittedAt).toISOString() : new Date().toISOString(),
      status: r.status || 'pending',
    });
  }
  const { data, error } = await supabase.from('reports').insert(payload).select('id');
  if (error) throw error;
  return { inserted: data.length };
}

async function insertViolations(violations) {
  if (!violations.length) return { inserted: 0 };
  const payload = [];
  for (const v of violations) {
    const landlord = v.landlordId ? (await supabase.from(USERS_TABLE).select('id').eq('legacy_id', v.landlordId).limit(1).maybeSingle()) : null;
    const landlord_id = landlord?.data?.id ?? null;
    payload.push({
      landlord_id,
      admin_id: null,
      mode: v.mode || 'violation',
      type: v.type || null,
      message: v.message || null,
      issued_at: v.issuedAt ? new Date(v.issuedAt).toISOString() : new Date().toISOString(),
      expires_at: v.expiresAt ? new Date(v.expiresAt).toISOString() : null,
      active: v.active !== undefined ? !!v.active : true,
    });
  }
  const { data, error } = await supabase.from('violations').insert(payload).select('id');
  if (error) throw error;
  return { inserted: data.length };
}

async function insertFavorites(favs) {
  if (!favs.length) return { inserted: 0 };
  const payload = [];
  for (const f of favs) {
    const user = f.userId ? (await supabase.from(USERS_TABLE).select('id').eq('legacy_id', f.userId).limit(1).maybeSingle()) : null;
    const apt = f.apartmentId ? (await supabase.from('apartments').select('id').eq('legacy_id', f.apartmentId).limit(1).maybeSingle()) : null;
    if (user?.data?.id && apt?.data?.id) {
      payload.push({ user_id: user.data.id, apartment_id: apt.data.id, created_at: new Date().toISOString() });
    }
  }
  if (!payload.length) return { inserted: 0 };
  const { data, error } = await supabase.from('favorites').insert(payload).select('*');
  if (error) throw error;
  return { inserted: data.length };
}

async function main() {
  supabase = await createMigrationClient();

  const dir = process.argv[2] || path.join(process.cwd(), 'migrations');
  console.log('Reading migration files from', dir);

  const users = await readJsonOrEmpty(path.join(dir, 'users.json'));
  const apts = await readJsonOrEmpty(path.join(dir, 'customApartments.json'));
  const reports = await readJsonOrEmpty(path.join(dir, 'apartmentReports.json'));
  const notifs = await readJsonOrEmpty(path.join(dir, 'adminNotifications.json'));
  const violations = await readJsonOrEmpty(path.join(dir, 'adminViolations.json'));
  const favs = await readJsonOrEmpty(path.join(dir, 'favorites.json'));

  console.log('Users:', users.length, 'Apartments:', apts.length, 'Reports:', reports.length, 'Notifs:', notifs.length, 'Violations:', violations.length, 'Favorites:', favs.length);

  try {
    const ures = await upsertUsers(users);
    console.log('Upserted users:', ures.inserted);

    const ares = await insertApartments(apts);
    console.log('Inserted apartments:', ares.inserted);

    const rres = await insertReports(reports);
    console.log('Inserted reports:', rres.inserted);

    const vres = await insertViolations(violations);
    console.log('Inserted violations:', vres.inserted);

    const fres = await insertFavorites(favs);
    console.log('Inserted favorites:', fres.inserted);

    // notifications: simple insert mapping user by legacy landlord id or skip
    if (notifs.length) {
      const payload = [];
      for (const n of notifs) {
        const userMatch = n.landlordId ? (await supabase.from(USERS_TABLE).select('id').eq('legacy_id', n.landlordId).limit(1).maybeSingle()) : null;
        payload.push({ user_id: userMatch?.data?.id ?? null, type: n.type || 'admin', payload: n, read: !!n.read, created_at: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString() });
      }
      const { data, error } = await supabase.from('notifications').insert(payload).select('id');
      if (error) console.error('Notifications insert error', error);
      else console.log('Inserted notifications:', data.length);
    }

    console.log('Migration finished');
  } catch (err) {
    console.error('Migration error', err.message || err);
  }
}

main();
