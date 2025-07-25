import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Divider,
  Select,
  MenuItem,
  FormControl,
  Button,
  Typography,
  Tooltip,
} from '@mui/material';
import {
  Undo as UndoIcon,
  Redo as RedoIcon,
  Print as PrintIcon,
  Spellcheck as SpellcheckIcon,
  ZoomIn as ZoomInIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatUnderlined as UnderlineIcon,
  FormatStrikethrough as StrikethroughIcon,
  FormatColorText as TextColorIcon,
  FormatColorFill as HighlightIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  FormatAlignLeft as AlignLeftIcon,
  FormatAlignCenter as AlignCenterIcon,
  FormatAlignRight as AlignRightIcon,
  FormatAlignJustify as AlignJustifyIcon,
  FormatListBulleted as BulletListIcon,
  FormatListNumbered as NumberedListIcon,
  FormatIndentDecrease as OutdentIcon,
  FormatIndentIncrease as IndentIcon,
  FormatClear as ClearFormattingIcon,
} from '@mui/icons-material';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Custom toolbar module for Quill
const Size = Quill.import('formats/size') as any;
Size.whitelist = ['small', false, 'large', 'huge'];
Quill.register(Size, true);

interface AdvancedWYSIWYGEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  height?: number;
}

const AdvancedWYSIWYGEditor: React.FC<AdvancedWYSIWYGEditorProps> = ({
  value,
  onChange,
  placeholder = "Start writing your content...",
  readOnly = false,
  height = 400
}) => {
  const [zoom, setZoom] = useState(100);
  const [font, setFont] = useState('Arial');
  const [fontSize, setFontSize] = useState('16');
  const quillRef = useRef<ReactQuill>(null);

  const handleUndo = () => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      quill.history.undo();
    }
  };

  const handleRedo = () => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      quill.history.redo();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'align': [] }],
      ['link', 'image', 'video'],
      ['blockquote', 'code-block'],
      ['clean']
    ],
    history: {
      delay: 1000,
      maxStack: 50,
      userOnly: true
    }
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'video',
    'align', 'color', 'background',
    'script', 'code-block'
  ];

  return (
    <Paper elevation={1} sx={{ border: '1px solid #e0e0e0' }}>
      {/* Top Menu Bar */}
      <Box sx={{ 
        bgcolor: '#f8f9fa', 
        borderBottom: '1px solid #e0e0e0',
        px: 2,
        py: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            File
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Edit
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Insert
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Format
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tools
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Help
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          size="small"
          sx={{ 
            bgcolor: '#1976d2',
            textTransform: 'none',
            borderRadius: '4px',
            minWidth: '80px'
          }}
        >
          Preview
        </Button>
      </Box>

      {/* Extra Actions Bar */}
      <Box sx={{ 
        bgcolor: '#f8f9fa', 
        borderBottom: '1px solid #e0e0e0',
        px: 2,
        py: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 2
      }}>
        <Tooltip title="Undo">
          <IconButton size="small" onClick={handleUndo} disabled={readOnly}>
            <UndoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Redo">
          <IconButton size="small" onClick={handleRedo} disabled={readOnly}>
            <RedoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Print">
          <IconButton size="small" onClick={handlePrint}>
            <PrintIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        
        {/* Zoom Control */}
        <FormControl size="small" sx={{ minWidth: 80 }}>
          <Select
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            displayEmpty
            inputProps={{ 'aria-label': 'Zoom' }}
          >
            <MenuItem value={50}>50%</MenuItem>
            <MenuItem value={75}>75%</MenuItem>
            <MenuItem value={100}>100%</MenuItem>
            <MenuItem value={125}>125%</MenuItem>
            <MenuItem value={150}>150%</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Editor Area */}
      <Box sx={{ 
        bgcolor: '#f8f9fa',
        p: 2,
        minHeight: height
      }}>
        <Paper 
          elevation={0} 
          sx={{ 
            bgcolor: 'white',
            minHeight: height - 32,
            border: '1px solid #e0e0e0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={value}
            onChange={onChange}
            readOnly={readOnly}
            modules={modules}
            formats={formats}
            placeholder={placeholder}
            style={{
              height: height - 150,
              border: 'none'
            }}
          />
        </Paper>
      </Box>

      {/* Status Bar */}
      <Box sx={{ 
        bgcolor: '#f8f9fa',
        borderTop: '1px solid #e0e0e0',
        px: 2,
        py: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="caption" color="text.secondary">
          {value.replace(/<[^>]*>/g, '').length} words
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {zoom}%
        </Typography>
      </Box>
    </Paper>
  );
};

export default AdvancedWYSIWYGEditor;