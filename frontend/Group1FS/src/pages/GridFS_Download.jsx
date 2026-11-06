import { useState } from 'react';
import api from '../utils/axios.js';

function Co_gridFS_Download() {
    const [fileId, setFileId] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const handleDownload = async (e) => {
        e.preventDefault();

        if (!fileId.trim()) {
            setErrorMsg('Please enter a valid File ID.');
            return;
        }

        try {
            setErrorMsg('');
            // Request binary blob data from backend stream endpoint
            const res = await api.get(`/fsfiles/${fileId.trim()}`, {
                responseType: 'blob',
            });

            // Extract filename from headers or default fallback
            const contentDisposition = res.headers['content-disposition'];
            let filename = `downloaded_file_${fileId}`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match && match[1]) {
                    filename = match[1];
                }
            }

            // Create temporary download link in DOM
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();

            // Cleanup DOM object
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setErrorMsg(`Download failed: ${err.response?.data?.msg || err.message}`);
        }
    };

    return (
        <div>
            <form onSubmit={handleDownload}>
                <h2>Download File</h2>

                <label htmlFor="FSfileID">Download file ID: </label>
                <input 
                    type="text" 
                    id="FSfileID" 
                    name="FSfileID"
                    value={fileId}
                    onChange={(e) => setFileId(e.target.value)}
                /><br/><br/>

                <button type="submit">Download file</button><br/><br/>
            </form>

            {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}
        </div>
    );
}

export default Co_gridFS_Download;