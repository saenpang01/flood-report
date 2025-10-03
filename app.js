// =================================================================================
// VIBE CODE - FLOOD REPORT DASHBOARD - APP SCRIPT (SIMPLIFIED)
// =================================================================================

// --- ⬇️⬇️⬇️ [ส่วน CONFIGURATION] ⬇️⬇️⬇️ ---
        const API_URL = 'https://script.google.com/macros/s/AKfycbzGA2Gz0bZsQW7N-jz4DAi2x8q3reHuMUNDtrLRHrU0QcNw8rWf4nWNHe5eZQqJdOug/exec'; 
        const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScuoUkFuLN9nmBYbtuEGVXqWmB1-Emt-BnXFzSJLfCa0CgE3w/viewform';
        const LATITUDE_ENTRY_ID = 'entry.1052841070';
        const LONGITUDE_ENTRY_ID = 'entry.1200776748';
// Global variables
let map;
const mapMarkers = [];

// (โค้ดฟังก์ชัน setupReportButton เหมือนเดิม ไม่มีการเปลี่ยนแปลง)
function setupReportButton() {
    const reportButton = document.getElementById('report-btn');
    const statusElement = document.getElementById('geolocation-status');
    if (!reportButton || !statusElement) return;
    const handlePermissionDenied = () => {
        reportButton.disabled = true;
        reportButton.textContent = 'ถูกบล็อกการเข้าถึงตำแหน่ง';
        statusElement.textContent = 'คุณได้ปฏิเสธการเข้าถึงตำแหน่ง โปรดไปที่การตั้งค่าเบราว์เซอร์เพื่ออนุญาต';
        statusElement.style.display = 'block';
    };
    const requestLocation = () => {
        reportButton.disabled = true;
        reportButton.textContent = '🛰️ กำลังค้นหาพิกัด...';
        statusElement.style.display = 'none';
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude: lat, longitude: lon } = position.coords;
                const prefilledUrl = `${GOOGLE_FORM_URL}?usp=pp_url&${LATITUDE_ENTRY_ID}=${lat}&${LONGITUDE_ENTRY_ID}=${lon}`;
                window.open(prefilledUrl, '_blank');
                reportButton.disabled = false;
                reportButton.textContent = '📍 แจ้งเหตุที่ตำแหน่งนี้';
            },
            (error) => {
                console.error('Geolocation error:', error);
                handlePermissionDenied();
            }
        );
    };
    if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'geolocation' }).then((result) => {
            if (result.state === 'denied') {
                handlePermissionDenied();
            } else {
                reportButton.addEventListener('click', requestLocation);
                result.onchange = () => { if (result.state === 'denied') handlePermissionDenied(); };
            }
        });
    } else if (navigator.geolocation) {
        reportButton.addEventListener('click', requestLocation);
    } else {
        reportButton.disabled = true;
        reportButton.textContent = 'ไม่รองรับ Geolocation';
    }
}
document.addEventListener('DOMContentLoaded', setupReportButton);

// (โค้ดฟังก์ชัน initApp และ fetchData เหมือนเดิม ไม่มีการเปลี่ยนแปลง)
async function initApp() {
    const { Map } = await google.maps.importLibrary("maps");
    map = new Map(document.getElementById("map"), {
        center: { lat: 17.62, lng: 100.09 },
        zoom: 10,
        mapId: "FLOOD_REPORT_MAP_V1"
    });
    await fetchData();
}
async function fetchData() {
    const loading = document.getElementById('loading');
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        if (Array.isArray(data)) {
            loading.style.display = 'none';
            renderCards(data); // ชื่อฟังก์ชันยังคงเดิม แต่ Logic ข้างในเปลี่ยน
            renderMarkers(data);
        } else {
            throw new Error(data.error || "Format error.");
        }
    } catch (error) {
        loading.textContent = 'เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message;
    }
}

/**
 * ฟังก์ชันแสดงผลแบบ Accordion (เขียนใหม่)
 */
