import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * Upload a photo to Firebase Storage
 * @returns Download URL for the uploaded photo
 */
export const uploadPhoto = async (
  file: File,
  customerId: string,
  meetingId: string,
  propertyId: string,
  photoIndex: number
): Promise<string> => {
  try {
    const photoPath = `customers/${customerId}/meetings/${meetingId}/properties/${propertyId}/${photoIndex}.jpg`;
    const storageRef = ref(storage, photoPath);

    // Upload file
    const snapshot = await uploadBytes(storageRef, file);

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw error;
  }
};

/**
 * Upload multiple photos (batch)
 */
export const uploadPhotos = async (
  files: File[],
  customerId: string,
  meetingId: string,
  propertyId: string,
  startIndex: number = 0
): Promise<string[]> => {
  try {
    const uploadPromises = files.map((file, idx) =>
      uploadPhoto(file, customerId, meetingId, propertyId, startIndex + idx)
    );

    return Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading photos:', error);
    throw error;
  }
};

/**
 * Delete a photo from Firebase Storage
 */
export const deletePhoto = async (photoUrl: string): Promise<void> => {
  try {
    // Extract path from URL
    // URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media...
    // We need to extract the path and decode it
    const pathMatch = photoUrl.match(/o\/([^?]+)/);
    if (!pathMatch) {
      console.warn('Cannot extract path from photo URL:', photoUrl);
      return;
    }

    const encodedPath = pathMatch[1];
    const photoPath = decodeURIComponent(encodedPath);
    const photoRef = ref(storage, photoPath);

    await deleteObject(photoRef);
  } catch (error) {
    console.error('Error deleting photo:', error);
    // Don't throw - deletion failures shouldn't block other operations
  }
};

/**
 * Delete all photos for a property
 */
export const deletePropertyPhotos = async (
  customerId: string,
  meetingId: string,
  propertyId: string,
  photoUrls: string[]
): Promise<void> => {
  try {
    const deletePromises = photoUrls.map(url => deletePhoto(url));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error deleting property photos:', error);
    // Don't throw - failures shouldn't block
  }
};

/**
 * Convert File to Base64 (for optimistic UI preview)
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Compress image and convert to Base64 (Firestore 1MB document limit)
 * Automatically handles image compression to prevent Firestore document size limit (1MB)
 */
import imageCompression from 'browser-image-compression';

export const compressAndConvertToBase64 = async (file: File): Promise<string> => {
  // 압축 옵션 (Firestore 1MB 문서 크기 제한 고려)
  const options = {
    maxSizeMB: 0.2,              // 최대 200KB
    maxWidthOrHeight: 1920,      // 최대 해상도
    useWebWorker: false,         // 모바일 호환성을 위해 비활성화
    fileType: 'image/jpeg',      // JPEG 변환
    initialQuality: 0.8,         // 초기 품질 80%
  };

  try {
    console.log('🖼️ Original file size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
    console.log('📝 File type:', file.type);

    // 1. 이미지 압축
    console.log('⏳ Starting image compression...');
    const compressedFile = await imageCompression(file, options);
    console.log('✅ Compressed file size:', (compressedFile.size / 1024).toFixed(2), 'KB');
    console.log('✅ Compressed file type:', compressedFile.type);

    // 2. Base64 변환
    console.log('⏳ Converting to Base64...');
    const base64 = await fileToBase64(compressedFile);
    const base64Size = base64.length * 0.75 / 1024; // Base64 → bytes 변환
    console.log('📦 Base64 size:', base64Size.toFixed(2), 'KB');

    // 3. 크기 검증 (안전 여유 300KB)
    const MAX_BASE64_SIZE = 300 * 1024; // 300KB
    if (base64.length > MAX_BASE64_SIZE) {
      throw new Error(`압축 후에도 파일이 너무 큽니다. (${base64Size.toFixed(0)}KB > 300KB)`);
    }

    console.log('✅ Compression and conversion complete!');
    return base64;
  } catch (error) {
    console.error('❌ Image compression failed:', error);
    throw new Error('이미지 압축에 실패했습니다. 다른 사진을 선택해주세요.');
  }
};
