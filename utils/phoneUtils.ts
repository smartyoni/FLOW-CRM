/**
 * 연락처 번호가 유효한지 확인합니다.
 * 휴대폰, 유선번호 형식을 인식합니다.
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  // 숫자만 추출
  const digits = phone.replace(/\D/g, '');
  // 10-11자리 숫자면 유효한 번호
  return digits.length >= 10 && digits.length <= 11;
}

/**
 * 연락처 번호에서 숫자만 추출합니다.
 */
export function extractDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * SMS 링크를 생성합니다.
 */
export function generateSmsLink(phone: string): string {
  const digits = extractDigits(phone);
  return `sms:${digits}`;
}

/**
 * 전화 링크를 생성합니다.
 */
export function generatePhoneLink(phone: string): string {
  const digits = extractDigits(phone);
  return `tel:${digits}`;
}

/**
 * 전화번호를 자동으로 포맷팅합니다.
 * 02-3661-6661 또는 010-2019-2463 형식으로 자동 변환
 */
export function formatPhoneNumber(phone: string): string {
  // 숫자만 추출
  const digits = phone.replace(/\D/g, '');

  // 숫자가 없으면 원래 값 반환
  if (!digits) return phone;

  // 10자리 미만이면 포맷팅하지 않음
  if (digits.length < 10) return digits;

  // 11자리 이상이면 처음 11자리만 사용
  const normalizedDigits = digits.slice(0, 11);

  // 첫번째 자리가 0이 아니면 포맷팅하지 않음
  if (!normalizedDigits.startsWith('0')) return normalizedDigits;

  // 02 또는 031/032/033/041/042 등의 유선번호
  if (normalizedDigits.startsWith('02')) {
    // 02-XXXX-XXXX (2 + 4 + 4 = 10자리)
    if (normalizedDigits.length === 10) {
      return `${normalizedDigits.slice(0, 2)}-${normalizedDigits.slice(2, 6)}-${normalizedDigits.slice(6)}`;
    }
    // 02-XXXX-XXXX (2 + 4 + 5 = 11자리)
    if (normalizedDigits.length === 11) {
      return `${normalizedDigits.slice(0, 2)}-${normalizedDigits.slice(2, 6)}-${normalizedDigits.slice(6)}`;
    }
  } else if (normalizedDigits.match(/^0(3[1-3]|4[1-2]|5[0-5]|6)\d/)) {
    // 0XX-XXXX-XXXX 형식의 다른 유선번호 (3 + 4 + 3 또는 3 + 4 + 4)
    if (normalizedDigits.length === 10) {
      return `${normalizedDigits.slice(0, 3)}-${normalizedDigits.slice(3, 7)}-${normalizedDigits.slice(7)}`;
    }
    if (normalizedDigits.length === 11) {
      return `${normalizedDigits.slice(0, 3)}-${normalizedDigits.slice(3, 7)}-${normalizedDigits.slice(7)}`;
    }
  } else if (normalizedDigits.match(/^01[0-9]/)) {
    // 핸드폰 번호: 010-XXXX-XXXX (3 + 4 + 4 = 11자리)
    if (normalizedDigits.length === 11) {
      return `${normalizedDigits.slice(0, 3)}-${normalizedDigits.slice(3, 7)}-${normalizedDigits.slice(7)}`;
    }
    // 10자리인 경우 (01X로 시작하는 구형 폰번, 예: 010-9999-9999)
    if (normalizedDigits.length === 10) {
      return `${normalizedDigits.slice(0, 3)}-${normalizedDigits.slice(3, 6)}-${normalizedDigits.slice(6)}`;
    }
  }

  // 위 형식에 맞지 않으면 원래 숫자만 반환
  return normalizedDigits;
}
