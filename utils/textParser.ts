/**
 * 매물정보 자동 파싱 유틸리티
 * TEN 원본, 네이버부동산, 정리본 포맷을 자동으로 감지하고 파싱합니다.
 */

/**
 * 파싱된 매물 정보 필드
 */
export interface ParsedPropertyFields {
  // 기본 정보
  roomName: string;       // 호실명/건물명
  jibun: string;          // 지번 주소
  agency: string;         // 부동산명
  agencyPhone: string;    // 부동산 연락처

  // 임대료
  deposit: string;        // 보증금/전세금
  monthlyRent: string;    // 월세

  // 구조정보
  area: string;           // 전용면적 (m²)
  pyeong: string;         // 평수 (계산값)
  rooms: string;          // 방수
  bathrooms: string;      // 욕실수

  // 위치정보
  building: string;       // 동정보
  floor: string;          // 층정보

  // 추가정보
  moveInDate: string;     // 입주가능일
  features: string;       // 특징/비고
}

/**
 * 매물정보 포맷 타입
 */
export type PropertyFormat = 'TEN' | 'NAVER' | 'STRUCTURED';

/**
 * 텍스트를 정규화합니다 (줄바꿈, 탭, 특수 공백 처리)
 */
function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')       // Windows 줄바꿈 통일
    .replace(/\t/g, ' ')          // 탭을 공백으로
    .replace(/\u00A0/g, ' ')      // Non-breaking space 제거
    .replace(/\s+/g, ' ')         // 연속 공백 하나로
    .trim();
}

/**
 * 전화번호를 정규화합니다 (XXX-XXXX-XXXX 형식)
 */
function normalizePhoneNumber(phone: string): string {
  // 숫자만 추출
  const digits = phone.replace(/\D/g, '');

  if (!digits) return phone;

  // 형식 통일
  if (digits.startsWith('02')) {
    return digits.replace(/(\d{2})(\d{3,4})(\d{4})/, '$1-$2-$3');
  } else if (digits.startsWith('0')) {
    return digits.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3');
  }

  return phone;
}

/**
 * 매물정보의 포맷을 자동으로 감지합니다.
 *
 * @param text - 원본 매물정보 텍스트
 * @returns 감지된 포맷 ('STRUCTURED' | 'NAVER' | 'TEN')
 *
 * @example
 * detectFormat('소재지: 경동미르웰(강남구 학동 784)') // 'STRUCTURED'
 * detectFormat('계약/전용면적: 84.5m²') // 'NAVER'
 * detectFormat('오피스텔    경동미르웰') // 'TEN'
 */
export function detectFormat(text: string): PropertyFormat {
  // 정리본 포맷 우선 감지 (가장 정확도 높음)
  if (
    text.includes('소재지:') ||
    text.includes('부동산:') ||
    text.includes('연락처:') ||
    text.includes('🏠 매물정보')
  ) {
    return 'STRUCTURED';
  }

  // 네이버부동산 포맷 감지
  if (
    text.includes('계약/전용면적') ||
    text.includes('해당층/총층') ||
    text.includes('매물특징')
  ) {
    return 'NAVER';
  }

  // 기본값: TEN 원본
  return 'TEN';
}

/**
 * 정리본 형식의 매물정보를 파싱합니다.
 *
 * 포맷 예시:
 * ```
 * 🏠 매물정보
 * • 소재지: 경동미르웰(강남구 학동 784)
 * • 부동산: 우리중개사
 * • 연락처: 02-542-6666
 * ```
 *
 * @param text - 정리본 형식의 매물정보
 * @returns 파싱된 필드들
 */
