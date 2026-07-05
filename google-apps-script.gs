const SEARCH_LOG_SHEET_NAME = "Search Logs";
const DEFAULT_BOOKING_SHEET_NAME = "ELLY - Dat lich";
const SPREADSHEET_ID = "";

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
  "Search Keyword"
];

const SEARCH_LOG_COLUMNS = {
  visitorId: 2,
  sessionId: 3,
  firstVisit: 35,
  lastVisit: 36,
  visitCount: 37,
  utmCampaign: 38,
  searchKeyword: 39
};

const BOOKING_HEADERS = [
  "Thời gian",
  "Nguồn",
  "Họ tên",
  "Số điện thoại",
  "Dịch vụ",
  "Khu vực",
  "Địa chỉ",
  "Ghi chú",
  "Địa chỉ IP",
  "Quốc gia",
  "Thành phố"
];

function doPost(e) {
  const params = e && e.parameter ? e.parameter : {};
  const sheetName = params.sheetName || "";

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
    visitorSummary.searchKeyword
  ]);

  updateVisitorSummaryRows(sheet, params.visitorId, visitorSummary);
}

function appendBooking(params, sheetName) {
  const sheet = getSheetWithHeaders(sheetName, BOOKING_HEADERS);

  sheet.appendRow([
    formatLogTime(params.createdAt),
    params.source || "",
    params.fullName || "",
    params.phone || "",
    params.service || "",
    params.province || "",
    params.address || "",
    params.note || "",
    params.ip || "",
    params.country || params.ipCountry || "",
    params.city || params.ipCity || ""
  ]);
}

function getSheetWithHeaders(sheetName, headers) {
  const spreadsheet = getSpreadsheet();
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
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
