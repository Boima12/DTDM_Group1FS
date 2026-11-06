import { useState } from 'react';
import api from '../utils/axios.js';

function Co_gridFS_Rename() {
    const [fileId, setFileId] = useState('');
    const [filename, setFilename] = useState('');
    const [statusMsg, setStatusMsg] = useState('');

    const handleRename = async (e) => {
        e.preventDefault();

        if (!fileId.trim() || !filename.trim()) {
            setStatusMsg('Please provide both File ID and new filename.');
            return;
        }

        try {
            const res = await api.put(`/fsfiles/update/rename/${fileId.trim()}`, {
                filename: filename.trim()
            });

            setStatusMsg(`Success: ${res.data.msg}`);
            setFileId('');
            setFilename('');
        } catch (err) {
            setStatusMsg(`Error: ${err.response?.data?.msg || err.message}`);
        }
    };

    return (
        <div>
            <form onSubmit={handleRename}>
                <h2>Rename File</h2>

                <label htmlFor="FSfileID">Rename file ID: </label>
                <input 
                    type="text" 
                    id="FSfileID" 
                    name="FSfileID"
                    value={fileId}
                    onChange={(e) => setFileId(e.target.value)}
                /><br/><br/>

                <label htmlFor="newFilename">New Filename: </label>
                <input 
                    type="text" 
                    id="newFilename" 
                    name="newFilename"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                /><br/><br/>

                <button type="submit">Rename file</button><br/><br/>
            </form>

            {statusMsg && <p>{statusMsg}</p>}
        </div>
    );
}

export default Co_gridFS_Rename;