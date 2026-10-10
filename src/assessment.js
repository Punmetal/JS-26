export const safeUrl = value => { try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };

export function analyseJob(data) {
  const text = `${data.title} ${data.description}`.toLowerCase();
  const product = /ux research|usability|product designer|user research|วิจัยผู้ใช้/i.test(text);
  const ui = product || /\bui\b|web design|เว็บไซต์|landing page|figma/i.test(text);
  const motion = /motion|after effects|animation|blender|3d/i.test(text);
  const advanced = /senior|lead|director|หัวหน้า|อาวุโส/i.test(data.title);
  const needsComponents = /component|auto layout|design system|variant/i.test(text);
  const needsPrototype = /prototype|prototyp/i.test(text);
  const design = ui || motion || /design|graphic|visual|artwork|brand|campaign|poster|thumbnail|illustrat|ออกแบบ|กราฟิก|ดีไซน์|ภาพประกอบ/i.test(text);
  const track = !design ? 'other' : ui ? 'ui' : motion ? 'motion' : 'visual';
  const matchedProjects = !design ? [] : ui ? ['sybil', 'infographic', 'startup'] : motion ? ['k2o', 'startup'] : ['k2o', 'editorial', 'content'];
  const gaps = [];
  if (!design) gaps.push('กฎยังไม่พบคำที่เชื่อมกับงาน Design ต้องทบทวนสายงานด้วยตัวเอง');
  if (product) gaps.push('ยังไม่มีหลักฐาน UX research / Product case study ในไฟล์');
  if (needsComponents) gaps.push('Components / Auto Layout / Design System ต้องตรวจหลักฐานเพิ่ม');
  if (needsPrototype) gaps.push('Interactive prototype ยังไม่เห็นใน PDF');
  if (motion) gaps.push('Motion / 3D ต้องมีคลิปหรือ breakdown เพิ่ม');
  if (advanced) gaps.push('ขอบเขต seniority / Leadership ต้องยืนยัน');
  if (ui && !gaps.length) gaps.push('ตรวจ responsive UI และระดับ Figma กับข้อกำหนดจริง');
  if (!gaps.length) gaps.push('อ่านข้อกำหนดจริงและยืนยันบทบาทในพอร์ต');
  const readiness = !design ? 15 : Math.max(25, Math.min(85, 82 - (ui ? 15 : 0) - (product ? 20 : 0) - (advanced ? 12 : 0) - (motion ? 10 : 0) - (needsComponents ? 5 : 0)));
  const min = data.salaryMin ? Number(data.salaryMin) : null;
  const max = data.salaryMax ? Number(data.salaryMax) : null;
  if (min !== null && max !== null && min > max) throw new Error('เงินเดือนเริ่มต้นต้องไม่สูงกว่าเงินเดือนสูงสุด');
  if ((data.sourceUrl && !safeUrl(data.sourceUrl)) || (data.applicationUrl && !safeUrl(data.applicationUrl))) throw new Error('ใช้ลิงก์ http หรือ https เท่านั้น');
  const mode = data.mode;
  const officeDays = mode === 'remote' ? 0 : data.officeDays === '' ? null : Number(data.officeDays);
  if (mode === 'hybrid' && officeDays === 0) throw new Error('Hybrid ต้องมีวันเข้าออฟฟิศอย่างน้อย 1 วัน หรือเลือกยังไม่ระบุ');
  if (mode === 'onsite' && officeDays === 0) throw new Error('On-site ต้องมีวันเข้าออฟฟิศอย่างน้อย 1 วัน หรือเลือกยังไม่ระบุ');
  return { id: `custom-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2,10)}`}`, custom: true, company: data.company.trim(), title: data.title.trim(), logo: data.company.trim()[0].toUpperCase(),
    brand: '#d9e6d5', ink: '#3c624e', track, domain: 'ประกาศที่คุณเพิ่ม', mode, location: data.location.trim() || (mode === 'remote' ? 'ยังไม่ระบุพื้นที่ที่รับสมัคร' : 'ยังไม่ระบุสถานที่'), officeDays,
    workplace: mode === 'remote' ? '' : data.location.trim(), mapQuery: mode === 'remote' ? '' : data.location.trim(), locationPrecision: 'user-provided',
    applicationUrl: data.applicationUrl.trim(), foundAt: new Date().toISOString(), postedAt: null, lastCheckedAt: null,
    salary: min === null && max === null ? null : [min, max], category: !design || product && advanced ? 'low' : ui || motion || advanced ? 'stretch' : 'ready',
    readiness, growth: !design ? 10 : ui ? 88 : motion ? 52 : 50, coverage: 45, projects: matchedProjects,
    tags: [!design ? 'ต้องทบทวนสายงาน' : ui ? 'UI / Web' : motion ? 'Motion / 3D' : 'Visual Design', ...(needsComponents ? ['Components'] : []), ...(needsPrototype ? ['Prototyping'] : []), 'เพิ่มเอง'],
    description: data.description.trim(), sourceUrl: data.sourceUrl.trim(), requirements: [],
    reasons: design ? [`พบคำที่เกี่ยวกับ ${ui ? 'UI / Web' : motion ? 'Motion / 3D' : 'Visual Design'} จากชื่อและข้อความประกาศ`, 'รายการพอร์ตถูกเลือกตามกลุ่ม keyword ต้องตรวจความเกี่ยวข้องด้วยตัวเอง'] : ['กฎ keyword ยังไม่พบความเชื่อมโยงกับสายงานเป้าหมาย โปรดตรวจประกาศด้วยตัวเอง'],
    gaps, questions: ['ยืนยันพื้นที่ทำงาน เวลา และสิทธิ์ทำงาน remote', 'แยกทักษะที่จำเป็นออกจากทักษะที่เป็นข้อได้เปรียบ', 'ตรวจประกาศยังเปิดรับและวิธีสมัคร'], breakdown: [0, 0, 0], date: 'เพิ่มเอง', };
}
