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
  "Referrer",
  "IP Address",
  "IP Country",
  "IP Region",
  "IP City",
  "ISP",
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
  "Platform"
];

const BOOKING_HEADERS = [
  "Thoi gian",
  "Nguon",
  "Ho ten",
  "So dien thoai",
  "Dich vu",
  "Khu vuc",
  "Dia chi",
  "Ghi chu",
  "Dia chi IP",
  "Quoc gia",
  "Thanh pho"
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
    params.referrer || "",
    params.ip || "",
    params.ipCountry || params.country || "",
    params.ipRegion || "",
    params.ipCity || params.city || "",
    params.isp || "",
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
    params.platform || ""
  ]);
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

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  } else {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return sheet;
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
