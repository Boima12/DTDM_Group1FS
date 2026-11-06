import { useState } from 'react';
import api from '../utils/axios.js';

function Co_gridFS_List() {
    const [files, setFiles] = useState([]);
    const [error, setError] = useState('');

    const handleList = async () => {
        try {
            const res = await api.get('/fsfiles/list/allFiles');
            setFiles(res.data.files);
            setError('');
        } catch (err) {
            setError(`Error: ${err.response?.data?.msg || err.message}`);
        }
    };

    return (
        <div>
            <h2>List Files</h2>

            {error && <p style={{ color: 'red' }}>{error}</p>}

            <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th>File ID</th>
                        <th>Filename</th>
                        <th>Size (Bytes)</th>
                        <th>Upload Date</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    {files.length > 0 ? (
                        files.map((file) => (
                            <tr key={file._id}>
                                <td>{file._id}</td>
                                <td>{file.filename}</td>
                                <td>{file.length}</td>
                                <td>{new Date(file.uploadDate).toLocaleString()}</td>
                                <td>{file.metadata?.description || 'N/A'}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="5" style={{ textAlign: 'center' }}>
                                No files loaded yet. Click &quot;List files&quot;.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table><br/><br/>

            <button type="button" onClick={handleList}>List files</button><br/><br/>
        </div>
    );
}

export default Co_gridFS_List;