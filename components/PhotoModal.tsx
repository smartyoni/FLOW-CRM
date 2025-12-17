import React, { useRef } from 'react';

interface PhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCapture: (files: File[]) => void;
}

export const PhotoModal: React.FC<PhotoModalProps> = ({ isOpen, onClose, onPhotoCapture }) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleAlbumClick = () => {
    albumInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      onPhotoCapture(files);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
      <div className="w-full bg-white rounded-t-lg p-4 animate-in slide-in-from-bottom">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">사진 추가</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2">
          {/* 카메라 - iOS에서 작동 */}
          <button
            onClick={handleCameraClick}
            className="w-full py-3 px-4 border border-gray-300 rounded-lg text-center text-gray-700 hover:bg-gray-50 font-semibold flex items-center justify-center gap-2"
          >
            <i className="fas fa-camera"></i>
            사진 촬영
          </button>

          {/* 앨범 선택 */}
          <button
            onClick={handleAlbumClick}
            className="w-full py-3 px-4 border border-gray-300 rounded-lg text-center text-gray-700 hover:bg-gray-50 font-semibold flex items-center justify-center gap-2"
          >
            <i className="fas fa-image"></i>
            앨범에서 선택
          </button>

          {/* 취소 */}
          <button
            onClick={onClose}
            className="w-full py-3 px-4 border border-red-300 rounded-lg text-center text-red-600 hover:bg-red-50 font-semibold"
          >
            취소
          </button>
        </div>

        {/* 숨겨진 파일 입력 */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={albumInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};
