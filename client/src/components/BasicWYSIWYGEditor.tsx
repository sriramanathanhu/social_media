import React from 'react';
import {
  Box,
  Typography,
} from '@mui/material';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface BasicWYSIWYGEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  height?: number;
}

const BasicWYSIWYGEditor: React.FC<BasicWYSIWYGEditorProps> = ({
  value,
  onChange,
  placeholder = "Start writing your content...",
  readOnly = false,
  height = 300
}) => {
  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
        Rich Text Editor
      </Typography>
      <Box sx={{ 
        border: '1px solid #ccc',
        borderRadius: '4px',
        '& .ql-editor': {
          minHeight: `${height - 80}px`,
          fontSize: '14px',
          lineHeight: '1.5'
        },
        '& .ql-toolbar': {
          borderBottom: '1px solid #ccc'
        }
      }}>
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          placeholder={placeholder}
          modules={{
            toolbar: [
              [{ 'header': [1, 2, 3, false] }],
              ['bold', 'italic', 'underline', 'strike'],
              [{ 'list': 'ordered'}, { 'list': 'bullet' }],
              [{ 'color': [] }, { 'background': [] }],
              ['link', 'image'],
              ['clean']
            ]
          }}
          formats={[
            'header', 'bold', 'italic', 'underline', 'strike',
            'list', 'bullet', 'color', 'background', 'link', 'image'
          ]}
        />
      </Box>
    </Box>
  );
};

export default BasicWYSIWYGEditor;