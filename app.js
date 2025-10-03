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
let allData = []; // เก็บข้อมูลทั้งหมดที่ดึงมา
const mapMarkers = []; // เก็บอ้างอิงของ marker ทั้งหมดบนแผนที่

/**
 * ฟังก์ชันใหม่: จัดการ Logic ของปุ่มแจ้งเหตุทั้งหมด
 */
function setupReportButton() {
    const reportButton = document.getElementById('report-btn');
    const statusElement = document.getElementById('geolocation-status');

    if (!reportButton || !statusElement) return;

    // ฟังก์ชันสำหรับแสดงข้อความเมื่อถูกบล็อก
    const handlePermissionDenied = () => {
        reportButton.disabled = true;
        reportButton.textContent = 'ถูกบล็อกการเข้าถึงตำแหน่ง';
        statusElement.textContent = 'คุณได้ปฏิเสธการเข้าถึงตำแหน่ง โปรดไปที่การตั้งค่าเบราว์เซอร์เพื่ออนุญาต';
        statusElement.style.display = 'block';
    };
    
    // ฟังก์ชันสำหรับขอตำแหน่ง
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

    // ตรวจสอบสิทธิ์ด้วย Permissions API (ถ้าเบราว์เซอร์รองรับ)
    if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'geolocation' }).then((result) => {
            if (result.state === 'granted') {
                reportButton.addEventListener('click', requestLocation);
            } else if (result.state === 'prompt') {
                reportButton.addEventListener('click', requestLocation);
                // คอยดักฟังถ้าผู้ใช้เปลี่ยนใจไปกดบล็อก
                result.onchange = () => {
                    if (result.state === 'denied') {
                        handlePermissionDenied();
                    }
                };
            } else if (result.state === 'denied') {
                handlePermissionDenied();
            }
        });
    } else if (navigator.geolocation) {
        // สำหรับเบราว์เซอร์เก่าที่ไม่รองรับ Permissions API
        reportButton.addEventListener('click', requestLocation);
    } else {
        // ถ้าไม่รองรับ Geolocation เลย
        reportButton.disabled = true;
        reportButton.textContent = 'ไม่รองรับ Geolocation';
    }
}

// เรียกใช้ฟังก์ชันตั้งค่าปุ่มเมื่อหน้าเว็บโหลดเสร็จ
document.addEventListener('DOMContentLoaded', setupReportButton);


/**
 * ฟังก์ชันเริ่มต้น: สร้างแผนที่และเริ่มกระบวนการดึงข้อมูล
 * (จะถูกเรียกโดย Google Maps API &callback=initApp)
 */
async function initApp() {
    const { Map } = await google.maps.importLibrary("maps");
    map = new Map(document.getElementById("map"), {
        center: { lat: 17.62, lng: 100.09 }, // จุดศูนย์กลางเริ่มต้นของแผนที่ (ประเทศไทย)
        zoom: 10,
        mapId: "FLOOD_REPORT_MAP_V1" // ใช้ Map ID ที่สร้างไว้ใน Google Cloud Console
    });
    await fetchData();
}

/**
 * ฟังก์ชันดึงข้อมูล: ติดต่อ API ของ Google Apps Script เพื่อนำข้อมูลมาแสดงผล
 */
async function fetchData() {
    const loading = document.getElementById('loading');
    loading.textContent = 'กำลังโหลดข้อมูล...';
    loading.style.display = 'block';

    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        if (Array.isArray(data)) {
            loading.style.display = 'none';
            allData = data; // เก็บข้อมูลไว้ใน global variable
            renderCards(allData);
            renderMarkers(allData);
        } else if (data && data.error) {
            throw new Error("Error from Google Apps Script: " + data.error);
        } else {
            throw new Error("Received unexpected data format from API.");
        }
    } catch (error) {
        loading.textContent = 'เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message;
        console.error('Error fetching data:', error);
    }
}

/**
 * ฟังก์ชันแสดงผลการ์ด: สร้างการ์ดข้อมูลแต่ละใบใน Sidebar
 */
