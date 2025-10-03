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

document.addEventListener('DOMContentLoaded', () => {
    const reportButton = document.getElementById('report-btn');
    if(reportButton) {
        reportButton.addEventListener('click', () => {
            reportButton.disabled = true;
            reportButton.textContent = '🛰️ กำลังค้นหาพิกัด...';

            if (!navigator.geolocation) {
                alert('เบราว์เซอร์ของคุณไม่รองรับ Geolocation');
                reportButton.disabled = false;
                reportButton.textContent = '📍 แจ้งเหตุที่ตำแหน่งนี้';
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude: lat, longitude: lon } = position.coords;
                    const prefilledUrl = `${GOOGLE_FORM_URL}?usp=pp_url&${LATITUDE_ENTRY_ID}=${lat}&${LONGITUDE_ENTRY_ID}=${lon}`;
                    window.open(prefilledUrl, '_blank');
                    reportButton.disabled = false;
                    reportButton.textContent = '📍 แจ้งเหตุที่ตำแหน่งนี้';
                },
                (error) => {
                    alert('ไม่สามารถเข้าถึงตำแหน่งได้ โปรดตรวจสอบการตั้งค่า GPS และอนุญาตให้เข้าถึงตำแหน่ง');
                    console.error('Geolocation error:', error);
                    reportButton.disabled = false;
                    reportButton.textContent = '📍 แจ้งเหตุที่ตำแหน่งนี้';
                }
            );
        });
    }
});

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

    const caseSelector = document.getElementById('case-selector');
    caseSelector.addEventListener('change', (event) => {
        const selectedIndex = event.target.value;
        if (selectedIndex === "all") {
            // ถ้าเลือก "แสดงทุกเคส" ให้แสดงข้อมูลทั้งหมด
            renderCards(allData);
            renderMarkers(allData);
        } else {
            // ถ้าเลือกเคสใดเคสหนึ่ง ให้แสดงเฉพาะข้อมูลของเคสนั้น
            const selectedData = [allData[selectedIndex]];
            renderCards(selectedData);
            renderMarkers(selectedData);
            // ซูมแผนที่ไปที่เคสที่เลือก
            const lat = parseFloat(selectedData[0][3]);
            const lng = parseFloat(selectedData[0][4]);
            if (!isNaN(lat) && !isNaN(lng)) {
                map.setCenter({ lat, lng });
                map.setZoom(15);
            }
        }
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
            populateCaseSelector(allData); // <-- เพิ่มบรรทัดนี้
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

function populateCaseSelector(data) {
    const selector = document.getElementById('case-selector');
    // ล้าง option เก่า (ยกเว้น "แสดงทุกเคส")
    selector.innerHTML = '<option value="all">แสดงทุกเคส</option>';
    
    data.forEach((rowData, index) => {
        const type = rowData[1];
        const details = rowData[2];
        const option = document.createElement('option');
        option.value = index; // ใช้ index ของ array เป็น value
        option.textContent = `${type}: ${details.substring(0, 30)}...`; // แสดงข้อความตัวอย่าง
        selector.appendChild(option);
    });
}

/**
 * ฟังก์ชันแสดงผลการ์ด: สร้างการ์ดข้อมูลแต่ละใบใน Sidebar
 */
function renderCards(data) {
    const container = document.getElementById('card-container');
    container.innerHTML = '';
    data.forEach((rowData, index) => {
        const card = document.getElementById('card-template').content.cloneNode(true).querySelector('.card');
        
        // --- ⬇️⬇️⬇️ [ตรวจสอบ Index ให้ตรงกับ Sheet] ⬇️⬇️⬇️ ---
        const type = rowData[1];
        const details = rowData[2];
        const mediaLink = rowData[5]; // ⚠️ สมมติว่าลิงก์สื่ออยู่คอลัมน์ F (index 5)
        const status = rowData[8] || "ยังไม่ดำเนินการ";
        // --- ⬆️⬆️⬆️ [จบส่วนตรวจสอบ] ⬆️⬆️⬆️ ---

        card.querySelector('.type').textContent = type || "N/A";
        card.querySelector('.details').textContent = details || "N/A";
        
        const statusDiv = card.querySelector('.card-status');
        statusDiv.textContent = status;
        statusDiv.className = `card-status ${status === 'สำเร็จ' ? 'status-completed' : 'status-pending'}`;

        // --- ⬇️⬇️⬇️ [เพิ่ม Logic การแสดงผล Media] ⬇️⬇️⬇️ ---
        if (mediaLink) {
            // ตรวจสอบว่าเป็นลิงก์ YouTube หรือไม่
            if (mediaLink.includes("youtube.com") || mediaLink.includes("youtu.be")) {
                let videoId = mediaLink.split('v=')[1] || mediaLink.split('/').pop();
                if (videoId) {
                    const ampersandPosition = videoId.indexOf('&');
                    if (ampersandPosition !== -1) { videoId = videoId.substring(0, ampersandPosition); }
                    card.querySelector('.card-video-container').style.display = 'block';
                    card.querySelector('.card-video').src = `https://www.youtube.com/embed/${videoId}`;
                }
            }
            // ตรวจสอบว่าเป็นไฟล์รูปภาพหรือไม่
            else if (mediaLink.match(/\.(jpeg|jpg|gif|png)$/i)) {
                card.querySelector('.card-image').style.display = 'block';
                card.querySelector('.card-image').src = mediaLink;
            }
            // ถ้าเป็น Google Drive Link (แสดงเป็น Thumbnail)
            else if (mediaLink.includes("drive.google.com")) {
                 const fileIdMatch = mediaLink.match(/id=([-\w]+)/);
                 if (fileIdMatch && fileIdMatch[1]) {
                    card.querySelector('.card-image').style.display = 'block';
                    card.querySelector('.card-image').src = `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}`;
                 }
            }
        }
        // --- ⬆️⬆️⬆️ [จบ Logic การแสดงผล Media] ⬆️⬆️⬆️ ---
        
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

