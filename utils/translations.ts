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
    tableView: "Table View",
    galleryView: "Gallery View",
    floorPlanView: "Floor Plan",
    exportCSV: "Export CSV",
    
    // Dashboard Panel
    conditionAnalysis: "Condition Analysis",
    clearFilter: "Clear Filter",
    clickToFilter: "Click chart or list below to filter",
    assetInspector: "Asset Inspector",
    fullView: "Full View",
    noItemSelected: "No item selected",
    selectRowHint: "Select a row to view details",
    noLocationInfo: "No location info",
    
    // Inspector Tabs
    tabItems: "Items",
    tabDetails: "Details",
    tabHistory: "History",
    tabImages: "Images",
    tabQRCode: "QR Code",
    depreciation: "Depreciation",
    currentValue: "Current Value",
    purchaseDate: "Purchase Date",
    purchasePrice: "Purchase Price",
    usefulLife: "Useful Life (Years)",
    yearsOld: "Years Old",
    
    // Status Labels
    statusGood: "Good",
    statusDamaged: "Damaged",
    statusRepair: "Repair Needed",
    statusPartial: "Partial Defect",
    statusNone: "None",
    
    // Modal
    imageCounter: "Image {current} / {total}",

    // Chat
    chatAssistant: "AI Assistant",
    chatPlaceholder: "Ask about assets (e.g., 'Which room has the most damage?')",
    sending: "Thinking...",
    chatWelcome: "Hello! I can help you analyze the asset data. What would you like to know?",

    // Map Legend & Controls
    mapLegend: "Map Legend",
    normalCondition: "Normal Condition",
    someDefects: "Some Defects",
    criticalAttention: "Critical Attention",
    noDataOther: "No Data / Other",
    zoomIn: "Zoom In",
    zoomOut: "Zoom Out",
    resetView: "Reset View",
    issuesCount: "{damaged}/{total} Issues"
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
    tableView: "มุมมองตาราง",
    galleryView: "มุมมองรูปภาพ",
    floorPlanView: "แผนผังห้อง",
    exportCSV: "ส่งออก CSV",
    
    // Dashboard Panel
    conditionAnalysis: "วิเคราะห์สภาพครุภัณฑ์",
    clearFilter: "ล้างตัวกรอง",
    clickToFilter: "คลิกกราฟเพื่อกรองข้อมูล",
    assetInspector: "ตรวจสอบรายละเอียด",
    fullView: "ดูรูปขยาย",
    noItemSelected: "ยังไม่ได้เลือกรายการ",
    selectRowHint: "เลือกรายการในตารางเพื่อดูข้อมูล",
    noLocationInfo: "ไม่มีข้อมูลสถานที่",
    
    // Inspector Tabs
    tabItems: "รายการ",
    tabDetails: "รายละเอียด",
    tabHistory: "ประวัติ/ค่าเสื่อม",
    tabImages: "รูปภาพ",
    tabQRCode: "QR Code",
    depreciation: "การคำนวณค่าเสื่อมราคา",
    currentValue: "มูลค่าปัจจุบัน (ประมาณการ)",
    purchaseDate: "วันที่ได้รับ",
    purchasePrice: "ราคาซื้อ",
    usefulLife: "อายุการใช้งาน (ปี)",
    yearsOld: "อายุทรัพย์สิน (ปี)",
    
    // Status Labels
    statusGood: "สภาพดี",
    statusDamaged: "ชำรุด",
    statusRepair: "ส่งซ่อม",
    statusPartial: "ชำรุดบางส่วน",
    statusNone: "ไม่มี",
    
    // Modal
    imageCounter: "รูปที่ {current} / {total}",

    // Chat
    chatAssistant: "ผู้ช่วย AI",
    chatPlaceholder: "ถามเกี่ยวกับข้อมูล (เช่น 'ห้องไหนของเสียเยอะสุด?')",
    sending: "กำลังวิเคราะห์...",
    chatWelcome: "สวัสดีครับ! ผมสามารถช่วยวิเคราะห์ข้อมูลครุภัณฑ์ให้คุณได้ อยากทราบข้อมูลส่วนไหนถามได้เลยครับ",

    // Map Legend & Controls
    mapLegend: "สัญลักษณ์แผนที่",
    normalCondition: "สภาพปกติ",
    someDefects: "ชำรุดบางส่วน",
    criticalAttention: "ต้องดูแลเร่งด่วน",
    noDataOther: "ไม่มีข้อมูล / อื่นๆ",
    zoomIn: "ขยาย",
    zoomOut: "ย่อ",
    resetView: "รีเซ็ตมุมมอง",
    issuesCount: "พบ {damaged}/{total} รายการ"
  }
};