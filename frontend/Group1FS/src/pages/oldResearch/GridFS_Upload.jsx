import { useState } from 'react';
import api from '../../utils/axios.js';

function Co_gridFS_Upload() {
    const [file, setFile] = useState(null);
    const [description, setDescription] = useState('');
    const [statusMsg, setStatusMsg] = useState('');

    const handleUpload = async (e) => {
        e.preventDefault();

        if (!file) {
            setStatusMsg('Please select a file to upload.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('FSfileDescription', description);

        try {
            const res = await api.post('/fsfiles/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setStatusMsg(`Success: ${res.data.msg} (File ID: ${res.data.fileId})`);
            setFile(null);
            setDescription('');
            e.target.reset();
        } catch (err) {
            setStatusMsg(`Error: ${err.response?.data?.msg || err.message}`);
        }
    };

    return (
        <div>
            <form onSubmit={handleUpload}>
                <h2>Upload File</h2>

                <label htmlFor="file1">Upload file: </label>
                <input 
                    type="file" 
                    id="file1" 
                    name="file" 
                    onChange={(e) => setFile(e.target.files[0])} 
                /><br/><br/>

                <label htmlFor="description">Description: </label>
                <input 
                    type="text" 
                    id="description" 
                    name="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                /><br/><br/>

                <button type="submit">Submit</button><br/><br/>
            </form>

            {statusMsg && <p>{statusMsg}</p>}
        </div>
    );
}

export default Co_gridFS_Upload;