export function parseStructuredFormat(text: string): ParsedPropertyFields {
  const fields: ParsedPropertyFields = {
    roomName: '',
    jibun: '',
    agency: '',
    agencyPhone: '',
    deposit: '',
    monthlyRent: '',
    area: '',
    pyeong: '',
    rooms: '',
    bathrooms: '',
    building: '',
    floor: '',
    moveInDate: '',
    features: ''
  };

  // 1. 소재지 파싱: "소재지: 경동미르웰(강남구 학동 784)"
  const locationMatch = text.match(/소재지[:：]\s*([^(]+)\(([^)]+)\)/);
  if (locationMatch) {
    fields.roomName = locationMatch[1].trim();
    fields.jibun = locationMatch[2].trim();
  }

  // 2. 임대료 파싱: "임대료: 1억 5000 / 40"
  const rentMatch = text.match(/임대료[:：]\s*([^/\n]+)\s*\/\s*(.+?)(?:\n|$)/);
  if (rentMatch) {
    fields.deposit = rentMatch[1].trim();
    fields.monthlyRent = rentMatch[2].trim();
  }

  // 3. 구조정보 파싱: "구조정보: 29.47㎡ (전용 8.9평)/방1,욕실1"
  const structureMatch = text.match(/구조정보[:：]\s*([0-9.]+)㎡\s*\(전용\s*([0-9.]+)평\)\s*\/\s*방(\d+)[,，]욕실(\d+)/);
  if (structureMatch) {
    fields.area = structureMatch[1];
    fields.pyeong = structureMatch[2];
    fields.rooms = structureMatch[3];
    fields.bathrooms = structureMatch[4];
  }

  // 4. 동/층 파싱: "동/층: 1동 / 7층"
  const buildingFloorMatch = text.match(/동\/층[:：]\s*([^/]+)\s*\/\s*(.+?)(?:\n|$)/);
  if (buildingFloorMatch) {
    fields.building = buildingFloorMatch[1].trim();
    fields.floor = buildingFloorMatch[2].trim();
  }

  // 5. 특징 파싱: "특징: 25.01.15 엘리베이터 있음"
  const featuresMatch = text.match(/특징[:：]\s*(.+?)(?:\n|$)/);
  if (featuresMatch) {
    fields.features = featuresMatch[1].trim();
  }

  // 6. 부동산 파싱: "부동산: 우리중개사"
  const agencyMatch = text.match(/부동산[:：]\s*(.+?)(?:\n|$)/);
  if (agencyMatch) {
    fields.agency = agencyMatch[1].trim();
  }

  // 7. 연락처 파싱: "연락처: 02-542-6666"
  const phoneMatch = text.match(/연락처[:：]\s*([\d\-]+)/);
  if (phoneMatch) {
    fields.agencyPhone = normalizePhoneNumber(phoneMatch[1].trim());
  }

  return fields;
}

/**
 * TEN 원본 형식에서 호실명을 추출합니다.
 *
 * 우선순위:
 * 1. "오피스텔" 라벨
 * 2. "건물,위치" 라벨
 * 3. "건물" 라벨
 * 4. "위치" 라벨
 * 5. 7번째 줄 (위의 라벨 없을 때만)
 *
 * 제외 패턴: 주소, 주택, 연면, 분양, 동, 층, 보증, 공개, 소재지, 지번
 */
export function extractPropertyName(text: string): string {
  const normalized = normalizeText(text);

  // "오피스텔" 또는 "[단위:만원] 오피스텔" 뒤에 오는 건물명 추출
  // 패턴: "오피스텔 {건물명} 동" 또는 "[단위:만원] 오피스텔 {건물명} 동"
  const match = normalized.match(/(?:\[단위[^\]]*\]\s*)?오피스텔\s+([^\s동]+)\s+동/);
  if (match) {
    return match[1].trim();
  }

  // 대체 패턴: "오피스텔" 다음 텍스트
  const fallbackMatch = normalized.match(/오피스텔\s+([^\s]+)/);
  if (fallbackMatch) {
    return fallbackMatch[1].trim();
  }

  return '';
}

/**
 * TEN 원본 형식에서 지번을 추출합니다.
 * "물건명" 또는 "소 재 지" 라벨 이후의 주소 정보를 추출합니다.
 */
