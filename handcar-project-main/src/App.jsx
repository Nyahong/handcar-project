import React, { useState, useEffect } from 'react';
import {
  Camera,
  MapPin,
  Wrench,
  History,
  Home,
  Settings,
  ChevronLeft,
  Search,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  X,
  Navigation,
  ExternalLink,
  ChevronRight,
  Info,
  Lightbulb
} from 'lucide-react';

const AI_PROXY_URL = import.meta.env.VITE_AI_PROXY_URL;
const CUSTOM_VISION_URL = import.meta.env.VITE_CUSTOM_VISION_URL;
const CUSTOM_VISION_PREDICTION_KEY = import.meta.env.VITE_CUSTOM_VISION_PREDICTION_KEY;
const BACKEND_API_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const STATUS_LABELS = {
  CRITICAL: "긴급 점검",
  WARNING: "확인 요망",
  NORMAL: "상태 양호"
};

const TAG_DICTIONARY = {
  "key_bat": "스마트키 배터리 부족 경고등",
  "light": "라이트 결함 경고등",
  "oil": "연료 부족 경고등",
  "sb": "안전벨트 미착용 경고등",
  "tire": "타이어 압력 경고등",
  "washer": "워셔액 부족 경고등"
};

const TAG_DETAILS = {
  "key_bat": {
    meaning: "스마트키 내부의 배터리 잔량이 부족하다는 뜻입니다.",
    reason: "보통 스마트키 배터리(CR2032 등) 수명이 다 되어 발생합니다.",
    action: "가까운 편의점이나 마트에서 동전형 배터리를 구매해 직접 교체하시거나, 서비스 센터를 방문해 주세요."
  },
  "light": {
    meaning: "차량 외부 램프(전조등, 후미등, 브레이크등 등) 중 하나 이상에 문제가 생겼다는 뜻입니다.",
    reason: "전구가 수명을 다해 끊어졌거나, 퓨즈 혹은 배선에 문제가 생겼을 수 있습니다.",
    action: "차에서 내려 어느 쪽 불빛이 안 들어오는지 확인하고, 전구를 교체하거나 정비소를 방문해 점검받으세요."
  },
  "oil": {
    meaning: "연료 탱크에 남아있는 연료가 얼마 없다는 뜻입니다.",
    reason: "주행으로 인해 연료가 소모되어 보충이 필요한 시기가 되었습니다.",
    action: "차량이 멈추기 전에 가까운 주유소에 들러 연료를 충분히 주유해 주세요."
  },
  "sb": {
    meaning: "운전자 또는 동승자가 안전벨트를 매지 않았다는 뜻입니다.",
    reason: "안전벨트 체결 센서가 감지되지 않았거나, 시트 위에 무거운 물건이 올려져 있을 때 뜹니다.",
    action: "모든 탑승자가 안전벨트를 착용해 주세요. 물건이 놓여있다면 치워주세요."
  },
  "tire": {
    meaning: "타이어의 공기압이 권장 수치보다 낮아졌다는 뜻입니다.",
    reason: "자연적인 공기 누출, 온도 하강으로 인한 수축, 혹은 타이어에 못이 박혀 펑크가 났을 수 있습니다.",
    action: "주행 속도를 줄이고 가까운 정비소나 주유소에서 공기압을 보충하세요. 펑크가 의심되면 보험사를 부르세요."
  },
  "washer": {
    meaning: "앞유리를 닦을 때 쓰는 워셔액이 부족하다는 뜻입니다.",
    reason: "워셔액을 많이 사용하여 워셔액 탱크가 비워졌습니다.",
    action: "대형마트나 편의점에서 워셔액을 구매한 뒤, 보닛을 열고 파란색 뚜껑을 찾아 직접 보충해 주세요."
  }
};


function getSeverityFromRisk(riskLevel) {
  if (!riskLevel) return 'normal';
  if (riskLevel.includes('매우') || riskLevel.includes('높음')) return 'critical';
  if (riskLevel.includes('중간')) return 'warning';
  return 'normal';
}

function makeLocalFastApiResult(apiResult) {
  const firstWarning = apiResult?.detected_warnings?.[0];

  if (!firstWarning) {
    return {
      status: 'normal',
      title: '감지된 경고등 없음',
      msg: '현재 이미지에서 인식된 경고등이 없습니다. 더 선명한 계기판 사진으로 다시 시도해 주세요.',
      detectedWarnings: [],
      explanation: apiResult?.explanation || '',
      raw: apiResult,
    };
  }

  return {
    status: getSeverityFromRisk(firstWarning.risk_level),
    title: firstWarning.display_name || '경고등 감지',
    msg: firstWarning.summary || '계기판 경고등이 감지되었습니다.',
    detectedWarnings: apiResult?.detected_warnings || [],
    explanation: apiResult?.explanation || '',
    raw: apiResult,
  };
}

