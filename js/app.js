// 地震預警系統 JavaScript

// 全局變量
let currentPage = 'home';
let darkMode = false;
let eewActive = false;
let earthquakeData = []; // 實際地震數據
let userLocation = { lat: 25.0330, lng: 121.5654 }; // 預設台北市
let userDistrict = { county: '臺北市', district: '信義區' }; // 預設行政區
let map = null; // 地圖實例
let userMarker = null; // 用戶位置標記
let earthquakeMarker = null; // 地震標記
let earthquakeCircle = null; // 地震影響範圍圓圈
// 氣象署 API Key
const CWA_API_KEY = 'CWA-19B695DB-613E-496B-A962-8A9399FD36A3';
let currentQuake = null; // 當前查看的地震詳情

// DOM 載入完成後執行
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM載入完成，開始初始化應用');
    
    try {
        // 載入區域資料
        if (typeof GeoUtils !== 'undefined') {
            console.log('開始載入地理數據');
            await GeoUtils.loadRegionData();
            console.log('地理數據已載入');
        } else {
            console.error('GeoUtils 未定義，無法載入地理數據');
        }
        
        // 初始化頁面
        initApp();
        
        // 設置事件監聽器
        setupEventListeners();
        
        // 載入實際地震數據
        await loadEarthquakeData();
        
        // 延遲初始化地圖，確保DOM已完全載入
        setTimeout(() => {
            console.log('延遲初始化地圖');
            initMap();
        }, 1000);
        
        // 定時更新顯示
        setInterval(updateDisplay, 1000);
    } catch (error) {
        console.error('應用初始化失敗:', error);
    }
});

// 初始化應用程序
function initApp() {
    console.log('初始化應用程式...');
    
    // 設定事件監聽器
    setupEventListeners();
    
    // 更新時間
    updateTime();
    setInterval(updateTime, 1000);
    
    // 更新連線狀態
    updateConnectionStatus();
    setInterval(updateConnectionStatus, 5000);
    
    // 嘗試獲取使用者位置
    tryGetUserLocation();
    
    // 載入使用者設定
    loadSettings();
    
    // 初始化地圖
    if (document.getElementById('map-container')) {
        setTimeout(initMap, 300);
    }
    
    // 載入地震資料
    loadEarthquakeData();
    
    // 載入氣象觀測資料
    loadWeatherData();
    
    console.log('應用程式初始化完成');
}

// 設置事件監聽器
function setupEventListeners() {
    // 導航按鈕點擊事件
    document.querySelectorAll('.nav-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const page = e.currentTarget.dataset.page;
            showPage(page);
        });
    });
    
    // 快速操作按鈕點擊事件
    document.querySelectorAll('.action-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const page = e.currentTarget.dataset.page;
            showPage(page);
        });
    });
    
    // 設置頁面開關切換
    document.getElementById('dark-mode').addEventListener('change', toggleDarkMode);
    document.getElementById('eew-notifications').addEventListener('change', toggleNotifications);
    
    // 地圖類型選擇
    document.getElementById('map-type').addEventListener('change', (e) => {
        changeMapStyle(e.target.value);
    });
    
    // 地圖類型切換按鈕
    const toggleMapTypeBtn = document.getElementById('toggle-map-type');
    if (toggleMapTypeBtn) {
        toggleMapTypeBtn.addEventListener('click', cycleMapTypes);
    }
    
    // 篩選按鈕點擊事件
    document.getElementById('filter-button').addEventListener('click', filterReports);
}

// 顯示指定頁面
function showPage(pageName, earthquakeId) {
    // 隱藏所有頁面
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // 顯示目標頁面
    const targetPage = document.getElementById(`${pageName}-page`);
    if (!targetPage) {
        console.error(`頁面 ${pageName} 不存在`);
        return;
    }
    
    targetPage.classList.add('active');
    
    // 更新導航按鈕狀態
    document.querySelectorAll('.nav-button').forEach(button => {
        button.classList.remove('active');
        if (button.dataset.page === pageName) {
            button.classList.add('active');
        }
    });
    
    // 更新當前頁面變量
    currentPage = pageName;
    
    // 如果切換到地震預警頁面
    if (pageName === 'eew') {
        console.log('切換到預警頁面，檢查地圖...');
        
        // 如果有特定地震ID，顯示該地震詳情
        if (earthquakeId) {
            const quake = earthquakeData.find(q => q.id === earthquakeId);
            if (quake) {
                currentQuake = quake;
                setTimeout(() => {
                    showEarthquakeOnMap(quake);
                }, 500);
            }
        } else if (!eewActive) {
            // 如果沒有指定地震ID且沒有活動預警，重置地圖
            resetMap();
            currentQuake = null;
        }
        
        // 如果地圖尚未初始化，初始化它
        if (!map) {
            console.log('地圖未初始化，開始初始化...');
            initMap();
        } else {
            console.log('地圖已初始化，更新視圖...');
            
            // 強制重新渲染地圖以修復可能的顯示問題
            setTimeout(() => {
                if (map) {
                    console.log('重新調整地圖大小...');
                    map.resize();
                }
            }, 300);
        }
    }
}

// 更新當前時間
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('zh-TW');
    document.getElementById('current-time').textContent = timeString;
}

// 更新連接狀態
function updateConnectionStatus() {
    const statusElement = document.getElementById('connection-status');
    
    if (navigator.onLine) {
        statusElement.innerHTML = '<i class="bi bi-wifi"></i> 已連線';
        statusElement.classList.add('online');
        statusElement.classList.remove('offline');
    } else {
        statusElement.innerHTML = '<i class="bi bi-wifi-off"></i> 離線';
        statusElement.classList.add('offline');
        statusElement.classList.remove('online');
    }
}

