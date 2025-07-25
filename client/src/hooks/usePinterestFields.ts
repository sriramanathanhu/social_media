import { useState, useCallback, useEffect } from 'react';

export interface PinterestBoard {
  id: string;
  name: string;
  description?: string;
  url: string;
  privacy: 'public' | 'protected' | 'secret';
}

export const usePinterestFields = () => {
  const [pinterestTitle, setPinterestTitle] = useState('');
  const [pinterestDescription, setPinterestDescription] = useState('');
  const [pinterestBoard, setPinterestBoard] = useState('');
  const [pinterestDestinationUrl, setPinterestDestinationUrl] = useState('');
  const [pinterestBoards, setPinterestBoards] = useState<PinterestBoard[]>([]);

  const updateField = useCallback((field: string, value: string) => {
    switch (field) {
      case 'title':
        setPinterestTitle(value);
        break;
      case 'description':
        setPinterestDescription(value);
        break;
      case 'board':
        setPinterestBoard(value);
        break;
      case 'destinationUrl':
        setPinterestDestinationUrl(value);
        break;
      default:
        break;
    }
  }, []);

  const resetFields = useCallback(() => {
    setPinterestTitle('');
    setPinterestDescription('');
    setPinterestBoard('');
    setPinterestDestinationUrl('');
  }, []);

  const validateFields = useCallback(() => {
    const errors: string[] = [];
    
    if (!pinterestTitle.trim()) {
      errors.push('Pinterest title is required');
    }
    
    if (!pinterestDescription.trim()) {
      errors.push('Pinterest description is required');
    }
    
    if (!pinterestBoard) {
      errors.push('Pinterest board is required');
    }
    
    if (pinterestDestinationUrl && !isValidUrl(pinterestDestinationUrl)) {
      errors.push('Pinterest destination URL must be valid');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [pinterestTitle, pinterestDescription, pinterestBoard, pinterestDestinationUrl]);

  const getPinterestData = useCallback(() => {
    return {
      title: pinterestTitle,
      description: pinterestDescription,
      board: pinterestBoard,
      destinationUrl: pinterestDestinationUrl
    };
  }, [pinterestTitle, pinterestDescription, pinterestBoard, pinterestDestinationUrl]);

  return {
    pinterestTitle,
    pinterestDescription,
    pinterestBoard,
    pinterestDestinationUrl,
    pinterestBoards,
    setPinterestBoards,
    updateField,
    resetFields,
    validateFields,
    getPinterestData
  };
};

// Helper function to validate URLs
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export default usePinterestFields;