const MANUFACTURERS = [
  {
    name: '현대',
    logo: 'https://yt3.googleusercontent.com/AULzs1m3DYUrmRsBwSzfOw_NdkCKrw4LKyZG4bBnUlkL79Xz_nZtn3laOg7b3xbJDjgCbJJE2A=s900-c-k-c0x00ffffff-no-rj',
    models: ['아반떼', '쏘나타', '그랜저', '싼타페', '팰리세이드', '아이오닉 5'],
  },
  {
    name: '기아',
    logo: 'https://image-cdn.hypb.st/https%3A%2F%2Fkr.hypebeast.com%2Ffiles%2F2021%2F01%2Fkia-motors-new-logo-brand-slogan-officially-revealed-01.jpg?q=75&w=800&cbr=1&fit=max',
    models: ['K3', 'K5', 'K8', '쏘렌토', '카니발', 'EV6'],
  },
  {
    name: 'BMW',
    logo: 'https://static.vecteezy.com/system/resources/previews/020/502/870/non_2x/bmw-brand-logo-car-symbol-blue-and-white-design-germany-automobile-illustration-with-black-background-free-vector.jpg',
    models: ['3시리즈', '5시리즈', '7시리즈', 'X5', 'i4'],
  },
  {
    name: '벤츠',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ9Dm7XF8xuRw2s3NKh5VOLvb4I553Ujy0j_w&s',
    models: ['C-클래스', 'E-클래스', 'S-클래스', 'GLC', 'EQE'],
  },
  {
    name: '테슬라',
    logo: 'https://img.icons8.com/ios_filled/1200/tesla-logo.jpg',
    models: ['모델 3', '모델 Y', '모델 S', '모델 X'],
  },
  {
    name: '아우디',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRXgKUN4_0i99p88wIDnUzQWuH1hEFp64tW1g&s',
    models: ['A4', 'A6', 'Q5', 'e-tron'],
  },
  {
    name: '포드',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Ford_logo_flat.svg',
    models: ['익스플로러', '머스탱', '브롱코'],
  },
  {
    name: '포르쉐',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQj7uLiozKvofF33sSn4llNG5qYoSJ3Sr6uFQ&s',
    models: ['911', '타이칸', '카이엔', '파나메라'],
  },
  {
    name: '페라리',
    logo: 'https://i.namu.wiki/i/tzZ_j5Uy54Muem7VjRMguOw8G1-t69fdqOPuLKgshYyiG6FUqkC9DgS6N2U1GvQ7IsVVR1GizpiOcOmZ8-d0lQ.svg',
    models: ['296 GTB', '로마', '푸로산게'],
  },
  {
    name: '닛산',
    logo: 'https://i.namu.wiki/i/8t0fwkYNWK37g3p_rHI625_XHi_9IoqYqYBAFM0b449dx3VrNgWMVci1NJpjpO57O6qve2lYq63MQFH7mQZEBg.svg',
    models: ['알티마', '아리야', 'Z'],
  },
  {
    name: '혼다',
    logo: 'https://i.namu.wiki/i/NAObOBkqZA3buq-Z6i6jjgtDnjqHlPGZQIwX6P0-vlI_brAHh02yMuk0JZLY1Sbzyo7fcUrXdFGHnO5znSli3A.webp',
    models: ['어코드', 'CR-V', '시빅'],
  },
  {
    name: '미쓰비시',
    logo: 'https://i.namu.wiki/i/y3vBVyGWjjSt6vo02F_ObBYxmJF6bb03K7wgTaqilhOdk1F_IviYwdclHPkk4RTuzizLDXziNAcJdQ94qaO9ig.svg',
    models: ['아웃랜더', '파제로'],
  },
  {
    name: '애스턴 마틴',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR-j392AO1YIrvmHRK9i_f7_INqzg1rqQ5zqw&s',
    models: ['DB12', '뱅퀴시', '벤티지', 'DBX', '발할라', '발키리'],
  },
  {
    name: '벤틀리',
    logo: 'https://i.namu.wiki/i/HHeWZKoLbs0wFpESBF2y0rn7WGbFdQISenKhVeBNzG2TATyQ2yuX2-q7y19h7SzqUIObrpvyGfg7cRq8FKIn4g.webp',
    models: ['컨티네탈 GT', '플라잉 스퍼', '벤테이가'],
  },
  {
    name: '로터스',
    logo: 'https://cdn.imweb.me/upload/S2023032790b38549a0a48/680cc91135110.png',
    models: ['에미라', '엑시지', '에보라', '엘란', '에스프리'],
  },
  {
    name: '람보르기니',
    logo: 'https://mblogthumb-phinf.pstatic.net/20160615_257/myredsuns_1465980110067miHuv_JPEG/22222.jpg?type=w800',
    models: ['레부엘토', '테메라리오'],
  },
  {
    name: '폭스바겐',
    logo: 'https://i.namu.wiki/i/oin2760z3zfw4jJ7TasQDIk2tN4f5qC3PvY45UD7M3F4rGW9EwJNOvAGUxH6VoSyUovNgA2w-nMasLodElp6Jg.svg',
    models: ['골프', '파사트', '티구안'],
  },
  // 여기에 { name: '브랜드명', logo: '주소', models: ['차1', '차2'] } 형태로 추가하세요!
];

const SHOPS = [
  { id: 1, name: '핸즈종합정비소', type: 'general', lat: 35, lng: 40, addr: '서울시 강남구 테헤란로 123' },
  { id: 2, name: '에코그린 폐유처리소', type: 'oil', lat: 60, lng: 30, addr: '서울시 서초구 효령로 456' },
  { id: 3, name: '마스터 자동차 센터', type: 'general', lat: 45, lng: 70, addr: '서울시 송파구 올림픽로 789' },
  { id: 4, name: '클린 오일 뱅크', type: 'oil', lat: 20, lng: 60, addr: '서울시 강서구 화곡로 321' },
];