function renderCards(data) {
    const container = document.getElementById('card-container');
    container.innerHTML = ''; // ล้างการ์ดเก่าออกไปก่อน

    data.forEach((rowData, index) => {
        const card = document.getElementById('card-template').content.cloneNode(true).querySelector('.card');
        card.id = `card-${index}`; // กำหนด ID ให้กับการ์ดเพื่อใช้อ้างอิง

        // --- ⬇️⬇️⬇️ [ตรวจสอบ Index ให้ตรงกับ Google Sheet ของคุณ] ⬇️⬇️⬇️ ---
        const type = rowData[1]; // คอลัมน์ประเภทเหตุการณ์ (B)
        const details = rowData[2]; // คอลัมน์รายละเอียดเพิ่มเติม (C)
        // lat/lng ไม่ได้ใช้ในการ์ดโดยตรง แต่จำเป็นสำหรับ marker
        const mediaLink = rowData[5]; // คอลัมน์ลิงก์สื่อ (F)
        const status = rowData[8] || "ยังไม่ดำเนินการ"; // คอลัมน์ Status (I)
        // --- ⬆️⬆️⬆️ [จบส่วนตรวจสอบ] ⬆️⬆️⬆️ ---

        card.querySelector('.type').textContent = type || "ไม่มีข้อมูล";
        card.querySelector('.details').textContent = details || 'ไม่มีรายละเอียดเพิ่มเติม';

        // --- จัดการการแสดงผล Media (รูปภาพ/วิดีโอ) ---
        if (mediaLink) {
            if (mediaLink.includes("youtube.com") || mediaLink.includes("youtu.be")) {
                let videoId = mediaLink.split('v=')[1] || mediaLink.split('/').pop();
                if (videoId) {
                    const ampersandPosition = videoId.indexOf('&');
                    if (ampersandPosition !== -1) { videoId = videoId.substring(0, ampersandPosition); }
                    const videoContainer = card.querySelector('.card-video-container');
                    if (videoContainer) { // ตรวจสอบว่า element มีอยู่จริง
                        videoContainer.style.display = 'block';
                        videoContainer.querySelector('.card-video').src = `https://www.youtube.com/embed/${videoId}`;
                    }
                }
            } else if (mediaLink.match(/\.(jpeg|jpg|gif|png)$/i)) { // ตรวจสอบว่าเป็นลิงก์รูปภาพ
                const imageElement = card.querySelector('.card-image');
                if (imageElement) { // ตรวจสอบว่า element มีอยู่จริง
                    imageElement.style.display = 'block';
                    imageElement.src = mediaLink;
                }
            } else if (mediaLink.includes("drive.google.com")) { // ลิงก์ Google Drive (อาจเป็นรูป)
                 const fileIdMatch = mediaLink.match(/id=([-\w]+)/);
                 if (fileIdMatch && fileIdMatch[1]) {
                    const imageElement = card.querySelector('.card-image');
                    if (imageElement) { // ตรวจสอบว่า element มีอยู่จริง
                        imageElement.style.display = 'block';
                        // ใช้ thumbnail service ของ Google Drive
                        imageElement.src = `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}`;
                    }
                 }
            }
        }
        
        // --- แสดงสถานะ และ Dropdown ---
        const statusDiv = card.querySelector('.card-status');
        statusDiv.textContent = status;
        statusDiv.className = `card-status ${status === 'สำเร็จ' ? 'status-completed' : 'status-pending'}`;
        
        const statusDropdown = document.createElement('select'); // สร้าง dropdown ใหม่
        statusDropdown.className = 'status-dropdown';
        ['ยังไม่ดำเนินการ', 'กำลังดำเนินการ', 'สำเร็จ'].forEach(optionText => {
            const option = document.createElement('option');
            option.value = optionText;
            option.textContent = optionText;
            statusDropdown.appendChild(option);
        });
        statusDropdown.value = status; // ตั้งค่าเริ่มต้นของ dropdown ให้ตรงกับสถานะปัจจุบัน

        if (status === 'สำเร็จ') {
            statusDropdown.disabled = true; // ถ้าสำเร็จแล้ว ไม่ให้แก้ไข
        } else {
            // เพิ่ม Event Listener สำหรับการเปลี่ยนแปลงสถานะ
            statusDropdown.addEventListener('change', (event) => {
                updateStatus(index, event.target.value, statusDropdown, card);
            });
        }
        card.appendChild(statusDropdown); // เพิ่ม dropdown เข้าไปในการ์ด

        container.appendChild(card);
    });
}

/**
 * ฟังก์ชันแสดงผลหมุด: สร้างหมุดบนแผนที่ตามพิกัด
 */
