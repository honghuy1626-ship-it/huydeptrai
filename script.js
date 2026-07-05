const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzQkG1BLZvsvUizthvixSCMHQ6rit1bRDHEi0cpTN111eXiYgrfGXzb-KjBv1h3FaqUhA/exec";
const SEARCH_LOG_APPS_SCRIPT_URL = APPS_SCRIPT_URL;
const SEARCH_LOG_DEMO_MODE = false;
const BOOKING_RATE_KEY = "ellyBookingRate";
const SEARCH_SESSION_KEY = "ellySearchSessionId";
const VISITOR_COOKIE_NAME = "visitorId";
const VISITOR_COOKIE_DAYS = 365;
const VISIT_LOG_SENT_KEY = "ellyVisitLogSent";
const BOOKING_CLICK_RATE_KEY = "ellyBookingClickRate";
const PENDING_BOOKING_CLICK_KEY = "ellyPendingBookingClick";
const GPS_CACHE_KEY = "ellyGpsLocation";
const SEARCH_LOG_DEMO_KEY = "ellySearchLogDemo";
const SEARCH_LOCATION_KEY = "ellySearchLocation";
const VISITOR_STATS_KEY = "ellyVisitorStats";
const SEARCH_LAST_KEYWORD_KEY = "ellyLastSearchKeyword";
const TRACKING_DEMO_PARAM = "trackingDemo";
const GPS_SESSION_REQUESTED_KEY = "ellyGpsRequestedThisSession";
const SEARCH_LOCATION_SOURCES = [
  {
    url: "https://api.ipify.org?format=json",
    ipOnly: true,
    map: (data) => ({
      ip: data.ip
    })
  },
  {
    url: "https://ipapi.co/json/",
    map: (data) => ({
      ip: data.ip,
      country: data.country_name,
      region: data.region,
      city: data.city,
      isp: data.org,
      timezone: data.timezone
    })
  },
  {
    url: "https://ipwho.is/",
    map: (data) => ({
      ip: data.ip,
      country: data.country,
      region: data.region,
      city: data.city,
      isp: data.connection?.isp,
      timezone: data.timezone?.id
    })
  },
  {
    url: "https://get.geojs.io/v1/ip/geo.json",
    map: (data) => ({
      ip: data.ip,
      country: data.country,
      region: data.region,
      city: data.city,
      isp: data.organization_name,
      timezone: data.timezone
    })
  }
];
const BOOKING_LIMIT = {
  maxAttempts: 3,
  windowMs: 10 * 60 * 1000,
  minDelayMs: 12 * 1000
};
const FIELD_LIMITS = {
  fullName: 60,
  phone: 16,
  service: 80,
  province: 60,
  address: 180,
  note: 260
};
const SAFE_FORM_KEYS = new Set(["fullName", "phone", "service", "province", "address", "note"]);

const body = document.body;
const menuToggle = document.querySelector("[data-menu-toggle]");
const mainNav = document.querySelector("#mainNav");
const popover = document.querySelector("[data-booking-popover]");
const popupForm = document.querySelector("#popupBookingForm");
const popupMessage = document.querySelector("[data-popup-message]");
const selectedServiceText = document.querySelector("[data-booking-selected]");
const serviceSelect = document.querySelector("[data-popup-service]");
const logoAssetPath = window.location.pathname.includes("/kien-thuc/") ? "../assets/elly-logo.png" : "assets/elly-logo.png";

