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
