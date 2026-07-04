const SEARCH_LOG_SHEET_NAME = "ELLY - Search Logs";
const DEFAULT_BOOKING_SHEET_NAME = "ELLY - Dat lich";
const SPREADSHEET_ID = "";

const SEARCH_LOG_HEADERS = [
  "Thời gian",
  "Mã phiên",
  "Từ khóa",
  "Loại sự kiện",
  "Tiêu đề trang",
  "Đường dẫn",
  "Trang giới thiệu",
  "Địa chỉ IP",
  "Quốc gia",
  "Thành phố",
  "Loại thiết bị",
  "Tên thiết bị",
  "Hệ điều hành",
  "Trình duyệt",
  "User Agent",
  "Ngôn ngữ",
  "Múi giờ",
  "Độ phân giải màn hình",
  "Nền tảng"
];

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

  if (sheetName === SEARCH_LOG_SHEET_NAME) {
    appendSearchLog(params);
    return jsonResponse({ ok: true, type: "search" });
  }

  appendBooking(params, sheetName || DEFAULT_BOOKING_SHEET_NAME);
  return jsonResponse({ ok: true, type: "booking" });
}

function appendSearchLog(params) {
  const sheet = getSheetWithHeaders(SEARCH_LOG_SHEET_NAME, SEARCH_LOG_HEADERS);
  const screenResolution = params.screenResolution || joinScreenResolution(params.screenWidth, params.screenHeight);

  sheet.appendRow([
    formatLogTime(params.timestamp),
    params.sessionId || "",
    params.keyword || "",
    translateEventType(params.eventType),
    params.pageTitle || "",
    params.pathname || "",
    params.referrer || "",
    params.ip || "",
    params.country || "",
    params.city || "",
    translateDeviceType(params.deviceType),
    params.deviceName || "",
    translateOperatingSystem(params.operatingSystem),
    params.browser || "",
    params.userAgent || "",
    params.language || "",
    params.timezone || "",
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
    params.country || "",
    params.city || ""
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
    typing: "Đang gõ",
    submit: "Bấm tìm kiếm"
  };
  return map[value] || value || "";
}

function translateDeviceType(value) {
  const map = {
    Mobile: "Điện thoại",
    Tablet: "Máy tính bảng",
    Desktop: "Máy tính"
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