// 嘗試獲取用戶位置
function tryGetUserLocation() {
    console.log('嘗試獲取使用者位置...');
    
    if (!navigator.geolocation) {
        console.log('瀏覽器不支持地理位置功能');
        document.getElementById('user-location').textContent = '定位不可用';
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        position => {
            console.log('成功獲取使用者位置');
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            // 根據座標查詢地址
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.lat}&lon=${userLocation.lng}&zoom=18&addressdetails=1`)
                .then(response => response.json())
                .then(data => {
                    let address = '';
                    if (data.address) {
                        if (data.address.city) {
                            address += data.address.city;
                        } else if (data.address.county) {
                            address += data.address.county;
                        }
                        
                        if (data.address.suburb) {
                            address += ' ' + data.address.suburb;
                        } else if (data.address.town) {
                            address += ' ' + data.address.town;
                        } else if (data.address.village) {
                            address += ' ' + data.address.village;
                        }
                    }
                    
                    if (!address) {
                        address = data.display_name.split(',')[0];
                    }
                    
                    // 更新位置顯示
                    updateUserLocationDisplay(userLocation, address);
                    
                    // 更新用戶位置標記
                    if (map) {
                        addUserLocationMarker();
                    }
                })
                .catch(error => {
                    console.error('獲取地址時出錯:', error);
                    updateUserLocationDisplay(userLocation);
                });
        },
        error => {
            console.error('獲取使用者位置時出錯:', error);
            let errorMsg;
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMsg = '位置存取被拒絕';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMsg = '位置資訊不可用';
                    break;
                case error.TIMEOUT:
                    errorMsg = '位置請求超時';
                    break;
                default:
                    errorMsg = '未知錯誤';
            }
            document.getElementById('user-location').textContent = errorMsg;
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// 載入設置
function loadSettings() {
    // 這裡可以從localStorage加載用戶設置
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (savedDarkMode) {
        darkMode = true;
        document.getElementById('dark-mode').checked = true;
        document.body.classList.add('dark-mode');
    }
}

// 切換深色模式
function toggleDarkMode(e) {
    darkMode = e.target.checked;
    
    if (darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    // 保存設置
    localStorage.setItem('darkMode', darkMode);
}

// 切換通知
function toggleNotifications(e) {
    const enabled = e.target.checked;
    
    if (enabled) {
        requestNotificationPermission();
    }
    
    // 保存設置
    localStorage.setItem('notifications', enabled);
}

// 請求通知權限
function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('通知權限已授予');
            }
        });
    }
}

// 從中央氣象署載入地震數據
async function loadEarthquakeData() {
    try {
        console.log('開始從中央氣象署獲取地震數據');
        
        // 載入顯著地震報告
        const significantResponse = await fetch(`https://opendata.cwa.gov.tw/api/v1/rest/datastore/E-A0016-001?Authorization=${CWA_API_KEY}`);
        
        if (!significantResponse.ok) {
            throw new Error(`獲取顯著地震報告失敗: ${significantResponse.status}`);
        }
        
        const significantData = await significantResponse.json();
        
        if (significantData && significantData.records && significantData.records.Earthquake) {
            console.log('成功獲取顯著地震報告數據');
            
            // 處理顯著地震報告數據
            const processedData = significantData.records.Earthquake.map(quake => {
                const originTime = new Date(quake.EarthquakeInfo.OriginTime);
                
                return {
                    id: quake.EarthquakeNo,
                    time: originTime,
                    magnitude: parseFloat(quake.EarthquakeInfo.EarthquakeMagnitude.MagnitudeValue),
                    depth: parseFloat(quake.EarthquakeInfo.FocalDepth),
                    location: quake.EarthquakeInfo.Epicenter.Location,
                    intensity: getMaxIntensity(quake.Intensity),
                    coordinates: {
                        lat: parseFloat(quake.EarthquakeInfo.Epicenter.EpicenterLatitude),
                        lng: parseFloat(quake.EarthquakeInfo.Epicenter.EpicenterLongitude)
                    },
                    reportImage: quake.ReportImageURI,
                    shakemapImage: quake.ShakemapImageURI,
                    reportContent: quake.ReportContent,
                    webPage: quake.Web,
                    stationData: extractStationData(quake.Intensity)
                };
            });
            
            // 按時間排序（最新的在前）
            earthquakeData = processedData.sort((a, b) => b.time - a.time);
            console.log(`處理了 ${earthquakeData.length} 筆顯著地震資料`);
        } else {
            console.warn('未找到地震數據或格式不正確');
        }
        
        // 更新統計數據
        updateEarthquakeStats();
        
        // 渲染地震報告列表
        renderEarthquakeReports();
        
        // 如果在報告頁面，更新已顯示的報告
        if (currentPage === 'reports') {
            filterReports();
        }
    } catch (error) {
        console.error('載入地震數據時出錯:', error);
        // 如果載入失敗，使用模擬數據
        loadMockData();
    }
}

// 從強度數據中獲取最大震度數值
function getMaxIntensity(intensityData) {
    if (!intensityData || !intensityData.ShakingArea) {
        return 0;
    }
    
    let maxIntensity = 0;
    
    intensityData.ShakingArea.forEach(area => {
        if (area.AreaIntensity) {
            const intensity = parseInt(area.AreaIntensity.replace('級', ''), 10);
            if (!isNaN(intensity) && intensity > maxIntensity) {
                maxIntensity = intensity;
            }
        }
    });
    
    return maxIntensity;
}

// 提取測站數據
function extractStationData(intensityData) {
    if (!intensityData || !intensityData.ShakingArea) {
        return [];
    }
    
    const stations = [];
    
    intensityData.ShakingArea.forEach(area => {
        if (area.EqStation) {
            area.EqStation.forEach(station => {
                if (station.StationLatitude && station.StationLongitude) {
                    stations.push({
                        name: station.StationName,
                        id: station.StationID,
                        lat: parseFloat(station.StationLatitude),
                        lng: parseFloat(station.StationLongitude),
                        intensity: station.SeismicIntensity ? parseInt(station.SeismicIntensity.replace('級', ''), 10) : 0,
                        county: area.CountyName
                    });
                }
            });
        }
    });
    
    return stations;
}

// 載入模擬地震數據 (當氣象署API無法連接時使用)
function loadMockData() {
    console.log('使用模擬數據');
    // 模擬數據 - 現在使用實際的經緯度
    earthquakeData = [
        {
            id: 1,
            time: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2小時前
            magnitude: 4.7,
            depth: 15.2,
            location: '花蓮縣秀林鄉',
            intensity: 3,
            coordinates: { lat: 24.1278, lng: 121.6578 },
            reportContent: '花蓮縣秀林鄉發生規模4.7有感地震，最大震度3級。'
        },
        {
            id: 2,
            time: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8小時前
            magnitude: 3.4,
            depth: 10.5,
            location: '宜蘭縣南澳鄉',
            intensity: 2,
            coordinates: { lat: 24.4611, lng: 121.7951 },
            reportContent: '宜蘭縣南澳鄉發生規模3.4有感地震，最大震度2級。'
        },
        {
            id: 3,
            time: new Date(Date.now() - 1000 * 60 * 60 * 24), // 昨天
            magnitude: 5.2,
            depth: 18.7,
            location: '台東縣成功鎮',
            intensity: 4,
            coordinates: { lat: 23.1000, lng: 121.3667 },
            reportContent: '台東縣成功鎮發生規模5.2有感地震，最大震度4級。'
        }
    ];
    
    // 更新今日地震數據
    updateEarthquakeStats();
    
    // 渲染地震報告列表
    renderEarthquakeReports();
    
    // 隨機模擬地震預警
    if (Math.random() < 0.3) { // 30%機率觸發模擬預警
        setTimeout(() => {
            simulateEarthquakeWarning();
        }, 10000); // 10秒後觸發
    }
}