export function extractJibun(text: string): string {
  const normalized = normalizeText(text);

  // 패턴 1: "물건명 {지번}" 형식 추출
  // 예: "물건명 서울시 강서구 마곡동 784-9 마곡오드카운티2차"
  const match1 = normalized.match(/물건명\s+([^가-힣]+?(?:[가-힣]+(?:\s+[가-힣]+)?)?)\s+(?:[0-9\-]+)\s+/);
  if (match1) {
    return match1[1].trim();
  }

  // 패턴 2: "소 재 지" 또는 "소재지" 패턴
  const match2 = normalized.match(/소\s*재\s*지\s+([^\[]+?)(?:\[|공개|단위|$)/);
  if (match2) {
    return match2[1].trim();
  }

  // 패턴 3: 첫 줄의 지역 정보 추출 (보통 앞의 2-3단어)
  const lines = normalized.split('\n').filter(l => l.trim());
  if (lines.length > 0) {
    const firstLine = lines[0];
    const parts = firstLine.split(/\s+/);
    // 보통 첫 2-3개 단어가 지역 정보
    for (let i = 0; i < Math.min(3, parts.length); i++) {
      if (parts[i].includes('시') || parts[i].includes('구') || parts[i].includes('동')) {
        return parts.slice(0, i + 1).join(' ');
      }
    }
  }

  return '';
}

/**
 * TEN 원본 형식에서 부동산명을 추출합니다.
 * "공인중개사사무소" 또는 "공인중개사" 패턴을 찾아 추출합니다.
 */
export function extractAgencyName(text: string): string {
  const normalized = normalizeText(text);

  // 패턴 1: "{부동산명}공인중개사사무소" 형식
  const match1 = normalized.match(/([^\s]+)공인중개사사무소/);
  if (match1) {
    return match1[1].trim() + '공인중개사사무소';
  }

  // 패턴 2: "공인중개사 {부동산명}" 형식 (공백 포함)
  const match2 = normalized.match(/공인중개사\s+([^\s]+)/);
  if (match2) {
    return match2[1].trim();
  }

  // 패턴 3: "중개법인 {부동산명}" 형식
  const match3 = normalized.match(/중개법인\s+([^\s]+)/);
  if (match3) {
    return match3[1].trim();
  }

  return '';
}

/**
 * TEN 원본 형식에서 부동산 연락처를 추출합니다.
 * "전 화 번 호" (유선번호) 우선, 없으면 "핸드폰번호"를 추출합니다.
 */
export function extractContactNumber(text: string): string {
  const normalized = normalizeText(text);

  let landlinePhone = '';     // 유선번호 (02, 031 등)
  let mobilePhone = '';       // 휴대전화 (010)

  // 1. "전 화 번 호" (유선번호) 찾기
  // 패턴: "전 화 번 호" 또는 "전화번호" 뒤의 전화번호 추출
  const landlineMatch = normalized.match(/전\s*화\s*번\s*호\s+([\d\-]+)/);
  if (landlineMatch) {
    landlinePhone = normalizePhoneNumber(landlineMatch[1]);
  }

  // 2. "핸드폰번호" 찾기 (유선번호가 없을 때만)
  if (!landlinePhone) {
    const mobileMatch = normalized.match(/핸드폰번호\s+([\d\-]+)/);
    if (mobileMatch) {
      mobilePhone = normalizePhoneNumber(mobileMatch[1]);
    }
  }

  // 우선순위: 유선번호 > 휴대전화
  return landlinePhone || mobilePhone || '';
}

/**
 * 평수를 계산합니다 (m² × 0.3025, 소수점 첫째 자리까지)
 */
export function calculatePyeong(areaM2: string): string {
  const area = parseFloat(areaM2);
  if (isNaN(area)) return '';
  const pyeong = Math.round(area * 0.3025 * 10) / 10;
  return pyeong.toFixed(1);
}

/**
 * TEN 형식에서 보증금을 추출합니다.
 */
export function extractDeposit(text: string): string {
  const normalized = normalizeText(text);
  const lines = normalized.split('\n');

  for (const line of lines) {
    const match = line.match(/보\s*증\s*금\s*(.*?)(?:\n|$)/);
    if (match) {
      const value = match[1].trim();
      // "19,000" 형식을 "1억 9,000" 형식으로 변환
      const num = value.replace(/,/g, '');
      const amount = parseInt(num);
      if (!isNaN(amount)) {
        if (amount >= 10000) {
          const eok = Math.floor(amount / 10000);
          const man = amount % 10000;
          return man > 0 ? `${eok}억 ${man.toLocaleString()}` : `${eok}억`;
        }
        return amount.toLocaleString();
      }
      return value;
    }
  }
  return '';
}

/**
 * TEN 형식에서 월세를 추출합니다.
 */
export function extractMonthlyRent(text: string): string {
  const normalized = normalizeText(text);
  const lines = normalized.split('\n');

  for (const line of lines) {
    const match = line.match(/월\s*세\s*([\d,]+)/);
    if (match) {
      return match[1].trim();
    }
  }
  return '';
}

/**
 * TEN 형식에서 전용면적을 추출합니다.
 */
export function extractArea(text: string): string {
  const normalized = normalizeText(text);
  const match = normalized.match(/전용면적\s*([\d.]+)/);
  if (match) {
    return match[1];
  }
  return '';
}

/**
 * TEN 형식에서 방수를 추출합니다.
 */
export function extractRooms(text: string): string {
  const normalized = normalizeText(text);
  const match = normalized.match(/방\s*수\s*(\d+)/);
  if (match) {
    return match[1];
  }
  return '';
}

/**
 * TEN 형식에서 욕실수를 추출합니다.
 */
export function extractBathrooms(text: string): string {
  const normalized = normalizeText(text);
  const match = normalized.match(/욕\s*실\s*수\s*(\d+)/);
  if (match) {
    return match[1];
  }
  return '';
}

/**
 * TEN 형식에서 동 정보를 추출합니다.
 * "동 [층" 패턴에서 앞의 숫자와 "동" 추출
 */
export function extractBuilding(text: string): string {
  const normalized = normalizeText(text);
  const match = normalized.match(/(\d+)\s*동\s*\[/);
  if (match) {
    return match[1] + '동';
  }
  return '';
}

/**
 * TEN 형식에서 층 정보를 추출합니다.
 * "동 [층 / 총층]" 패턴에서 "/" 앞의 숫자 추출
 */
export function extractFloor(text: string): string {
  const normalized = normalizeText(text);
  const match = normalized.match(/동\s*\[(\d+)\s*\/\s*\d+\]/);
  if (match) {
    return match[1] + '층';
  }
  return '';
}

/**
 * TEN 형식에서 입주가능일을 추출합니다.
 */
export function extractMoveInDate(text: string): string {
  const normalized = normalizeText(text);
  const lines = normalized.split('\n');

  for (const line of lines) {
    const match = line.match(/입주가능일\s*(.+?)(?:\n|$)/);
    if (match) {
      return match[1].trim();
    }
  }
  return '';
}

/**
 * TEN 형식에서 특징/비고를 추출합니다.
 */
export function extractFeatures(text: string): string {
  const normalized = normalizeText(text);
  const lines = normalized.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('비고') || lines[i].includes('매물메모')) {
      const parts = lines[i].split(/비고|매물메모/);
      if (parts.length > 1) {
        return parts[1].trim();
      }
      // 다음 줄에서 찾기 (최대 3줄까지)
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const nextLine = lines[j].trim();
        if (nextLine) {
          return nextLine;
        }
      }
    }
  }
  return '';
}

