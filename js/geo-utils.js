// 地理位置工具類

// 儲存區域資料
let regionData = null;

// 載入區域資料 - 直接使用內建數據，不再嘗試從外部加載
async function loadRegionData() {
    try {
        // 不再嘗試從外部文件加載
        console.log('正在初始化內建區域資料');
        initDefaultRegionData();
        return regionData;
    } catch (error) {
        console.error('初始化區域資料失敗:', error);
        return null;
    }
}

// 初始化默認區域數據（當無法從外部加載時）
function initDefaultRegionData() {
    console.log('使用內建預設區域數據');
    
    // 簡化版區域數據，僅包含主要縣市的部分行政區
    regionData = {
        "臺北市": {
            "信義區": {"lat": 25.0331574, "lon": 121.5668777},
            "大安區": {"lat": 25.02642, "lon": 121.534511},
            "中正區": {"lat": 25.0443212, "lon": 121.5247613},
            "萬華區": {"lat": 25.034839, "lon": 121.4997957},
            "內湖區": {"lat": 25.06929, "lon": 121.588949},
            "士林區": {"lat": 25.0927548, "lon": 121.519565}
        },
        "新北市": {
            "板橋區": {"lat": 25.0096156, "lon": 121.4592358},
            "新莊區": {"lat": 25.035976, "lon": 121.450478},
            "中和區": {"lat": 24.9985208, "lon": 121.5007413},
            "三峽區": {"lat": 24.9341863, "lon": 121.369083},
            "淡水區": {"lat": 25.1696463, "lon": 121.4409722}
        },
        "桃園市": {
            "桃園區": {"lat": 24.993919, "lon": 121.3016657},
            "中壢區": {"lat": 24.9656124, "lon": 121.2249927},
            "龜山區": {"lat": 24.9925139, "lon": 121.337824}
        },
        "臺中市": {
            "西屯區": {"lat": 24.1658213, "lon": 120.6336717},
            "北屯區": {"lat": 24.1826848, "lon": 120.686403},
            "南屯區": {"lat": 24.1345298, "lon": 120.6442903}
        },
        "臺南市": {
            "東區": {"lat": 22.9802421, "lon": 120.224004},
            "安南區": {"lat": 23.0472321, "lon": 120.184714},
            "永康區": {"lat": 23.0260699, "lon": 120.2570647}
        },
        "高雄市": {
            "三民區": {"lat": 22.647684, "lon": 120.299851},
            "左營區": {"lat": 22.6899834, "lon": 120.2950135},
            "鳳山區": {"lat": 22.627075, "lon": 120.362525}
        },
        "宜蘭縣": {
            "宜蘭市": {"lat": 24.7520373, "lon": 121.7531493},
            "羅東鎮": {"lat": 24.6769245, "lon": 121.7669529}
        },
        "花蓮縣": {
            "花蓮市": {"lat": 23.9820651, "lon": 121.6067705},
            "玉里鎮": {"lat": 23.335527, "lon": 121.315197}
        },
        "臺東縣": {
            "臺東市": {"lat": 22.7548208, "lon": 121.1465131},
            "成功鎮": {"lat": 23.1050697, "lon": 121.3808747}
        }
    };
    
    // 使外部可以訪問
    window.regionData = regionData;
}

// 根據經緯度獲取最近的行政區
function getNearestLocation(lat, lng) {
    if (!regionData) {
        console.error('區域資料尚未載入');
        return { county: '未知', district: '未知' };
    }

    let minDistance = Infinity;
    let nearestLocation = { county: '未知', district: '未知' };

    // 遍歷所有縣市和行政區
    Object.entries(regionData).forEach(([county, districts]) => {
        Object.entries(districts).forEach(([district, info]) => {
            if (info.lat && info.lon) {
                const distance = calculateDistance(lat, lng, info.lat, info.lon);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestLocation = { county, district };
                }
            }
        });
    });

    return nearestLocation;
}

// 計算兩點之間的距離 (使用哈弗賽因公式)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 地球半徑，單位公里
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // 距離，單位公里
    return distance;
}

// 角度轉弧度
function deg2rad(deg) {
    return deg * (Math.PI/180);
}

// 根據行政區獲取經緯度
function getCoordinatesByDistrict(county, district) {
    if (!regionData || !regionData[county] || !regionData[county][district]) {
        console.error('找不到指定的行政區資料');
        return null;
    }

    return {
        lat: regionData[county][district].lat,
        lng: regionData[county][district].lon
    };
}

// 獲取行政區震度站係數
function getSiteFactorByDistrict(county, district) {
    if (!regionData || !regionData[county] || !regionData[county][district]) {
        console.error('找不到指定的行政區資料');
        return 1.0; // 默認係數
    }

    return regionData[county][district].site || 1.0;
}

// 根據震央位置和規模計算各地預估震度
function calculateIntensity(epicenterLat, epicenterLon, magnitude, depth) {
    if (!regionData) {
        console.error('區域資料尚未載入');
        return {};
    }

    const intensityMap = {};

    // 遍歷所有縣市和行政區
    Object.entries(regionData).forEach(([county, districts]) => {
        intensityMap[county] = {};
        
        Object.entries(districts).forEach(([district, info]) => {
            if (info.lat && info.lon) {
                // 計算與震央的距離
                const distance = calculateDistance(epicenterLat, epicenterLon, info.lat, info.lon);
                
                // 使用簡化的震度衰減公式 (僅供示範)
                // 實際應用中應使用更複雜的模型
                let intensity = calculateIntensityByDistance(magnitude, distance, depth, info.site || 1.0);
                
                // 保存震度
                intensityMap[county][district] = Math.round(intensity * 10) / 10;
            }
        });
    });

    return intensityMap;
}

// 根據距離計算震度 (簡化版)
function calculateIntensityByDistance(magnitude, distance, depth, siteFactor) {
    // 簡化的震度估算公式 (僅供示範)
    // 實際應用需使用更精確的模型
    const baseIntensity = magnitude - 2 * Math.log10(Math.max(distance, 5)) - 0.0045 * depth;
    return Math.max(0, baseIntensity * siteFactor);
}

// 獲取可能受到震度超過指定閾值的地區列表
function getAffectedAreas(intensityMap, threshold = 3) {
    const affectedAreas = [];

    Object.entries(intensityMap).forEach(([county, districts]) => {
        Object.entries(districts).forEach(([district, intensity]) => {
            if (intensity >= threshold) {
                affectedAreas.push({
                    county,
                    district,
                    intensity
                });
            }
        });
    });

    // 按震度降序排序
    return affectedAreas.sort((a, b) => b.intensity - a.intensity);
}

// 導出模組
window.GeoUtils = {
    loadRegionData,
    getNearestLocation,
    calculateDistance,
    getCoordinatesByDistrict,
    getSiteFactorByDistrict,
    calculateIntensity,
    getAffectedAreas
}; 