import { useState, useCallback, useMemo } from 'react';
import { Logger } from '../../../infrastructure/logging/Logger';

export type MediaErrorType = 'camera' | 'microphone' | 'all' | null;

export interface MediaErrorState {
  error: MediaErrorType;
  message: string;
  timestamp: number;
}

/**
 * Hook to handle media access errors and provide user-friendly feedback
 */
export function useMediaErrorHandler() {
  const [errorState, setErrorState] = useState<MediaErrorState | null>(null);
  
  const logger = useMemo(() => new Logger({ service: 'MediaErrorHandler' }), []);

  /**
   * Handle media access errors and determine the appropriate error type
   */
  const handleMediaError = useCallback((error: unknown, context?: string) => {
    logger.error('Media access error', error as Error, { context });

    let errorType: MediaErrorType = 'all';
    let message = 'Unknown media error';

    if (error instanceof Error) {
      const errorName = error.name;
      const errorMessage = error.message.toLowerCase();

      // Determine error type based on error details
      if (errorName === 'NotAllowedError') {
        if (errorMessage.includes('video') || errorMessage.includes('camera')) {
          errorType = 'camera';
          message = 'Camera access denied by user';
        } else if (errorMessage.includes('audio') || errorMessage.includes('microphone')) {
          errorType = 'microphone';
          message = 'Microphone access denied by user';
        } else {
          errorType = 'all';
          message = 'Media access denied by user';
        }
      } else if (errorName === 'NotFoundError') {
        if (errorMessage.includes('video') || errorMessage.includes('camera')) {
          errorType = 'camera';
          message = 'No camera device found';
        } else if (errorMessage.includes('audio') || errorMessage.includes('microphone')) {
          errorType = 'microphone';
          message = 'No microphone device found';
        } else {
          errorType = 'all';
          message = 'No media devices found';
        }
      } else if (errorName === 'NotReadableError') {
        if (errorMessage.includes('video') || errorMessage.includes('camera')) {
          errorType = 'camera';
          message = 'Camera is being used by another application';
        } else if (errorMessage.includes('audio') || errorMessage.includes('microphone')) {
          errorType = 'microphone';
          message = 'Microphone is being used by another application';
        } else {
          errorType = 'all';
          message = 'Media devices are being used by another application';
        }
      } else if (errorName === 'OverconstrainedError') {
        errorType = 'camera';
        message = 'Camera constraints cannot be satisfied';
      } else if (errorMessage.includes('starting videoinput failed')) {
        errorType = 'camera';
        message = 'Failed to start camera input';
      }
    }

    setErrorState({
      error: errorType,
      message,
      timestamp: Date.now(),
    });

    return errorType;
  }, [logger]);

  /**
   * Handle successful media access (clears error state)
   */
  const handleMediaSuccess = useCallback((hasAudio: boolean, hasVideo: boolean) => {
    logger.info('Media access successful', { hasAudio, hasVideo });
    
    // Clear error state on successful access
    setErrorState(null);
    
    // If we only got audio but expected video, show camera error
    if (hasAudio && !hasVideo) {
      setErrorState({
        error: 'camera',
        message: 'Camera not available, using audio only',
        timestamp: Date.now(),
      });
    }
  }, [logger]);

  /**
   * Dismiss the current error
   */
  const dismissError = useCallback(() => {
    setErrorState(null);
  }, []);

  /**
   * Check if there's a specific error type
   */
  const hasError = useCallback((type?: MediaErrorType) => {
    if (!errorState) return false;
    if (!type) return true;
    return errorState.error === type;
  }, [errorState]);

  /**
   * Get user-friendly error message
   */
  const getErrorMessage = useCallback(() => {
    if (!errorState) return null;

    switch (errorState.error) {
      case 'camera':
        return 'Không thể truy cập camera. Bạn vẫn có thể tham gia cuộc họp chỉ với âm thanh.';
      case 'microphone':
        return 'Không thể truy cập microphone. Bạn sẽ không thể nói trong cuộc họp.';
      case 'all':
        return 'Không thể truy cập camera và microphone. Vui lòng kiểm tra quyền truy cập.';
      default:
        return 'Có lỗi xảy ra khi truy cập thiết bị media.';
    }
  }, [errorState]);

  /**
   * Get troubleshooting suggestions
   */
  const getSuggestions = useCallback(() => {
    if (!errorState) return [];

    switch (errorState.error) {
      case 'camera':
        return [
          'Kiểm tra camera có được kết nối không',
          'Cho phép truy cập camera trong trình duyệt',
          'Đóng các ứng dụng khác đang sử dụng camera',
          'Thử tải lại trang',
        ];
      case 'microphone':
        return [
          'Kiểm tra microphone có được kết nối không',
          'Cho phép truy cập microphone trong trình duyệt',
          'Kiểm tra âm lượng hệ thống',
          'Thử tải lại trang',
        ];
      case 'all':
        return [
          'Nhấp vào biểu tượng khóa/camera trên thanh địa chỉ',
          'Chọn "Cho phép" cho camera và microphone',
          'Tải lại trang sau khi cấp quyền',
          'Kiểm tra kết nối thiết bị',
        ];
      default:
        return ['Thử tải lại trang', 'Kiểm tra kết nối thiết bị'];
    }
  }, [errorState]);

  return {
    errorState,
    handleMediaError,
    handleMediaSuccess,
    dismissError,
    hasError,
    getErrorMessage,
    getSuggestions,
  };
} 