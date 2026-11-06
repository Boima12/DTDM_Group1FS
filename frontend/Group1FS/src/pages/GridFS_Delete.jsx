import { useState } from 'react';
import api from '../utils/axios.js';

function Co_gridFS_Delete() {
    const [fileId, setFileId] = useState('');
    const [statusMsg, setStatusMsg] = useState('');

    const handleDelete = async (e) => {
        e.preventDefault();

        if (!fileId.trim()) {
            setStatusMsg('Please enter a valid File ID.');
            return;
        }

        try {
            const res = await api.delete(`/fsfiles/${fileId.trim()}`);
            setStatusMsg(`Success: ${res.data.msg}`);
            setFileId('');
        } catch (err) {
            setStatusMsg(`Error: ${err.response?.data?.msg || err.message}`);
        }
    };

    return (
        <div>
            <form onSubmit={handleDelete}>
                <h2>Delete File</h2>

                <label htmlFor="FSfileID">Delete file ID: </label>
                <input 
                    type="text" 
                    id="FSfileID" 
                    name="FSfileID"
                    value={fileId}
                    onChange={(e) => setFileId(e.target.value)}
                /><br/><br/>

                <button type="submit">Delete file</button><br/><br/>
            </form>

            {statusMsg && <p>{statusMsg}</p>}
        </div>
    );
}

export default Co_gridFS_Delete;