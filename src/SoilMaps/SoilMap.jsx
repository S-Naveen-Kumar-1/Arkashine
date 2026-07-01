// MapScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  FlatList,
  ActivityIndicator,
  Keyboard,
  Platform,
  PermissionsAndroid,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { WebView } from 'react-native-webview';
import { predictSoil } from '../redux/actions/soilsaathiActions';
import { useDispatch } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';

const { height: SCREEN_H } = Dimensions.get('window');

// ── Theme ─────────────────────────────────────────────────────────────────────
const C = {
  bg: '#0A1628',
  bgAlt: '#0F1F3D',
  card: '#132038',
  cardAlt: '#1A2B48',
  border: '#1E3050',
  borderLight: '#2A3F60',
  primary: '#22C55E',
  primaryDark: '#16A34A',
  primaryLight: '#4ADE80',
  white: '#F0F6FF',
  text: '#CBD5E1',
  muted: '#64748B',
  placeholder: '#475569',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
};
const R = { sm: 8, md: 12, lg: 16, xl: 24 };
const SP = { xs: 4, sm: 8, md: 16, lg: 24 };

// ── Nutrient config ───────────────────────────────────────────────────────────
const NUTRIENTS = [
  {
    key: 'ph',
    label: 'pH Level',
    unit: '',
    color: '#A78BFA',
    mapColor: '#A78BFA',
    max: 14,
    icon: '⚗️',
  },
  {
    key: 'ec',
    label: 'Electrical Cond.',
    unit: 'dS/m',
    color: '#38BDF8',
    mapColor: '#38BDF8',
    max: 5,
    icon: '⚡',
  },
  {
    key: 'n',
    label: 'Nitrogen (N)',
    unit: 'kg/ha',
    color: '#22C55E',
    mapColor: '#22C55E',
    max: 600,
    icon: '🌿',
  },
  {
    key: 'p',
    label: 'Phosphorus (P)',
    unit: 'kg/ha',
    color: '#F59E0B',
    mapColor: '#F59E0B',
    max: 100,
    icon: '🔶',
  },
  {
    key: 'k',
    label: 'Potassium (K)',
    unit: 'kg/ha',
    color: '#3B82F6',
    mapColor: '#3B82F6',
    max: 800,
    icon: '💧',
  },
  {
    key: 'organic_carbon',
    label: 'Organic Carbon',
    unit: '%',
    color: '#78716C',
    mapColor: '#A8A29E',
    max: 5,
    icon: '🌱',
  },
  {
    key: 's',
    label: 'Sulfur (S)',
    unit: 'ppm',
    color: '#FACC15',
    mapColor: '#FACC15',
    max: 100,
    icon: '🟡',
  },
  {
    key: 'fe',
    label: 'Iron (Fe)',
    unit: 'ppm',
    color: '#F97316',
    mapColor: '#F97316',
    max: 50,
    icon: '🔴',
  },
  {
    key: 'zn',
    label: 'Zinc (Zn)',
    unit: 'ppm',
    color: '#EC4899',
    mapColor: '#EC4899',
    max: 20,
    icon: '🔵',
  },
  {
    key: 'cu',
    label: 'Copper (Cu)',
    unit: 'ppm',
    color: '#14B8A6',
    mapColor: '#14B8A6',
    max: 10,
    icon: '🟤',
  },
  {
    key: 'mn',
    label: 'Manganese (Mn)',
    unit: 'ppm',
    color: '#8B5CF6',
    mapColor: '#8B5CF6',
    max: 30,
    icon: '🟣',
  },
  {
    key: 'b',
    label: 'Boron (B)',
    unit: 'ppm',
    color: '#F43F5E',
    mapColor: '#F43F5E',
    max: 5,
    icon: '🔷',
  },
];

const ENV_FIELDS = [
  { key: 'ndvi', label: 'NDVI', format: v => v.toFixed(3), color: '#22C55E' },
  {
    key: 'temperature_c',
    label: 'Temp',
    format: v => `${v.toFixed(1)}°C`,
    color: '#F59E0B',
  },
  {
    key: 'rainfall_mm',
    label: 'Rainfall',
    format: v => `${Math.round(v)}mm`,
    color: '#3B82F6',
  },
  {
    key: 'elevation_m',
    label: 'Elevation',
    format: v => `${Math.round(v)}m`,
    color: '#A78BFA',
  },
  {
    key: 'clay_pct',
    label: 'Clay',
    format: v => `${v.toFixed(1)}%`,
    color: '#78716C',
  },
  {
    key: 'sand_pct',
    label: 'Sand',
    format: v => `${v.toFixed(1)}%`,
    color: '#FACC15',
  },
  {
    key: 'silt_pct',
    label: 'Silt',
    format: v => `${v.toFixed(1)}%`,
    color: '#F97316',
  },
];

const FERTILITY_META = {
  High: {
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.12)',
    icon: '🌾',
    label: 'HIGH FERTILITY',
  },
  Medium: {
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
    icon: '🌿',
    label: 'MEDIUM FERTILITY',
  },
  Low: {
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.12)',
    icon: '⚠️',
    label: 'LOW FERTILITY',
  },
};

