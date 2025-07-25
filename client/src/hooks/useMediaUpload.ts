import { useState, useCallback } from 'react';
import { compressImageForBluesky, needsCompressionForBluesky, getCompressionInfo } from '../utils/imageCompression';
import logger from '../utils/logger';

export const useMediaUpload = () => {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<File[]>([]);
  const [mediaProcessing, setMediaProcessing] = useState(false);

  const handleImageUpload = useCallback(async (files: FileList | File[], hasBluesky: boolean = false) => {
    const fileArray = Array.from(files);
    setMediaProcessing(true);
    
    try {
      const processedImages: File[] = [];
      
      for (const file of fileArray) {
        if (hasBluesky && needsCompressionForBluesky(file)) {
          logger.debug(`Compressing ${file.name} for Bluesky (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
          
          const compressedFile = await compressImageForBluesky(file);
          const info = getCompressionInfo(file.size, compressedFile.size);
          logger.debug(`Compression completed: ${info.message}`);
          
          processedImages.push(compressedFile);
        } else {
          processedImages.push(file);
        }
      }
      
      setSelectedImages(prev => [...prev, ...processedImages]);
    } catch (error) {
      logger.error('Failed to process images:', error);
      throw error;
    } finally {
      setMediaProcessing(false);
    }
  }, []);

  const handleVideoUpload = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    setSelectedVideos(prev => [...prev, ...fileArray]);
  }, []);

  const removeImage = useCallback((index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const removeVideo = useCallback((index: number) => {
    setSelectedVideos(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearAllMedia = useCallback(() => {
    setSelectedImages([]);
    setSelectedVideos([]);
  }, []);

  const getTotalMediaSize = useCallback(() => {
    const imageSize = selectedImages.reduce((sum, file) => sum + file.size, 0);
    const videoSize = selectedVideos.reduce((sum, file) => sum + file.size, 0);
    return imageSize + videoSize;
  }, [selectedImages, selectedVideos]);

  const getMediaSummary = useCallback(() => {
    return {
      imageCount: selectedImages.length,
      videoCount: selectedVideos.length,
      totalSize: getTotalMediaSize(),
      totalSizeMB: (getTotalMediaSize() / 1024 / 1024).toFixed(2)
    };
  }, [selectedImages.length, selectedVideos.length, getTotalMediaSize]);

  return {
    selectedImages,
    selectedVideos,
    mediaProcessing,
    handleImageUpload,
    handleVideoUpload,
    removeImage,
    removeVideo,
    clearAllMedia,
    getTotalMediaSize,
    getMediaSummary,
    setSelectedImages,
    setSelectedVideos
  };
};

export default useMediaUpload;