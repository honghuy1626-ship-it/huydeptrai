const SEARCH_LOG_SHEET_NAME = "Search Logs";
const BOOKING_SHEET_NAME = "ELLY - Đặt lịch";
const DEFAULT_BOOKING_SHEET_NAME = "ELLY - Dat lich";
const SHAMPOO_BOOKING_SHEET_NAME = "ELLY - Gội đầu";
const SPREADSHEET_ID = "";
const CRM_NEW_STATUS = "NEW";
const CRM_READ_STATUS = "READ";
const CRM_NEW_CUSTOMER = "NEW CUSTOMER";
const CRM_RETURNING_CUSTOMER = "RETURNING CUSTOMER";
const CRM_NEW_COLOR = "#fff2cc";
const CRM_RETURNING_COLOR = "#d9ead3";
const CRM_READ_COLOR = "#ffffff";

const SEARCH_LOG_HEADERS = [
  "Time",
  "Visitor ID",
  "Session ID",
  "Event Type",
  "Button Name",
  "Source",
  "Landing Page",
  "Page Title",
  "Pathname",
  "Quốc gia",
  "Thành phố",
  "Khu vực/Tỉnh",
  "ISP/Nhà mạng",
  "IP Address",
  "Referrer",
  "GPS Country",
  "GPS Region",
  "GPS City",
  "GPS District",
  "GPS Ward",
  "Latitude",
  "Longitude",
  "Location Accuracy",
  "Location Permission",
  "GPS Requested",
  "Device Type",
  "Device Name",
  "Operating System",
  "Browser",
  "User Agent",
  "Language",
  "Timezone",
  "Screen Resolution",
  "Platform",
  "First Visit",
  "Last Visit",
  "Visit Count",
  "UTM Campaign",
  "Search Keyword",
  "Customer Type",
  "Status"
];

const SEARCH_LOG_COLUMNS = {
  visitorId: 2,
  sessionId: 3,
  gpsCity: 18,
  gpsDistrict: 19,
  latitude: 21,
  longitude: 22,
  firstVisit: 35,
  lastVisit: 36,
  visitCount: 37,
  utmCampaign: 38,
  searchKeyword: 39,
  customerType: 40,
  status: 41
};

const BOOKING_HEADERS = [
  "Thời gian",
  "Nguồn",
  "Họ tên",
  "Số điện thoại",
  "Dịch vụ",
  "Ngày hẹn",
  "Giờ hẹn",
  "Khu vực",
  "Địa chỉ",
  "Ghi chú",
  "Địa chỉ IP",
  "Quốc gia",
  "Thành phố",
  "Visitor ID",
  "GPS City",
  "GPS District",
  "Latitude",
  "Longitude",
  "Customer Type",
  "Status"
];

const BOOKING_COLUMNS = {
  visitorId: 14,
  customerType: 19,
  status: 20
};

const SHAMPOO_BOOKING_HEADERS = [
  "Thời gian",
  "Nguồn",
  "Họ tên",
  "Số điện thoại",
  "Gói gội đầu",
  "Ngày hẹn",
  "Giờ hẹn",
  "Khu vực",
  "Địa chỉ",
  "Ghi chú",
  "Địa chỉ IP",
  "Quốc gia",
  "Thành phố",
  "Visitor ID",
  "GPS City",
  "GPS District",
  "Latitude",
  "Longitude",
  "Customer Type",
  "Status"
];

const SHAMPOO_BOOKING_COLUMNS = {
  visitorId: 14,
  customerType: 19,
  status: 20
};

function setupShampooBookingSheet() {
  return getSheetWithHeaders(SHAMPOO_BOOKING_SHEET_NAME, SHAMPOO_BOOKING_HEADERS).getName();
}

// Chạy thủ công một lần nếu muốn tạo lại/khôi phục tab Gội đầu riêng.
// Không chỉnh sửa hay xóa dữ liệu trong tab đặt lịch Phun xăm.
function taoBangGoiDauRieng() {
  const sheet = getSheetWithHeaders(SHAMPOO_BOOKING_SHEET_NAME, SHAMPOO_BOOKING_HEADERS);
  sheet.setFrozenRows(1);
  return 'Đã sẵn sàng nhận lịch trong tab: ' + sheet.getName();
}

function doPost(e) {
  const params = e && e.parameter ? e.parameter : {};
  const sheetName = String(params.sheetName || "").trim();

  if (sheetName === SEARCH_LOG_SHEET_NAME || sheetName === "ELLY - Search Logs") {
    appendSearchLog(params);
    return jsonResponse({ ok: true, type: "search_log" });
  }

  appendBooking(params, sheetName || DEFAULT_BOOKING_SHEET_NAME);
  return jsonResponse({ ok: true, type: "booking" });
}

