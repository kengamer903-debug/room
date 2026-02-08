export type Language = 'en' | 'th';

export const translations = {
  en: {
    // Header
    appTitle: "Asset Analytics",
    deptTitle: "Civil Engineering Dept.",
    liveData: "Live Data",
    syncing: "Syncing...",
    source: "Source",
    
    // KPIs
    totalAssets: "Total Assets",
    itemsInDb: "Items in database",
    attentionNeeded: "Attention Needed",
    damagedRepair: "Damaged / Repair",
    goodCondition: "Good Condition",
    operational: "Operational",
    locations: "Locations",
    buildingsZones: "Buildings / Zones",

    // Filters & Grid
    filter: "Filter",
    allBuildings: "All Buildings",
    searchPlaceholder: "Search...",
    noData: "No data found",
    noMatches: "No matches found",
    
    // Dashboard Panel
    conditionAnalysis: "Condition Analysis",
    clearFilter: "Clear Filter",
    clickToFilter: "Click chart or list below to filter",
    assetInspector: "Asset Inspector",
    fullView: "Full View",
    noItemSelected: "No item selected",
    selectRowHint: "Select a row to view details",
    noLocationInfo: "No location info",
    
    // Status Labels
    statusGood: "Good",
    statusDamaged: "Damaged",
    statusRepair: "Repair Needed",
    statusPartial: "Partial Defect",
    statusNone: "None",
    
    // Modal
    imageCounter: "Image {current} / {total}"
  },
  th: {
    // Header
    appTitle: "ระบบวิเคราะห์ครุภัณฑ์",
    deptTitle: "ภาควิชาวิศวกรรมโยธา",
    liveData: "ออนไลน์",
    syncing: "กำลังโหลด...",
    source: "แหล่งข้อมูล",
    
    // KPIs
    totalAssets: "ครุภัณฑ์ทั้งหมด",
    itemsInDb: "รายการในฐานข้อมูล",
    attentionNeeded: "ต้องซ่อมแซม",
    damagedRepair: "ชำรุด / ส่งซ่อม",
    goodCondition: "สภาพดี",
    operational: "ใช้งานได้ปกติ",
    locations: "สถานที่",
    buildingsZones: "อาคาร / โซน",

    // Filters & Grid
    filter: "ตัวกรอง",
    allBuildings: "ทุกอาคาร",
    searchPlaceholder: "ค้นหา...",
    noData: "ไม่พบข้อมูล",
    noMatches: "ไม่พบข้อมูลที่ตรงกัน",
    
    // Dashboard Panel
    conditionAnalysis: "วิเคราะห์สภาพครุภัณฑ์",
    clearFilter: "ล้างตัวกรอง",
    clickToFilter: "คลิกกราฟเพื่อกรองข้อมูล",
    assetInspector: "ตรวจสอบรายละเอียด",
    fullView: "ดูรูปขยาย",
    noItemSelected: "ยังไม่ได้เลือกรายการ",
    selectRowHint: "เลือกรายการในตารางเพื่อดูข้อมูล",
    noLocationInfo: "ไม่มีข้อมูลสถานที่",
    
    // Status Labels
    statusGood: "สภาพดี",
    statusDamaged: "ชำรุด",
    statusRepair: "ส่งซ่อม",
    statusPartial: "ชำรุดบางส่วน",
    statusNone: "ไม่มี",
    
    // Modal
    imageCounter: "รูปที่ {current} / {total}"
  }
};