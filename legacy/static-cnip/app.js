/* cnip.io — 纯静态版 (无框架/无构建)。逻辑照 Nuxt 版 1:1，修掉「查询串行等地图」的性能 bug。 */
(function () {
"use strict";

/* ---------- 配置 ---------- */
var API_BASE = "/api";                              // 同源，Caddy handle_path /api/* → 后端 18083
var TILE_LIGHT = "https://map.bluecdn.com/styles/positron/{z}/{x}/{y}@2x.png";
var TILE_DARK = "https://map.bluecdn.com/styles/dark-matter/{z}/{x}/{y}@2x.png";
var DOCS_BASE = "https://api.cnip.io";

/* ---------- 小工具 ---------- */
var $ = function (s, r) { return (r || document).querySelector(s); };
var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
var pad2 = function (n) { return String(n).padStart(2, "0"); };

/* ---------- 状态 ---------- */
var state = {
  theme: "dark",
  view: "lookup",
  query: "",
  data: null,
  dbUpdatedAt: "",
  pending: false,
  manualQuery: false,
  selfIps: { v4: "", v6: "", active: "v4" }
};
var lookupCache = {};
var mapObj = null, mapMarker = null, mapTiles = null;

/* ---------- 字段定义 (照 index.vue) ---------- */
var FIELDS = [
  { key: "asn", label: "ASN", en: "ASN", icon: "paperclip", desc: "自治系统编号，标识网络运营实体" },
  { key: "isp", label: "运营商", en: "ISP", icon: "satellite-antenna", desc: "互联网服务提供商，如电信、联通、移动" },
  { key: "country", label: "国家", en: "Country", icon: "europe-africa", desc: "IP 归属的国家或地区" },
  { key: "province", label: "省份", en: "Province", icon: "pushpin", desc: "省级行政区划，如广东省、加利福尼亚州" },
  { key: "city", label: "城市", en: "City", icon: "cityscape", desc: "市级行政区划" },
  { key: "district", label: "区县", en: "District", icon: "cityscape-at-dusk", desc: "区县级行政区划" },
  { key: "areaCode", label: "行政区码", en: "Area Code", icon: "antenna-bars", desc: "国家标准行政区划代码" },
  { key: "cityCode", label: "城市区号", en: "City Code", icon: "telephone-receiver", desc: "电话区号" },
  { key: "zipCode", label: "邮编", en: "Zip Code", icon: "mailbox", desc: "邮政编码" },
  { key: "coordinates", label: "坐标", en: "Coordinates", icon: "compass", desc: "地理坐标 (纬度, 经度)" },
  { key: "elevation", label: "海拔", en: "Elevation", icon: "mountain", desc: "所在地海拔高度（米）" },
  { key: "timeZone", label: "时区", en: "Timezone", icon: "clock", desc: "IANA 标准时区名，如 Asia/Shanghai" },
  { key: "weatherStation", label: "气象站", en: "Weather Stn", icon: "sun-behind-cloud", desc: "最近的气象观测站编码" }
];

function iconUrl(name) { return "/icons/" + name + ".svg"; }

function flagUrl(code) {
  var n = (code || "").toLowerCase();
  if (!n || n === "-") return "";
  return "https://flagcdn.io/flags/4x3/" + n + ".svg";
}
function regionCode(item) {
  var code = (item.countryChar || item.isoCode || "").toUpperCase();
  if (code === "CN") {
    var p = (item.province || "").toLowerCase();
    if (p === "香港" || p === "hong kong") return "HK";
    if (p === "澳门" || p === "macau" || p === "macao") return "MO";
    if (p === "台湾" || p === "taiwan") return "TW";
  }
  return code;
}
function fmtCoords(item) {
  var lat = Number(item.latitude), lon = Number(item.longitude);
  if (!isFinite(lat) || !isFinite(lon)) return "-";
  return Math.abs(lat).toFixed(4) + "°" + (lat >= 0 ? "N" : "S") + ", " + Math.abs(lon).toFixed(4) + "°" + (lon >= 0 ? "E" : "W");
}
function fmtTz(tz) {
  if (!tz) return "-";
  try {
    var offset = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(new Date()).find(function (p) { return p.type === "timeZoneName"; });
    return tz + " (" + (offset ? offset.value : "") + ")";
  } catch (e) { return tz; }
}
function fmtTzLocal(tz) {
  if (!tz) return "";
  try {
    var d = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
    return "当地时间: " + d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  } catch (e) { return ""; }
}
function fieldValue(item, key) {
  if (key === "countryChar") return item.countryChar || item.isoCode || "-";
  if (key === "coordinates") return fmtCoords(item);
  if (key === "timeZone") return fmtTz(item[key]);
  return item[key] || "-";
}
function visibleFields(item) {
  return FIELDS.filter(function (f) {
    if (f.key === "coordinates") return isFinite(Number(item.latitude)) && isFinite(Number(item.longitude));
    return fieldValue(item, f.key) !== "-";
  });
}

/* ---------- 渲染查询结果 (照 template) ---------- */
function hasBothIps() { return !!(state.selfIps.v4 && state.selfIps.v6); }
function isSelfQuery() { var q = state.data && state.data.query; return q === state.selfIps.v4 || q === state.selfIps.v6; }

function resultCardHtml(item) {
  var idAttr = "ip-" + item.ip.replace(/[:.]/g, "-");
  var isV6 = item.family === "ipv6";
  var titleLeft = "";
  if (isSelfQuery()) {
    titleLeft += '<span class="cnp-self-tag">My IP</span>';
    if (hasBothIps()) {
      titleLeft += '<div class="cnp-ip-toggle">'
        + '<button type="button" class="cnp-ip-toggle-btn' + (state.selfIps.active === "v4" ? " active" : "") + '" data-self="v4">v4</button>'
        + '<button type="button" class="cnp-ip-toggle-btn' + (state.selfIps.active === "v6" ? " active" : "") + '" data-self="v6">v6</button>'
        + '</div>';
    }
  }
  var rows = visibleFields(item).map(function (f) {
    var iconHtml;
    if (f.key === "country" && flagUrl(regionCode(item))) {
      iconHtml = '<img src="' + esc(flagUrl(regionCode(item))) + '" alt="" class="cnp-icon-flag">';
    } else {
      iconHtml = '<img src="' + iconUrl(f.icon) + '" alt="" class="cnp-icon-svg">';
    }
    var tip = f.key === "timeZone" ? (fmtTzLocal(item.timeZone) || f.desc) : f.desc;
    return '<div class="cnp-result-row cnp-result-row-icon">'
      + '<div class="cnp-result-meta"><span class="cnp-result-icon">' + iconHtml + '</span>'
      + '<span class="cnp-result-label">' + esc(f.label) + '<span class="cnp-result-label-en">' + esc(f.en) + '</span></span></div>'
      + '<span class="cnp-result-value">' + esc(fieldValue(item, f.key)) + '</span>'
      + '<span class="cnp-result-info" data-tip="' + esc(tip) + '">?</span></div>';
  }).join("");
  return '<article id="' + esc(idAttr) + '" class="cnp-result-card">'
    + '<div class="cnp-result-title-row"><div class="cnp-result-title-left">' + titleLeft + '</div>'
    + '<h3>' + esc(item.ip) + '</h3>'
    + '<span class="cnp-family-badge ' + (isV6 ? "cnp-badge-v6" : "cnp-badge-v4") + '">' + (isV6 ? "IPv6" : "IPv4") + '</span></div>'
    + '<div class="cnp-result-table">' + rows + '</div></article>';
}

function renderResults() {
  var d = state.data, box = $("#results");
  if (!d) { box.style.display = "none"; return; }
  var html = "";
  if (d.resolvedIps && d.resolvedIps.length > 1 && d.queryType === "domain") {
    var rows = d.resolvedIps.map(function (ip, i) {
      var v6 = ip.indexOf(":") >= 0;
      return '<div class="cnp-resolved-row cnp-resolved-row-clickable" data-scroll="' + esc(ip.replace(/[:.]/g, "-")) + '">'
        + '<span class="cnp-resolved-idx">' + (i + 1) + '</span><code>' + esc(ip) + '</code>'
        + '<span class="cnp-family-badge ' + (v6 ? "cnp-badge-v6" : "cnp-badge-v4") + '">' + (v6 ? "IPv6" : "IPv4") + '</span></div>';
    }).join("");
    html += '<div class="cnp-resolved-box"><div class="cnp-resolved-head">'
      + '<strong>域名解析 · ' + d.resolvedIps.length + ' 条记录</strong>'
      + '<a class="cnp-powered-link" href="https://dns.nf/lookup/' + esc(d.query) + '?type=ALL" target="_blank" rel="noreferrer">Powered by <span class="cnp-dns-brand">dns.nf</span></a></div>'
      + '<div class="cnp-resolved-table"><div class="cnp-resolved-row cnp-resolved-row-head"><span>#</span><span>IP 地址</span><span>类型</span></div>'
      + rows + '</div></div>';
  }
  html += '<div class="cnp-result-list">' + (d.results || []).map(resultCardHtml).join("") + '</div>';
  box.innerHTML = html;
  box.style.display = "";

  box.querySelectorAll(".cnp-ip-toggle-btn").forEach(function (b) { b.onclick = function () { switchSelfIp(b.getAttribute("data-self")); }; });
  box.querySelectorAll("[data-scroll]").forEach(function (r) { r.onclick = function () { scrollToCard(r.getAttribute("data-scroll")); }; });
}

var cardFocusTimer = null;
function scrollToCard(idSuffix) {
  var el = document.getElementById("ip-" + idSuffix);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.remove("cnp-result-card-focus"); void el.offsetWidth; el.classList.add("cnp-result-card-focus");
  if (cardFocusTimer) clearTimeout(cardFocusTimer);
  cardFocusTimer = setTimeout(function () { el.classList.remove("cnp-result-card-focus"); }, 1800);
}

/* ---------- pending / error / footer ---------- */
function setPending(v) {
  state.pending = v;
  var btn = $("#query-btn");
  $(".cnp-nav-query-spinner", btn).style.display = (state.manualQuery && v) ? "" : "none";
  $(".cnp-nav-query-glass", btn).style.display = (state.manualQuery && v) ? "none" : "";
  $("#loading-logo").style.display = (v && !state.manualQuery && state.view === "lookup") ? "" : "none";
}
function fmtDbDate(v) {
  if (!v) return "";
  var date = new Date(v); if (isNaN(date.getTime())) return v;
  var d = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}
function renderFooter() {
  var f = $("#footer");
  if (!state.data) { f.style.display = "none"; return; }
  var dd = fmtDbDate(state.dbUpdatedAt);
  $("#footer-db").textContent = dd ? ("IP 库最后更新：" + dd) : "IP 库最后更新读取中";
  f.style.display = "";
}
function showError(msg) {
  var c = $("#error-card");
  if (msg) { $("p", c).textContent = msg; c.style.display = ""; } else c.style.display = "none";
}

/* ---------- 查询 ---------- */
function fetchLookup(q) {
  var nq = q.trim();
  if (lookupCache[nq]) return Promise.resolve(lookupCache[nq]);
  return fetch(API_BASE + "/lookup?q=" + encodeURIComponent(nq), { headers: { Accept: "application/json" } }).then(function (res) {
    return res.json().then(function (body) {
      var entry = { response: body, dbUpdatedAt: res.headers.get("x-db-updated-at") || "" };
      lookupCache[nq] = entry; return entry;
    });
  });
}
function lookup(q) {
  var nq = (q || "").trim(); if (!nq) return Promise.resolve();
  setPending(true); showError("");
  return fetchLookup(nq).then(function (entry) {
    state.data = entry.response; state.dbUpdatedAt = entry.dbUpdatedAt;
    renderResults(); renderFooter(); syncMapPoint();
  }).catch(function (e) {
    state.data = null; showError((e && e.message) || "查询失败"); renderResults(); renderFooter();
  }).then(function () { setPending(false); });
}
function prefetch(q) { var nq = (q || "").trim(); if (!nq || lookupCache[nq]) return; fetchLookup(nq).catch(function () {}); }

/* ---------- 双栈自身 IP ---------- */
function detectAlternate(currentIsV6) {
  var url = currentIsV6 ? "https://v4.cnip.io/" : "https://v6.cnip.io/";
  fetch(url, { cache: "no-store" }).then(function (r) { return r.text(); }).then(function (t) {
    var ip = (t || "").trim(); if (!ip) return;
    var altV6 = ip.indexOf(":") >= 0;
    if (currentIsV6 && !altV6) { state.selfIps.v4 = ip; prefetch(ip); if (state.data) renderResults(); }
    else if (!currentIsV6 && altV6) { state.selfIps.v6 = ip; prefetch(ip); if (state.data) renderResults(); }
  }).catch(function () {});
}
function switchSelfIp(ver) {
  var ip = ver === "v4" ? state.selfIps.v4 : state.selfIps.v6;
  if (!ip) return; state.selfIps.active = ver; lookup(ip);
}

/* ---------- 主题 ---------- */
function applyTheme(t) {
  state.theme = t;
  $("#app").className = "cnp-app cnp-theme-" + t;
  $(".ico-sun").style.display = t === "dark" ? "" : "none";
  $(".ico-moon").style.display = t === "dark" ? "none" : "";
}
function toggleTheme() {
  applyTheme(state.theme === "dark" ? "light" : "dark");
  try { localStorage.setItem("cnip-theme", state.theme); } catch (e) {}
  if (mapTiles) mapTiles.setUrl(state.theme === "dark" ? TILE_DARK : TILE_LIGHT);
}
function initialTheme() {
  try { var s = localStorage.getItem("cnip-theme"); if (s === "dark" || s === "light") return s; } catch (e) {}
  if (window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches) return "light";
  return "dark";
}

/* ---------- 视图路由 ---------- */
function setView(v, push) {
  state.view = v;
  // display:contents —— 容器不产生盒子，内部的 map-window/results/footer 直接作为
  // .cnp-page 的 flex 子级，footer 的 margin-top:auto 才能贴底、about/docs 的 stretch 才生效。
  $("#view-lookup").style.display = v === "lookup" ? "contents" : "none";
  $("#view-about").style.display = v === "about" ? "contents" : "none";
  $("#view-docs").style.display = v === "docs" ? "contents" : "none";
  document.querySelectorAll(".cnp-nav-links [data-view]").forEach(function (a) { a.classList.toggle("cnp-nav-link-active", a.getAttribute("data-view") === v); });
  if (v === "docs" && !$("#view-docs").getAttribute("data-built")) buildDocs();
  if (push) { var p = v === "lookup" ? "/" : "/" + v; if (location.pathname !== p) history.pushState({}, "", p); }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- 地图 (Leaflet + OSM raster 反代, 异步不阻塞查询) ---------- */
function fillZoom() { return Math.log2(window.innerHeight / 256); }   // 撑满屏幕的分数级 zoom
function pinIcon() { return L.divIcon({ className: "", html: '<span class="cnp-map-pin"></span>', iconSize: [14, 14], iconAnchor: [7, 7] }); }
function mapPoint() {
  var item = state.data && state.data.results && state.data.results[0]; if (!item) return null;
  var lat = Number(item.latitude), lon = Number(item.longitude);
  if (!isFinite(lat) || !isFinite(lon)) return null;
  return { lat: lat, lon: lon };
}
function syncMapPoint() {
  if (!mapObj) return;
  var pt = mapPoint();
  if (!pt) { mapObj.setView([35, 104], fillZoom()); if (mapMarker) { mapObj.removeLayer(mapMarker); mapMarker = null; } return; }
  var ll = [pt.lat, pt.lon];   // Leaflet 是 [lat, lon]
  mapObj.flyTo(ll, 8, { duration: 1.1 });
  if (!mapMarker) { mapMarker = L.marker(ll, { icon: pinIcon(), interactive: false, keyboard: false }).addTo(mapObj); }
  else mapMarker.setLatLng(ll);
}
function initMap() {
  if (!window.L || mapObj) return;
  mapObj = L.map("map-bg", {
    zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false,
    doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false,
    zoomSnap: 0, minZoom: 1, inertia: false, fadeAnimation: true, zoomAnimation: true
  });
  mapObj.setView([35, 104], fillZoom());
  mapTiles = L.tileLayer(state.theme === "dark" ? TILE_DARK : TILE_LIGHT, { updateWhenIdle: false, keepBuffer: 3, subdomains: "abcd", maxZoom: 19 }).addTo(mapObj);
  syncMapPoint();   // 若查询已先返回，立即标点
}
function loadMapbox() {
  var s = document.createElement("script");
  s.src = "/leaflet/leaflet.js";   // Leaflet ~40KB(gzip) 本地同源；OSM 瓦片走 map.bluecdn.com 反代
  s.defer = true; s.onload = initMap;
  document.body.appendChild(s);
}

/* ---------- 临时：瓦片样式测试面板 (选好后删掉) ---------- */
var TILE_STYLES = [
  ["自建瓦片 (你的 92G mbtiles·自主渲染·完全可控)", [
    ["Positron 亮 你选", "https://map.bluecdn.com/styles/positron/{z}/{x}/{y}@2x.png"],
    ["DarkMatter 暗 你选", "https://map.bluecdn.com/styles/dark-matter/{z}/{x}/{y}@2x.png"],
    ["OSM-Bright 彩色标准", "https://map.bluecdn.com/styles/osm-bright/{z}/{x}/{y}@2x.png"],
    ["类 Google 米白路网", "https://map.bluecdn.com/styles/google/{z}/{x}/{y}@2x.png"]
  ]],
  ["你的反代 (境内快)", [
    ["light", "https://map.bluecdn.com/raster/light/{z}/{x}/{y}.png"],
    ["dark", "https://map.bluecdn.com/raster/dark/{z}/{x}/{y}.png"],
    ["osm", "https://map.bluecdn.com/raster/osm/{z}/{x}/{y}.png"],
    ["voyager", "https://map.bluecdn.com/raster/voyager/{z}/{x}/{y}.png"],
    ["topo", "https://map.bluecdn.com/raster/topo/{z}/{x}/{y}.png"]
  ]],
  ["Google@2x高清 / 高德", [
    ["Google 标准 HD", "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=zh-CN&scale=2"],
    ["Google 地形 HD", "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&hl=zh-CN&scale=2"],
    ["Google 卫星 HD", "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&scale=2"],
    ["Google 混合 HD", "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&hl=zh-CN&scale=2"],
    ["高德 路网(境内快)", "https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}"],
    ["高德 卫星(境内快)", "https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}"]
  ]],
  ["Carto ≈mapbox · @2x高清", [
    ["Positron ≈light HD", "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png"],
    ["DarkMatter ≈dark HD", "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"],
    ["Voyager 柔彩 HD", "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png"],
    ["Positron 无字 HD", "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png"],
    ["Dark 无字 HD", "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png"],
    ["Voyager 无字 HD", "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}@2x.png"],
    ["Voyager 字下 HD", "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}@2x.png"]
  ]],
  ["Esri", [
    ["卫星影像", "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
    ["地形", "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"],
    ["街道", "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"],
    ["浅灰底", "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"],
    ["深灰底", "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"]
  ]],
  ["其他 OSM", [
    ["OSM 标准", "https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    ["OpenTopoMap", "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"],
    ["CyclOSM", "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png"],
    ["HOT 人道", "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"]
  ]]
];
function buildTileTest() {
  var root = $("#tile-btns"); if (!root) return;
  var html = "";
  TILE_STYLES.forEach(function (g) {
    html += '<div class="grp">' + esc(g[0]) + '</div>';
    g[1].forEach(function (t) { html += '<button data-url="' + esc(t[1]) + '">' + esc(t[0]) + '</button>'; });
  });
  root.innerHTML = html;
  root.querySelectorAll("[data-url]").forEach(function (b) {
    b.onclick = function () {
      if (mapTiles) mapTiles.setUrl(b.getAttribute("data-url"));
      root.querySelectorAll("[data-url]").forEach(function (x) { x.classList.toggle("on", x === b); });
    };
  });
}

/* ---------- API 文档页 (照 ViewDocs) ---------- */
var ENDPOINTS = [
  { method: "GET", path: "/geoip", title: "查询当前 IP 归属地", category: "GeoIP", responseType: "json",
    desc: "自动检测您的公网 IP 地址，返回完整的归属地信息，包括国家、省份、城市、运营商、ASN、经纬度坐标、时区等。无需传入任何参数，直接调用即可。", params: [],
    url: function () { return DOCS_BASE + "/geoip"; } },
  { method: "GET", path: "/geoip/{ip}", title: "查询指定 IP 归属地", category: "GeoIP", responseType: "json",
    desc: "查询任意 IPv4 或 IPv6 地址的归属地信息。适用于批量查询、日志分析、风控系统等场景。",
    params: [{ name: "ip", required: true, desc: "IPv4 或 IPv6 地址", location: "path", placeholder: "例如 8.8.8.8 或 2400:3200::1", def: "8.8.8.8" }],
    url: function (v) { return DOCS_BASE + "/geoip/" + encodeURIComponent((v.ip || "").trim()); } },
  { method: "GET", path: "/geoip/{ip}?callback={callback}", title: "JSONP 跨域调用", category: "GeoIP", responseType: "text",
    desc: "通过 JSONP 方式返回查询结果，适合前端页面通过 <script> 标签直接调用，无需处理跨域问题。",
    params: [{ name: "ip", required: true, desc: "IPv4 或 IPv6 地址", location: "path", placeholder: "例如 8.8.8.8", def: "8.8.8.8" }, { name: "callback", required: true, desc: "回调函数名", location: "query", placeholder: "例如 getgeoip", def: "getgeoip" }],
    url: function (v) { return DOCS_BASE + "/geoip/" + encodeURIComponent((v.ip || "").trim()) + "?callback=" + encodeURIComponent((v.callback || "").trim()); } },
  { method: "GET", path: "/lookup?q={q}", title: "综合查询（IP / 域名）", category: "Lookup", responseType: "json",
    desc: "支持 IP 地址和域名查询。输入域名时会自动解析 DNS，返回所有关联 IP 的归属地信息，适合一次性了解域名背后的服务器分布。",
    params: [{ name: "q", required: true, desc: "IP 地址或域名", location: "query", placeholder: "例如 114.114.114.114 或 baidu.com", def: "baidu.com" }],
    url: function (v) { return DOCS_BASE + "/lookup?q=" + encodeURIComponent((v.q || "").trim()); } },
  { method: "GET", path: "/", title: "获取当前公网 IP", category: "IP", responseType: "json",
    desc: "最简单的方式获取您的公网 IP 地址。返回纯 JSON 格式，只包含 ip 字段，适合脚本和自动化场景。", params: [],
    url: function () { return DOCS_BASE + "/"; } }
];
var QUICK = [
  { label: "查询当前 IP 归属地", cmd: 'curl "' + DOCS_BASE + '/geoip"' },
  { label: "查询指定 IP（如阿里 DNS）", cmd: 'curl "' + DOCS_BASE + '/geoip/223.5.5.5"' },
  { label: "查询域名归属地", cmd: 'curl "' + DOCS_BASE + '/lookup?q=baidu.com"' },
  { label: "获取当前公网 IPv4", cmd: 'curl -4 "https://v4.cnip.io"' },
  { label: "获取当前公网 IPv6", cmd: 'curl -6 "https://v6.cnip.io"' },
  { label: "获取 IPv4（JSON 格式）", cmd: 'curl -4 "https://v4.cnip.io/json"' },
  { label: "获取 IPv6（JSON 格式）", cmd: 'curl -6 "https://v6.cnip.io/json"' }
];
var docsTab = 0, docsParams = {};
function curlOf(ep, v) { return 'curl "' + ep.url(v) + '"'; }
function hl(json) {
  return json.replace(/("(?:[^"\\]|\\.)*")\s*:/g, '<span class="json-key">$1</span>:')
    .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="json-str">$1</span>')
    .replace(/:\s*(-?\d+\.?\d*)/g, ': <span class="json-num">$1</span>')
    .replace(/:\s*(true|false)/g, ': <span class="json-bool">$1</span>')
    .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>');
}
function copyBtn(text, label) {
  return '<button class="cnp-docs-copy-btn" data-copy="' + esc(text) + '" title="复制"><span class="cnp-docs-copy-state" style="display:none">已复制</span>'
    + '<svg viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="1.5"/></svg></button>';
}
function buildDocs() {
  var root = $("#view-docs");
  var tabs = ENDPOINTS.map(function (ep, i) {
    return '<button class="cnp-docs-tab' + (i === docsTab ? " active" : "") + '" data-tab="' + i + '"><span class="cnp-docs-tab-method">' + ep.method + '</span>' + esc(ep.title) + '</button>';
  }).join("");
  var quick = QUICK.map(function (q) {
    return '<div class="cnp-docs-subdomain-row"><p class="cnp-docs-example-label">' + esc(q.label) + '</p>'
      + '<div class="cnp-docs-curl-box cnp-docs-curl-sm"><code>' + esc(q.cmd) + '</code>' + copyBtn(q.cmd) + '</div></div>';
  }).join("");
  root.innerHTML = '<section class="cnp-view-page"><div class="cnp-view-card cnp-docs">'
    + '<h2>API 文档</h2>'
    + '<p class="cnp-docs-intro">cnip.io 提供免费的 IP 归属地查询 API，无需注册、无需密钥，直接调用。支持 IPv4、IPv6 及域名查询，返回 JSON 格式结果。Base URL：<code class="cnp-docs-base">' + DOCS_BASE + '</code></p>'
    + '<div class="cnp-docs-tabs">' + tabs + '</div>'
    + '<div class="cnp-docs-detail" id="docs-detail"></div>'
    + '<div class="cnp-docs-subdomains"><span class="cnp-docs-params-label">快速上手</span>'
    + '<p class="cnp-docs-desc">打开终端，复制以下命令即可快速体验。<code>v4.cnip.io</code> 仅接受 IPv4 请求，<code>v6.cnip.io</code> 仅接受 IPv6 请求；使用 <code>curl -4</code> 或 <code>curl -6</code> 可以避免被本机网络栈自动选错协议。</p>'
    + quick + '</div></div></section>';
  root.setAttribute("data-built", "1");
  root.querySelectorAll("[data-tab]").forEach(function (b) { b.onclick = function () { docsTab = +b.getAttribute("data-tab"); initDocsParams(); renderDocsDetail(); root.querySelectorAll(".cnp-docs-tab").forEach(function (t, i) { t.classList.toggle("active", i === docsTab); }); }; });
  bindCopy(root);
  initDocsParams(); renderDocsDetail();
}
function initDocsParams() { var ep = ENDPOINTS[docsTab]; docsParams = {}; ep.params.forEach(function (p) { docsParams[p.name] = p.def || ""; }); }
function renderDocsDetail() {
  var ep = ENDPOINTS[docsTab], d = $("#docs-detail"); if (!d) return;
  var paramsBlock = ep.params.length ? ('<div class="cnp-docs-params"><span class="cnp-docs-params-label">Parameters</span>'
    + ep.params.map(function (p) { return '<div class="cnp-docs-param-row"><code>' + esc(p.name) + '</code>' + (p.required ? '<span class="cnp-docs-required">required</span>' : '') + '<span>' + esc(p.location) + '</span><span>' + esc(p.desc) + '</span></div>'; }).join("") + '</div>') : "";
  var inputs = ep.params.length ? ('<div class="cnp-docs-params">' + ep.params.map(function (p) { return '<div class="cnp-docs-runner-input-wrap"><input class="cnp-docs-runner-input" data-param="' + esc(p.name) + '" type="text" placeholder="' + esc(p.placeholder || p.desc) + '" value="' + esc(docsParams[p.name] || "") + '"></div>'; }).join("") + '</div>') : "";
  d.innerHTML = '<div class="cnp-docs-endpoint-bar"><span class="cnp-docs-method-badge">' + ep.method + '</span><code class="cnp-docs-path">' + DOCS_BASE + esc(ep.path) + '</code></div>'
    + '<p class="cnp-docs-desc">' + esc(ep.desc) + '</p>'
    + '<div class="cnp-docs-params"><span class="cnp-docs-params-label">Category</span><div class="cnp-docs-param-row"><code>' + esc(ep.category) + '</code><span>' + (ep.responseType === "json" ? "JSON Response" : "Text Response") + '</span></div></div>'
    + paramsBlock
    + '<div class="cnp-docs-curl"><span class="cnp-docs-params-label">cURL</span><div class="cnp-docs-curl-box"><code id="docs-curl">' + esc(curlOf(ep, docsParams)) + '</code>'
    + copyBtn(curlOf(ep, docsParams))
    + '<button class="cnp-docs-runner-btn" id="docs-run"><svg viewBox="0 0 24 24" fill="none"><polygon points="6,3 20,12 6,21" fill="currentColor"/></svg>Run</button></div></div>'
    + '<div class="cnp-docs-runner">' + inputs + '<div id="docs-output"></div></div>';
  d.querySelectorAll("[data-param]").forEach(function (inp) {
    inp.oninput = function () { docsParams[inp.getAttribute("data-param")] = inp.value; $("#docs-curl").textContent = curlOf(ep, docsParams); var cb = d.querySelector(".cnp-docs-curl-box .cnp-docs-copy-btn"); if (cb) cb.setAttribute("data-copy", curlOf(ep, docsParams)); };
    inp.onkeydown = function (e) { if (e.key === "Enter") runDocs(); };
  });
  $("#docs-run").onclick = runDocs;
  bindCopy(d);
}
function runDocs() {
  var ep = ENDPOINTS[docsTab];
  for (var i = 0; i < ep.params.length; i++) { var p = ep.params[i]; if (p.required && !(docsParams[p.name] || "").trim()) { $("#docs-output").innerHTML = '<div class="cnp-docs-runner-output"><pre class="cnp-docs-runner-code cnp-json cnp-json-err">参数 ' + esc(p.name) + ' 必填</pre></div>'; return; } }
  var out = $("#docs-output");
  out.innerHTML = '<div class="cnp-docs-runner-output"><div class="cnp-docs-runner-meta"></div><pre class="cnp-docs-runner-code cnp-json">Loading...</pre></div>';
  var t0 = performance.now();
  fetch(ep.url(docsParams)).then(function (res) {
    var ms = Math.round(performance.now() - t0);
    var ct = (res.headers.get("content-type") || "").split(";")[0] || (ep.responseType === "json" ? "application/json" : "text/plain");
    var meta = '<span class="' + (res.status < 400 ? "cnp-status-ok" : "cnp-status-err") + '">' + res.status + ' ' + (res.status === 200 ? "OK" : "Error") + '</span><span>' + ms + 'ms</span><span class="cnp-docs-runner-type">' + esc(ct) + '</span>';
    if (ep.responseType === "text") return res.text().then(function (tx) { out.innerHTML = '<div class="cnp-docs-runner-output"><div class="cnp-docs-runner-meta">' + meta + '</div><pre class="cnp-docs-runner-code cnp-json">' + esc(tx) + '</pre></div>'; });
    return res.json().then(function (j) { out.innerHTML = '<div class="cnp-docs-runner-output"><div class="cnp-docs-runner-meta">' + meta + '</div><pre class="cnp-docs-runner-code cnp-json">' + hl(JSON.stringify(j, null, 2)) + '</pre></div>'; });
  }).catch(function (e) {
    var ms = Math.round(performance.now() - t0);
    out.innerHTML = '<div class="cnp-docs-runner-output"><div class="cnp-docs-runner-meta"><span class="cnp-status-err">0 Error</span><span>' + ms + 'ms</span></div><pre class="cnp-docs-runner-code cnp-json cnp-json-err">' + esc(e.message) + '</pre></div>';
  });
}
function bindCopy(root) {
  root.querySelectorAll(".cnp-docs-copy-btn").forEach(function (b) {
    b.onclick = function () {
      var txt = b.getAttribute("data-copy");
      if (navigator.clipboard) navigator.clipboard.writeText(txt);
      var s = b.querySelector(".cnp-docs-copy-state"); if (s) { s.style.display = ""; setTimeout(function () { s.style.display = "none"; }, 1600); }
    };
  });
}

/* ---------- 事件绑定 + 初始化 ---------- */
function bind() {
  $("#year").textContent = new Date().getFullYear();

  $("#brand").onclick = function (e) { e.preventDefault(); if (location.pathname !== "/" || location.search || location.hash) location.href = "/"; else location.reload(); };
  document.querySelectorAll(".cnp-nav-links [data-view]").forEach(function (a) { a.onclick = function (e) { e.preventDefault(); setView(a.getAttribute("data-view"), true); }; });

  var menu = $("#nav-menu"), panel = $("#nav-panel");
  menu.onmouseenter = function () { panel.style.display = ""; };
  menu.onmouseleave = function () { panel.style.display = "none"; };
  panel.onmouseenter = function () { panel.style.display = ""; };
  panel.onmouseleave = function () { panel.style.display = "none"; };

  var input = $("#cnip-query");
  input.oninput = function () { state.query = input.value; };
  $("#search-form").onsubmit = function (e) {
    e.preventDefault();
    if (!input.value.trim()) return;
    setView("lookup", true);
    state.manualQuery = true;
    lookup(input.value).then(function () { state.manualQuery = false; });
  };

  $("#theme-toggle").onclick = toggleTheme;
  $("#cookie-ok").onclick = function () { $("#cookie").style.display = "none"; try { localStorage.setItem("cnip-cookie-ok", "1"); } catch (e) {} };

  window.addEventListener("popstate", function () {
    var p = location.pathname;
    setView(p === "/about" ? "about" : p === "/docs" ? "docs" : "lookup", false);
  });

}

function start() {
  applyTheme(initialTheme());
  bind();
  try { if (!localStorage.getItem("cnip-cookie-ok")) $("#cookie").style.display = ""; } catch (e) { }
  var p = location.pathname;
  setView(p === "/about" ? "about" : p === "/docs" ? "docs" : "lookup", false);

  loadMapbox();  // 地图并行异步加载，绝不阻塞下面的查询

  // 首屏：立即拿访客 IP 并查询（不等地图）
  fetch(API_BASE + "/", { cache: "no-store" }).then(function (r) { return r.text(); }).then(function (t) {
    var ip = (t || "").trim();
    try { var j = JSON.parse(t); if (j && j.ip) ip = String(j.ip).trim(); } catch (e) {}
    if (!ip) return;
    var isV6 = ip.indexOf(":") >= 0;
    if (isV6) { state.selfIps.v6 = ip; state.selfIps.active = "v6"; } else { state.selfIps.v4 = ip; state.selfIps.active = "v4"; }
    lookup(ip).then(function () { detectAlternate(isV6); });
  }).catch(function () {});
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();
})();