const DIY_ITEMS = [
  { id: 'washer', name: '워셔액 보충', pos: { top: '30%', left: '25%' }, desc: '보닛을 열고 파란색 뚜껑을 찾아 워셔액을 가득 채우세요.' },
  { id: 'filter', name: '에어컨 필터 교체', pos: { top: '50%', left: '70%' }, desc: '조수석 글로브 박스를 열고 안쪽 덮개를 제거해 필터를 교체하세요.' },
  { id: 'coolant', name: '냉각수 보충', pos: { top: '25%', left: '65%' }, desc: '엔진이 식은 후 냉각수 보조 탱크의 MAX 선까지 보충하세요.' },
  { id: 'headlight', name: '전조등 교체', pos: { top: '20%', left: '15%' }, desc: '엔진룸 안쪽 전조등 소켓을 돌려 빼고 새 전구로 교체하세요.' },
  { id: 'taillight', name: '후미등 교체', pos: { top: '85%', left: '15%' }, desc: '트렁크 안쪽 커버를 열고 소켓을 분리해 전구를 교체하세요.' },
  { id: 'brake_light', name: '브레이크등 교체', pos: { top: '82%', left: '30%' }, desc: '후미등 뭉치를 분리하여 브레이크 전용 전구를 교체하세요.' },
  { id: 'plate_light', name: '번호판등 교체', pos: { top: '88%', left: '50%' }, desc: '드라이버로 번호판 상단 커버를 열고 작은 전구를 교체하세요.' },
];

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('find');
  const [image, setImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  // 계기판 촬영 가이드 화면 표시 상태
  const [showPhotoGuide, setShowPhotoGuide] = useState(false);

  // "일주일 동안 보지 않기" 설정 상태
  // localStorage에 저장된 만료 시간이 현재 시간보다 크면 가이드를 생략합니다.
  const [hideGuideForWeek, setHideGuideForWeek] = useState(() => {
    const hideUntil = Number(localStorage.getItem('hidePhotoGuideUntil') || 0);
    return hideUntil > Date.now();
  });

  // DIY 가이드 상태
  const [diyStep, setDiyStep] = useState(1);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedDiy, setSelectedDiy] = useState(null);

  // 정비소 지도 상태
  const [hoveredShop, setHoveredShop] = useState(null);
  const [showMapModal, setShowMapModal] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [selectedAddress, setSelectedAddress] = useState('');
  const [showNearbyMapModal, setShowNearbyMapModal] = useState(false);

  // 기록 상태
  const [history, setHistory] = useState([
    { id: 1, date: '2023-10-25', text: '엔진 오일 경고등 점등', status: 'critical' },
    { id: 2, date: '2023-11-05', text: '워셔액 보충 완료', status: 'normal' }
  ]);
  const [newNote, setNewNote] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
        startAnalysis(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const startAnalysis = async (file) => {
    setAnalyzing(true);
    setResult(null);

    try {
      let resultData;
      const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
      const cloudApiUrl = AI_PROXY_URL || (!isLocalHost ? '/api/analyze' : null);

      if (cloudApiUrl) {
        const response = await fetch(cloudApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream"
          },
          body: file
        });

        if (!response.ok) {
          throw new Error(`AI 프록시 API 오류: ${response.status}`);
        }

        const apiResult = await response.json();

        if (apiResult.predictions && apiResult.predictions.length > 0) {
          const bestPrediction = apiResult.predictions.reduce((prev, current) =>
            prev.probability > current.probability ? prev : current
          );

          if (bestPrediction.probability > 0.3) {
            const translatedName = TAG_DICTIONARY[bestPrediction.tagName] || bestPrediction.tagName;
            const details = TAG_DETAILS[bestPrediction.tagName] || null;

            resultData = {
              status: 'critical',
              title: `${translatedName} (${(bestPrediction.probability * 100).toFixed(1)}%)`,
              msg: details || 'AI가 경고등을 감지했습니다. 관련 정비를 진행하거나 전문가 방문을 추천합니다.',
              raw: apiResult,
            };
          } else {
            resultData = {
              status: 'normal',
              title: '인식된 경고등 없음',
              msg: '명확한 경고등이 인식되지 않았습니다. 다른 사진으로 다시 시도해보세요.',
              raw: apiResult,
            };
          }
        } else {
          resultData = {
            status: 'warning',
            title: '인식 실패',
            msg: '이미지 분석에 실패했습니다.',
            raw: apiResult,
          };
        }
      } else if (CUSTOM_VISION_URL && CUSTOM_VISION_PREDICTION_KEY) {
        const response = await fetch(CUSTOM_VISION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'Prediction-Key': CUSTOM_VISION_PREDICTION_KEY,
          },
          body: file,
        });

        if (!response.ok) {
          throw new Error(`Custom Vision 오류: ${response.status}`);
        }

        const apiResult = await response.json();

        if (apiResult.predictions && apiResult.predictions.length > 0) {
          const bestPrediction = apiResult.predictions.reduce((prev, current) =>
            prev.probability > current.probability ? prev : current
          );

          if (bestPrediction.probability > 0.3) {
            const translatedName = TAG_DICTIONARY[bestPrediction.tagName] || bestPrediction.tagName;
            const details = TAG_DETAILS[bestPrediction.tagName] || null;

            resultData = {
              status: 'critical',
              title: `${translatedName} (${(bestPrediction.probability * 100).toFixed(1)}%)`,
              msg: details || 'AI가 경고등을 감지했습니다. 관련 정비를 진행하거나 전문가 방문을 추천합니다.',
              raw: apiResult,
            };
          } else {
            resultData = {
              status: 'normal',
              title: '인식된 경고등 없음',
              msg: '명확한 경고등이 인식되지 않았습니다. 다른 사진으로 다시 시도해보세요.',
              raw: apiResult,
            };
          }
        } else {
          resultData = {
            status: 'warning',
            title: '인식 실패',
            msg: '이미지 분석에 실패했습니다.',
            raw: apiResult,
          };
        }
      } else {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${BACKEND_API_URL}/analyze`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`로컬 FastAPI 오류: ${response.status}`);
        }

        const apiResult = await response.json();
        resultData = makeLocalFastApiResult(apiResult);
      }

      setResult(resultData);

      if (resultData.status !== 'normal') {
        const newRecord = {
          id: Date.now(),
          date: new Date().toLocaleDateString(),
          text: `${resultData.title}: ${typeof resultData.msg === 'string' ? resultData.msg : '상세 안내 확인 필요'}`,
          status: resultData.status,
        };

        setHistory(prev => [newRecord, ...prev]);
      }
    } catch (error) {
      console.error("AI Error:", error);
      setResult({
        status: 'warning',
        title: '분석 연결 실패',
        msg: `AI 분석 서버 연결에 실패했습니다. 로컬 테스트라면 FastAPI 서버가 켜져 있는지 확인해 주세요. (${error.message})`,
        detectedWarnings: [],
        explanation: '',
        raw: null,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getRecordStatus = (text) => {
    if (text.includes('엔진') || text.includes('브레이크') || text.includes('긴급')) return 'critical';
    if (text.includes('타이어') || text.includes('전압') || text.includes('주의')) return 'warning';
    return 'normal';
  };

  const addManualRecord = () => {
    if (!newNote.trim()) return;
    const status = getRecordStatus(newNote);
    const newRecord = { id: Date.now(), date: newDate, text: newNote, status };
    setHistory(prev => [newRecord, ...prev]);
    setNewNote('');
  };

  const deleteRecord = (id) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const getUserLocation = () => {
    setIsLocating(true);
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('이 브라우저에서는 위치 기능을 지원하지 않습니다.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setSelectedAddress('');
        setIsLocating(false);
      },
      () => {
        setLocationError('위치 권한을 허용해야 현재 위치를 가져올 수 있습니다.');
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const applyAddressToMap = () => {
    const trimmedAddress = addressInput.trim();

    if (!trimmedAddress) {
      setLocationError('주소나 동네 이름을 입력해 주세요.');
      return;
    }

    setSelectedAddress(trimmedAddress);
    setLocationError('');
  };

  const getMapEmbedUrl = () => {
    if (selectedAddress) {
      const query = encodeURIComponent(`${selectedAddress} 자동차 정비소`);
      return `https://maps.google.com/maps?q=${query}&z=14&output=embed&hl=ko`;
    }

    if (userLocation) {
      return `https://maps.google.com/maps?q=${userLocation.lat},${userLocation.lng}&z=15&output=embed&hl=ko`;
    }

    return `https://maps.google.com/maps?q=37.5665,126.9780&z=13&output=embed&hl=ko`;
  };

  const getNearbySearchText = () => {
    if (selectedAddress) {
      return `${selectedAddress} 자동차 정비소`;
    }

    if (userLocation) {
      return `${userLocation.lat},${userLocation.lng} 자동차 정비소`;
    }

    return '내 주변 자동차 정비소';
  };

  const openNearbyMap = (service) => {
    const query = encodeURIComponent(getNearbySearchText());

    const urlMap = {
      naver: `https://map.naver.com/v5/search/${query}`,
      kakao: `https://map.kakao.com/link/search/${query}`,
      google: `https://www.google.com/maps/search/?api=1&query=${query}`,
      apple: `https://maps.apple.com/?q=${query}`,
    };

    window.open(urlMap[service], '_blank');
  };

  const openExternalMap = (service) => {
    if (!showMapModal) return;

    const query = encodeURIComponent(`${showMapModal.name} ${showMapModal.addr}`);

    const urlMap = {
      naver: `https://map.naver.com/v5/search/${query}`,
      kakao: `https://map.kakao.com/link/search/${query}`,
      google: `https://www.google.com/maps/search/?api=1&query=${query}`,
      apple: `https://maps.apple.com/?q=${query}`,
    };

    window.open(urlMap[service], '_blank');
  };

  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-blue-600 flex items-center justify-center z-[1000] overflow-hidden">
        <div className="flex space-x-2">
          {"Hands Car".split("").map((char, i) => (
            <span
              key={i}
              className="text-white text-5xl font-black animate-bounce"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 max-w-md mx-auto shadow-2xl relative border-x border-slate-200">
      {/*
        계기판 촬영 가이드 오버레이
        - 메인 화면의 "사진 촬영 및 선택" 버튼을 눌렀을 때 showPhotoGuide가 true가 됩니다.
        - 사용자가 가이드에서 "사진 촬영 시작"을 누르면 기존 hidden input을 클릭해 파일 선택/촬영을 시작합니다.
      */}
      {showPhotoGuide && (
        <PhotoGuideScreen
          hideGuideForWeek={hideGuideForWeek}
          setHideGuideForWeek={setHideGuideForWeek}
          onClose={() => setShowPhotoGuide(false)}
          onStart={() => {
            setShowPhotoGuide(false);
            setTimeout(() => {
              document.getElementById('dashboard-photo-input')?.click();
            }, 100);
          }}
        />
      )}

      {/* 상단바 */}
      <header className="bg-white px-4 py-4 flex items-center justify-between border-b sticky top-0 z-40">
        <button onClick={() => { setImage(null); setResult(null); setActiveTab('find'); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <Home className="w-6 h-6 text-blue-600" />
        </button>
        <h1 className="text-xl font-black text-blue-600 tracking-tighter">HANDS CAR</h1>
        <button onClick={() => setShowLogin(true)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <Settings className="w-6 h-6 text-slate-400" />
        </button>
      </header>

      {/* 메인 컨텐츠 영역 */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'find' && (
          <div className="p-6 space-y-6">
            {!image ? (
              <div className="space-y-8 py-10 text-center">
                <div className="relative inline-block">
                  <div className="absolute -inset-4 bg-blue-100 rounded-full animate-pulse"></div>
                  <div className="relative bg-white p-8 rounded-full shadow-lg">
                    <Camera className="w-16 h-16 text-blue-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black">경고등을 찍어주세요</h2>
                  <p className="text-slate-500 font-medium">AI가 실시간으로 분석해드립니다</p>
                </div>
                <>
                  {/*
                    기존에는 이 영역이 label + input 구조라서 버튼을 누르면 바로 파일 선택창이 열렸습니다.
                    지금은 먼저 촬영 가이드 화면을 보여준 뒤, 가이드의 "사진 촬영 시작" 버튼에서
                    아래 hidden input을 클릭하도록 변경했습니다.
                  */}
                  <button
                    type="button"
                    onClick={() => {
                      if (hideGuideForWeek) {
                        document.getElementById('dashboard-photo-input')?.click();
                      } else {
                        setShowPhotoGuide(true);
                      }
                    }}
                    className="block w-full py-5 bg-blue-600 text-white rounded-3xl font-bold shadow-xl shadow-blue-200 cursor-pointer active:scale-95 transition-transform text-lg"
                  >
                    사진 촬영 및 선택
                  </button>

                  <input
                    id="dashboard-photo-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </>
              </div>
            ) : analyzing ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-6">
                <div className="w-20 h-20 border-8 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-xl font-bold text-blue-600 animate-pulse">AI가 정밀 분석 중입니다...</p>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-black aspect-video">
                  <img src={image} className="w-full h-full object-cover opacity-80" alt="uploaded" />
                  <div className="absolute inset-0 border-4 border-dashed border-blue-400 animate-pulse m-4 rounded-xl"></div>
                </div>

                <div className={`p-6 rounded-3xl border-2 ${result.status === 'critical' ? 'bg-red-50 border-red-200' : result.status === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    {result.status === 'critical' || result.status === 'warning' ? <AlertTriangle className="text-red-600" /> : <CheckCircle className="text-green-600" />}
                    <h3 className={`text-xl font-black ${result.status === 'critical' ? 'text-red-700' : result.status === 'warning' ? 'text-amber-700' : 'text-green-700'}`}>{result.title}</h3>
                  </div>
                  {typeof result.msg === 'string' ? (
                    <p className="font-medium text-slate-700 leading-relaxed">{result.msg}</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <div className="bg-white/60 p-4 rounded-2xl border border-blue-50/50 shadow-sm">
                        <h4 className="text-sm font-black text-blue-600 mb-1 flex items-center gap-1.5"><Info className="w-4 h-4" /> 이 경고등은 무슨 뜻인가요?</h4>
                        <p className="text-sm font-medium text-slate-700 leading-relaxed">{result.msg.meaning}</p>
                      </div>
                      <div className="bg-white/60 p-4 rounded-2xl border border-amber-50/50 shadow-sm">
                        <h4 className="text-sm font-black text-amber-600 mb-1 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> 왜 뜬 건가요?</h4>
                        <p className="text-sm font-medium text-slate-700 leading-relaxed">{result.msg.reason}</p>
                      </div>
                      <div className="bg-white/60 p-4 rounded-2xl border border-emerald-50/50 shadow-sm">
                        <div className="flex justify-between items-start mb-1.5">
                          <h4 className="text-sm font-black text-emerald-600 flex items-center gap-1.5">
                            <Wrench className="w-4 h-4" /> 어떻게 하면 될까요?
                          </h4>
                          <button
                            onClick={() => setActiveTab('diy')}
                            className="text-[11px] font-black bg-[#0EA5E9] text-white px-2.5 py-1 rounded-md shadow-sm hover:bg-blue-600 transition-all active:scale-95 flex items-center gap-1"
                          >
                            자가수리
                          </button>
                        </div>
                        <p className="text-sm font-medium text-slate-700 leading-relaxed">{result.msg.action}</p>
                      </div>
                    </div>
                  )}
                </div>


                {result?.detectedWarnings?.length > 0 && (
                  <div className="p-6 rounded-3xl bg-white border-2 border-slate-100 space-y-4">
                    <h3 className="text-lg font-black">감지된 경고등</h3>
                    {result.detectedWarnings.map((warning, index) => (
                      <div key={`${warning.label}-${index}`} className="p-4 bg-slate-50 rounded-2xl">
                        <p className="font-black">{warning.display_name}</p>
                        <p className="text-sm text-slate-500">신뢰도: {(warning.confidence * 100).toFixed(1)}%</p>
                        <p className="text-sm text-slate-500">위험도: {warning.risk_level}</p>
                      </div>
                    ))}
                  </div>
                )}

                {result?.explanation && (
                  <div className="p-6 rounded-3xl bg-white border-2 border-blue-100">
                    <h3 className="text-lg font-black text-blue-600 mb-3">AI 안내</h3>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{result.explanation}</div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setActiveTab('map')} className="p-5 bg-white border-2 border-slate-200 rounded-3xl font-bold hover:border-blue-400 transition-all flex flex-col items-center gap-2">
                    <MapPin className="text-blue-600" />
                    주변 정비소 안내
                  </button>
                  <button className="p-5 bg-white border-2 border-slate-200 rounded-3xl font-bold hover:border-blue-400 transition-all flex flex-col items-center gap-2">
                    <Search className="text-blue-600" />
                    부품 가격 찾기
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DIY 탭 */}
        {activeTab === 'diy' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-2 mb-4">
              {diyStep > 1 && (
                <button onClick={() => setDiyStep(prev => prev - 1)} className="p-2 bg-white rounded-xl shadow-sm">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <h2 className="text-2xl font-black">자가정비 가이드</h2>
            </div>

            {diyStep === 1 && (
              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">1. 제조사를 선택하세요</label>
                <div className="grid grid-cols-3 gap-3">
                  {MANUFACTURERS.map(brand => (
                    <button
                      key={brand.name}
                      onClick={() => { setSelectedBrand(brand.name); setDiyStep(2); }}
                      className="p-4 bg-white rounded-2xl border-2 border-slate-100 flex flex-col items-center hover:border-blue-500 transition-all"
                    >
                      <img src={brand.logo} className="w-12 h-12 object-contain mb-2" alt={brand.name} />
                      <span className="text-xs font-bold">{brand.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {diyStep === 2 && (
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 rounded-2xl flex items-center gap-3">
                  <img src={MANUFACTURERS.find(b => b.name === selectedBrand)?.logo} className="w-10 h-10 object-contain" alt="" />
                  <span className="font-bold text-blue-700">{selectedBrand}가 선택됨</span>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400">차종 선택</label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all appearance-none"
                    >
                      <option value="">차종을 선택하세요</option>
                      {MANUFACTURERS.find(b => b.name === selectedBrand)?.models.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400">생산 연도</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500 appearance-none"
                    >
                      <option value="">생산 연도를 선택하세요</option>
                      {[2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015].map(y => (
                        <option key={y} value={y}>{y}년식</option>
                      ))}
                    </select>
                  </div>
                  <button
                    disabled={!selectedModel || !selectedYear}
                    onClick={() => setDiyStep(3)}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 disabled:bg-slate-300 transition-all"
                  >
                    다음 단계로
                  </button>
                </div>
              </div>
            )}

            {diyStep === 3 && (
              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">정비 항목을 선택하세요</label>
                <div className="space-y-2">
                  {DIY_ITEMS.map(item => (
                    <button
                      key={item.id}
                      onClick={() => { setSelectedDiy(item); setDiyStep(4); }}
                      className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl font-bold flex justify-between items-center hover:bg-blue-50 hover:border-blue-200 transition-all"
                    >
                      {item.name}
                      <ChevronRight className="w-5 h-5 text-slate-300" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {diyStep === 4 && selectedDiy && (
              <div className="space-y-6 animate-in slide-in-from-right-4">
                <div className="relative aspect-video bg-slate-200 rounded-3xl overflow-hidden shadow-inner">
                  <div className="w-full h-full flex items-center justify-center text-slate-400 italic">
                    [차량 정비 위치 이미지 - {selectedDiy.name}]
                  </div>
                  <div
                    className="absolute z-10 animate-bounce"
                    style={{ top: selectedDiy.pos.top, left: selectedDiy.pos.left }}
                  >
                    <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[10px] border-t-white mt-1"></div>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-white rounded-3xl border-2 border-blue-100 space-y-3">
                  <h3 className="text-xl font-black text-blue-600 flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    {selectedDiy.name} 방법
                  </h3>
                  <div className="p-4 bg-slate-50 rounded-xl font-medium text-slate-700 leading-relaxed min-h-[100px]">
                    {selectedDiy.desc}
                    <br /><br />
                    <span className="text-xs text-slate-400">* 본 가이드는 {selectedBrand} {selectedModel} ({selectedYear}년식) 기준입니다.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 지도 탭 */}
        {activeTab === 'map' && (
          <div className="h-full flex flex-col">
            <div className="relative flex-1 bg-blue-50">
              <div className="absolute inset-0 overflow-hidden">
                <iframe
                  key={getMapEmbedUrl()}
                  title="map"
                  src={getMapEmbedUrl()}
                  className="w-full h-full border-none"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>

            </div>

            <div className="bg-white p-6 rounded-t-[40px] -mt-10 shadow-2xl z-20 space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-black">주변 정비소</h2>
                  <p className="text-slate-400 text-sm font-bold">내 위치 기준 반경 5km</p>

                  <div className="mt-3 space-y-2">
                    <input
                      value={addressInput}
                      onChange={(e) => setAddressInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && applyAddressToMap()}
                      placeholder="예: 인천 서구 가정동, 주안역, 검단사거리역"
                      className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={applyAddressToMap}
                        className="py-3 px-3 bg-blue-600 text-white rounded-2xl font-bold text-sm"
                      >
                        입력 주소로 보기
                      </button>
                      <button
                        onClick={getUserLocation}
                        className="py-3 px-3 bg-slate-900 text-white rounded-2xl font-bold text-sm"
                      >
                        {isLocating ? '확인 중...' : '현재 위치 사용'}
                      </button>
                    </div>

                    <button
                      onClick={() => setShowNearbyMapModal(true)}
                      className="w-full py-3 px-4 bg-emerald-500 text-white rounded-2xl font-bold text-sm"
                    >
                      이 위치로 지도 앱에서 정비소 찾기
                    </button>
                  </div>

                  {selectedAddress && (
                    <p className="mt-2 text-xs text-blue-600 font-bold">
                      기준 주소: {selectedAddress}
                    </p>
                  )}

                  {userLocation && !selectedAddress && (
                    <p className="mt-2 text-xs text-blue-600 font-bold">
                      현재 위치: {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
                      <br />
                      정확도: 약 {Math.round(userLocation.accuracy)}m
                    </p>
                  )}

                  {locationError && (
                    <p className="mt-2 text-xs text-red-500 font-bold">
                      {locationError}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">● 일반</span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">● 폐유처리</span>
                </div>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {SHOPS.map(shop => (
                  <div
                    key={shop.id}
                    onMouseEnter={() => setHoveredShop(shop.id)}
                    onMouseLeave={() => setHoveredShop(null)}
                    onClick={() => setShowMapModal(shop)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer group flex justify-between items-center ${shop.type === 'oil' ? 'border-green-50 hover:border-green-400 bg-green-50/30' : 'border-slate-50 hover:border-blue-400'}`}
                  >
                    <div>
                      <h4 className="font-black text-slate-800">{shop.name}</h4>
                      <p className="text-xs text-slate-500 font-medium">{shop.addr}</p>
                    </div>
                    <Navigation className={`w-5 h-5 ${shop.type === 'oil' ? 'text-green-500' : 'text-blue-500'} group-hover:translate-x-1 transition-transform`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 기록 탭 */}
        {activeTab === 'history' && (
          <div className="p-6 space-y-6">
            <h2 className="text-2xl font-black">나의 정비 기록</h2>

            <div className="bg-white p-6 rounded-3xl shadow-sm border-2 border-slate-100 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">기록 날짜 선택</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none border-2 border-transparent focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">내용 (예: 엔진 오일 교체)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="정비 내용을 입력하세요..."
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none border-2 border-transparent focus:border-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && addManualRecord()}
                  />
                  <button onClick={addManualRecord} className="absolute right-2 top-2 p-2 bg-blue-600 text-white rounded-xl">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {history.map(item => (
                <div key={item.id} className="bg-white p-5 rounded-3xl border-2 border-slate-50 flex items-start gap-4 animate-in slide-in-from-bottom-2">
                  <div className={`w-2 h-12 rounded-full ${item.status === 'critical' ? 'bg-red-500' : item.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black text-slate-400">{item.date}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${item.status === 'critical' ? 'bg-red-50 text-red-600' : item.status === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {item.status === 'critical' ? STATUS_LABELS.CRITICAL : item.status === 'warning' ? STATUS_LABELS.WARNING : STATUS_LABELS.NORMAL}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800">{item.text}</p>
                  </div>
                  <button onClick={() => deleteRecord(item.id)} className="p-2 text-slate-300 hover:text-red-500">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <nav className="bg-white/80 backdrop-blur-lg border-t flex justify-around items-center py-4 px-2 fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40">
        {[
          { id: 'find', icon: Search, label: '탐색' },
          { id: 'diy', icon: Wrench, label: '자가정비' },
          { id: 'map', icon: MapPin, label: '정비소' },
          { id: 'history', icon: History, label: '기록' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 min-w-[60px] transition-all ${activeTab === tab.id ? 'text-blue-600 scale-110' : 'text-slate-400'}`}
          >
            <tab.icon className={`w-6 h-6 ${activeTab === tab.id ? 'fill-blue-600/10' : ''}`} />
            <span className="text-[10px] font-black tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* 로그인 모달 */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[40px] overflow-hidden animate-in zoom-in-95">
            <div className="p-8 text-center space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black">반가워요!</h3>
                <button onClick={() => setShowLogin(false)} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
              </div>
              <p className="text-slate-500 font-medium">소셜 계정으로 간편하게 시작하세요</p>
              <div className="space-y-3">
                <button className="w-full p-4 bg-[#FEE500] text-black font-bold rounded-2xl flex items-center justify-center gap-3">카카오 로그인</button>
                <button className="w-full p-4 bg-white border-2 border-slate-100 font-bold rounded-2xl flex items-center justify-center gap-3">구글 로그인</button>
                <button className="w-full p-4 bg-black text-white font-bold rounded-2xl flex items-center justify-center gap-3">애플 로그인</button>
                <button className="w-full p-4 bg-slate-100 text-slate-600 font-bold rounded-2xl flex items-center justify-center gap-3">이메일 회원가입</button>
              </div>
            </div>
          </div>
        </div>
      )}


      {showNearbyMapModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 space-y-6 animate-in slide-in-from-bottom-full duration-300">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black">지도 앱에서 찾기</h3>
                <p className="text-slate-500 text-sm mt-1">
                  {getNearbySearchText()} 기준으로 검색합니다.
                </p>
              </div>
              <button onClick={() => setShowNearbyMapModal(false)} className="p-2 bg-slate-100 rounded-full">
                <X />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => openNearbyMap('naver')} className="p-4 bg-emerald-500 text-white font-bold rounded-2xl">
                네이버 지도
              </button>
              <button onClick={() => openNearbyMap('kakao')} className="p-4 bg-[#FEE500] text-black font-bold rounded-2xl">
                카카오 맵
              </button>
              <button onClick={() => openNearbyMap('google')} className="p-4 bg-white border-2 border-slate-100 font-bold rounded-2xl">
                구글 지도
              </button>
              <button onClick={() => openNearbyMap('apple')} className="p-4 bg-slate-800 text-white font-bold rounded-2xl">
                애플 지도
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 정비소 연결 모달 */}
      {showMapModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 space-y-6 animate-in slide-in-from-bottom-full duration-300">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black">{showMapModal.name}</h3>
                <p className="text-slate-500">{showMapModal.addr}</p>
              </div>
              <button onClick={() => setShowMapModal(null)} className="p-2 bg-slate-100 rounded-full"><X /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => openExternalMap('naver')} className="p-4 bg-emerald-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2">네이버 지도</button>
              <button onClick={() => openExternalMap('kakao')} className="p-4 bg-[#FEE500] text-black font-bold rounded-2xl flex items-center justify-center gap-2">카카오 맵</button>
              <button onClick={() => openExternalMap('google')} className="p-4 bg-white border-2 border-slate-100 font-bold rounded-2xl flex items-center justify-center gap-2">구글 지도</button>
              <button onClick={() => openExternalMap('apple')} className="p-4 bg-slate-800 text-white font-bold rounded-2xl flex items-center justify-center gap-2">애플 지도</button>
            </div>
            <button className="w-full py-5 bg-blue-600 text-white rounded-3xl font-bold shadow-xl shadow-blue-100">정비 예약하기</button>
          </div>
        </div>
      )}
    </div>
  );
}


// =============================================================================
// 계기판 촬영 가이드 화면 컴포넌트
// =============================================================================
// 이 컴포넌트는 기존 업로드/AI 분석 로직을 건드리지 않고,
// 파일 선택창이 열리기 전에 사용자에게 촬영 가이드를 먼저 보여주기 위한 화면입니다.
function PhotoGuideScreen({ onClose, onStart, hideGuideForWeek, setHideGuideForWeek }) {
  const handleCheckWeek = (checked) => {
    setHideGuideForWeek(checked);

    if (checked) {
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem('hidePhotoGuideUntil', String(Date.now() + sevenDays));
    } else {
      localStorage.removeItem('hidePhotoGuideUntil');
    }
  };

  return (
    <div className="absolute inset-0 z-[999] bg-white flex flex-col">
      <header className="bg-white px-4 py-4 border-b flex items-center justify-center relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 p-2 rounded-full hover:bg-slate-100"
          aria-label="촬영 가이드 닫기"
        >
          <ChevronLeft className="w-7 h-7 text-slate-900" />
        </button>

        <div className="text-center">
          <h1 className="text-2xl font-black text-slate-900">계기판 촬영 가이드</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            정확한 분석을 위해 아래 예시를 확인해 주세요
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8 pb-36">
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-black text-slate-900">올바른 촬영</h2>
          </div>

          <div className="relative bg-white rounded-3xl border-2 border-emerald-500 p-3 shadow-lg shadow-emerald-100">
            <div className="absolute -top-3 -left-3 w-12 h-12 rounded-full bg-emerald-500 border-4 border-white flex items-center justify-center z-10">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>

            <DashboardMockup type="correct" />

            <div className="mt-3 py-3 px-4 rounded-2xl bg-emerald-50 flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="text-sm font-black text-slate-800 text-center">
                계기판 전체가 선명하게, 정면에서 촬영
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center">
              <X className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-black text-slate-900">피해야 할 촬영</h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <WrongPhotoCard type="dark" label="너무 어두움" />
            <WrongPhotoCard type="blur" label="초점 흐림" />
            <WrongPhotoCard type="glare" label="빛 반사" />
          </div>
        </section>

        <section className="rounded-3xl bg-blue-50 border border-blue-100 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-black text-blue-600">촬영 팁</h2>
          </div>

          <GuideTip number="1" text="계기판 전체가 화면에 들어오도록 정면에서 촬영해 주세요." />
          <GuideTip number="2" text="햇빛·실내등 반사가 없는 각도를 찾아 촬영해 주세요." />
          <GuideTip number="3" text="손을 고정하고 흔들리지 않게 촬영하세요." />
          <GuideTip number="4" text="엔진을 켠 상태에서 경고등이 켜진 채로 찍어주세요." />
        </section>
      </main>

      <div className="absolute bottom-0 left-0 right-0 bg-white border-t p-5 space-y-4">
        <button
          type="button"
          onClick={onStart}
          className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black shadow-xl shadow-blue-200 active:scale-95 transition-transform text-lg flex items-center justify-center gap-2"
        >
          <Camera className="w-6 h-6" />
          사진 촬영 시작
        </button>

        <label className="flex items-center justify-center gap-3 text-slate-500 font-bold">
          <input
            type="checkbox"
            checked={hideGuideForWeek}
            onChange={(e) => handleCheckWeek(e.target.checked)}
            className="w-6 h-6 accent-blue-600"
          />
          일주일 동안 보지 않기
        </label>
      </div>
    </div>
  );
}

// 실제 사진 대신 계기판 예시를 간단한 UI 도형으로 그리는 컴포넌트입니다.
function DashboardMockup({ type = 'correct' }) {
  return (
    <div
      className={`
        relative h-44 rounded-2xl bg-slate-950 overflow-hidden flex items-center justify-center
        ${type === 'dark' ? 'brightness-[0.25]' : ''}
        ${type === 'blur' ? 'blur-[2px]' : ''}
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-slate-800/50 to-slate-950"></div>

      <div className="relative flex items-center justify-center gap-5 w-full">
        <div className="relative w-24 h-24 rounded-full border-4 border-slate-400">
          <div className="absolute inset-4 rounded-full border border-slate-600"></div>
          <div className="absolute left-1/2 top-1/2 w-1 h-12 bg-red-500 rounded-full origin-bottom -translate-x-1/2 -translate-y-full"></div>
          <div className="absolute left-1/2 top-1/2 w-3 h-3 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        </div>

        <div className="w-12 h-16 rounded border border-slate-600 flex items-start justify-start p-2 text-white text-sm font-black">
          D
        </div>

        <div className="relative w-24 h-24 rounded-full border-4 border-slate-400">
          <div className="absolute inset-4 rounded-full border border-slate-600"></div>
          <div className="absolute left-1/2 top-1/2 w-1 h-12 bg-red-500 rounded-full origin-bottom -translate-x-1/2 -translate-y-full rotate-45"></div>
          <div className="absolute left-1/2 top-1/2 w-3 h-3 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        </div>
      </div>

      {type === 'glare' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent rotate-12 scale-150"></div>
      )}
    </div>
  );
}

// 잘못된 촬영 예시 카드입니다.
function WrongPhotoCard({ type, label }) {
  return (
    <div className="relative bg-white rounded-2xl border-2 border-red-500 p-2 shadow-sm">
      <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-red-500 border-4 border-white flex items-center justify-center z-10">
        <X className="w-5 h-5 text-white" />
      </div>

      <DashboardMockup type={type} />

      <div className="mt-3 flex items-center gap-1.5 justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-red-500 flex items-center justify-center shrink-0">
          <X className="w-3 h-3 text-red-500" />
        </div>
        <p className="text-xs font-black text-slate-700 text-center">{label}</p>
      </div>
    </div>
  );
}

// 촬영 팁 한 줄입니다.
function GuideTip({ number, text }) {
  return (
    <div className="flex gap-3 border-b border-dashed border-blue-200 last:border-b-0 pb-3 last:pb-0">
      <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-black shrink-0">
        {number}
      </div>
      <p className="text-sm font-bold text-slate-700 leading-relaxed">
        {text}
      </p>
    </div>
  );
}

const styleTag = document.createElement('style');
styleTag.innerHTML = `
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
`;
document.head.appendChild(styleTag);
