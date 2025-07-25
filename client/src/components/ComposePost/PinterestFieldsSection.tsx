import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Grid
} from '@mui/material';
import { PinterestBoard } from '../../hooks/usePinterestFields';

interface PinterestFieldsSectionProps {
  title: string;
  description: string;
  board: string;
  destinationUrl: string;
  boards: PinterestBoard[];
  onFieldUpdate: (field: string, value: string) => void;
}

const PinterestFieldsSection: React.FC<PinterestFieldsSectionProps> = React.memo(({
  title,
  description,
  board,
  destinationUrl,
  boards,
  onFieldUpdate
}) => {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Configure Pinterest-specific settings for your pin
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Pin Title"
            value={title}
            onChange={(e) => onFieldUpdate('title', e.target.value)}
            placeholder="Enter a catchy title for your pin"
            required
            inputProps={{ maxLength: 100 }}
            helperText={`${title.length}/100 characters`}
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required>
            <InputLabel>Board</InputLabel>
            <Select
              value={board}
              onChange={(e) => onFieldUpdate('board', e.target.value)}
              label="Board"
            >
              {boards.length === 0 ? (
                <MenuItem value="" disabled>
                  No boards available
                </MenuItem>
              ) : (
                boards.map((boardItem) => (
                  <MenuItem key={boardItem.id} value={boardItem.id}>
                    {boardItem.name}
                    {boardItem.privacy !== 'public' && ` (${boardItem.privacy})`}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Pin Description"
            value={description}
            onChange={(e) => onFieldUpdate('description', e.target.value)}
            placeholder="Describe your pin (this helps with discovery)"
            required
            inputProps={{ maxLength: 500 }}
            helperText={`${description.length}/500 characters`}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Destination URL (Optional)"
            value={destinationUrl}
            onChange={(e) => onFieldUpdate('destinationUrl', e.target.value)}
            placeholder="https://example.com"
            type="url"
            helperText="Where should people go when they click your pin?"
          />
        </Grid>
      </Grid>
    </Box>
  );
});

PinterestFieldsSection.displayName = 'PinterestFieldsSection';

export default PinterestFieldsSection;