function cleanText(value, maxLength = 120) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g, " ")
    .replace(/[<>{}`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanPhone(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[^\d+]/g, "")
    .replace(/^\+84/, "0")
    .replace(/^84(?=\d{8,10}$)/, "0")
    .slice(0, FIELD_LIMITS.phone);
}

function protectSheetValue(value) {
  const cleanValue = String(value || "");
  return /^[=+\-@]/.test(cleanValue) ? `'${cleanValue}` : cleanValue;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeSearchText(value) {
  return cleanText(value, 500)
    .toLocaleLowerCase("vi-VN")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function buildKnowledgeSearchTerms(keyword) {
  const normalized = normalizeSearchText(keyword);
  const terms = new Set(normalized.split(/\s+/).filter((term) => term.length >= 2));

  if (normalized.includes("moi")) {
    ["moi", "phun moi", "mau moi", "cham soc moi"].forEach((term) => terms.add(term));
  }

  if (normalized.includes("may") || normalized.includes("chan") || normalized.includes("chan may") || normalized.includes("dieu khac")) {
    ["chan may", "phun may", "dang may", "dieu khac", "tan bot", "ombre", "nano"].forEach((term) => terms.add(term));
  }

  if (normalized.includes("mi")) {
    ["mi", "phun mi", "mo trong"].forEach((term) => terms.add(term));
  }

  if (normalized.includes("phun xam")) {
    ["phun xam", "tu van", "tai nha"].forEach((term) => terms.add(term));
  }

  return { normalized, terms: Array.from(terms) };
}

function createTrackingId(prefix) {
  const randomPart = window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${randomPart}`;
}

function getCookieValue(name) {
  const cookie = document.cookie.split("; ").find((item) => item.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : "";
}

function setCookieValue(name, value, days) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getOrCreateVisitorId() {
  try {
    const existing = getCookieValue(VISITOR_COOKIE_NAME);
    if (existing) return existing;
    const visitorId = createTrackingId("visitor");
    setCookieValue(VISITOR_COOKIE_NAME, visitorId, VISITOR_COOKIE_DAYS);
    return visitorId;
  } catch (error) {
    return createTrackingId("visitor");
  }
}

function getOrCreateSessionId() {
  try {
    const existing = sessionStorage.getItem(SEARCH_SESSION_KEY);
    if (existing) return existing;
    const sessionId = createTrackingId("session");
    sessionStorage.setItem(SEARCH_SESSION_KEY, sessionId);
    return sessionId;
  } catch (error) {
    return createTrackingId("session");
  }
}

function isSearchLogDemoMode() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get(TRACKING_DEMO_PARAM) === "1") {
      sessionStorage.setItem(SEARCH_LOG_DEMO_KEY, "1");
      return true;
    }
    return SEARCH_LOG_DEMO_MODE || sessionStorage.getItem(SEARCH_LOG_DEMO_KEY) === "1";
  } catch (error) {
    return SEARCH_LOG_DEMO_MODE;
  }
}

function getUtmCampaignDetails() {
  const params = new URLSearchParams(window.location.search);
  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  return keys
    .map((key) => {
      const value = cleanText(params.get(key), 180);
      return value ? `${key}=${value}` : "";
    })
    .filter(Boolean)
    .join("; ");
}

function getLastSearchKeyword() {
  try {
    return cleanText(sessionStorage.getItem(SEARCH_LAST_KEYWORD_KEY), 160);
  } catch (error) {
    return "";
  }
}

function setLastSearchKeyword(keyword) {
  const cleanKeyword = cleanText(keyword, 160);
  if (!cleanKeyword) return;
  try {
    sessionStorage.setItem(SEARCH_LAST_KEYWORD_KEY, cleanKeyword);
  } catch (error) {
    // Search keyword cache is optional.
  }
}

function getVisitorStatsForPayload(visitorId, sessionId) {
  const now = new Date().toISOString();

  try {
    const allStats = JSON.parse(localStorage.getItem(VISITOR_STATS_KEY) || "{}");
    const stats = allStats[visitorId] || {
      firstVisit: now,
      lastVisit: "",
      visitCount: 0,
      sessions: []
    };

    if (!stats.firstVisit) stats.firstVisit = now;
    if (!Array.isArray(stats.sessions)) stats.sessions = [];

    if (sessionId && !stats.sessions.includes(sessionId)) {
      stats.sessions.push(sessionId);
      stats.visitCount = Number(stats.visitCount || 0) + 1;
    }

    stats.lastVisit = now;
    stats.sessions = stats.sessions.slice(-80);
    allStats[visitorId] = stats;
    localStorage.setItem(VISITOR_STATS_KEY, JSON.stringify(allStats));

    return {
      firstVisit: stats.firstVisit,
      lastVisit: stats.lastVisit,
      visitCount: String(Math.max(1, Number(stats.visitCount || 1)))
    };
  } catch (error) {
    return {
      firstVisit: now,
      lastVisit: now,
      visitCount: "1"
    };
  }
}

function detectDeviceType() {
  const ua = navigator.userAgent || "";
  if (/ipad|tablet|playbook|silk/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) return "Tablet";
  if (/mobi|iphone|ipod|android|blackberry|phone/i.test(ua)) return "Mobile";
  return "Desktop";
}

function detectOperatingSystem() {
  const ua = navigator.userAgent || "";
  const platform = navigator.userAgentData?.platform || navigator.platform || "";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/win/i.test(platform)) return "Windows";
  if (/mac/i.test(platform)) return "macOS";
  if (/linux/i.test(platform)) return "Linux";
  return platform || "";
}

function detectBrowser() {
  const ua = navigator.userAgent || "";
  if (/Edg\//.test(ua)) return "Microsoft Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return "Chrome";
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "Safari";
  if (/Firefox\//.test(ua)) return "Firefox";
  return "";
}

async function getDeviceName() {
  const uaData = navigator.userAgentData;
  if (!uaData?.getHighEntropyValues) return "";
  try {
    const hints = await uaData.getHighEntropyValues(["model", "platform", "platformVersion"]);
    return hints.model || "";
  } catch (error) {
    return "";
  }
}

function normalizeCountryName(country) {
  return country === "Vietnam" || country === "Viet Nam" ? "Việt Nam" : country;
}

async function fetchJsonWithTimeout(url, timeoutMs = 2500) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) throw new Error("Location lookup failed");
    return await response.json();
  } finally {
    window.clearTimeout(timer);
  }
}

async function getVisitorLocation() {
  try {
    const cached = sessionStorage.getItem(SEARCH_LOCATION_KEY);
    if (cached) {
      const location = JSON.parse(cached);
      if (location.ip || location.country || location.city) return location;
      sessionStorage.removeItem(SEARCH_LOCATION_KEY);
    }
  } catch (error) {
    // Location lookup should never interrupt search logging.
  }

  let knownIp = "";

  for (const source of SEARCH_LOCATION_SOURCES) {
    try {
      const data = await fetchJsonWithTimeout(source.url);
      const mapped = source.map(data);
      if (mapped.ip && !knownIp) knownIp = cleanText(mapped.ip, 80);

      if (source.ipOnly && knownIp) {
        try {
          const ipGeoData = await fetchJsonWithTimeout(`https://ipapi.co/${encodeURIComponent(knownIp)}/json/`, 3000);
          const ipGeo = {
            ip: ipGeoData.ip || knownIp,
            country: ipGeoData.country_name,
            region: ipGeoData.region,
            city: ipGeoData.city,
            isp: ipGeoData.org,
            timezone: ipGeoData.timezone
          };

          if (ipGeo.country || ipGeo.city || ipGeo.region || ipGeo.isp) {
            const location = {
              ip: cleanText(ipGeo.ip, 80),
              country: cleanText(normalizeCountryName(ipGeo.country), 80),
              region: cleanText(ipGeo.region, 100),
              city: cleanText(ipGeo.city, 80),
              isp: cleanText(ipGeo.isp, 120),
              timezone: cleanText(ipGeo.timezone, 80)
            };

            try {
              sessionStorage.setItem(SEARCH_LOCATION_KEY, JSON.stringify(location));
            } catch (error) {
              // Cache is optional.
            }

            return location;
          }
        } catch (error) {
          // Keep the IP and continue with the fallback lookup services.
        }
      }

      if (!mapped.ip && !mapped.country && !mapped.city) continue;

      const location = {
        ip: cleanText(mapped.ip || knownIp, 80),
        country: cleanText(normalizeCountryName(mapped.country), 80),
        region: cleanText(mapped.region, 100),
        city: cleanText(mapped.city, 80),
        isp: cleanText(mapped.isp, 120),
        timezone: cleanText(mapped.timezone, 80)
      };

      try {
        sessionStorage.setItem(SEARCH_LOCATION_KEY, JSON.stringify(location));
      } catch (error) {
        // Cache is optional.
      }

      return location;
    } catch (error) {
      // Try the next lookup service.
    }
  }

  return { ip: knownIp, country: "", region: "", city: "", isp: "", timezone: "" };
}

