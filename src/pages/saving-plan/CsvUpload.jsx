import { useState } from 'react';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';
import { FiUpload } from 'react-icons/fi';
import { uploadFile } from '../../api/client';
import './CsvUpload.css';

export default function CsvUpload({ onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setMessage({
          type: 'error',
          text: 'Please select a CSV file (.csv)',
        });
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setMessage({ type: '', text: '' });
      
      // Auto-upload on file selection
      performUpload(file);
    }
  };

  const performUpload = async (file) => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await uploadFile('/api/v1/finance/overview/upload', file);
      
      setMessage({
        type: 'success',
        text: result || 'File uploaded successfully!',
      });

      setSelectedFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('csv-file-input');
      if (fileInput) {
        fileInput.value = '';
      }

      // Call callback to refresh data if provided
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to upload file',
      });
    } finally {
      setLoading(false);
    }
  };

return (
    <div className="csv-upload-form">
        <div className="csv-upload-widget">
            <div className="csv-upload-input-group">
                <div className="csv-upload-icon">
                    <FiUpload size={12} />
                </div>
                <Form.Group controlId="csv-file-input" className="csv-upload-field">
                    <Form.Control
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        disabled={loading}
                        className="csv-file-input"
                        title="Select a CSV file to upload"
                    />
                    <label className="csv-upload-label" title="Upload CSV file to import saving plans">
                        {loading ? (
                            <span className="csv-uploading">
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden="true"
                                />
                            </span>
                        ) : selectedFile ? (
                            <span className="csv-selected-file">
                                {selectedFile.name}
                                <span className="csv-file-size">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                            </span>
                        ) : (
                            <span className="csv-default-text">Click to import CSV/Excel</span>
                        )}
                    </label>
                </Form.Group>
            </div>

            {message.text && (
                <Alert
                    variant={message.type === 'success' ? 'success' : 'danger'}
                    className="csv-upload-alert"
                    dismissible
                    onClose={() => setMessage({ type: '', text: '' })}
                >
                    {message.text}
                </Alert>
            )}
        </div>
    </div>
);
}