function appendSearchLog(params) {
  const sheet = getSheetWithHeaders(SEARCH_LOG_SHEET_NAME, SEARCH_LOG_HEADERS);
  const screenResolution = params.screenResolution || joinScreenResolution(params.screenWidth, params.screenHeight);
  const visitorSummary = buildVisitorSummary(sheet, params);
  const customerType = getCustomerTypeForVisitor(sheet, SEARCH_LOG_COLUMNS.visitorId, params.visitorId);

  sheet.appendRow([
    formatLogTime(params.timestamp),
    params.visitorId || "",
    params.sessionId || "",
    translateEventType(params.eventType),
    params.buttonName || params.keyword || "",
    params.source || "",
    params.landingPage || "",
    params.pageTitle || "",
    params.pathname || "",
    params.ipCountry || params.country || "",
    params.ipCity || params.city || "",
    params.ipRegion || "",
    params.isp || "",
    params.ip || "",
    params.referrer || "",
    params.gpsCountry || "",
    params.gpsRegion || "",
    params.gpsCity || "",
    params.gpsDistrict || "",
    params.gpsWard || "",
    params.latitude || "",
    params.longitude || "",
    params.locationAccuracy || "",
    params.locationPermissionStatus || "",
    params.gpsRequested || "",
    translateDeviceType(params.deviceType),
    params.deviceName || "",
    translateOperatingSystem(params.operatingSystem),
    params.browser || "",
    params.userAgent || "",
    params.language || "",
    params.timezone || params.ipTimezone || "",
    screenResolution,
    params.platform || "",
    visitorSummary.firstVisit,
    visitorSummary.lastVisit,
    visitorSummary.visitCount,
    visitorSummary.utmCampaign,
    visitorSummary.searchKeyword,
    customerType,
    CRM_NEW_STATUS
  ]);

  markNewCrmRow(sheet, sheet.getLastRow(), SEARCH_LOG_HEADERS.length, customerType);
  updateVisitorSummaryRows(sheet, params.visitorId, visitorSummary);
}

function appendBooking(params, sheetName) {
  const isShampooBooking = sheetName === SHAMPOO_BOOKING_SHEET_NAME;
  const headers = isShampooBooking ? SHAMPOO_BOOKING_HEADERS : BOOKING_HEADERS;
  const columns = isShampooBooking ? SHAMPOO_BOOKING_COLUMNS : BOOKING_COLUMNS;
  const sheet = getSheetWithHeaders(sheetName, headers);
  const bookingTracking = getBookingTrackingFromSearchLogs(params);
  const customerType = getCustomerTypeForVisitor(sheet, columns.visitorId, bookingTracking.visitorId);

  const bookingRow = [
    formatLogTime(params.createdAt),
    params.source || "",
    params.fullName || "",
    params.phone || "",
    params.service || "",
    params.appointmentDate || "",
    params.appointmentTime || ""
  ];

  bookingRow.push(
    params.province || "",
    params.address || "",
    params.note || "",
    params.ip || "",
    params.country || params.ipCountry || "",
    params.city || params.ipCity || "",
    bookingTracking.visitorId,
    bookingTracking.gpsCity,
    bookingTracking.gpsDistrict,
    bookingTracking.latitude,
    bookingTracking.longitude,
    customerType,
    CRM_NEW_STATUS
  );
  sheet.appendRow(bookingRow);

  markNewCrmRow(sheet, sheet.getLastRow(), headers.length, customerType);
}

function getSheetWithHeaders(sheetName, headers) {
  const spreadsheet = getSpreadsheet();
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  // Chỉ chạy một lần cho sheet đặt lịch cũ: chèn cột vào giữa thay vì
  // ghi đè tiêu đề, nhờ đó toàn bộ dữ liệu cũ vẫn nằm đúng cột.
  if (headers === BOOKING_HEADERS) {
    ensureBookingAppointmentColumns(sheet);
  }

  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  } else {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return sheet;
}

function ensureBookingAppointmentColumns(sheet) {
  if (sheet.getLastRow() === 0) return;

  const firstRow = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 7)).getDisplayValues()[0];
  const hasAppointmentColumns = firstRow[5] === "Ngày hẹn" && firstRow[6] === "Giờ hẹn";
  if (!hasAppointmentColumns) {
    sheet.insertColumnsAfter(5, 2);
  }
}

