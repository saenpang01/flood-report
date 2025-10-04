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

/**
 * ฟังก์ชันจัดการปุ่มแจ้งเหตุ (เวอร์ชันปรับปรุงเพื่อความเสถียรบนมือถือ)
 */
// ✅ โค้ดที่แก้ไขแล้วสำหรับปุ่มแจ้งเหตุ
function setupReportButton() {
    const reportButton = document.getElementById('report-btn');
    const statusElement = document.getElementById('geolocation-status');
    if (!reportButton || !statusElement) return;

    let prefilledUrl = ''; // ตัวแปรสำหรับเก็บ URL ที่มีพิกัดแล้ว

    // ฟังก์ชันสำหรับคืนค่าปุ่มสู่สถานะเริ่มต้น
    const resetButton = () => {
        reportButton.disabled = false;
        reportButton.textContent = '📍 แจ้งเหตุที่ตำแหน่งนี้';
        reportButton.style.backgroundColor = '#dc3545'; // สีแดงเดิม
        prefilledUrl = '';
        // ลบ Event Listener เก่าออกและเพิ่มอันใหม่กลับเข้าไป
        reportButton.removeEventListener('click', openFormHandler);
        reportButton.addEventListener('click', getLocationHandler);
    };
    
    // Handler สำหรับเปิด Google Form
    const openFormHandler = () => {
        if (prefilledUrl) {
            window.open(prefilledUrl, '_blank');
            // หลังจากเปิดฟอร์มแล้ว ให้คืนค่าปุ่มกลับเป็นปกติ
            setTimeout(resetButton, 1000); 
        }
    };

    // Handler สำหรับขอตำแหน่ง
    const getLocationHandler = () => {
        if (!navigator.geolocation) {
            statusElement.textContent = 'เบราว์เซอร์ของคุณไม่รองรับ Geolocation';
            statusElement.style.display = 'block';
            reportButton.disabled = true;
            return;
        }

        reportButton.disabled = true;
        reportButton.textContent = '🛰️ กำลังค้นหาพิกัด...';
        statusElement.style.display = 'none';

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude: lat, longitude: lon } = position.coords;
                prefilledUrl = `${GOOGLE_FORM_URL}?usp=pp_url&${LATITUDE_ENTRY_ID}=${lat}&${LONGITUDE_ENTRY_ID}=${lon}`;
                
                // เปลี่ยนปุ่มเพื่อให้ผู้ใช้กดอีกครั้ง
                reportButton.disabled = false;
                reportButton.textContent = '✅ พบพิกัดแล้ว! คลิกเพื่อเปิดฟอร์ม';
                reportButton.style.backgroundColor = '#28a745'; // เปลี่ยนเป็นสีเขียว
                
                // เปลี่ยน Event Listener ของปุ่ม
                reportButton.removeEventListener('click', getLocationHandler);
                reportButton.addEventListener('click', openFormHandler);
            },
            (error) => {
                let errorMessage = 'เกิดข้อผิดพลาดในการขอตำแหน่ง';
                if (error.code === 1) {
                    errorMessage = 'คุณปฏิเสธการเข้าถึงตำแหน่ง โปรดอนุญาตในการตั้งค่าเบราว์เซอร์';
                }
                statusElement.textContent = errorMessage;
                statusElement.style.display = 'block';
                resetButton(); // คืนค่าปุ่มเมื่อเกิด Error
                console.error('Geolocation error:', error);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };
    
    // เริ่มต้นให้ปุ่มทำงานด้วย Handler ขอตำแหน่ง
    reportButton.addEventListener('click', getLocationHandler);
}

document.addEventListener('DOMContentLoaded', setupReportButton);
// (ฟังก์ชัน initApp, fetchData, renderCards, renderMarkers ทั้งหมดเหมือนเดิม ไม่ต้องแก้ไข)
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
            renderCards(data);
            renderMarkers(data);
        } else {
            throw new Error(data.error || "Format error.");
        }
    } catch (error) {
        loading.textContent = 'เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message;
    }
}

function renderCards(data) {
    const container = document.getElementById('accordion-container');
    container.innerHTML = '';
    data.forEach((rowData, index) => {
        const card = document.getElementById('accordion-item-template').content.cloneNode(true).querySelector('.accordion-item');
        card.id = `card-${index}`; // ตั้ง ID ไว้สำหรับอ้างอิงจาก Marker
        const type = rowData[1];
        const details = rowData[2];
        const mediaLink = rowData[5];
        const status = rowData[8] || "ยังไม่ดำเนินการ";
        
        card.querySelector('.header-title').textContent = type || "N/A";
        card.querySelector('.details').textContent = details || "N/A";
        if (mediaLink) {
            if (mediaLink.includes("youtube.com") || mediaLink.includes("youtu.be")) {
                let videoId = mediaLink.split('v=')[1] || mediaLink.split('/').pop();
                if (videoId) {
                    const ampersandPosition = videoId.indexOf('&');
                    if (ampersandPosition !== -1) { videoId = videoId.substring(0, ampersandPosition); }
                    const videoContainer = card.querySelector('.card-video-container');
                    if(videoContainer) {
                        videoContainer.style.display = 'block';
                        videoContainer.querySelector('.card-video').src = `https://www.youtube.com/embed/${videoId}`;
                    }
                }
            } else if (mediaLink.match(/\.(jpeg|jpg|gif|png)$/i)) {
                const imageEl = card.querySelector('.card-image');
                if(imageEl){
                    imageEl.style.display = 'block';
                    imageEl.src = mediaLink;
                }
            } else if (mediaLink.includes("drive.google.com")) {
                 const fileIdMatch = mediaLink.match(/id=([-\w]+)/);
                 if (fileIdMatch && fileIdMatch[1]) {
                    const imageEl = card.querySelector('.card-image');
                    if(imageEl){
                        imageEl.style.display = 'block';
                        imageEl.src = `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}`;
                    }
                 }
            }
        }
        const statusDiv = card.querySelector('.card-status');
        if(statusDiv){
            statusDiv.textContent = status;
            statusDiv.className = `card-status ${status === 'สำเร็จ' ? 'status-completed' : 'status-pending'}`;
        }
        
        // จัดการการคลิกเพื่อเปิด/ปิด Accordion
        const header = card.querySelector('.accordion-header');
        const content = card.querySelector('.accordion-content');
        header.addEventListener('click', () => {
            header.classList.toggle('active');
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
                content.style.padding = "0 15px";
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
                content.style.padding = "15px";
            }
        });

        container.appendChild(card);
    });
}

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
        marker.content.addEventListener("mouseover", () => {
            infoWindow.open({ map, anchor: marker });
            const cardElement = document.getElementById(`card-${index}`);
            if (cardElement) cardElement.classList.add('highlight');
        });
        marker.content.addEventListener("mouseout", () => {
            infoWindow.close();
            const cardElement = document.getElementById(`card-${index}`);
            if (cardElement) cardElement.classList.remove('highlight');
        });
        marker.addListener("gmp-click", () => {
            const cardElement = document.getElementById(`card-${index}`);
            if (cardElement) {
                document.querySelectorAll('.card').forEach(c => c.classList.remove('highlight'));
                cardElement.classList.add('highlight');
                cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
        mapMarkers.push(marker);
    });
}