async function getIpGeoLocation() {
  const location = await getVisitorLocation();
  return {
    ip: location.ip || "",
    ipCountry: location.country || "",
    ipRegion: location.region || "",
    ipCity: location.city || "",
    isp: location.isp || "",
    ipTimezone: location.timezone || ""
  };
}

function detectTrafficSource() {
  const params = new URLSearchParams(window.location.search);
  const utmSource = cleanText(params.get("utm_source"), 80);
  const utmMedium = cleanText(params.get("utm_medium"), 80);
  const utmCampaign = cleanText(params.get("utm_campaign"), 120);
  if (utmSource) {
    return [utmSource, utmMedium, utmCampaign].filter(Boolean).join(" / ");
  }

  const referrer = document.referrer || "";
  if (/facebook\.com|fb\.com|l\.facebook\.com/i.test(referrer)) return "Facebook";
  if (/google\./i.test(referrer)) return "Google";
  if (/tiktok\.com/i.test(referrer)) return "TikTok";
  if (/zalo\.me|zaloapp\.com/i.test(referrer)) return "Zalo";
  return "Direct";
}

async function getDeviceInfo() {
  const screenWidth = String(window.screen?.width || "");
  const screenHeight = String(window.screen?.height || "");
  return {
    deviceType: detectDeviceType(),
    deviceName: await getDeviceName(),
    operatingSystem: detectOperatingSystem(),
    browser: detectBrowser(),
    userAgent: navigator.userAgent || "",
    language: navigator.language || "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    screenWidth,
    screenHeight,
    screenResolution: screenWidth && screenHeight ? `${screenWidth}x${screenHeight}` : "",
    platform: navigator.userAgentData?.platform || navigator.platform || ""
  };
}

function readCachedGpsLocation() {
  try {
    const cached = sessionStorage.getItem(GPS_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    return null;
  }
}

function cacheGpsLocation(location) {
  try {
    sessionStorage.setItem(GPS_CACHE_KEY, JSON.stringify(location));
  } catch (error) {
    // GPS cache is optional.
  }
}

function requestBrowserGpsLocation(timeoutMs = 15000) {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve({ locationPermissionStatus: "unsupported", gpsRequested: "No" });
      return;
    }

    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ locationPermissionStatus: "timeout", gpsRequested: "Yes" });
    }, timeoutMs + 900);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve({
          latitude: String(position.coords.latitude || ""),
          longitude: String(position.coords.longitude || ""),
          locationAccuracy: String(position.coords.accuracy || ""),
          locationPermissionStatus: "granted",
          gpsRequested: "Yes"
        });
      },
      (error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve({
          latitude: "",
          longitude: "",
          locationAccuracy: "",
          locationPermissionStatus: error.code === error.PERMISSION_DENIED ? "denied" : "timeout",
          gpsRequested: "Yes"
        });
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}

