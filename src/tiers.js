export const tierMeta = {
  S: { label: 'น่าลุยมาก', short: 'น่าลุยมาก', description: 'ทักษะและพอร์ตตรงกับงานหลักมาก ตรวจเงื่อนไขจริงก่อนสมัคร' },
  A: { label: 'น่าสมัคร', short: 'น่าสมัคร', description: 'ฐานงานตรง มีบางส่วนที่ต้องเติมหรือยืนยันเพิ่มเติม' },
  B: { label: 'ลองขยับ', short: 'ลองขยับ', description: 'มีทักษะที่ต่อยอดได้ แต่ควรเตรียมหลักฐานพอร์ตเพิ่ม' },
  C: { label: 'ยังไม่ค่อยตรง', short: 'ยังไม่ตรง', description: 'หน้าที่หลักยังห่างจากหลักฐานพอร์ตหรือสายงานเป้าหมาย' },
};

// Qualitative triage, not numeric score bands. Imported jobs remain provisional:
// keyword rules cannot establish the strong, reviewed evidence needed for S.
export function inferFitTier(job) {
  const title = String(job.title || '');
  const text = `${title} ${job.description || ''}`.toLowerCase();
  const product = /ux research|usability|product designer|user research|วิจัยผู้ใช้/i.test(text);
  const ui = product || /\bui\b|web design|เว็บไซต์|landing page|figma/i.test(text);
  const motion = /motion|after effects|animation|blender|3d/i.test(text);
  const advanced = /senior|lead|director|หัวหน้า|อาวุโส/i.test(title);
  const design = ui || motion || /design|graphic|visual|artwork|brand|campaign|poster|thumbnail|illustrat|ออกแบบ|กราฟิก|ดีไซน์|ภาพประกอบ/i.test(text);
  if (!design || product && advanced) return 'C';
  if (ui || motion || advanced) return 'B';
  return 'A';
}

export function fitTier(job) {
  return Object.hasOwn(tierMeta, job.fitTier) ? job.fitTier : inferFitTier(job);
}