// 更新地震統計數據
function updateEarthquakeStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 計算今日地震數量
    const todayCount = earthquakeData.filter(quake => quake.time >= today).length;
    document.getElementById('today-earthquakes').textContent = todayCount;
    
    // 計算最大震度
    if (earthquakeData.length > 0) {
        const maxIntensity = Math.max(...earthquakeData.map(quake => quake.intensity));
        document.getElementById('max-intensity').textContent = maxIntensity;
    }
}

// 渲染地震報告列表
function renderEarthquakeReports() {
    const reportsContainer = document.getElementById('earthquake-reports');
    
    // 清空現有內容
    reportsContainer.innerHTML = '';
    
    // 如果沒有數據，顯示空狀態
    if (earthquakeData.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <i class="bi bi-search"></i>
            <p>無地震記錄</p>
        `;
        reportsContainer.appendChild(emptyState);
        return;
    }
    
    // 按時間排序（最新的在前）
    const sortedData = [...earthquakeData].sort((a, b) => b.time - a.time);
    
    // 生成報告項目
    sortedData.forEach(quake => {
        const reportItem = document.createElement('div');
        reportItem.className = 'report-item';
        reportItem.dataset.quakeId = quake.id;
        
        // 震級樣式
        let magnitudeClass = 'magnitude-low';
        if (quake.magnitude >= 5) {
            magnitudeClass = 'magnitude-high';
        } else if (quake.magnitude >= 4) {
            magnitudeClass = 'magnitude-medium';
        }
        
        // 格式化時間
        const timeString = quake.time.toLocaleString('zh-TW', { 
            month: 'numeric', 
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit'
        });
        
        // 設置內容
        reportItem.innerHTML = `
            <div class="report-magnitude ${magnitudeClass}">${quake.magnitude.toFixed(1)}</div>
            <div class="report-details">
                <h4>${quake.location}</h4>
                <p>深度 ${quake.depth} 公里 | 震度 ${quake.intensity} 級</p>
            </div>
            <div class="report-time">${timeString}</div>
        `;
        
        // 點擊事件 - 顯示詳情
        reportItem.addEventListener('click', () => {
            showEarthquakeDetails(quake);
        });
        
        reportsContainer.appendChild(reportItem);
    });
}

// 篩選地震報告
function filterReports() {
    const timeFilter = document.getElementById('time-filter').value;
    const magnitudeFilter = document.getElementById('magnitude-filter').value;
    
    const reportsContainer = document.getElementById('earthquake-reports');
    reportsContainer.innerHTML = '';
    
    // 時間篩選
    let timeThreshold = new Date();
    if (timeFilter === 'today') {
        timeThreshold.setHours(0, 0, 0, 0);
    } else if (timeFilter === 'week') {
        timeThreshold.setDate(timeThreshold.getDate() - 7);
    } else if (timeFilter === 'month') {
        timeThreshold.setMonth(timeThreshold.getMonth() - 1);
    }
    
    // 震級篩選
    let magnitudeThreshold = 0;
    if (magnitudeFilter !== 'all') {
        magnitudeThreshold = parseFloat(magnitudeFilter);
    }
    
    // 篩選數據
    const filteredData = earthquakeData.filter(quake => {
        return quake.time >= timeThreshold && quake.magnitude >= magnitudeThreshold;
    });
    
    // 如果沒有數據，顯示空狀態
    if (filteredData.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <i class="bi bi-search"></i>
            <p>無符合條件的地震記錄</p>
        `;
        reportsContainer.appendChild(emptyState);
        return;
    }
    
    // 按時間排序（最新的在前）
    const sortedData = [...filteredData].sort((a, b) => b.time - a.time);
    
    // 生成報告項目
    sortedData.forEach(quake => {
        const reportItem = document.createElement('div');
        reportItem.className = 'report-item';
        reportItem.dataset.quakeId = quake.id;
        
        // 震級樣式
        let magnitudeClass = 'magnitude-low';
        if (quake.magnitude >= 5) {
            magnitudeClass = 'magnitude-high';
        } else if (quake.magnitude >= 4) {
            magnitudeClass = 'magnitude-medium';
        }
        
        // 格式化時間
        const timeString = quake.time.toLocaleString('zh-TW', { 
            month: 'numeric', 
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit'
        });
        
        // 設置內容
        reportItem.innerHTML = `
            <div class="report-magnitude ${magnitudeClass}">${quake.magnitude.toFixed(1)}</div>
            <div class="report-details">
                <h4>${quake.location}</h4>
                <p>深度 ${quake.depth} 公里 | 震度 ${quake.intensity} 級</p>
            </div>
            <div class="report-time">${timeString}</div>
        `;
        
        // 點擊事件 - 顯示詳情
        reportItem.addEventListener('click', () => {
            showEarthquakeDetails(quake);
        });
        
        reportsContainer.appendChild(reportItem);
    });
}

