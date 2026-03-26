import { useState } from 'react';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';
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
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setMessage({
        type: 'error',
        text: 'Please select a file first',
      });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await uploadFile('/api/v1/finance/overview/upload', selectedFile);
      
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
    <div className="csv-upload-container">
      <div className="csv-upload-card">
        <h3>Upload CSV File</h3>
        <p className="text-muted">Import saving plans from a CSV file</p>

        <Form onSubmit={handleUpload}>
          <Form.Group controlId="csv-file-input" className="mb-3">
            <Form.Label>Select CSV File</Form.Label>
            <Form.Control
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={loading}
              isInvalid={message.type === 'error'}
            />
            {selectedFile && (
              <Form.Text className="d-block mt-2">
                Selected: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(2)} KB)
              </Form.Text>
            )}
          </Form.Group>

          <Button
            variant="primary"
            type="submit"
            disabled={!selectedFile || loading}
            className="w-100"
          >
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Uploading...
              </>
            ) : (
              'Upload CSV'
            )}
          </Button>
        </Form>

        {message.text && (
          <Alert
            variant={message.type === 'success' ? 'success' : 'danger'}
            className="mt-3 mb-0"
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
