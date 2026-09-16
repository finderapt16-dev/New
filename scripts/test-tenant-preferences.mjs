import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parseSync } from 'rolldown/utils';
import { createServer } from 'vite';

// Test pure preference normalization without initializing Supabase.
const source = fs.readFileSync('src/services/dashboardSupabaseService.js', 'utf8');
const names = new Set(['defaultTenantPreferences', 'getNumberValue', 'getOptionalBooleanValue', 'getPositiveNumberValue', 'isTenantPreferenceSortOption', 'normalizeTenantPreferences']);
const declarations = parseSync('service.js', source).program.body.map(node => node.declaration || node).filter(node => names.has(node.id?.name || node.declarations?.[0]?.id.name));
const normalize = vm.runInNewContext(declarations.map(node => source.slice(node.start, node.end)).join('\n') + '\nnormalizeTenantPreferences');
const stored = normalize({ minBudget: 2000, maxBudget: 5000, minBedrooms: '4+', roomCapacity: '4+', ownBathroom: true, saveBudgetPreferences: true });
assert.equal(stored.minBudget, 2000);
assert.equal(stored.maxBudget, 5000);
assert.equal(stored.minBedrooms, '4+');
assert.equal(stored.roomCapacity, '4+');
assert.equal(stored.ownBathroom, true);
const legacy = normalize({ maxBudget: 3500, minBedrooms: '2', roomCapacity: '5' });
assert.equal(legacy.minBudget, 0);
assert.equal(legacy.ownBathroom, false);
assert.equal(legacy.roomCapacity, '5');
assert.equal(normalize({ minBudget: 0, maxBudget: 0 }, stored).minBudget, 0);

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { matchesRoomCapacity } = await server.ssrLoadModule('/src/tenant/roomCapacity.js');
    const { calculateRankingScoreBreakdown: score, hasMeaningfulPreferences } = await server.ssrLoadModule('/src/tenant/rankingEngine.js');
    const apartment = { id: 'test', city: 'La Paz', address: 'La Paz', description: '', price: 4000, bedrooms: 4, status: 'available', amenities: ['Laundry Area'], rooms: [{ status: 'available', price: 4000, maxOccupants: 5, hasPrivateBath: true }], availableDate: '2026-01-01', createdAt: '2026-01-01' };
    assert.equal(matchesRoomCapacity(apartment, '4+'), true);
    assert.equal(matchesRoomCapacity(apartment, '3'), false);
    assert.equal(matchesRoomCapacity({ ...apartment, rooms: [{ status: 'occupied', maxOccupants: 5 }] }, '4+'), false);
    assert.equal(hasMeaningfulPreferences({ hasSavedPreferences: true, minBudget: 2000 }), true);
    assert.equal(hasMeaningfulPreferences({ hasSavedPreferences: true, ownBathroom: true }), true);
    assert.equal(hasMeaningfulPreferences({ hasSavedPreferences: true, roomCapacity: '4+' }), true);
    assert.equal(score(apartment, { ownBathroom: true, laundryArea: true }).amenitiesScore, 100);
    assert.equal(score({ ...apartment, rooms: [{ status: 'available', hasPrivateBath: false }] }, { ownBathroom: true }).amenitiesScore, 0);
    assert.ok(score(apartment, { minBudget: 2000, maxBudget: 5000 }).budgetScore > score(apartment, { minBudget: 4500, maxBudget: 5000 }).budgetScore);
    assert.equal(score(apartment, { minBudget: 2000 }).budgetScore, 100);
    assert.ok(score(apartment, { minBedrooms: '4+' }).availabilityScore > score({ ...apartment, bedrooms: 3 }, { minBedrooms: '4+' }).availabilityScore);
    console.log('Preference normalization, legacy compatibility, 4+ capacity, bedrooms, bathroom, laundry, and price ranking passed.');
} finally { await server.close(); }