// ── Nominatim ─────────────────────────────────────────────────────────────────
const searchPlaces = async q => {
  if (!q || q.trim().length < 2) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        q,
      )}&format=json&limit=6&addressdetails=1`,
      {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'MapPolygonApp/1.0' },
      },
    );
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
};

// ── Leaflet HTML ──────────────────────────────────────────────────────────────
const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body,#map{width:100%;height:100%;background:#0A1628}
  .leaflet-control-attribution{display:none}
  .leaflet-control-zoom{border:1px solid #1E3050!important;border-radius:12px!important;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.6)!important;margin-right:10px!important;margin-bottom:10px!important}
  .leaflet-control-zoom a{background:#132038!important;color:#22C55E!important;border-bottom:1px solid #1E3050!important;font-size:20px!important;font-weight:900!important;width:40px!important;height:40px!important;line-height:40px!important}
  .leaflet-control-zoom a:last-child{border-bottom:none!important}
  .leaflet-control-zoom a:hover{background:#1A2B48!important;color:#4ADE80!important}
  #sat-btn{position:fixed;bottom:100px;right:12px;z-index:9999;background:rgba(19,32,56,0.92);backdrop-filter:blur(8px);border:1px solid #1E3050;border-radius:12px;padding:10px 14px;color:#22C55E;font-size:11px;font-weight:800;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.6);font-family:system-ui,sans-serif;letter-spacing:0.6px;-webkit-tap-highlight-color:transparent;user-select:none}
  #sat-btn:active{background:rgba(26,43,72,0.95)}
  #draw-hint{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(19,32,56,0.88);border:1px solid #1E3050;border-radius:12px;padding:10px 18px;color:#CBD5E1;font-size:13px;font-family:system-ui,sans-serif;pointer-events:none;display:none;z-index:8000;letter-spacing:0.3px}
  /* value tooltip shown on polygon after prediction */
  #val-tooltip{position:fixed;top:50%;left:50%;transform:translate(-50%,-120%);
    background:rgba(10,22,40,0.92);backdrop-filter:blur(8px);
    border-radius:14px;padding:12px 20px;text-align:center;
    pointer-events:none;display:none;z-index:7000;
    box-shadow:0 8px 32px rgba(0,0,0,0.5)}
  #val-tooltip .vt-label{color:#94A3B8;font-size:11px;font-family:system-ui;font-weight:700;letter-spacing:1px;text-transform:uppercase}
  #val-tooltip .vt-value{font-size:28px;font-family:system-ui;font-weight:900;line-height:1.1;margin-top:2px}
  #val-tooltip .vt-unit{font-size:13px;font-family:system-ui;font-weight:600;opacity:0.7;margin-left:3px}
  .pin-wrap{position:relative;width:28px;height:28px}
  .pin{position:absolute;width:22px;height:22px;background:#22C55E;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid rgba(0,0,0,0.5);box-shadow:0 3px 10px rgba(34,197,94,0.7);top:0;left:3px}
  .pin.first{background:#4ADE80}
  .pin-num{position:absolute;top:3px;left:3px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;color:#0A1628;font-size:8px;font-weight:900;transform:rotate(45deg);pointer-events:none;z-index:2}
  .pulse{position:absolute;top:-4px;left:-1px;width:30px;height:30px;border-radius:50%;border:2px solid #4ADE80;animation:pulse 1.8s ease-out infinite;opacity:0}
  @keyframes pulse{0%{transform:scale(.4);opacity:.9}100%{transform:scale(2);opacity:0}}
  .loc-wrap{position:relative;width:20px;height:20px}
  .loc-dot{position:absolute;top:2px;left:2px;width:16px;height:16px;background:#3B82F6;border-radius:50%;border:3px solid #fff;box-shadow:0 0 12px rgba(59,130,246,0.8)}
  .loc-ring{position:absolute;top:-3px;left:-3px;width:26px;height:26px;border-radius:50%;border:2px solid rgba(59,130,246,0.5);animation:locRing 2s ease-out infinite}
  @keyframes locRing{0%{transform:scale(.5);opacity:1}100%{transform:scale(1.5);opacity:0}}
</style>
</head>
<body>
<div id="map"></div>
<div id="sat-btn" onclick="toggleLayer()">🛰 SATELLITE</div>
<div id="draw-hint">✏️ Hold & drag to draw</div>
<div id="val-tooltip">
  <div class="vt-label" id="vt-label">pH Level</div>
  <div style="display:flex;align-items:baseline;justify-content:center">
    <span class="vt-value" id="vt-value">—</span>
    <span class="vt-unit" id="vt-unit"></span>
  </div>
</div>
<script>
(function(){
var map=L.map('map',{
  zoomControl:false,
  attributionControl:false,
  preferCanvas:false,
  zoomAnimation:true
});  var SAT=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,maxNativeZoom:17,tileSize:256});
  var LBL=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,maxNativeZoom:17,tileSize:256,opacity:0.85});
  var STR=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19});
  var isSat=true;
  SAT.addTo(map);LBL.addTo(map);

  function toggleLayer(){
    var b=document.getElementById('sat-btn');
    if(isSat){map.removeLayer(SAT);map.removeLayer(LBL);STR.addTo(map);b.textContent='🗺 STREET';isSat=false;}
    else{map.removeLayer(STR);SAT.addTo(map);LBL.addTo(map);b.textContent='🛰 SATELLITE';isSat=true;}
  }

  var pts=[],marks=[],polyline=null,polygon=null,closed=false,locMark=null,didZoom=false;
  var MODE='tap',drawing=false,drawPts=[],drawPolyline=null;
  // nutrient overlay
  var nutrientPolygon=null, currentColor='#22C55E';

  map.setView([22.5,82.0],4);

  function goToLocation(lat,lng){
    if(locMark)map.removeLayer(locMark);
    var icon=L.divIcon({className:'',html:'<div class="loc-wrap"><div class="loc-dot"></div><div class="loc-ring"></div></div>',iconSize:[20,20],iconAnchor:[10,10]});
    locMark=L.marker([lat,lng],{icon:icon,zIndexOffset:3000}).addTo(map);
    map.flyTo([lat,lng],16,{animate:true,duration:didZoom?1.8:3.2,easeLinearity:0.04});
    didZoom=true;
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'LOCATION_RECEIVED'}));
  }

  function makeIcon(i){
    return L.divIcon({
      className:'',
      html:'<div class="pin-wrap"><div class="pin'+(i===0?' first':'')+'"></div>'+(i===0?'<div class="pulse"></div>':'')+'<div class="pin-num">'+(i+1)+'</div></div>',
      iconSize:[28,28],iconAnchor:[14,28]
    });
  }

  function redraw(){
    if(polyline){map.removeLayer(polyline);polyline=null;}
    if(polygon){map.removeLayer(polygon);polygon=null;}
    if(closed&&pts.length>=3){
      polygon=L.polygon(pts,{color:'#22C55E',weight:3,fillColor:'#22C55E',fillOpacity:0.2}).addTo(map);
    } else if(!closed&&pts.length>=2){
      polyline=L.polyline(pts,{color:'#22C55E',weight:3,dashArray:'8,6',opacity:1}).addTo(map);
    }
    // clear nutrient overlay on redraw
    if(nutrientPolygon){map.removeLayer(nutrientPolygon);nutrientPolygon=null;}
    document.getElementById('val-tooltip').style.display='none';
  }

  // ── NUTRIENT HIGHLIGHT ────────────────────────────────────────────────────
  function showNutrientOverlay(color, label, value, unit) {
    if(!pts.length||!closed)return;
    // remove old
    if(nutrientPolygon){map.removeLayer(nutrientPolygon);nutrientPolygon=null;}
    // also update base polygon border color
    if(polygon){
      map.removeLayer(polygon);
      polygon=L.polygon(pts,{color:color,weight:3,fillColor:color,fillOpacity:0.08}).addTo(map);
    }
    // glowing filled overlay
    nutrientPolygon=L.polygon(pts,{
      color:color,
      weight:4,
      fillColor:color,
      fillOpacity:0.35,
      dashArray:null,
    }).addTo(map);

    // show tooltip in center
    var tt=document.getElementById('val-tooltip');
    var lbl=document.getElementById('vt-label');
    var val=document.getElementById('vt-value');
    var unt=document.getElementById('vt-unit');
    lbl.textContent=label;
    val.textContent=typeof value==='number'
      ? (value<10 ? value.toFixed(3) : value.toFixed(1))
      : '—';
    val.style.color=color;
    unt.textContent=unit||'';
    tt.style.display='block';
    tt.style.borderColor=color+'55';
    tt.style.borderWidth='1px';
    tt.style.borderStyle='solid';
    currentColor=color;
  }

  map.on('click',function(e){
    if(MODE!=='tap'||closed)return;
    var lat=e.latlng.lat,lng=e.latlng.lng;
    pts.push([lat,lng]);
    var m=L.marker([lat,lng],{icon:makeIcon(marks.length)}).addTo(map);
    marks.push(m);
    redraw();
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'ADD_POINT',lat:lat,lng:lng}));
  });

  var mapEl=document.getElementById('map');
  function getLatLng(x,y){var rect=mapEl.getBoundingClientRect();return map.containerPointToLatLng(L.point(x-rect.left,y-rect.top));}
  function onDrawStart(x,y){if(MODE!=='draw'||closed)return;drawing=true;drawPts=[];if(drawPolyline){map.removeLayer(drawPolyline);drawPolyline=null;}var ll=getLatLng(x,y);drawPts.push([ll.lat,ll.lng]);}
  function onDrawMove(x,y){if(!drawing||MODE!=='draw')return;var ll=getLatLng(x,y);var last=drawPts[drawPts.length-1];if(Math.abs(ll.lat-last[0])+Math.abs(ll.lng-last[1])<0.00005)return;drawPts.push([ll.lat,ll.lng]);if(drawPolyline)map.removeLayer(drawPolyline);drawPolyline=L.polyline(drawPts,{color:'#22C55E',weight:3,opacity:0.85,dashArray:'4,3'}).addTo(map);}
  function onDrawEnd(){
    if(!drawing||MODE!=='draw')return;drawing=false;
    if(drawPolyline){map.removeLayer(drawPolyline);drawPolyline=null;}
    if(drawPts.length<8){drawPts=[];return;}
    var step=Math.max(1,Math.floor(drawPts.length/40));
    var sampled=drawPts.filter(function(_,i){return i%step===0;});
    if(sampled.length<3)return;
    marks.forEach(function(m){map.removeLayer(m);});marks=[];pts=[];closed=false;
    if(polygon){map.removeLayer(polygon);polygon=null;}
    if(polyline){map.removeLayer(polyline);polyline=null;}
    sampled.forEach(function(p,i){pts.push(p);var m=L.marker(p,{icon:makeIcon(i)}).addTo(map);marks.push(m);});
    redraw();closed=true;
    if(polyline){map.removeLayer(polyline);polyline=null;}
    if(polygon)map.removeLayer(polygon);
    polygon=L.polygon(pts,{color:'#22C55E',weight:3,fillColor:'#22C55E',fillOpacity:0.2}).addTo(map);
    if(polygon)map.fitBounds(polygon.getBounds(),{padding:[80,80],animate:true,maxZoom:17});
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'DRAW_COMPLETE',points:pts.map(function(p){return{latitude:p[0],longitude:p[1]};}),closed:true}));
  }

  mapEl.addEventListener('touchstart',function(e){if(MODE!=='draw')return;e.preventDefault();var t=e.touches[0];onDrawStart(t.clientX,t.clientY);},{passive:false});
  mapEl.addEventListener('touchmove',function(e){if(MODE!=='draw')return;e.preventDefault();var t=e.touches[0];onDrawMove(t.clientX,t.clientY);},{passive:false});
  mapEl.addEventListener('touchend',function(e){if(MODE!=='draw')return;e.preventDefault();onDrawEnd();},{passive:false});
  mapEl.addEventListener('mousedown',function(e){if(MODE!=='draw')return;onDrawStart(e.clientX,e.clientY);});
  mapEl.addEventListener('mousemove',function(e){if(MODE!=='draw')return;onDrawMove(e.clientX,e.clientY);});
  mapEl.addEventListener('mouseup',function(e){if(MODE!=='draw')return;onDrawEnd();});

  function handleMsg(e){
    var d;try{d=JSON.parse(e.data);}catch(err){return;}
    switch(d.type){
      case 'SET_LOCATION':goToLocation(d.lat,d.lng);break;
      case 'SET_MODE':
        MODE=d.mode;
        if(d.mode==='draw'){map.dragging.disable();map.scrollWheelZoom.disable();document.getElementById('draw-hint').style.display='block';setTimeout(function(){document.getElementById('draw-hint').style.display='none';},2500);}
        else{map.dragging.enable();map.scrollWheelZoom.enable();document.getElementById('draw-hint').style.display='none';}
        break;
      case 'FLY_TO':map.flyTo([d.lat,d.lng],d.zoom||15,{animate:true,duration:2.2,easeLinearity:0.08});break;
      case 'UNDO':
        if(!marks.length)return;
        map.removeLayer(marks.pop());pts.pop();closed=false;redraw();
        break;
      case 'CLOSE':
        if(pts.length<3)return;
        closed=true;redraw();
        if(polygon)map.fitBounds(polygon.getBounds(),{padding:[80,80],animate:true,maxZoom:17});
        break;
      case 'CLEAR':
        marks.forEach(function(m){map.removeLayer(m);});
        marks=[];pts=[];closed=false;drawing=false;drawPts=[];
        if(drawPolyline){map.removeLayer(drawPolyline);drawPolyline=null;}
        if(nutrientPolygon){map.removeLayer(nutrientPolygon);nutrientPolygon=null;}
        document.getElementById('val-tooltip').style.display='none';
        redraw();
        break;
      case 'SHOW_NUTRIENT':
        // called when user taps a nutrient in the results sheet
        showNutrientOverlay(d.color, d.label, d.value, d.unit);
        break;
    }
  }
  window.addEventListener('message',handleMsg);
  document.addEventListener('message',handleMsg);
  requestAnimationFrame(function(){requestAnimationFrame(function(){window.ReactNativeWebView.postMessage(JSON.stringify({type:'MAP_READY'}));});});
})();
</script>
</body>
</html>`;