// 顯示地震詳情
function showEarthquakeDetails(quake) {
    console.log('顯示地震詳情:', quake);
    currentQuake = quake;
    
    // 創建詳情對話框
    const dialog = document.createElement('div');
    dialog.className = 'earthquake-dialog';
    
    // 設置對話框內容
    dialog.innerHTML = `
        <div class="dialog-content">
            <div class="dialog-header">
                <h3>地震詳細資訊</h3>
                <button class="close-dialog-btn"><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="dialog-body">
                <div class="quake-info">
                    <p class="quake-time">${quake.time.toLocaleString('zh-TW')}</p>
                    <div class="quake-magnitude-large ${quake.magnitude >= 5 ? 'magnitude-high' : quake.magnitude >= 4 ? 'magnitude-medium' : 'magnitude-low'}">
                        ${quake.magnitude.toFixed(1)}
                    </div>
                    <p class="quake-location">${quake.location}</p>
                    <p class="quake-depth">深度: ${quake.depth} 公里</p>
                    <p class="quake-intensity">最大震度: ${quake.intensity} 級</p>
                </div>
                ${quake.reportContent ? `<p class="quake-report">${quake.reportContent}</p>` : ''}
                ${quake.shakemapImage ? `<div class="shakemap-container">
                    <img src="${quake.shakemapImage}" alt="震度分佈圖" class="shakemap-image">
                </div>` : ''}
                ${quake.webPage ? `<p class="quake-link"><a href="${quake.webPage}" target="_blank">查看氣象署詳細資料 <i class="bi bi-box-arrow-up-right"></i></a></p>` : ''}
            </div>
            <div class="dialog-footer">
                <button class="view-on-map-btn">在地圖上查看</button>
                <button class="close-btn">關閉</button>
            </div>
        </div>
    `;
    
    // 添加到頁面
    document.body.appendChild(dialog);
    
    // 添加關閉按鈕事件
    dialog.querySelector('.close-dialog-btn').addEventListener('click', () => {
        dialog.remove();
    });
    
    dialog.querySelector('.close-btn').addEventListener('click', () => {
        dialog.remove();
    });
    
    // 添加在地圖上查看按鈕事件
    dialog.querySelector('.view-on-map-btn').addEventListener('click', () => {
        dialog.remove();
        showPage('eew', quake.id);
    });
    
    // 計算各地震度（如果有測站數據）
    if (quake.stationData && quake.stationData.length > 0) {
        // 添加測站數據列表
        const stationsContainer = document.createElement('div');
        stationsContainer.className = 'stations-data';
        
        // 按震度排序（最高的在前）
        const sortedStations = [...quake.stationData].sort((a, b) => b.intensity - a.intensity);
        
        // 最多顯示前8個測站
        const displayStations = sortedStations.slice(0, 8);
        
        let stationsHtml = `<h4 class="stations-title"><i class="bi bi-broadcast-pin"></i> 測站觀測震度</h4><div class="stations-list">`;
        
        displayStations.forEach(station => {
            // 根據震度選擇顏色
            let colorClass = 'intensity-1';
            if (station.intensity >= 5) {
                colorClass = 'intensity-5';
            } else if (station.intensity >= 4) {
                colorClass = 'intensity-4';
            } else if (station.intensity >= 3) {
                colorClass = 'intensity-3';
            } else if (station.intensity >= 2) {
                colorClass = 'intensity-2';
            }
            
            stationsHtml += `
                <div class="station-item">
                    <div class="station-info">
                        <span class="station-name">${station.name}</span>
                        <span class="station-county">${station.county}</span>
                    </div>
                    <div class="station-intensity ${colorClass}">${station.intensity}</div>
                </div>
            `;
        });
        
        stationsHtml += `</div>`;
        
        // 如果有更多測站，顯示查看全部按鈕
        if (quake.stationData.length > 8) {
            stationsHtml += `<button class="view-all-stations">查看全部 ${quake.stationData.length} 個測站</button>`;
        }
        
        stationsContainer.innerHTML = stationsHtml;
        
        // 在震度圖之前插入測站數據
        const shakemapContainer = dialog.querySelector('.shakemap-container');
        if (shakemapContainer) {
            dialog.querySelector('.dialog-body').insertBefore(stationsContainer, shakemapContainer);
        } else {
            dialog.querySelector('.dialog-body').appendChild(stationsContainer);
        }
        
        // 添加查看全部測站按鈕事件
        const viewAllBtn = dialog.querySelector('.view-all-stations');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', () => {
                showAllStations(quake.stationData);
            });
        }
    } else {
        // 使用 GeoUtils 計算
        const intensityMap = GeoUtils.calculateIntensity(
            quake.coordinates.lat,
            quake.coordinates.lng,
            quake.magnitude,
            quake.depth
        );
        
        // 獲取用戶所在地震度
        let userIntensity = '-';
        if (userDistrict.county !== '未知' && intensityMap[userDistrict.county] && 
            intensityMap[userDistrict.county][userDistrict.district]) {
            userIntensity = intensityMap[userDistrict.county][userDistrict.district];
            
            // 在詳情視窗添加用戶位置震度信息
            const userIntensityInfo = document.createElement('p');
            userIntensityInfo.className = 'user-intensity';
            userIntensityInfo.innerHTML = `您所在地震度: <strong>${userIntensity}級</strong>`;
            dialog.querySelector('.quake-info').appendChild(userIntensityInfo);
        }
    }
}

// 顯示所有測站數據
function showAllStations(stations) {
    if (!stations || stations.length === 0) return;
    
    // 創建對話框
    const dialog = document.createElement('div');
    dialog.className = 'earthquake-dialog';
    
    // 按震度排序（最高的在前）
    const sortedStations = [...stations].sort((a, b) => b.intensity - a.intensity);
    
    // 生成測站列表HTML
    let stationsHtml = '';
    sortedStations.forEach(station => {
        // 根據震度選擇顏色
        let colorClass = 'intensity-1';
        if (station.intensity >= 5) {
            colorClass = 'intensity-5';
        } else if (station.intensity >= 4) {
            colorClass = 'intensity-4';
        } else if (station.intensity >= 3) {
            colorClass = 'intensity-3';
        } else if (station.intensity >= 2) {
            colorClass = 'intensity-2';
        }
        
        stationsHtml += `
            <div class="station-item">
                <div class="station-info">
                    <span class="station-name">${station.name}</span>
                    <span class="station-county">${station.county}</span>
                </div>
                <div class="station-intensity ${colorClass}">${station.intensity}</div>
            </div>
        `;
    });
    
    // 設置對話框內容
    dialog.innerHTML = `
        <div class="dialog-content">
            <div class="dialog-header">
                <h3>測站觀測震度</h3>
                <button class="close-dialog-btn"><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="dialog-body">
                <p class="stations-count">共 ${stations.length} 個測站</p>
                <div class="stations-list full-list">
                    ${stationsHtml}
                </div>
            </div>
            <div class="dialog-footer">
                <button class="view-on-map-btn">在地圖上查看</button>
                <button class="close-btn">關閉</button>
            </div>
        </div>
    `;
    
    // 添加到頁面
    document.body.appendChild(dialog);
    
    // 添加關閉按鈕事件
    dialog.querySelector('.close-dialog-btn').addEventListener('click', () => {
        dialog.remove();
    });
    
    dialog.querySelector('.close-btn').addEventListener('click', () => {
        dialog.remove();
    });
    
    // 添加在地圖上查看按鈕事件
    dialog.querySelector('.view-on-map-btn').addEventListener('click', () => {
        if (currentQuake) {
            dialog.remove();
            showPage('eew', currentQuake.id);
        }
    });
}

// 模擬地震預警
function simulateEarthquakeWarning() {
    if (eewActive) return; // 如果已有預警，不再觸發
    
    eewActive = true;
    
    // 模擬地震數據 - 花蓮外海
    const mockEEW = {
        magnitude: 5.8,
        depth: 12.3,
        location: '花蓮縣壽豐鄉外海',
        intensity: 5,
        coordinates: { lat: 23.9076, lng: 121.8731 },
        arrivalTime: new Date(Date.now() + 1000 * 25) // 25秒後到達
    };
    
    // 計算各地震度
    const intensityMap = GeoUtils.calculateIntensity(
        mockEEW.coordinates.lat,
        mockEEW.coordinates.lng,
        mockEEW.magnitude,
        mockEEW.depth
    );
    
    // 獲取受影響地區列表
    const affectedAreas = GeoUtils.getAffectedAreas(intensityMap, 3);
    
    // 計算用戶所在地震度
    let userIntensity = 0;
    if (userDistrict.county !== '未知' && intensityMap[userDistrict.county] && 
        intensityMap[userDistrict.county][userDistrict.district]) {
        userIntensity = intensityMap[userDistrict.county][userDistrict.district];
    }
    
    // 根據用戶所在地震度判斷狀態
    let status = 'safe';
    if (userIntensity >= 4) {
        status = 'danger';
    } else if (userIntensity >= 2) {
        status = 'warning';
    }
    
    // 更新首頁狀態
    updateHomeStatus(status, `警報 - 預計震度 ${userIntensity} 級`);
    
    // 更新預警頁面
    updateEEWPage(mockEEW, intensityMap, affectedAreas);
    
    // 顯示通知
    showEEWNotification(mockEEW, userIntensity);
    
    // 如果不在預警頁面，自動切換過去
    if (currentPage !== 'eew') {
        showPage('eew');
    }
    
    // 警報聲音（實際應用中可啟用）
    // playAlertSound();
    
    // 30秒後解除警報
    setTimeout(() => {
        eewActive = false;
        updateHomeStatus('safe', '安全 - 無地震警報');
        resetEEWPage();
    }, 30000);
}

