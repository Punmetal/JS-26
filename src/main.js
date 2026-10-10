import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import '@fontsource/noto-sans-thai/400.css';
import '@fontsource/noto-sans-thai/500.css';
import '@fontsource/noto-sans-thai/600.css';
import '@fontsource/noto-sans-thai/700.css';
import './style.css';
import { defaultProfile, projects, inboxJobs, categoryMeta, modes } from './data.js';
import { analyseJob, safeUrl } from './assessment.js';
import { icon } from './icons.js';
import { mascotMarkup, createMascot } from './mascot.js';

const mascot = createMascot();

const STORAGE_KEY = 'nextrole.prototype.v1'; // Keep v1 data when upgrading the prototype.
const app = document.querySelector('#app');
const overlay = document.querySelector('#overlay');
let stored = {};
try { const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); if (data && typeof data === 'object') stored = data; } catch { /* Storage is optional. */ }
const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const legacySaved = record(stored.saved);
const customJobs = Array.isArray(stored.customJobs) ? stored.customJobs.filter(j => j && typeof j.id === 'string' && typeof j.title === 'string' && typeof j.company === 'string') : [];
const state = {
  folder: 'new', query: '', mode: 'all', selected: null, modal: null, mapLoaded: new Set(),
  profile: { ...defaultProfile, ...record(stored.profile) },
  jobs: [...inboxJobs, ...customJobs.map(job => ({ ...job, foundAt: job.foundAt || null, workplace: job.workplace || '', mapQuery: job.mapQuery || '', applicationUrl: job.applicationUrl || '' }))],
  saved: Object.fromEntries(Object.entries(legacySaved).filter(([, value]) => !!value).map(([id]) => [id, true])), readAt: record(stored.readAt), skipped: record(stored.skipped),
  applied: { ...Object.fromEntries(Object.entries(legacySaved).filter(([, stage]) => ['applied', 'interview'].includes(stage)).map(([id]) => [id, true])), ...record(stored.applied) },
};
let previousFocus;
let toastTimer;
let undoAction;
const esc = (value = '') => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const jobById = id => state.jobs.find(job => job.id === id);
const projectById = id => projects.find(project => project.id === id);
const imageSrc = id => globalThis.__NEXTROLE_ASSETS__?.[id] || `/portfolio/${id}.webp`;
const money = n => new Intl.NumberFormat('en-US').format(n);
const salary = job => {
  if (!job.salary) return 'ยังไม่ระบุ';
  const [min, max] = job.salary;
  if (min === null) return `สูงสุด ฿${money(max)}`;
  if (max === null) return `ตั้งแต่ ฿${money(min)}`;
  return min === max ? `฿${money(min)}` : `฿${money(min)}–${money(max)}`;
};
const isDemo = job => !job.custom;
const cat = job => categoryMeta[job.category] || categoryMeta.low;
const pill = (text, cls = '') => `<span class="pill ${cls}">${esc(text)}</span>`;
const isNew = job => !state.readAt[job.id] && !state.skipped[job.id] && !state.applied[job.id];
const date = (value, full = false) => {
  if (!value || !Number.isFinite(new Date(value).getTime())) return 'ยังไม่ทราบ';
  return new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', ...(full ? { year: 'numeric' } : {}) }).format(new Date(value));
};
const mapLink = job => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.mapQuery)}`;
const mapEmbed = job => `https://www.google.com/maps?q=${encodeURIComponent(job.mapQuery)}&output=embed`;
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, profile: state.profile, customJobs: state.jobs.filter(j => j.custom), saved: state.saved, readAt: state.readAt, skipped: state.skipped, applied: state.applied }));
  } catch { toast('เบราว์เซอร์นี้บันทึกไม่ได้ ข้อมูลจะอยู่เฉพาะรอบนี้', null, 'surprised'); }
}
function toast(message, undo = null, mood = 'happy') {
  mascot.react(mood);
  const el = document.querySelector('#toast');
  undoAction = undo;
  el.innerHTML = `${icon('check')}<span>${esc(message)}</span>${undo ? '<button data-action="undo">เลิกทำ</button>' : ''}`;
  el.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.classList.remove('visible'); undoAction = null; }, 5500);
}
function constraints(job) {
  const flags = [];
  if (state.profile.maxOfficeDays !== '' && state.profile.maxOfficeDays !== null && Number.isFinite(job.officeDays) && job.officeDays > Number(state.profile.maxOfficeDays)) flags.push(`เข้าออฟฟิศ ${job.officeDays} วัน/สัปดาห์ · เกินที่ตั้งไว้ ${state.profile.maxOfficeDays} วัน`);
  if (state.profile.salaryFloor && job.salary && job.salary[1] !== null && job.salary[1] < Number(state.profile.salaryFloor)) flags.push('เพดานเงินเดือนต่ำกว่าขั้นต่ำที่ตั้งไว้');
  return flags;
}
function verification(job) {
  const missing = [];
  if (!job.salary) missing.push('เงินเดือน');
  if (job.mode === 'unknown') missing.push('รูปแบบงาน');
  if (job.mode !== 'remote' && job.officeDays === null) missing.push('วันเข้าออฟฟิศ');
  if (job.mode !== 'remote' && !job.workplace) missing.push('ที่ตั้งออฟฟิศ');
  if (job.custom) missing.push('สถานะเปิดรับ');
  return missing;
}
function brand(job) { return `<span class="company-logo" style="--brand:${esc(job.brand || '#e8e9e4')};--ink:${esc(job.ink || '#596853')}">${esc(job.logo || job.company[0])}</span>`; }
function visibleJobs() {
  return state.jobs.filter(job => {
    const inFolder = state.folder === 'all' || (state.folder === 'saved' ? !!state.saved[job.id] && !state.skipped[job.id] : !state.skipped[job.id] && !state.applied[job.id] && (!state.readAt[job.id] || state.selected === job.id));
    const text = `${job.title} ${job.company} ${(job.tags || []).join(' ')} ${job.location}`.toLowerCase();
    return inFolder && text.includes(state.query.toLowerCase()) && (state.mode === 'all' || job.mode === state.mode);
  }).sort((a, b) => (Date.parse(b.foundAt) || 0) - (Date.parse(a.foundAt) || 0));
}
function folderButton(key, label) {
  const count = key === 'new' ? state.jobs.filter(isNew).length : key === 'saved' ? state.jobs.filter(j => state.saved[j.id] && !state.skipped[j.id]).length : state.jobs.length;
  return `<button class="folder-tab ${state.folder === key ? 'active' : ''}" data-action="folder" data-folder="${key}" aria-pressed="${state.folder === key}">${label}<span>${count}</span></button>`;
}
function render() {
  const jobs = visibleJobs();
  const selected = jobById(state.selected);
  const title = { new: 'กล่องงาน', saved: 'งานที่เก็บไว้', all: 'งานทั้งหมด' }[state.folder];
  app.innerHTML = `<header class="app-header"><a class="wordmark" href="#" data-action="home" aria-label="jobu! กลับกล่องงาน"><span class="brand-mark">${icon('inbox')}</span>jobu<span class="brand-bang">!</span></a><label class="global-search">${icon('search')}<input id="job-search" type="search" value="${esc(state.query)}" placeholder="ค้นหางาน บริษัท หรือทักษะ" aria-label="ค้นหางาน" autocomplete="off"/><kbd>/</kbd></label><div class="header-actions"><button class="icon-button" data-action="about" aria-label="เกี่ยวกับ jobu! prototype">${icon('info')}</button><button class="profile-button" data-action="settings" aria-label="เปิดโปรไฟล์และพอร์ต">${esc(String(state.profile.name || 'Pun')[0].toUpperCase())}</button></div></header>
    <main class="inbox-shell ${selected ? 'has-detail' : ''}"><div class="inbox-heading"><div class="heading-copy"><span class="eyebrow">YOUR NEXT CHAPTER</span><h1>${title}<span class="heading-dot">.</span></h1><p>${state.folder === 'new' ? `มี ${state.jobs.filter(isNew).length} งานที่ยังไม่ได้เปิดอ่าน` : state.folder === 'saved' ? 'เก็บงานที่อยากกลับมาดูไว้ตรงนี้' : 'รวมงานที่อ่านแล้ว เก็บไว้ และข้ามไป'}</p></div>${jobs.length ? `<div class="mascot-welcome"><span class="mascot-message">ทีละงาน ก็ใกล้ขึ้นอีกนิด<span>your little job buddy</span></span>${mascotMarkup()}</div>` : ''}<button class="button add-job" data-action="add-job" aria-label="เพิ่มงาน">${icon('plus')}<span class="add-label">เพิ่มงาน</span></button></div>
    <div class="inbox-toolbar"><div class="folder-tabs" role="group" aria-label="กล่องงาน">${folderButton('new', 'งานใหม่')}${folderButton('saved', 'เก็บไว้')}${folderButton('all', 'ทั้งหมด')}</div><label class="mode-filter">${icon('home')}<select id="mode-select" aria-label="กรองรูปแบบงาน">${[['all', 'ทุกรูปแบบ'], ...Object.entries(modes)].map(([key, text]) => `<option value="${key}" ${state.mode === key ? 'selected' : ''}>${text}</option>`).join('')}</select>${icon('down')}</label></div>
    <div class="prototype-note"><span class="sample-dot"></span><span>ข้อมูลทดลอง · บริษัทและคะแนนเริ่มต้นเป็นตัวอย่าง</span><span class="list-order">เรียงตามวันที่พบล่าสุด</span></div>
    <div class="inbox-layout"><section class="inbox-list" aria-label="รายการงาน">${jobs.length ? jobs.map(jobRow).join('') : `<div class="empty-state">${mascotMarkup(state.query || state.mode !== 'all' ? 'surprised' : 'calm')}<span class="eyebrow">${state.query || state.mode !== 'all' ? 'LET’S TRY ANOTHER WAY' : 'A LITTLE BREATHING ROOM'}</span><h2>${state.query || state.mode !== 'all' ? 'ไม่มีงานตรงกับตัวกรองนี้' : state.folder === 'new' ? 'อ่านครบแล้ว พักได้เลย' : 'ยังไม่มีงานที่เก็บไว้'}</h2><p>${state.folder === 'new' && !state.query && state.mode === 'all' ? 'งานที่อ่านแล้วอยู่ใน “ทั้งหมด” · prototype ยังไม่มี agent ค้นงานใหม่' : 'ลองดูงานทั้งหมด หรือเพิ่มประกาศที่คุณสนใจ'}</p><button class="button secondary" data-action="show-all">ดูงานทั้งหมด ${icon('arrow')}</button></div>`}</section>
    ${selected ? `<aside class="job-detail" ${window.innerWidth <= 900 ? 'role="dialog" aria-modal="true"' : ''} aria-labelledby="detail-job-title">${detailContent(selected)}</aside>` : ''}</div>
    <footer class="inbox-footer"><span>${icon('lock')}บันทึกในเบราว์เซอร์นี้</span><button data-action="settings">โปรไฟล์ & พอร์ตฉบับร่าง ${icon('arrow')}</button></footer></main>`;
  document.body.classList.toggle('detail-open', !!selected);
  if (selected && window.innerWidth <= 900) app.querySelectorAll('.app-header,.inbox-heading,.inbox-toolbar,.prototype-note,.inbox-list,.inbox-footer').forEach(el => { el.inert = true; });
  mascot.sync();
}
function jobRow(job) {
  const unread = !state.readAt[job.id];
  return `<article class="job-row ${unread ? 'unread' : 'read'} ${state.selected === job.id ? 'selected' : ''} ${state.skipped[job.id] ? 'skipped' : ''}"><span class="unread-dot ${unread && !state.skipped[job.id] ? 'visible' : ''}" aria-label="${unread ? 'ยังไม่อ่าน' : 'อ่านแล้ว'}"></span>${brand(job)}<button class="job-row-main" data-action="open-job" data-id="${esc(job.id)}" aria-label="เปิด ${esc(job.title)} ที่ ${esc(job.company)}"><span class="row-subject"><span class="row-company"><span class="company-name">${esc(job.company)}</span>${isDemo(job) ? '<small>ตัวอย่าง</small>' : ''}</span><strong class="row-title">${esc(job.title)}</strong><span class="row-preview">${state.skipped[job.id] ? 'ข้ามไว้' : state.applied[job.id] ? 'สมัครแล้ว' : esc(job.description)}</span></span><span class="row-match">${pill(cat(job).label, cat(job).class)}</span><span class="row-mode">${modes[job.mode]}${job.mode === 'hybrid' && job.officeDays !== null ? `<small>${job.officeDays} วัน/สัปดาห์</small>` : ''}</span><span class="row-salary">${salary(job)}<small>${job.salary ? '/ เดือน' : 'เงินเดือน'}</small></span><time class="row-found">${date(job.foundAt)}<small>วันที่พบ</small></time></button><button class="row-save icon-button ${state.saved[job.id] ? 'saved' : ''}" data-action="save" data-id="${esc(job.id)}" aria-label="${state.saved[job.id] ? 'เลิกเก็บ' : 'เก็บ'} ${esc(job.title)}" aria-pressed="${!!state.saved[job.id]}">${icon('bookmark')}</button></article>`;
}
function applyLink(job) {
  const apply = safeUrl(job.applicationUrl);
  const source = safeUrl(job.sourceUrl);
  if (apply) return `<a class="button primary apply-link" href="${esc(apply)}" target="_blank" rel="noopener noreferrer">เปิดลิงก์สมัคร ${icon('external')}</a>`;
  if (source) return `<a class="button primary source-link" href="${esc(source)}" target="_blank" rel="noopener noreferrer">เปิดประกาศต้นทาง ${icon('external')}</a><span class="apply-note">ยังไม่มีลิงก์สมัครโดยตรง</span>`;
  return `<button class="button primary" disabled>${isDemo(job) ? 'งานตัวอย่าง · ไม่มีลิงก์สมัครจริง' : 'ยังไม่มีลิงก์สมัคร'}</button>`;
}
function detailContent(job) {
  const flags = constraints(job);
  const missing = verification(job);
  return `<div class="detail-toolbar"><button class="icon-button" data-action="close-detail" aria-label="กลับรายการงาน">${icon('back')}</button><span>${isDemo(job) ? 'งานตัวอย่าง' : 'ประกาศที่เพิ่มเอง'}</span><div><button class="icon-button" data-action="unread" data-id="${esc(job.id)}" aria-label="ทำเครื่องหมายว่ายังไม่อ่าน">${icon('mail')}</button><button class="icon-button" data-action="close-detail" aria-label="ปิดรายละเอียด">${icon('close')}</button></div></div>
    <div class="detail-scroll"><header class="detail-heading">${brand(job)}<div><p>${esc(job.company)}</p><h2 id="detail-job-title">${esc(job.title)}</h2><span>${esc(job.domain || '')}</span></div></header><div class="detail-status">${pill(cat(job).label, cat(job).class)}${state.applied[job.id] ? pill('สมัครแล้ว', 'applied') : ''}${missing.length ? pill('ข้อมูลยังไม่ครบ', 'unknown') : ''}</div>
    <div class="job-facts"><div>${icon('money')}<span><small>เงินเดือน / เดือน</small><strong>${salary(job)}</strong></span></div><div>${icon('home')}<span><small>รูปแบบงาน</small><strong>${modes[job.mode]}${job.mode !== 'remote' && job.officeDays !== null ? ` · ${job.officeDays} วัน/สัปดาห์` : ''}</strong></span></div><div>${icon('location')}<span><small>สถานที่ทำงาน</small><strong>${esc(job.location)}</strong></span></div></div>
    <div class="apply-area">${applyLink(job)}</div>${flags.length ? `<div class="constraint-notice">${icon('warning')}<div><strong>เงื่อนไขที่ต้องคิดต่อ</strong>${flags.map(flag => `<p>${esc(flag)}</p>`).join('')}</div></div>` : ''}
    <section class="detail-section job-description"><h3>รายละเอียดงาน <span>Job description</span></h3><p class="jd-text">${esc(job.description)}</p>${job.requirements?.length ? `<h4>สิ่งที่ประกาศต้องการ</h4><ul>${job.requirements.map(text => `<li>${esc(text)}</li>`).join('')}</ul>` : ''}<small class="source-caption">${isDemo(job) ? 'ข้อความประกาศจำลองสำหรับทดลองหน้าจอ' : 'ข้อความที่คุณวางไว้ ยังไม่ได้ตรวจสอบกับต้นทาง'}</small></section>
    <section class="detail-section workplace-section"><div class="section-title"><h3>สถานที่ทำงาน</h3>${job.mapQuery ? `<a href="${esc(mapLink(job))}" target="_blank" rel="noopener noreferrer" class="text-link">เปิด Maps ${icon('external')}</a>` : ''}</div>${mapContent(job)}</section>
    <section class="detail-section match-section"><h3>งานนี้เหมาะกับคุณยังไง?</h3><div class="score-pair"><div><small>พร้อมสมัครตอนนี้</small><strong>${job.readiness}<span>/100</span></strong><i style="--score:${job.readiness}%"></i></div><div class="growth"><small>โอกาสเติบโต</small><strong>${job.growth}<span>/100</span></strong><i style="--score:${job.growth}%"></i></div></div><p class="score-caption">${isDemo(job) ? 'คะแนนตัวอย่าง' : 'ประเมินด้วยกฎ keyword ยังไม่ใช้ AI'} · ไม่ใช่โอกาสได้งาน</p><ul class="reason-list">${(job.reasons || []).map(reason => `<li>${icon('check')}<span>${esc(reason)}</span></li>`).join('')}</ul></section>
    <section class="detail-section"><h3>พอร์ตที่ใช้กับงานนี้ได้</h3><div class="evidence-projects">${(job.projects || []).map(id => { const p = projectById(id); return p ? `<button class="evidence-project" data-action="project" data-id="${p.id}"><img src="${imageSrc(p.image)}" alt="${esc(p.name)}"/><span><strong>${esc(p.name)}</strong><small>Port Beta 4 · หน้า ${p.pages}</small></span>${icon('chevron')}</button>` : ''; }).join('') || '<p class="muted">ยังไม่มีหลักฐานพอร์ตที่จับคู่ได้จากกฎ</p>'}</div></section>
    <details class="more-notes"><summary>สิ่งที่ต้องเช็กก่อนสมัคร ${icon('down')}</summary><h4>หลักฐานที่ต้องเติม</h4><ul>${(job.gaps || []).map(gap => `<li>${esc(gap)}</li>`).join('')}</ul><h4>คำถามกับบริษัท</h4><ul>${[...(job.questions || []), ...missing.map(info => `ตรวจสอบ ${info}`)].map(question => `<li>${esc(question)}</li>`).join('')}</ul></details>
    <div class="discovery-dates"><span>พบงานนี้ <strong>${date(job.foundAt, true)}${isDemo(job) ? ' (ตัวอย่าง)' : ''}</strong></span><span>วันที่ประกาศ <strong>${date(job.postedAt, true)}</strong></span><span>ตรวจสถานะล่าสุด <strong>${date(job.lastCheckedAt, true)}</strong></span></div></div>
    <div class="detail-actions"><button class="button secondary ${state.saved[job.id] ? 'is-saved' : ''}" data-action="save" data-id="${esc(job.id)}">${icon(state.saved[job.id] ? 'check' : 'bookmark')}${state.saved[job.id] ? 'เก็บไว้แล้ว' : 'เก็บไว้'}</button><button class="button quiet" data-action="skip" data-id="${esc(job.id)}">${icon('archive')}${state.skipped[job.id] ? 'นำกลับเข้ากล่อง' : 'ข้าม'}</button><button class="button quiet applied-button" data-action="applied" data-id="${esc(job.id)}">${icon('check')}${state.applied[job.id] ? 'สมัครแล้ว ✓' : 'สมัครแล้ว'}</button></div>`;
}
function mapContent(job) {
  if (!job.mapQuery) return `<div class="map-empty">${icon(job.mode === 'remote' ? 'home' : 'location')}<div><strong>${job.mode === 'remote' ? 'Remote · ไม่ต้องปักหมุดออฟฟิศ' : 'ยังไม่มีที่ตั้งให้แสดงบนแผนที่'}</strong><p>${job.mode === 'remote' ? 'เช็กพื้นที่ที่รับสมัครและเวลาทำงานกับบริษัท' : 'ต้องมีที่อยู่หรือชื่อสถานที่จากประกาศก่อน'}</p></div></div>`;
  const precision = isDemo(job) ? 'แสดงย่านตัวอย่าง ไม่ใช่พิกัดออฟฟิศจริง' : 'ค้นจากสถานที่ที่คุณระบุ ยังไม่ได้ยืนยันพิกัด';
  return `<p class="map-location">${esc(job.workplace || job.location)}</p>${state.mapLoaded.has(job.id) ? `<div class="map-frame"><iframe title="แผนที่สถานที่ทำงาน ${esc(job.company)}" src="${esc(mapEmbed(job))}" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups" allowfullscreen></iframe></div><p class="map-caption">${precision} · ถ้าแผนที่ไม่แสดง ใช้ลิงก์เปิด Maps ด้านบน</p>` : `<div class="map-placeholder"><span class="map-road road-one"></span><span class="map-road road-two"></span><span class="map-road road-three"></span><div class="map-placeholder-content">${icon('location')}<button class="button secondary" data-action="load-map" data-id="${esc(job.id)}">โหลดแผนที่</button><small>Google Maps · ต้องใช้อินเทอร์เน็ต</small></div></div><p class="map-caption">${precision} · โหลดเมื่อคุณกดเท่านั้น</p>`}`;
}
function renderModal() {
  if (!state.modal) return;
  const { type, id } = state.modal;
  let content = '';
  if (type === 'about') content = `<span class="eyebrow">SAY HELLO TO jobu!</span><h2 id="modal-title">เพื่อนช่วยอ่านงานของคุณ</h2><p class="modal-lead">เปิดมาอ่านงานใหม่ เก็บงานที่สนใจ แล้วเปิดลิงก์ไปสมัครเอง</p><div class="about-note"><strong>jobu! ยังเป็น prototype</strong><p>8 งานเริ่มต้นและคะแนนเป็นข้อมูลจำลอง ภาพพอร์ตมาจากไฟล์ฉบับร่างที่คุณส่ง</p><p>การเพิ่มประกาศใช้กฎ keyword ไม่มี AI, agent ค้นงานรายสัปดาห์ หรือ Notion sync เชื่อมอยู่ตอนนี้</p><p>ข้อมูลเก็บในเบราว์เซอร์นี้ แผนที่ Google Maps จะเชื่อมบริการภายนอกเฉพาะเมื่อกดโหลดหรือเปิดลิงก์</p></div>`;
  if (type === 'project') {
    const p = projectById(id); if (!p) return;
    content = `<span class="eyebrow">PORTFOLIO EVIDENCE · ฉบับร่าง</span><h2 id="modal-title">${esc(p.name)}</h2><p class="modal-lead">Port Beta 4.pdf · หน้า ${p.pages}</p><img class="project-preview" src="${imageSrc(p.image)}" alt="${esc(p.name)}"/><div class="evidence-notes"><h3>สิ่งที่เห็นในไฟล์</h3><p>${esc(p.evidence)}</p><h3>บทบาทตามคำอธิบาย</h3><p>${esc(p.role)}</p><h3>ยังต้องยืนยัน</h3><p>${esc(p.missing)}</p></div>`;
  }
  if (type === 'settings') content = settingsContent();
  if (type === 'add') content = addJobContent();
  overlay.innerHTML = `<div class="modal-backdrop" data-action="backdrop"><section class="modal ${type === 'project' ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="modal-close icon-button" data-action="close-modal" aria-label="ปิดหน้าต่าง">${icon('close')}</button>${content}</section></div>`;
  mascot.sync();
}
function settingsContent() {
  const p = state.profile;
  return `<span class="eyebrow">PROFILE · เปลี่ยนได้เสมอ</span><h2 id="modal-title">โปรไฟล์ & พอร์ต</h2><p class="modal-lead">${esc(p.title)} · Visual → UI<br>Resume v2 และ Port Beta 4 ยังไม่ final</p><form id="profile-form"><div class="form-grid"><label>ชื่อที่แสดง<input name="name" required maxlength="40" value="${esc(p.name)}"/></label><label>ตำแหน่ง<input name="title" required maxlength="80" value="${esc(p.title)}"/></label></div><label>เป้าหมาย<input name="goal" required maxlength="200" value="${esc(p.goal)}"/></label><label>พื้นที่ที่อยู่<input name="location" required maxlength="100" value="${esc(p.location)}"/></label><div class="form-grid"><label>รูปแบบงานที่ชอบ<select name="preference">${[['remote', 'Remote ก่อน'], ['hybrid', 'Hybrid ก่อน'], ['flexible', 'ยืดหยุ่น']].map(([v, text]) => `<option value="${v}" ${p.preference === v ? 'selected' : ''}>${text}</option>`).join('')}</select></label><label>เข้าออฟฟิศได้สูงสุด / สัปดาห์<select name="maxOfficeDays"><option value="" ${p.maxOfficeDays === '' ? 'selected' : ''}>ยังไม่กำหนด</option>${[0, 1, 2, 3, 4, 5].map(n => `<option value="${n}" ${p.maxOfficeDays !== '' && Number(p.maxOfficeDays) === n ? 'selected' : ''}>${n} วัน</option>`).join('')}</select></label></div><div class="form-grid"><label>เงินเดือนขั้นต่ำ / เดือน<input name="salaryFloor" type="number" min="0" max="1000000" step="1000" placeholder="ยังไม่กำหนด" value="${esc(p.salaryFloor)}"/></label><label>ระดับ Figma ที่คุณยืนยัน<select name="figmaLevel">${[['unknown', 'ยังไม่ยืนยัน'], ['basic', 'พื้นฐาน'], ['confident', 'ใช้งานคล่อง']].map(([v, text]) => `<option value="${v}" ${p.figmaLevel === v ? 'selected' : ''}>${text}</option>`).join('')}</select></label></div><button class="button primary full" type="submit">บันทึกโปรไฟล์ ${icon('check')}</button></form><details class="settings-evidence"><summary>ดูหลักฐานจากพอร์ต · 7 กลุ่มผลงาน ${icon('down')}</summary>${projects.map(p => `<button class="evidence-project" data-action="project" data-id="${p.id}"><img src="${imageSrc(p.image)}" alt="${esc(p.name)}"/><span><strong>${esc(p.name)}</strong><small>หน้า ${p.pages}</small></span>${icon('chevron')}</button>`).join('')}<p class="muted">Motion / 3D / AR และกระบวนการ UX ต้องมีหลักฐานเพิ่มก่อนกล่าวอ้าง</p></details>`;
}
function addJobContent() {
  return `<span class="eyebrow">เพิ่มจากประกาศที่คุณเจอ</span><h2 id="modal-title">เพิ่มงานเข้ากล่อง</h2><div class="mascot-form-help">${mascotMarkup()}<p class="modal-lead">วางรายละเอียดพร้อมลิงก์ได้เลย ผลเบื้องต้นใช้กฎ keyword ยังไม่ใช่ AI</p></div><form id="job-form"><div class="form-grid"><label>ตำแหน่ง<input name="title" required maxlength="100" placeholder="เช่น Junior UI Designer"/></label><label>บริษัท<input name="company" required maxlength="80" placeholder="ชื่อบริษัท"/></label></div><label>Job description<textarea name="description" required minlength="30" maxlength="15000" rows="5" placeholder="วางรายละเอียดงานและคุณสมบัติที่ต้องการ"></textarea></label><div class="form-grid"><label>รูปแบบงาน<select name="mode"><option value="unknown">ยังไม่ระบุ</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">On-site</option></select></label><label>เข้าออฟฟิศ / สัปดาห์<select name="officeDays"><option value="">ยังไม่ระบุ</option>${[0, 1, 2, 3, 4, 5].map(n => `<option value="${n}">${n} วัน</option>`).join('')}</select></label></div><label>สถานที่ทำงาน / ที่อยู่สำหรับแผนที่<input name="location" maxlength="250" placeholder="เช่น ชื่ออาคาร ย่าน หรือที่อยู่ตามประกาศ"/><small>Remote ให้ระบุพื้นที่ที่รับสมัครได้ โดยไม่ปักหมุดออฟฟิศ</small></label><div class="form-grid"><label>เงินเดือนเริ่มต้น<input name="salaryMin" type="number" min="0" max="1000000" placeholder="ไม่ระบุได้"/></label><label>เงินเดือนสูงสุด<input name="salaryMax" type="number" min="0" max="1000000" placeholder="ไม่ระบุได้"/></label></div><label>ลิงก์สมัคร<input name="applicationUrl" type="url" placeholder="https://…"/></label><label>ลิงก์ประกาศต้นทาง (ถ้ามี)<input name="sourceUrl" type="url" placeholder="https://…"/></label><p id="job-form-error" class="form-error" aria-live="polite"></p><button class="button primary full" type="submit">เพิ่มงาน ${icon('plus')}</button></form>`;
}
function openModal(type, id = null) {
  previousFocus = document.activeElement; state.modal = { type, id }; renderModal();
  app.inert = true; document.body.classList.add('modal-open'); overlay.querySelector('button, input')?.focus();
}
function closeModal() {
  overlay.innerHTML = ''; state.modal = null; app.inert = false; document.body.classList.remove('modal-open');
  if (previousFocus?.isConnected) previousFocus.focus();
  mascot.sync();
}
function closeDetail() { const id = state.selected; state.selected = null; render(); app.querySelector(`[data-action="open-job"][data-id="${CSS.escape(id || '')}"]`)?.focus(); }
function openJob(id) {
  if (!jobById(id)) return;
  state.selected = id; state.readAt[id] = state.readAt[id] || new Date().toISOString(); persist(); render();
  app.querySelector('.detail-toolbar button')?.focus({ preventScroll: true });
}
function refresh() { render(); if (state.modal) renderModal(); }
function handleAction(event) {
  const el = event.target.closest('[data-action]'); if (!el) return;
  const action = el.dataset.action; const id = el.dataset.id;
  if (action === 'backdrop' && event.target !== el) return;
  if (action === 'home') { event.preventDefault(); state.folder = 'new'; state.query = ''; state.mode = 'all'; state.selected = null; render(); }
  if (action === 'folder') { state.folder = el.dataset.folder; state.selected = null; render(); }
  if (action === 'show-all') { state.folder = 'all'; state.query = ''; state.mode = 'all'; state.selected = null; render(); }
  if (action === 'open-job') openJob(id);
  if (action === 'close-detail') closeDetail();
  if (action === 'save') { if (state.saved[id]) delete state.saved[id]; else state.saved[id] = true; persist(); refresh(); toast(state.saved[id] ? 'เก็บงานไว้แล้ว' : 'นำออกจากงานที่เก็บไว้แล้ว'); }
  if (action === 'skip') {
    const oldSkipped = state.skipped[id]; const oldSaved = state.saved[id];
    if (oldSkipped) delete state.skipped[id]; else { state.skipped[id] = true; delete state.saved[id]; }
    state.selected = null; persist(); render();
    toast(oldSkipped ? 'นำงานกลับเข้ากล่องแล้ว' : 'ข้ามงานนี้แล้ว · ยังดูได้ใน “ทั้งหมด”', () => { if (oldSkipped) state.skipped[id] = oldSkipped; else delete state.skipped[id]; if (oldSaved) state.saved[id] = oldSaved; else delete state.saved[id]; persist(); render(); });
  }
  if (action === 'applied') { if (state.applied[id]) delete state.applied[id]; else { state.applied[id] = true; state.saved[id] = state.saved[id] || true; } persist(); refresh(); toast(state.applied[id] ? 'บันทึกว่า “สมัครแล้ว” · ระบบไม่ได้ส่งใบสมัคร' : 'นำสถานะสมัครแล้วออกแล้ว'); }
  if (action === 'unread') { delete state.readAt[id]; state.selected = null; persist(); render(); toast('ทำเครื่องหมายว่ายังไม่อ่านแล้ว'); }
  if (action === 'load-map') { mascot.react('waiting', 5000); state.mapLoaded.add(id); const container = app.querySelector('.workplace-section'); if (container) { container.querySelector('.map-placeholder').outerHTML = `<div class="map-frame"><iframe title="แผนที่สถานที่ทำงาน ${esc(jobById(id).company)}" src="${esc(mapEmbed(jobById(id)))}" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups" allowfullscreen></iframe></div>`; container.querySelector('.map-caption').textContent += ' · ถ้าไม่แสดง ใช้ลิงก์เปิด Maps ด้านบน'; container.querySelector('iframe').addEventListener('load', () => mascot.react('calm', 600), { once: true }); } }
  if (action === 'add-job') openModal('add');
  if (action === 'settings') openModal('settings');
  if (action === 'project') openModal('project', id);
  if (action === 'about') openModal('about');
  if (action === 'close-modal' || action === 'backdrop') closeModal();
  if (action === 'undo' && undoAction) { const fn = undoAction; undoAction = null; fn(); document.querySelector('#toast').classList.remove('visible'); }
}
app.addEventListener('click', handleAction);
overlay.addEventListener('click', handleAction);
document.querySelector('#toast').addEventListener('click', handleAction);
app.addEventListener('input', event => {
  if (event.target.id === 'job-search') { const pos = event.target.selectionStart; state.query = event.target.value; state.selected = null; render(); const input = app.querySelector('#job-search'); input.focus(); input.setSelectionRange(pos, pos); }
});
app.addEventListener('change', event => { if (event.target.id === 'mode-select') { state.mode = event.target.value; state.selected = null; render(); } });
overlay.addEventListener('submit', event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  if (event.target.id === 'profile-form') {
    state.profile = { ...state.profile, ...data, name: data.name.trim() || 'Pun', title: data.title.trim(), goal: data.goal.trim(), location: data.location.trim(), maxOfficeDays: data.maxOfficeDays === '' ? '' : Number(data.maxOfficeDays) };
    persist(); closeModal(); render(); toast('บันทึกโปรไฟล์แล้ว');
  }
  if (event.target.id === 'job-form') {
    try {
      if (!data.title.trim() || !data.company.trim()) throw new Error('กรอกตำแหน่งและบริษัทก่อน');
      if (data.description.trim().length < 30) throw new Error('รายละเอียดงานต้องมีอย่างน้อย 30 ตัวอักษร');
      const job = analyseJob(data); state.jobs.unshift(job); state.folder = 'new'; state.mode = 'all'; state.query = ''; state.selected = null; persist(); closeModal(); render(); toast('เพิ่มงานเข้ากล่องแล้ว · กดเปิดอ่านรายละเอียดได้เลย');
    } catch (error) { overlay.querySelector('#job-form-error').textContent = error.message; mascot.react('surprised', 2500); }
  }
});
overlay.addEventListener('invalid', () => mascot.react('surprised', 2500), true);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { if (state.modal) closeModal(); else if (state.selected) closeDetail(); }
  if (event.key === '/' && !state.modal && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); app.querySelector('#job-search')?.focus(); }
  const container = state.modal ? overlay.querySelector('.modal') : state.selected && window.innerWidth <= 900 ? app.querySelector('.job-detail') : null;
  if (container && event.key === 'Tab') {
    const items = [...container.querySelectorAll('button, a[href], input, select, textarea, summary')].filter(el => !el.disabled && el.offsetParent !== null);
    if (!items.length) return;
    if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
  }
});
let compactLayout = window.innerWidth <= 900;
window.addEventListener('resize', () => {
  const next = window.innerWidth <= 900;
  if (next !== compactLayout) { compactLayout = next; if (state.selected) render(); }
});
render();