// ── Nutrient Bar ──────────────────────────────────────────────────────────────
function NutrientRow({ nutrient, value, isSelected, onPress }) {
  const anim = useRef(new Animated.Value(0)).current;
  const scaleAn = useRef(new Animated.Value(1)).current;
  const pct = Math.min((value / nutrient.max) * 100, 100);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 900,
      delay: 80,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  useEffect(() => {
    Animated.spring(scaleAn, {
      toValue: isSelected ? 1.02 : 1,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [isSelected]);

  const level = pct < 30 ? 'Low' : pct < 70 ? 'Med' : 'High';
  const levelColor = pct < 30 ? '#EF4444' : pct < 70 ? '#F59E0B' : '#22C55E';

  return (
    <Animated.View style={{ transform: [{ scale: scaleAn }] }}>
      <TouchableOpacity
        style={[
          nb.wrap,
          isSelected && {
            borderColor: nutrient.color + '80',
            backgroundColor: nutrient.color + '0D',
          },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={nb.header}>
          <View style={nb.labelRow}>
            <Text style={nb.icon}>{nutrient.icon}</Text>
            <Text style={[nb.label, isSelected && { color: C.white }]}>
              {nutrient.label}
            </Text>
            {isSelected && (
              <View
                style={[nb.activeDot, { backgroundColor: nutrient.color }]}
              />
            )}
          </View>
          <View style={nb.valueRow}>
            <Text style={[nb.value, { color: nutrient.color }]}>
              {typeof value === 'number'
                ? value < 10
                  ? value.toFixed(3)
                  : value.toFixed(1)
                : '—'}
            </Text>
            <Text style={nb.unit}> {nutrient.unit}</Text>
            <View
              style={[
                nb.pill,
                {
                  backgroundColor: levelColor + '22',
                  borderColor: levelColor + '55',
                },
              ]}
            >
              <Text style={[nb.pillTxt, { color: levelColor }]}>{level}</Text>
            </View>
          </View>
        </View>
        <View style={nb.track}>
          <Animated.View
            style={[
              nb.fill,
              {
                width: anim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: nutrient.color,
                shadowColor: nutrient.color,
                shadowOpacity: isSelected ? 0.8 : 0,
                shadowRadius: 6,
              },
            ]}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const nb = StyleSheet.create({
  wrap: {
    backgroundColor: '#132038',
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: '#1E3050',
    padding: SP.md,
    marginBottom: SP.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  icon: { fontSize: 15 },
  label: { color: '#CBD5E1', fontSize: 13, fontWeight: '600' },
  activeDot: { width: 7, height: 7, borderRadius: 99 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  value: { fontSize: 15, fontWeight: '800' },
  unit: { color: '#64748B', fontSize: 11 },
  pill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 4,
  },
  pillTxt: { fontSize: 10, fontWeight: '800' },
  track: {
    height: 5,
    backgroundColor: '#1E3050',
    borderRadius: 99,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 99 },
});

// ── Loading overlay ───────────────────────────────────────────────────────────
function LoadingOverlay({ visible }) {
  if (!visible) return null;
  return (
    <View style={lo.wrap}>
      <View style={lo.card}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={lo.title}>Analysing Soil</Text>
        <Text style={lo.sub}>Processing satellite & ground data…</Text>
      </View>
    </View>
  );
}
const lo = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,22,40,0.8)',
    zIndex: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#132038',
    borderRadius: R.xl,
    padding: SP.lg,
    alignItems: 'center',
    gap: SP.sm,
    borderWidth: 1,
    borderColor: '#2A3F60',
    minWidth: 190,
  },
  title: { color: '#F0F6FF', fontSize: 16, fontWeight: '800', marginTop: 4 },
  sub: { color: '#64748B', fontSize: 13, textAlign: 'center' },
});

// ── Results sheet ─────────────────────────────────────────────────────────────
function SoilResultSheet({
  data,
  onClose,
  onNutrientSelect,
  selectedNutrient,
  onProceed,
}) {
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_H,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  if (!data) return null;
  const {
    fertility_assessment,
    predicted_soil_chemistry: chem,
    environmental_factors: env,
    coordinates,
  } = data;
  const fertility =
    FERTILITY_META[fertility_assessment] || FERTILITY_META.Medium;

  return (
    <Animated.View style={[rs.overlay, { opacity: fadeAnim }]}>
      {/* tap backdrop to dismiss */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={handleClose}
        activeOpacity={1}
      />
      <Animated.View
        style={[rs.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        <View style={rs.handle} />

        {/* Header */}
        <View style={rs.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={rs.title}>Soil Analysis</Text>
            {coordinates && (
              <Text style={rs.coords}>
                {coordinates.lat?.toFixed(5)}, {coordinates.lon?.toFixed(5)}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={handleClose}
            style={rs.closeBtn}
            activeOpacity={0.7}
          >
            <Text style={rs.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Fertility */}
          <View
            style={[
              rs.fertilityCard,
              {
                backgroundColor: fertility.bg,
                borderColor: fertility.color + '50',
              },
            ]}
          >
            <Text style={rs.fertilityIcon}>{fertility.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[rs.fertilityLabel, { color: fertility.color }]}>
                {fertility.label}
              </Text>
              <Text style={rs.fertilitySub}>
                Based on soil chemistry & satellite data
              </Text>
            </View>
            <View
              style={[rs.fertilityBadge, { backgroundColor: fertility.color }]}
            >
              <Text style={rs.fertilityBadgeTxt}>{fertility_assessment}</Text>
            </View>
          </View>

          {/* Hint */}
          <View style={rs.hintRow}>
            <Text style={rs.hintTxt}>
              👆 Tap a nutrient to highlight it on the map
            </Text>
          </View>

          {/* Nutrients — tappable, highlight on map */}
          {chem && (
            <View style={rs.section}>
              <Text style={rs.sectionTitle}>🧪 Soil Chemistry & Nutrients</Text>
              {NUTRIENTS.map(
                n =>
                  chem[n.key] !== undefined && (
                    <NutrientRow
                      key={n.key}
                      nutrient={n}
                      value={chem[n.key]}
                      isSelected={selectedNutrient === n.key}
                      onPress={() => onNutrientSelect(n, chem[n.key])}
                    />
                  ),
              )}
            </View>
          )}

          {/* Environmental */}
          {env && (
            <View style={rs.section}>
              <Text style={rs.sectionTitle}>🌍 Environmental Factors</Text>
              <View style={rs.envGrid}>
                {ENV_FIELDS.map(
                  f =>
                    env[f.key] !== undefined && (
                      <View key={f.key} style={rs.envCard}>
                        <Text style={[rs.envVal, { color: f.color }]}>
                          {f.format(env[f.key])}
                        </Text>
                        <Text style={rs.envLabel}>{f.label}</Text>
                      </View>
                    ),
                )}
              </View>
            </View>
          )}
        </ScrollView>
        {/* Upsell CTA */}
        <View style={rs.upsellCard}>
          <View style={rs.upsellLeft}>
            <Text style={rs.upsellEmoji}>🔬</Text>
            <View style={{ flex: 1 }}>
              <Text style={rs.upsellTitle}>Want lab-accurate results?</Text>
              <Text style={rs.upsellSub}>
                Get a certified soil test with crop-specific recommendations
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={rs.upsellBtn}
            onPress={onProceed}
            activeOpacity={0.8}
          >
            <Text style={rs.upsellBtnTxt}>Explore →</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const rs = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 200,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0F1F3D',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_H * 0.86,
    borderWidth: 1,
    borderColor: '#2A3F60',
    paddingHorizontal: SP.md,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#2A3F60',
    borderRadius: 99,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: SP.md,
  },
  title: { color: '#F0F6FF', fontSize: 20, fontWeight: '900' },
  coords: { color: '#64748B', fontSize: 11, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    backgroundColor: '#132038',
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: { color: '#64748B', fontSize: 14, fontWeight: '700' },
  fertilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SP.sm,
    padding: SP.md,
    borderRadius: R.lg,
    borderWidth: 1,
    marginBottom: SP.sm,
  },
  fertilityIcon: { fontSize: 28 },
  fertilityLabel: { fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  fertilitySub: { color: '#64748B', fontSize: 11, marginTop: 2 },
  fertilityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  fertilityBadgeTxt: { color: '#0A1628', fontSize: 11, fontWeight: '900' },
  hintRow: {
    backgroundColor: 'rgba(34,197,94,0.06)',
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.15)',
    padding: SP.sm,
    marginBottom: SP.md,
    alignItems: 'center',
  },
  hintTxt: { color: '#4ADE80', fontSize: 12, fontWeight: '600' },
  section: { marginBottom: SP.md },
  sectionTitle: {
    color: '#F0F6FF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: SP.sm,
    letterSpacing: 0.3,
  },
  envGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm },
  envCard: {
    backgroundColor: '#132038',
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: '#1E3050',
    padding: SP.sm,
    alignItems: 'center',
    minWidth: '30%',
    flex: 1,
  },
  envVal: { fontSize: 14, fontWeight: '800' },
  envLabel: { color: '#64748B', fontSize: 10, marginTop: 2, fontWeight: '600' },
  upsellCard: {
    flexDirection: 'column',
    gap: SP.sm,
    backgroundColor: 'rgba(34,197,94,0.07)',
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
    padding: SP.md,
    marginTop: SP.sm,
    marginBottom: SP.lg,
  },
  upsellLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SP.sm,
  },
  upsellEmoji: {
    fontSize: 28,
    marginTop: 2,
  },
  upsellTitle: {
    color: C.white,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  upsellSub: {
    color: C.muted,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },
  upsellBtn: {
    backgroundColor: C.primary,
    borderRadius: R.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upsellBtnTxt: {
    color: C.bg,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
});

// ── Main Component ────────────────────────────────────────────────────────────
export function MapScreen({ navigation }) {
  const webViewRef = useRef(null);
  const searchTimer = useRef(null);
  const cachedLoc = useRef(null);
  const mapReady = useRef(false);
  const locDelivered = useRef(false);
  const retryInterval = useRef(null);
  const dispatch = useDispatch();

  const [points, setPoints] = useState([]);
  const [isClosed, setIsClosed] = useState(false);
  const [mode, setMode] = useState('tap');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [locStatus, setLocStatus] = useState('loading');
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [soilData, setSoilData] = useState(null);
  const [selectedNutrient, setSelectedNutrient] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  useEffect(() => {
    fetchLocation();
    return () => {
      clearTimeout(searchTimer.current);
      clearInterval(retryInterval.current);
    };
  }, []);

  // ── Retry loop ────────────────────────────────────────────────────────────
  const startRetryLoop = () => {
    clearInterval(retryInterval.current);
    locDelivered.current = false;
    retryInterval.current = setInterval(() => {
      if (locDelivered.current) {
        clearInterval(retryInterval.current);
        return;
      }
      if (mapReady.current && cachedLoc.current)
        webViewRef.current?.postMessage(
          JSON.stringify({ type: 'SET_LOCATION', ...cachedLoc.current }),
        );
    }, 600);
    setTimeout(() => clearInterval(retryInterval.current), 20000);
  };

  // ── GPS ───────────────────────────────────────────────────────────────────
  const fetchLocation = async () => {
    setLocStatus('loading');
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Access',
            message: 'Used to center the map',
            buttonPositive: 'Allow',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setLocStatus('denied');
          pushLocation(20.5937, 78.9629);
          return;
        }
      }
      Geolocation.getCurrentPosition(
        pos => {
          setLocStatus('ok');
          pushLocation(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          setLocStatus('denied');
          pushLocation(20.5937, 78.9629);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
      );
    } catch {
      setLocStatus('denied');
      pushLocation(20.5937, 78.9629);
    }
  };

  const pushLocation = (lat, lng) => {
    cachedLoc.current = { lat, lng };
    startRetryLoop();
    if (mapReady.current)
      webViewRef.current?.postMessage(
        JSON.stringify({ type: 'SET_LOCATION', lat, lng }),
      );
  };

  const switchMode = newMode => {
    if (newMode === mode) return;
    setPoints([]);
    setIsClosed(false);
    setSoilData(null);
    setSelectedNutrient(null);
    webViewRef.current?.postMessage(JSON.stringify({ type: 'CLEAR' }));
    setMode(newMode);
    webViewRef.current?.postMessage(
      JSON.stringify({ type: 'SET_MODE', mode: newMode }),
    );
  };

  // ── WebView messages ──────────────────────────────────────────────────────
  const onMessage = event => {
    let data;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (data.type === 'MAP_READY') {
      mapReady.current = true;
      setMapLoading(false); // ← add this line
      if (cachedLoc.current)
        webViewRef.current?.postMessage(
          JSON.stringify({ type: 'SET_LOCATION', ...cachedLoc.current }),
        );
    } else if (data.type === 'LOCATION_RECEIVED') {
      locDelivered.current = true;
      clearInterval(retryInterval.current);
    } else if (data.type === 'ADD_POINT') {
      setPoints(prev => [...prev, { latitude: data.lat, longitude: data.lng }]);
    } else if (data.type === 'DRAW_COMPLETE') {
      setPoints(data.points || []);
      setIsClosed(true);
    }
  };

  const onLoadEnd = () => {
    setTimeout(() => {
      if (!mapReady.current) mapReady.current = true;
      if (cachedLoc.current && !locDelivered.current)
        webViewRef.current?.postMessage(
          JSON.stringify({ type: 'SET_LOCATION', ...cachedLoc.current }),
        );
    }, 1000);
  };

  // ── Nutrient tap → highlight on map ──────────────────────────────────────
  const onNutrientSelect = (nutrient, value) => {
    setSelectedNutrient(nutrient.key);
    webViewRef.current?.postMessage(
      JSON.stringify({
        type: 'SHOW_NUTRIENT',
        color: nutrient.mapColor,
        label: nutrient.label,
        value: value,
        unit: nutrient.unit,
      }),
    );
  };

  // ── Search ────────────────────────────────────────────────────────────────
  const onSearchChange = text => {
    setSearchQuery(text);
    clearTimeout(searchTimer.current);
    if (!text.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    setIsSearching(true);
    setShowResults(true);
    searchTimer.current = setTimeout(async () => {
      setSearchResults(await searchPlaces(text));
      setIsSearching(false);
    }, 400);
  };

  const onSelectPlace = place => {
    const lat = parseFloat(place.lat),
      lng = parseFloat(place.lon);
    if (isNaN(lat) || isNaN(lng)) return;
    setSearchQuery(place.display_name.split(',').slice(0, 2).join(','));
    setShowResults(false);
    setSearchResults([]);
    Keyboard.dismiss();
    webViewRef.current?.postMessage(
      JSON.stringify({ type: 'FLY_TO', lat, lng, zoom: 16 }),
    );
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    Keyboard.dismiss();
  };

  // ── Controls ──────────────────────────────────────────────────────────────
  const undoLast = () => {
    if (!points.length) return;
    setPoints(p => p.slice(0, -1));
    setIsClosed(false);
    webViewRef.current?.postMessage(JSON.stringify({ type: 'UNDO' }));
  };
  const closePolygon = () => {
    if (points.length < 3) {
      Alert.alert('Need at least 3 points');
      return;
    }
    setIsClosed(true);
    webViewRef.current?.postMessage(JSON.stringify({ type: 'CLOSE' }));
  };
  const clearAll = () => {
    setPoints([]);
    setIsClosed(false);
    setSoilData(null);
    setSelectedNutrient(null);
    webViewRef.current?.postMessage(JSON.stringify({ type: 'CLEAR' }));
  };

  const sendCoordinates = async () => {
    if (!isClosed || points.length < 3) {
      Alert.alert('Close the polygon first');
      return;
    }
    setIsAnalysing(true);
    try {
      const polygon = points.map(p => [p.latitude, p.longitude]);
      const centroidLat =
        points.reduce((s, p) => s + p.latitude, 0) / points.length;
      const centroidLon =
        points.reduce((s, p) => s + p.longitude, 0) / points.length;
      const res = await dispatch(
        predictSoil({ lat: centroidLat, lon: centroidLon, polygon }),
      );
      if (res?.payload?.data) {
        setSoilData(res.payload.data);
        setSelectedNutrient(null);
        // Auto-select pH as default to show first highlight
        const chem = res.payload.data.predicted_soil_chemistry;
        if (chem?.ph !== undefined) {
          const phNutrient = NUTRIENTS.find(n => n.key === 'ph');
          setTimeout(() => onNutrientSelect(phNutrient, chem.ph), 600);
        }
      } else {
        Alert.alert('No Data', 'Could not retrieve soil analysis.');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setIsAnalysing(false);
    }
  };
  // ── Go to current location ────────────────────────────────────────────────
  const goToCurrentLocation = () => {
    if (cachedLoc.current) {
      webViewRef.current?.postMessage(
        JSON.stringify({
          type: 'FLY_TO',
          lat: cachedLoc.current.lat,
          lng: cachedLoc.current.lng,
          zoom: 16,
        }),
      );
    } else {
      fetchLocation();
    }
  };
  // ── UI helpers ────────────────────────────────────────────────────────────
  const statusText = isClosed
    ? '✓ Polygon closed — tap Analyse'
    : points.length === 0
    ? mode === 'draw'
      ? 'Drag finger on map to draw'
      : 'Tap map to place points'
    : points.length < 3
    ? `${points.length} pt${points.length > 1 ? 's' : ''} — need ${
        3 - points.length
      } more`
    : `${points.length} points — tap Close`;

  const statusColor = isClosed
    ? C.primary
    : points.length >= 3
    ? C.warning
    : C.muted;
  const locBorder = locStatus === 'denied' ? C.warning : C.primary;
  const locIcoChar =
    locStatus === 'loading' ? '⟳' : locStatus === 'denied' ? '⚠' : '◎';

  return (
    <SafeAreaView style={s.root}>
      {/* MAP — fills entire screen behind everything */}
      <WebView
        ref={webViewRef}
        source={{ html: MAP_HTML }}
        style={StyleSheet.absoluteFillObject}
        onMessage={onMessage}
        onLoadEnd={onLoadEnd}
        onError={() => Alert.alert('Map Error', 'Check internet connection')}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        mixedContentMode="always"
        allowsInlineMediaPlayback
        bounces={false}
        scrollEnabled={false}
      />
      {/* Map Loading Overlay */}
      {mapLoading && (
        <View style={s.mapLoadOverlay}>
          <View style={s.mapLoadCard}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={s.mapLoadTitle}>Loading Map</Text>
            <Text style={s.mapLoadSub}>Preparing satellite view…</Text>
            {/* Animated dots */}
            <View style={s.mapLoadDots}>
              {[0, 1, 2].map(i => (
                <View
                  key={i}
                  style={[
                    s.mapLoadDot,
                    { opacity: 0.3 + i * 0.25, backgroundColor: C.primary },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
      )}
      {/* ── TOP BAR: back button + search ── */}
      <View style={s.topBar}>
        {/* Back button */}
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.75}
        >
          <Text style={s.backIco}>‹</Text>
        </TouchableOpacity>

        {/* Search */}
        <View style={s.searchBar}>
          <Text style={s.searchIco}>⌕</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Search city, place, landmark…"
            placeholderTextColor={C.placeholder}
            value={searchQuery}
            onChangeText={onSearchChange}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {isSearching ? (
            <ActivityIndicator
              size="small"
              color={C.primary}
              style={{ marginRight: 8 }}
            />
          ) : searchQuery.length > 0 ? (
            <TouchableOpacity onPress={clearSearch} style={s.clearBtn}>
              <Text style={s.clearTxt}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Search dropdown */}
      {showResults && (
        <View style={s.dropdown}>
          {!isSearching && searchResults.length === 0 ? (
            <View style={s.dropRow}>
              <Text style={s.noResult}>No places found</Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={item => String(item.place_id)}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 280 }}
              renderItem={({ item }) => {
                const parts = item.display_name.split(', ');
                const ico =
                  item.type === 'city' || item.type === 'town'
                    ? '🏙'
                    : item.type === 'administrative'
                    ? '📍'
                    : item.class === 'highway'
                    ? '🛣'
                    : item.class === 'natural'
                    ? '🌿'
                    : '📌';
                return (
                  <TouchableOpacity
                    style={s.dropRow}
                    onPress={() => onSelectPlace(item)}
                    activeOpacity={0.65}
                  >
                    <Text style={s.dropIco}>{ico}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.dropTitle} numberOfLines={1}>
                        {parts[0]}
                      </Text>
                      <Text style={s.dropSub} numberOfLines={1}>
                        {parts.slice(1, 4).join(', ')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={s.sep} />}
            />
          )}
        </View>
      )}

      {/* Mode toggles + info */}
      {!showResults && (
        <>
          <View style={s.modeRow}>
            {['tap', 'draw'].map(m => (
              <TouchableOpacity
                key={m}
                style={[s.modeBtn, mode === m && s.modeBtnActive]}
                onPress={() => switchMode(m)}
                activeOpacity={0.75}
              >
                <Text style={s.modeIco}>{m === 'tap' ? '📍' : '✏️'}</Text>
                <Text style={[s.modeLbl, mode === m && s.modeLblActive]}>
                  {m === 'tap' ? 'Point' : 'Draw'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* <View style={s.infoRow}>
            <View style={s.infoCard}>
              <Text style={s.infoN}>Points: {points.length}</Text>
              <Text style={[s.infoStatus, { color: statusColor }]}>
                {statusText}
              </Text>
            </View>
            <TouchableOpacity
              style={[s.locBtn, { borderColor: locBorder }]}
              onPress={fetchLocation}
              activeOpacity={0.75}
            >
              <Text style={[s.locIco, { color: locBorder }]}>{locIcoChar}</Text>
            </TouchableOpacity>
          </View> */}
        </>
      )}
      {/* Current Location FAB */}
      <TouchableOpacity
        style={s.locFab}
        onPress={goToCurrentLocation}
        activeOpacity={0.75}
      >
        <Text
          style={[
            s.locFabIco,
            { color: locStatus === 'denied' ? C.warning : C.primary },
          ]}
        >
          {locStatus === 'loading' ? '⟳' : '◎'}
        </Text>
      </TouchableOpacity>

      {/* Bottom bar */}
      <View style={s.bar}>
        {mode === 'tap' && (
          <TouchableOpacity
            style={[s.btn, (points.length === 0 || isClosed) && s.btnOff]}
            onPress={undoLast}
            disabled={points.length === 0 || isClosed}
            activeOpacity={0.75}
          >
            <Text style={s.btnIco}>↩</Text>
            <Text style={s.btnLbl}>Undo</Text>
          </TouchableOpacity>
        )}
        {mode === 'tap' && (
          <TouchableOpacity
            style={[s.btn, (isClosed || points.length < 3) && s.btnOff]}
            onPress={closePolygon}
            disabled={isClosed || points.length < 3}
            activeOpacity={0.75}
          >
            <Text style={s.btnIco}>⬡</Text>
            <Text style={s.btnLbl}>Close</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.btn, points.length === 0 && s.btnOff]}
          onPress={clearAll}
          disabled={points.length === 0}
          activeOpacity={0.75}
        >
          <Text style={s.btnIco}>✕</Text>
          <Text style={s.btnLbl}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            s.btn,
            s.sendBtn,
            (!isClosed || points.length < 3) && s.btnOff,
          ]}
          onPress={sendCoordinates}
          disabled={!isClosed || points.length < 3}
          activeOpacity={0.75}
        >
          <Text style={[s.btnIco, { color: C.bg }]}>↑</Text>
          <Text style={[s.btnLbl, { color: C.bg }]}>Analyse</Text>
        </TouchableOpacity>
      </View>

      {/* Loading */}
      <LoadingOverlay visible={isAnalysing} />

      {/* Results sheet */}
      {soilData && (
        <SoilResultSheet
          data={soilData}
          selectedNutrient={selectedNutrient}
          onNutrientSelect={onNutrientSelect}
          onClose={() => {
            setSoilData(null);
            setSelectedNutrient(null);
          }}
          onProceed={() => navigation?.navigate('ProductsListingScreen')} // ← add this
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  // Map loading overlay
  mapLoadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.bg,
    zIndex: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapLoadCard: {
    alignItems: 'center',
    gap: SP.sm,
  },
  mapLoadTitle: {
    color: C.white,
    fontSize: 20,
    fontWeight: '900',
    marginTop: SP.sm,
    letterSpacing: 0.4,
  },
  mapLoadSub: {
    color: C.muted,
    fontSize: 13,
  },
  mapLoadDots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: SP.sm,
  },
  mapLoadDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  // Top bar
  topBar: {
    position: 'absolute',
    top: 60,
    left: SP.md,
    right: SP.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SP.sm,
    zIndex: 100,
  },
  backBtn: {
    width: 46,
    height: 54,
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  backIco: { color: C.white, fontSize: 28, fontWeight: '300', marginTop: -2 },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.borderLight,
    paddingHorizontal: SP.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  searchIco: { fontSize: 22, color: C.primary, marginRight: SP.sm },
  searchInput: {
    flex: 1,
    height: 54,
    color: C.white,
    fontSize: 15,
    fontWeight: '500',
  },
  clearBtn: { padding: 10 },
  clearTxt: { color: C.muted, fontSize: 15, fontWeight: '700' },

  // Dropdown
  dropdown: {
    position: 'absolute',
    top: 86,
    left: SP.md,
    right: SP.md,
    zIndex: 99,
    backgroundColor: C.cardAlt,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.borderLight,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 16,
  },
  dropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: SP.md,
  },
  dropIco: { fontSize: 18, marginRight: SP.sm },
  dropTitle: { color: C.white, fontSize: 14, fontWeight: '600' },
  dropSub: { color: C.muted, fontSize: 12, marginTop: 2 },
  noResult: { color: C.muted, fontSize: 14 },
  sep: { height: 1, backgroundColor: C.border, marginHorizontal: SP.md },

  // Mode row
  modeRow: {
    position: 'absolute',
    top: 130,
    right: SP.md,
    flexDirection: 'row',
    gap: SP.sm,
    zIndex: 90,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  modeBtnActive: { borderColor: C.primary, backgroundColor: C.bgAlt },
  modeIco: { fontSize: 16 },
  modeLbl: { color: C.muted, fontSize: 13, fontWeight: '700' },
  modeLblActive: { color: C.primary },

  // Info row
  infoRow: {
    position: 'absolute',
    top: 144,
    left: SP.md,
    right: SP.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SP.sm,
  },
  infoCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: SP.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  infoN: { color: C.white, fontSize: 20, fontWeight: '900' },
  infoStatus: { marginTop: 3, fontSize: 13, fontWeight: '500' },
  locBtn: {
    width: 54,
    height: 54,
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  locIco: { fontSize: 24, fontWeight: '700' },
  // Location FAB
  locFab: {
    position: 'absolute',
    bottom: 110,
    right: SP.md,
    width: 50,
    height: 50,
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: 1.5,
    borderColor: C.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 95,
  },
  locFabIco: {
    fontSize: 24,
    fontWeight: '700',
  },
  // Bottom bar
  bar: {
    position: 'absolute',
    bottom: 36,
    left: SP.md,
    right: SP.md,
    flexDirection: 'row',
    gap: SP.sm,
  },
  btn: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  btnOff: { opacity: 0.28 },
  sendBtn: { backgroundColor: C.primary, borderColor: C.primaryDark },
  btnIco: { color: C.white, fontSize: 17, fontWeight: '900' },
  btnLbl: { color: C.text, fontSize: 11, fontWeight: '700', marginTop: 2 },
});