// 更新首頁狀態
function updateHomeStatus(status, message) {
    const statusIcon = document.querySelector('.status-icon');
    const statusText = document.getElementById('current-status');
    
    // 移除所有狀態類
    statusIcon.classList.remove('safe', 'warning', 'danger');
    
    // 添加當前狀態類
    statusIcon.classList.add(status);
    
    // 更新圖標
    if (status === 'safe') {
        statusIcon.innerHTML = '<i class="bi bi-shield-check"></i>';
    } else if (status === 'warning') {
        statusIcon.innerHTML = '<i class="bi bi-exclamation-triangle"></i>';
    } else if (status === 'danger') {
        statusIcon.innerHTML = '<i class="bi bi-exclamation-circle"></i>';
    }
    
    // 更新文字
    statusText.textContent = message;
}

// 更新預警頁面
function updateEEWPage(eew, intensityMap, affectedAreas) {
    const indicator = document.getElementById('eew-status-indicator');
    const indicatorCircle = indicator.querySelector('.indicator-circle');
    
    // 移除所有狀態類
    indicatorCircle.classList.remove('safe', 'warning', 'danger');
    
    // 添加危險狀態
    indicatorCircle.classList.add('danger');
    
    // 更新指示器文字
    indicator.querySelector('p').textContent = '地震預警 - 強震即將到來';
    
    // 更新地震信息
    document.getElementById('expected-intensity').textContent = `${eew.intensity} 級`;
    
    // 計算倒計時時間
    const secondsToArrival = Math.floor((eew.arrivalTime - new Date()) / 1000);
    document.getElementById('arrival-time').textContent = `${secondsToArrival} 秒後`;
    
    // 更新每秒倒數
    const countdownInterval = setInterval(() => {
        const now = new Date();
        const remainingSeconds = Math.floor((eew.arrivalTime - now) / 1000);
        
        if (remainingSeconds <= 0) {
            document.getElementById('arrival-time').textContent = '現在';
            clearInterval(countdownInterval);
        } else {
            document.getElementById('arrival-time').textContent = `${remainingSeconds} 秒後`;
        }
    }, 1000);
    
    document.getElementById('epicenter-location').textContent = eew.location;
    document.getElementById('earthquake-magnitude').textContent = eew.magnitude.toFixed(1);
    
    // 在地圖上顯示地震
    showEarthquakeOnMap(eew);
    
    // 更新受影響地區列表
    updateAffectedAreasList(affectedAreas);
}

