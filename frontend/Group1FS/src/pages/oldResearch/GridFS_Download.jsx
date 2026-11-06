import { useState } from 'react';
import api from '../../utils/axios.js';

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
            const res = await api.get(`/fsfiles/download/${fileId.trim()}`, {
                responseType: 'blob',
            });

            // 1. Extract filename from Content-Disposition header
            const contentDisposition = res.headers['content-disposition'];
            let filename = `file_${fileId.trim()}`; // Fallback if header is missing

            if (contentDisposition) {
                // Decodes filenames (including spaces & special characters)
                const match = contentDisposition.match(/filename="?([^";]+)"?/);
                if (match && match[1]) {
                    filename = decodeURIComponent(match[1]);
                }
            }

            // 2. Trigger browser file download
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();

            // 3. Cleanup
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