async function renderMarkers(data) {
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    const { InfoWindow } = await google.maps.importLibrary("maps");

    // ลบ marker เก่าทั้งหมดออกจากแผนที่ก่อนสร้างใหม่
    mapMarkers.forEach(marker => marker.map = null);
    mapMarkers.length = 0; // ล้าง array

    data.forEach((rowData, index) => {
        // --- ⬇️⬇️⬇️ [ตรวจสอบ Index ให้ตรงกับ Google Sheet ของคุณ] ⬇️⬇️⬇️ ---
        const type = rowData[1];
        const details = rowData[2];
        const lat = parseFloat(rowData[3]); // คอลัมน์ Latitude (D)
        const lng = parseFloat(rowData[4]); // คอลัมน์ Longitude (E)
        // --- ⬆️⬆️⬆️ [จบส่วนตรวจสอบ] ⬆️⬆️⬆️ ---

        if (isNaN(lat) || isNaN(lng)) return; // ข้ามถ้าพิกัดไม่ถูกต้อง

        const marker = new AdvancedMarkerElement({
            position: { lat, lng },
            map: map,
            title: type, // แสดงประเภทเมื่อ hover ที่ marker
        });

        const infoWindow = new InfoWindow({
            content: `<div><h4>${type || 'ไม่มีประเภท'}</h4><p>${details || 'ไม่มีรายละเอียด'}</p></div>`,
        });
        
        // --- Hover effect สำหรับ Marker ---
        marker.content.addEventListener("mouseover", () => {
            infoWindow.open({ map, anchor: marker });
            highlightCard(index); // ไฮไลท์การ์ดที่เกี่ยวข้อง
        });
        marker.content.addEventListener("mouseout", () => {
            infoWindow.close();
            unhighlightCard(index); // ยกเลิกไฮไลท์การ์ด
        });

        // --- คลิก Marker ให้เลื่อนไปที่การ์ด ---
        marker.addListener("gmp-click", () => {
            const cardElement = document.getElementById(`card-${index}`);
            if (cardElement) {
                // ลบไฮไลท์จากการ์ดอื่นๆ ก่อน
                document.querySelectorAll('.card').forEach(c => c.classList.remove('highlight'));
                // ไฮไลท์การ์ดที่ถูกคลิก
                cardElement.classList.add('highlight');
                // เลื่อนหน้าจอไปที่การ์ดนั้น
                cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });

        mapMarkers.push(marker); // เพิ่ม marker เข้าไปใน array
    });
}

/**
 * ฟังก์ชันสำหรับไฮไลท์การ์ด
 */
function highlightCard(index) {
    const cardElement = document.getElementById(`card-${index}`);
    if (cardElement) {
        cardElement.classList.add('highlight');
    }
}

/**
 * ฟังก์ชันสำหรับยกเลิกไฮไลท์การ์ด
 */
function unhighlightCard(index) {
    const cardElement = document.getElementById(`card-${index}`);
    if (cardElement) {
        cardElement.classList.remove('highlight');
    }
}

/**
 * ฟังก์ชันอัปเดตสถานะ: ส่งคำสั่งปิดเคสไปที่ Apps Script (doPost)
 */
async function updateStatus(rowIndex, newStatus, dropdownElement, cardElement) {
    const originalStatus = dropdownElement.value;
    dropdownElement.disabled = true; // ปิดการใช้งาน dropdown ชั่วคราว
    cardElement.style.opacity = 0.7; // ลดความทึบแสงเพื่อแสดงว่ากำลังโหลด

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            mode: 'cors', // สำคัญมากสำหรับ Apps Script API
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ row: rowIndex, status: newStatus }) // ส่ง rowIndex และสถานะใหม่
        });
        const result = await response.json();

        if (result.status === 'success') {
            await fetchData(); // รีเฟรชข้อมูลทั้งหมดหลังจากอัปเดตสำเร็จ
        } else {
            throw new Error(result.message || "Unknown error from server.");
        }
    } catch (error) {
        alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ: ' + error.message);
        console.error('Error updating status:', error);
        dropdownElement.value = originalStatus; // คืนค่าเดิมถ้าเกิดข้อผิดพลาด
        dropdownElement.disabled = false; // เปิดการใช้งาน dropdown
        cardElement.style.opacity = 1; // คืนความทึบแสง
    }
}