// 更新受影響地區列表
function updateAffectedAreasList(affectedAreas) {
    const listContainer = document.getElementById('affected-areas-list');
    
    // 清空原有內容
    listContainer.innerHTML = '';
    
    // 如果沒有資料，顯示空狀態
    if (!affectedAreas || affectedAreas.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-geo"></i>
                <p>目前無受影響地區資料</p>
            </div>
        `;
        return;
    }
    
    // 最多顯示前10個最高震度的地區
    const displayAreas = affectedAreas.slice(0, 10);
    
    // 生成列表項目
    displayAreas.forEach(area => {
        const areaItem = document.createElement('div');
        areaItem.className = 'area-item';
        
        // 確定震度級別樣式
        const intensityClass = `intensity-${Math.min(Math.round(area.intensity), 7)}`;
        
        areaItem.innerHTML = `
            <div class="area-info">
                <div class="area-location">${area.county}${area.district}</div>
                <div class="area-detail">預計震度</div>
            </div>
            <div class="area-intensity ${intensityClass}">${area.intensity.toFixed(1)}</div>
        `;
        
        listContainer.appendChild(areaItem);
    });
}

// 重置預警頁面
function resetEEWPage() {
    const indicator = document.getElementById('eew-status-indicator');
    const indicatorCircle = indicator.querySelector('.indicator-circle');
    
    // 移除所有狀態類
    indicatorCircle.classList.remove('safe', 'warning', 'danger');
    
    // 添加安全狀態
    indicatorCircle.classList.add('safe');
    
    // 更新指示器文字
    indicator.querySelector('p').textContent = '目前無地震預警';
    
    // 重置地震信息
    document.getElementById('expected-intensity').textContent = '-';
    document.getElementById('arrival-time').textContent = '-';
    document.getElementById('epicenter-location').textContent = '-';
    document.getElementById('earthquake-magnitude').textContent = '-';
    
    // 重置地圖
    resetMap();
    
    // 重置受影響地區列表
    const listContainer = document.getElementById('affected-areas-list');
    listContainer.innerHTML = `
        <div class="empty-state">
            <i class="bi bi-geo"></i>
            <p>目前無受影響地區資料</p>
        </div>
    `;
}

// 重置地圖
function resetMap() {
    if (!map) return;
    
    try {
        // 清除地震標記
        clearEarthquakeMarkers();
        
        // 重置地圖視圖到用戶位置
        if (userLocation) {
            map.flyTo([userLocation.lat, userLocation.lng], 8, {
                duration: 1.5
            });
        } else {
            map.flyTo([23.8, 121.0], 7, { // 台灣中心位置
                duration: 1.5
            });
        }
        
        console.log('地圖已重置');
    } catch (error) {
        console.error('重置地圖時出錯:', error);
    }
}

// 切換地圖類型
function changeMapStyle(styleType) {
    if (!map) {
        console.error('無法切換地圖樣式：地圖未初始化');
        return;
    }
    
    try {
        // 移除現有的圖層
        map.eachLayer(layer => {
            if (layer instanceof L.TileLayer) {
                map.removeLayer(layer);
            }
        });
        
        let tileLayer;
        
        // 根據選擇的類型設置不同的底圖
        switch (styleType) {
            case 'satellite':
                // 衛星圖
                tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                });
                break;
            case 'terrain':
                // 地形圖
                tileLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
                });
                break;
            case 'simple':
                // 簡易圖
                tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                });
                break;
            default:
                // 標準地圖
                tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                });
        }
        
        // 添加圖層到地圖
        tileLayer.addTo(map);
        
        // 保存設置
        localStorage.setItem('mapType', styleType);
        
        // 重新添加用戶位置標記
        if (userMarker) {
            addUserLocationMarker();
        }
        
        // 如果有地震標記，重新添加
        if (eewActive && earthquakeMarker) {
            // 此處可以添加重新顯示地震標記的邏輯
        }
        
        console.log('地圖樣式已切換為:', styleType);
    } catch (error) {
        console.error('切換地圖樣式時出錯:', error);
    }
}

// 添加用戶位置標記
function addUserLocationMarker() {
    if (!map) {
        console.error('無法添加用戶位置標記：地圖未初始化');
        return;
    }
    
    try {
        // 移除現有標記
        if (userMarker) {
            map.removeLayer(userMarker);
        }
        
        // 創建自定義圖標
        const userIcon = L.divIcon({
            className: 'user-marker',
            html: '<div style="background-color:#2196F3;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(33,150,243,0.7);"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });
        
        // 添加標記
        userMarker = L.marker([userLocation.lat, userLocation.lng], {
            icon: userIcon,
            title: '您的位置'
        }).addTo(map);
        
        // 添加彈出窗口
        userMarker.bindPopup(`<div style="text-align:center;font-weight:500;">您的位置<br>${userDistrict.county}${userDistrict.district}</div>`);
        
        // 將視圖移動到用戶位置
        map.flyTo([userLocation.lat, userLocation.lng], 8, {
            duration: 1.5
        });
        
        console.log('用戶位置標記已添加');
    } catch (error) {
        console.error('添加用戶位置標記時出錯:', error);
    }
}

// 在地圖上顯示地震位置和影響範圍
function showEarthquakeOnMap(earthquake) {
    if (!map) {
        console.error('無法顯示地震：地圖未初始化');
        return;
    }
    
    try {
        // 清除現有標記
        clearEarthquakeMarkers();
        
        // 創建自定義地震圖標
        const earthquakeIcon = L.divIcon({
            className: 'earthquake-marker',
            html: '<div style="background-color:#F44336;width:30px;height:30px;border-radius:50%;border:3px solid white;box-shadow:0 0 15px rgba(244,67,54,0.7);"></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        
        // 添加地震標記
        earthquakeMarker = L.marker([earthquake.coordinates.lat, earthquake.coordinates.lng], {
            icon: earthquakeIcon,
            title: '地震震央'
        }).addTo(map);
        
        // 添加彈出窗口
        earthquakeMarker.bindPopup(`<div style="text-align:center;font-weight:500;">震央位置<br>${earthquake.location}<br>規模 ${earthquake.magnitude}</div>`).openPopup();
        
        // 計算影響半徑（公里）
        const radius = earthquake.magnitude * 30000; // 簡單公式：規模*30公里，轉換為米
        
        // 添加影響範圍圓圈
        earthquakeCircle = L.circle([earthquake.coordinates.lat, earthquake.coordinates.lng], {
            radius: radius,
            color: '#F44336',
            fillColor: '#F44336',
            fillOpacity: 0.1,
            weight: 1
        }).addTo(map);
        
        // 添加測站標記（如果有）
        if (earthquake.stationData && earthquake.stationData.length > 0) {
            addStationMarkers(earthquake.stationData);
        }
        
        // 移動地圖視圖到震央位置
        map.flyTo([earthquake.coordinates.lat, earthquake.coordinates.lng], 7, {
            duration: 1.5
        });
        
        console.log('地震已顯示在地圖上');
    } catch (error) {
        console.error('在地圖上顯示地震時出錯:', error);
    }
}

// 添加測站標記到地圖
function addStationMarkers(stations) {
    if (!map) return;
    
    // 清除可能的現有測站標記
    if (window.stationMarkers) {
        window.stationMarkers.forEach(marker => map.removeLayer(marker));
    }
    
    window.stationMarkers = [];
    
    // 添加各測站標記
    stations.forEach(station => {
        // 根據震度選擇顏色
        let color = '#4CAF50'; // 1級 - 綠色
        if (station.intensity >= 5) {
            color = '#F44336'; // 5-7級 - 紅色
        } else if (station.intensity >= 4) {
            color = '#FF9800'; // 4級 - 橙色
        } else if (station.intensity >= 3) {
            color = '#FFC107'; // 3級 - 黃色
        } else if (station.intensity >= 2) {
            color = '#8BC34A'; // 2級 - 淺綠色
        }
        
        // 創建測站圖標
        const stationIcon = L.divIcon({
            className: 'station-marker',
            html: `<div style="background-color:white;width:22px;height:22px;border-radius:50%;border:3px solid ${color};display:flex;justify-content:center;align-items:center;font-weight:bold;font-size:12px;color:${color};">${station.intensity}</div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11]
        });
        
        // 添加標記
        const marker = L.marker([station.lat, station.lng], {
            icon: stationIcon,
            title: station.name
        }).addTo(map);
        
        // 添加彈出窗口
        marker.bindPopup(`<div style="text-align:center;font-weight:500;">${station.name}測站<br>${station.county}<br>震度: ${station.intensity}級</div>`);
        
        // 保存標記引用以便後續移除
        window.stationMarkers.push(marker);
    });
    
    console.log(`已添加 ${stations.length} 個測站標記`);
}

// 清除地震標記
function clearEarthquakeMarkers() {
    if (!map) return;
    
    try {
        // 移除地震標記
        if (earthquakeMarker) {
            map.removeLayer(earthquakeMarker);
            earthquakeMarker = null;
        }
        
        // 移除影響範圍圓圈
        if (earthquakeCircle) {
            map.removeLayer(earthquakeCircle);
            earthquakeCircle = null;
        }
        
        // 移除測站標記
        if (window.stationMarkers) {
            window.stationMarkers.forEach(marker => map.removeLayer(marker));
            window.stationMarkers = [];
        }
        
        console.log('地震標記已清除');
    } catch (error) {
        console.error('清除地震標記時出錯:', error);
    }
}

// 顯示地震預警通知
function showEEWNotification(eew, userIntensity) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('地震預警 - 強震即將到來', {
            body: `位置: ${eew.location}\n規模: ${eew.magnitude}\n您所在地預計震度: ${userIntensity}級\n請迅速採取防護措施!`,
            icon: '/images/warning-icon.png'
        });
        
        // 點擊通知時顯示應用
        notification.onclick = function() {
            window.focus();
            showPage('eew');
        };
    }
}

// 播放警報聲音 (未實際啟用)
function playAlertSound() {
    const audio = new Audio('sounds/alert.mp3');
    audio.play();
}