/**
 * 네이버부동산 형식에서 호실명을 추출합니다.
 * 첫 줄에서 "숫자동 숫자층" 패턴을 제거하고 건물명을 추출합니다.
 *
 * @example
 * extractPropertyNameNaver('강남구 학동 경동미르웰 1동 10층')
 * // returns '경동미르웰'
 */
export function extractPropertyNameNaver(text: string): string {
  const lines = normalizeText(text).split('\n').filter(l => l.trim());
  if (lines.length === 0) return '';

  const firstLine = lines[0];

  // "숫자동 숫자층" 패턴 제거
  const cleaned = firstLine.replace(/\d+동\s*\d+층/g, '').trim();

  // 건물명은 보통 마지막 단어들
  const parts = cleaned.split(/\s+/);

  // 지역명(2-3개)을 제거하고 나머지를 건물명으로
  if (parts.length >= 3) {
    return parts.slice(2).join(' ');
  }

  return cleaned;
}

/**
 * 네이버부동산 형식에서 부동산명을 추출합니다.
 */
export function extractAgencyNameNaver(text: string): string {
  // "중개사: 우리중개사(우리중개법인)" 패턴
  const agencyMatch = text.match(/중개사[:：]\s*([^(\n]+)/);
  if (agencyMatch) {
    return agencyMatch[1].trim();
  }
  return '';
}

/**
 * 네이버부동산 형식에서 부동산 연락처를 추출합니다.
 * 전화번호들을 모두 수집한 후 우선순위에 따라 반환합니다.
 * 우선순위: 유선번호(02, 지역번호) > 휴대전화(010)
 */
export function extractContactNumberNaver(text: string): string {
  // 모든 전화번호 추출
  const phonePattern = /(전화|TEL|휴대폰|핸드폰)[\s:：]*([0-9\-]+)/gi;
  const matches = [...text.matchAll(phonePattern)];

  if (matches.length === 0) return '';

  const phones = matches.map(m => normalizePhoneNumber(m[2]));

  // 우선순위 규칙: 유선번호(지역번호) > 휴대전화(010)
  // 1. 서울 지역번호 (02)
  const seoul = phones.find(p => p.startsWith('02-'));
  if (seoul) return seoul;

  // 2. 기타 지역번호 (031, 051 등, 010 제외)
  const regional = phones.find(p => /^0\d{1,2}-/.test(p) && !p.startsWith('010-'));
  if (regional) return regional;

  // 3. 휴대전화 (010)
  const mobile = phones.find(p => p.startsWith('010-'));
  if (mobile) return mobile;

  // 4. 그 외 번호
  return phones[0] || '';
}

/**
 * 네이버부동산 형식에서 보증금/전세금을 추출합니다.
 */
export function extractDepositNaver(text: string): string {
  // "매매가:", "전세금:", "보증금:" 패턴
  const match = text.match(/(?:매매가|전세금|보증금)[:：]\s*([^\n/]+)/);
  if (match) {
    return match[1].trim();
  }
  return '';
}

/**
 * 네이버부동산 형식에서 월세를 추출합니다.
 */
export function extractMonthlyRentNaver(text: string): string {
  const match = text.match(/월[\s]*세[:：]\s*([^\n]+)/);
  if (match) {
    return match[1].trim();
  }
  return '';
}

/**
 * 네이버부동산 형식에서 전용면적을 추출합니다.
 */
export function extractAreaNaver(text: string): string {
  // "계약/전용면적: 84.5㎡"
  const match = text.match(/계약\/전용면적[:：]\s*([\d.]+)㎡?/);
  if (match) {
    return match[1];
  }
  return '';
}

/**
 * 네이버부동산 형식에서 방 개수를 추출합니다.
 */
export function extractRoomsNaver(text: string): string {
  // "방1" 또는 "방 1"
  const match = text.match(/방[\s]?(\d+)/);
  if (match) {
    return match[1];
  }
  return '';
}

/**
 * 네이버부동산 형식에서 욕실 개수를 추출합니다.
 */
export function extractBathroomsNaver(text: string): string {
  // "욕실1" 또는 "욕실 1"
  const match = text.match(/욕실[\s]?(\d+)/);
  if (match) {
    return match[1];
  }
  return '';
}

/**
 * 네이버부동산 형식에서 동 정보를 추출합니다.
 */
export function extractBuildingNaver(text: string): string {
  // "1동" 또는 "동호" 패턴
  const match = text.match(/(\d+)\s*동/);
  if (match) {
    return match[1] + '동';
  }
  return '';
}

/**
 * 네이버부동산 형식에서 층 정보를 추출합니다.
 * "해당층/총층:" 라벨 사용
 */
export function extractFloorNaver(text: string): string {
  // "해당층/총층: 10층"
  const match = text.match(/해당층\/총층[:：]\s*(\d+)층?/);
  if (match) {
    return match[1] + '층';
  }
  return '';
}

/**
 * 네이버부동산 형식에서 입주가능일을 추출합니다.
 */
export function extractMoveInDateNaver(text: string): string {
  // "입주가능일:" 패턴
  const match = text.match(/입주가능일[:：]\s*([^\n]+)/);
  if (match) {
    return match[1].trim();
  }
  return '';
}

/**
 * 네이버부동산 형식에서 특징을 추출합니다.
 */
export function extractFeaturesNaver(text: string): string {
  // "매물특징:" 패턴
  const match = text.match(/매물특징[:：]\s*([^\n]+)/);
  if (match) {
    return match[1].trim();
  }
  return '';
}

/**
 * 네이버부동산 형식에서 지번/법정동을 추출합니다.
 * 첫 줄에서 법정동 정보를 추출합니다.
 */
export function extractJibunNaver(text: string): string {
  const lines = normalizeText(text).split('\n').filter(l => l.trim());
  if (lines.length === 0) return '';

  const firstLine = lines[0];
  // 첫 줄에서 "지역 법정동" 부분만 추출
  const parts = firstLine.split(/\s+/);

  // 보통 첫 2-3개가 지역 정보
  if (parts.length >= 2) {
    return parts.slice(0, 2).join(' ');
  }

  return firstLine;
}

/**
 * 원본 매물정보를 정리본 형식으로 변환합니다.
 * TEN 원본 또는 네이버부동산 형식을 자동으로 감지하고 정리본으로 변환합니다.
 */
export function generateStructuredPropertyInfo(rawInput: string): string {
  const format = detectFormat(rawInput);

  // 이미 정리본이면 그대로 반환
  if (format === 'STRUCTURED') {
    return rawInput;
  }

  let roomName = '';
  let jibun = '';
  let agency = '';
  let agencyPhone = '';

  if (format === 'TEN') {
    roomName = extractPropertyName(rawInput);
    jibun = extractJibun(rawInput);
    agency = extractAgencyName(rawInput);
    agencyPhone = extractContactNumber(rawInput);
  } else if (format === 'NAVER') {
    roomName = extractPropertyNameNaver(rawInput);
    jibun = extractJibunNaver(rawInput);
    agency = extractAgencyNameNaver(rawInput);
    agencyPhone = extractContactNumberNaver(rawInput);
  }

  // 정리본 형식으로 변환
  return `🏠 매물정보
• 소재지: ${roomName || '미등록'}(${jibun || '미등록'})
• 임대료: 미등록/미등록
• 구조정보: 미등록
• 동/층: 미등록/미등록
• 특징:
• 부동산: ${agency || '미등록'}
• 연락처: ${agencyPhone || '미등록'}`;
}

/**
 * 매물정보를 파싱하여 4개의 구조화된 필드를 추출합니다.
 * 이것이 UI에서 호출하는 메인 진입점입니다.
 *
 * @param rawInput - 원본 매물정보 (TEN/네이버/정리본 모두 지원)
 * @returns 파싱된 4개 필드
 *
 * @example
 * const result = parsePropertyDetails('오피스텔    경동미르웰\n...');
 * console.log(result);
 * // { roomName: '경동미르웰', jibun: '강남구 학동', agency: '우리중개사', agencyPhone: '02-542-6666' }
 */
export function parsePropertyDetails(rawInput: string): ParsedPropertyFields {
  try {
    const defaultFields: ParsedPropertyFields = {
      roomName: '',
      jibun: '',
      agency: '',
      agencyPhone: '',
      deposit: '',
      monthlyRent: '',
      area: '',
      pyeong: '',
      rooms: '',
      bathrooms: '',
      building: '',
      floor: '',
      moveInDate: '',
      features: ''
    };

    if (!rawInput || !rawInput.trim()) {
      return defaultFields;
    }

    const format = detectFormat(rawInput);

    // 최대 10,000자까지만 처리 (성능)
    const text = rawInput.substring(0, 10000);

    if (format === 'STRUCTURED') {
      return parseStructuredFormat(text);
    }

    // TEN 또는 NAVER 원본인 경우
    let roomName = '';
    let jibun = '';
    let agency = '';
    let agencyPhone = '';
    let deposit = '';
    let monthlyRent = '';
    let area = '';
    let pyeong = '';
    let rooms = '';
    let bathrooms = '';
    let building = '';
    let floor = '';
    let moveInDate = '';
    let features = '';

    if (format === 'TEN') {
      roomName = extractPropertyName(text);
      jibun = extractJibun(text);
      agency = extractAgencyName(text);
      agencyPhone = extractContactNumber(text);
      deposit = extractDeposit(text);
      monthlyRent = extractMonthlyRent(text);
      area = extractArea(text);
      pyeong = calculatePyeong(area);
      rooms = extractRooms(text);
      bathrooms = extractBathrooms(text);
      building = extractBuilding(text);
      floor = extractFloor(text);
      moveInDate = extractMoveInDate(text);
      features = extractFeatures(text);
    } else if (format === 'NAVER') {
      roomName = extractPropertyNameNaver(text);
      jibun = extractJibunNaver(text);
      agency = extractAgencyNameNaver(text);
      agencyPhone = extractContactNumberNaver(text);
      deposit = extractDepositNaver(text);
      monthlyRent = extractMonthlyRentNaver(text);
      area = extractAreaNaver(text);
      pyeong = calculatePyeong(area);
      rooms = extractRoomsNaver(text);
      bathrooms = extractBathroomsNaver(text);
      building = extractBuildingNaver(text);
      floor = extractFloorNaver(text);
      moveInDate = extractMoveInDateNaver(text);
      features = extractFeaturesNaver(text);
    }

    return {
      roomName: roomName || '',
      jibun: jibun || '',
      agency: agency || '',
      agencyPhone: agencyPhone || '',
      deposit: deposit || '',
      monthlyRent: monthlyRent || '',
      area: area || '',
      pyeong: pyeong || '',
      rooms: rooms || '',
      bathrooms: bathrooms || '',
      building: building || '',
      floor: floor || '',
      moveInDate: moveInDate || '',
      features: features || ''
    };
  } catch (error) {
    console.error('파싱 중 오류:', error);
    return defaultFields;
  }
}

/**
 * 지정된 플랫폼으로 강제 파싱합니다.
 * 자동 감지를 하지 않고, 사용자가 선택한 플랫폼의 파싱 규칙을 적용합니다.
 *
 * @param rawInput - 원본 매물정보
 * @param platform - 강제 적용할 플랫폼 ('TEN' | 'NAVER')
 * @returns 파싱된 4개 필드
 *
 * @example
 * const result = parsePropertyDetailsByPlatform('오피스텔...\n전 화 번 호 02-123-4567', 'TEN');
 * // { roomName: '오피스텔', jibun: '...', agency: '...', agencyPhone: '02-123-4567' }
 */
export function parsePropertyDetailsByPlatform(
  rawInput: string,
  platform: 'TEN' | 'NAVER'
): ParsedPropertyFields {
  try {
    const defaultFields: ParsedPropertyFields = {
      roomName: '',
      jibun: '',
      agency: '',
      agencyPhone: '',
      deposit: '',
      monthlyRent: '',
      area: '',
      pyeong: '',
      rooms: '',
      bathrooms: '',
      building: '',
      floor: '',
      moveInDate: '',
      features: ''
    };

    if (!rawInput || !rawInput.trim()) {
      return defaultFields;
    }

    const text = rawInput.substring(0, 10000); // 최대 10,000자

    let roomName = '';
    let jibun = '';
    let agency = '';
    let agencyPhone = '';
    let deposit = '';
    let monthlyRent = '';
    let area = '';
    let pyeong = '';
    let rooms = '';
    let bathrooms = '';
    let building = '';
    let floor = '';
    let moveInDate = '';
    let features = '';

    if (platform === 'TEN') {
      roomName = extractPropertyName(text);
      jibun = extractJibun(text);
      agency = extractAgencyName(text);
      agencyPhone = extractContactNumber(text);
      deposit = extractDeposit(text);
      monthlyRent = extractMonthlyRent(text);
      area = extractArea(text);
      pyeong = calculatePyeong(area);
      rooms = extractRooms(text);
      bathrooms = extractBathrooms(text);
      building = extractBuilding(text);
      floor = extractFloor(text);
      moveInDate = extractMoveInDate(text);
      features = extractFeatures(text);
    } else if (platform === 'NAVER') {
      roomName = extractPropertyNameNaver(text);
      jibun = extractJibunNaver(text);
      agency = extractAgencyNameNaver(text);
      agencyPhone = extractContactNumberNaver(text);
      deposit = extractDepositNaver(text);
      monthlyRent = extractMonthlyRentNaver(text);
      area = extractAreaNaver(text);
      pyeong = calculatePyeong(area);
      rooms = extractRoomsNaver(text);
      bathrooms = extractBathroomsNaver(text);
      building = extractBuildingNaver(text);
      floor = extractFloorNaver(text);
      moveInDate = extractMoveInDateNaver(text);
      features = extractFeaturesNaver(text);
    }

    return {
      roomName: roomName || '',
      jibun: jibun || '',
      agency: agency || '',
      agencyPhone: agencyPhone || '',
      deposit: deposit || '',
      monthlyRent: monthlyRent || '',
      area: area || '',
      pyeong: pyeong || '',
      rooms: rooms || '',
      bathrooms: bathrooms || '',
      building: building || '',
      floor: floor || '',
      moveInDate: moveInDate || '',
      features: features || ''
    };
  } catch (error) {
    console.error('플랫폼별 파싱 중 오류:', error);
    return {
      roomName: '',
      jibun: '',
      agency: '',
      agencyPhone: '',
      deposit: '',
      monthlyRent: '',
      area: '',
      pyeong: '',
      rooms: '',
      bathrooms: '',
      building: '',
      floor: '',
      moveInDate: '',
      features: ''
    };
  }
}

/**
 * 지정된 플랫폼 형식으로 정리본을 생성합니다.
 *
 * @param rawInput - 원본 매물정보
 * @param platform - 강제 적용할 플랫폼 ('TEN' | 'NAVER')
 * @returns 정리본 형식 텍스트
 *
 * @example
 * const result = generateStructuredPropertyInfoByPlatform('...', 'TEN');
 * // '🏠 매물정보 (TEN 형식)...'
 */
export function generateStructuredPropertyInfoByPlatform(
  rawInput: string,
  platform: 'TEN' | 'NAVER'
): string {
  const fields = parsePropertyDetailsByPlatform(rawInput, platform);

  // 임대료 포맷: "{보증금}/{월세}"
  const rentPrice = (fields.deposit && fields.monthlyRent)
    ? `${fields.deposit}/${fields.monthlyRent}`
    : (fields.deposit || fields.monthlyRent || '미등록');

  // 구조정보 포맷: "29.47㎡ (전용 8.9평)/1방,욕실1"
  const structure = fields.area && fields.rooms && fields.bathrooms
    ? `${fields.area}㎡ (전용 ${fields.pyeong}평)/${fields.rooms}방,욕실${fields.bathrooms}`
    : '미등록';

  // 동/층 포맷: "1동 / 7층"
  const buildingFloor = (fields.building && fields.floor)
    ? `${fields.building} / ${fields.floor}`
    : '미등록';

  // 특징 포맷: "{입주가능일} {특징/비고}"
  const features = [fields.moveInDate, fields.features].filter(f => f).join(' ') || '미등록';

  return `🏠 매물정보
• 소재지: ${fields.roomName || '미등록'}(${fields.jibun || '미등록'})
• 임대료: ${rentPrice}
• 구조정보: ${structure}
• 동/층: ${buildingFloor}
• 특징: ${features}
• 부동산: ${fields.agency || '미등록'}
• 연락처: ${fields.agencyPhone || '미등록'}`;
}