// Chạy thủ công hàm này một lần trong Apps Script để thêm ngay hai cột
// "Ngày hẹn" và "Giờ hẹn" vào tab đặt lịch chung, kể cả khi chưa có đơn mới.
function addAppointmentColumnsToBookingSheet() {
  const spreadsheet = getSpreadsheet();
  const sheet = spreadsheet.getSheetByName(BOOKING_SHEET_NAME)
    || spreadsheet.getSheetByName(DEFAULT_BOOKING_SHEET_NAME);

  if (!sheet) {
    throw new Error('Không tìm thấy tab "' + BOOKING_SHEET_NAME + '". Hãy kiểm tra đúng tên tab đặt lịch.');
  }

  ensureBookingAppointmentColumns(sheet);
  if (sheet.getMaxColumns() < BOOKING_HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), BOOKING_HEADERS.length - sheet.getMaxColumns());
  }
  sheet.getRange(1, 1, 1, BOOKING_HEADERS.length).setValues([BOOKING_HEADERS]);
  sheet.setFrozenRows(1);
  return 'Đã thêm cột Ngày hẹn và Giờ hẹn vào tab: ' + sheet.getName();
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Đánh dấu đã đọc")
    .addItem("Đánh dấu dòng đang chọn", "markSelectedRowAsRead")
    .addToUi();
}

function onSelectionChange(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const crmConfig = getCrmConfigForSheet(sheet);
  if (!crmConfig) return;
  markRowAsRead(sheet, e.range.getRow(), crmConfig);
}

function markSelectedRowAsRead() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const activeRange = sheet.getActiveRange();
  if (!activeRange) return;
  const crmConfig = getCrmConfigForSheet(sheet);
  if (!crmConfig) return;
  markRowAsRead(sheet, activeRange.getRow(), crmConfig);
}

function getCrmConfigForSheet(sheet) {
  const sheetName = sheet.getName().trim();
  if (sheetName === SEARCH_LOG_SHEET_NAME) {
    return {
      headersLength: SEARCH_LOG_HEADERS.length,
      statusColumn: SEARCH_LOG_COLUMNS.status
    };
  }

  if (sheetName === BOOKING_SHEET_NAME || sheetName === DEFAULT_BOOKING_SHEET_NAME) {
    return {
      headersLength: BOOKING_HEADERS.length,
      statusColumn: BOOKING_COLUMNS.status
    };
  }

  if (sheetName === SHAMPOO_BOOKING_SHEET_NAME) {
    return {
      headersLength: SHAMPOO_BOOKING_HEADERS.length,
      statusColumn: SHAMPOO_BOOKING_COLUMNS.status
    };
  }

  return null;
}

function getCustomerTypeForVisitor(sheet, visitorIdColumn, visitorId) {
  if (!visitorId || sheet.getLastRow() < 2) {
    return CRM_NEW_CUSTOMER;
  }

  const visitorIds = sheet.getRange(2, visitorIdColumn, sheet.getLastRow() - 1, 1).getValues();
  const hasExistingVisitor = visitorIds.some(function(row) {
    return String(row[0] || "") === String(visitorId);
  });

  return hasExistingVisitor ? CRM_RETURNING_CUSTOMER : CRM_NEW_CUSTOMER;
}

function markNewCrmRow(sheet, rowNumber, headersLength, customerType) {
  if (rowNumber < 2) return;
  const color = customerType === CRM_RETURNING_CUSTOMER ? CRM_RETURNING_COLOR : CRM_NEW_COLOR;
  sheet.getRange(rowNumber, 1, 1, headersLength).setBackground(color);
}

function markRowAsRead(sheet, rowNumber, crmConfig) {
  if (rowNumber < 2) return;
  const statusCell = sheet.getRange(rowNumber, crmConfig.statusColumn);
  if (statusCell.getValue() !== CRM_NEW_STATUS) return;
  statusCell.setValue(CRM_READ_STATUS);
  sheet.getRange(rowNumber, 1, 1, crmConfig.headersLength).setBackground(CRM_READ_COLOR);
}