// 定時更新顯示
function updateDisplay() {
    // 更新時間
    updateTime();
    
    // 更新連接狀態
    updateConnectionStatus();
    
    // 如果有活動的EEW，更新倒計時
    if (eewActive) {
        // 已在updateEEWPage中處理
    }
}

// 初始化地圖
function initMap() {
    console.log('開始初始化地圖');
    
    // 檢查地圖容器是否存在
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) {
        console.error('找不到地圖容器元素');
        return;
    }
    
    // 如果地圖已存在，先銷毀
    if (map) {
        map.remove();
        map = null;
    }
    
    try {
        // 創建地圖
        map = L.map('map-container', {
            center: [23.8, 121.0], // 台灣中心位置
            zoom: 7,
            minZoom: 5,
            maxZoom: 18,
            zoomControl: true
        });
        
        // 從localStorage讀取地圖樣式設置
        const savedMapType = localStorage.getItem('mapType') || 'terrain';
        
        // 設置地圖樣式
        changeMapStyle(savedMapType);
        
        // 更新設置頁面的地圖類型選擇
        if (document.getElementById('map-type')) {
            document.getElementById('map-type').value = savedMapType;
        }
        
        // 添加比例尺
        L.control.scale({
            imperial: false,
            metric: true,
            position: 'bottomleft'
        }).addTo(map);
        
        // 添加用戶位置標記
        setTimeout(addUserLocationMarker, 800);
        
        console.log('地圖初始化完成');
    } catch (error) {
        console.error('初始化地圖時出錯:', error);
    }
}

// 頁面載入時初始化地圖
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM已載入，準備初始化地圖...");
    
    // 如果當前在地震預警頁面，初始化地圖
    if (document.getElementById('map')) {
        // 預加載離線地圖和資源
        caches.open('earthquake-map-cache').then(cache => {
            const urls = [
                'https://api.maptiler.com/maps/streets-v2/style.json?key=KY4jIP2UPcnz3OmiaAvX',
                'https://api.maptiler.com/maps/hybrid/style.json?key=KY4jIP2UPcnz3OmiaAvX',
                'https://api.maptiler.com/maps/topo-v2/style.json?key=KY4jIP2UPcnz3OmiaAvX',
                'https://api.maptiler.com/maps/basic-v2/style.json?key=KY4jIP2UPcnz3OmiaAvX'
            ];
            return Promise.all(urls.map(url => cache.add(url).catch(error => console.warn('無法緩存資源:', url, error))));
        }).catch(error => console.warn('緩存過程中出錯:', error));
        
        // 延遲一點時間初始化地圖，確保DOM完全加載
        setTimeout(initializeMap, 300);
    }
});

// 當用戶切換到地震預警頁面時，確保地圖初始化
document.querySelectorAll('.main-option').forEach(option => {
    option.addEventListener('click', function() {
        const targetPage = this.getAttribute('data-page');
        
        if (targetPage === 'earthquake-warning') {
            console.log("切換到地震預警頁面，確保地圖初始化");
            
            // 給DOM一些時間更新，然後再初始化地圖
            setTimeout(() => {
                if (document.getElementById('map')) {
                    if (!map) {
                        initializeMap();
                    } else {
                        // 如果地圖已存在，刷新它
                        map.resize();
                    }
                }
            }, 500);
        }
    });
});

/**
 * 循環切換地圖類型
 */
function cycleMapTypes() {
    const mapTypes = ['standard', 'satellite', 'terrain'];
    const currentIndex = mapTypes.indexOf(currentMapType);
    const nextIndex = (currentIndex + 1) % mapTypes.length;
    const newMapType = mapTypes[nextIndex];
    
    changeMapStyle(newMapType);
    
    // 顯示提示訊息
    const typeName = getMapTypeName(newMapType);
    showToast(`已切換至${typeName}地圖`, 2000);
}

/**
 * 獲取地圖類型的顯示名稱
 * @param {string} mapType - 地圖類型代碼
 * @return {string} 地圖類型名稱
 */
function getMapTypeName(mapType) {
    switch(mapType) {
        case 'standard': return '標準';
        case 'satellite': return '衛星';
        case 'terrain': return '地形';
        default: return '標準';
    }
}

/**
 * 顯示暫時性提示訊息
 * @param {string} message - 要顯示的訊息
 * @param {number} duration - 顯示時間(毫秒)
 */
function showToast(message, duration = 2000) {
    let toast = document.querySelector('.toast-message');
    
    // 如果不存在toast元素，則創建一個
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast-message';
        document.body.appendChild(toast);
    }
    
    // 清除任何現有的計時器
    if (toast.timeoutId) {
        clearTimeout(toast.timeoutId);
    }
    
    // 設置訊息內容
    toast.textContent = message;
    
    // 設置顯示動畫
    requestAnimationFrame(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
        
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        });
    });
    
    // 設置消失計時器
    toast.timeoutId = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
        
        // 移除元素
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// 初始化地圖類型切換按鈕
document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('toggle-map-type');
    if (toggleButton) {
        toggleButton.addEventListener('click', cycleMapTypes);
    }
});

// 加載氣象觀測資料
async function loadWeatherData() {
    try {
        console.log('正在載入氣象觀測資料...');
        const apiUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0001-001?Authorization=${CWA_API_KEY}`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`氣象資料獲取失敗: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success === 'true' && data.records && data.records.Station) {
            console.log('成功獲取氣象觀測資料，站點數量:', data.records.Station.length);
            
            // 儲存觀測資料到全局變數
            window.weatherData = data.records.Station;
            
            // 處理用戶位置附近的天氣資料
            if (userLocation) {
                updateNearbyWeather(userLocation);
            }
            
            // 使用氣象站資料更新地圖
            updateWeatherStations(data.records.Station);
        } else {
            console.error('獲取氣象資料格式不正確:', data);
        }
    } catch (error) {
        console.error('載入氣象資料時出錯:', error);
    }
}

// 更新附近的天氣資料
function updateNearbyWeather(location) {
    if (!window.weatherData || !location) return;
    
    const stations = window.weatherData;
    let nearestStation = null;
    let minDistance = Infinity;
    
    // 尋找最近的氣象站
    for (const station of stations) {
        const coordinates = station.GeoInfo.Coordinates.find(c => c.CoordinateName === 'WGS84');
        if (!coordinates) continue;
        
        const distance = getDistance(
            location.lat, 
            location.lng,
            coordinates.StationLatitude,
            coordinates.StationLongitude
        );
        
        if (distance < minDistance) {
            minDistance = distance;
            nearestStation = station;
        }
    }
    
    if (nearestStation) {
        console.log('最近的氣象站:', nearestStation.StationName, '距離約', (minDistance/1000).toFixed(1), 'km');
        
        // 更新天氣資訊到UI
        updateWeatherUI(nearestStation);
    }
}