async function reverseGeocodeLocation(latitude, longitude) {
  if (!latitude || !longitude) return {};

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&accept-language=vi`;
    const data = await fetchJsonWithTimeout(url, 4500);
    const address = data.address || {};
    return {
      gpsCountry: cleanText(address.country, 100),
      gpsRegion: cleanText(address.state || address.region, 100),
      gpsCity: cleanText(address.city || address.town || address.province, 100),
      gpsDistrict: cleanText(address.suburb || address.county || address.city_district, 100),
      gpsWard: cleanText(address.quarter || address.neighbourhood || address.village, 100)
    };
  } catch (error) {
    return {};
  }
}

async function getGpsLocationForTracking({ askIfPrompt = false } = {}) {
  const cached = readCachedGpsLocation();
  if (cached?.locationPermissionStatus === "granted") {
    return { ...cached, gpsRequested: "No" };
  }
  if (cached?.locationPermissionStatus === "denied" || cached?.locationPermissionStatus === "denied_by_user") {
    return { ...cached, gpsRequested: "No" };
  }
  if (!("geolocation" in navigator)) {
    const unsupported = { locationPermissionStatus: "unsupported", gpsRequested: "No" };
    cacheGpsLocation(unsupported);
    return unsupported;
  }

  if (navigator.permissions?.query) {
    try {
      const permission = await navigator.permissions.query({ name: "geolocation" });
      if (permission.state === "denied") {
        const denied = { locationPermissionStatus: "denied", gpsRequested: "No" };
        cacheGpsLocation(denied);
        return denied;
      }
      if (permission.state === "prompt" && !askIfPrompt) return { locationPermissionStatus: "prompt", gpsRequested: "No" };
    } catch (error) {
      if (!askIfPrompt) return { locationPermissionStatus: "prompt", gpsRequested: "No" };
    }
  } else if (!askIfPrompt) {
    return { locationPermissionStatus: "prompt", gpsRequested: "No" };
  }

  const gps = await requestBrowserGpsLocation();
  if (gps.locationPermissionStatus === "granted") {
    const address = await reverseGeocodeLocation(gps.latitude, gps.longitude);
    const fullGps = { ...gps, ...address };
    cacheGpsLocation(fullGps);
    return fullGps;
  }

  if (gps.locationPermissionStatus === "denied") {
    cacheGpsLocation(gps);
  }

  return gps;
}

async function getGpsLocationForPageVisit() {
  try {
    if (sessionStorage.getItem(GPS_SESSION_REQUESTED_KEY)) {
      return getGpsLocationForTracking({ askIfPrompt: false });
    }
    sessionStorage.setItem(GPS_SESSION_REQUESTED_KEY, "1");
  } catch (error) {
    // Session guard is optional.
  }

  return getGpsLocationForTracking({ askIfPrompt: true });
}

async function buildVisitLogPayload(eventType, extra = {}) {
  const ipGeo = await getIpGeoLocation();
  const device = await getDeviceInfo();
  const gps = extra.gps || {};
  const visitorId = getOrCreateVisitorId();
  const sessionId = getOrCreateSessionId();
  const visitorStats = getVisitorStatsForPayload(visitorId, sessionId);
  return {
    timestamp: new Date().toISOString(),
    visitorId,
    sessionId,
    eventType,
    buttonName: cleanText(extra.buttonName, 120),
    source: extra.source || detectTrafficSource(),
    landingPage: sessionStorage.getItem("ellyLandingPage") || window.location.href,
    pageTitle: document.title || "",
    pathname: window.location.pathname || "",
    referrer: document.referrer || "",
    ...visitorStats,
    utmCampaign: getUtmCampaignDetails(),
    searchKeyword: getLastSearchKeyword(),
    ...ipGeo,
    gpsCountry: gps.gpsCountry || "",
    gpsRegion: gps.gpsRegion || "",
    gpsCity: gps.gpsCity || "",
    gpsDistrict: gps.gpsDistrict || "",
    gpsWard: gps.gpsWard || "",
    latitude: gps.latitude || "",
    longitude: gps.longitude || "",
    locationAccuracy: gps.locationAccuracy || "",
    locationPermissionStatus: gps.locationPermissionStatus || "",
    gpsRequested: gps.gpsRequested || "No",
    ...device
  };
}

async function sendVisitLogToGoogleSheet(payload) {
  await sendSearchLogToGoogleSheet(payload);
}

async function buildSearchLogPayload(keyword, eventType) {
  const screenWidth = String(window.screen?.width || "");
  const screenHeight = String(window.screen?.height || "");
  const location = await getVisitorLocation();
  const visitorId = getOrCreateVisitorId();
  const sessionId = getOrCreateSessionId();
  const visitorStats = getVisitorStatsForPayload(visitorId, sessionId);
  const searchKeyword = cleanText(keyword, 160);
  setLastSearchKeyword(searchKeyword);

  return {
    timestamp: new Date().toLocaleString("vi-VN"),
    visitorId,
    sessionId,
    keyword: searchKeyword,
    searchKeyword,
    eventType,
    source: detectTrafficSource(),
    landingPage: sessionStorage.getItem("ellyLandingPage") || window.location.href,
    pageTitle: document.title || "",
    pathname: window.location.pathname || "",
    referrer: document.referrer || "",
    ...visitorStats,
    utmCampaign: getUtmCampaignDetails(),
    ip: location.ip,
    ipCountry: location.country,
    ipRegion: location.region,
    ipCity: location.city,
    isp: location.isp,
    country: location.country,
    city: location.city,
    deviceType: detectDeviceType(),
    deviceName: await getDeviceName(),
    operatingSystem: detectOperatingSystem(),
    browser: detectBrowser(),
    userAgent: navigator.userAgent || "",
    language: navigator.language || "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    screenWidth,
    screenHeight,
    screenResolution: screenWidth && screenHeight ? `${screenWidth}x${screenHeight}` : "",
    platform: navigator.userAgentData?.platform || navigator.platform || ""
  };
}

async function sendSearchLogToGoogleSheet(payload) {
  if (isSearchLogDemoMode() || !SEARCH_LOG_APPS_SCRIPT_URL) {
    try {
      const rows = JSON.parse(localStorage.getItem(SEARCH_LOG_DEMO_KEY) || "[]");
      rows.push(payload);
      localStorage.setItem(SEARCH_LOG_DEMO_KEY, JSON.stringify(rows.slice(-100)));
    } catch (error) {
      // Demo mode should never interrupt search.
    }
    console.info("Search log demo:", payload);
    return;
  }

  const params = new URLSearchParams();
  params.set("sheetName", "Search Logs");
  Object.entries(payload).forEach(([key, value]) => {
    params.set(key, protectSheetValue(value));
  });

  await fetch(SEARCH_LOG_APPS_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    body: params
  });
}

function isAllowedSelectValue(select, value) {
  if (!select || !value) return false;
  return Array.from(select.options).some((option) => option.value === value && option.value !== "");
}

function readRateState() {
  try {
    return JSON.parse(localStorage.getItem(BOOKING_RATE_KEY) || "[]");
  } catch (error) {
    return [];
  }
}

function canSubmitNow() {
  const now = Date.now();
  const recent = readRateState().filter((time) => now - Number(time) < BOOKING_LIMIT.windowMs);
  const lastAttempt = Number(recent[recent.length - 1] || 0);

  if (recent.length >= BOOKING_LIMIT.maxAttempts || (lastAttempt && now - lastAttempt < BOOKING_LIMIT.minDelayMs)) {
    try {
      localStorage.setItem(BOOKING_RATE_KEY, JSON.stringify(recent));
    } catch (error) {
      return false;
    }
    return false;
  }

  recent.push(now);
  try {
    localStorage.setItem(BOOKING_RATE_KEY, JSON.stringify(recent));
  } catch (error) {
    return false;
  }
  return true;
}

function SearchBox(root, options = {}) {
  const items = Array.from(document.querySelectorAll(options.itemSelector || ".lead-card, .side-card, .news-row"));
  const debounceMs = options.debounceMs || 1500;
  const maxSuggestions = options.maxSuggestions || 30;
  let typingTimer = null;
  let lastTypingKeyword = "";

  root.innerHTML = `
    <form class="knowledge-search-form" data-search-form role="search">
      <input type="search" name="keyword" placeholder="Tìm bài viết trong Kiến thức" autocomplete="off" aria-label="Từ khóa tìm kiếm" />
      <button type="submit">Tìm kiếm</button>
    </form>
    <p class="knowledge-search-status" data-search-status aria-live="polite"></p>
    <div class="knowledge-search-results" data-search-results hidden></div>
  `;

  const form = root.querySelector("[data-search-form]");
  const input = form.querySelector("input");
  const status = root.querySelector("[data-search-status]");
  const results = root.querySelector("[data-search-results]");

  const articleData = items.map((item) => {
    const link = item.matches("a[href]") ? item : item.querySelector("h2 a[href], .read-more[href], a[href]");
    const image = item.querySelector("img");
    const title = cleanText(item.querySelector("h2")?.textContent || link?.textContent || item.textContent, 180);
    const excerpt = cleanText(item.querySelector("p")?.textContent || "", 180);
    const category = cleanText(item.querySelector(".news-kicker")?.textContent || "Bài viết", 80);

    return {
      item,
      href: link?.href || "",
      imageSrc: image?.getAttribute("src") || "",
      imageAlt: cleanText(image?.getAttribute("alt") || title, 120),
      title,
      excerpt,
      category,
      searchTitle: normalizeSearchText(title),
      searchText: normalizeSearchText(`${category} ${title} ${excerpt} ${item.textContent}`)
    };
  });

  const normalizeKeyword = () => cleanText(input.value, 160);

  const scoreArticle = (article, query) => {
    if (!query.normalized) return 1;
    let score = 0;
    const wantsBrows = query.normalized.includes("may") || query.normalized.includes("chan") || query.normalized.includes("dieu khac");
    const wantsLips = query.normalized.includes("moi");
    const wantsEyeliner = query.normalized.includes("mi");
    const isBrowArticle = ["chan may", "phun may", "dieu khac", "dang may", "tan bot", "ombre", "nano"].some((term) => article.searchText.includes(term));
    const isLipArticle = article.searchText.includes("moi");
    const isEyelinerArticle = article.searchText.includes("phun mi") || article.searchText.includes("mo trong");

    if (wantsBrows && !isBrowArticle) return 0;
    if (wantsLips && !isLipArticle) return 0;
    if (wantsEyeliner && !isEyelinerArticle) return 0;

    if (article.searchTitle.includes(query.normalized)) score += 80;
    if (article.searchText.includes(query.normalized)) score += 35;

    query.terms.forEach((term) => {
      if (article.searchTitle.includes(term)) score += 24;
      if (article.searchText.includes(term)) score += 10;
    });

    if (query.normalized.includes("moi") && article.searchText.includes("moi")) score += 30;
    if ((query.normalized.includes("may") || query.normalized.includes("dieu khac")) && article.searchText.includes("chan may")) score += 28;
    if (query.normalized.includes("dieu khac") && article.searchText.includes("dieu khac")) score += 40;
    if (query.normalized.includes("mi") && article.searchText.includes("phun mi")) score += 30;

    return score;
  };

  const findMatches = (keyword) => {
    const query = buildKnowledgeSearchTerms(keyword);
    if (!query.normalized) return articleData.map((article) => ({ ...article, score: 1 }));

    return articleData
      .map((article) => ({ ...article, score: scoreArticle(article, query) }))
      .filter((article) => article.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "vi"));
  };

  const renderSuggestions = (matches, keyword) => {
    if (!keyword || matches.length === 0) {
      results.hidden = true;
      results.innerHTML = "";
      return;
    }

    results.innerHTML = matches.slice(0, maxSuggestions).map((article) => `
      <a class="knowledge-search-result" href="${escapeHtml(article.href)}">
        ${article.imageSrc ? `<img src="${escapeHtml(article.imageSrc)}" alt="${escapeHtml(article.imageAlt)}" loading="lazy" />` : ""}
        <div>
          <span>${escapeHtml(article.category)}</span>
          <strong>${escapeHtml(article.title)}</strong>
          ${article.excerpt ? `<small>${escapeHtml(article.excerpt)}</small>` : ""}
        </div>
      </a>
    `).join("");
    results.hidden = false;
  };

  const applySearch = (keyword) => {
    const matches = findMatches(keyword);
    const visibleItems = new Set(matches.map((article) => article.item));

    items.forEach((item) => {
      item.hidden = keyword ? !visibleItems.has(item) : false;
    });

    renderSuggestions(matches, keyword);
    const shownCount = Math.min(matches.length, maxSuggestions);
    status.textContent = keyword
      ? (matches.length ? `Tìm thấy ${matches.length} bài viết liên quan${shownCount < matches.length ? `, đang hiển thị ${shownCount} bài phù hợp nhất.` : "."}` : "Chưa có bài viết phù hợp.")
      : "";
    return matches;
  };

  const logKeyword = async (eventType) => {
    const keyword = normalizeKeyword();
    if (!keyword) return;
    if (eventType === "typing") {
      if (keyword.length < 3 || keyword === lastTypingKeyword) return;
      lastTypingKeyword = keyword;
    }
    const payload = await buildSearchLogPayload(keyword, eventType);
    await sendSearchLogToGoogleSheet(payload);
  };

  input.addEventListener("input", () => {
    const keyword = normalizeKeyword();
    applySearch(keyword);
    window.clearTimeout(typingTimer);
    typingTimer = window.setTimeout(() => {
      logKeyword("typing").catch(() => {});
    }, debounceMs);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    window.clearTimeout(typingTimer);
    const keyword = normalizeKeyword();
    if (!keyword) {
      applySearch("");
      return;
    }
    const matches = applySearch(keyword);
    try {
      await logKeyword("submit");
    } catch (error) {
      // Search should continue even if logging fails.
    }
    if (matches.length) {
      matches[0].item.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

function setupKnowledgeSearchBox() {
  const root = document.querySelector("[data-search-box]");
  if (!root) return;
  SearchBox(root);

  const toggleCompactSearch = () => {
    root.classList.toggle("is-compact", window.scrollY > 120);
  };

  toggleCompactSearch();
  window.addEventListener("scroll", toggleCompactSearch, { passive: true });
}

function validateBooking(form) {
  const formData = new FormData(form);
  const payload = {};

  SAFE_FORM_KEYS.forEach((key) => {
    const rawValue = formData.get(key);
    payload[key] = key === "phone" ? cleanPhone(rawValue) : cleanText(rawValue, FIELD_LIMITS[key]);
  });

  const serviceField = form.querySelector("[name='service']");
  const provinceField = form.querySelector("[name='province']");
  const namePattern = /^[\p{L}\s'.-]{2,60}$/u;
  const phonePattern = /^0\d{8,10}$/;

  if (!namePattern.test(payload.fullName)) {
    return { ok: false, field: "fullName" };
  }

  if (!phonePattern.test(payload.phone)) {
    return { ok: false, field: "phone" };
  }

  if (!isAllowedSelectValue(serviceField, payload.service)) {
    return { ok: false, field: "service" };
  }

  if (!isAllowedSelectValue(provinceField, payload.province)) {
    return { ok: false, field: "province" };
  }

  if (payload.address && payload.address.length < 6) {
    return { ok: false, field: "address" };
  }

  return { ok: true, payload };
}

function markInvalidField(form, fieldName) {
  const field = form.querySelector(`[name="${fieldName}"]`);
  if (!field) return;

  field.setCustomValidity("Vui lòng kiểm tra lại thông tin này.");
  field.reportValidity();
  field.focus({ preventScroll: false });

  const clearInvalidState = () => field.setCustomValidity("");
  field.addEventListener("input", clearInvalidState, { once: true });
  field.addEventListener("change", clearInvalidState, { once: true });
}

function closeMenu() {
  if (!mainNav || !menuToggle) return;
  mainNav.classList.remove("is-open");
  body.classList.remove("menu-open");
  menuToggle.setAttribute("aria-expanded", "false");
}

function openBooking(service = "") {
  if (!popover) return;
  const displayService = service || "Dịch vụ bạn đang quan tâm";
  if (selectedServiceText) selectedServiceText.textContent = displayService;
  if (serviceSelect) {
    const safeService = cleanText(service, FIELD_LIMITS.service);
    const hasOption = Array.from(serviceSelect.options).some((option) => option.value === safeService);
    serviceSelect.value = hasOption ? safeService : "";
  }
  popover.classList.add("is-open");
  popover.setAttribute("aria-hidden", "false");
  body.classList.add("booking-popover-open");
  if (window.matchMedia("(min-width: 769px)").matches) {
    window.setTimeout(() => {
      const firstInput = popover.querySelector("input, select, textarea, button");
      if (firstInput) firstInput.focus({ preventScroll: true });
    }, 120);
  }
}

function closeBooking() {
  if (!popover) return;
  popover.classList.remove("is-open");
  popover.setAttribute("aria-hidden", "true");
  body.classList.remove("booking-popover-open");
}

function isBookingTrigger(link) {
  const href = link?.getAttribute("href") || "";
  const text = normalizeSearchText(link?.textContent || link?.getAttribute("aria-label") || "");
  return (
    link?.hasAttribute("data-booking-open") ||
    href === "#booking" ||
    href === "index.html#booking" ||
    href.endsWith("/index.html#booking") ||
    href.endsWith("/dat-lich.html") ||
    href === "dat-lich.html" ||
    /\b(dat lich|dat lich ngay|dang ky tu van|dang ky ngay|nhan tu van|book now|schedule)\b/.test(text)
  );
}

function readBookingClickRate() {
  try {
    return JSON.parse(sessionStorage.getItem(BOOKING_CLICK_RATE_KEY) || "{}");
  } catch (error) {
    return {};
  }
}

function canLogBookingClick(buttonKey) {
  const now = Date.now();
  const rate = readBookingClickRate();
  const lastClick = Number(rate[buttonKey] || 0);
  if (lastClick && now - lastClick < 5000) return false;
  rate[buttonKey] = now;
  try {
    sessionStorage.setItem(BOOKING_CLICK_RATE_KEY, JSON.stringify(rate));
  } catch (error) {
    // Rate limit storage is optional.
  }
  return true;
}

function getBookingClickData(link) {
  return {
    buttonName: cleanText(link?.textContent || link?.getAttribute("aria-label") || "Đặt lịch", 120),
    href: link?.getAttribute("href") || "",
    pathname: window.location.pathname || ""
  };
}

async function logBookingClickData(clickData) {
  const buttonName = clickData?.buttonName || "Đặt lịch";
  const buttonKey = `${clickData?.pathname || window.location.pathname}:${buttonName}:${clickData?.href || ""}`;
  if (!canLogBookingClick(buttonKey)) return;

  const gps = await getGpsLocationForTracking({ askIfPrompt: false });
  const payload = await buildVisitLogPayload("booking_click", {
    buttonName,
    gps
  });
  await sendVisitLogToGoogleSheet(payload);
}

function scheduleBookingClickLog(clickData) {
  const runLog = () => {
    logBookingClickData(clickData).catch(() => {
      // Booking tracking should never block customers.
    });
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(runLog, { timeout: 1800 });
    return;
  }

  window.setTimeout(runLog, 800);
}

function rememberPendingBookingClick(clickData) {
  try {
    sessionStorage.setItem(PENDING_BOOKING_CLICK_KEY, JSON.stringify(clickData));
  } catch (error) {
    // Pending tracking is optional.
  }
}

function flushPendingBookingClick() {
  try {
    const pending = sessionStorage.getItem(PENDING_BOOKING_CLICK_KEY);
    if (!pending) return;
    sessionStorage.removeItem(PENDING_BOOKING_CLICK_KEY);
    scheduleBookingClickLog(JSON.parse(pending));
  } catch (error) {
    // Pending tracking should never interrupt the website.
  }
}

async function GlobalVisitTracker() {
  try {
    if (!sessionStorage.getItem("ellyLandingPage")) {
      sessionStorage.setItem("ellyLandingPage", window.location.href);
    }

    const sessionId = getOrCreateSessionId();
    const visitKey = `${VISIT_LOG_SENT_KEY}:${sessionId}`;
    if (sessionStorage.getItem(visitKey)) return;

    window.setTimeout(async () => {
      try {
        const gps = await getGpsLocationForPageVisit();
        const payload = await buildVisitLogPayload("visit", { gps });
        await sendVisitLogToGoogleSheet(payload);
        sessionStorage.setItem(visitKey, "1");
      } catch (error) {
        try {
          const payload = await buildVisitLogPayload("visit", {
            gps: { locationPermissionStatus: "error" }
          });
          await sendVisitLogToGoogleSheet(payload);
          sessionStorage.setItem(visitKey, "1");
        } catch (innerError) {
          // Visit tracking should never interrupt the website.
        }
      }
    }, 3000);
  } catch (error) {
    // Tracking should never interrupt the website.
  }
}

function BookingButtonTracker() {
  // Booking clicks are captured by the global click listener below.
}

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    const willOpen = !mainNav.classList.contains("is-open");
    mainNav.classList.toggle("is-open", willOpen);
    body.classList.toggle("menu-open", willOpen);
    menuToggle.setAttribute("aria-expanded", String(willOpen));
  });
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (!link) return;

  const href = link.getAttribute("href") || "";

  if (isBookingTrigger(link)) {
    event.preventDefault();
    const clickData = getBookingClickData(link);
    closeMenu();

    if (
      link.hasAttribute("data-booking-open") ||
      href === "#booking" ||
      href === "index.html#booking" ||
      href.endsWith("/index.html#booking")
    ) {
      openBooking(link.dataset.service || "Dịch vụ bạn đang quan tâm");
      scheduleBookingClickLog(clickData);
      return;
    }

    rememberPendingBookingClick(clickData);
    window.location.href = href || "dat-lich.html";
    return;
  }

  if (href.startsWith("#") && href.length > 1) {
    const target = document.getElementById(href.slice(1));
    if (target) {
      event.preventDefault();
      closeMenu();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
});

document.querySelectorAll("[data-booking-close]").forEach((button) => {
  button.addEventListener("click", closeBooking);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeBooking();
    closeMenu();
  }
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

function setupHomeSlider() {
  const slider = document.querySelector("[data-home-slider]");
  if (!slider) return;

  const slides = Array.from(slider.querySelectorAll(".home-slide"));
  const dots = Array.from(slider.querySelectorAll("[data-slide-dot]"));
  const prev = slider.querySelector("[data-slide-prev]");
  const next = slider.querySelector("[data-slide-next]");
  let index = 0;
  let startX = 0;

  const show = (nextIndex) => {
    index = (nextIndex + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle("is-active", i === index));
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
  };

  prev?.addEventListener("click", () => show(index - 1));
  next?.addEventListener("click", () => show(index + 1));
  dots.forEach((dot, i) => dot.addEventListener("click", () => show(i)));

  slider.addEventListener("touchstart", (event) => {
    startX = event.touches[0].clientX;
  }, { passive: true });

  slider.addEventListener("touchend", (event) => {
    const diff = event.changedTouches[0].clientX - startX;
    if (Math.abs(diff) > 42) show(index + (diff < 0 ? 1 : -1));
  }, { passive: true });
}

function setupPricingCarousels() {
  document.querySelectorAll("[data-pricing-carousel]").forEach((carousel) => {
    const track = carousel.querySelector(".pricing-track");
    const dots = Array.from(carousel.querySelectorAll(".pricing-dots button"));
    if (!track || !dots.length) return;

    const updateDots = () => {
      const active = Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
      dots.forEach((dot, index) => dot.classList.toggle("is-active", index === active));
    };

    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
      });
    });

    track.addEventListener("scroll", () => window.requestAnimationFrame(updateDots), { passive: true });
    updateDots();
  });
}

function setupCountdown() {
  const boxes = document.querySelectorAll(".booking-countdown div strong");
  if (boxes.length < 3) return;

  const tick = () => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(21, 0, 0, 0);
    if (now > end) end.setDate(end.getDate() + 1);
    const distance = Math.max(0, end - now);
    const hours = Math.floor(distance / 36e5);
    const minutes = Math.floor((distance % 36e5) / 6e4);
    const seconds = Math.floor((distance % 6e4) / 1000);
    [hours, minutes, seconds].forEach((value, index) => {
      boxes[index].textContent = String(value).padStart(2, "0");
    });
  };

  tick();
  window.setInterval(tick, 1000);
}

async function submitBooking(form) {
  const validation = validateBooking(form);

  if (!validation.ok) {
    return validation;
  }

  if (!canSubmitNow()) {
    return { ok: false, rateLimited: true };
  }

  const location = await getVisitorLocation();
  const gps = await getGpsLocationForTracking({ askIfPrompt: false });
  const params = new URLSearchParams();
  params.set("sheetName", "ELLY - Đặt lịch");
  params.set("source", "Website ELLY");
  params.set("createdAt", new Date().toLocaleString("vi-VN"));
  params.set("visitorId", protectSheetValue(getOrCreateVisitorId()));
  params.set("sessionId", protectSheetValue(getOrCreateSessionId()));
  params.set("gpsCity", protectSheetValue(gps.gpsCity));
  params.set("gpsDistrict", protectSheetValue(gps.gpsDistrict));
  params.set("latitude", protectSheetValue(gps.latitude));
  params.set("longitude", protectSheetValue(gps.longitude));
  params.set("ip", protectSheetValue(location.ip));
  params.set("country", protectSheetValue(location.country));
  params.set("city", protectSheetValue(location.city));
  Object.entries(validation.payload).forEach(([key, value]) => {
    params.set(key, protectSheetValue(value));
  });

  await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    body: params
  });

  return { ok: true };
}

if (popupForm) {
  popupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = popupForm.querySelector("button[type='submit']");
    if (popupMessage) popupMessage.textContent = "ELLY đang nhận thông tin của bạn...";
    if (submit) {
      submit.disabled = true;
      submit.textContent = "Đang gửi thông tin...";
    }

    try {
      const result = await submitBooking(popupForm);
      if (!result.ok) {
        if (result.rateLimited) {
          if (popupMessage) popupMessage.textContent = "Bạn vừa gửi thông tin. Vui lòng chờ một chút trước khi gửi lại.";
        } else {
          if (popupMessage) popupMessage.textContent = "Vui lòng kiểm tra lại thông tin trước khi gửi.";
          markInvalidField(popupForm, result.field);
        }
        return;
      }
      if (popupMessage) popupMessage.textContent = "Đã gửi thông tin. ELLY sẽ liên hệ xác nhận lịch sớm.";
      popupForm.reset();
    } catch (error) {
      if (popupMessage) popupMessage.textContent = "Mạng chưa ổn định. Bạn vui lòng gửi lại hoặc bấm gọi trực tiếp để được hỗ trợ.";
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = "Gửi thông tin tư vấn";
      }
    }
  });
}

setupHomeSlider();
setupPricingCarousels();
setupCountdown();
setupKnowledgeSearchBox();
flushPendingBookingClick();
GlobalVisitTracker();
BookingButtonTracker();

if (window.location.hash === "#booking") {
  window.setTimeout(() => openBooking("Dịch vụ bạn đang quan tâm"), 250);
}

