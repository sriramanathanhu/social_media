import React from 'react';
import { Box, Typography, LinearProgress, Chip } from '@mui/material';
import { useCharacterLimits, CharacterLimitInfo } from '../../hooks/useCharacterLimits';

interface CharacterLimitDisplayProps {
  content: string;
  selectedPlatforms: string[];
}

const CharacterLimitDisplay: React.FC<CharacterLimitDisplayProps> = React.memo(({ 
  content, 
  selectedPlatforms 
}) => {
  const { platformLimits, summary, overallStatus } = useCharacterLimits(content, selectedPlatforms);

  if (platformLimits.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="body2" color={summary.color} gutterBottom>
        {summary.text}
      </Typography>
      
      {platformLimits.length > 1 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
          {platformLimits.map((platform) => (
            <PlatformLimitChip key={platform.platform} platform={platform} />
          ))}
        </Box>
      )}
      
      {platformLimits.length === 1 && (
        <LinearProgress
          variant="determinate"
          value={Math.min(platformLimits[0].percentage, 100)}
          color={platformLimits[0].severity === 'error' ? 'error' : 
                 platformLimits[0].severity === 'warning' ? 'warning' : 'primary'}
          sx={{ mt: 1 }}
        />
      )}
    </Box>
  );
});

const PlatformLimitChip: React.FC<{ platform: CharacterLimitInfo }> = React.memo(({ platform }) => {
  const getChipColor = () => {
    if (platform.isOverLimit) return 'error';
    if (platform.severity === 'warning') return 'warning';
    return 'default';
  };

  return (
    <Chip
      label={`${platform.platform.toUpperCase()}: ${platform.current}/${platform.limit}`}
      size="small"
      color={getChipColor()}
      variant={platform.isOverLimit ? 'filled' : 'outlined'}
    />
  );
});

CharacterLimitDisplay.displayName = 'CharacterLimitDisplay';
PlatformLimitChip.displayName = 'PlatformLimitChip';

export default CharacterLimitDisplay;