// 計算兩點之間的距離（哈弗辛公式）
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // 地球半徑，單位：公尺
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
}

// 更新天氣UI
function updateWeatherUI(stationData) {
    // 檢查是否在首頁，如果是則更新天氣卡片
    if (document.getElementById('home-page').classList.contains('active')) {
        // 如果不存在天氣卡片，則創建一個
        let weatherCard = document.querySelector('.weather-card');
        if (!weatherCard) {
            // 創建天氣卡片
            createWeatherCard();
            weatherCard = document.querySelector('.weather-card');
        }
        
        if (weatherCard) {
            // 更新天氣卡片內容
            const weatherIcon = getWeatherIcon(stationData.WeatherElement.Weather);
            const temperature = stationData.WeatherElement.AirTemperature;
            const humidity = stationData.WeatherElement.RelativeHumidity;
            const weather = stationData.WeatherElement.Weather;
            const stationName = stationData.StationName;
            const countyName = stationData.GeoInfo.CountyName;
            const townName = stationData.GeoInfo.TownName;
            
            weatherCard.querySelector('.weather-location').textContent = `${countyName}${townName} (${stationName})`;
            weatherCard.querySelector('.weather-icon i').className = `bi ${weatherIcon}`;
            weatherCard.querySelector('.weather-temp').textContent = `${temperature}°C`;
            weatherCard.querySelector('.weather-desc').textContent = weather;
            weatherCard.querySelector('.humidity-value').textContent = `${humidity}%`;
        }
    }
}

// 創建天氣卡片
function createWeatherCard() {
    // 創建天氣卡片元素
    const weatherCard = document.createElement('div');
    weatherCard.className = 'info-card weather-card';
    
    // 設置卡片內容
    weatherCard.innerHTML = `
        <div class="info-card-header">
            <i class="bi bi-cloud-fill"></i>
            <h3>目前天氣</h3>
        </div>
        <div class="info-card-content">
            <div class="weather-content">
                <div class="weather-main">
                    <div class="weather-icon">
                        <i class="bi bi-cloud"></i>
                    </div>
                    <div class="weather-info">
                        <div class="weather-temp">-°C</div>
                        <div class="weather-desc">載入中...</div>
                    </div>
                </div>
                <div class="weather-details">
                    <div class="weather-location">--</div>
                    <div class="weather-humidity">
                        <i class="bi bi-droplet-fill"></i>
                        <span class="humidity-value">--%</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 插入到資訊卡片區域
    const infoCards = document.querySelector('.info-cards');
    if (infoCards) {
        infoCards.appendChild(weatherCard);
    }
}

// 根據天氣描述獲取對應的圖標
function getWeatherIcon(weatherDesc) {
    if (!weatherDesc) return 'bi-question-circle';
    
    if (weatherDesc.includes('雨')) {
        if (weatherDesc.includes('雷')) {
            return 'bi-cloud-lightning-rain';
        }
        return 'bi-cloud-rain';
    } else if (weatherDesc.includes('晴')) {
        if (weatherDesc.includes('雲') || weatherDesc.includes('多雲')) {
            return 'bi-cloud-sun';
        }
        return 'bi-sun';
    } else if (weatherDesc.includes('雲')) {
        return 'bi-cloud';
    } else if (weatherDesc.includes('霧')) {
        return 'bi-cloud-fog';
    } else if (weatherDesc.includes('雪')) {
        return 'bi-snow';
    }
    
    return 'bi-cloud';
}

// 在地圖上顯示氣象站
function updateWeatherStations(stations) {
    if (!map) return;
    
    try {
        // 移除之前的氣象站標記
        if (window.weatherMarkers) {
            window.weatherMarkers.forEach(marker => marker.remove());
        }
        
        window.weatherMarkers = [];
        
        // 添加新的氣象站標記
        for (const station of stations) {
            const coordinates = station.GeoInfo.Coordinates.find(c => c.CoordinateName === 'WGS84');
            if (!coordinates) continue;
            
            // 創建氣象站標記
            const weatherIcon = L.divIcon({
                className: 'weather-station-marker',
                html: `<div class="weather-icon-container" title="${station.StationName}">
                          <i class="bi ${getWeatherIcon(station.WeatherElement.Weather)}"></i>
                       </div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
            
            const marker = L.marker([coordinates.StationLatitude, coordinates.StationLongitude], {
                icon: weatherIcon,
                title: station.StationName
            });
            
            // 添加彈出窗口
            marker.bindPopup(createWeatherPopup(station));
            
            // 添加到地圖並儲存到標記數組
            marker.addTo(map);
            window.weatherMarkers.push(marker);
        }
        
        console.log('已更新氣象站標記，共', window.weatherMarkers.length, '個站點');
    } catch (error) {
        console.error('更新氣象站標記時出錯:', error);
    }
}

// 創建氣象站彈出窗口內容
function createWeatherPopup(station) {
    const weather = station.WeatherElement;
    const location = `${station.GeoInfo.CountyName}${station.GeoInfo.TownName}`;
    
    return `
    <div class="weather-popup">
        <h3>${station.StationName}</h3>
        <p class="popup-location">${location}</p>
        <div class="popup-weather">
            <div class="popup-temp">${weather.AirTemperature}°C</div>
            <div class="popup-desc">${weather.Weather}</div>
        </div>
        <div class="popup-details">
            <div class="popup-detail"><i class="bi bi-droplet-fill"></i> 濕度: ${weather.RelativeHumidity}%</div>
            <div class="popup-detail"><i class="bi bi-wind"></i> 風速: ${weather.WindSpeed} m/s</div>
            <div class="popup-detail"><i class="bi bi-arrow-up-right"></i> 風向: ${getWindDirection(weather.WindDirection)}</div>
            <div class="popup-detail"><i class="bi bi-water"></i> 降雨: ${weather.Now.Precipitation} mm</div>
        </div>
        <div class="popup-time">觀測時間: ${formatObsTime(station.ObsTime.DateTime)}</div>
    </div>
    `;
}

// 根據角度獲取風向描述
function getWindDirection(angle) {
    if (angle < 0) return '無風';
    
    const directions = ['北', '東北', '東', '東南', '南', '西南', '西', '西北', '北'];
    const index = Math.round(angle / 45) % 8;
    return directions[index];
}

// 格式化觀測時間
function formatObsTime(dateTimeStr) {
    try {
        const date = new Date(dateTimeStr);
        return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    } catch (e) {
        return dateTimeStr;
    }
}

// 更新用戶位置時，同時更新附近的天氣
function updateUserLocationDisplay(location, address) {
    const userLocationElement = document.getElementById('user-location');
    if (userLocationElement) {
        userLocationElement.textContent = address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
        
        // 更新附近的天氣資料
        if (window.weatherData) {
            updateNearbyWeather(location);
        }
    }
} 