function buildVisitorSummary(sheet, params) {
  const now = formatLogTime(params.timestamp);
  const visitorId = params.visitorId || "";
  const sessionId = params.sessionId || "";
  const currentSearchKeyword = params.searchKeyword || params.keyword || "";
  const currentUtmCampaign = params.utmCampaign || "";

  const summary = {
    firstVisit: params.firstVisit ? formatLogTime(params.firstVisit) : now,
    lastVisit: now,
    visitCount: 1,
    utmCampaign: currentUtmCampaign,
    searchKeyword: currentSearchKeyword
  };

  if (!visitorId || sheet.getLastRow() < 2) {
    return summary;
  }

  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, SEARCH_LOG_HEADERS.length).getValues();
  const sessions = {};

  values.forEach(function(row) {
    if (row[SEARCH_LOG_COLUMNS.visitorId - 1] !== visitorId) return;

    const existingFirstVisit = row[SEARCH_LOG_COLUMNS.firstVisit - 1];
    const existingLastVisit = row[SEARCH_LOG_COLUMNS.lastVisit - 1];
    const existingUtmCampaign = row[SEARCH_LOG_COLUMNS.utmCampaign - 1];
    const existingSearchKeyword = row[SEARCH_LOG_COLUMNS.searchKeyword - 1];
    const existingSessionId = row[SEARCH_LOG_COLUMNS.sessionId - 1];

    if (existingSessionId) {
      sessions[String(existingSessionId)] = true;
    }

    if (existingFirstVisit && (!summary.firstVisit || String(existingFirstVisit) < String(summary.firstVisit))) {
      summary.firstVisit = existingFirstVisit;
    }

    if (existingLastVisit && String(existingLastVisit) > String(summary.lastVisit)) {
      summary.lastVisit = existingLastVisit;
    }

    if (!summary.utmCampaign && existingUtmCampaign) {
      summary.utmCampaign = existingUtmCampaign;
    }

    if (!summary.searchKeyword && existingSearchKeyword) {
      summary.searchKeyword = existingSearchKeyword;
    }
  });

  if (sessionId) {
    sessions[String(sessionId)] = true;
  }

  summary.lastVisit = now;
  summary.visitCount = Math.max(1, Object.keys(sessions).length);
  if (currentUtmCampaign) summary.utmCampaign = currentUtmCampaign;
  if (currentSearchKeyword) summary.searchKeyword = currentSearchKeyword;

  return summary;
}

function getBookingTrackingFromSearchLogs(params) {
  const tracking = {
    visitorId: params.visitorId || "",
    gpsCity: params.gpsCity || "",
    gpsDistrict: params.gpsDistrict || "",
    latitude: params.latitude || "",
    longitude: params.longitude || ""
  };

  if (!tracking.visitorId) {
    return tracking;
  }

  const spreadsheet = getSpreadsheet();
  const searchSheet = spreadsheet.getSheetByName(SEARCH_LOG_SHEET_NAME);
  if (!searchSheet || searchSheet.getLastRow() < 2) {
    return tracking;
  }

  const values = searchSheet.getRange(2, 1, searchSheet.getLastRow() - 1, SEARCH_LOG_HEADERS.length).getValues();
  for (let index = values.length - 1; index >= 0; index--) {
    const row = values[index];
    if (row[SEARCH_LOG_COLUMNS.visitorId - 1] !== tracking.visitorId) continue;

    tracking.gpsCity = tracking.gpsCity || row[SEARCH_LOG_COLUMNS.gpsCity - 1] || "";
    tracking.gpsDistrict = tracking.gpsDistrict || row[SEARCH_LOG_COLUMNS.gpsDistrict - 1] || "";
    tracking.latitude = tracking.latitude || row[SEARCH_LOG_COLUMNS.latitude - 1] || "";
    tracking.longitude = tracking.longitude || row[SEARCH_LOG_COLUMNS.longitude - 1] || "";

    if (tracking.gpsCity || tracking.gpsDistrict || tracking.latitude || tracking.longitude) {
      break;
    }
  }

  return tracking;
}

function updateVisitorSummaryRows(sheet, visitorId, summary) {
  if (!visitorId || sheet.getLastRow() < 2) return;

  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, SEARCH_LOG_HEADERS.length).getValues();
  values.forEach(function(row, index) {
    if (row[SEARCH_LOG_COLUMNS.visitorId - 1] !== visitorId) return;
    const rowNumber = index + 2;
    sheet.getRange(rowNumber, SEARCH_LOG_COLUMNS.firstVisit, 1, 5).setValues([[
      summary.firstVisit,
      summary.lastVisit,
      summary.visitCount,
      summary.utmCampaign,
      summary.searchKeyword
    ]]);
  });
}

function getSpreadsheet() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  return SpreadsheetApp.getActiveSpreadsheet();
}

function joinScreenResolution(width, height) {
  if (!width || !height) return "";
  return width + "x" + height;
}

function formatLogTime(value) {
  if (!value) {
    return Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");
  }

  const parsed = new Date(value);
  if (!isNaN(parsed.getTime()) && String(value).indexOf("T") !== -1) {
    return Utilities.formatDate(parsed, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");
  }

  return value;
}

function translateEventType(value) {
  const map = {
    visit: "Visit",
    page_view: "Page View",
    booking_click: "Booking Click",
    typing: "Typing",
    submit: "Search Submit"
  };
  return map[value] || value || "";
}

function translateDeviceType(value) {
  const map = {
    Mobile: "Dien thoai",
    Tablet: "May tinh bang",
    Desktop: "May tinh"
  };
  return map[value] || value || "";
}

function translateOperatingSystem(value) {
  const map = {
    Android: "Android",
    iOS: "iOS",
    Windows: "Windows",
    macOS: "macOS",
    Linux: "Linux"
  };
  return map[value] || value || "";
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