function renderCards(data) {
    const container = document.getElementById('accordion-container');
    container.innerHTML = ''; // ล้างรายการเก่าทิ้ง

    data.forEach((rowData, index) => {
        const item = document.getElementById('accordion-item-template').content.cloneNode(true).querySelector('.accordion-item');
        
        const type = rowData[1];
        const details = rowData[2];
        const lat = parseFloat(rowData[3]);
        const lng = parseFloat(rowData[4]);
        const mediaLink = rowData[5];
        const status = rowData[8] || "ยังไม่ดำเนินการ"; 

        // ตั้งค่าส่วนหัวของ Accordion
        const header = item.querySelector('.accordion-header');
        header.querySelector('.header-title').textContent = `${type}: ${details.substring(0, 25)}...`;

        // ตั้งค่าส่วนเนื้อหา
        const content = item.querySelector('.accordion-content');
        content.querySelector('.details').textContent = details || 'ไม่มีรายละเอียดเพิ่มเติม';
        
        const statusDiv = content.querySelector('.card-status');
        statusDiv.textContent = status;
        statusDiv.className = `card-status ${status === 'สำเร็จ' ? 'status-completed' : 'status-pending'}`;

        // Logic การแสดงผล Media
        if (mediaLink) {
            if (mediaLink.includes("youtube.com") || mediaLink.includes("youtu.be")) {
                let videoId = mediaLink.split('v=')[1] || mediaLink.split('/').pop();
                if (videoId) {
                    const ampersandPosition = videoId.indexOf('&');
                    if (ampersandPosition !== -1) { videoId = videoId.substring(0, ampersandPosition); }
                    content.querySelector('.card-video-container').style.display = 'block';
                    content.querySelector('.card-video').src = `https://www.youtube.com/embed/${videoId}`;
                }
            } else if (mediaLink.match(/\.(jpeg|jpg|gif|png)$/i)) {
                content.querySelector('.card-image').style.display = 'block';
                content.querySelector('.card-image').src = mediaLink;
            } else if (mediaLink.includes("drive.google.com")) {
                 const fileIdMatch = mediaLink.match(/id=([-\w]+)/);
                 if (fileIdMatch && fileIdMatch[1]) {
                    content.querySelector('.card-image').style.display = 'block';
                    content.querySelector('.card-image').src = `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}`;
                 }
            }
        }

        // เพิ่ม Event Listener ให้กับปุ่ม Header
        header.addEventListener('click', () => {
            const isActive = header.classList.contains('active');
            
            // ปิด Accordion อื่นๆ ทั้งหมดก่อน
            document.querySelectorAll('.accordion-header').forEach(h => h.classList.remove('active'));
            document.querySelectorAll('.accordion-content').forEach(c => {
                c.style.maxHeight = null;
                c.style.padding = "0 15px";
            });

            // ถ้ากำลังจะเปิด Accordion นี้ (ถ้าก่อนหน้านี้มันปิดอยู่)
            if (!isActive) {
                header.classList.add('active');
                content.style.maxHeight = content.scrollHeight + "px"; // ขยายความสูงให้พอดีกับเนื้อหา
                content.style.padding = "15px"; // เพิ่ม padding ตอนเปิด
                
                // ย้ายแผนที่และซูม
                if (!isNaN(lat) && !isNaN(lng)) {
                    map.setCenter({ lat, lng });
                    map.setZoom(15);
                }
            }
        });

        container.appendChild(item);
    });
}

// (โค้ดฟังก์ชัน renderMarkers เหมือนเดิม ไม่มีการเปลี่ยนแปลง)
async function renderMarkers(data) {
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    const { InfoWindow } = await google.maps.importLibrary("maps");
    
    mapMarkers.forEach(marker => marker.map = null);
    mapMarkers.length = 0;

    data.forEach((rowData, index) => {
        const type = rowData[1];
        const details = rowData[2];
        const lat = parseFloat(rowData[3]);
        const lng = parseFloat(rowData[4]);
        if (isNaN(lat) || isNaN(lng)) return;

        const marker = new AdvancedMarkerElement({ position: { lat, lng }, map, title: type });
        const infoWindow = new InfoWindow({ content: `<div><h4>${type}</h4><p>${details}</p></div>` });

        // Click effect: คลิกหมุด ให้ไปเปิด Accordion ที่เกี่ยวข้อง
        marker.addListener("gmp-click", () => {
            const header = document.querySelectorAll('.accordion-header')[index];
            if (header) {
                header.click(); // สั่งให้ทำงานเหมือนการคลิกที่ Header โดยตรง
            }
        });

        // Hover effect: แสดงข้อมูลย่อ
        marker.content.addEventListener("mouseover", () => infoWindow.open({ map, anchor: marker }));
        marker.content.addEventListener("mouseout", () => infoWindow.close());
        
        mapMarkers.push(marker);
    });
}