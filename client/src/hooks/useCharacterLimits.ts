import { useMemo } from 'react';

// Platform character limits
const PLATFORM_LIMITS = {
  x: 280,
  twitter: 280,
  mastodon: 500, // Default, can vary by instance
  bluesky: 300,
  facebook: 63206, // Very high limit
  instagram: 2200,
  pinterest: 500, // For descriptions
} as const;

export interface CharacterLimitInfo {
  platform: string;
  limit: number;
  current: number;
  remaining: number;
  percentage: number;
  isOverLimit: boolean;
  severity: 'success' | 'warning' | 'error';
}

export const useCharacterLimits = (
  content: string,
  selectedPlatforms: string[]
) => {
  // Calculate character limits for each selected platform
  const platformLimits = useMemo(() => {
    return selectedPlatforms.map(platform => {
      const limit = PLATFORM_LIMITS[platform as keyof typeof PLATFORM_LIMITS] || 280;
      const current = content.length;
      const remaining = limit - current;
      const percentage = (current / limit) * 100;
      const isOverLimit = current > limit;
      
      let severity: 'success' | 'warning' | 'error' = 'success';
      if (isOverLimit) {
        severity = 'error';
      } else if (percentage > 80) {
        severity = 'warning';
      }

      return {
        platform,
        limit,
        current,
        remaining,
        percentage,
        isOverLimit,
        severity
      } as CharacterLimitInfo;
    });
  }, [content, selectedPlatforms]);

  // Get the most restrictive limit
  const mostRestrictive = useMemo(() => {
    if (platformLimits.length === 0) return null;
    
    return platformLimits.reduce((min, current) => 
      current.limit < min.limit ? current : min
    );
  }, [platformLimits]);

  // Check if any platform is over limit
  const hasOverLimit = useMemo(() => {
    return platformLimits.some(platform => platform.isOverLimit);
  }, [platformLimits]);

  // Get overall status
  const overallStatus = useMemo(() => {
    if (hasOverLimit) return 'error';
    if (platformLimits.some(p => p.severity === 'warning')) return 'warning';
    return 'success';
  }, [hasOverLimit, platformLimits]);

  // Get summary for UI display
  const summary = useMemo(() => {
    if (platformLimits.length === 0) {
      return {
        text: 'No platforms selected',
        color: 'text.secondary'
      };
    }

    if (mostRestrictive) {
      const { current, limit, platform, isOverLimit } = mostRestrictive;
      
      if (isOverLimit) {
        return {
          text: `${current}/${limit} - ${Math.abs(limit - current)} characters over limit (${platform})`,
          color: 'error.main'
        };
      } else {
        return {
          text: `${current}/${limit} characters (${platform})`,
          color: current / limit > 0.8 ? 'warning.main' : 'text.secondary'
        };
      }
    }

    return {
      text: 'No character limit',
      color: 'text.secondary'
    };
  }, [platformLimits, mostRestrictive]);

  return {
    platformLimits,
    mostRestrictive,
    hasOverLimit,
    overallStatus,
    summary
  };
};

export default useCharacterLimits;