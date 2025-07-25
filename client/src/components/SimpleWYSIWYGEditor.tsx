import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
} from '@mui/material';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface SimpleWYSIWYGEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  height?: number;
}

const SimpleWYSIWYGEditor: React.FC<SimpleWYSIWYGEditorProps> = ({
  value,
  onChange,
  placeholder = "Start writing your content...",
  readOnly = false,
  height = 400
}) => {
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
      [{ 'align': [] }],
      ['link', 'image', 'video'],
      ['blockquote', 'code-block'],
      ['clean']
    ]
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'script', 'indent', 'direction',
    'color', 'background', 'align', 'link', 'image', 'video', 'code-block'
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
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            '& .ql-editor': {
              minHeight: height - 100,
              fontSize: '14px',
              lineHeight: '1.5'
            },
            '& .ql-toolbar': {
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none'
            }
          }}
        >
          <ReactQuill
            theme="snow"
            value={value}
            onChange={onChange}
            readOnly={readOnly}
            modules={modules}
            formats={formats}
            placeholder={placeholder}
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
          100%
        </Typography>
      </Box>
    </Paper>
  );
};

export default SimpleWYSIWYGEditor;