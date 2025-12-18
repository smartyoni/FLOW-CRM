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
