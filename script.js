const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzQkG1BLZvsvUizthvixSCMHQ6rit1bRDHEi0cpTN111eXiYgrfGXzb-KjBv1h3FaqUhA/exec";
const BOOKING_RATE_KEY = "ellyBookingRate";
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

function saveBookingLocally(entry) {
  try {
    const saved = JSON.parse(localStorage.getItem("ellyBookings") || "[]");
    saved.push(entry);
    localStorage.setItem("ellyBookings", JSON.stringify(saved.slice(-20)));
  } catch (error) {
    localStorage.removeItem("ellyBookings");
  }
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
  body.classList.add("popover-open");
  window.setTimeout(() => {
    const firstInput = popover.querySelector("input, select, textarea, button");
    if (firstInput) firstInput.focus({ preventScroll: true });
  }, 120);
}

function closeBooking() {
  if (!popover) return;
  popover.classList.remove("is-open");
  popover.setAttribute("aria-hidden", "true");
  body.classList.remove("popover-open");
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

  if (href === "#booking" || href === "index.html#booking" || href.endsWith("/index.html#booking")) {
    event.preventDefault();
    closeMenu();
    openBooking(link.dataset.service || "Dịch vụ bạn đang quan tâm");
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

  const params = new URLSearchParams();
  params.set("sheetName", "ELLY - Đặt lịch");
  params.set("source", "Website ELLY");
  params.set("createdAt", new Date().toLocaleString("vi-VN"));
  Object.entries(validation.payload).forEach(([key, value]) => {
    params.set(key, protectSheetValue(value));
  });

  saveBookingLocally(Object.fromEntries(params.entries()));

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
      if (popupMessage) popupMessage.textContent = "Mạng chưa ổn định. Thông tin đã lưu tạm trên máy, bạn có thể bấm gọi trực tiếp.";
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

if (window.location.hash === "#booking") {
  window.setTimeout(() => openBooking("Dịch vụ bạn đang quan tâm"), 250);
}

