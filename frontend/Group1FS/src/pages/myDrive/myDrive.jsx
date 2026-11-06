import { useState } from 'react';
import api from '../../utils/axios.js';

function Co_myDrive() {
    const [files, setFiles] = useState([]);
    const [error, setError] = useState('');

    const handleListAllFiles = async () => {
        try {
            const res = await api.get('/fsfiles/list/allFiles');
            setFiles(res.data.files);
            setError('');
        } catch (err) {
            setError(`Error: ${err.response?.data?.msg || err.message}`);
        }
    };

    return(
        <div>


        </div>
    );
}

export default Co_myDrive