import { useState } from 'react';
import styles from "./App.module.css";
import Co_sidebar from './pages/sidebar.jsx';
import Co_mainContainer from './pages/mainContainer.jsx';

function App() {
    const [uploadVisible, setUploadVisible] = useState(false);

    return (
        <div className={styles.main_App}>
            <Co_sidebar onUploadClick={() => setUploadVisible(true)} />

            <Co_mainContainer
                uploadVisible={uploadVisible}
                onCloseUpload={() => setUploadVisible(false)}
            />
        </div>
    );
}

export default App;