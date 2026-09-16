import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'vite';
import { parseSync } from 'rolldown/utils';
import assert from 'node:assert/strict';

// Local browser smoke test. All account/data modules below are fixtures; no
// credentials, production writes, or external services are used by this test.
const workspace = process.cwd().replaceAll('\\', '/');
const root = workspace;
const edge = process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const user = { id: 'tenant-fixture', authId: 'tenant-fixture', role: 'tenant', name: 'Test Tenant', email: 'tenant@example.test', isVerified: true, status: 'active' };
const apartment = { id: 'apartment-fixture', title: 'La Paz Test Apartment', address: 'La Paz', city: 'Iloilo City', state: 'Iloilo', zip: '5000', description: 'A local fixture apartment.', landlordId: 'landlord-fixture', landlordVerified: true, isPublished: true, status: 'available', price: 3500, bedrooms: 2, bathrooms: 1, sqft: 30, lat: 10.7162, lng: 122.5675, images: [], image: '', amenities: ['WiFi'], utilities: [], features: {}, petFriendly: true, parking: true, furnished: true, availableDate: '2026-01-01', createdAt: '2026-01-01', updatedAt: '2026-01-02', rooms: [{ id: 'room-fixture', roomName: 'Room One', name: 'Room One', roomNumber: '1', roomType: 'Single', capacity: 1, price: 3500, status: 'available', isOccupied: false, images: [], amenities: ['WiFi'], description: 'Fixture room' }] };
apartment.approvalStatus = 'approved';
const serviceSource = fs.readFileSync('src/services/dashboardSupabaseService.js', 'utf8');
const prefsDeclaration = parseSync('service.js', serviceSource).program.body.find(n => n.type === 'ExportNamedDeclaration' && n.declaration?.declarations?.[0]?.id.name === 'defaultTenantPreferences');
const prefs = serviceSource.slice(prefsDeclaration.start, prefsDeclaration.end);
const fixture = `export const user=${JSON.stringify(user)}; export const apartments=[${JSON.stringify(apartment)}]; export const landlord={id:'landlord-fixture',name:'Test Landlord',email:'owner@example.test',role:'landlord',isVerified:true}; ${prefs} export const preferences={...defaultTenantPreferences,hasSavedPreferences:true,maxBudget:6000,preferredArea:'La Paz'};`;
const virtual = '\0tenant-browser-fixture';
const models = new Map();
models.set('/src/contexts/AuthContext.jsx', `import {createContext} from 'react'; import {user,landlord} from '/__tenant_fixture.js'; export const AuthContext=createContext(null); const auth={user,currentUser:user,users:[user,landlord],isAuthenticated:true,isLoading:false,canEditApartment:()=>false,refreshUsers:async()=>{},updateUser:async()=>user,logout:()=>{}}; export const useAuth=()=>auth; export const AuthProvider=({children})=>children;`);
models.set('/src/contexts/ApartmentsContext.jsx', `import {apartments} from '/__tenant_fixture.js'; const value={apartments,isLoading:false,isRefreshing:false,error:null,refreshApartments:async()=>{}}; export const useApartmentsContext=()=>value; export const ApartmentsProvider=({children})=>children;`);
models.set('/src/services/supabaseClient.js', `export const hasSupabaseConfig=true; const query=new Proxy({}, {get:(t,key)=>key==='then'?(resolve)=>Promise.resolve({data:null,error:null}).then(resolve):()=>query}); export const supabase={from:()=>query,rpc:()=>query,channel:()=>({on(){return this},subscribe(){return this}}),removeChannel:async()=>{},auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}})}};`);
function mockedExports(file, overrides) {
  const source = fs.readFileSync(`src/services/${file}`, 'utf8');
  const ast = parseSync(file, source).program;
  const names = ast.body.filter(n => n.type === 'ExportNamedDeclaration').flatMap(n => n.declaration?.id ? [n.declaration.id.name] : (n.declaration?.declarations || []).map(d => d.id.name));
  return `import {apartments,user,landlord,preferences} from '/__tenant_fixture.js';\n` + names.map(name => name === 'defaultTenantPreferences' ? prefs : `export const ${name}=${overrides[name] || 'async()=>[]'};`).join('\n');
}
models.set('/src/services/dashboardSupabaseService.js', mockedExports('dashboardSupabaseService.js', {
  fetchTenantPreferences: 'async()=>preferences', saveTenantPreferences: 'async(_id,p)=>p',
  fetchApartments: 'async()=>apartments', fetchUsers: 'async()=>[user,landlord]',
  fetchPublicLandlordById: 'async()=>landlord', fetchUserPreferenceSections: 'async()=>({})',
  fetchUserProfileDetails: 'async()=>({user,adminProfile:null})',
  fetchNotifications: "async()=>[{id:'notification-fixture',user_id:user.id,title:'Report reviewed',message:'Your report has been reviewed.',read:false,type:'report',action_target_type:'report',action_target_id:'report-fixture',created_at:'2026-09-15T00:00:00Z'}]",
  markNotificationRead: "async(id)=>({id,user_id:user.id,title:'Report reviewed',message:'Your report has been reviewed.',read:true,type:'report',action_target_type:'report',action_target_id:'report-fixture',created_at:'2026-09-15T00:00:00Z'})",
  createSupportTicket: "async()=>({id:'support-fixture'})", createReport: "async()=>({id:'report-fixture'})",
}));
models.set('/src/services/apartmentsService.js', mockedExports('apartmentsService.js', {
  fetchApartments: 'async()=>apartments', fetchApartmentWithImages: 'async()=>apartments[0]',
  getApartmentById: 'async()=>apartments[0]', getLandlordVerification: 'async()=>true',
  listFavoriteApartments: 'async()=>apartments', getFavoriteApartmentIds: "async()=>['apartment-fixture']",
  isApartmentFavorite: 'async()=>true', toggleFavorite: 'async()=>false',
  fetchApartmentDetailAccessState: "async()=>'accessible'", recordApartmentView: 'async()=>{}',
}));
const server = await createServer({ root, server: { host: '127.0.0.1', port: 4179, strictPort: true, open: false }, plugins: [{ name: 'tenant-test-fixtures', enforce: 'pre', resolveId(id) { if (id === '/__tenant_fixture.js') return virtual; }, load(id) { if (id === virtual) return fixture; const relative = id.replaceAll('\\', '/').replace(root, '').split('?')[0]; return models.get(relative); } }] });
await server.listen();
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'aptfindr-tenant-browser-'));
const browser = spawn(edge, ['--headless=new', '--guest', '--disable-sync', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9334', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws;
const pending = new Map();
let requestId = 0;
const exceptions = [];
function send(method, params = {}) { return new Promise((resolve, reject) => { const id = ++requestId; const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`Browser command timed out: ${method}`));},15000); pending.set(id, { resolve:value=>{clearTimeout(timer);resolve(value)}, reject:error=>{clearTimeout(timer);reject(error)} }); ws.send(JSON.stringify({ id, method, params })); }); }
async function evaluate(expression) { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value; }
async function waitFor(expression, label) { for (let i = 0; i < 120; i++) { if (await evaluate(expression)) return; await pause(100); } throw new Error(`Timed out: ${label}; text=${await evaluate('document.body.innerText.slice(0,700)')}`); }
async function navigate(url, selector) { await evaluate(`history.pushState({}, '', ${JSON.stringify(url)}); dispatchEvent(new PopStateEvent('popstate'));`); await waitFor(`!!document.querySelector(${JSON.stringify(selector)})`, url); await pause(100); }
async function snapshot(selector) { return evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});const s=getComputedStyle(el);return {width:Math.round(el.getBoundingClientRect().width),font:s.fontSize,color:s.color,background:s.backgroundColor,padding:s.padding,border:s.borderRadius,overflow:document.documentElement.scrollWidth>innerWidth+1}})()`); }
const routes = [
  ['/dashboard?section=overview', '.overview-section-container'], ['/browse', '.tenant-browse'],
  ['/favorites', '.favorites-your-favorites'], ['/dashboard?section=notifications', '.tenant-notifications-container'],
  ['/dashboard?section=report', '.report-page'], ['/dashboard?section=help', '.tenant-help-page'],
  ['/dashboard?section=settings', '.tenant-profile-settings'], ['/dashboard?section=suggested', '.suggested-page'],
  ['/dashboard?section=popular', '.popular-page'], ['/dashboard?section=favorites', '.favorites-section-container'],
  ['/apartment/apartment-fixture', '.apartment-detail-title'],
];
const results = [];
const snapshots = {};
try {
  let target;
  for (let i = 0; i < 100; i++) { try { const targets = await (await fetch('http://127.0.0.1:9334/json/list')).json(); target = targets.find(t => t.type === 'page'); if (target) break; } catch {} await pause(100); }
  assert.ok(target, 'Headless Edge started');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  ws.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.id) { const p = pending.get(message.id); pending.delete(message.id); message.error ? p.reject(new Error(JSON.stringify(message.error))) : p.resolve(message.result); } if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails); });
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  await send('Network.setBlockedURLs', { urls: ['https://*'] });
  await send('Page.navigate', { url: 'http://127.0.0.1:4179/browse' });
  await waitFor("!!document.querySelector('.tenant-browse')", 'initial tenant render');
  for (const width of [1440, 768, 390]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    const before = new Map();
    for (const [url, selector] of routes) { console.log(`Checking ${width}px ${url}`); await navigate(url, selector); const value = await snapshot(selector); assert.equal(value.overflow, false, `${url} has no document overflow at ${width}`); before.set(url, value); snapshots[`${width}:${url}`]=await evaluate(`(()=>{const props=['display','position','width','height','padding','margin','borderRadius','fontSize','color','backgroundColor','overflowX','overflowY']; return [...document.querySelectorAll('main, .app-shell, .app-shell-main, .app-shell-content, .app-shell-sidebar, .app-sidebar, .app-sidebar-nav-item, h1, h2, article, section')].map(el=>({tag:el.tagName,cls:el.className,style:Object.fromEntries(props.map(p=>[p,getComputedStyle(el)[p]]))}));})()`); }
    for (const [url, selector] of [...routes].reverse()) { await navigate(url, selector); assert.deepEqual(await snapshot(selector), before.get(url), `${url} styles stable after navigation at ${width}`); }
    // Exercise the actual sidebar controls, including the mobile drawer.
    await navigate('/browse', '.tenant-browse');
    for (const [label, selector] of [['My Favorites','.favorites-your-favorites'],['Notifications','.tenant-notifications-container'],['Report a Problem','.report-page'],['Help','.tenant-help-page'],['Settings','.tenant-profile-settings'],['Apartments','.tenant-browse']]) {
      if (width < 1024) await evaluate(`document.querySelector('[aria-label="Open navigation"]').click()`);
      await pause(120);
      const clicked = await evaluate(`(()=>{const navs=[...document.querySelectorAll('nav a,nav button')]; const el=navs.find(n=>n.textContent.replace(/\\d/g,'').trim()===${JSON.stringify(label)}&&n.getBoundingClientRect().width&&n.getBoundingClientRect().left>=0); if(el)el.click();return !!el})()`);
      assert.ok(clicked, `${label} navigation exists at ${width}`); await waitFor(`!!document.querySelector(${JSON.stringify(selector)})`, label);
    }
    // Room details, Leaflet marker, preferences portal, notification details, FAQ.
    await navigate('/apartment/apartment-fixture', '.apartment-detail-title');
    await evaluate("document.querySelector('.apartment-detail-button-9').click()");
    await waitFor("!!document.querySelector('.apartment-detail-overlay-2')", 'room details');
    assert.equal(await evaluate("document.querySelector('.apartment-detail-overlay-2').getBoundingClientRect().width <= innerWidth+1"), true);
    await evaluate("document.querySelector('.apartment-detail-button-12').click()");
    assert.ok(await evaluate("!!document.querySelector('.leaflet-container .leaflet-marker-icon')"), 'Leaflet detail marker');
    await navigate('/browse?preferences=open', '[role="dialog"]');
    assert.ok(await evaluate("document.querySelector('[role=dialog]').getBoundingClientRect().width <= innerWidth+1"), 'Preferences fit viewport');
    await send('Input.dispatchKeyEvent', {type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await send('Input.dispatchKeyEvent', {type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await navigate('/dashboard?section=notifications', '.tenant-notifications-container');
    await evaluate("document.querySelector('.tenant-notifications-button-4').click()");
    await waitFor("!!document.querySelector('.tenant-notifications-section-3')", 'report notification detail');
    await navigate('/dashboard?section=help', '.tenant-help-page');
    await evaluate("document.querySelectorAll('.tenant-help-faq-question')[1].click()");
    assert.ok(await evaluate("document.querySelectorAll('.tenant-help-faq-question')[1].getAttribute('aria-expanded')==='true'"));
    results.push({ width, routes: routes.length, reverseNavigation: true, sidebarNavigation: true, roomDetails: true, leafletMarker: true, preferences: true, notificationDetail: true, faq: true });
  }
  assert.equal(exceptions.length, 0, JSON.stringify(exceptions));
  if (process.env.APTFINDR_SNAPSHOTS) fs.writeFileSync(process.env.APTFINDR_SNAPSHOTS, JSON.stringify(snapshots));
  console.log(JSON.stringify({ results, runtimeExceptions: exceptions.length, data: 'local fixtures; external HTTPS blocked', profile }, null, 2));
} finally {
  if (ws?.readyState === WebSocket.OPEN) { await send('Browser.close').catch(() => {}); ws.close(); }
  else browser.kill();
  await server.close();
}
